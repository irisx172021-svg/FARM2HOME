import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
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
} from './src/types.js';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

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

// Database Persistence file path
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'farm2home.json');

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
      status: 'delivered',
      delivery_address: 'Flat 402, Green Valley Apts, Hitech City, Hyderabad - 500081',
      otp_code: '123456',
      created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
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

// Helper to load and save DB
function getDB(): DBData {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(initialSeed, null, 2));
      return initialSeed;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading db file:', err);
    return initialSeed;
  }
}

function saveDB(db: DBData): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (err) {
    console.error('Error writing db file:', err);
  }
}

// Ensure initial database exists on startup
getDB();

// API Endpoints

// 1. Auth & Profiles
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { authMethod, identifier, password, role, fullName, farmName, location } = req.body;
  const db = getDB();

  let existing = db.profiles.find((p) =>
    authMethod === 'email'
      ? p.email?.toLowerCase() === identifier?.toLowerCase()
      : p.phone_number === identifier
  );

  if (existing) {
    return res.json({ profile: existing, isNew: false });
  }

  // Create new profile if not found
  const newProfile: Profile = {
    id: 'usr_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
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

  return res.json({ profile: newProfile, isNew: true });
});

app.get('/api/profiles/:id', (req: Request, res: Response) => {
  const db = getDB();
  const profile = db.profiles.find((p) => p.id === req.params.id);
  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }
  res.json({ profile });
});

app.put('/api/profiles/:id', (req: Request, res: Response) => {
  const db = getDB();
  const index = db.profiles.findIndex((p) => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Profile not found' });
  }
  db.profiles[index] = {
    ...db.profiles[index],
    ...req.body,
  };
  saveDB(db);
  res.json({ profile: db.profiles[index] });
});

// Get all profiles (for dev role switcher)
app.get('/api/profiles', (req: Request, res: Response) => {
  const db = getDB();
  res.json({ profiles: db.profiles });
});

// 2. Products
app.get('/api/products', (req: Request, res: Response) => {
  const { category, farmerId, search, organicOnly } = req.query;
  const db = getDB();
  let list = [...db.products];

  if (farmerId) {
    list = list.filter((p) => p.farmer_id === String(farmerId));
  }
  if (category && category !== 'All') {
    list = list.filter((p) => p.category === String(category));
  }
  if (organicOnly === 'true') {
    list = list.filter((p) => p.is_organic);
  }
  if (search) {
    const term = String(search).toLowerCase();
    list = list.filter(
      (p) =>
        p.title.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term) ||
        (p.farmer_name && p.farmer_name.toLowerCase().includes(term))
    );
  }

  res.json({ products: list });
});

