import crypto from 'crypto';
import { Profile, UserRole, AuthProvider } from '../types.js';
import { sessionsRepo } from './db/repositories/sessionsRepo.js';
import { authIdentitiesRepo, AuthIdentityRecord } from './db/repositories/authIdentitiesRepo.js';

export interface StoredIdentity {
  id: string;
  userId: string;
  provider: AuthProvider;
  providerUid: string;
  passwordHash?: string;
  passkeyPublicKey?: string;
  passkeyCounter?: number;
  createdAt: string;
  lastUsedAt: string;
}

export interface StoredSession {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  lastActiveAt: string;
}

interface PendingOtpChallenge {
  phone: string;
  ticket: string;
  code: string;
  expiresAt: number;
  attempts: number;
}

interface PendingPasskeyChallenge {
  challenge: string;
  userId?: string;
  expiresAt: number;
}

// In-memory challenge stores with automatic TTL
const pendingOtps: PendingOtpChallenge[] = [];
let pendingPasskeys: PendingPasskeyChallenge[] = [];

// Normalizers
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return raw.trim().replace(/\s+/g, '');
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

// Password Hashing via Scrypt
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split('$');
    if (!salt || !hash) return false;
    const computed = crypto.scryptSync(password, salt, 64);
    const storedBuf = Buffer.from(hash, 'hex');
    if (computed.length !== storedBuf.length) return false;
    return crypto.timingSafeEqual(computed, storedBuf);
  } catch {
    return false;
  }
}

// Backwards-compatible initAuthStorage
export function initAuthStorage(canonicalProfiles: Profile[]): void {
  for (const p of canonicalProfiles) {
    if (p.phone_number) {
      const cleanPhone = normalizePhone(p.phone_number).replace(/\D/g, '');
      if (!authIdentitiesRepo.findByProviderUid('phone', cleanPhone)) {
        authIdentitiesRepo.create({
          id: `idn_phone_${p.id}`,
          userId: p.id,
          provider: 'phone',
          providerUid: cleanPhone,
        });
      }
    }
    if (p.email) {
      const cleanEmail = normalizeEmail(p.email);
      if (!authIdentitiesRepo.findByProviderUid('email', cleanEmail)) {
        authIdentitiesRepo.create({
          id: `idn_email_${p.id}`,
          userId: p.id,
          provider: 'email',
          providerUid: cleanEmail,
          passwordHash: hashPassword('Pass@12345'), // Standard verified seed test password
        });
      }
    }
  }
}

// Session Management using Database
export function createSession(userId: string): { token: string; expiresAt: string } {
  const token = crypto.randomBytes(32).toString('hex');
  const session = sessionsRepo.createSession(token, userId, 30);
  return { token: session.token, expiresAt: session.expires_at };
}

export function verifySessionToken(token: string): { valid: boolean; userId?: string } {
  if (!token) return { valid: false };
  const session = sessionsRepo.findSession(token);
  if (!session) return { valid: false };

  if (new Date(session.expires_at).getTime() < Date.now()) {
    sessionsRepo.deleteSession(token);
    return { valid: false };
  }

  sessionsRepo.touchSession(token);
  return { valid: true, userId: session.user_id };
}

export function invalidateSession(token: string): void {
  sessionsRepo.deleteSession(token);
}

export function invalidateAllUserSessions(userId: string): void {
  sessionsRepo.deleteAllForUser(userId);
}

// Phone OTP Management
export function createPhoneOtp(phone: string): {
  ticket: string;
  devOtp: string;
  expiresAt: number;
} {
  const normPhone = normalizePhone(phone);
  const ticket = crypto.randomBytes(16).toString('hex');
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

  // Clean old challenges for this phone
  const idx = pendingOtps.findIndex((p) => p.phone === normPhone);
  if (idx !== -1) {
    pendingOtps.splice(idx, 1);
  }

  pendingOtps.push({
    phone: normPhone,
    ticket,
    code,
    expiresAt,
    attempts: 0,
  });

  return { ticket, devOtp: code, expiresAt };
}

