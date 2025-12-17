/**
 * Improved Cache System with Redis support and better AI response caching
 */

require('dotenv').config();

class ImprovedCache {
  constructor() {
    this.memoryCache = new Map();
    this.redisClient = null;
    this.ttls = new Map(); // Store TTL for each key
    
    // Try to initialize Redis if available
    this.useRedis = process.env.REDIS_URL ? true : false;
    
    if (this.useRedis) {
      try {
        const redis = require('redis');
        this.redisClient = redis.createClient({
          url: process.env.REDIS_URL
        });
        
        this.redisClient.on('error', (err) => {
          console.error('Redis Client Error:', err);
          this.useRedis = false; // Fall back to memory cache
        });
        
        this.redisClient.connect();
        console.log('✅ Redis cache initialized');
      } catch (error) {
        console.warn('⚠️ Redis not available, using memory cache:', error.message);
        this.useRedis = false;
      }
    }
    
    this.maxMemorySize = 1000; // Maximum number of entries in memory cache
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes default TTL
  }

  /**
   * Get value from cache
   */
  async get(key) {
    // First check memory cache
    if (this.memoryCache.has(key)) {
      const ttl = this.ttls.get(key);
      if (ttl && Date.now() > ttl) {
        // Entry expired
        this.memoryCache.delete(key);
        this.ttls.delete(key);
        return null;
      }
      return this.memoryCache.get(key);
    }

    // Then check Redis if available
    if (this.useRedis && this.redisClient) {
      try {
        const value = await this.redisClient.get(key);
        if (value !== null) {
          // Update memory cache for faster subsequent access
          const parsedValue = JSON.parse(value);
          this.set(key, parsedValue, this.defaultTTL);
          return parsedValue;
        }
      } catch (error) {
        console.warn('Redis get error:', error.message);
      }
    }

    return null;
  }

  /**
   * Set value in cache
   */
  async set(key, value, ttl = this.defaultTTL) {
    if (this.memoryCache.size >= this.maxMemorySize) {
      // Remove oldest entry (first in Map iteration)
      const firstKey = this.memoryCache.keys().next().value;
      if (firstKey) {
        this.memoryCache.delete(firstKey);
        this.ttls.delete(firstKey);
      }
    }

    // Set in memory cache
    this.memoryCache.set(key, value);
    this.ttls.set(key, Date.now() + ttl);

    // Set in Redis if available
    if (this.useRedis && this.redisClient) {
      try {
        await this.redisClient.setEx(key, Math.floor(ttl / 1000), JSON.stringify(value));
      } catch (error) {
        console.warn('Redis set error:', error.message);
      }
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key) {
    // Delete from memory cache
    this.memoryCache.delete(key);
    this.ttls.delete(key);

    // Delete from Redis if available
    if (this.useRedis && this.redisClient) {
      try {
        await this.redisClient.del(key);
      } catch (error) {
        console.warn('Redis delete error:', error.message);
      }
    }
  }

  /**
   * Clear all cache
   */
  async clear() {
    this.memoryCache.clear();
    this.ttls.clear();

    if (this.useRedis && this.redisClient) {
      try {
        await this.redisClient.flushAll();
      } catch (error) {
        console.warn('Redis clear error:', error.message);
      }
    }
  }

  /**
   * Generate cache key for AI responses
   */
  generateAIResponseCacheKey(userMessage, sender_psid, provider, context = null) {
    const contextStr = context ? `_${context}` : '';
    const messageHash = this.simpleHash(userMessage.substring(0, 100));
    return `ai_response_${sender_psid}_${messageHash}${contextStr}_${provider}`;
  }

  /**
   * Generate cache key for embeddings
   */
  generateEmbeddingCacheKey(text) {
    const textHash = this.simpleHash(text.substring(0, 200));
    return `embedding_${textHash}`;
  }

  /**
   * Simple hash function
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Cache AI response
   */
  async cacheAIResponse(userMessage, sender_psid, response, provider, context = null, ttl = 10 * 60 * 1000) { // 10 minutes for AI responses
    const cacheKey = this.generateAIResponseCacheKey(userMessage, sender_psid, provider, context);
    await this.set(cacheKey, {
      response,
      timestamp: Date.now(),
      provider
    }, ttl);
  }

  /**
   * Get cached AI response
   */
  async getCachedAIResponse(userMessage, sender_psid, provider, context = null) {
    const cacheKey = this.generateAIResponseCacheKey(userMessage, sender_psid, provider, context);
    const cached = await this.get(cacheKey);
    
    if (cached) {
      console.log(`✅ AI response cache hit for key: ${cacheKey}`);
      return cached.response;
    }
    
    console.log(`❌ AI response cache miss for key: ${cacheKey}`);
    return null;
  }

  /**
   * Cache embedding
   */
  async cacheEmbedding(text, embedding, ttl = 30 * 60 * 1000) { // 30 minutes for embeddings
    const cacheKey = this.generateEmbeddingCacheKey(text);
    await this.set(cacheKey, {
      embedding,
      timestamp: Date.now()
    }, ttl);
  }

  /**
   * Get cached embedding
   */
  async getCachedEmbedding(text) {
    const cacheKey = this.generateEmbeddingCacheKey(text);
    const cached = await this.get(cacheKey);
    
    if (cached) {
      console.log(`✅ Embedding cache hit for key: ${cacheKey}`);
      return cached.embedding;
    }
    
    console.log(`❌ Embedding cache miss for key: ${cacheKey}`);
    return null;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      memoryCacheSize: this.memoryCache.size,
      useRedis: this.useRedis,
      redisConnected: this.useRedis && this.redisClient ? this.redisClient.isReady : false,
      timestamp: new Date().toISOString()
    };
  }
}

// Create and export singleton instance
const improvedCache = new ImprovedCache();
module.exports = improvedCache;