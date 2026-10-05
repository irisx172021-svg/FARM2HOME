import { getDatabase } from '../connection.js';
import { Product } from '../../../types.js';

export const productsRepo = {
  getAll(): Product[] {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM products ORDER BY created_at DESC');
    const rows = stmt.all() as any[];
    return rows.map((r) => ({
      id: r.id,
      farmer_id: r.farmer_id,
      farmer_name: r.farmer_name,
      farmer_location: r.farmer_location,
      title: r.title,
      description: r.description,
      category: r.category,
      price: r.price,
      unit: r.unit,
      stock: r.stock,
      is_organic: Boolean(r.is_organic),
      image_url: r.image_url,
      created_at: r.created_at,
    }));
  },

  getById(id: string): Product | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM products WHERE id = ?');
    const r = stmt.get(id) as any;
    if (!r) return null;
    return {
      id: r.id,
      farmer_id: r.farmer_id,
      farmer_name: r.farmer_name,
      farmer_location: r.farmer_location,
      title: r.title,
      description: r.description,
      category: r.category,
      price: r.price,
      unit: r.unit,
      stock: r.stock,
      is_organic: Boolean(r.is_organic),
      image_url: r.image_url,
      created_at: r.created_at,
    };
  },

  getByFarmerId(farmerId: string): Product[] {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM products WHERE farmer_id = ? ORDER BY created_at DESC');
    const rows = stmt.all(farmerId) as any[];
    return rows.map((r) => ({
      id: r.id,
      farmer_id: r.farmer_id,
      farmer_name: r.farmer_name,
      farmer_location: r.farmer_location,
      title: r.title,
      description: r.description,
      category: r.category,
      price: r.price,
      unit: r.unit,
      stock: r.stock,
      is_organic: Boolean(r.is_organic),
      image_url: r.image_url,
      created_at: r.created_at,
    }));
  },

  create(product: Product): Product {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO products (id, farmer_id, farmer_name, farmer_location, title, description, category, price, unit, stock, is_organic, image_url, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      product.id,
      product.farmer_id,
      product.farmer_name,
      product.farmer_location,
      product.title,
      product.description,
      product.category,
      product.price,
      product.unit,
      product.stock,
      product.is_organic ? 1 : 0,
      product.image_url,
      product.created_at || new Date().toISOString()
    );

    // Sync inventory record
    const invStmt = db.prepare(`
      INSERT OR REPLACE INTO inventory (id, product_id, farmer_id, quantity, alert_threshold, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    invStmt.run(
      `inv_${product.id}`,
      product.id,
      product.farmer_id,
      product.stock,
      10,
      new Date().toISOString()
    );

    return this.getById(product.id)!;
  },

  update(id: string, updates: Partial<Product>, farmerId?: string): Product | null {
    const db = getDatabase();
    const current = this.getById(id);
    if (!current) return null;
    if (farmerId && current.farmer_id !== farmerId) {
      throw new Error('Forbidden: Unauthorized to update this product');
    }

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
    if (updates.category !== undefined) { fields.push('category = ?'); values.push(updates.category); }
    if (updates.price !== undefined) { fields.push('price = ?'); values.push(updates.price); }
    if (updates.unit !== undefined) { fields.push('unit = ?'); values.push(updates.unit); }
    if (updates.stock !== undefined) { fields.push('stock = ?'); values.push(updates.stock); }
    if (updates.is_organic !== undefined) { fields.push('is_organic = ?'); values.push(updates.is_organic ? 1 : 0); }
    if (updates.image_url !== undefined) { fields.push('image_url = ?'); values.push(updates.image_url); }

    if (fields.length > 0) {
      values.push(id);
      db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }

    if (updates.stock !== undefined) {
      db.prepare(`
        UPDATE inventory SET quantity = ?, updated_at = ? WHERE product_id = ?
      `).run(updates.stock, new Date().toISOString(), id);
    }

    return this.getById(id);
  },

  delete(id: string, farmerId?: string): boolean {
    const db = getDatabase();
    const current = this.getById(id);
    if (!current) return false;
    if (farmerId && current.farmer_id !== farmerId) {
      throw new Error('Forbidden: Unauthorized to delete this product');
    }

    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    return true;
  },

  decrementStock(productId: string, quantity: number): void {
    const db = getDatabase();
    db.prepare('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?').run(quantity, productId);
    db.prepare('UPDATE inventory SET quantity = MAX(0, quantity - ?), updated_at = ? WHERE product_id = ?').run(
      quantity,
      new Date().toISOString(),
      productId
    );
  },
};
