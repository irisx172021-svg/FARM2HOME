-- ==============================================================================
-- Farm2Home Development Fixtures Layer (PostgreSQL / Supabase)
-- Strictly isolated development seed tables without foreign keys to users.
-- ==============================================================================

-- 1. Create Fixture Tables
CREATE TABLE IF NOT EXISTS development_seed_products (
  product_id TEXT PRIMARY KEY,
  farmer_id TEXT NOT NULL,
  farmer_name TEXT NOT NULL,
  farmer_location TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  price NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  stock NUMERIC NOT NULL,
  is_organic BOOLEAN DEFAULT TRUE,
  image_url TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS development_seed_inventory (
  inventory_id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL UNIQUE REFERENCES development_seed_products(product_id) ON DELETE CASCADE,
  farmer_id TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  reserved_quantity NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dev_seed_products_farmer_id ON development_seed_products(farmer_id);
CREATE INDEX IF NOT EXISTS idx_dev_seed_products_category ON development_seed_products(category);

-- 2. Seed 8 Canonical Development Products (Idempotent)
INSERT INTO development_seed_products (
  product_id, farmer_id, farmer_name, farmer_location, title, description,
  category, price, unit, stock, is_organic, image_url, status, created_at, updated_at
) VALUES
(
  'prod_101', 'usr_ramesh_farmer', 'Ramesh Kumar (Green Earth Organic Acres)', 'Medak, Telangana',
  'Vine-Ripened Organic Tomatoes', 'Locally grown heirloom red tomatoes harvested fresh from greenhouse beds. Rich in lycopene and pesticide-free.',
  'Vegetables', 42, 'kg', 120, TRUE,
  'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=800',
  'active', '2026-09-30T10:00:00.000Z', NOW()
),
(
  'prod_102', 'usr_ramesh_farmer', 'Ramesh Kumar (Green Earth Organic Acres)', 'Medak, Telangana',
  'Farm Fresh Palak (Spinach) Bunch', 'Crisp dark green spinach cut at sunrise. Cleaned and packaged in biodegradable craft paper pouches.',
  'Vegetables', 25, 'bunch', 65, TRUE,
  'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&q=80&w=800',
  'active', '2026-09-30T10:15:00.000Z', NOW()
),
(
  'prod_103', 'usr_saraswathi_farmer', 'Saraswathi Devi (Sri Lakshmi Orchard)', 'Warangal, Telangana',
  'Premium Banganapalli Mangoes', 'Naturally carbide-free tree-ripened royal mangoes. Sweet floral aroma and rich buttery golden pulp.',
  'Fruits', 130, 'kg', 250, TRUE,
  'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&q=80&w=800',
  'active', '2026-09-30T10:30:00.000Z', NOW()
),
(
  'prod_104', 'usr_saraswathi_farmer', 'Saraswathi Devi (Sri Lakshmi Orchard)', 'Warangal, Telangana',
  'Fresh Sweet Papaya', 'Farm-plucked red lady variety papaya with sweet salmon flesh. Excellent digestive enzymes.',
  'Fruits', 45, 'piece', 80, TRUE,
  'https://images.unsplash.com/photo-1517282009859-f000ec3b26fe?auto=format&fit=crop&q=80&w=800',
  'active', '2026-09-30T10:45:00.000Z', NOW()
),
(
  'prod_105', 'usr_anil_farmer', 'Anil Reddy (Krishna River Organic Basin)', 'Kurnool, Andhra Pradesh',
  'Aromatic Sona Masoori Rice (Aged)', 'Single origin 12-month aged unpolished grains. Lightweight, fluffy cooking with low glycemic index.',
  'Grains & Cereals', 68, 'kg', 500, FALSE,
  'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=800',
  'active', '2026-09-30T11:00:00.000Z', NOW()
),
(
  'prod_106', 'usr_anil_farmer', 'Anil Reddy (Krishna River Organic Basin)', 'Kurnool, Andhra Pradesh',
  'Unpolished Toor Dal (Pigeon Pea)', 'Sun-dried protein-rich lentils processed on village stone chakki. No synthetic chemical polish or colorants.',
  'Pulses & Spices', 145, 'kg', 300, TRUE,
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800',
  'active', '2026-09-30T11:15:00.000Z', NOW()
),
(
  'prod_107', 'usr_ramesh_farmer', 'Ramesh Kumar (Green Earth Organic Acres)', 'Medak, Telangana',
  'Raw Farm A2 Cow Milk', 'Chilled raw unprocessed A2 milk from free-roaming Desi Gir cows. Delivered in glass bottles within 4 hours of milking.',
  'Dairy & Poultry', 75, 'liter', 40, TRUE,
  'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&q=80&w=800',
  'active', '2026-09-30T11:30:00.000Z', NOW()
),
(
  'prod_108', 'usr_ramesh_farmer', 'Ramesh Kumar (Green Earth Organic Acres)', 'Medak, Telangana',
  'Hand-Pounded Stone Curcuma Turmeric Powder', 'High curcumin (>5.2%) single origin golden turmeric ground cold on traditional stone mills.',
  'Organic Special', 180, 'gram', 90, TRUE,
  'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=800',
  'active', '2026-09-30T11:45:00.000Z', NOW()
)
ON CONFLICT (product_id) DO UPDATE SET
  farmer_id = EXCLUDED.farmer_id,
  farmer_name = EXCLUDED.farmer_name,
  farmer_location = EXCLUDED.farmer_location,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  price = EXCLUDED.price,
  unit = EXCLUDED.unit,
  stock = EXCLUDED.stock,
  is_organic = EXCLUDED.is_organic,
  image_url = EXCLUDED.image_url,
  status = EXCLUDED.status,
  updated_at = NOW();

-- 3. Seed 8 Canonical Development Inventory Rows (Idempotent)
INSERT INTO development_seed_inventory (
  inventory_id, product_id, farmer_id, quantity, reserved_quantity, updated_at
) VALUES
('inv_prod_101', 'prod_101', 'usr_ramesh_farmer', 120, 0, NOW()),
('inv_prod_102', 'prod_102', 'usr_ramesh_farmer', 65, 0, NOW()),
('inv_prod_103', 'prod_103', 'usr_saraswathi_farmer', 250, 0, NOW()),
('inv_prod_104', 'prod_104', 'usr_saraswathi_farmer', 80, 0, NOW()),
('inv_prod_105', 'prod_105', 'usr_anil_farmer', 500, 0, NOW()),
('inv_prod_106', 'prod_106', 'usr_anil_farmer', 300, 0, NOW()),
('inv_prod_107', 'prod_107', 'usr_ramesh_farmer', 40, 0, NOW()),
('inv_prod_108', 'prod_108', 'usr_ramesh_farmer', 90, 0, NOW())
ON CONFLICT (product_id) DO UPDATE SET
  quantity = EXCLUDED.quantity,
  farmer_id = EXCLUDED.farmer_id,
  updated_at = NOW();
