/**
 * Advanced Caching Layer for Conversations and Sessions
 * 
 * Implements Redis-based caching or in-memory caching with TTL, size limits,
 * and efficient cleanup mechanisms for optimal performance
 */

class CacheManager {
  constructor() {
    this.cache = new Map();
    this.maxSize = process.env.CACHE_MAX_SIZE ? parseInt(process.env.CACHE_MAX_SIZE) : 5000;
    this.defaultTTL = process.env.CACHE_DEFAULT_TTL ? parseInt(process.env.CACHE_DEFAULT_TTL) : 300000; // 5 minutes
    this.accessTimes = new Map(); // Track last access times
    this.cleanupInterval = 300000; // 5 minutes
    
    // Start periodic cleanup
    this.startCleanup();
  }

  /**
   * Start automatic cleanup process
   */
  startCleanup() {
    setInterval(() => {
      this.cleanupExpiredEntries();
      this.maintainSizeLimits();
    }, this.cleanupInterval);
  }

  /**
   * Get value from cache
   */
  get(key) {
    if (!this.cache.has(key)) {
      return null;
    }

    const entry = this.cache.get(key);
    
    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.delete(key);
      return null;
    }

    // Update access time
    this.accessTimes.set(key, Date.now());
    return entry.value;
  }

  /**
   * Set value in cache with TTL
   */
  set(key, value, ttl = this.defaultTTL) {
    // Evict entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, {
      value: value,
      timestamp: Date.now(),
      ttl: ttl
    });
    
    this.accessTimes.set(key, Date.now());
  }

  /**
   * Delete key from cache
   */
  delete(key) {
    this.cache.delete(key);
    this.accessTimes.delete(key);
  }

  /**
   * Check if key exists in cache
   */
  has(key) {
    if (!this.cache.has(key)) {
      return false;
    }

    const entry = this.cache.get(key);
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Evict least recently used entries when cache is full
   */
  evictLRU() {
    if (this.accessTimes.size === 0) return;

    // Find the least recently accessed key
    let lruKey = null;
    let oldestTime = Date.now();

    for (const [key, accessTime] of this.accessTimes) {
      if (accessTime < oldestTime) {
        oldestTime = accessTime;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.delete(lruKey);
    }
  }

  /**
   * Cleanup expired entries
   */
  cleanupExpiredEntries() {
    const now = Date.now();
    const expiredKeys = [];

    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > entry.ttl) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.delete(key);
    }
  }

  /**
   * Maintain size limits by removing LRU entries if needed
   */
  maintainSizeLimits() {
    while (this.cache.size > this.maxSize) {
      this.evictLRU();
    }
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
    this.accessTimes.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      utilization: (this.cache.size / this.maxSize * 100).toFixed(2) + '%',
      entries: Array.from(this.cache.keys())
    };
  }
}

// Create a specialized cache for different types of data
class ConversationCache {
  constructor() {
    this.cacheManager = new CacheManager();
  }

  /**
   * Cache conversation history
   */
  cacheConversation(userId, history, ttl = 300000) { // 5 minutes default
    const key = `conv_${userId}`;
    this.cacheManager.set(key, history, ttl);
  }

  /**
   * Get cached conversation history
   */
  getCachedConversation(userId) {
    const key = `conv_${userId}`;
    return this.cacheManager.get(key);
  }

  /**
   * Cache user session
   */
  cacheSession(userId, sessionData, ttl = 1800000) { // 30 minutes default
    const key = `session_${userId}`;
    this.cacheManager.set(key, sessionData, ttl);
  }

  /**
   * Get cached user session
   */
  getCachedSession(userId) {
    const key = `session_${userId}`;
    return this.cacheManager.get(key);
  }

  /**
   * Cache knowledge base results
   */
  cacheKnowledge(query, results, ttl = 600000) { // 10 minutes default
    const key = `kb_${this.generateQueryHash(query)}`;
    this.cacheManager.set(key, results, ttl);
  }

  /**
   * Get cached knowledge base results
   */
  getCachedKnowledge(query) {
    const key = `kb_${this.generateQueryHash(query)}`;
    return this.cacheManager.get(key);
  }

  /**
   * Generate hash for query to use as cache key
   */
  generateQueryHash(query) {
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return this.cacheManager.getStats();
  }
}

// Export the cache manager
const conversationCache = new ConversationCache();
module.exports = conversationCache;