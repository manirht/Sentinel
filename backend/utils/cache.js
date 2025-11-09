import NodeCache from 'node-cache';
import { logger } from './logger.js';

/**
 * Cache Manager using node-cache (in-memory)
 * Implements caching for frequently accessed data
 * 
 * Time Complexity:
 * - get: O(1)
 * - set: O(1)
 * - delete: O(1)
 * 
 * Space Complexity: O(n) where n is number of cached items
 * 
 * Trade-off: In-memory cache provides fast access but doesn't persist
 * For production, consider Redis for distributed caching
 */
class CacheManager {
  constructor() {
    // Initialize cache with TTL from env or default 5 minutes
    this.cache = new NodeCache({
      stdTTL: parseInt(process.env.CACHE_TTL) || 300,
      checkperiod: 120, // Check for expired keys every 2 minutes
      useClones: false // Performance optimization
    });

    // Cache statistics
    this.stats = {
      hits: 0,
      misses: 0
    };

    // Event listeners for monitoring
    this.cache.on('set', (key, value) => {
      logger.debug(`Cache SET: ${key}`);
    });

    this.cache.on('del', (key, value) => {
      logger.debug(`Cache DEL: ${key}`);
    });

    this.cache.on('expired', (key, value) => {
      logger.debug(`Cache EXPIRED: ${key}`);
    });
  }

  /**
   * Get value from cache
   * Time Complexity: O(1)
   */
  get(key) {
    const value = this.cache.get(key);
    if (value === undefined) {
      this.stats.misses++;
      logger.debug(`Cache MISS: ${key}`);
    } else {
      this.stats.hits++;
      logger.debug(`Cache HIT: ${key}`);
    }
    return value;
  }

  /**
   * Set value in cache
   * Time Complexity: O(1)
   */
  set(key, value, ttl) {
    const success = this.cache.set(key, value, ttl);
    return success;
  }

  /**
   * Delete value from cache
   * Time Complexity: O(1)
   */
  delete(key) {
    return this.cache.del(key);
  }

  /**
   * Delete multiple keys
   * Time Complexity: O(n) where n is number of keys
   */
  deleteMultiple(keys) {
    return this.cache.del(keys);
  }

  /**
   * Clear all cache
   * Time Complexity: O(n) where n is number of keys
   */
  flush() {
    this.cache.flushAll();
    logger.info('Cache flushed');
  }

  /**
   * Get cache statistics
   * Time Complexity: O(1)
   */
  getStats() {
    const keys = this.cache.keys();
    return {
      ...this.stats,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
      keys: keys.length,
      memoryUsage: this.cache.getStats()
    };
  }

  /**
   * Get or set pattern - fetch from cache or execute function and cache result
   * Time Complexity: O(1) for cache hit, O(f) for cache miss where f is function complexity
   */
  async getOrSet(key, fetchFunction, ttl) {
    const cachedValue = this.get(key);
    
    if (cachedValue !== undefined) {
      return cachedValue;
    }

    const value = await fetchFunction();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Invalidate cache by pattern
   * Time Complexity: O(n) where n is number of keys
   */
  invalidatePattern(pattern) {
    const keys = this.cache.keys();
    const matchingKeys = keys.filter(key => key.includes(pattern));
    if (matchingKeys.length > 0) {
      this.deleteMultiple(matchingKeys);
      logger.info(`Invalidated ${matchingKeys.length} cache keys matching pattern: ${pattern}`);
    }
  }
}

// Export singleton instance
const cacheManager = new CacheManager();
export default cacheManager;
