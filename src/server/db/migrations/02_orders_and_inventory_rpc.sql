-- ==============================================================================
-- Farm2Home Orders Migration & Concurrency-Safe Inventory RPCs
-- ==============================================================================

-- 1. Atomic Production Inventory Decrement Function
CREATE OR REPLACE FUNCTION decrement_product_inventory(
  p_product_id TEXT,
  p_quantity NUMERIC
) RETURNS JSONB AS $$
DECLARE
  v_inv RECORD;
BEGIN
  IF p_quantity <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quantity must be greater than zero');
  END IF;

  UPDATE inventory
  SET quantity = quantity - p_quantity,
      updated_at = NOW()
  WHERE product_id = p_product_id AND quantity >= p_quantity
  RETURNING * INTO v_inv;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient stock or inventory record not found');
  END IF;

  RETURN jsonb_build_object('success', true, 'remaining_quantity', v_inv.quantity);
END;
$$ LANGUAGE plpgsql;

-- 2. Atomic Production Inventory Restore Function (for cancellations)
CREATE OR REPLACE FUNCTION restore_product_inventory(
  p_product_id TEXT,
  p_quantity NUMERIC
) RETURNS JSONB AS $$
DECLARE
  v_inv RECORD;
BEGIN
  IF p_quantity <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quantity must be greater than zero');
  END IF;

  UPDATE inventory
  SET quantity = quantity + p_quantity,
      updated_at = NOW()
  WHERE product_id = p_product_id
  RETURNING * INTO v_inv;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Inventory record not found');
  END IF;

  RETURN jsonb_build_object('success', true, 'new_quantity', v_inv.quantity);
END;
$$ LANGUAGE plpgsql;

-- 3. Atomic Development Fixture Inventory Decrement Function
CREATE OR REPLACE FUNCTION decrement_dev_fixture_inventory(
  p_product_id TEXT,
  p_quantity NUMERIC
) RETURNS JSONB AS $$
DECLARE
  v_inv RECORD;
BEGIN
  IF p_quantity <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quantity must be greater than zero');
  END IF;

  UPDATE development_seed_inventory
  SET quantity = quantity - p_quantity,
      updated_at = NOW()
  WHERE product_id = p_product_id AND quantity >= p_quantity
  RETURNING * INTO v_inv;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient development fixture stock');
  END IF;

  RETURN jsonb_build_object('success', true, 'remaining_quantity', v_inv.quantity);
END;
$$ LANGUAGE plpgsql;

-- 4. Atomic Development Fixture Inventory Restore Function
CREATE OR REPLACE FUNCTION restore_dev_fixture_inventory(
  p_product_id TEXT,
  p_quantity NUMERIC
) RETURNS JSONB AS $$
DECLARE
  v_inv RECORD;
BEGIN
  IF p_quantity <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quantity must be greater than zero');
  END IF;

  UPDATE development_seed_inventory
  SET quantity = quantity + p_quantity,
      updated_at = NOW()
  WHERE product_id = p_product_id
  RETURNING * INTO v_inv;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Development fixture inventory record not found');
  END IF;

  RETURN jsonb_build_object('success', true, 'new_quantity', v_inv.quantity);
END;
$$ LANGUAGE plpgsql;

