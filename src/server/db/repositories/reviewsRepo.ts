import { getDatabase } from '../connection.js';
import { Review } from '../../../types.js';

export const reviewsRepo = {
  getAll(): Review[] {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM reviews ORDER BY created_at DESC').all() as any[];
    return rows.map((r) => ({
      id: r.id,
      order_id: r.order_id,
      customer_id: r.customer_id,
      customer_name: r.customer_name,
      farmer_id: r.farmer_id,
      rating: r.rating,
      comment: r.comment,
      created_at: r.created_at,
    }));
  },

  getByFarmerId(farmerId: string): Review[] {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM reviews WHERE farmer_id = ? ORDER BY created_at DESC').all(farmerId) as any[];
    return rows.map((r) => ({
      id: r.id,
      order_id: r.order_id,
      customer_id: r.customer_id,
      customer_name: r.customer_name,
      farmer_id: r.farmer_id,
      rating: r.rating,
      comment: r.comment,
      created_at: r.created_at,
    }));
  },

  create(data: {
    orderId?: string;
    customerId: string;
    customerName: string;
    farmerId: string;
    rating: number;
    comment: string;
  }): Review {
    const db = getDatabase();
    const id = `rev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO reviews (id, order_id, customer_id, customer_name, farmer_id, rating, comment, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.orderId || null,
      data.customerId,
      data.customerName,
      data.farmerId,
      Math.max(1, Math.min(5, Math.round(data.rating))),
      data.comment,
      now
    );

    return {
      id,
      order_id: data.orderId,
      customer_id: data.customerId,
      customer_name: data.customerName,
      farmer_id: data.farmerId,
      rating: data.rating,
      comment: data.comment,
      created_at: now,
    };
  },
};
