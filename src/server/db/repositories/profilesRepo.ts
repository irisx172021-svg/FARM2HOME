import { getDatabase } from '../connection.js';
import { usersRepo, UserRecord } from './usersRepo.js';
import { Profile } from '../../../types.js';

export const profilesRepo = {
  getCombinedProfile(userId: string): Profile | null {
    const user = usersRepo.getById(userId);
    if (!user) return null;

    const db = getDatabase();
    let location = 'Hyderabad Metro Zone';
    let avatarUrl = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200';
    let farmName: string | undefined;
    let certificateUrl: string | undefined;
    let approved: boolean | undefined;

    if (user.role === 'farmer') {
      const row = db.prepare('SELECT * FROM farmer_profiles WHERE user_id = ?').get(userId) as any;
      if (row) {
        if (row.location) location = row.location;
        if (row.avatar_url) avatarUrl = row.avatar_url;
        farmName = row.farm_name;
        certificateUrl = row.certificate_url;
        approved = Boolean(row.approved);
      }
    } else if (user.role === 'customer') {
      const row = db.prepare('SELECT * FROM customer_profiles WHERE user_id = ?').get(userId) as any;
      if (row) {
        if (row.location) location = row.location;
        if (row.avatar_url) avatarUrl = row.avatar_url;
      }
    } else if (user.role === 'delivery') {
      const row = db.prepare('SELECT * FROM delivery_profiles WHERE user_id = ?').get(userId) as any;
      if (row) {
        if (row.location) location = row.location;
        if (row.avatar_url) avatarUrl = row.avatar_url;
      }
    }

    return {
      id: user.id,
      auth_method: 'phone',
      phone_number: user.phone || undefined,
      email: user.email || undefined,
      full_name: user.display_name,
      fullName: user.display_name,
      name: user.display_name,
      role: user.role || ('customer' as any),
      avatar_url: avatarUrl,
      location,
      created_at: user.created_at,
      preferred_language: (user.preferred_language as any) || 'en',
      farm_name: farmName,
      certificate_url: certificateUrl,
      approved,
    };
  },

  getAllProfiles(): Profile[] {
    const users = usersRepo.getAll();
    const profiles: Profile[] = [];
    for (const u of users) {
      const p = this.getCombinedProfile(u.id);
      if (p) profiles.push(p);
    }
    return profiles;
  },

  upsertFarmerProfile(data: {
    userId: string;
    farmName?: string;
    location?: string;
    avatarUrl?: string;
    certificateUrl?: string;
    approved?: boolean;
  }): void {
    const db = getDatabase();
    const now = new Date().toISOString();
    const existing = db.prepare('SELECT user_id FROM farmer_profiles WHERE user_id = ?').get(data.userId);

    if (existing) {
      const stmt = db.prepare(`
        UPDATE farmer_profiles 
        SET farm_name = COALESCE(?, farm_name),
            location = COALESCE(?, location),
            avatar_url = COALESCE(?, avatar_url),
            certificate_url = COALESCE(?, certificate_url),
            approved = COALESCE(?, approved)
        WHERE user_id = ?
      `);
      stmt.run(
        data.farmName || null,
        data.location || null,
        data.avatarUrl || null,
        data.certificateUrl || null,
        data.approved !== undefined ? (data.approved ? 1 : 0) : null,
        data.userId
      );
    } else {
      const stmt = db.prepare(`
        INSERT INTO farmer_profiles (user_id, farm_name, location, avatar_url, certificate_url, approved, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        data.userId,
        data.farmName || 'Green Earth Organic Acres',
        data.location || 'Medak, Telangana',
        data.avatarUrl || 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=200',
        data.certificateUrl || null,
        data.approved !== undefined ? (data.approved ? 1 : 0) : 1,
        now
      );
    }
  },

  upsertCustomerProfile(data: {
    userId: string;
    defaultAddress?: string;
    location?: string;
    avatarUrl?: string;
  }): void {
    const db = getDatabase();
    const now = new Date().toISOString();
    const existing = db.prepare('SELECT user_id FROM customer_profiles WHERE user_id = ?').get(data.userId);

    if (existing) {
      const stmt = db.prepare(`
        UPDATE customer_profiles 
        SET default_address = COALESCE(?, default_address),
            location = COALESCE(?, location),
            avatar_url = COALESCE(?, avatar_url)
        WHERE user_id = ?
      `);
      stmt.run(data.defaultAddress || null, data.location || null, data.avatarUrl || null, data.userId);
    } else {
      const stmt = db.prepare(`
        INSERT INTO customer_profiles (user_id, default_address, location, avatar_url, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      stmt.run(
        data.userId,
        data.defaultAddress || 'Hitech City, Hyderabad',
        data.location || 'Hitech City, Hyderabad',
        data.avatarUrl || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
        now
      );
    }
  },

  upsertDeliveryProfile(data: {
    userId: string;
    vehicleType?: string;
    activeZone?: string;
    location?: string;
    avatarUrl?: string;
  }): void {
    const db = getDatabase();
    const now = new Date().toISOString();
    const existing = db.prepare('SELECT user_id FROM delivery_profiles WHERE user_id = ?').get(data.userId);

    if (existing) {
      const stmt = db.prepare(`
        UPDATE delivery_profiles 
        SET vehicle_type = COALESCE(?, vehicle_type),
            active_zone = COALESCE(?, active_zone),
            location = COALESCE(?, location),
            avatar_url = COALESCE(?, avatar_url)
        WHERE user_id = ?
      `);
      stmt.run(
        data.vehicleType || null,
        data.activeZone || null,
        data.location || null,
        data.avatarUrl || null,
        data.userId
      );
    } else {
      const stmt = db.prepare(`
        INSERT INTO delivery_profiles (user_id, vehicle_type, active_zone, location, avatar_url, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        data.userId,
        data.vehicleType || 'Two-Wheeler EV',
        data.activeZone || 'Hyderabad Metro Zone',
        data.location || 'Hyderabad Metro Zone',
        data.avatarUrl || 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=200',
        now
      );
    }
  },
};