app.post('/api/products', (req: Request, res: Response) => {
  const { farmerId, title, description, category, price, unit, stock, isOrganic, imageUrl } = req.body;
  const db = getDB();

  const farmer = db.profiles.find((p) => p.id === farmerId);
  if (!farmer || farmer.role !== 'farmer') {
    return res.status(403).json({ error: 'Unauthorized: Only registered farmers can list crops' });
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

  const newProduct: Product = {
    id: 'prod_' + Date.now(),
    farmer_id: farmerId,
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

app.put('/api/products/:id', (req: Request, res: Response) => {
  const db = getDB();
  const index = db.products.findIndex((p) => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const product = db.products[index];
  const { farmerId, price, stock, unit, title, description, category, is_organic, image_url } = req.body;

  // Security check: farmer can only update own products
  if (!farmerId || product.farmer_id !== farmerId) {
    return res.status(403).json({ error: 'Forbidden: You can only edit your own crops' });
  }

  let finalPrice = product.price;
  if (price !== undefined) {
    const numPrice = Number(price);
    if (!Number.isFinite(numPrice) || numPrice <= 0) {
      return res.status(400).json({ error: 'Price must be a valid positive number' });
    }
    finalPrice = numPrice;
  }

  let finalUnit = unit || product.unit;
  let finalStock = product.stock;
  if (stock !== undefined) {
    const numStock = Number(stock);
    if (!Number.isFinite(numStock) || numStock < 0) {
      return res.status(400).json({ error: 'Stock must be a non-negative number' });
    }
    if ((finalUnit === 'piece' || finalUnit === 'bunch') && !Number.isInteger(numStock)) {
      return res.status(400).json({ error: `Stock for ${finalUnit} must be a whole integer` });
    }
    finalStock = numStock;
  }

  db.products[index] = {
    ...product,
    title: title !== undefined ? String(title).trim() : product.title,
    description: description !== undefined ? String(description).trim() : product.description,
    category: category || product.category,
    unit: finalUnit,
    price: finalPrice,
    stock: finalStock,
    is_organic: is_organic !== undefined ? Boolean(is_organic) : product.is_organic,
    image_url: image_url || product.image_url,
  };

  saveDB(db);
  res.json({ product: db.products[index] });
});

app.delete('/api/products/:id', (req: Request, res: Response) => {
  const { farmerId } = req.query;
  const db = getDB();
  const product = db.products.find((p) => p.id === req.params.id);

  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  if (!farmerId || product.farmer_id !== String(farmerId)) {
    return res.status(403).json({ error: 'Forbidden: You can only delete your own crops' });
  }

  db.products = db.products.filter((p) => p.id !== req.params.id);
  saveDB(db);
  res.json({ success: true, deletedId: req.params.id });
});

// 3. Cart Management (Isolated per User & Strict Stock Verification)
app.get('/api/cart', (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: 'Missing userId parameter' });

  const db = getDB();
  const userCart = db.carts.filter((c) => c.user_id === userId);

  const cartWithProducts = userCart.map((item) => {
    const prod = db.products.find((p) => p.id === item.product_id);
    return {
      ...item,
      product: prod,
      is_available: Boolean(prod && prod.stock > 0),
      stock_exceeded: Boolean(prod && item.quantity > prod.stock),
    };
  });

  res.json({ cart: cartWithProducts });
});

app.post('/api/cart', (req: Request, res: Response) => {
  const { userId, productId, quantity } = req.body;
  if (!userId || !productId) {
    return res.status(400).json({ error: 'userId and productId required' });
  }

  const db = getDB();
  const user = db.profiles.find((p) => p.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'User profile not found' });
  }

  const product = db.products.find((p) => p.id === productId);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const qty = Number(quantity || 1);
  if (!Number.isFinite(qty) || qty <= 0) {
    return res.status(400).json({ error: 'Quantity must be a positive number' });
  }

  if ((product.unit === 'piece' || product.unit === 'bunch') && !Number.isInteger(qty)) {
    return res.status(400).json({ error: `Quantity for ${product.unit} must be a whole number` });
  }

  if (product.stock <= 0) {
    return res.status(400).json({ error: `"${product.title}" is currently out of stock.` });
  }

  const existing = db.carts.find((c) => c.user_id === userId && c.product_id === productId);
  const targetQty = (existing ? existing.quantity : 0) + qty;

  if (targetQty > product.stock) {
    return res.status(400).json({
      error: `Cannot add ${qty} ${product.unit}. Only ${product.stock} ${product.unit} available in stock${
        existing ? ` (you already have ${existing.quantity} in cart)` : ''
      }.`,
    });
  }

  if (existing) {
    existing.quantity = targetQty;
  } else {
    const newItem: CartItem = {
      id: 'cart_' + Date.now(),
      user_id: userId,
      product_id: productId,
      quantity: qty,
      added_at: new Date().toISOString(),
    };
    db.carts.push(newItem);
  }

  saveDB(db);
  res.json({ success: true });
});

app.put('/api/cart/:id', (req: Request, res: Response) => {
  const { userId, quantity } = req.body;
  const db = getDB();

  const itemIndex = db.carts.findIndex((c) => c.id === req.params.id && c.user_id === userId);
  if (itemIndex === -1) {
    return res.status(404).json({ error: 'Cart item not found or not owned by user' });
  }

  const cartItem = db.carts[itemIndex];
  const numQty = Number(quantity);

  if (numQty <= 0) {
    db.carts.splice(itemIndex, 1);
    saveDB(db);
    return res.json({ success: true, removed: true });
  }

  if (!Number.isFinite(numQty)) {
    return res.status(400).json({ error: 'Quantity must be a valid number' });
  }

  const product = db.products.find((p) => p.id === cartItem.product_id);
  if (!product) {
    // Product was deleted from system, remove item from cart
    db.carts.splice(itemIndex, 1);
    saveDB(db);
    return res.status(400).json({ error: 'Product is no longer available and was removed from your cart' });
  }

  if ((product.unit === 'piece' || product.unit === 'bunch') && !Number.isInteger(numQty)) {
    return res.status(400).json({ error: `Quantity for ${product.unit} must be a whole integer` });
  }

  if (numQty > product.stock) {
    return res.status(400).json({
      error: `Requested quantity (${numQty} ${product.unit}) exceeds available stock (${product.stock} ${product.unit}).`,
    });
  }

  db.carts[itemIndex].quantity = numQty;
  saveDB(db);
  res.json({ success: true });
});

app.delete('/api/cart/:id', (req: Request, res: Response) => {
  const { userId } = req.query;
  const db = getDB();

  db.carts = db.carts.filter((c) => !(c.id === req.params.id && c.user_id === String(userId)));
  saveDB(db);
  res.json({ success: true });
});

// 4. Wishlist (Isolated per User)
app.get('/api/wishlist', (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: 'Missing userId parameter' });

  const db = getDB();
  const userWishlist = db.wishlists.filter((w) => w.user_id === userId);

  const wishlistWithProducts = userWishlist.map((item) => ({
    ...item,
    product: db.products.find((p) => p.id === item.product_id),
  }));

  res.json({ wishlist: wishlistWithProducts });
});

