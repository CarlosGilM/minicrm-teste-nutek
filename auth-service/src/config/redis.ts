import Redis from 'ioredis';
import { env } from './env';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times: number) {
    const delay = Math.min(times * 200, 2000);
    return delay;
  },
});

redis.on('connect', () => {
  console.log('✅ Connected to Redis');
});

redis.on('error', (err: Error) => {
  console.error('❌ Redis connection error:', err.message);
});