export function verifyPhoneOtp(
  phone: string,
  arg2: string,
  arg3: string
): { verified: boolean; error?: string } {
  const normPhone = normalizePhone(phone);
  // Robust detection of ticket vs OTP code
  const isArg2Ticket = (arg2 && arg2.length > 10);
  const ticket = (isArg2Ticket ? arg2 : arg3)?.trim();
  const enteredOtp = (isArg2Ticket ? arg3 : arg2)?.trim();

  if (!ticket || !enteredOtp) {
    return { verified: false, error: 'Both ticket and OTP code are required for verification.' };
  }

  const challengeIndex = pendingOtps.findIndex(
    (p) => p.ticket === ticket && p.phone === normPhone
  );

  if (challengeIndex === -1) {
    return { verified: false, error: 'OTP request expired or invalid ticket. Please request a new code.' };
  }

  const challenge = pendingOtps[challengeIndex];
  if (Date.now() > challenge.expiresAt) {
    pendingOtps.splice(challengeIndex, 1);
    return { verified: false, error: 'OTP code has expired. Please request a new verification code.' };
  }

  challenge.attempts += 1;
  if (challenge.attempts > 5) {
    pendingOtps.splice(challengeIndex, 1);
    return { verified: false, error: 'Too many invalid attempts. Please request a new code.' };
  }

  const isValid = enteredOtp === challenge.code;

  if (!isValid) {
    return { verified: false, error: 'Invalid verification code.' };
  }

  // Remove challenge upon successful verification so it cannot be reused
  pendingOtps.splice(challengeIndex, 1);
  return { verified: true };
}

// Passkey (WebAuthn) Challenges
export function createPasskeyChallenge(userId?: string): { challenge: string } {
  const challenge = crypto.randomBytes(32).toString('base64url');
  pendingPasskeys.push({
    challenge,
    userId,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });
  pendingPasskeys = pendingPasskeys.filter((p) => p.expiresAt > Date.now());
  return { challenge };
}

export function verifyPasskeyChallenge(challenge: string): boolean {
  const idx = pendingPasskeys.findIndex(
    (p) => p.challenge === challenge && p.expiresAt > Date.now()
  );
  if (idx === -1) return false;
  pendingPasskeys.splice(idx, 1);
  return true;
}

// Identity Lookups via Database
export function findIdentityByProvider(
  provider: AuthProvider,
  providerUid: string
): StoredIdentity | undefined {
  const record = authIdentitiesRepo.findByProviderUid(provider, providerUid);
  if (!record) return undefined;
  return {
    id: record.id,
    userId: record.user_id,
    provider: record.provider,
    providerUid: record.provider_uid,
    passwordHash: record.password_hash || undefined,
    passkeyPublicKey: record.passkey_public_key || undefined,
    passkeyCounter: record.passkey_counter,
    createdAt: record.created_at,
    lastUsedAt: record.last_used_at,
  };
}

export function findIdentitiesByUserId(userId: string): StoredIdentity[] {
  const records = authIdentitiesRepo.findByUserId(userId);
  return records.map((r) => ({
    id: r.id,
    userId: r.user_id,
    provider: r.provider,
    providerUid: r.provider_uid,
    passwordHash: r.password_hash || undefined,
    passkeyPublicKey: r.passkey_public_key || undefined,
    passkeyCounter: r.passkey_counter,
    createdAt: r.created_at,
    lastUsedAt: r.last_used_at,
  }));
}

export function getUserLinkedProviders(userId: string): AuthProvider[] {
  const records = authIdentitiesRepo.findByUserId(userId);
  const providers = new Set<AuthProvider>();
  for (const r of records) {
    providers.add(r.provider);
  }
  return Array.from(providers);
}

export function linkIdentityToUser(
  userId: string,
  provider: AuthProvider,
  providerUid: string,
  extra?: { passwordHash?: string; passkeyPublicKey?: string }
): { success: boolean; error?: string } {
  const existing = authIdentitiesRepo.findByProviderUid(provider, providerUid);

  if (existing) {
    if (existing.user_id === userId) {
      return { success: true };
    }
    return {
      success: false,
      error: 'This authentication method is already linked to another Farm2Home account.',
    };
  }

  authIdentitiesRepo.create({
    id: `idn_${provider}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId,
    provider,
    providerUid,
    passwordHash: extra?.passwordHash,
    passkeyPublicKey: extra?.passkeyPublicKey,
  });

  return { success: true };
}

export function setOrUpdatePassword(
  userId: string,
  email: string,
  newPassword: string
): { success: boolean } {
  const normEmail = normalizeEmail(email);
  const existing = authIdentitiesRepo.findByProviderUid('email', normEmail);
  const hash = hashPassword(newPassword);

  if (existing && existing.user_id === userId) {
    authIdentitiesRepo.updatePasswordHash(userId, hash);
  } else {
    linkIdentityToUser(userId, 'email', normEmail, { passwordHash: hash });
  }

  return { success: true };
}