app.post('/api/wishlist/toggle', (req: Request, res: Response) => {
  const { userId, productId } = req.body;
  if (!userId || !productId) return res.status(400).json({ error: 'userId and productId required' });

  const db = getDB();
  const existingIndex = db.wishlists.findIndex((w) => w.user_id === userId && w.product_id === productId);

  let isWishlisted = false;
  if (existingIndex !== -1) {
    db.wishlists.splice(existingIndex, 1);
  } else {
    db.wishlists.push({
      id: 'wish_' + Date.now(),
      user_id: userId,
      product_id: productId,
      created_at: new Date().toISOString(),
    });
    isWishlisted = true;
  }

  saveDB(db);
  res.json({ isWishlisted });
});

// 5. Browse History (Isolated per User)
app.get('/api/browse-history', (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: 'Missing userId parameter' });

  const db = getDB();
  const userHistory = db.browse_history
    .filter((h) => h.user_id === userId)
    .sort((a, b) => new Date(b.viewed_at).getTime() - new Date(a.viewed_at).getTime());

  const historyWithProducts = userHistory.map((item) => ({
    ...item,
    product: db.products.find((p) => p.id === item.product_id),
  }));

  res.json({ history: historyWithProducts });
});

app.post('/api/browse-history', (req: Request, res: Response) => {
  const { userId, productId } = req.body;
  if (!userId || !productId) return res.status(400).json({ error: 'userId and productId required' });

  const db = getDB();
  // Filter out any existing view of same product for clean chronological history
  db.browse_history = db.browse_history.filter((h) => !(h.user_id === userId && h.product_id === productId));

  db.browse_history.unshift({
    id: 'hist_' + Date.now(),
    user_id: userId,
    product_id: productId,
    viewed_at: new Date().toISOString(),
  });

  // Limit history per user to 30 items
  const userHist = db.browse_history.filter((h) => h.user_id === userId);
  if (userHist.length > 30) {
    const oldest = userHist[userHist.length - 1];
    db.browse_history = db.browse_history.filter((h) => h.id !== oldest.id);
  }

  saveDB(db);
  res.json({ success: true });
});

// 6. Orders & Checkout
app.get('/api/orders', (req: Request, res: Response) => {
  const { userId, role } = req.query;
  if (!userId) return res.status(400).json({ error: 'Missing userId parameter' });

  const db = getDB();
  let list = [...db.orders];

  if (role === 'customer') {
    list = list.filter((o) => o.customer_id === String(userId));
  } else if (role === 'farmer') {
    list = list.filter((o) => o.farmer_id === String(userId));
  } else if (role === 'delivery') {
    // Delivery partner sees open unassigned jobs ('accepted' without partner) OR assigned jobs ('out_for_delivery' or 'delivered' by them)
    list = list.filter(
      (o) =>
        (o.status === 'accepted' && !o.delivery_partner_id) ||
        o.delivery_partner_id === String(userId)
    );
  } else {
    // Default fallback to customer scoping
    list = list.filter((o) => o.customer_id === String(userId));
  }

  list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  res.json({ orders: list });
});

