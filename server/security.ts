import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { AdminPermission, AdminRolePreset } from '../src/types.ts';

const DATA_DIR = path.resolve('data');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const RESETS_FILE = path.join(DATA_DIR, 'resets.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// =================== PASSWORD HASHING (SCRYPT + SAFE MIGRATION) ===================

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(
  password: string,
  storedHash?: string
): { valid: boolean; needsRehash: boolean } {
  if (!storedHash || !password) return { valid: false, needsRehash: false };

  if (storedHash.startsWith('scrypt$')) {
    const parts = storedHash.split('$');
    if (parts.length !== 3) return { valid: false, needsRehash: false };
    const [, salt, expectedHex] = parts;
    const derived = crypto.scryptSync(password, salt, 64);
    const expectedBuf = Buffer.from(expectedHex, 'hex');
    if (derived.length !== expectedBuf.length) return { valid: false, needsRehash: false };
    const valid = crypto.timingSafeEqual(derived, expectedBuf);
    return { valid, needsRehash: false };
  }

  // Legacy SHA-256 support ONLY to avoid locking out pre-existing DB accounts; triggers immediate upgrade to scrypt
  if (/^[a-f0-9]{64}$/i.test(storedHash)) {
    const legacyHash = crypto.createHash('sha256').update(password).digest('hex');
    const a = Buffer.from(legacyHash, 'hex');
    const b = Buffer.from(storedHash.toLowerCase(), 'hex');
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
      return { valid: true, needsRehash: true };
    }
  }

  return { valid: false, needsRehash: false };
}

// =================== RBAC ROLE & PERMISSION MATRIX ===================

export const ALL_PERMISSIONS: AdminPermission[] = [
  'overview.view',
  'products.manage',
  'categories.manage',
  'inventory.manage',
  'orders.view',
  'orders.manage',
  'delivery.manage',
  'customers.view',
  'customers.manage',
  'payments.view',
  'payments.refund',
  'returns.manage',
  'wholesale.manage',
  'coupons.manage',
  'reviews.manage',
  'reports.view',
  'finance.view',
  'notifications.manage',
  'content.manage',
  'settings.manage',
  'team.manage',
  'staff.manage',
  'security.logs',
  'backups.manage',
  'ownership.transfer',
];

export const ROLE_PRESET_PERMISSIONS: Record<AdminRolePreset, AdminPermission[]> = {
  primary_owner: [...ALL_PERMISSIONS],
  store_partner: [
    'overview.view',
    'products.manage',
    'categories.manage',
    'inventory.manage',
    'orders.view',
    'orders.manage',
    'delivery.manage',
    'customers.view',
    'returns.manage',
    'coupons.manage',
    'reviews.manage',
    'notifications.manage',
  ],
  order_manager: [
    'overview.view',
    'orders.view',
    'orders.manage',
    'delivery.manage',
    'returns.manage',
    'customers.view',
    'notifications.manage',
  ],
  inventory_manager: [
    'overview.view',
    'products.manage',
    'categories.manage',
    'inventory.manage',
    'notifications.manage',
  ],
  customer_support: [
    'overview.view',
    'orders.view',
    'customers.view',
    'customers.manage',
    'returns.manage',
    'reviews.manage',
    'notifications.manage',
  ],
  delivery_staff: [
    'orders.view',
    'delivery.manage',
    'notifications.manage',
  ],
  finance_manager: [
    'overview.view',
    'orders.view',
    'payments.view',
    'payments.refund',
    'reports.view',
    'finance.view',
    'wholesale.manage',
    'notifications.manage',
  ],
  custom: ['overview.view'],
};

