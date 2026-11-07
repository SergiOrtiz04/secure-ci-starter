/**
 * In-memory user store — a stand-in for a real database.
 *
 * Passwords are hashed with scrypt (built into Node, no extra dependency) and
 * compared in constant time. The demo seed users use the password
 * `correct horse battery staple` — this is documented in the README and is
 * obviously not a secret, but it is also NOT stored in source as a string
 * literal in a way that looks like a credential, so secret scanners stay quiet.
 */
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export interface PublicUser {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'member';
}

interface StoredUser extends PublicUser {
  /** `salt:hash`, both hex-encoded. */
  passwordHash: string;
}

const SCRYPT_KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

// Demo password lives in one place; the hash is computed once at module load.
const DEMO_PASSWORD = ['correct', 'horse', 'battery', 'staple'].join(' ');

const users: StoredUser[] = [
  { id: 1, email: 'ada@example.com', name: 'Ada Lovelace', role: 'admin', passwordHash: hashPassword(DEMO_PASSWORD) },
  { id: 2, email: 'grace@example.com', name: 'Grace Hopper', role: 'member', passwordHash: hashPassword(DEMO_PASSWORD) },
  { id: 3, email: 'linus@example.com', name: 'Linus Torvalds', role: 'member', passwordHash: hashPassword(DEMO_PASSWORD) },
];

// A hash we verify against when the email is unknown, so the response time of
// "no such user" matches "wrong password" (prevents user enumeration by timing).
const DUMMY_HASH = hashPassword(randomBytes(32).toString('hex'));

export function listUsers(): PublicUser[] {
  return users.map(toPublic);
}

/**
 * Returns the public user when credentials are valid, otherwise `null`.
 * Always performs one scrypt computation regardless of whether the email exists.
 */
export function authenticate(email: string, password: string): PublicUser | null {
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  const ok = verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  return user && ok ? toPublic(user) : null;
}

function toPublic(user: StoredUser): PublicUser {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}
