-- ==============================================================================
-- Farm2Home Production RLS & Database Security Hardening Migration
-- ==============================================================================
-- Architecture:
-- 1. All frontend client traffic is mediated exclusively by the Express backend.
-- 2. The Express server connects using the service-role client (BYPASSRLS).
-- 3. Direct browser / anon access to database tables is locked down via RLS.
-- 4. No broad "authenticated can do everything" policies are permitted.
-- ==============================================================================

-- 1. User & Authentication Tables
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.auth_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.farmer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.delivery_profiles ENABLE ROW LEVEL SECURITY;

-- 2. Catalog & Inventory Tables
ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.inventory ENABLE ROW LEVEL SECURITY;

-- 3. Orders & Commerce Tables
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.browse_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reviews ENABLE ROW LEVEL SECURITY;

-- 4. Farmer Advisory & AI Tables
ALTER TABLE IF EXISTS public.crop_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ai_messages ENABLE ROW LEVEL SECURITY;

-- 5. Development Fixture Tables
ALTER TABLE IF EXISTS public.development_seed_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.development_seed_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.development_seed_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.development_seed_order_items ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- Targeted Policies for Public/Anon Role (Strict Least Privilege)
-- ==============================================================================

-- Products: Allow public read of active products only; deny all direct client writes
DROP POLICY IF EXISTS "Public can view active products" ON public.products;
CREATE POLICY "Public can view active products"
  ON public.products
  FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

-- Reviews: Allow public read of reviews; deny all direct client writes
DROP POLICY IF EXISTS "Public can view reviews" ON public.reviews;
CREATE POLICY "Public can view reviews"
  ON public.reviews
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Development Seed Products: Allow public read of active development fixtures
DROP POLICY IF EXISTS "Public can view dev active products" ON public.development_seed_products;
CREATE POLICY "Public can view dev active products"
  ON public.development_seed_products
  FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

-- All other tables (users, auth_identities, sessions, profiles, orders, carts,
-- wishlists, browse_history, crop_plans, ai_conversations, ai_messages, inventory)
-- have RLS enabled with NO public/anon policies, meaning direct client/anon queries
-- are automatically DENIED by PostgreSQL default-deny semantics.
-- The Express backend operates with the service-role key which bypasses RLS safely.
