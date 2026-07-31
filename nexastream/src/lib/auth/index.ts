import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { validateEmail, validatePassword } from '@/lib/utils';

// Secret keys (should be in environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'your-refresh-secret-key-change-in-production';
const SALT_ROUNDS = 12;

// Token expiration times
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const SESSION_EXPIRY_HOURS = 24;

// Password hashing
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// JWT Token generation
export function generateAccessToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email, type: 'access' },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign(
    { userId, type: 'refresh' },
    REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
}

export function generateSessionToken(): string {
  return jwt.sign(
    { sessionId: crypto.randomUUID(), createdAt: Date.now() },
    JWT_SECRET,
    { expiresIn: `${SESSION_EXPIRY_HOURS}h` }
  );
}

// Token verification
export interface TokenPayload {
  userId: string;
  email?: string;
  type: 'access' | 'refresh';
  sessionId?: string;
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    const payload = jwt.verify(token, REFRESH_SECRET) as TokenPayload;
    if (payload.type !== 'refresh') return null;
    return payload;
  } catch {
    return null;
  }
}

// Cookie management
export function setAuthCookies(accessToken: string, refreshToken: string): void {
  const cookieStore = cookies();
  
  cookieStore.set('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60, // 15 minutes
    path: '/',
  });

  cookieStore.set('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
  });
}

export function clearAuthCookies(): void {
  const cookieStore = cookies();
  
  cookieStore.delete('accessToken');
  cookieStore.delete('refreshToken');
  cookieStore.delete('sessionId');
}

export function getAccessToken(): string | null {
  const cookieStore = cookies();
  return cookieStore.get('accessToken')?.value || null;
}

export function getRefreshToken(): string | null {
  const cookieStore = cookies();
  return cookieStore.get('refreshToken')?.value || null;
}

// Session management
export interface Session {
  id: string;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  expiresAt: Date;
}

const sessions = new Map<string, Session>();

export function createSession(userId: string, ipAddress?: string, userAgent?: string): Session {
  const sessionId = crypto.randomUUID();
  const session: Session = {
    id: sessionId,
    userId,
    ipAddress,
    userAgent,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000),
  };
  
  sessions.set(sessionId, session);
  
  // Set session cookie
  cookies().set('sessionId', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: SESSION_EXPIRY_HOURS * 60 * 60,
    path: '/',
  });
  
  return session;
}

export function getSession(sessionId: string): Session | null {
  const session = sessions.get(sessionId);
  
  if (!session) return null;
  
  if (new Date() > session.expiresAt) {
    sessions.delete(sessionId);
    return null;
  }
  
  return session;
}

export function invalidateSession(sessionId: string): void {
  sessions.delete(sessionId);
}

export function invalidateAllUserSessions(userId: string): void {
  for (const [id, session] of sessions) {
    if (session.userId === userId) {
      sessions.delete(id);
    }
  }
}

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxAttempts - 1 };
  }
  
  if (record.count >= maxAttempts) {
    return { allowed: false, remaining: 0 };
  }
  
  record.count++;
  return { allowed: true, remaining: maxAttempts - record.count };
}

// User registration validation
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateRegistration(
  email: string,
  password: string,
  username: string
): ValidationResult {
  const errors: string[] = [];
  
  if (!validateEmail(email)) {
    errors.push('Invalid email address');
  }
  
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    errors.push(...passwordValidation.errors);
  }
  
  if (username.length < 3 || username.length > 30) {
    errors.push('Username must be between 3 and 30 characters');
  }
  
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    errors.push('Username can only contain letters, numbers, and underscores');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// CSRF Protection
export function generateCSRFToken(): string {
  return crypto.randomUUID();
}

export function verifyCSRFToken(token: string, storedToken: string): boolean {
  return token === storedToken && token.length > 0;
}
