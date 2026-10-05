import { getDatabase } from '../connection.js';

export interface UserRecord {
  id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  role: 'customer' | 'farmer' | 'delivery' | null;
  preferred_language: string;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  status: string;
}

export const usersRepo = {
  getById(id: string): UserRecord | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    const row = stmt.get(id) as any;
    return row || null;
  },

  getByEmail(email: string): UserRecord | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)');
    const row = stmt.get(email) as any;
    return row || null;
  },

  getByPhone(phone: string): UserRecord | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM users WHERE phone = ?');
    const row = stmt.get(phone) as any;
    return row || null;
  },

  getAll(): UserRecord[] {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM users ORDER BY created_at ASC');
    return stmt.all() as any[];
  },

  create(data: {
    id: string;
    display_name: string;
    email?: string | null;
    phone?: string | null;
    role?: 'customer' | 'farmer' | 'delivery' | null;
    preferred_language?: string;
  }): UserRecord {
    const db = getDatabase();
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO users (id, display_name, email, phone, role, preferred_language, created_at, updated_at, last_login_at, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      data.id,
      data.display_name,
      data.email || null,
      data.phone || null,
      data.role || null,
      data.preferred_language || 'en',
      now,
      now,
      now,
      'active'
    );

    return this.getById(data.id)!;
  },

  update(id: string, updates: Partial<UserRecord>): UserRecord | null {
    const db = getDatabase();
    const current = this.getById(id);
    if (!current) return null;

    const fields: string[] = [];
    const values: any[] = [];
    const now = new Date().toISOString();

    for (const [key, val] of Object.entries(updates)) {
      if (key !== 'id' && key !== 'created_at') {
        fields.push(`${key} = ?`);
        values.push(val);
      }
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const stmt = db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.getById(id);
  },

  updateLastLogin(id: string): void {
    const db = getDatabase();
    const now = new Date().toISOString();
    const stmt = db.prepare('UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?');
    stmt.run(now, now, id);
  },
};