export function resolveEffectivePermissions(
  user: {
    email: string;
    role: string;
    isSuperAdmin?: boolean;
    adminRole?: AdminRolePreset;
    permissions?: AdminPermission[];
  },
  superAdminEmail: string
): AdminPermission[] {
  if (user.role !== 'admin') return [];
  const isOwner = user.email.toLowerCase() === superAdminEmail.toLowerCase() || !!user.isSuperAdmin;
  if (isOwner) return [...ALL_PERMISSIONS];

  if (Array.isArray(user.permissions) && user.permissions.length > 0) {
    // Non-owners can NEVER hold ownership.transfer unless explicitly granted, and cannot override primary owner protections
    return user.permissions.filter((p) => p !== 'ownership.transfer');
  }
  const preset = user.adminRole || 'store_partner';
  return [...(ROLE_PRESET_PERMISSIONS[preset] || ROLE_PRESET_PERMISSIONS.store_partner)].filter(
    (p) => p !== 'ownership.transfer'
  );
}

// =================== PERSISTENT SESSION STORE ===================

export interface SessionRecord {
  token: string;
  userId: string;
  email: string;
  role: 'admin' | 'customer';
  isSuperAdmin?: boolean;
  adminRole?: AdminRolePreset;
  createdAt: number;
  expiresAt: number;
  userAgent?: string;
  ipAddress?: string;
}

function readSessions(): Record<string, SessionRecord> {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
      const now = Date.now();
      const valid: Record<string, SessionRecord> = {};
      for (const [k, v] of Object.entries<any>(parsed || {})) {
        if (v && typeof v.expiresAt === 'number' && v.expiresAt > now) {
          valid[k] = v;
        }
      }
      return valid;
    }
  } catch {
    // ignore corrupt sessions file
  }
  return {};
}

function writeSessions(map: Record<string, SessionRecord>) {
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(map, null, 2), 'utf-8');
}

export function createSession(
  user: {
    id: string;
    email: string;
    role: 'admin' | 'customer';
    isSuperAdmin?: boolean;
    adminRole?: AdminRolePreset;
  },
  ttlHours = 24 * 7,
  meta?: { userAgent?: string; ipAddress?: string }
): string {
  const token = crypto.randomBytes(32).toString('hex');
  const map = readSessions();
  map[token] = {
    token,
    userId: user.id,
    email: user.email,
    role: user.role,
    isSuperAdmin: user.isSuperAdmin,
    adminRole: user.adminRole,
    createdAt: Date.now(),
    expiresAt: Date.now() + ttlHours * 60 * 60 * 1000,
    userAgent: meta?.userAgent,
    ipAddress: meta?.ipAddress,
  };
  writeSessions(map);
  return token;
}

export function getSession(token: string): SessionRecord | null {
  if (!token) return null;
  const map = readSessions();
  const sess = map[token];
  if (!sess) return null;
  if (sess.expiresAt <= Date.now()) {
    delete map[token];
    writeSessions(map);
    return null;
  }
  return sess;
}

export function revokeSessionToken(token: string) {
  const map = readSessions();
  if (map[token]) {
    delete map[token];
    writeSessions(map);
  }
}

export function revokeSessionsForUser(userId: string, email?: string) {
  const map = readSessions();
  let changed = false;
  const normEmail = email?.toLowerCase();
  for (const [tok, sess] of Object.entries(map)) {
    if (sess.userId === userId || (normEmail && sess.email.toLowerCase() === normEmail)) {
      delete map[tok];
      changed = true;
    }
  }
  if (changed) writeSessions(map);
}

export function listActiveSessions(): Omit<SessionRecord, 'token'>[] {
  const map = readSessions();
  return Object.values(map).map((s) => ({
    userId: s.userId,
    email: s.email,
    role: s.role,
    isSuperAdmin: s.isSuperAdmin,
    adminRole: s.adminRole,
    createdAt: s.createdAt,
    expiresAt: s.expiresAt,
    userAgent: s.userAgent,
    ipAddress: s.ipAddress,
  }));
}

// =================== PASSWORD RECOVERY TOKENS ===================

interface ResetRecord {
  email: string;
  tokenHash: string;
  scope: 'admin' | 'customer';
  expiresAt: number;
  used: boolean;
}

function readResets(): ResetRecord[] {
  try {
    if (fs.existsSync(RESETS_FILE)) {
      const list = JSON.parse(fs.readFileSync(RESETS_FILE, 'utf-8'));
      const now = Date.now();
      return Array.isArray(list) ? list.filter((r) => r.expiresAt > now && !r.used) : [];
    }
  } catch {
    // ignore
  }
  return [];
}

