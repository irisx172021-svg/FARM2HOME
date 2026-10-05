import fs from 'fs';
import path from 'path';
import { getDatabase } from './connection.js';
import { usersRepo } from './repositories/usersRepo.js';
import { authIdentitiesRepo } from './repositories/authIdentitiesRepo.js';
import { profilesRepo } from './repositories/profilesRepo.js';
import { productsRepo } from './repositories/productsRepo.js';
import { ordersRepo } from './repositories/ordersRepo.js';
import { reviewsRepo } from './repositories/reviewsRepo.js';

export function seedDatabase(): void {
  const db = getDatabase();
  const jsonPath = path.join(process.cwd(), 'data', 'farm2home.json');

  if (!fs.existsSync(jsonPath)) {
    return;
  }

  try {
    const raw = fs.readFileSync(jsonPath, 'utf-8');
    const data = JSON.parse(raw);

    // 1. Seed Users and Profiles
    if (Array.isArray(data.profiles)) {
      for (const p of data.profiles) {
        const existing = usersRepo.getById(p.id);
        if (!existing) {
          usersRepo.create({
            id: p.id,
            display_name: p.full_name || 'Farm2Home Member',
            email: p.email || null,
            phone: p.phone_number || null,
            role: p.role || null,
            preferred_language: 'en',
          });

          // Link default identity
          if (p.phone_number) {
            const cleanPhone = p.phone_number.replace(/\D/g, '');
            if (!authIdentitiesRepo.findByProviderUid('phone', cleanPhone)) {
              authIdentitiesRepo.create({
                id: `id_phone_${p.id}`,
                userId: p.id,
                provider: 'phone',
                providerUid: cleanPhone,
              });
            }
          }
          if (p.email) {
            const cleanEmail = p.email.trim().toLowerCase();
            if (!authIdentitiesRepo.findByProviderUid('email', cleanEmail)) {
              authIdentitiesRepo.create({
                id: `id_email_${p.id}`,
                userId: p.id,
                provider: 'email',
                providerUid: cleanEmail,
              });
            }
          }
        }

        // Upsert role profile
        if (p.role === 'farmer') {
          profilesRepo.upsertFarmerProfile({
            userId: p.id,
            farmName: p.farm_name,
            location: p.location,
            avatarUrl: p.avatar_url,
            certificateUrl: p.certificate_url,
            approved: p.approved,
          });
        } else if (p.role === 'customer') {
          profilesRepo.upsertCustomerProfile({
            userId: p.id,
            defaultAddress: p.location,
            location: p.location,
            avatarUrl: p.avatar_url,
          });
        } else if (p.role === 'delivery') {
          profilesRepo.upsertDeliveryProfile({
            userId: p.id,
            vehicleType: 'Two-Wheeler EV',
            activeZone: p.location || 'Hyderabad Metro Zone',
            location: p.location,
            avatarUrl: p.avatar_url,
          });
        }
      }
    }

    // 2. Seed Products
    if (Array.isArray(data.products)) {
      for (const prod of data.products) {
        const existing = productsRepo.getById(prod.id);
        if (!existing) {
          productsRepo.create({
            id: prod.id,
            farmer_id: prod.farmer_id,
            farmer_name: prod.farmer_name,
            farmer_location: prod.farmer_location,
            title: prod.title,
            description: prod.description,
            category: prod.category,
            price: prod.price,
            unit: prod.unit,
            stock: prod.stock,
            is_organic: Boolean(prod.is_organic),
            image_url: prod.image_url,
            created_at: prod.created_at,
          });
        }
      }
    }

    // 3. Seed Orders
    if (Array.isArray(data.orders)) {
      for (const ord of data.orders) {
        const existing = ordersRepo.getById(ord.id);
        if (!existing) {
          ordersRepo.create({
            id: ord.id,
            customer_id: ord.customer_id,
            customer_name: ord.customer_name,
            customer_phone: ord.customer_phone,
            farmer_id: ord.farmer_id,
            farmer_name: ord.farmer_name,
            farmer_phone: ord.farmer_phone,
            delivery_partner_id: ord.delivery_partner_id,
            delivery_partner_name: ord.delivery_partner_name,
            items: ord.items || [],
            total_amount: ord.total_amount,
            status: ord.status,
            delivery_address: ord.delivery_address,
            otp_code: ord.otp_code,
            created_at: ord.created_at,
            completed_at: ord.completed_at,
            delivery_fare: ord.delivery_fare || 140,
          });
        }
      }
    }

    // 4. Seed Reviews
    if (Array.isArray(data.reviews)) {
      for (const rev of data.reviews) {
        const existing = db.prepare('SELECT id FROM reviews WHERE id = ?').get(rev.id);
        if (!existing) {
          db.prepare(`
            INSERT INTO reviews (id, order_id, customer_id, customer_name, farmer_id, rating, comment, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            rev.id,
            rev.order_id || null,
            rev.customer_id,
            rev.customer_name,
            rev.farmer_id,
            rev.rating,
            rev.comment,
            rev.created_at || new Date().toISOString()
          );
        }
      }
    }

    // 5. Seed Carts
    if (Array.isArray(data.carts)) {
      for (const c of data.carts) {
        db.prepare(`
          INSERT OR IGNORE INTO carts (id, user_id, updated_at)
          VALUES (?, ?, ?)
        `).run(`cart_${c.user_id}`, c.user_id, c.added_at || new Date().toISOString());

        db.prepare(`
          INSERT OR IGNORE INTO cart_items (id, cart_id, user_id, product_id, quantity, added_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(c.id, `cart_${c.user_id}`, c.user_id, c.product_id, c.quantity || 1, c.added_at || new Date().toISOString());
      }
    }

    console.log('✅ SQLite relational database seeded idempotently.');
  } catch (err) {
    console.error('Error during database seed:', err);
  }
}
