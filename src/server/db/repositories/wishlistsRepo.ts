import { getDatabase } from '../connection.js';
import { WishlistItem } from '../../../types.js';
import { productsRepo } from './productsRepo.js';

export const wishlistsRepo = {
  getWishlist(userId: string): WishlistItem[] {
    const db = getDatabase();
    const rows = db
      .prepare('SELECT * FROM wishlist_items WHERE user_id = ? ORDER BY added_at DESC')
      .all(userId) as any[];

    const result: WishlistItem[] = [];
    for (const r of rows) {
      const product = productsRepo.getById(r.product_id);
      if (product) {
        result.push({
          id: r.id,
          user_id: r.user_id,
          product_id: r.product_id,
          created_at: r.added_at || r.created_at || new Date().toISOString(),
          product,
        });
      }
    }
    return result;
  },

  toggle(userId: string, productId: string): { inWishlist: boolean; wishlist: WishlistItem[] } {
    const db = getDatabase();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT OR IGNORE INTO wishlists (id, user_id, updated_at)
      VALUES (?, ?, ?)
    `).run(`wl_${userId}`, userId, now);

    const existing = db
      .prepare('SELECT * FROM wishlist_items WHERE user_id = ? AND product_id = ?')
      .get(userId, productId) as any;

    if (existing) {
      db.prepare('DELETE FROM wishlist_items WHERE id = ?').run(existing.id);
      return { inWishlist: false, wishlist: this.getWishlist(userId) };
    } else {
      const id = `wi_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      db.prepare(`
        INSERT INTO wishlist_items (id, wishlist_id, user_id, product_id, added_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, `wl_${userId}`, userId, productId, now);
      return { inWishlist: true, wishlist: this.getWishlist(userId) };
    }
  },
};
