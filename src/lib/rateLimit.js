import { RateLimiterRedis } from 'rate-limiter-flexible';
import redis from './redis.js';

const limitersCache = new Map();

function getRateLimiter(points, duration) {
  const cacheKey = `${points}:${duration}`;
  if (!limitersCache.has(cacheKey)) {
    const limiter = new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: 'rl',
      points: points,
      duration: duration,
    });
    limitersCache.set(cacheKey, limiter);
  }
  return limitersCache.get(cacheKey);
}

/**
 * Redis-backed rate limiter using rate-limiter-flexible.
 * Safe across serverless environments and multi-instance deployments.
 *
 * @param {string} identifier - Unique key (e.g. `login:${ip}`)
 * @param {number} limit - Maximum allowed requests within window
 * @param {number} windowSeconds - Sliding window duration in seconds
 * @returns {Promise<{ success: boolean, remaining: number, resetAt: Date }>}
 */
export async function checkRateLimit(identifier, limit = 5, windowSeconds = 60) {
  try {
    const limiter = getRateLimiter(limit, windowSeconds);
    const res = await limiter.consume(identifier, 1);

    const resetAt = new Date(Date.now() + res.msBeforeNext);
    return {
      success: true,
      remaining: res.remainingPoints,
      resetAt,
    };
  } catch (rejOrError) {
    // If rate limit exceeded, rate-limiter-flexible throws RateLimiterRes object
    if (rejOrError && typeof rejOrError.remainingPoints === 'number') {
      const resetAt = new Date(Date.now() + (rejOrError.msBeforeNext || windowSeconds * 1000));
      return {
        success: false,
        remaining: 0,
        resetAt,
      };
    }

    // Fail open on Redis error (connection error, timeout, etc.)
    console.warn(
      `[RateLimit] Redis error encountered (${rejOrError?.message || rejOrError}). Failing open.`
    );
    return {
      success: true,
      remaining: 1,
      resetAt: new Date(Date.now() + windowSeconds * 1000),
    };
  }
}

/**
 * Extract client IP helper from request headers
 */
export function getClientIP(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}
