import { getDatabase } from '../connection.js';
import { CartItem } from '../../../types.js';
import { productsRepo } from './productsRepo.js';

export const cartsRepo = {
  getCart(userId: string): CartItem[] {
    const db = getDatabase();
    const rows = db
      .prepare('SELECT * FROM cart_items WHERE user_id = ? ORDER BY added_at DESC')
      .all(userId) as any[];

    const result: CartItem[] = [];
    for (const r of rows) {
      const product = productsRepo.getById(r.product_id);
      if (product) {
        result.push({
          id: r.id,
          user_id: r.user_id,
          product_id: r.product_id,
          quantity: r.quantity,
          added_at: r.added_at,
          product,
        });
      }
    }
    return result;
  },

  addItem(userId: string, productId: string, quantity = 1): CartItem[] {
    const db = getDatabase();
    const now = new Date().toISOString();

    // Ensure cart container exists
    db.prepare(`
      INSERT OR IGNORE INTO carts (id, user_id, updated_at)
      VALUES (?, ?, ?)
    `).run(`cart_${userId}`, userId, now);

    const existing = db
      .prepare('SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?')
      .get(userId, productId) as any;

    if (existing) {
      db.prepare(`
        UPDATE cart_items 
        SET quantity = quantity + ?, added_at = ?
        WHERE id = ?
      `).run(quantity, now, existing.id);
    } else {
      const id = `ci_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      db.prepare(`
        INSERT INTO cart_items (id, cart_id, user_id, product_id, quantity, added_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, `cart_${userId}`, userId, productId, quantity, now);
    }

    return this.getCart(userId);
  },

  updateQuantity(userId: string, cartItemId: string, newQty: number): CartItem[] {
    const db = getDatabase();
    if (newQty <= 0) {
      return this.removeItem(userId, cartItemId);
    }
    db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ? AND user_id = ?').run(newQty, cartItemId, userId);
    return this.getCart(userId);
  },

  removeItem(userId: string, cartItemId: string): CartItem[] {
    const db = getDatabase();
    db.prepare('DELETE FROM cart_items WHERE id = ? AND user_id = ?').run(cartItemId, userId);
    return this.getCart(userId);
  },

  clearCart(userId: string): void {
    const db = getDatabase();
    db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(userId);
  },
};
