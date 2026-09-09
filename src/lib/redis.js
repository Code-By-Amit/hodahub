import Redis from 'ioredis';

function createRedisClient() {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    connectTimeout: 5000,
    retryStrategy(times) {
      const delay = Math.min(times * 100, 3000);
      return delay;
    },
  });

  client.on('error', (err) => {
    console.error('Redis Client Error:', err.message);
  });

  return client;
}

const redis = globalThis.redisClient || createRedisClient();
if (process.env.NODE_ENV !== 'production') {
  globalThis.redisClient = redis;
}

export default redis;
