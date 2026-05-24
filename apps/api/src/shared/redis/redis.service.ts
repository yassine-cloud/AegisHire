import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

/**
 * Redis cache wrapper for gap report reads/writes and invalidation.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error('REDIS_URL is required');
    }

    this.client = new Redis(redisUrl, {
      lazyConnect: false,
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
    });

    this.client.on('error', (error: Error) => {
      this.logger.error(`Redis client error: ${error.message}`);
    });
  }

  /**
   * Get a string value by key.
   */
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  /**
   * Set a key with TTL in seconds.
   */
  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.client.set(key, value, 'EX', ttlSeconds);
  }

  /**
   * Delete a key.
   */
  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  /**
   * Delete all keys matching a pattern using SCAN to avoid keyspace blocking.
   */
  async delByPattern(pattern: string): Promise<void> {
    let cursor = '0';

    do {
      const [nextCursor, keys] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', '100');
      cursor = nextCursor;

      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } while (cursor !== '0');
  }

  /**
   * Gracefully close Redis connection during app shutdown.
   */
  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
