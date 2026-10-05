import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { agronomistBrain } from './src/services/agronomistBrain.js';
import {
  Profile,
  Product,
  CartItem,
  WishlistItem,
  Order,
  BrowseHistoryItem,
  Review,
  DemandAnalytics,
  WeatherDay,
  UserRole,
} from './src/types.js';
import {
  initAuthStorage,
  createSession,
  verifySessionToken,
  invalidateSession,
  invalidateAllUserSessions,
  createPhoneOtp,
  verifyPhoneOtp,
  createPasskeyChallenge,
  verifyPasskeyChallenge,
  findIdentityByProvider,
  findIdentitiesByUserId,
  getUserLinkedProviders,
  linkIdentityToUser,
  hashPassword,
  verifyPassword,
  normalizeEmail,
  normalizePhone,
  setOrUpdatePassword,
} from './src/server/auth.js';
import { isSupabaseConfigured, getSupabaseClient } from './src/server/db/supabaseClient.js';
import { supabaseAuthRepo } from './src/server/db/supabaseAuthRepo.js';
import { supabaseProductsRepo } from './src/server/db/supabaseProductsRepo.js';
import { CatalogRepository } from './src/server/db/catalogRepository.js';
import { supabaseCartsRepo } from './src/server/db/supabaseCartsRepo.js';
import { supabaseOrdersRepo } from './src/server/db/supabaseOrdersRepo.js';
import { supabaseWishlistsRepo } from './src/server/db/supabaseWishlistsRepo.js';
import { supabaseBrowseHistoryRepo } from './src/server/db/supabaseBrowseHistoryRepo.js';
import { supabaseReviewsRepo } from './src/server/db/supabaseReviewsRepo.js';
import { supabaseCropPlansRepo } from './src/server/db/supabaseCropPlansRepo.js';
import { supabaseAiConversationsRepo } from './src/server/db/supabaseAiConversationsRepo.js';
import { CropPlan, AiConversation, AiMessage, AuthProvider } from './src/types.js';
import {
  initDatabase,
  usersRepo,
  authIdentitiesRepo,
  sessionsRepo,
  profilesRepo,
  productsRepo,
  ordersRepo,
  cartsRepo,
  wishlistsRepo,
  browseHistoryRepo,
  reviewsRepo,
  cropPlansRepo,
  aiMemoryRepo,
} from './src/server/db/index.js';

dotenv.config();

// Initialize real relational database schema and seed data
initDatabase();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: UserRole;
    profile: Profile;
  };
}

// Session authentication middleware: extracts token from Bearer header, validates session, attaches user
async function authenticateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization || (req.headers['x-session-token'] as string);
    let token = '';
    if (authHeader) {
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
      } else {
        token = authHeader.trim();
      }
    }

    if (!token) {
      return next();
    }

    // 1. If Supabase is configured, check Supabase sessions first for real user accounts
    if (isSupabaseConfigured()) {
      try {
        const { valid, userId } = await supabaseAuthRepo.verifySessionToken(token);
        if (valid && userId) {
          const profile = await supabaseAuthRepo.getCombinedProfile(userId);
          if (profile) {
            (req as AuthenticatedRequest).user = {
              userId: profile.id,
              role: profile.role,
              profile,
            };
            return next();
          }
        }
      } catch (err) {
        console.warn('[Supabase Session Check Notice]:', err);
      }
    }

    // 2. Fall back to development sessions repository (e.g. for development test personas)
    const { valid, userId } = verifySessionToken(token);
    if (valid && userId) {
      const profile = profilesRepo.getCombinedProfile(userId);
      if (profile) {
        (req as AuthenticatedRequest).user = {
          userId: profile.id,
          role: profile.role,
          profile,
        };
      }
    }
  } catch (err) {
    console.error('authenticateUser error:', err);
  }
  next();
}

app.use(authenticateUser);

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = (req as AuthenticatedRequest).user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: Authentication session required' });
  }
  next();
}

function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: Authentication session required' });
    }
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        error: `Forbidden: Access requires role [${allowedRoles.join(', ')}]. Current role: ${user.role}`,
      });
    }
    next();
  };
}

// Set up server-side Gemini AI client
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

interface DBData {
  profiles: Profile[];
  products: Product[];
  carts: CartItem[];
  wishlists: WishlistItem[];
  orders: Order[];
  browse_history: BrowseHistoryItem[];
  reviews: Review[];
}