// Create Order from Cart with Atomic Inventory Validation
app.post('/api/orders', (req: Request, res: Response) => {
  const { userId, deliveryAddress } = req.body;
  if (!userId || !deliveryAddress || typeof deliveryAddress !== 'string' || !deliveryAddress.trim()) {
    return res.status(400).json({ error: 'Valid userId and delivery address are required' });
  }

  const db = getDB();
  const customer = db.profiles.find((p) => p.id === userId);
  if (!customer) return res.status(404).json({ error: 'Customer profile not found' });
  if (customer.role !== 'customer') {
    return res.status(403).json({ error: 'Unauthorized: Only registered customers can place orders' });
  }

  const userCart = db.carts.filter((c) => c.user_id === userId);
  if (userCart.length === 0) {
    return res.status(400).json({ error: 'Your cart is empty. Please add items before checking out.' });
  }

  // ATOMIC VALIDATION PASS
  // 1. Verify every cart item exists in products, has valid stock, and positive valid quantity
  const validatedItems: { product: Product; quantity: number }[] = [];

  for (const item of userCart) {
    const prod = db.products.find((p) => p.id === item.product_id);
    if (!prod) {
      return res.status(400).json({
        error: `An item in your cart is no longer available in the marketplace. Please remove it to proceed.`
      });
    }

    const qty = Number(item.quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({
        error: `Invalid quantity specified for "${prod.title}".`
      });
    }

    if ((prod.unit === 'piece' || prod.unit === 'bunch') && !Number.isInteger(qty)) {
      return res.status(400).json({
        error: `"${prod.title}" (${prod.unit}) requires whole integer quantities.`
      });
    }

    if (prod.stock < qty) {
      return res.status(400).json({
        error: `Insufficient stock for "${prod.title}". You requested ${qty} ${prod.unit}, but only ${prod.stock} ${prod.unit} is available. Please update your cart.`
      });
    }

    validatedItems.push({ product: prod, quantity: qty });
  }

  // Group items by farmer_id to create clean individual orders per farmer
  const itemsByFarmer: Record<string, { product: Product; quantity: number }[]> = {};
  for (const vi of validatedItems) {
    if (!itemsByFarmer[vi.product.farmer_id]) {
      itemsByFarmer[vi.product.farmer_id] = [];
    }
    itemsByFarmer[vi.product.farmer_id].push(vi);
  }

  const createdOrders: Order[] = [];

  // Deduct stock and assemble orders
  for (const [farmerId, farmerItems] of Object.entries(itemsByFarmer)) {
    const farmer = db.profiles.find((p) => p.id === farmerId);

    const orderItems = farmerItems.map((fi) => ({
      product_id: fi.product.id,
      title: fi.product.title,
      price: fi.product.price,
      quantity: fi.quantity,
      unit: fi.product.unit,
      image_url: fi.product.image_url,
    }));

    const totalAmount = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Generate unique 6-digit delivery OTP code
    const otpCode = String(Math.floor(100000 + Math.random() * 900000));

    const newOrder: Order = {
      id: 'ord_' + Math.floor(100000 + Math.random() * 900000),
      customer_id: userId,
      customer_name: customer.full_name,
      customer_phone: customer.phone_number || customer.email,
      farmer_id: farmerId,
      farmer_name: farmer ? `${farmer.full_name} (${farmer.farm_name || 'Farm'})` : 'Farmer',
      farmer_phone: farmer?.phone_number || farmer?.email,
      delivery_partner_id: null,
      items: orderItems,
      total_amount: totalAmount,
      status: 'pending',
      delivery_address: deliveryAddress.trim(),
      otp_code: otpCode,
      created_at: new Date().toISOString(),
    };

    // Deduct stock strictly
    for (const fi of farmerItems) {
      const prodIndex = db.products.findIndex((p) => p.id === fi.product.id);
      if (prodIndex !== -1) {
        db.products[prodIndex].stock = Math.max(0, db.products[prodIndex].stock - fi.quantity);
      }
    }

    db.orders.unshift(newOrder);
    createdOrders.push(newOrder);
  }

  // Clear customer cart ONLY after validation and order creation succeed
  db.carts = db.carts.filter((c) => c.user_id !== userId);

  saveDB(db);
  res.status(201).json({ success: true, orders: createdOrders });
});

