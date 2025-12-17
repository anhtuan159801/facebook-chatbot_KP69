/**
 * Centralized Database Connection Manager
 * 
 * Provides optimized database connections for both PostgreSQL and Supabase
 * with connection pooling, caching, and proper resource management
 */

require('dotenv').config();
const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');

class DatabaseManager {
  constructor() {
    this.pgPool = null;
    this.supabaseClient = null;
    this.cache = new Map(); // Simple in-memory cache
    this.cacheMaxSize = 1000;
    this.cacheTTL = 300000; // 5 minutes
  }

  /**
   * Initialize PostgreSQL connection pool with optimized settings
   */
  getPGPool() {
    if (!this.pgPool) {
      this.pgPool = new Pool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
        // Performance optimizations
        max: process.env.DB_MAX_CONNECTIONS ? parseInt(process.env.DB_MAX_CONNECTIONS) : 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
        maxUses: 7500, // Close connections after 7500 uses to prevent memory leaks
      });

      // Optional: Add monitoring for connection pool
      this.pgPool.on('connect', () => {
        console.log('✅ PostgreSQL connection acquired');
      });

      this.pgPool.on('remove', () => {
        console.log('🔒 PostgreSQL connection removed');
      });
    }
    return this.pgPool;
  }

  /**
   * Initialize Supabase client
   */
  getSupabaseClient() {
    if (!this.supabaseClient) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase URL and key are required');
      }

      this.supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    }
    return this.supabaseClient;
  }

  /**
   * Get cached value
   */
  getCached(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.value;
    } else if (cached) {
      this.cache.delete(key); // Remove expired entry
    }
    return null;
  }

  /**
   * Set cached value with TTL
   */
  setCached(key, value) {
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.cacheMaxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      value: value,
      timestamp: Date.now()
    });
  }

  /**
   * Clear specific cache entry
   */
  clearCache(key) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear(); // Clear all cache
    }
  }

  /**
   * Execute PostgreSQL query with optional caching
   */
  async executeQuery(query, values = [], useCache = false) {
    const cacheKey = useCache ? `${query}_${JSON.stringify(values)}` : null;
    
    if (useCache) {
      const cachedResult = this.getCached(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }
    }

    const pool = this.getPGPool();
    let client;
    try {
      client = await pool.connect();
      const result = await client.query(query, values);
      
      if (useCache) {
        this.setCached(cacheKey, result);
      }
      
      return result;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * Execute Supabase query with optional caching
   */
  async executeSupabaseQuery(table, selectQuery, conditions = {}, useCache = false) {
    const cacheKey = useCache ? `supabase_${table}_${JSON.stringify({selectQuery, conditions})}` : null;
    
    if (useCache) {
      const cachedResult = this.getCached(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }
    }

    const supabase = this.getSupabaseClient();
    let query = supabase.from(table).select(selectQuery);

    // Apply conditions
    Object.keys(conditions).forEach(key => {
      if (conditions[key] !== undefined && conditions[key] !== null) {
        query = query.eq(key, conditions[key]);
      }
    });

    const { data, error } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      throw error;
    }

    if (useCache) {
      this.setCached(cacheKey, data);
    }

    return data;
  }

  /**
   * Close all database connections
   */
  async closeAllConnections() {
    if (this.pgPool) {
      await this.pgPool.end();
      console.log('🔒 PostgreSQL pool closed');
    }
  }
}

// Create singleton instance
const dbManager = new DatabaseManager();

module.exports = dbManager;