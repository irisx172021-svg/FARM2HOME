import { getDatabase } from '../connection.js';

export interface AuthIdentityRecord {
  id: string;
  user_id: string;
  provider: 'google' | 'phone' | 'email' | 'passkey';
  provider_uid: string;
  password_hash: string | null;
  passkey_public_key: string | null;
  passkey_counter: number;
  created_at: string;
  last_used_at: string;
}

export const authIdentitiesRepo = {
  findByProviderUid(provider: string, providerUid: string): AuthIdentityRecord | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM auth_identities WHERE provider = ? AND provider_uid = ?');
    const row = stmt.get(provider, providerUid) as any;
    return row || null;
  },

  findByUserId(userId: string): AuthIdentityRecord[] {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM auth_identities WHERE user_id = ? ORDER BY created_at ASC');
    return stmt.all(userId) as any[];
  },

  create(data: {
    id: string;
    userId: string;
    provider: 'google' | 'phone' | 'email' | 'passkey';
    providerUid: string;
    passwordHash?: string | null;
    passkeyPublicKey?: string | null;
    passkeyCounter?: number;
  }): AuthIdentityRecord {
    const db = getDatabase();
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO auth_identities (id, user_id, provider, provider_uid, password_hash, passkey_public_key, passkey_counter, created_at, last_used_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      data.id,
      data.userId,
      data.provider,
      data.providerUid,
      data.passwordHash || null,
      data.passkeyPublicKey || null,
      data.passkeyCounter || 0,
      now,
      now
    );

    return this.findByProviderUid(data.provider, data.providerUid)!;
  },

  updateLastUsed(id: string): void {
    const db = getDatabase();
    const now = new Date().toISOString();
    const stmt = db.prepare('UPDATE auth_identities SET last_used_at = ? WHERE id = ?');
    stmt.run(now, id);
  },

  updatePasswordHash(userId: string, passwordHash: string): void {
    const db = getDatabase();
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      UPDATE auth_identities 
      SET password_hash = ?, last_used_at = ? 
      WHERE user_id = ? AND provider = 'email'
    `);
    stmt.run(passwordHash, now, userId);
  },

  updatePasskeyCounter(providerUid: string, counter: number): void {
    const db = getDatabase();
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      UPDATE auth_identities 
      SET passkey_counter = ?, last_used_at = ? 
      WHERE provider = 'passkey' AND provider_uid = ?
    `);
    stmt.run(counter, now, providerUid);
  },
};