// Initial Seed Data
const initialSeed: DBData = {
  profiles: [
    {
      id: 'usr_ramesh_farmer',
      auth_method: 'phone',
      phone_number: '+91 98765 43210',
      email: 'ramesh.greenearth@farm2home.org',
      full_name: 'Ramesh Kumar',
      role: 'farmer',
      avatar_url: 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=200',
      location: 'Medak, Telangana',
      created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
      farm_name: 'Green Earth Organic Acres',
      approved: true,
      certificate_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=600',
    },
    {
      id: 'usr_saraswathi_farmer',
      auth_method: 'phone',
      phone_number: '+91 91234 56789',
      email: 'saraswathi.sunrise@farm2home.org',
      full_name: 'Saraswathi Devi',
      role: 'farmer',
      avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200',
      location: 'Chittoor, Andhra Pradesh',
      created_at: new Date(Date.now() - 45 * 86400000).toISOString(),
      farm_name: 'Sunrise Natural Orchards',
      approved: true,
      certificate_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=600',
    },
    {
      id: 'usr_anil_farmer',
      auth_method: 'email',
      email: 'anil.krishna@farm2home.org',
      full_name: 'Anil Reddy',
      role: 'farmer',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
      location: 'Vijayawada, Andhra Pradesh',
      created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
      farm_name: 'Krishna Delta Pulses & Grains',
      approved: true,
    },
    {
      id: 'usr_rahul_customer',
      auth_method: 'phone',
      phone_number: '+91 99887 76655',
      email: 'rahul.v@gmail.com',
      full_name: 'Rahul Verma',
      role: 'customer',
      avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
      location: 'Hitech City, Hyderabad',
      created_at: new Date().toISOString(),
    },
    {
      id: 'usr_vikram_delivery',
      auth_method: 'phone',
      phone_number: '+91 97766 55443',
      email: 'vikram.express@farm2home.org',
      full_name: 'Vikram Singh',
      role: 'delivery',
      avatar_url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=200',
      location: 'Hyderabad Metro Zone',
      created_at: new Date().toISOString(),
    },
  ],
  products: [
    {
      id: 'prod_101',
      farmer_id: 'usr_ramesh_farmer',
      farmer_name: 'Ramesh Kumar (Green Earth Organic Acres)',
      farmer_location: 'Medak, Telangana',
      title: 'Vine-Ripened Organic Tomatoes',
      description: 'Naturally grown, pesticide-free red juicy tomatoes harvested every morning. Packed with antioxidants and lycopene.',
      category: 'Vegetables',
      price: 42,
      unit: 'kg',
      stock: 120,
      is_organic: true,
      image_url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=800',
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    },
    {
      id: 'prod_102',
      farmer_id: 'usr_ramesh_farmer',
      farmer_name: 'Ramesh Kumar (Green Earth Organic Acres)',
      farmer_location: 'Medak, Telangana',
      title: 'Farm Fresh Palak (Spinach) Bunch',
      description: 'Crisp, tender organic spinach leaves rich in iron and vitamins. Harvested fresh on order.',
      category: 'Vegetables',
      price: 25,
      unit: 'bunch',
      stock: 65,
      is_organic: true,
      image_url: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&q=80&w=800',
      created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    },
    {
      id: 'prod_103',
      farmer_id: 'usr_saraswathi_farmer',
      farmer_name: 'Saraswathi Devi (Sunrise Natural Orchards)',
      farmer_location: 'Chittoor, Andhra Pradesh',
      title: 'Premium Banganapalli Mangoes',
      description: 'Naturally tree-ripened sweet golden Banganapalli mangoes directly from Chittoor orchards.',
      category: 'Fruits',
      price: 130,
      unit: 'kg',
      stock: 250,
      is_organic: true,
      image_url: 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&q=80&w=800',
      created_at: new Date(Date.now() - 8 * 86400000).toISOString(),
    },
    {
      id: 'prod_104',
      farmer_id: 'usr_saraswathi_farmer',
      farmer_name: 'Saraswathi Devi (Sunrise Natural Orchards)',
      farmer_location: 'Chittoor, Andhra Pradesh',
      title: 'Fresh Sweet Papaya',
      description: 'Rich sweet orange papaya packed with papain digestive enzymes. Organically grown.',
      category: 'Fruits',
      price: 45,
      unit: 'piece',
      stock: 80,
      is_organic: true,
      image_url: 'https://images.unsplash.com/photo-1617112848923-cc2234396a8d?auto=format&fit=crop&q=80&w=800',
      created_at: new Date(Date.now() - 6 * 86400000).toISOString(),
    },
    {
      id: 'prod_105',
      farmer_id: 'usr_anil_farmer',
      farmer_name: 'Anil Reddy (Krishna Delta Pulses & Grains)',
      farmer_location: 'Vijayawada, Andhra Pradesh',
      title: 'Aromatic Sona Masoori Rice (Aged)',
      description: 'Single origin 12-month aged Sona Masoori raw rice. Lightweight, fragrant, and fluffy when cooked.',
      category: 'Grains & Cereals',
      price: 68,
      unit: 'kg',
      stock: 500,
      is_organic: false,
      image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=800',
      created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
    },
    {
      id: 'prod_106',
      farmer_id: 'usr_anil_farmer',
      farmer_name: 'Anil Reddy (Krishna Delta Pulses & Grains)',
      farmer_location: 'Vijayawada, Andhra Pradesh',
      title: 'Unpolished Toor Dal (Pigeon Pea)',
      description: 'Pure chemical-free unpolished Toor Dal retaining natural fiber, protein, and authentic taste.',
      category: 'Pulses & Spices',
      price: 145,
      unit: 'kg',
      stock: 300,
      is_organic: true,
      image_url: 'https://images.unsplash.com/photo-1585994191611-726c88883652?auto=format&fit=crop&q=80&w=800',
      created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    },
    {
      id: 'prod_107',
      farmer_id: 'usr_ramesh_farmer',
      farmer_name: 'Ramesh Kumar (Green Earth Organic Acres)',
      farmer_location: 'Medak, Telangana',
      title: 'Raw Farm A2 Cow Milk',
      description: 'Chilled raw unprocessed A2 milk from free-roaming Desi Gir cows. Delivered in glass bottles within 4 hours of milking.',
      category: 'Dairy & Poultry',
      price: 75,
      unit: 'liter',
      stock: 40,
      is_organic: true,
      image_url: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&q=80&w=800',
      created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    },
    {
      id: 'prod_108',
      farmer_id: 'usr_ramesh_farmer',
      farmer_name: 'Ramesh Kumar (Green Earth Organic Acres)',
      farmer_location: 'Medak, Telangana',
      title: 'Hand-Pounded Stone Curcuma Turmeric Powder',
      description: 'High curcumin (5%+) pure stone-ground turmeric powder with rich golden hue and essential oils intact.',
      category: 'Organic Special',
      price: 180,
      unit: 'gram',
      stock: 90,
      is_organic: true,
      image_url: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=800',
      created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    },
  ],
  carts: [],
  wishlists: [],
  orders: [
    {
      id: 'ord_9001',
      customer_id: 'usr_rahul_customer',
      customer_name: 'Rahul Verma',
      customer_phone: '+91 99887 76655',
      farmer_id: 'usr_ramesh_farmer',
      farmer_name: 'Ramesh Kumar (Green Earth)',
      farmer_phone: '+91 98765 43210',
      delivery_partner_id: 'usr_vikram_delivery',
      delivery_partner_name: 'Vikram Singh',
      items: [
        {
          product_id: 'prod_101',
          title: 'Vine-Ripened Organic Tomatoes',
          price: 42,
          quantity: 3,
          unit: 'kg',
          image_url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=800',
        },
        {
          product_id: 'prod_102',
          title: 'Farm Fresh Palak Bunch',
          price: 25,
          quantity: 2,
          unit: 'bunch',
          image_url: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&q=80&w=800',
        },
      ],
      total_amount: 176,
      status: 'out_for_delivery',
      delivery_address: 'Flat 402, Green Valley Apts, Hitech City, Hyderabad - 500081',
      otp_code: '482910',
      created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
      delivery_fare: 140,
    },
    {
      id: 'ord_9002',
      customer_id: 'usr_rahul_customer',
      customer_name: 'Rahul Verma',
      customer_phone: '+91 99887 76655',
      farmer_id: 'usr_saraswathi_farmer',
      farmer_name: 'Saraswathi Devi',
      farmer_phone: '+91 91234 56789',
      delivery_partner_id: 'usr_vikram_delivery',
      delivery_partner_name: 'Vikram Singh',
      items: [
        {
          product_id: 'prod_103',
          title: 'Premium Banganapalli Mangoes',
          price: 130,
          quantity: 5,
          unit: 'kg',
          image_url: 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&q=80&w=800',
        },
      ],
      total_amount: 650,
      status: 'accepted',
      delivery_address: 'Flat 402, Green Valley Apts, Hitech City',
      otp_code: '591204',
      created_at: new Date(Date.now() - 4 * 3600000).toISOString(),
      completed_at: new Date(Date.now() - 3 * 3600000).toISOString(),
      delivery_fare: 160,
    },
    {
      id: 'ord_9003',
      customer_id: 'usr_rahul_customer',
      customer_name: 'Rahul Verma',
      customer_phone: '+91 99887 76655',
      farmer_id: 'usr_ramesh_farmer',
      farmer_name: 'Ramesh Kumar (Green Earth)',
      farmer_phone: '+91 98765 43210',
      delivery_partner_id: 'usr_vikram_delivery',
      delivery_partner_name: 'Vikram Singh',
      items: [
        {
          product_id: 'prod_101',
          title: 'Vine-Ripened Organic Tomatoes',
          price: 42,
          quantity: 2,
          unit: 'kg',
          image_url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=800',
        },
      ],
      total_amount: 100,
      status: 'delivered',
      delivery_address: 'Villa 12, Palm Meadows, Jubilee Hills',
      otp_code: '847291',
      created_at: new Date(Date.now() - 2 * 86400000 - 3600000).toISOString(),
      completed_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      delivery_fare: 160,
    },
    {
      id: 'ord_9004',
      customer_id: 'usr_rahul_customer',
      customer_name: 'Ananya Sharma',
      customer_phone: '+91 98112 23344',
      farmer_id: 'usr_saraswathi_farmer',
      farmer_name: 'Saraswathi Devi',
      farmer_phone: '+91 91234 56789',
      delivery_partner_id: 'usr_vikram_delivery',
      delivery_partner_name: 'Vikram Singh',
      items: [
        {
          product_id: 'prod_103',
          title: 'Premium Banganapalli Mangoes',
          price: 130,
          quantity: 6,
          unit: 'kg',
          image_url: 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&q=80&w=800',
        },
      ],
      total_amount: 780,
      status: 'delivered',
      delivery_address: 'B-304, Cyber Heights, Madhapur, Hyderabad - 500081',
      otp_code: '319842',
      created_at: new Date(Date.now() - 9 * 86400000).toISOString(),
      completed_at: new Date(Date.now() - 9 * 86400000 + 55 * 60000).toISOString(),
      delivery_fare: 220,
    },
    {
      id: 'ord_9005',
      customer_id: 'usr_rahul_customer',
      customer_name: 'Praveen Reddy',
      customer_phone: '+91 96622 33445',
      farmer_id: 'usr_ramesh_farmer',
      farmer_name: 'Ramesh Kumar (Green Earth)',
      farmer_phone: '+91 98765 43210',
      delivery_partner_id: 'usr_vikram_delivery',
      delivery_partner_name: 'Vikram Singh',
      items: [
        {
          product_id: 'prod_101',
          title: 'Vine-Ripened Organic Tomatoes',
          price: 42,
          quantity: 5,
          unit: 'kg',
          image_url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=800',
        },
      ],
      total_amount: 210,
      status: 'delivered',
      delivery_address: 'Plot 88, Road 10, Banjara Hills, Hyderabad - 500034',
      otp_code: '625184',
      created_at: new Date(Date.now() - 22 * 86400000).toISOString(),
      completed_at: new Date(Date.now() - 22 * 86400000 + 40 * 60000).toISOString(),
      delivery_fare: 175,
    },
  ],
  browse_history: [],
  reviews: [
    {
      id: 'rev_1',
      order_id: 'ord_9002',
      customer_id: 'usr_rahul_customer',
      customer_name: 'Rahul Verma',
      farmer_id: 'usr_saraswathi_farmer',
      rating: 5,
      comment: 'Super sweet mangoes! Delivered straight from Chittoor orchard.',
      created_at: new Date(Date.now() - 20 * 3600000).toISOString(),
    },
  ],
};

// Helper to load and save DB backed by SQLite database
function getDB(): DBData {
  try {
    return {
      profiles: profilesRepo.getAllProfiles(),
      products: productsRepo.getAll(),
      carts: [],
      wishlists: [],
      orders: ordersRepo.getAll(),
      browse_history: [],
      reviews: reviewsRepo.getAll(),
    };
  } catch (err) {
    console.error('Error reading db from repositories:', err);
    return initialSeed;
  }
}

function saveDB(db: DBData): void {
  // Legacy saveDB no-op: Runtime modifications are stored in Supabase and server-side memory
  return;
}

// Seed auth storage
initAuthStorage(profilesRepo.getAllProfiles());

// API Endpoints

// 1. Production Authentication & Identity Management

