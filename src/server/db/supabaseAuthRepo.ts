import crypto from 'crypto';
import { getSupabaseClient } from './supabaseClient.js';
import { AuthProvider, UserRole, Profile } from '../../types.js';

export interface SupabaseUser {
  id: string;
  user_id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  role: UserRole | null;
  preferred_language: string;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  status: string;
}

export interface SupabaseAuthIdentity {
  id: string;
  identity_id: string;
  user_id: string;
  provider: AuthProvider;
  provider_uid: string;
  provider_user_id: string;
  password_hash: string | null;
  passkey_public_key: string | null;
  passkey_counter: number;
  created_at: string;
  last_used_at: string;
}

export interface SupabaseSession {
  token: string;
  user_id: string;
  created_at: string;
  expires_at: string;
  last_active_at: string;
}

function roleToDb(role: UserRole): string {
  if (role === 'farmer') return 'FARMER';
  if (role === 'delivery') return 'DELIVERY_PARTNER';
  return 'CUSTOMER';
}

function roleFromDb(role: string | null | undefined): UserRole {
  if (!role) return 'customer';
  const upper = role.toUpperCase();
  if (upper === 'FARMER') return 'farmer';
  if (upper === 'DELIVERY_PARTNER' || upper === 'DELIVERY') return 'delivery';
  return 'customer';
}

