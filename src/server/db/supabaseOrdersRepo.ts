import crypto from 'crypto';
import { Order, OrderItem, OrderStatus, Product, Profile, UserRole } from '../../types.js';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient.js';
import { CatalogRepository, ALLOWED_DEV_FARMERS } from './catalogRepository.js';
import { supabaseCartsRepo } from './supabaseCartsRepo.js';
import { isValidQuantityForUnit, formatQuantity } from '../../lib/quantity.js';
import { DEVELOPMENT_ORDERS } from './developmentFixtures.js';

// In-memory concurrency locks per product ID to prevent race conditions
const productInventoryLocks: Map<string, Promise<void>> = new Map();

async function acquireProductLock(productId: string): Promise<() => void> {
  while (productInventoryLocks.has(productId)) {
    try {
      await productInventoryLocks.get(productId);
    } catch {
      // ignore previous lock errors
    }
  }

  let releaseLock: () => void = () => {};
  const lockPromise = new Promise<void>((resolve) => {
    releaseLock = () => {
      productInventoryLocks.delete(productId);
      resolve();
    };
  });

  productInventoryLocks.set(productId, lockPromise);
  return releaseLock;
}

// Development personas list
const DEV_PERSONAS = ['usr_rahul_customer', 'usr_ramesh_farmer', 'usr_saraswathi_farmer', 'usr_vikram_delivery'];

// Isolated runtime store for development orders (initialized from typed TypeScript constants)
let devOrdersCache: Order[] | null = null;

function loadInitialDevOrders(): Order[] {
  if (devOrdersCache) return devOrdersCache;
  devOrdersCache = JSON.parse(JSON.stringify(DEVELOPMENT_ORDERS));
  return devOrdersCache;
}

