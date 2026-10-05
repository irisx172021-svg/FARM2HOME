import { getDatabase } from '../connection.js';

export interface SessionRecord {
  token: string;
  user_id: string;
  created_at: string;
  expires_at: string;
  last_active_at: string;
}

export const sessionsRepo = {
  createSession(token: string, userId: string, ttlDays = 30): SessionRecord {
    const db = getDatabase();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlDays * 86400000);

    const stmt = db.prepare(`
      INSERT INTO sessions (token, user_id, created_at, expires_at, last_active_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(token, userId, now.toISOString(), expiresAt.toISOString(), now.toISOString());

    return {
      token,
      user_id: userId,
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      last_active_at: now.toISOString(),
    };
  },

  findSession(token: string): SessionRecord | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM sessions WHERE token = ?');
    const row = stmt.get(token) as any;
    return row || null;
  },

  touchSession(token: string): void {
    const db = getDatabase();
    const now = new Date().toISOString();
    const stmt = db.prepare('UPDATE sessions SET last_active_at = ? WHERE token = ?');
    stmt.run(now, token);
  },

  deleteSession(token: string): void {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM sessions WHERE token = ?');
    stmt.run(token);
  },

  deleteAllForUser(userId: string): void {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM sessions WHERE user_id = ?');
    stmt.run(userId);
  },

  cleanExpired(): void {
    const db = getDatabase();
    const now = new Date().toISOString();
    const stmt = db.prepare('DELETE FROM sessions WHERE expires_at < ?');
    stmt.run(now);
  },
};