// Update Order Status (Accept/Reject with Stock Restoration, Pickup, Deliver via OTP)
app.patch('/api/orders/:id/status', (req: Request, res: Response) => {
  const { userId, role, status, otpCode } = req.body;
  if (!userId || !role || !status) {
    return res.status(400).json({ error: 'userId, role, and status are required' });
  }

  const db = getDB();
  const orderIndex = db.orders.findIndex((o) => o.id === req.params.id);
  if (orderIndex === -1) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const order = db.orders[orderIndex];

  // Terminal states cannot be altered
  if (order.status === 'delivered') {
    return res.status(400).json({ error: 'Order has already been delivered and completed. Status cannot be changed.' });
  }
  if (order.status === 'cancelled') {
    return res.status(400).json({ error: 'Order has already been cancelled and cannot be changed.' });
  }

  if (role === 'farmer') {
    if (order.farmer_id !== userId) {
      return res.status(403).json({ error: 'Forbidden: You can only update orders for your own farm' });
    }

    // Farmer can only transition from 'pending'
    if (order.status !== 'pending') {
      return res.status(400).json({ error: `Order is already in '${order.status}' state and cannot be modified by farmer.` });
    }

    if (status === 'accepted') {
      order.status = 'accepted';
    } else if (status === 'cancelled') {
      // Order Rejection: restore inventory stock!
      order.status = 'cancelled';
      for (const item of order.items) {
        const prodIdx = db.products.findIndex((p) => p.id === item.product_id);
        if (prodIdx !== -1) {
          db.products[prodIdx].stock += item.quantity;
        }
      }
    } else {
      return res.status(400).json({ error: `Invalid status for farmer. Farmer can only accept or cancel pending orders.` });
    }
  } else if (role === 'delivery') {
    const partner = db.profiles.find((p) => p.id === userId && p.role === 'delivery');
    if (!partner) {
      return res.status(403).json({ error: 'Forbidden: Valid delivery partner account required' });
    }

    if (status === 'out_for_delivery') {
      // Must be currently 'accepted'
      if (order.status !== 'accepted') {
        return res.status(409).json({ error: `Delivery job is no longer available (current status: ${order.status}).` });
      }
      // Cannot claim if another delivery partner already claimed it
      if (order.delivery_partner_id && order.delivery_partner_id !== userId) {
        return res.status(409).json({ error: 'This delivery job has already been claimed by another delivery partner.' });
      }

      order.status = 'out_for_delivery';
      order.delivery_partner_id = userId;
      order.delivery_partner_name = partner.full_name;
    } else if (status === 'delivered') {
      // Must be out for delivery
      if (order.status !== 'out_for_delivery') {
        return res.status(400).json({ error: 'Order must be out for delivery before it can be marked as delivered.' });
      }
      // Must be assigned to this delivery partner
      if (order.delivery_partner_id !== userId) {
        return res.status(403).json({ error: 'Forbidden: You are not the assigned delivery partner for this order.' });
      }
      // Must verify OTP
      if (!otpCode || String(otpCode).trim() !== String(order.otp_code).trim()) {
        return res.status(400).json({ error: 'Invalid Delivery OTP Code. Please verify the 6-digit code with the customer.' });
      }
      order.status = 'delivered';
    } else {
      return res.status(400).json({ error: `Invalid status transition for delivery partner: ${status}` });
    }
  } else {
    return res.status(403).json({ error: 'Forbidden: Unauthorized role for order status updates' });
  }

  saveDB(db);
  res.json({ order });
});

