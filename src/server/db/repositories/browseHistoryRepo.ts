import { getDatabase } from '../connection.js';
import { BrowseHistoryItem } from '../../../types.js';
import { productsRepo } from './productsRepo.js';

export const browseHistoryRepo = {
  getHistory(userId: string, limit = 10): BrowseHistoryItem[] {
    const db = getDatabase();
    const rows = db
      .prepare('SELECT * FROM browse_history WHERE user_id = ? ORDER BY viewed_at DESC LIMIT ?')
      .all(userId, limit) as any[];

    const result: BrowseHistoryItem[] = [];
    for (const r of rows) {
      const product = productsRepo.getById(r.product_id);
      if (product) {
        result.push({
          id: r.id,
          user_id: r.user_id,
          product_id: r.product_id,
          viewed_at: r.viewed_at,
          product,
        });
      }
    }
    return result;
  },

  recordView(userId: string, productId: string): BrowseHistoryItem[] {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = `bh_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    // Delete older duplicate view of the same product for this user so it floats to top
    db.prepare('DELETE FROM browse_history WHERE user_id = ? AND product_id = ?').run(userId, productId);

    db.prepare(`
      INSERT INTO browse_history (id, user_id, product_id, viewed_at)
      VALUES (?, ?, ?, ?)
    `).run(id, userId, productId, now);

    return this.getHistory(userId);
  },
};
