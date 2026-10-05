import { getDatabase } from './connection.js';

export function initSchema(): void {
  const db = getDatabase();

  db.exec(`
    -- 1. Core Users Table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      role TEXT CHECK(role IN ('customer', 'farmer', 'delivery') OR role IS NULL),
      preferred_language TEXT DEFAULT 'en',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_login_at TEXT,
      status TEXT DEFAULT 'active'
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

    -- 2. Linked Authentication Identities Table (Google, Phone, Email/Password, Passkey)
    CREATE TABLE IF NOT EXISTS auth_identities (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      provider TEXT NOT NULL CHECK(provider IN ('google', 'phone', 'email', 'passkey')),
      provider_uid TEXT NOT NULL,
      password_hash TEXT,
      passkey_public_key TEXT,
      passkey_counter INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      last_used_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(provider, provider_uid)
    );

    CREATE INDEX IF NOT EXISTS idx_identities_user_id ON auth_identities(user_id);
    CREATE INDEX IF NOT EXISTS idx_identities_provider_uid ON auth_identities(provider, provider_uid);

    -- 3. Sessions Table
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      last_active_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

    -- 4. Farmer Profiles
    CREATE TABLE IF NOT EXISTS farmer_profiles (
      user_id TEXT PRIMARY KEY,
      farm_name TEXT,
      location TEXT,
      avatar_url TEXT,
      certificate_url TEXT,
      approved INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- 5. Customer Profiles
    CREATE TABLE IF NOT EXISTS customer_profiles (
      user_id TEXT PRIMARY KEY,
      default_address TEXT,
      location TEXT,
      avatar_url TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- 6. Delivery Partner Profiles
    CREATE TABLE IF NOT EXISTS delivery_profiles (
      user_id TEXT PRIMARY KEY,
      vehicle_type TEXT DEFAULT 'Two-Wheeler EV',
      active_zone TEXT DEFAULT 'Hyderabad Metro Zone',
      location TEXT,
      avatar_url TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- 7. Products Table
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      farmer_id TEXT NOT NULL,
      farmer_name TEXT NOT NULL,
      farmer_location TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      unit TEXT NOT NULL,
      stock REAL NOT NULL,
      is_organic INTEGER DEFAULT 1,
      image_url TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_products_farmer_id ON products(farmer_id);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

    -- 8. Inventory Table
    CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL UNIQUE,
      farmer_id TEXT NOT NULL,
      quantity REAL NOT NULL,
      alert_threshold REAL DEFAULT 10,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- 9. Orders Table
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT,
      farmer_id TEXT NOT NULL,
      farmer_name TEXT NOT NULL,
      farmer_phone TEXT,
      delivery_partner_id TEXT,
      delivery_partner_name TEXT,
      total_amount REAL NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending', 'accepted', 'out_for_delivery', 'delivered', 'cancelled')),
      delivery_address TEXT NOT NULL,
      otp_code TEXT NOT NULL,
      created_at TEXT NOT NULL,
      completed_at TEXT,
      delivery_fare REAL DEFAULT 140,
      FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
    CREATE INDEX IF NOT EXISTS idx_orders_farmer_id ON orders(farmer_id);
    CREATE INDEX IF NOT EXISTS idx_orders_delivery_partner_id ON orders(delivery_partner_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

    -- 10. Order Items Table
    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      title TEXT NOT NULL,
      price REAL NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL,
      image_url TEXT,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

    -- 11. Carts Table (One cart per user)
    CREATE TABLE IF NOT EXISTS carts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_carts_user_id ON carts(user_id);

    -- 12. Cart Items Table
    CREATE TABLE IF NOT EXISTS cart_items (
      id TEXT PRIMARY KEY,
      cart_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity REAL NOT NULL,
      added_at TEXT NOT NULL,
      FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      UNIQUE(user_id, product_id)
    );

    CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);

    -- 13. Wishlists Table
    CREATE TABLE IF NOT EXISTS wishlists (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON wishlists(user_id);

    -- 14. Wishlist Items Table
    CREATE TABLE IF NOT EXISTS wishlist_items (
      id TEXT PRIMARY KEY,
      wishlist_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      added_at TEXT NOT NULL,
      FOREIGN KEY (wishlist_id) REFERENCES wishlists(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      UNIQUE(user_id, product_id)
    );

    CREATE INDEX IF NOT EXISTS idx_wishlist_items_user_id ON wishlist_items(user_id);

    -- 15. Browse History Table
    CREATE TABLE IF NOT EXISTS browse_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      viewed_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_browse_history_user_id ON browse_history(user_id);

    -- 16. Reviews Table
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      order_id TEXT,
      customer_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      farmer_id TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      comment TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_reviews_farmer_id ON reviews(farmer_id);

    -- 17. Crop Plans Table
    CREATE TABLE IF NOT EXISTS crop_plans (
      id TEXT PRIMARY KEY,
      farmer_id TEXT NOT NULL,
      plan_name TEXT NOT NULL,
      crop_name TEXT NOT NULL,
      acreage REAL NOT NULL,
      target_yield REAL,
      season TEXT NOT NULL,
      start_date TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT NOT NULL,
      FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_crop_plans_farmer_id ON crop_plans(farmer_id);

    -- 18. AI Conversations Table (Persistent user-scoped memory)
    CREATE TABLE IF NOT EXISTS ai_conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id);

    -- 19. AI Messages Table (Persistent user-scoped memory)
    CREATE TABLE IF NOT EXISTS ai_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      language TEXT DEFAULT 'en',
      metadata TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_id ON ai_messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_ai_messages_user_id ON ai_messages(user_id);
  `);
}