-- 5. Isolated Development Seed Orders & Order Items Tables
CREATE TABLE IF NOT EXISTS development_seed_orders (
  order_id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  farmer_id TEXT NOT NULL,
  farmer_name TEXT NOT NULL,
  farmer_phone TEXT,
  delivery_partner_id TEXT,
  delivery_partner_name TEXT,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  delivery_fare NUMERIC NOT NULL DEFAULT 80,
  status TEXT NOT NULL DEFAULT 'pending',
  delivery_address TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS development_seed_order_items (
  order_item_id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES development_seed_orders(order_id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES development_seed_products(product_id),
  farmer_id TEXT NOT NULL,
  title TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  image_url TEXT
);

CREATE INDEX IF NOT EXISTS idx_dev_seed_orders_customer_id ON development_seed_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_dev_seed_orders_farmer_id ON development_seed_orders(farmer_id);
CREATE INDEX IF NOT EXISTS idx_dev_seed_orders_delivery_partner_id ON development_seed_orders(delivery_partner_id);
CREATE INDEX IF NOT EXISTS idx_dev_seed_order_items_order_id ON development_seed_order_items(order_id);

-- 6. Seed Legacy Development Orders (Idempotent)
INSERT INTO development_seed_orders (
  order_id, customer_id, customer_name, customer_phone, farmer_id, farmer_name, farmer_phone,
  delivery_partner_id, delivery_partner_name, total_amount, delivery_fare, status,
  delivery_address, otp_code, created_at, updated_at, completed_at
) VALUES
(
  'ord_9001', 'usr_rahul_customer', 'Rahul Verma', '+91 99887 76655', 'usr_ramesh_farmer', 'Ramesh Kumar (Green Earth)', '+91 98765 43210',
  'usr_vikram_delivery', 'Vikram Singh', 176, 140, 'out_for_delivery',
  'Flat 402, Green Valley Apts, Hitech City, Hyderabad - 500081', '482910', '2026-10-01T09:32:53.709Z', NOW(), NULL
),
(
  'ord_9002', 'usr_rahul_customer', 'Rahul Verma', '+91 99887 76655', 'usr_saraswathi_farmer', 'Saraswathi Devi', '+91 91234 56789',
  'usr_vikram_delivery', 'Vikram Singh', 650, 160, 'accepted',
  'Flat 402, Green Valley Apts, Hitech City', '591204', '2026-10-01T07:32:53.709Z', NOW(), NULL
),
(
  'ord_9003', 'usr_rahul_customer', 'Rahul Verma', '+91 99887 76655', 'usr_ramesh_farmer', 'Ramesh Kumar (Green Earth)', '+91 98765 43210',
  'usr_vikram_delivery', 'Vikram Singh', 100, 160, 'delivered',
  'Villa 12, Palm Meadows, Jubilee Hills', '847291', '2026-09-29T10:32:53.709Z', NOW(), '2026-09-29T11:32:53.709Z'
),
(
  'ord_9004', 'usr_rahul_customer', 'Ananya Sharma', '+91 98112 23344', 'usr_saraswathi_farmer', 'Saraswathi Devi', '+91 91234 56789',
  'usr_vikram_delivery', 'Vikram Singh', 780, 220, 'delivered',
  'B-304, Cyber Heights, Madhapur, Hyderabad - 500081', '319842', '2026-09-22T11:32:53.709Z', NOW(), '2026-09-22T12:27:53.709Z'
),
(
  'ord_9005', 'usr_rahul_customer', 'Praveen Reddy', '+91 96622 33445', 'usr_ramesh_farmer', 'Ramesh Kumar (Green Earth)', '+91 98765 43210',
  'usr_vikram_delivery', 'Vikram Singh', 210, 175, 'delivered',
  'Plot 88, Road 10, Banjara Hills, Hyderabad - 500034', '625184', '2026-09-09T11:32:53.709Z', NOW(), '2026-09-09T12:12:53.709Z'
)
ON CONFLICT (order_id) DO NOTHING;

INSERT INTO development_seed_order_items (
  order_item_id, order_id, product_id, farmer_id, title, quantity, price, unit, image_url
) VALUES
(
  'item_9001_1', 'ord_9001', 'prod_101', 'usr_ramesh_farmer', 'Vine-Ripened Organic Tomatoes', 3, 42, 'kg',
  'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=800'
),
(
  'item_9001_2', 'ord_9001', 'prod_102', 'usr_ramesh_farmer', 'Farm Fresh Palak Bunch', 2, 25, 'bunch',
  'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&q=80&w=800'
),
(
  'item_9002_1', 'ord_9002', 'prod_103', 'usr_saraswathi_farmer', 'Premium Banganapalli Mangoes', 5, 130, 'kg',
  'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&q=80&w=800'
),
(
  'item_9003_1', 'ord_9003', 'prod_101', 'usr_ramesh_farmer', 'Vine-Ripened Organic Tomatoes', 2, 42, 'kg',
  'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=800'
),
(
  'item_9004_1', 'ord_9004', 'prod_103', 'usr_saraswathi_farmer', 'Premium Banganapalli Mangoes', 6, 130, 'kg',
  'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&q=80&w=800'
),
(
  'item_9005_1', 'ord_9005', 'prod_101', 'usr_ramesh_farmer', 'Vine-Ripened Organic Tomatoes', 5, 42, 'kg',
  'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=800'
)
ON CONFLICT (order_item_id) DO NOTHING;
