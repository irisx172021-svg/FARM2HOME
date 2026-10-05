import { getDatabase } from '../connection.js';
import { Order, OrderItem } from '../../../types.js';

export const ordersRepo = {
  getAll(): Order[] {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all() as any[];
    return rows.map((r) => this.mapOrder(r));
  },

  getById(id: string): Order | null {
    const db = getDatabase();
    const r = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as any;
    if (!r) return null;
    return this.mapOrder(r);
  },

  getByUserId(userId: string, role?: string): Order[] {
    const db = getDatabase();
    let rows: any[] = [];

    if (role === 'farmer') {
      rows = db.prepare('SELECT * FROM orders WHERE farmer_id = ? ORDER BY created_at DESC').all(userId) as any[];
    } else if (role === 'delivery') {
      rows = db
        .prepare(`
          SELECT * FROM orders 
          WHERE delivery_partner_id = ? 
             OR (delivery_partner_id IS NULL AND status IN ('accepted', 'out_for_delivery'))
          ORDER BY created_at DESC
        `)
        .all(userId) as any[];
    } else {
      // Default: customer
      rows = db.prepare('SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC').all(userId) as any[];
    }

    return rows.map((r) => this.mapOrder(r));
  },

  create(order: Order): Order {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO orders (id, customer_id, customer_name, customer_phone, farmer_id, farmer_name, farmer_phone, delivery_partner_id, delivery_partner_name, total_amount, status, delivery_address, otp_code, created_at, completed_at, delivery_fare)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      order.id,
      order.customer_id,
      order.customer_name,
      order.customer_phone || null,
      order.farmer_id,
      order.farmer_name,
      order.farmer_phone || null,
      order.delivery_partner_id || null,
      order.delivery_partner_name || null,
      order.total_amount,
      order.status,
      order.delivery_address,
      order.otp_code,
      order.created_at || new Date().toISOString(),
      order.completed_at || null,
      order.delivery_fare || 140
    );

    const itemStmt = db.prepare(`
      INSERT INTO order_items (id, order_id, product_id, title, price, quantity, unit, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of order.items) {
      itemStmt.run(
        `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        order.id,
        item.product_id,
        item.title,
        item.price,
        item.quantity,
        item.unit,
        item.image_url || null
      );
    }

    return this.getById(order.id)!;
  },

  updateStatus(
    orderId: string,
    status: 'pending' | 'accepted' | 'out_for_delivery' | 'delivered' | 'cancelled',
    deliveryPartner?: { id: string; name: string }
  ): Order | null {
    const db = getDatabase();
    const order = this.getById(orderId);
    if (!order) return null;

    const now = new Date().toISOString();
    let completedAt = order.completed_at || null;
    if (status === 'delivered') {
      completedAt = now;
    }

    const partnerId = deliveryPartner ? deliveryPartner.id : order.delivery_partner_id;
    const partnerName = deliveryPartner ? deliveryPartner.name : order.delivery_partner_name;

    db.prepare(`
      UPDATE orders 
      SET status = ?, delivery_partner_id = ?, delivery_partner_name = ?, completed_at = ?
      WHERE id = ?
    `).run(status, partnerId || null, partnerName || null, completedAt, orderId);

    return this.getById(orderId);
  },

  claimDelivery(orderId: string, deliveryPartnerId: string, deliveryPartnerName: string): Order | null {
    const db = getDatabase();
    db.prepare(`
      UPDATE orders 
      SET delivery_partner_id = ?, delivery_partner_name = ?, status = 'out_for_delivery'
      WHERE id = ?
    `).run(deliveryPartnerId, deliveryPartnerName, orderId);

    return this.getById(orderId);
  },

  verifyOtp(orderId: string, otpCode: string, deliveryPartnerId: string): boolean {
    const db = getDatabase();
    const order = this.getById(orderId);
    if (!order) return false;
    if (order.otp_code.trim() !== otpCode.trim()) return false;

    db.prepare(`
      UPDATE orders 
      SET status = 'delivered', completed_at = ?, delivery_partner_id = COALESCE(delivery_partner_id, ?)
      WHERE id = ?
    `).run(new Date().toISOString(), deliveryPartnerId, orderId);

    return true;
  },

  mapOrder(r: any): Order {
    const db = getDatabase();
    const itemRows = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(r.id) as any[];
    const items: OrderItem[] = itemRows.map((it) => ({
      product_id: it.product_id,
      title: it.title,
      price: it.price,
      quantity: it.quantity,
      unit: it.unit,
      image_url: it.image_url,
    }));

    return {
      id: r.id,
      customer_id: r.customer_id,
      customer_name: r.customer_name,
      customer_phone: r.customer_phone,
      farmer_id: r.farmer_id,
      farmer_name: r.farmer_name,
      farmer_phone: r.farmer_phone,
      delivery_partner_id: r.delivery_partner_id,
      delivery_partner_name: r.delivery_partner_name,
      items,
      total_amount: r.total_amount,
      status: r.status,
      delivery_address: r.delivery_address,
      otp_code: r.otp_code,
      created_at: r.created_at,
      completed_at: r.completed_at,
      delivery_fare: r.delivery_fare,
    };
  },
};