// 7. Intelligent Demand Analytics (Farmer)
app.get('/api/farmer/analytics/:farmerId', (req: Request, res: Response) => {
  const db = getDB();
  const farmerId = req.params.farmerId;

  // Filter orders for this farmer
  const farmerOrders = db.orders.filter((o) => o.farmer_id === farmerId);

  // Completed/delivered orders for finalized revenue and statistical calculation
  const completedOrders = farmerOrders.filter((o) => o.status === 'delivered');

  const totalOrders = completedOrders.length;
  const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total_amount, 0);
  const aov = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  // Calculate Crop Volumes strictly from valid completed orders (or non-cancelled if early stage)
  const calculationOrders = completedOrders.length > 0
    ? completedOrders
    : farmerOrders.filter((o) => o.status !== 'cancelled');

  const cropVolumes: Record<string, { title: string; volume: number; revenue: number }> = {};
  const allQuantities: number[] = [];

  for (const ord of calculationOrders) {
    for (const item of ord.items) {
      allQuantities.push(item.quantity);
      if (!cropVolumes[item.product_id]) {
        cropVolumes[item.product_id] = { title: item.title, volume: 0, revenue: 0 };
      }
      cropVolumes[item.product_id].volume += item.quantity;
      cropVolumes[item.product_id].revenue += item.price * item.quantity;
    }
  }

  // Mean volume
  const sumVol = allQuantities.reduce((a, b) => a + b, 0);
  const meanVolume = allQuantities.length > 0 ? Number((sumVol / allQuantities.length).toFixed(1)) : 0;

  // Median volume
  const sorted = [...allQuantities].sort((a, b) => a - b);
  let medianVolume = 0;
  if (sorted.length > 0) {
    const mid = Math.floor(sorted.length / 2);
    medianVolume = sorted.length % 2 !== 0 ? sorted[mid] : Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(1));
  }

  // Mode volume (handle 0 mode, 1 mode, or multiple modes)
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

  // Seasonal Trends & Planting Suggestions (Data-based market projections)
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
    {
      day: 'Wednesday',
      date: 'Aug 5',
      tempMax: 27,
      tempMin: 20,
      condition: 'Heavy Rain',
      humidity: 91,
      windKm: 24,
      rainfallMm: 38,
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
      advisory: 'Pre-monsoon drip irrigation scheduling recommended for next crop cycle.',
    },
  ];

  res.json({ forecast: days });
});

// 9. AI Farming Assistant (Gemini API Server-Side)
app.post('/api/ai/assistant', async (req: Request, res: Response) => {
  const { prompt, language, role } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  if (!ai) {
    // Graceful fallback response if GEMINI_API_KEY is not yet attached
    return res.json({
      answer:
        '🌾 **Farm2Home AI Specialist**: I am ready to help! To activate deep AI reasoning for crop health, disease diagnosis, and dynamic market trends, please ensure your GEMINI_API_KEY secret is configured in AI Studio Settings.',
    });
  }

  try {
    const langInstructions: Record<string, string> = {
      te: 'Respond primarily in Telugu (తెలుగు) with clear bullet points.',
      hi: 'Respond primarily in Hindi (हिन्दी) with clear bullet points.',
      ta: 'Respond primarily in Tamil (தமிழ்) with clear bullet points.',
      en: 'Respond in clear English with concise structured formatting and bullet points.',
    };

    const systemInstruction = `You are "Farm2Home AI Specialist", an expert agricultural advisor and farm-to-consumer strategist.
You assist local farmers, customers, and delivery partners with:
1. Crop care, organic pest control, soil health, fertilizer ratios (NPK), and irrigation schedules.
2. Market pricing guidance, direct-to-consumer demand forecasting, and crop harvest timing.
3. Healthy organic food nutrition and storage tips for customers.
4. Optimal farm delivery logistics and temperature preservation for perishable produce.

Tone: Encouraging, knowledgeable, clear, practical.
User Role: ${role || 'customer'}.
Language Preference: ${langInstructions[language as string] || langInstructions.en}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const answer = response.text || 'Unable to generate response at this time.';
    res.json({ answer });
  } catch (error) {
    console.error('Gemini Assistant Error:', error);
    res.status(500).json({
      error: 'Failed to consult AI Assistant',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// Start Server with Vite Integration
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌾 Farm2Home Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