// 1.1 Register with Email & Password
app.post('/api/auth/register-email', async (req: Request, res: Response) => {
  const { email, password, fullName, role, location, farmName, preferredLanguage } = req.body;
  if (!email || !password || !fullName) {
    return res.status(400).json({ error: 'Email, password, and full name are required' });
  }

  const normEmail = normalizeEmail(email);
  if (!normEmail.includes('@') || !normEmail.includes('.')) {
    return res.status(400).json({ error: 'Please enter a valid email address' });
  }

  if (typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  // Validate and authorize role server-side
  const validRoles: UserRole[] = ['customer', 'farmer', 'delivery'];
  const assignedRole: UserRole = validRoles.includes(role as UserRole) ? (role as UserRole) : 'customer';

  // 1. Primary Path: Supabase PostgreSQL Persistence
  if (isSupabaseConfigured()) {
    try {
      const existingIdentity = await supabaseAuthRepo.findIdentityByProvider('email', normEmail);
      const existingUser = await supabaseAuthRepo.findUserByEmail(normEmail);

      if (existingIdentity || existingUser) {
        return res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
      }

      // Generate canonical Farm2Home userId
      const userId = `usr_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const passwordHash = hashPassword(password);

      const { profile } = await supabaseAuthRepo.createUserWithIdentityAndProfile({
        userId,
        fullName: fullName.trim(),
        email: normEmail,
        role: assignedRole,
        preferredLanguage: preferredLanguage || 'en',
        provider: 'email',
        providerUid: normEmail,
        passwordHash,
        location: location?.trim(),
        farmName: farmName?.trim(),
      });

      // Maintain password hash in auth store for constant-time verification
      usersRepo.create({
        id: userId,
        display_name: fullName.trim(),
        email: normEmail,
        role: assignedRole,
        preferred_language: preferredLanguage || 'en',
      });
      linkIdentityToUser(userId, 'email', normEmail, { passwordHash });

      const { token } = await supabaseAuthRepo.createSession(userId);
      const linkedProviders = await supabaseAuthRepo.getUserLinkedProviders(userId);

      return res.status(201).json({
        sessionToken: token,
        profile,
        user: {
          userId: profile.id,
          displayName: profile.full_name,
          email: profile.email,
          role: profile.role,
          preferredLanguage: profile.preferred_language || 'en',
          linkedProviders,
        },
      });
    } catch (err: any) {
      console.warn('[Supabase Register Notice - Falling back to local auth store]:', err.message);
    }
  }

  // 2. Local repository (Scrypt salted password hashing)
  const existingIdentity = findIdentityByProvider('email', normEmail);
  const existingUser = usersRepo.getByEmail(normEmail);

  if (existingIdentity || existingUser) {
    return res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
  }

  const userId = `usr_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

  usersRepo.create({
    id: userId,
    display_name: fullName.trim(),
    email: normEmail,
    role: assignedRole,
    preferred_language: preferredLanguage || 'en',
  });

  if (assignedRole === 'farmer') {
    profilesRepo.upsertFarmerProfile({
      userId,
      farmName: farmName?.trim() || 'Organic Acres',
      location: location?.trim() || 'Andhra & Telangana Agri Region',
    });
  } else if (assignedRole === 'delivery') {
    profilesRepo.upsertDeliveryProfile({
      userId,
      location: location?.trim() || 'Hyderabad Metro Zone',
    });
  } else {
    profilesRepo.upsertCustomerProfile({
      userId,
      location: location?.trim() || 'Andhra & Telangana Agri Region',
    });
  }

  const passwordHash = hashPassword(password);
  linkIdentityToUser(userId, 'email', normEmail, { passwordHash });

  const { token } = createSession(userId);
  const newProfile = profilesRepo.getCombinedProfile(userId)!;

  saveDB(getDB());

  res.status(201).json({
    sessionToken: token,
    profile: newProfile,
    user: {
      userId,
      displayName: newProfile.full_name,
      email: newProfile.email,
      role: newProfile.role,
      preferredLanguage: newProfile.preferred_language || 'en',
      linkedProviders: getUserLinkedProviders(userId),
    },
  });
});

// 1.2 Sign in with Email & Password
app.post('/api/auth/login-email', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const normEmail = normalizeEmail(email);

  // 1. Password Verification via Scrypt Salted Hash
  const identity = findIdentityByProvider('email', normEmail);
  if (!identity || !identity.passwordHash) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const isValid = verifyPassword(password, identity.passwordHash);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // 2. Primary Path: Supabase PostgreSQL Persistence
  if (isSupabaseConfigured()) {
    try {
      const profile = await supabaseAuthRepo.getCombinedProfile(identity.userId);
      if (profile) {
        const { token } = await supabaseAuthRepo.createSession(profile.id);
        const linkedProviders = await supabaseAuthRepo.getUserLinkedProviders(profile.id);

        return res.json({
          sessionToken: token,
          profile,
          user: {
            userId: profile.id,
            displayName: profile.full_name,
            email: profile.email,
            phone: profile.phone_number,
            role: profile.role,
            preferredLanguage: profile.preferred_language || 'en',
            linkedProviders,
          },
        });
      }
    } catch (err: any) {
      console.warn('[Supabase Login Notice - Falling back to local auth store]:', err.message);
    }
  }

  // 3. Local repository fallback
  const profile = profilesRepo.getCombinedProfile(identity.userId);
  if (!profile) {
    return res.status(404).json({ error: 'User profile not found' });
  }

  const { token } = createSession(profile.id);

  res.json({
    sessionToken: token,
    profile,
    user: {
      userId: profile.id,
      displayName: profile.full_name,
      email: profile.email,
      phone: profile.phone_number,
      role: profile.role,
      preferredLanguage: profile.preferred_language || 'en',
      linkedProviders: getUserLinkedProviders(profile.id),
    },
  });
});

// 1.3 Phone OTP: Send verification code
app.post('/api/auth/phone/send-otp', (req: Request, res: Response) => {
  const { phone } = req.body;
  if (!phone || typeof phone !== 'string' || phone.trim().length < 8) {
    return res.status(400).json({ error: 'Please enter a valid mobile number' });
  }

  try {
    const { ticket, devOtp, expiresAt } = createPhoneOtp(phone);
    res.json({
      success: true,
      ticket,
      devOtp, // Returned in sandbox environment for immediate seamless verification
      expiresAt,
      message: 'OTP verification code sent successfully',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to dispatch OTP' });
  }
});

// 1.4 Phone OTP: Verify code & sign in / register
app.post('/api/auth/phone/verify-otp', (req: Request, res: Response) => {
  const { phone, otp, ticket, fullName, role, location, farmName, preferredLanguage } = req.body;
  if (!phone || !otp || !ticket) {
    return res.status(400).json({ error: 'Phone number, OTP code, and ticket are required' });
  }

  const result = verifyPhoneOtp(phone, ticket, otp);
  if (!result.verified) {
    return res.status(400).json({ error: result.error || 'Invalid or expired OTP' });
  }

  const normPhone = normalizePhone(phone);

  // Check if identity already exists
  let identity = findIdentityByProvider('phone', normPhone);
  let profile: Profile | undefined;
  let isNew = false;

  if (identity) {
    profile = profilesRepo.getCombinedProfile(identity.userId) || undefined;
  }

  // If completely new user, create in users repo and profile repo
  if (!profile) {
    isNew = true;
    const userId = `usr_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const validRoles: UserRole[] = ['customer', 'farmer', 'delivery'];
    const assignedRole: UserRole = validRoles.includes(role as UserRole) ? (role as UserRole) : 'customer';

    usersRepo.create({
      id: userId,
      display_name: fullName?.trim() || `Agri Member (${phone.slice(-4)})`,
      phone: normPhone,
      role: assignedRole,
      preferred_language: preferredLanguage || 'en',
    });

    if (assignedRole === 'farmer') {
      profilesRepo.upsertFarmerProfile({
        userId,
        farmName: farmName?.trim() || 'Organic Farm',
        location: location?.trim() || 'Andhra & Telangana Region',
      });
    } else if (assignedRole === 'delivery') {
      profilesRepo.upsertDeliveryProfile({
        userId,
        location: location?.trim() || 'Hyderabad Metro Zone',
      });
    } else {
      profilesRepo.upsertCustomerProfile({
        userId,
        location: location?.trim() || 'Andhra & Telangana Region',
      });
    }

    linkIdentityToUser(userId, 'phone', normPhone);
    profile = profilesRepo.getCombinedProfile(userId)!;
    saveDB(getDB());
  }

  const { token } = createSession(profile.id);

  res.json({
    sessionToken: token,
    profile,
    isNew,
    user: {
      userId: profile.id,
      displayName: profile.full_name,
      email: profile.email,
      phone: profile.phone_number,
      role: profile.role,
      preferredLanguage: profile.preferred_language || 'en',
      linkedProviders: getUserLinkedProviders(profile.id),
    },
  });
});

// 1.5 Google Sign-In
app.post('/api/auth/google', async (req: Request, res: Response) => {
  const { credential, role } = req.body;
  const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;

  if (!googleClientId) {
    return res.status(503).json({
      error: 'Google Sign-In is not configured. Missing GOOGLE_CLIENT_ID or VITE_GOOGLE_CLIENT_ID in server environment variables.',
      code: 'GOOGLE_NOT_CONFIGURED',
      requiredConfig: ['GOOGLE_CLIENT_ID', 'VITE_GOOGLE_CLIENT_ID'],
    });
  }

  if (!credential || typeof credential !== 'string' || credential.trim() === '') {
    return res.status(400).json({ error: 'Valid Google credential token is required' });
  }

  try {
    const tokenInfoRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential.trim())}`
    );
    if (!tokenInfoRes.ok) {
      return res.status(401).json({ error: 'Invalid or expired Google authentication token' });
    }

    const tokenInfo = (await tokenInfoRes.json()) as any;

    // Audience validation: Token must have been issued specifically for our Google Client ID
    if (tokenInfo.aud !== googleClientId) {
      return res.status(401).json({ error: 'Google token audience mismatch' });
    }

    // Issuer validation: Token must have been issued by Google
    if (tokenInfo.iss !== 'accounts.google.com' && tokenInfo.iss !== 'https://accounts.google.com') {
      return res.status(401).json({ error: 'Google token issuer mismatch' });
    }

    // Token expiry validation
    if (tokenInfo.exp && Number(tokenInfo.exp) * 1000 < Date.now()) {
      return res.status(401).json({ error: 'Google authentication token has expired' });
    }

    // Email verified validation: Google must have verified the email address
    const isEmailVerified = tokenInfo.email_verified === 'true' || tokenInfo.email_verified === true;
    if (!isEmailVerified) {
      return res.status(401).json({ error: 'Google email address is not verified by Google' });
    }

    const effectiveSub = tokenInfo.sub;
    if (!effectiveSub || typeof effectiveSub !== 'string') {
      return res.status(401).json({ error: 'Missing subject identifier in Google token' });
    }

    // Verified claims directly from Google
    const effectiveEmail = tokenInfo.email ? normalizeEmail(tokenInfo.email) : '';
    const effectiveName = (tokenInfo.name || (effectiveEmail ? effectiveEmail.split('@')[0] : 'Google Member')).trim();
    const effectivePicture = tokenInfo.picture || undefined;

    // Validate role for new users
    const validRoles: UserRole[] = ['customer', 'farmer', 'delivery'];
    const assignedRole: UserRole = validRoles.includes(role as UserRole) ? (role as UserRole) : 'customer';

    // 1. Primary Path: Supabase PostgreSQL Persistence
    if (isSupabaseConfigured()) {
      try {
        // Step A: Check if this Google identity is already linked to a Farm2Home user
        const existingIdentity = await supabaseAuthRepo.findIdentityByProvider('google', effectiveSub);
        if (existingIdentity) {
          const profile = await supabaseAuthRepo.getCombinedProfile(existingIdentity.user_id);
          if (!profile) {
            return res.status(404).json({ error: 'User profile not found for linked Google account' });
          }

          const { token } = await supabaseAuthRepo.createSession(profile.id);
          const linkedProviders = await supabaseAuthRepo.getUserLinkedProviders(profile.id);

          return res.json({
            sessionToken: token,
            profile,
            isNew: false,
            user: {
              userId: profile.id,
              displayName: profile.full_name,
              email: profile.email,
              phone: profile.phone_number,
              role: profile.role,
              preferredLanguage: profile.preferred_language || 'en',
              linkedProviders,
            },
          });
        }

        // Step B: Prevent account takeover. If an existing Farm2Home account uses email/password
        // but Google is not linked, require the existing secure account-linking mechanism.
        if (effectiveEmail) {
          const existingUser = await supabaseAuthRepo.findUserByEmail(effectiveEmail);
          if (existingUser) {
            return res.status(409).json({
              error:
                'An account with this email already exists. Please sign in with your password, then link your Google account in Account Settings to prevent unauthorized access.',
              code: 'ACCOUNT_EXISTS_LINK_REQUIRED',
            });
          }
        }

        // Step C: New Google User Registration in Supabase
        const userId = `usr_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

        const { profile } = await supabaseAuthRepo.createUserWithIdentityAndProfile({
          userId,
          fullName: effectiveName,
          email: effectiveEmail || null,
          role: assignedRole,
          preferredLanguage: 'en',
          provider: 'google',
          providerUid: effectiveSub,
          location: assignedRole === 'delivery' ? 'Hyderabad Metro Zone' : 'Andhra & Telangana Agri Region',
          farmName: assignedRole === 'farmer' ? 'Green Organic Acres' : undefined,
          avatarUrl: effectivePicture,
        });

        const { token } = await supabaseAuthRepo.createSession(userId);
        const linkedProviders = await supabaseAuthRepo.getUserLinkedProviders(userId);

        return res.status(201).json({
          sessionToken: token,
          profile,
          isNew: true,
          user: {
            userId: profile.id,
            displayName: profile.full_name,
            email: profile.email,
            phone: profile.phone_number,
            role: profile.role,
            preferredLanguage: profile.preferred_language || 'en',
            linkedProviders,
          },
        });
      } catch (err: any) {
        console.error('[Supabase Google Auth Error]:', err.message);
        return res.status(500).json({ error: `Authentication failed: ${err.message}` });
      }
    }

    // 2. Local store fallback (for offline or local dev without Supabase)
    const existingIdentity = findIdentityByProvider('google', effectiveSub);
    if (existingIdentity) {
      const profile = profilesRepo.getCombinedProfile(existingIdentity.userId);
      if (!profile) {
        return res.status(404).json({ error: 'User profile not found for linked Google account' });
      }
      const { token } = createSession(profile.id);
      return res.json({
        sessionToken: token,
        profile,
        isNew: false,
        user: {
          userId: profile.id,
          displayName: profile.full_name,
          email: profile.email,
          phone: profile.phone_number,
          role: profile.role,
          preferredLanguage: profile.preferred_language || 'en',
          linkedProviders: getUserLinkedProviders(profile.id),
        },
      });
    }

    if (effectiveEmail) {
      const existingUser = usersRepo.getByEmail(effectiveEmail);
      if (existingUser) {
        return res.status(409).json({
          error:
            'An account with this email already exists. Please sign in with your password, then link your Google account in Account Settings to prevent unauthorized access.',
          code: 'ACCOUNT_EXISTS_LINK_REQUIRED',
        });
      }
    }

    const userId = `usr_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    usersRepo.create({
      id: userId,
      display_name: effectiveName,
      email: effectiveEmail || null,
      role: assignedRole,
    });

    if (assignedRole === 'farmer') {
      profilesRepo.upsertFarmerProfile({
        userId,
        farmName: 'Organic Farm',
        location: 'Andhra & Telangana Region',
        avatarUrl: effectivePicture,
      });
    } else if (assignedRole === 'delivery') {
      profilesRepo.upsertDeliveryProfile({
        userId,
        location: 'Hyderabad Metro Zone',
        avatarUrl: effectivePicture,
      });
    } else {
      profilesRepo.upsertCustomerProfile({
        userId,
        location: 'Hyderabad Metro Zone',
        avatarUrl: effectivePicture,
      });
    }

    linkIdentityToUser(userId, 'google', effectiveSub);
    const profile = profilesRepo.getCombinedProfile(userId)!;
    const { token } = createSession(profile.id);

    return res.status(201).json({
      sessionToken: token,
      profile,
      isNew: true,
      user: {
        userId: profile.id,
        displayName: profile.full_name,
        email: profile.email,
        phone: profile.phone_number,
        role: profile.role,
        preferredLanguage: profile.preferred_language || 'en',
        linkedProviders: getUserLinkedProviders(profile.id),
      },
    });
  } catch (err: any) {
    console.error('[Google Token Verification Error]:', err.message);
    res.status(500).json({ error: err.message || 'Failed to verify Google token' });
  }
});

// 1.6 Passkey: Generate Challenge
app.post('/api/auth/passkey/generate-challenge', (req: Request, res: Response) => {
  const authUser = (req as AuthenticatedRequest).user;
  const { challenge } = createPasskeyChallenge(authUser?.userId);
  res.json({
    challenge,
    rp: { name: 'Farm2Home Agri-Tech', id: req.hostname },
    user: authUser
      ? {
          id: Buffer.from(authUser.userId).toString('base64url'),
          name: authUser.profile.email || authUser.userId,
          displayName: authUser.profile.full_name,
        }
      : undefined,
  });
});

// 1.7 Passkey: Register (Attach passkey to authenticated user)
app.post('/api/auth/passkey/register', requireAuth, (req: Request, res: Response) => {
  const { challenge, credential } = req.body;
  if (!challenge || !credential || !credential.id) {
    return res.status(400).json({ error: 'Challenge and credential ID are required' });
  }

  const isValidChallenge = verifyPasskeyChallenge(challenge);
  if (!isValidChallenge) {
    return res.status(400).json({ error: 'Passkey registration challenge expired or invalid' });
  }

  const user = (req as AuthenticatedRequest).user!;
  const linkResult = linkIdentityToUser(user.userId, 'passkey', credential.id, {
    passkeyPublicKey: credential.response?.publicKey || 'ed25519-public-key',
  });

  if (!linkResult.success) {
    return res.status(409).json({ error: linkResult.error });
  }

  res.json({
    success: true,
    message: 'Passkey registered successfully',
    linkedProviders: getUserLinkedProviders(user.userId),
  });
});

// 1.8 Passkey: Verify & Login
app.post('/api/auth/passkey/verify-login', (req: Request, res: Response) => {
  const { challenge, credential } = req.body;
  if (!challenge || !credential || !credential.id) {
    return res.status(400).json({ error: 'Challenge and credential ID are required' });
  }

  const isValidChallenge = verifyPasskeyChallenge(challenge);
  if (!isValidChallenge) {
    return res.status(400).json({ error: 'Passkey authentication challenge expired or invalid' });
  }

  const identity = findIdentityByProvider('passkey', credential.id);
  if (!identity) {
    return res.status(404).json({ error: 'Passkey not recognized or not linked to any account' });
  }

  const db = getDB();
  const profile = db.profiles.find((p) => p.id === identity.userId);
  if (!profile) {
    return res.status(404).json({ error: 'User profile not found' });
  }

  const { token } = createSession(profile.id);

  res.json({
    sessionToken: token,
    profile,
    user: {
      userId: profile.id,
      displayName: profile.full_name,
      email: profile.email,
      phone: profile.phone_number,
      role: profile.role,
      linkedProviders: getUserLinkedProviders(profile.id),
    },
  });
});

// 1.9 Get Current Authenticated Profile (/api/auth/me)
app.get('/api/auth/me', requireAuth, (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user!;
  res.json({
    profile: user.profile,
    user: {
      userId: user.userId,
      displayName: user.profile.full_name,
      email: user.profile.email,
      phone: user.profile.phone_number,
      role: user.role,
      preferredLanguage: user.profile.preferred_language || 'en',
      linkedProviders: getUserLinkedProviders(user.userId),
    },
  });
});

// 1.10 Invalidate session / Logout
app.post('/api/auth/logout', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization || (req.headers['x-session-token'] as string);
  let token = '';
  if (authHeader) {
    token = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : authHeader.trim();
  }
  if (token) {
    if (isSupabaseConfigured()) {
      try {
        await supabaseAuthRepo.invalidateSession(token);
      } catch (e) {
        console.warn('[Supabase Logout Notice]:', e);
      }
    }
    invalidateSession(token);
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

// 1.11 Role Onboarding: set or switch user role server-side
app.post('/api/auth/onboard-role', requireAuth, (req: Request, res: Response) => {
  const { role, farmName, location } = req.body;
  if (!role || (role !== 'customer' && role !== 'farmer' && role !== 'delivery')) {
    return res.status(400).json({ error: 'Valid role is required (customer, farmer, delivery)' });
  }

  const user = (req as AuthenticatedRequest).user!;
  usersRepo.update(user.userId, { role });

  if (role === 'farmer') {
    profilesRepo.upsertFarmerProfile({
      userId: user.userId,
      farmName: farmName?.trim() || 'Organic Harvest Acres',
      location: location?.trim() || 'Medak, Telangana',
      approved: true,
    });
  } else if (role === 'delivery') {
    profilesRepo.upsertDeliveryProfile({
      userId: user.userId,
      location: location?.trim() || 'Hyderabad Metro Zone',
    });
  } else {
    profilesRepo.upsertCustomerProfile({
      userId: user.userId,
      location: location?.trim() || 'Hitech City, Hyderabad',
    });
  }

  const updatedProfile = profilesRepo.getCombinedProfile(user.userId)!;
  saveDB(getDB());

  res.json({
    success: true,
    profile: updatedProfile,
    user: {
      userId: user.userId,
      displayName: updatedProfile.full_name,
      email: updatedProfile.email,
      phone: updatedProfile.phone_number,
      role,
      linkedProviders: getUserLinkedProviders(user.userId),
    },
  });
});

// 1.11B AI User-Scoped Conversations & History
app.get('/api/ai/conversations', requireAuth, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user!;
  try {
    const conversations = await supabaseAiConversationsRepo.getConversations(user.userId);
    res.json({ conversations });
  } catch (err: any) {
    console.error('[AI Conversations API] Error:', err);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

app.get('/api/ai/conversations/:id', requireAuth, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user!;
  try {
    const conversation = await supabaseAiConversationsRepo.getConversation(req.params.id, user.userId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    res.json({ conversation });
  } catch (err: any) {
    const msg = err.message || 'Failed to fetch conversation';
    if (msg.includes('Forbidden')) return res.status(403).json({ error: msg });
    res.status(400).json({ error: msg });
  }
});

app.get('/api/ai/conversations/:id/messages', requireAuth, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user!;
  try {
    const messages = await supabaseAiConversationsRepo.getMessages(req.params.id, user.userId);
    res.json({ messages });
  } catch (err: any) {
    const msg = err.message || 'Failed to fetch messages';
    if (msg.includes('Forbidden')) return res.status(403).json({ error: msg });
    res.status(400).json({ error: msg });
  }
});

app.post('/api/ai/conversations', requireAuth, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user!;
  const { title, language } = req.body;
  try {
    const conversation = await supabaseAiConversationsRepo.getOrCreateActiveConversation(
      user.userId,
      user.role,
      title || 'Agronomist Advisory Session',
      language || 'en'
    );
    res.status(201).json({ conversation });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create conversation' });
  }
});

app.delete('/api/ai/conversations/:id', requireAuth, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user!;
  try {
    const result = await supabaseAiConversationsRepo.deleteConversation(req.params.id, user.userId);
    res.json(result);
  } catch (err: any) {
    const msg = err.message || 'Failed to delete conversation';
    if (msg.includes('Forbidden')) return res.status(403).json({ error: msg });
    if (msg.includes('not found')) return res.status(404).json({ error: msg });
    res.status(400).json({ error: msg });
  }
});

// 1.12 Link New Authentication Method to Existing User
app.post('/api/auth/link-identity', requireAuth, async (req: Request, res: Response) => {
  const { provider, providerUid, credential, password } = req.body;
  const user = (req as AuthenticatedRequest).user!;

  let effectiveUid = providerUid ? String(providerUid).trim() : '';

  // If linking Google with a credential token, verify with Google
  if (provider === 'google' && credential && typeof credential === 'string') {
    const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
    if (googleClientId) {
      try {
        const tokenRes = await fetch(
          `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential.trim())}`
        );
        if (tokenRes.ok) {
          const tInfo = (await tokenRes.json()) as any;
          if (tInfo.aud === googleClientId && tInfo.sub) {
            effectiveUid = tInfo.sub;
          }
        }
      } catch (e) {
        console.warn('[Link Google tokeninfo notice]:', e);
      }
    }
  }

  if (!provider || !effectiveUid) {
    return res.status(400).json({ error: 'Provider and identifier are required' });
  }

  let passwordHash: string | undefined;
  if (provider === 'email' && password) {
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    passwordHash = hashPassword(password);
  }

  if (isSupabaseConfigured()) {
    try {
      const existingIdn = await supabaseAuthRepo.findIdentityByProvider(provider as AuthProvider, effectiveUid);
      if (existingIdn) {
        if (existingIdn.user_id !== user.userId) {
          return res.status(409).json({ error: `This ${provider} identity is already linked to another Farm2Home account.` });
        }
      } else {
        await supabaseAuthRepo.linkIdentityToUser(user.userId, provider as AuthProvider, effectiveUid, { passwordHash });
      }
      const linkedProviders = await supabaseAuthRepo.getUserLinkedProviders(user.userId);
      return res.json({
        success: true,
        message: `${provider} linked successfully`,
        linkedProviders,
      });
    } catch (err: any) {
      console.error('[Supabase link-identity error]:', err.message);
      return res.status(500).json({ error: `Failed to link identity: ${err.message}` });
    }
  }

  const linkRes = linkIdentityToUser(user.userId, provider, effectiveUid, { passwordHash });
  if (!linkRes.success) {
    return res.status(409).json({ error: linkRes.error });
  }

  // Update profile email or phone if empty
  const db = getDB();
  const prof = db.profiles.find((p) => p.id === user.userId);
  if (prof) {
    if (provider === 'email' && !prof.email) prof.email = effectiveUid;
    if (provider === 'phone' && !prof.phone_number) prof.phone_number = effectiveUid;
    prof.updated_at = new Date().toISOString();
    saveDB(db);
  }

  res.json({
    success: true,
    message: `${provider} linked successfully`,
    linkedProviders: getUserLinkedProviders(user.userId),
  });
});

// 1.13 Development / Test Persona Instant Login (Produces authentic server session)
const ALLOWED_DEV_PERSONAS = [
  'usr_rahul_customer',
  'usr_ramesh_farmer',
  'usr_saraswathi_farmer',
  'usr_vikram_delivery',
];

app.post('/api/auth/dev-login', (req: Request, res: Response) => {
  const { personaId } = req.body;
  if (!personaId) {
    return res.status(400).json({ error: 'personaId is required' });
  }

  if (!ALLOWED_DEV_PERSONAS.includes(personaId)) {
    return res.status(403).json({ error: 'Forbidden: Unauthorized development persona ID' });
  }

  const profile = profilesRepo.getCombinedProfile(personaId);
  if (!profile) {
    return res.status(404).json({ error: `Persona ${personaId} not found` });
  }

  const { token } = createSession(profile.id);

  res.json({
    sessionToken: token,
    profile,
    user: {
      userId: profile.id,
      displayName: profile.full_name,
      email: profile.email,
      phone: profile.phone_number,
      role: profile.role,
      preferredLanguage: profile.preferred_language || 'en',
      linkedProviders: getUserLinkedProviders(profile.id),
    },
  });
});

// 1.14 Legacy Login (Maintained for backwards-compatibility, issues session token)
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { authMethod, identifier, role, fullName, farmName, location } = req.body;
  const db = getDB();

  let existing = db.profiles.find((p) =>
    authMethod === 'email'
      ? p.email?.toLowerCase() === identifier?.toLowerCase()
      : p.phone_number === identifier
  );

  if (existing) {
    const { token } = createSession(existing.id);
    return res.json({ profile: existing, sessionToken: token, isNew: false });
  }

  // Create new profile if not found
  const userId = 'usr_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
  const newProfile: Profile = {
    id: userId,
    user_id: userId,
    auth_method: authMethod || 'phone',
    phone_number: authMethod === 'phone' ? identifier : undefined,
    email: authMethod === 'email' ? identifier : undefined,
    full_name: fullName || (authMethod === 'phone' ? 'Agri Member' : identifier.split('@')[0]),
    role: role || 'customer',
    location: location || 'Hyderabad Metro Zone',
    created_at: new Date().toISOString(),
    farm_name: role === 'farmer' ? farmName || 'Local Green Farm' : undefined,
    approved: role === 'farmer' ? true : undefined,
  };

  db.profiles.push(newProfile);
  saveDB(db);

  if (authMethod === 'phone') {
    linkIdentityToUser(userId, 'phone', normalizePhone(identifier));
  } else if (authMethod === 'email') {
    linkIdentityToUser(userId, 'email', normalizeEmail(identifier));
  }

  const { token } = createSession(userId);
  return res.json({ profile: newProfile, sessionToken: token, isNew: true });
});

app.get('/api/profiles/:id', (req: Request, res: Response) => {
  const db = getDB();
  const profile = db.profiles.find((p) => p.id === req.params.id);
  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }
  res.json({ profile });
});

app.put('/api/profiles/:id', requireAuth, (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user!;
  if (user.userId !== req.params.id) {
    return res.status(403).json({ error: 'Forbidden: You can only update your own profile' });
  }

  const db = getDB();
  const index = db.profiles.findIndex((p) => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Profile not found' });
  }
  db.profiles[index] = {
    ...db.profiles[index],
    ...req.body,
    id: db.profiles[index].id, // Prevent overriding userId
    updated_at: new Date().toISOString(),
  };
  saveDB(db);
  res.json({ profile: db.profiles[index] });
});

// Get all profiles (for dev role testing)
app.get('/api/profiles', (req: Request, res: Response) => {
  const db = getDB();
  res.json({ profiles: db.profiles });
});

// 2. Products & Inventory
app.get('/api/products', async (req: Request, res: Response) => {
  const { category, farmerId, search, organicOnly } = req.query;
  try {
    const products = await CatalogRepository.getCatalogProducts({
      category: category as string,
      farmerId: farmerId as string,
      search: search as string,
      organicOnly: organicOnly === 'true',
    });
    res.json({ products });
  } catch (err: any) {
    console.error('[Products API] Error fetching catalog:', err);
    res.status(500).json({ error: 'Failed to fetch catalog products' });
  }
});

app.post('/api/products', async (req: Request, res: Response) => {
  const authUser = (req as AuthenticatedRequest).user;
  const effectiveFarmerId = authUser?.userId || req.body.farmerId;
  const { title, description, category, price, unit, stock, isOrganic, imageUrl } = req.body;
  const db = getDB();

  const isDevPersona = ALLOWED_DEV_PERSONAS.includes(effectiveFarmerId);
  const farmer = db.profiles.find((p) => p.id === effectiveFarmerId);

  if (authUser && authUser.role !== 'farmer') {
    return res.status(403).json({ error: 'Forbidden: Only authenticated farmers can list crops' });
  }

  if (!isDevPersona && !authUser) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required to list crops' });
  }

  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Crop title is required' });
  }

  const numPrice = Number(price);
  if (!Number.isFinite(numPrice) || numPrice <= 0) {
    return res.status(400).json({ error: 'Price must be a valid positive number' });
  }

  const numStock = Number(stock);
  if (!Number.isFinite(numStock) || numStock < 0) {
    return res.status(400).json({ error: 'Stock must be a non-negative number' });
  }

  if ((unit === 'piece' || unit === 'bunch') && !Number.isInteger(numStock)) {
    return res.status(400).json({ error: `Stock for ${unit} must be a whole integer` });
  }

  // Real Supabase user write path
  if (!isDevPersona && supabaseProductsRepo.isAvailable()) {
    try {
      const created = await supabaseProductsRepo.createProduct({
        farmerId: effectiveFarmerId,
        title: title.trim(),
        description: description ? String(description).trim() : 'Fresh farm crop direct from local harvest.',
        category: category || 'Vegetables',
        price: numPrice,
        unit: unit || 'kg',
        stock: numStock,
        isOrganic: Boolean(isOrganic),
        imageUrl: imageUrl || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=800',
      });
      return res.status(201).json({ product: created });
    } catch (err: any) {
      console.error('[SupabaseProducts] Error creating real farmer product:', err);
      return res.status(500).json({ error: err.message || 'Failed to save crop listing in database' });
    }
  }

  // Development persona fallback path
  if (!farmer || farmer.role !== 'farmer') {
    return res.status(403).json({ error: 'Unauthorized: Only registered farmers can list crops' });
  }

  const newProduct: Product = {
    id: 'prod_' + Date.now(),
    farmer_id: effectiveFarmerId,
    farmer_name: `${farmer.full_name} (${farmer.farm_name || 'Farm'})`,
    farmer_location: farmer.location || 'Telangana / Andhra Region',
    title: title.trim(),
    description: description ? String(description).trim() : 'Fresh farm crop direct from local harvest.',
    category: category || 'Vegetables',
    price: numPrice,
    unit: unit || 'kg',
    stock: numStock,
    is_organic: Boolean(isOrganic),
    image_url: imageUrl || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=800',
    created_at: new Date().toISOString(),
  };

  db.products.unshift(newProduct);
  saveDB(db);
  res.status(201).json({ product: newProduct });
});

app.put('/api/products/:id', async (req: Request, res: Response) => {
  const authUser = (req as AuthenticatedRequest).user;
  const effectiveFarmerId = authUser?.userId || req.body.farmerId;
  const { price, stock, unit, title, description, category, is_organic, image_url } = req.body;

  if (!effectiveFarmerId) {
    return res.status(401).json({ error: 'Unauthorized: Farmer authentication required' });
  }

  let finalPrice: number | undefined;
  if (price !== undefined) {
    const numPrice = Number(price);
    if (!Number.isFinite(numPrice) || numPrice <= 0) {
      return res.status(400).json({ error: 'Price must be a valid positive number' });
    }
    finalPrice = numPrice;
  }

  let finalStock: number | undefined;
  if (stock !== undefined) {
    const numStock = Number(stock);
    if (!Number.isFinite(numStock) || numStock < 0) {
      return res.status(400).json({ error: 'Stock must be a non-negative number' });
    }
    const checkUnit = unit || 'kg';
    if ((checkUnit === 'piece' || checkUnit === 'bunch') && !Number.isInteger(numStock)) {
      return res.status(400).json({ error: `Stock for ${checkUnit} must be a whole integer` });
    }
    finalStock = numStock;
  }

  try {
    const updated = await CatalogRepository.updateProduct(
      req.params.id,
      {
        title,
        description,
        category,
        price: finalPrice,
        unit,
        stock: finalStock,
        is_organic,
        image_url,
      },
      effectiveFarmerId
    );
    return res.json({ product: updated });
  } catch (err: any) {
    if (err.message.includes('Forbidden')) {
      return res.status(403).json({ error: err.message });
    }
    if (err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    return res.status(400).json({ error: err.message });
  }
});

app.put('/api/inventory/:productId', async (req: Request, res: Response) => {
  const authUser = (req as AuthenticatedRequest).user;
  const effectiveFarmerId = authUser?.userId || req.body.farmerId;
  const { quantity } = req.body;

  if (!effectiveFarmerId) {
    return res.status(401).json({ error: 'Unauthorized: Farmer authentication required' });
  }

  const numQty = Number(quantity);
  if (!Number.isFinite(numQty) || numQty < 0) {
    return res.status(400).json({ error: 'Quantity must be a valid non-negative number' });
  }

  try {
    const result = await CatalogRepository.updateInventoryStock(req.params.productId, numQty, effectiveFarmerId);
    return res.json({ success: true, productId: result.productId, stock: result.stock });
  } catch (err: any) {
    if (err.message.includes('Forbidden')) {
      return res.status(403).json({ error: err.message });
    }
    if (err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    return res.status(400).json({ error: err.message });
  }
});

app.delete('/api/products/:id', async (req: Request, res: Response) => {
  const authUser = (req as AuthenticatedRequest).user;
  const effectiveFarmerId = authUser?.userId || (req.query.farmerId as string);

  if (!effectiveFarmerId) {
    return res.status(401).json({ error: 'Unauthorized: Farmer authentication required' });
  }

  try {
    const deleted = await CatalogRepository.deleteProduct(req.params.id, effectiveFarmerId);
    if (!deleted) {
      return res.status(404).json({ error: 'Product not found' });
    }
    return res.json({ success: true, deletedId: req.params.id });
  } catch (err: any) {
    if (err.message.includes('Forbidden')) {
      return res.status(403).json({ error: err.message });
    }
    return res.status(400).json({ error: err.message });
  }
});

// 3. Cart Management
app.get('/api/cart', requireAuth, async (req: Request, res: Response) => {
  const authUser = (req as AuthenticatedRequest).user!;
  if (req.query.userId && req.query.userId !== authUser.userId) {
    return res.status(403).json({ error: 'Access denied: Cannot access another user\'s cart' });
  }
  const effectiveUserId = authUser.userId;

  try {
    const cart = await supabaseCartsRepo.getCart(effectiveUserId);
    res.json({ cart });
  } catch (err: any) {
    console.error('[Cart API] Error fetching cart:', err);
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

app.post('/api/cart', requireAuth, async (req: Request, res: Response) => {
  const authUser = (req as AuthenticatedRequest).user!;
  if (req.body.userId && req.body.userId !== authUser.userId) {
    return res.status(403).json({ error: 'Access denied: Cannot modify another user\'s cart' });
  }
  const effectiveUserId = authUser.userId;
  const { productId, quantity } = req.body;
  if (!productId) {
    return res.status(400).json({ error: 'productId is required' });
  }

  try {
    const result = await supabaseCartsRepo.addItem(effectiveUserId, productId, Number(quantity || 1));
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/cart/:id', requireAuth, async (req: Request, res: Response) => {
  const authUser = (req as AuthenticatedRequest).user!;
  if (req.body.userId && req.body.userId !== authUser.userId) {
    return res.status(403).json({ error: 'Access denied: Cannot modify another user\'s cart' });
  }
  const effectiveUserId = authUser.userId;
  const { quantity } = req.body;

  try {
    const result = await supabaseCartsRepo.updateQuantity(effectiveUserId, req.params.id, Number(quantity));
    res.json(result);
  } catch (err: any) {
    if (err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/cart/:id', requireAuth, async (req: Request, res: Response) => {
  const authUser = (req as AuthenticatedRequest).user!;
  if (req.query.userId && req.query.userId !== authUser.userId) {
    return res.status(403).json({ error: 'Access denied: Cannot modify another user\'s cart' });
  }
  const effectiveUserId = authUser.userId;

  try {
    const result = await supabaseCartsRepo.removeItem(effectiveUserId, req.params.id);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/cart', requireAuth, async (req: Request, res: Response) => {
  const authUser = (req as AuthenticatedRequest).user!;
  if (req.query.userId && req.query.userId !== authUser.userId) {
    return res.status(403).json({ error: 'Access denied: Cannot modify another user\'s cart' });
  }
  const effectiveUserId = authUser.userId;

  try {
    const result = await supabaseCartsRepo.clearCart(effectiveUserId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 4. Wishlist
app.get('/api/wishlist', requireAuth, async (req: Request, res: Response) => {
  const authUser = (req as AuthenticatedRequest).user!;
  if (req.query.userId && req.query.userId !== authUser.userId) {
    return res.status(403).json({ error: 'Access denied: Cannot access another user\'s wishlist' });
  }
  const effectiveUserId = authUser.userId;

  try {
    const wishlist = await supabaseWishlistsRepo.getWishlist(effectiveUserId);
    res.json({ wishlist });
  } catch (err: any) {
    console.error('[Wishlist API] Error fetching wishlist:', err);
    res.status(500).json({ error: 'Failed to fetch wishlist' });
  }
});

app.post('/api/wishlist/toggle', requireAuth, async (req: Request, res: Response) => {
  const authUser = (req as AuthenticatedRequest).user!;
  if (req.body.userId && req.body.userId !== authUser.userId) {
    return res.status(403).json({ error: 'Access denied: Cannot modify another user\'s wishlist' });
  }
  const effectiveUserId = authUser.userId;
  const { productId } = req.body;
  if (!productId || typeof productId !== 'string') {
    return res.status(400).json({ error: 'productId is required' });
  }

  try {
    const result = await supabaseWishlistsRepo.toggleWishlist(effectiveUserId, productId);
    res.json(result);
  } catch (err: any) {
    if (err.message.includes('not found') || err.message.includes('inactive')) {
      return res.status(404).json({ error: err.message });
    }
    res.status(400).json({ error: err.message || 'Failed to toggle wishlist' });
  }
});

// 5. Browse History
app.get('/api/browse-history', requireAuth, async (req: Request, res: Response) => {
  const authUser = (req as AuthenticatedRequest).user!;
  if (req.query.userId && req.query.userId !== authUser.userId) {
    return res.status(403).json({ error: 'Access denied: Cannot access another user\'s browse history' });
  }
  const effectiveUserId = authUser.userId;

  try {
    const history = await supabaseBrowseHistoryRepo.getHistory(effectiveUserId);
    res.json({ history });
  } catch (err: any) {
    console.error('[Browse History API] Error getting history:', err);
    res.status(500).json({ error: 'Failed to fetch browse history' });
  }
});

app.post('/api/browse-history', requireAuth, async (req: Request, res: Response) => {
  const authUser = (req as AuthenticatedRequest).user!;
  if (req.body.userId && req.body.userId !== authUser.userId) {
    return res.status(403).json({ error: 'Access denied: Cannot modify another user\'s browse history' });
  }
  const effectiveUserId = authUser.userId;
  const { productId } = req.body;
  if (!productId || typeof productId !== 'string' || !productId.trim()) {
    return res.status(400).json({ error: 'productId is required' });
  }

  try {
    const result = await supabaseBrowseHistoryRepo.recordView(effectiveUserId, productId.trim());
    res.json(result);
  } catch (err: any) {
    console.warn('[Browse History API] Error recording view:', err.message);
    if (err.message?.includes('not found') || err.message?.includes('inactive')) {
      return res.status(404).json({ error: err.message });
    }
    res.status(400).json({ error: err.message || 'Failed to record browse history' });
  }
});

// 5.5. Reviews
app.get('/api/reviews', async (req: Request, res: Response) => {
  const { productId, farmerId } = req.query;

  try {
    if (productId && typeof productId === 'string') {
      const reviews = await supabaseReviewsRepo.getReviewsByProduct(productId);
      return res.json({ reviews });
    }
    if (farmerId && typeof farmerId === 'string') {
      const reviews = await supabaseReviewsRepo.getReviewsByFarmer(farmerId);
      return res.json({ reviews });
    }
    const reviews = await supabaseReviewsRepo.getAllReviews();
    res.json({ reviews });
  } catch (err: any) {
    console.error('[Reviews API] Error fetching reviews:', err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

app.post('/api/reviews', requireAuth, async (req: Request, res: Response) => {
  const authUser = (req as AuthenticatedRequest).user!;
  if (authUser.role !== 'customer') {
    return res.status(403).json({ error: 'Forbidden: Only customers can submit product reviews' });
  }

  // Cross-user prevention: Never trust body userId
  if (req.body.userId && req.body.userId !== authUser.userId) {
    return res.status(403).json({ error: 'Access denied: Cannot submit a review on behalf of another user' });
  }

  const effectiveUserId = authUser.userId;
  const customerName = authUser.profile?.full_name || 'Customer';
  const { orderId, productId, rating, comment } = req.body;

  try {
    const result = await supabaseReviewsRepo.createReview({
      userId: effectiveUserId,
      customerName,
      orderId,
      productId,
      rating,
      comment,
    });
    res.status(201).json(result);
  } catch (err: any) {
    console.warn('[Reviews API] Error creating review:', err.message);
    const msg = err.message || 'Failed to submit review';
    if (msg.includes('Forbidden') || msg.includes('belong to you')) {
      return res.status(403).json({ error: msg });
    }
    if (msg.includes('not found') || msg.includes('inactive')) {
      return res.status(404).json({ error: msg });
    }
    if (msg.includes('already submitted')) {
      return res.status(409).json({ error: msg });
    }
    res.status(400).json({ error: msg });
  }
});

// 6. Orders & Checkout
app.get('/api/orders', requireAuth, async (req: Request, res: Response) => {
  const authUser = (req as AuthenticatedRequest).user!;
  if (req.query.userId && req.query.userId !== authUser.userId) {
    return res.status(403).json({ error: 'Access denied: Cannot access another user\'s orders' });
  }
  const effectiveUserId = authUser.userId;
  const effectiveRole = authUser.role;

  try {
    const orders = await supabaseOrdersRepo.getOrders(effectiveUserId, effectiveRole);
    res.json({ orders });
  } catch (err: any) {
    console.error('[Orders API] Error fetching orders:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

app.post('/api/orders', requireAuth, async (req: Request, res: Response) => {
  const authUser = (req as AuthenticatedRequest).user!;
  if (authUser.role !== 'customer') {
    return res.status(403).json({ error: 'Forbidden: Only customer accounts can place orders' });
  }
  const { deliveryAddress } = req.body;

  if (!deliveryAddress || typeof deliveryAddress !== 'string' || !deliveryAddress.trim()) {
    return res.status(400).json({ error: 'Valid delivery address is required' });
  }

  try {
    const customerProfile: Profile = authUser.profile || {
      id: authUser.userId,
      auth_method: 'email',
      full_name: 'Customer',
      role: 'customer' as UserRole,
      preferred_language: 'en',
      created_at: new Date().toISOString(),
    };

    const result = await supabaseOrdersRepo.checkout(customerProfile, deliveryAddress.trim());
    res.status(201).json(result);
  } catch (err: any) {
    console.warn('[Orders API] Checkout error:', err.message);
    res.status(400).json({ error: err.message || 'Checkout failed' });
  }
});

// Update Order Status
app.patch('/api/orders/:id/status', requireAuth, async (req: Request, res: Response) => {
  const authUser = (req as AuthenticatedRequest).user!;
  const effectiveUserId = authUser.userId;
  const effectiveRole = authUser.role;
  const { status, otpCode } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  try {
    const result = await supabaseOrdersRepo.updateOrderStatus({
      orderId: req.params.id,
      userId: effectiveUserId,
      role: effectiveRole,
      newStatus: status,
      otpCode,
    });
    res.json(result);
  } catch (err: any) {
    const msg = err.message || 'Failed to update order status';
    if (msg.includes('Forbidden')) return res.status(403).json({ error: msg });
    if (msg.includes('not found')) return res.status(404).json({ error: msg });
    if (msg.includes('no longer available') || msg.includes('claimed by another')) return res.status(409).json({ error: msg });
    res.status(400).json({ error: msg });
  }
});

// 7. Intelligent Demand Analytics (Farmer)
app.get('/api/farmer/analytics/:farmerId', async (req: Request, res: Response) => {
  const farmerId = req.params.farmerId;

  try {
    const farmerOrders = await supabaseOrdersRepo.getOrders(farmerId, 'farmer');
    const completedOrders = farmerOrders.filter((o) => o.status === 'delivered');

    const totalOrders = completedOrders.length;
    const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total_amount, 0);
    const aov = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    const calculationOrders = completedOrders.length > 0
      ? completedOrders
      : farmerOrders.filter((o) => o.status !== 'cancelled');

    const cropVolumes: Record<string, { title: string; volume: number; revenue: number; unit?: string }> = {};
    const allQuantities: number[] = [];

    for (const ord of calculationOrders) {
      for (const item of ord.items) {
        allQuantities.push(item.quantity);
        if (!cropVolumes[item.product_id]) {
          cropVolumes[item.product_id] = { title: item.title, volume: 0, revenue: 0, unit: item.unit };
        }
        cropVolumes[item.product_id].volume += item.quantity;
        cropVolumes[item.product_id].revenue += item.price * item.quantity;
      }
    }

    const sumVol = allQuantities.reduce((a, b) => a + b, 0);
    const meanVolume = allQuantities.length > 0 ? Number((sumVol / allQuantities.length).toFixed(1)) : 0;

    const sorted = [...allQuantities].sort((a, b) => a - b);
    let medianVolume = 0;
    if (sorted.length > 0) {
      const mid = Math.floor(sorted.length / 2);
      medianVolume = sorted.length % 2 !== 0 ? sorted[mid] : Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(1));
    }

    const freqMap: Record<number, number> = {};
    let maxFreq = 0;
    for (const q of allQuantities) {
      freqMap[q] = (freqMap[q] || 0) + 1;
      if (freqMap[q] > maxFreq) {
        maxFreq = freqMap[q];
      }
    }

    let modeVolume = 0;
    if (allQuantities.length === 1) {
      modeVolume = allQuantities[0];
    } else if (maxFreq > 1) {
      const modes = Object.keys(freqMap)
        .map(Number)
        .filter((k) => freqMap[k] === maxFreq);
      modeVolume = modes[0] || 0;
    }

    const topCrops = Object.values(cropVolumes).sort((a, b) => b.volume - a.volume);

    const seasonalTrends = [
      { month: 'May', sales: 120, cropName: 'Tomatoes & Mangoes' },
      { month: 'Jun', sales: 210, cropName: 'Organic Greens & Papayas' },
      { month: 'Jul', sales: 340, cropName: 'Pulses & A2 Milk' },
      { month: 'Aug (Current)', sales: 480, cropName: 'Vine Tomatoes & Leafy Greens' },
    ];

    const plantingSuggestions = [
      {
        crop: 'Vine Tomatoes & Bell Peppers',
        demandLevel: 'High' as const,
        reason: 'Surging demand in Hitech City & Jubilee Hills metro region (+42% YoY projection).',
      },
      {
        crop: 'Organic Palak & Methi Leaves',
        demandLevel: 'Critical Shortage' as const,
        reason: 'Monsoon leafy green supply deficit; premium price realization expected.',
      },
      {
        crop: 'Desi Turmeric & Ginger',
        demandLevel: 'Medium' as const,
        reason: 'Steady herbal health product demand with zero spoilage risk.',
      },
    ];

    const analytics: DemandAnalytics = {
      aov,
      totalOrders,
      totalRevenue,
      meanVolume,
      medianVolume,
      modeVolume,
      topCrops,
      seasonalTrends,
      plantingSuggestions,
    };

    res.json({ analytics });
  } catch (err: any) {
    console.error('[Analytics API] Error:', err);
    res.status(500).json({ error: 'Failed to compute farmer analytics' });
  }
});

// 7.5. Farmer Crop Plans API
app.get('/api/farmer/crop-plans', requireAuth, async (req: Request, res: Response) => {
  const authUser = (req as AuthenticatedRequest).user!;
  if (authUser.role !== 'farmer') {
    return res.status(403).json({ error: 'Forbidden: Only authenticated farmers can access crop plans' });
  }

  if (req.query.farmerId && req.query.farmerId !== authUser.userId) {
    return res.status(403).json({ error: 'Access denied: Cannot access another farmer\'s crop plans' });
  }
  const effectiveUserId = authUser.userId;

  try {
    const cropPlans = await supabaseCropPlansRepo.getByFarmerId(effectiveUserId);
    res.json({ cropPlans });
  } catch (err: any) {
    console.error('[Crop Plans API] Error fetching crop plans:', err);
    res.status(500).json({ error: 'Failed to fetch crop plans' });
  }
});

app.get('/api/farmer/crop-plans/:id', requireAuth, async (req: Request, res: Response) => {
  const authUser = (req as AuthenticatedRequest).user!;
  if (authUser.role !== 'farmer') {
    return res.status(403).json({ error: 'Forbidden: Only authenticated farmers can view crop plans' });
  }

  try {
    const plan = await supabaseCropPlansRepo.getPlanById(req.params.id, authUser.userId);
    if (!plan) {
      return res.status(404).json({ error: 'Crop plan not found' });
    }
    res.json({ cropPlan: plan });
  } catch (err: any) {
    const msg = err.message || 'Failed to fetch crop plan';
    if (msg.includes('Forbidden')) return res.status(403).json({ error: msg });
    res.status(400).json({ error: msg });
  }
});

app.post('/api/farmer/crop-plans', requireAuth, async (req: Request, res: Response) => {
  const authUser = (req as AuthenticatedRequest).user!;
  if (authUser.role !== 'farmer') {
    return res.status(403).json({ error: 'Forbidden: Only authenticated farmers can create crop plans' });
  }

  // Cross-farmer prevention: Client-supplied farmerId must match authenticated session
  if (req.body.farmerId && req.body.farmerId !== authUser.userId) {
    return res.status(403).json({ error: 'Access denied: Cannot create a crop plan on behalf of another farmer' });
  }
  const effectiveUserId = authUser.userId;

  const { cropName, season, plantingDate, expectedHarvestDate, areaAcres, notes, status } = req.body;

  try {
    const result = await supabaseCropPlansRepo.create(effectiveUserId, {
      cropName,
      season,
      plantingDate,
      expectedHarvestDate,
      areaAcres,
      notes,
      status,
    });
    res.status(201).json(result);
  } catch (err: any) {
    console.warn('[Crop Plans API] Create error:', err.message);
    res.status(400).json({ error: err.message || 'Failed to create crop plan' });
  }
});

app.patch('/api/farmer/crop-plans/:id', requireAuth, async (req: Request, res: Response) => {
  const authUser = (req as AuthenticatedRequest).user!;
  if (authUser.role !== 'farmer') {
    return res.status(403).json({ error: 'Forbidden: Only authenticated farmers can update crop plans' });
  }

  if (req.body.farmerId && req.body.farmerId !== authUser.userId) {
    return res.status(403).json({ error: 'Access denied: Cannot modify crop plan on behalf of another farmer' });
  }
  const effectiveUserId = authUser.userId;

  try {
    const result = await supabaseCropPlansRepo.update(req.params.id, effectiveUserId, req.body);
    res.json(result);
  } catch (err: any) {
    console.warn('[Crop Plans API] Update error:', err.message);
    const msg = err.message || 'Failed to update crop plan';
    if (msg.includes('Forbidden')) return res.status(403).json({ error: msg });
    if (msg.includes('not found')) return res.status(404).json({ error: msg });
    res.status(400).json({ error: msg });
  }
});

app.delete('/api/farmer/crop-plans/:id', requireAuth, async (req: Request, res: Response) => {
  const authUser = (req as AuthenticatedRequest).user!;
  if (authUser.role !== 'farmer') {
    return res.status(403).json({ error: 'Forbidden: Only authenticated farmers can delete crop plans' });
  }

  try {
    const result = await supabaseCropPlansRepo.delete(req.params.id, authUser.userId);
    res.json(result);
  } catch (err: any) {
    console.warn('[Crop Plans API] Delete error:', err.message);
    const msg = err.message || 'Failed to delete crop plan';
    if (msg.includes('Forbidden')) return res.status(403).json({ error: msg });
    if (msg.includes('not found')) return res.status(404).json({ error: msg });
    res.status(400).json({ error: msg });
  }
});

// 8. Weather Forecast API
app.get('/api/weather', (req: Request, res: Response) => {
  const days: WeatherDay[] = [
    {
      day: 'Today',
      date: 'Aug 3',
      tempMax: 31,
      tempMin: 22,
      condition: 'Partly Cloudy',
      humidity: 78,
      windKm: 14,
      rainfallMm: 2,
      rainProbability: 25,
      advisory: 'Optimal condition for evening irrigation and fresh leaf harvesting.',
    },
    {
      day: 'Tomorrow',
      date: 'Aug 4',
      tempMax: 29,
      tempMin: 21,
      condition: 'Light Rain',
      humidity: 84,
      windKm: 18,
      rainfallMm: 12,
      rainProbability: 75,
      advisory: 'Hold fertilizer sprays due to expected afternoon rain showers.',
    },
    {
      day: 'Wednesday',
      date: 'Aug 5',
      tempMax: 27,
      tempMin: 20,
      condition: 'Heavy Rain',
      humidity: 91,
      windKm: 24,
      rainfallMm: 38,
      rainProbability: 95,
      advisory: 'Ensure clear field drainage channels to prevent root rot in tomato plots.',
    },
    {
      day: 'Thursday',
      date: 'Aug 6',
      tempMax: 30,
      tempMin: 22,
      condition: 'Partly Cloudy',
      humidity: 75,
      windKm: 12,
      rainfallMm: 4,
      rainProbability: 35,
      advisory: 'Favorable window for soil aeration and natural neem oil pest prevention.',
    },
    {
      day: 'Friday',
      date: 'Aug 7',
      tempMax: 32,
      tempMin: 23,
      condition: 'Sunny',
      humidity: 65,
      windKm: 10,
      rainfallMm: 0,
      rainProbability: 10,
      advisory: 'Great harvesting weather for fruit orchards and grain drying.',
    },
    {
      day: 'Saturday',
      date: 'Aug 8',
      tempMax: 33,
      tempMin: 24,
      condition: 'Sunny',
      humidity: 62,
      windKm: 11,
      rainfallMm: 0,
      rainProbability: 10,
      advisory: 'Ideal sunshine for sun-drying turmeric, pulses, and seeds.',
    },
    {
      day: 'Sunday',
      date: 'Aug 9',
      tempMax: 30,
      tempMin: 22,
      condition: 'Light Rain',
      humidity: 80,
      windKm: 16,
      rainfallMm: 8,
      rainProbability: 60,
      advisory: 'Pre-monsoon drip irrigation scheduling recommended for next crop cycle.',
    },
  ];

  res.json({ forecast: days });
});

// 9. AI Farming Assistant (Farm2Home AI Agronomist - Gemini 3.8 Flash Server-Side)
app.post('/api/ai/assistant', async (req: Request, res: Response) => {
  const { prompt, language, role, userId, history, image } = req.body;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    const db = getDB();
    const authUser = (req as AuthenticatedRequest).user;
    const effectiveUserId = authUser?.userId || userId;
    const effectiveRole = authUser?.role || role || 'farmer';
    let userName: string | undefined = authUser?.profile.full_name;
    let farmerProducts: Product[] = [];
    let farmerOrders: Order[] = [];
    let farmerCropPlans: CropPlan[] = [];

    if (effectiveUserId) {
      const userProfile = db.profiles.find((p) => p.id === effectiveUserId);
      if (userProfile) {
        userName = userProfile.full_name;
      }
    }

    if (effectiveRole === 'farmer') {
      if (effectiveUserId) {
        farmerProducts = db.products.filter((p) => p.farmer_id === effectiveUserId);
        farmerOrders = db.orders.filter((o) => o.farmer_id === effectiveUserId);
      } else {
        farmerProducts = db.products.filter((p) => p.farmer_id === 'usr_ramesh_farmer');
        farmerOrders = db.orders.filter((o) => o.farmer_id === 'usr_ramesh_farmer');
      }

      try {
        farmerCropPlans = await supabaseCropPlansRepo.getByFarmerId(effectiveUserId || 'usr_ramesh_farmer');
      } catch (err) {
        console.warn('[AI Assistant] Notice loading farmer crop plans:', err);
      }
    }

    const availableMarketProducts = db.products.filter((p) => p.stock > 0);
    const weatherForecast = [
      {
        day: 'Today',
        date: 'Aug 3',
        tempMax: 31,
        tempMin: 22,
        condition: 'Partly Cloudy',
        humidity: 78,
        windKm: 14,
        rainfallMm: 2,
        advisory: 'Optimal condition for evening irrigation and fresh leaf harvesting.',
      },
      {
        day: 'Tomorrow',
        date: 'Aug 4',
        tempMax: 29,
        tempMin: 21,
        condition: 'Light Rain',
        humidity: 84,
        windKm: 18,
        rainfallMm: 12,
        advisory: 'Hold fertilizer sprays due to expected afternoon rain showers.',
      },
    ];

    let conversationHistory = Array.isArray(history) && history.length > 0 ? history : [];
    if (conversationHistory.length === 0 && effectiveUserId) {
      try {
        conversationHistory = await supabaseAiConversationsRepo.getRecentHistory(effectiveUserId);
      } catch (hErr) {
        console.warn('[AI Assistant] Error loading recent history:', hErr);
      }
    }

    const result = await agronomistBrain.consultAgronomist({
      prompt: prompt.trim(),
      context: {
        role: effectiveRole,
        userId,
        userName,
        language: language || 'en',
        farmerProducts,
        farmerOrders,
        farmerCropPlans,
        availableMarketProducts,
        weatherForecast,
      },
      history: conversationHistory,
      image: image?.inlineData?.data ? image : undefined,
    });

    if (effectiveUserId && result?.answer) {
      try {
        const conv = await supabaseAiConversationsRepo.getOrCreateActiveConversation(
          effectiveUserId,
          effectiveRole,
          'AI Agronomist Advisory',
          language || 'en'
        );
        await supabaseAiConversationsRepo.saveMessage({
          conversationId: conv.id,
          userId: effectiveUserId,
          role: 'user',
          content: prompt.trim(),
          language: language || 'en',
        });
        await supabaseAiConversationsRepo.saveMessage({
          conversationId: conv.id,
          userId: effectiveUserId,
          role: 'model',
          content: result.answer,
          language: language || 'en',
          metadata: { category: result.category, confidence: result.confidence },
        });
      } catch (err) {
        console.warn('[AI Assistant] Notice recording AI conversation turn:', err);
      }
    }

    res.json(result);
  } catch (error) {
    console.error('AI Agronomist Server Error:', error);
    res.status(503).json({
      answer: 'Farm2Home AI Agronomist is temporarily busy. Please try again in a moment.',
      language: req.body?.language || 'en',
      category: 'service_notice',
      confidence: 'low',
      needs_more_information: false,
      follow_up_questions: [],
      warnings: ['Farm2Home AI Agronomist is temporarily busy. Please try again in a moment.'],
    });
  }
});

// Start Server with Vite Integration
async function startServer() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🌾 Farm2Home Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