export const supabaseOrdersRepo = {
  isAvailable(): boolean {
    return isSupabaseConfigured();
  },

  isDevPersona(userId: string): boolean {
    return DEV_PERSONAS.includes(userId);
  },

  isDevOrder(orderId: string): boolean {
    return orderId.startsWith('ord_') || orderId.startsWith('dev_ord_') || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
  },

  /**
   * Concurrency-safe atomic inventory decrement
   */
  async decrementInventoryAtomic(
    productId: string,
    quantity: number,
    isFixture: boolean
  ): Promise<{ success: boolean; remainingQuantity?: number; error?: string }> {
    const supabase = getSupabaseClient();
    const release = await acquireProductLock(productId);

    try {
      if (isFixture) {
        // 1. Try PostgreSQL RPC for development fixture if installed
        if (supabase) {
          try {
            const { data, error } = await supabase.rpc('decrement_dev_fixture_inventory', {
              p_product_id: productId,
              p_quantity: quantity,
            });
            if (!error && data?.success) {
              return { success: true, remainingQuantity: data.remaining_quantity };
            }
          } catch {
            // RPC not installed yet, use safe fallback below
          }
        }

        // 2. Safe fallback: Read from development_seed_inventory under lock
        if (supabase) {
          const { data: invRow } = await supabase
            .from('development_seed_inventory')
            .select('inventory_id, quantity')
            .eq('product_id', productId)
            .maybeSingle();

          if (invRow) {
            const currentQty = Number(invRow.quantity);
            if (currentQty < quantity) {
              return { success: false, error: `Insufficient stock for product ${productId}. Available: ${currentQty}` };
            }
            const newQty = currentQty - quantity;
            const { error: updErr } = await supabase
              .from('development_seed_inventory')
              .update({ quantity: newQty, updated_at: new Date().toISOString() })
              .eq('product_id', productId);

            if (updErr) {
              return { success: false, error: updErr.message };
            }

            // Also sync development_seed_products.stock
            await supabase
              .from('development_seed_products')
              .update({ stock: newQty, updated_at: new Date().toISOString() })
              .eq('product_id', productId);

            return { success: true, remainingQuantity: newQty };
          }
        }

        return { success: true };
      }

      // Production Product Inventory Decrement
      if (!supabase) {
        return { success: false, error: 'Database client unavailable' };
      }

      // 1. Try atomic PostgreSQL RPC
      try {
        const { data, error } = await supabase.rpc('decrement_product_inventory', {
          p_product_id: productId,
          p_quantity: quantity,
        });
        if (!error && data?.success) {
          return { success: true, remainingQuantity: data.remaining_quantity };
        }
        if (data && data.success === false) {
          return { success: false, error: data.error || 'Insufficient stock' };
        }
      } catch {
        // RPC not installed yet, use safe locked fallback
      }

      // 2. Safe locked fallback: Check current inventory under lock
      const { data: invRow, error: fetchErr } = await supabase
        .from('inventory')
        .select('inventory_id, quantity')
        .eq('product_id', productId)
        .maybeSingle();

      if (fetchErr || !invRow) {
        return { success: false, error: `Inventory record for product ${productId} not found` };
      }

      const currentStock = Number(invRow.quantity);
      if (currentStock < quantity) {
        return { success: false, error: `Insufficient stock. Requested ${quantity}, but only ${currentStock} available.` };
      }

      const nextStock = currentStock - quantity;
      const { error: updErr } = await supabase
        .from('inventory')
        .update({ quantity: nextStock, updated_at: new Date().toISOString() })
        .eq('product_id', productId);

      if (updErr) {
        return { success: false, error: updErr.message };
      }

      return { success: true, remainingQuantity: nextStock };
    } finally {
      release();
    }
  },

  /**
   * Concurrency-safe atomic inventory restoration on order cancellation
   */
  async restoreInventoryAtomic(
    productId: string,
    quantity: number,
    isFixture: boolean
  ): Promise<{ success: boolean; newQuantity?: number }> {
    const supabase = getSupabaseClient();
    const release = await acquireProductLock(productId);

    try {
      if (isFixture) {
        if (supabase) {
          try {
            const { data, error } = await supabase.rpc('restore_dev_fixture_inventory', {
              p_product_id: productId,
              p_quantity: quantity,
            });
            if (!error && data?.success) {
              return { success: true, newQuantity: data.new_quantity };
            }
          } catch {
            // fallback
          }

          const { data: invRow } = await supabase
            .from('development_seed_inventory')
            .select('quantity')
            .eq('product_id', productId)
            .maybeSingle();

          if (invRow) {
            const newQty = Number(invRow.quantity) + quantity;
            await supabase
              .from('development_seed_inventory')
              .update({ quantity: newQty, updated_at: new Date().toISOString() })
              .eq('product_id', productId);

            await supabase
              .from('development_seed_products')
              .update({ stock: newQty, updated_at: new Date().toISOString() })
              .eq('product_id', productId);

            return { success: true, newQuantity: newQty };
          }
        }
        return { success: true };
      }

      if (!supabase) return { success: false };

      try {
        const { data, error } = await supabase.rpc('restore_product_inventory', {
          p_product_id: productId,
          p_quantity: quantity,
        });
        if (!error && data?.success) {
          return { success: true, newQuantity: data.new_quantity };
        }
      } catch {
        // fallback
      }

      const { data: invRow } = await supabase
        .from('inventory')
        .select('quantity')
        .eq('product_id', productId)
        .maybeSingle();

      if (invRow) {
        const newQty = Number(invRow.quantity) + quantity;
        await supabase
          .from('inventory')
          .update({ quantity: newQty, updated_at: new Date().toISOString() })
          .eq('product_id', productId);
        return { success: true, newQuantity: newQty };
      }

      return { success: false };
    } finally {
      release();
    }
  },

  /**
   * Check if Supabase has development_seed_orders table
   */
  async isDevOrdersTableAvailable(): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;
    try {
      const { error } = await supabase.from('development_seed_orders').select('order_id').limit(0);
      return !error;
    } catch {
      return false;
    }
  },

  /**
   * Retrieve orders for a user according to their role
   */
  async getOrders(userId: string, role?: string): Promise<Order[]> {
    const isDev = this.isDevPersona(userId);

    // 1. Fetch Real Orders from Supabase
    let realOrders: Order[] = [];
    const supabase = getSupabaseClient();

    if (supabase && !isDev) {
      try {
        let query = supabase.from('orders').select(`
          *,
          order_items(
            *,
            farmer:users!order_items_farmer_id_fkey(user_id, display_name, phone)
          ),
          customer:users!orders_customer_id_fkey(user_id, display_name, phone),
          delivery_partner:users!orders_delivery_partner_id_fkey(user_id, display_name, phone)
        `);

        if (role === 'customer') {
          query = query.eq('customer_id', userId);
        } else if (role === 'delivery') {
          // Delivery partner sees claimed deliveries OR open accepted jobs
          query = query.or(`delivery_partner_id.eq.${userId},and(status.in.(accepted,ACCEPTED),delivery_partner_id.is.null)`);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
          console.warn('[SupabaseOrders] Error fetching real orders:', error.message);
        } else if (data) {
          for (const row of data) {
            const items: OrderItem[] = (row.order_items || []).map((it: any) => ({
              product_id: it.product_id,
              title: it.product_name,
              price: Number(it.unit_price),
              quantity: Number(it.quantity),
              unit: 'kg',
              image_url: '',
            }));

            // Filter for farmer if role is farmer
            if (role === 'farmer') {
              const hasFarmerItem = (row.order_items || []).some((it: any) => it.farmer_id === userId);
              if (!hasFarmerItem) continue;
            }

            const firstFarmer = row.order_items?.[0]?.farmer;
            const farmerId = row.order_items?.[0]?.farmer_id || '';
            const farmerName = firstFarmer?.display_name || 'Verified Farmer';

            const rawStatus = String(row.status || 'pending').toLowerCase();
            const normalizedStatus: OrderStatus = ['pending', 'accepted', 'out_for_delivery', 'delivered', 'cancelled'].includes(
              rawStatus
            )
              ? (rawStatus as OrderStatus)
              : 'pending';

            // OTP Privacy: Only the customer who owns the order can view the OTP code
            const otpCode = role === 'customer' || row.customer_id === userId ? (row.delivery_otp_hash || '') : '******';

            realOrders.push({
              id: row.order_id,
              customer_id: row.customer_id,
              customer_name: row.customer?.display_name || 'Customer',
              customer_phone: row.customer?.phone || '',
              farmer_id: farmerId,
              farmer_name: farmerName,
              farmer_phone: firstFarmer?.phone || '',
              delivery_partner_id: row.delivery_partner_id || null,
              delivery_partner_name: row.delivery_partner?.display_name || undefined,
              items,
              total_amount: Number(row.total_amount),
              delivery_fare: Number(row.delivery_fee || 80),
              status: normalizedStatus,
              delivery_address: row.delivery_address || '',
              otp_code: otpCode,
              created_at: row.created_at,
              completed_at: normalizedStatus === 'delivered' ? row.updated_at : undefined,
            });
          }
        }
      } catch (err) {
        console.error('[SupabaseOrders] Exception fetching real orders:', err);
      }
    }

    // 2. Fetch Development Orders (for development personas)
    let devOrders: Order[] = [];
    if (isDev) {
      const hasDevTable = await this.isDevOrdersTableAvailable();
      if (hasDevTable && supabase) {
        try {
          const { data } = await supabase
            .from('development_seed_orders')
            .select('*, development_seed_order_items(*)')
            .order('created_at', { ascending: false });

          if (data && data.length > 0) {
            devOrders = data.map((d: any) => ({
              id: d.order_id,
              customer_id: d.customer_id,
              customer_name: d.customer_name,
              customer_phone: d.customer_phone || undefined,
              farmer_id: d.farmer_id,
              farmer_name: d.farmer_name,
              farmer_phone: d.farmer_phone || undefined,
              delivery_partner_id: d.delivery_partner_id || null,
              delivery_partner_name: d.delivery_partner_name || undefined,
              items: (d.development_seed_order_items || []).map((it: any) => ({
                product_id: it.product_id,
                title: it.title,
                price: Number(it.price),
                quantity: Number(it.quantity),
                unit: it.unit,
                image_url: it.image_url,
              })),
              total_amount: Number(d.total_amount),
              delivery_fare: Number(d.delivery_fare || 80),
              status: d.status as OrderStatus,
              delivery_address: d.delivery_address,
              otp_code: d.otp_code,
              created_at: d.created_at,
              completed_at: d.completed_at || undefined,
            }));
          }
        } catch (err) {
          console.warn('[SupabaseOrders] Notice reading development_seed_orders:', err);
        }
      }

      // If no database development orders, fallback to isolated in-memory fixture store
      if (devOrders.length === 0) {
        devOrders = loadInitialDevOrders();
      }

      // Apply role filters for dev persona
      if (role === 'customer') {
        devOrders = devOrders.filter((o) => o.customer_id === userId);
      } else if (role === 'farmer') {
        devOrders = devOrders.filter((o) => o.farmer_id === userId);
      } else if (role === 'delivery') {
        devOrders = devOrders.filter(
          (o) => (o.status === 'accepted' && !o.delivery_partner_id) || o.delivery_partner_id === userId
        );
      } else {
        devOrders = devOrders.filter((o) => o.customer_id === userId);
      }
    }

    const combined = [...realOrders, ...devOrders];
    combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return combined;
  },

  /**
   * Create orders at checkout with atomic stock decrement and cart clearance
   */
  async checkout(
    customerProfile: Profile,
    deliveryAddress: string
  ): Promise<{ success: boolean; orders: Order[] }> {
    const customerId = customerProfile.id;
    const isDev = this.isDevPersona(customerId);

    if (!deliveryAddress || typeof deliveryAddress !== 'string' || !deliveryAddress.trim()) {
      throw new Error('Valid delivery address is required');
    }

    // 1. Authoritative cart retrieval
    const cart = await supabaseCartsRepo.getCart(customerId);
    if (!cart || cart.length === 0) {
      throw new Error('Your cart is empty. Please add items before checking out.');
    }

    // 2. Validate all cart items against authoritative catalog
    const validatedItems: { product: Product; quantity: number; isFixture: boolean }[] = [];

    for (const item of cart) {
      const { product, isFixture } = await CatalogRepository.getProductById(item.product_id);
      if (!product) {
        throw new Error('An item in your cart is no longer available in the marketplace.');
      }

      const qty = Number(item.quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        throw new Error(`Invalid quantity specified for "${product.title}".`);
      }

      const val = isValidQuantityForUnit(qty, product.unit);
      if (!val.valid) {
        throw new Error(`"${product.title}": ${val.error}`);
      }

      if (product.stock < qty) {
        throw new Error(
          `Insufficient stock for "${product.title}". Requested ${formatQuantity(qty, product.unit)}, but only ${formatQuantity(product.stock, product.unit)} available.`
        );
      }

      validatedItems.push({ product, quantity: qty, isFixture });
    }

    // 3. Multi-farmer grouping
    const itemsByFarmer: Record<string, { product: Product; quantity: number; isFixture: boolean }[]> = {};
    for (const vi of validatedItems) {
      const fId = vi.product.farmer_id;
      if (!itemsByFarmer[fId]) {
        itemsByFarmer[fId] = [];
      }
      itemsByFarmer[fId].push(vi);
    }

    const createdOrders: Order[] = [];
    const decrementedItems: { productId: string; quantity: number; isFixture: boolean }[] = [];

    const supabase = getSupabaseClient();

    try {
      // 4. Process each farmer order
      for (const [farmerId, farmerItems] of Object.entries(itemsByFarmer)) {
        const orderItems: OrderItem[] = farmerItems.map((fi) => ({
          product_id: fi.product.id,
          title: fi.product.title,
          price: Number(fi.product.price),
          quantity: fi.quantity,
          unit: fi.product.unit,
          image_url: fi.product.image_url,
        }));

        // Authoritative server-side total calculation
        const subtotal = orderItems.reduce((sum, it) => sum + it.price * it.quantity, 0);
        const deliveryFare = Math.max(80, Math.round(60 + subtotal * 0.15));
        const totalAmount = subtotal;

        // Generate secure 6-digit OTP
        const otpCode = String(Math.floor(100000 + Math.random() * 900000));
        const orderId = isDev ? `ord_${Math.floor(100000 + Math.random() * 900000)}` : crypto.randomUUID();
        const now = new Date().toISOString();

        // 5. Decrement inventory atomically for all items in this order
        for (const item of farmerItems) {
          const decResult = await this.decrementInventoryAtomic(item.product.id, item.quantity, item.isFixture);
          if (!decResult.success) {
            throw new Error(
              decResult.error || `Insufficient inventory while purchasing "${item.product.title}".`
            );
          }
          decrementedItems.push({ productId: item.product.id, quantity: item.quantity, isFixture: item.isFixture });
        }

        // 6. Persistence Path
        const hasFixtureItems = farmerItems.some((fi) => fi.isFixture);

        if (!isDev && !hasFixtureItems && supabase) {
          // Real customer + Real products -> Supabase orders & order_items
          const { error: ordErr } = await supabase.from('orders').insert({
            order_id: orderId,
            customer_id: customerId,
            delivery_partner_id: null,
            status: 'PENDING',
            subtotal,
            delivery_fee: deliveryFare,
            total_amount: totalAmount,
            delivery_address: deliveryAddress.trim(),
            delivery_location: customerProfile.location || null,
            delivery_otp_hash: otpCode,
            created_at: now,
            updated_at: now,
          });

          if (ordErr) {
            throw new Error(`Failed to create order record: ${ordErr.message}`);
          }

          // Insert order_items
          const itemInserts = orderItems.map((it) => ({
            order_item_id: crypto.randomUUID(),
            order_id: orderId,
            product_id: it.product_id,
            farmer_id: farmerId,
            product_name: it.title,
            quantity: it.quantity,
            unit_price: it.price,
            subtotal: it.price * it.quantity,
          }));

          const { error: itemsErr } = await supabase.from('order_items').insert(itemInserts);
          if (itemsErr) {
            // Rollback order row
            await supabase.from('orders').delete().eq('order_id', orderId);
            throw new Error(`Failed to record order items: ${itemsErr.message}`);
          }
        } else {
          // Development Persona or development fixture products
          const devStore = loadInitialDevOrders();
          const devOrder: Order = {
            id: orderId,
            customer_id: customerId,
            customer_name: customerProfile.full_name,
            customer_phone: customerProfile.phone_number || customerProfile.email,
            farmer_id: farmerId,
            farmer_name: farmerItems[0]?.product?.farmer_name || 'Farmer',
            farmer_phone: undefined,
            delivery_partner_id: null,
            items: orderItems,
            total_amount: totalAmount,
            delivery_fare: deliveryFare,
            status: 'pending',
            delivery_address: deliveryAddress.trim(),
            otp_code: otpCode,
            created_at: now,
          };

          // Save in development table if available
          const hasDevTable = await this.isDevOrdersTableAvailable();
          if (hasDevTable && supabase) {
            try {
              await supabase.from('development_seed_orders').insert({
                order_id: orderId,
                customer_id: customerId,
                customer_name: customerProfile.full_name,
                customer_phone: customerProfile.phone_number || customerProfile.email,
                farmer_id: farmerId,
                farmer_name: farmerItems[0]?.product?.farmer_name || 'Farmer',
                farmer_phone: null,
                delivery_partner_id: null,
                total_amount: totalAmount,
                delivery_fare: deliveryFare,
                status: 'pending',
                delivery_address: deliveryAddress.trim(),
                otp_code: otpCode,
                created_at: now,
                updated_at: now,
              });

              for (const it of orderItems) {
                await supabase.from('development_seed_order_items').insert({
                  order_item_id: `dev_item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                  order_id: orderId,
                  product_id: it.product_id,
                  farmer_id: farmerId,
                  title: it.title,
                  quantity: it.quantity,
                  price: it.price,
                  unit: it.unit,
                  image_url: it.image_url,
                });
              }
            } catch (err) {
              console.warn('[SupabaseOrders] Saved to dev in-memory store:', err);
            }
          }

          devStore.unshift(devOrder);
        }

        createdOrders.push({
          id: orderId,
          customer_id: customerId,
          customer_name: customerProfile.full_name,
          customer_phone: customerProfile.phone_number || customerProfile.email,
          farmer_id: farmerId,
          farmer_name: farmerItems[0]?.product?.farmer_name || 'Farmer',
          delivery_partner_id: null,
          items: orderItems,
          total_amount: totalAmount,
          delivery_fare: deliveryFare,
          status: 'pending',
          delivery_address: deliveryAddress.trim(),
          otp_code: otpCode,
          created_at: now,
        });
      }

      // 7. Clear purchased cart items upon complete success
      await supabaseCartsRepo.clearCart(customerId);

      return { success: true, orders: createdOrders };
    } catch (checkoutErr: any) {
      // Rollback any successfully decremented inventory on partial failure
      for (const dec of decrementedItems) {
        await this.restoreInventoryAtomic(dec.productId, dec.quantity, dec.isFixture);
      }
      throw checkoutErr;
    }
  },

  /**
   * Update order status with state machine enforcement and inventory restoration on cancellation
   */
  async updateOrderStatus(params: {
    orderId: string;
    userId: string;
    role: UserRole;
    newStatus: string;
    otpCode?: string;
  }): Promise<{ success: boolean; order: Order }> {
    const { orderId, userId, role, newStatus, otpCode } = params;

    // 1. Locate Order
    const allOrders = await this.getOrders(userId, role);
    let order = allOrders.find((o) => o.id === orderId);

    // If not found in user's direct query, check dev orders cache or direct query
    if (!order) {
      const devStore = loadInitialDevOrders();
      order = devStore.find((o) => o.id === orderId);
    }

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status === 'delivered') {
      throw new Error('Order has already been delivered and completed. Status cannot be changed.');
    }

    if (order.status === 'cancelled') {
      throw new Error('Order has already been cancelled and cannot be changed.');
    }

    const isDev = this.isDevOrder(orderId);
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    // 2. Role-specific validation & state machine
    if (role === 'farmer') {
      if (order.farmer_id !== userId) {
        throw new Error('Forbidden: You can only update orders for your own farm');
      }

      if (order.status !== 'pending') {
        throw new Error(`Order is already in '${order.status}' state and cannot be modified by farmer.`);
      }

      if (newStatus === 'accepted') {
        order.status = 'accepted';
      } else if (newStatus === 'cancelled') {
        order.status = 'cancelled';
        // Atomic inventory restoration on cancellation
        for (const item of order.items) {
          const { isFixture } = await CatalogRepository.getProductById(item.product_id);
          await this.restoreInventoryAtomic(item.product_id, item.quantity, isFixture);
        }
      } else {
        throw new Error('Invalid status for farmer. Farmer can only accept or cancel pending orders.');
      }
    } else if (role === 'delivery') {
      if (newStatus === 'out_for_delivery') {
        if (order.status !== 'accepted') {
          throw new Error(`Delivery job is no longer available (current status: ${order.status}).`);
        }
        if (order.delivery_partner_id && order.delivery_partner_id !== userId) {
          throw new Error('This delivery job has already been claimed by another delivery partner.');
        }

        order.status = 'out_for_delivery';
        order.delivery_partner_id = userId;
      } else if (newStatus === 'delivered') {
        if (order.status !== 'out_for_delivery') {
          throw new Error('Order must be out for delivery before it can be marked as delivered.');
        }
        if (order.delivery_partner_id !== userId) {
          throw new Error('Forbidden: You are not the assigned delivery partner for this order.');
        }

        // Server-authoritative OTP verification
        if (!otpCode || String(otpCode).trim() !== String(order.otp_code).trim()) {
          throw new Error('Invalid Delivery OTP Code. Please verify the 6-digit code with the customer.');
        }

        order.status = 'delivered';
        order.completed_at = now;
      } else {
        throw new Error(`Invalid status transition for delivery partner: ${newStatus}`);
      }
    } else {
      throw new Error('Forbidden: Unauthorized role for order status updates');
    }

    // 3. Persist update in database and memory
    if (devOrdersCache) {
      const cached = devOrdersCache.find((o) => o.id === orderId);
      if (cached) {
        cached.status = order.status;
        cached.delivery_partner_id = order.delivery_partner_id;
        cached.completed_at = order.completed_at;
      }
    }

    if (!isDev && supabase) {
      const updates: any = {
        status: order.status.toUpperCase(),
        updated_at: now,
      };

      if (order.delivery_partner_id) {
        updates.delivery_partner_id = order.delivery_partner_id;
      }

      await supabase.from('orders').update(updates).eq('order_id', orderId);
    } else if (isDev && supabase) {
      const hasDevTable = await this.isDevOrdersTableAvailable();
      if (hasDevTable) {
        await supabase
          .from('development_seed_orders')
          .update({
            status: order.status,
            delivery_partner_id: order.delivery_partner_id,
            completed_at: order.completed_at,
            updated_at: now,
          })
          .eq('order_id', orderId);
      }
    }

    return { success: true, order };
  },
};