export const supabaseAuthRepo = {
  async findIdentityByProvider(
    provider: AuthProvider,
    providerUid: string
  ): Promise<SupabaseAuthIdentity | null> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('auth_identities')
      .select('*')
      .eq('provider', provider)
      .eq('provider_user_id', providerUid)
      .maybeSingle();

    if (error) {
      console.error('[Supabase] findIdentityByProvider error:', error);
      throw new Error(`Database error looking up ${provider} identity`);
    }

    if (!data) return null;
    return {
      id: data.identity_id,
      identity_id: data.identity_id,
      user_id: data.user_id,
      provider: data.provider,
      provider_uid: data.provider_user_id,
      provider_user_id: data.provider_user_id,
      password_hash: null,
      passkey_public_key: null,
      passkey_counter: 0,
      created_at: data.created_at,
      last_used_at: data.updated_at || data.created_at,
    };
  },

  async findUserById(userId: string): Promise<SupabaseUser | null> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[Supabase] findUserById error:', error);
      throw new Error('Database error looking up user');
    }

    if (!data) return null;
    return {
      id: data.user_id,
      user_id: data.user_id,
      display_name: data.display_name,
      email: data.email,
      phone: data.phone,
      role: roleFromDb(data.role),
      preferred_language: data.preferred_language || 'en',
      created_at: data.created_at,
      updated_at: data.updated_at,
      last_login_at: data.last_login_at || null,
      status: data.status,
    };
  },

  async findUserByEmail(email: string): Promise<SupabaseUser | null> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .ilike('email', email.trim().toLowerCase())
      .maybeSingle();

    if (error) {
      console.error('[Supabase] findUserByEmail error:', error);
      throw new Error('Database error looking up email');
    }

    if (!data) return null;
    return {
      id: data.user_id,
      user_id: data.user_id,
      display_name: data.display_name,
      email: data.email,
      phone: data.phone,
      role: roleFromDb(data.role),
      preferred_language: data.preferred_language || 'en',
      created_at: data.created_at,
      updated_at: data.updated_at,
      last_login_at: data.last_login_at || null,
      status: data.status,
    };
  },

  async findUserByPhone(phone: string): Promise<SupabaseUser | null> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('phone', phone.trim())
      .maybeSingle();

    if (error) {
      console.error('[Supabase] findUserByPhone error:', error);
      throw new Error('Database error looking up phone');
    }

    if (!data) return null;
    return {
      id: data.user_id,
      user_id: data.user_id,
      display_name: data.display_name,
      email: data.email,
      phone: data.phone,
      role: roleFromDb(data.role),
      preferred_language: data.preferred_language || 'en',
      created_at: data.created_at,
      updated_at: data.updated_at,
      last_login_at: data.last_login_at || null,
      status: data.status,
    };
  },

  async getCombinedProfile(userId: string): Promise<Profile | null> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client not initialized');

    const user = await this.findUserById(userId);
    if (!user) return null;

    let roleProfile: any = null;
    if (user.role === 'farmer') {
      const { data } = await supabase
        .from('farmer_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      roleProfile = data;
    } else if (user.role === 'customer') {
      const { data } = await supabase
        .from('customer_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      roleProfile = data;
    } else if (user.role === 'delivery') {
      const { data } = await supabase
        .from('delivery_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      roleProfile = data;
    }

    const defaultAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200';

    return {
      id: user.user_id,
      auth_method: 'email',
      phone_number: user.phone || undefined,
      email: user.email || undefined,
      full_name: user.display_name,
      fullName: user.display_name,
      name: user.display_name,
      role: user.role || ('customer' as UserRole),
      preferred_language: (user.preferred_language as any) || 'en',
      avatar_url: defaultAvatar,
      location: roleProfile?.location || 'Hyderabad Metro Zone',
      created_at: user.created_at,
      farm_name: roleProfile?.farm_name,
      approved: true,
    };
  },

  async createUserWithIdentityAndProfile(params: {
    userId: string;
    fullName: string;
    email?: string | null;
    phone?: string | null;
    role: UserRole;
    preferredLanguage?: string;
    provider: AuthProvider;
    providerUid: string;
    passwordHash?: string;
    passkeyPublicKey?: string;
    passkeyCounter?: number;
    location?: string;
    farmName?: string;
    avatarUrl?: string;
  }): Promise<{ user: SupabaseUser; profile: Profile }> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client not initialized');

    const now = new Date().toISOString();

    // 1. Insert into Supabase `users`
    const dbRole = roleToDb(params.role);
    const { error: userError } = await supabase.from('users').insert({
      user_id: params.userId,
      display_name: params.fullName.trim(),
      email: params.email ? params.email.trim().toLowerCase() : null,
      phone: params.phone ? params.phone.trim() : null,
      role: dbRole,
      created_at: now,
      updated_at: now,
      status: 'ACTIVE',
    });

    if (userError) {
      console.error('[Supabase] Error inserting user:', userError);
      throw new Error(`Database error creating user account: ${userError.message}`);
    }

    // 2. Insert into Supabase `auth_identities`
    const identityId = crypto.randomUUID();
    const { error: idError } = await supabase.from('auth_identities').insert({
      identity_id: identityId,
      user_id: params.userId,
      provider: params.provider,
      provider_user_id: params.providerUid,
      created_at: now,
      updated_at: now,
    });

    if (idError) {
      console.error('[Supabase] Error inserting auth_identity, rolling back user:', idError);
      await supabase.from('users').delete().eq('user_id', params.userId);
      throw new Error(`Database error linking authentication identity: ${idError.message}`);
    }

    // 3. Insert into corresponding role profile table
    if (params.role === 'farmer') {
      const { error: fErr } = await supabase.from('farmer_profiles').insert({
        user_id: params.userId,
        farm_name: params.farmName?.trim() || 'Green Organic Acres',
        location: params.location?.trim() || 'Andhra & Telangana Agri Region',
        created_at: now,
        updated_at: now,
      });
      if (fErr) console.warn('[Supabase] farmer_profiles insert notice:', fErr);
    } else if (params.role === 'delivery') {
      const { error: dErr } = await supabase.from('delivery_profiles').insert({
        user_id: params.userId,
        vehicle_type: 'Two-Wheeler EV',
        created_at: now,
        updated_at: now,
      });
      if (dErr) console.warn('[Supabase] delivery_profiles insert notice:', dErr);
    } else {
      const { error: cErr } = await supabase.from('customer_profiles').insert({
        user_id: params.userId,
        location: params.location?.trim() || 'Andhra & Telangana Agri Region',
        created_at: now,
        updated_at: now,
      });
      if (cErr) console.warn('[Supabase] customer_profiles insert notice:', cErr);
    }

    const createdProfile = await this.getCombinedProfile(params.userId);
    const createdUser = await this.findUserById(params.userId);

    if (!createdProfile || !createdUser) {
      throw new Error('Failed to resolve created profile from Supabase');
    }

    return { user: createdUser, profile: createdProfile };
  },

  async createSession(userId: string): Promise<{ token: string; expiresAt: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client not initialized');

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const sessionId = crypto.randomUUID();

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 86400000); // 30 days session
    const nowIso = now.toISOString();
    const expIso = expiresAt.toISOString();

    const { error } = await supabase.from('sessions').insert({
      session_id: sessionId,
      user_id: userId,
      session_token_hash: tokenHash,
      created_at: nowIso,
      expires_at: expIso,
    });

    if (error) {
      console.error('[Supabase] createSession error:', error);
      throw new Error(`Database error creating session: ${error.message}`);
    }

    return { token: rawToken, expiresAt: expIso };
  },

  async verifySessionToken(token: string): Promise<{ valid: boolean; userId?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase || !token) return { valid: false };

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const { data: session, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('session_token_hash', tokenHash)
      .maybeSingle();

    if (error || !session) return { valid: false };

    if (new Date(session.expires_at).getTime() < Date.now()) {
      await supabase.from('sessions').delete().eq('session_token_hash', tokenHash);
      return { valid: false };
    }

    return { valid: true, userId: session.user_id };
  },

  async invalidateSession(token: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase || !token) return;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await supabase.from('sessions').delete().eq('session_token_hash', tokenHash);
  },

  async invalidateAllUserSessions(userId: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase || !userId) return;
    await supabase.from('sessions').delete().eq('user_id', userId);
  },

  async linkIdentityToUser(
    userId: string,
    provider: AuthProvider,
    providerUid: string,
    _extra?: {
      passwordHash?: string;
      passkeyPublicKey?: string;
      passkeyCounter?: number;
    }
  ): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client not initialized');

    const now = new Date().toISOString();

    const existing = await this.findIdentityByProvider(provider, providerUid);
    if (existing) {
      if (existing.user_id === userId) return;
      throw new Error(`This ${provider} identity is already linked to another Farm2Home user.`);
    }

    const identityId = crypto.randomUUID();
    const { error } = await supabase.from('auth_identities').insert({
      identity_id: identityId,
      user_id: userId,
      provider,
      provider_user_id: providerUid,
      created_at: now,
      updated_at: now,
    });

    if (error) {
      console.error('[Supabase] linkIdentityToUser error:', error);
      throw new Error(`Database error linking ${provider} identity`);
    }
  },

  async getUserLinkedProviders(userId: string): Promise<AuthProvider[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('auth_identities')
      .select('provider')
      .eq('user_id', userId);

    if (error || !data) return [];
    return (data as any[]).map((d) => d.provider as AuthProvider);
  },

  async updateUserRole(
    userId: string,
    role: UserRole,
    details?: { farmName?: string; location?: string }
  ): Promise<Profile> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client not initialized');

    const now = new Date().toISOString();
    const dbRole = roleToDb(role);

    const { error: userError } = await supabase
      .from('users')
      .update({ role: dbRole, updated_at: now })
      .eq('user_id', userId);

    if (userError) {
      throw new Error(`Failed to update user role: ${userError.message}`);
    }

    if (role === 'farmer') {
      await supabase.from('farmer_profiles').upsert({
        user_id: userId,
        farm_name: details?.farmName || 'Green Organic Acres',
        location: details?.location || 'Andhra & Telangana Agri Region',
        created_at: now,
        updated_at: now,
      });
    } else if (role === 'delivery') {
      await supabase.from('delivery_profiles').upsert({
        user_id: userId,
        vehicle_type: 'Two-Wheeler EV',
        created_at: now,
        updated_at: now,
      });
    } else {
      await supabase.from('customer_profiles').upsert({
        user_id: userId,
        location: details?.location || 'Andhra & Telangana Agri Region',
        created_at: now,
        updated_at: now,
      });
    }

    const profile = await this.getCombinedProfile(userId);
    if (!profile) throw new Error('Profile lookup failed after role update');
    return profile;
  },
};
