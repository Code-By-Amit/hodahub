import crypto from 'crypto';
import { db } from './db/index.js';
import { msg91UsedTokens } from './db/schema.js';
import { eq } from 'drizzle-orm';

// In-memory replay guard cache (hash -> expiresAt timestamp in ms)
// Provides instant memory-level deduplication across fast concurrent requests
const memoryTokenCache = new Map();

// Default token TTL: 1 hour (MSG91 OTP tokens are valid for <10 minutes)
const DEFAULT_TTL_MS = 60 * 60 * 1000;

/**
 * Clean up expired tokens from memory cache periodically
 */
function cleanupMemoryCache() {
  const now = Date.now();
  for (const [hash, expiresAt] of memoryTokenCache.entries()) {
    if (expiresAt <= now) {
      memoryTokenCache.delete(hash);
    }
  }
}

/**
 * Compute SHA-256 hash of access token
 * @param {string} token
 * @returns {string} 64-char hex string
 */
export function hashAccessToken(token) {
  return crypto.createHash('sha256').update(String(token).trim()).digest('hex');
}

/**
 * Check if a token has already been used
 * @param {string} token - Raw JWT access token
 * @returns {Promise<boolean>} - True if token was previously consumed
 */
export async function isTokenUsed(token) {
  if (!token || typeof token !== 'string') return false;
  const hash = hashAccessToken(token);

  // 1. Check in-memory cache
  const cachedExpiry = memoryTokenCache.get(hash);
  if (cachedExpiry) {
    if (cachedExpiry > Date.now()) {
      return true;
    }
    memoryTokenCache.delete(hash);
  }

  // 2. Check persistent database
  try {
    const existing = await db
      .select({ tokenHash: msg91UsedTokens.tokenHash })
      .from(msg91UsedTokens)
      .where(eq(msg91UsedTokens.tokenHash, hash))
      .limit(1);

    if (existing && existing.length > 0) {
      // Re-populate memory cache
      memoryTokenCache.set(hash, Date.now() + DEFAULT_TTL_MS);
      return true;
    }
  } catch (dbErr) {
    console.warn('[TokenReplayGuard] DB check warning (falling back to memory):', dbErr instanceof Error ? dbErr.message : dbErr);
  }

  return false;
}

/**
 * Mark a token as consumed / used
 * @param {string} token - Raw JWT access token
 * @param {number} [ttlMs] - Time to live in ms
 * @returns {Promise<void>}
 */
export async function markTokenUsed(token, ttlMs = DEFAULT_TTL_MS) {
  if (!token || typeof token !== 'string') return;
  const hash = hashAccessToken(token);
  const expiresAt = new Date(Date.now() + ttlMs);

  // 1. Store in memory
  memoryTokenCache.set(hash, expiresAt.getTime());
  cleanupMemoryCache();

  // 2. Persist to database
  try {
    await db
      .insert(msg91UsedTokens)
      .values({
        tokenHash: hash,
        expiresAt,
      })
      .onConflictDoNothing();
  } catch (dbErr) {
    console.warn('[TokenReplayGuard] DB store warning:', dbErr instanceof Error ? dbErr.message : dbErr);
  }
}