function writeResets(list: ResetRecord[]) {
  fs.writeFileSync(RESETS_FILE, JSON.stringify(list, null, 2), 'utf-8');
}

export function issueResetToken(email: string, scope: 'admin' | 'customer'): string {
  const rawToken = crypto.randomBytes(16).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const list = readResets().filter((r) => !(r.email === email.toLowerCase() && r.scope === scope));
  list.push({
    email: email.toLowerCase(),
    tokenHash,
    scope,
    expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
    used: false,
  });
  writeResets(list);
  return rawToken;
}

export function consumeResetToken(email: string, rawToken: string, scope: 'admin' | 'customer'): boolean {
  const tokenHash = crypto.createHash('sha256').update(String(rawToken).trim()).digest('hex');
  const list = readResets();
  const idx = list.findIndex(
    (r) => r.email === email.toLowerCase() && r.scope === scope && r.tokenHash === tokenHash && !r.used && r.expiresAt > Date.now()
  );
  if (idx === -1) return false;
  list[idx].used = true;
  writeResets(list);
  return true;
}

// =================== RATE LIMITER ===================

interface RateBucket {
  count: number;
  resetAt: number;
}

const rateBuckets = new Map<string, RateBucket>();

export function checkRateLimit(key: string, maxRequests: number, windowMs: number): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const existing = rateBuckets.get(key);
  if (!existing || existing.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }
  if (existing.count >= maxRequests) {
    return { allowed: false, retryAfterSec: Math.ceil((existing.resetAt - now) / 1000) };
  }
  existing.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

export function resetRateLimit(key: string) {
  rateBuckets.delete(key);
}

// =================== GOOGLE OAUTH SERVER VERIFICATION ===================

export async function verifyGoogleOAuthToken(params: {
  idToken?: string;
  accessToken?: string;
}): Promise<{ ok: boolean; email?: string; name?: string; error?: string; notConfigured?: boolean }> {
  const configuredClientId = (process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '').trim();
  if (!configuredClientId) {
    return {
      ok: false,
      notConfigured: true,
      error: 'Google OAuth Client ID (GOOGLE_CLIENT_ID) is not configured on the server.',
    };
  }

  try {
    if (params.idToken) {
      const resp = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(params.idToken)}`
      );
      if (!resp.ok) {
        return { ok: false, error: 'Google ID token verification failed.' };
      }
      const payload: any = await resp.json();
      const emailVerified = payload.email_verified === true || payload.email_verified === 'true';
      if (!emailVerified || !payload.email) {
        return { ok: false, error: 'Google account email is not verified.' };
      }
      if (payload.aud !== configuredClientId) {
        return { ok: false, error: 'Google token audience mismatch.' };
      }
      return { ok: true, email: String(payload.email).toLowerCase(), name: payload.name };
    }

    if (params.accessToken) {
      const resp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${params.accessToken}` },
      });
      if (!resp.ok) {
        return { ok: false, error: 'Google access token verification failed.' };
      }
      const payload: any = await resp.json();
      if (!payload.email_verified || !payload.email) {
        return { ok: false, error: 'Google account email is not verified.' };
      }
      return { ok: true, email: String(payload.email).toLowerCase(), name: payload.name };
    }

    return { ok: false, error: 'A valid Google ID token or access token is required.' };
  } catch {
    return { ok: false, error: 'Unable to reach Google OAuth verification servers.' };
  }
}

// =================== LOG SANITIZATION ===================

const SENSITIVE_KEYS = /password|secret|token|hash|key|credential|authorization/i;

export function sanitizeAuditPayload(obj: any): Record<string, any> | null {
  if (!obj || typeof obj !== 'object') return null;
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.test(k)) {
      out[k] = '[REDACTED]';
    } else if (Array.isArray(v)) {
      out[k] = v.slice(0, 10);
    } else if (v && typeof v === 'object') {
      out[k] = sanitizeAuditPayload(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}
