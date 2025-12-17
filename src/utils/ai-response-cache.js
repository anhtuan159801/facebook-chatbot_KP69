/**
 * AI Response Caching and Optimization Manager
 * 
 * Implements intelligent caching of AI responses with context-awareness,
 * validation against knowledge base, and performance optimization
 */

class AIResponseCache {
  constructor() {
    this.responseCache = new Map();
    this.maxCacheSize = process.env.AI_CACHE_MAX_SIZE ? parseInt(process.env.AI_CACHE_MAX_SIZE) : 2000;
    this.defaultTTL = process.env.AI_CACHE_TTL ? parseInt(process.env.AI_CACHE_TTL) : 900000; // 15 minutes
    this.contextThreshold = 0.8; // Minimum similarity for context matching
  }

  /**
   * Generate cache key based on input, context, and provider
   */
  generateCacheKey(input, context = null, provider = 'default') {
    const inputHash = this.simpleHash(JSON.stringify(input));
    const contextHash = context ? this.simpleHash(JSON.stringify(context)) : 'none';
    return `${provider}_${inputHash}_${contextHash}`;
  }

  /**
   * Simple hash function for cache keys
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get cached AI response
   */
  getCachedResponse(input, context = null, provider = 'default') {
    const cacheKey = this.generateCacheKey(input, context, provider);
    const cached = this.responseCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      console.log(`✅ AI response cache HIT for key: ${cacheKey.substring(0, 10)}...`);
      return cached.response;
    }

    return null;
  }

  /**
   * Set cached AI response
   */
  setCachedResponse(input, context = null, response, provider = 'default', ttl = null) {
    if (!ttl) ttl = this.defaultTTL;

    // Maintain cache size limits
    if (this.responseCache.size >= this.maxCacheSize) {
      // Remove oldest entries
      const firstKey = this.responseCache.keys().next().value;
      this.responseCache.delete(firstKey);
    }

    const cacheKey = this.generateCacheKey(input, context, provider);
    this.responseCache.set(cacheKey, {
      response: response,
      timestamp: Date.now(),
      ttl: ttl,
      input: input, // Store for potential validation
      context: context
    });

    console.log(`💾 AI response cached for key: ${cacheKey.substring(0, 10)}...`);
  }

  /**
   * Validate response against knowledge base
   */
  validateResponseAgainstKnowledge(response, knowledgeDocs) {
    if (!knowledgeDocs || knowledgeDocs.length === 0) {
      return { isValid: true, confidence: 0.5, validatedResponse: response };
    }

    // Extract key entities and facts from response
    const responseEntities = this.extractEntities(response);
    const knowledgeEntities = this.extractEntitiesFromKnowledge(knowledgeDocs);

    // Calculate validation score
    let validationScore = 0;
    let totalEntities = 0;

    for (const responseEntity of responseEntities) {
      totalEntities++;
      for (const knowledgeEntity of knowledgeEntities) {
        if (this.calculateEntitySimilarity(responseEntity, knowledgeEntity) > 0.8) {
          validationScore++;
          break;
        }
      }
    }

    const confidence = totalEntities > 0 ? validationScore / totalEntities : 0;
    const isValid = confidence >= 0.5; // Threshold for validation

    // If confidence is low, mark response as potentially unreliable
    const validatedResponse = isValid ? response : 
      `${response}\n\n⚠️ Lưu ý: Thông tin này cần được xác minh thêm từ nguồn chính thức.`;

    return {
      isValid,
      confidence,
      validatedResponse,
      citations: this.generateCitations(response, knowledgeDocs)
    };
  }

  /**
   * Extract entities from response text
   */
  extractEntities(text) {
    // Simple entity extraction - can be enhanced with NLP
    const entities = [];
    
    // Extract procedure codes (e.g., "Mã thủ tục: ABC-123")
    const codeMatches = text.match(/Mã thủ tục:\s*([A-Z0-9\-]+)/gi);
    if (codeMatches) {
      entities.push(...codeMatches.map(match => match.replace('Mã thủ tục:', '').trim()));
    }

    // Extract time-related information
    const timeMatches = text.match(/\d+\s*(ngày|giờ|tháng|năm|phút)/gi);
    if (timeMatches) {
      entities.push(...timeMatches);
    }

    // Extract fee-related information
    const feeMatches = text.match(/\d{1,3}(?:\.\d{3})*(?:\s*VNĐ|\s*đồng|\s*vnd)/gi);
    if (feeMatches) {
      entities.push(...feeMatches);
    }

    // Extract ministry/agency names
    const agencyMatches = text.match(/Bộ|Sở|Phòng|Cục|Ủy ban/gi);
    if (agencyMatches) {
      entities.push(...agencyMatches);
    }

    return [...new Set(entities)]; // Remove duplicates
  }

  /**
   * Extract entities from knowledge documents
   */
  extractEntitiesFromKnowledge(knowledgeDocs) {
    const entities = [];
    
    for (const doc of knowledgeDocs) {
      if (doc.full_content) {
        // Extract procedure code
        if (doc.procedure_code) {
          entities.push(doc.procedure_code);
        }
        
        // Extract procedure name
        if (doc.procedure_title) {
          entities.push(doc.procedure_title);
        }

        // Extract from content
        entities.push(...this.extractEntities(doc.full_content));
      }
    }

    return [...new Set(entities)]; // Remove duplicates
  }

  /**
   * Calculate similarity between two entities
   */
  calculateEntitySimilarity(entity1, entity2) {
    const str1 = entity1.toLowerCase().trim();
    const str2 = entity2.toLowerCase().trim();

    // Exact match
    if (str1 === str2) return 1.0;

    // Calculate similarity using a simple algorithm
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    // Calculate Levenshtein distance
    const distance = this.levenshteinDistance(longer, shorter);
    const similarity = (longer.length - distance) / longer.length;

    return similarity;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];

    if (str1.length === 0) return str2.length;
    if (str2.length === 0) return str1.length;

    // Initialize matrix
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Generate citations for the response
   */
  generateCitations(response, knowledgeDocs) {
    const citations = [];
    
    for (const doc of knowledgeDocs) {
      // Look for matching content in the response
      if (doc.procedure_code && response.toLowerCase().includes(doc.procedure_code.toLowerCase())) {
        citations.push({
          type: 'procedure',
          code: doc.procedure_code,
          title: doc.procedure_title,
          source: doc.ministry_name,
          url: doc.source_url
        });
      }
    }

    return citations;
  }

  /**
   * Clear cache (optionally for specific provider or all)
   */
  clearCache(provider = null) {
    if (provider) {
      // Clear cache entries for specific provider
      for (const [key, value] of this.responseCache) {
        if (key.startsWith(provider + '_')) {
          this.responseCache.delete(key);
        }
      }
    } else {
      this.responseCache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.responseCache.size,
      maxSize: this.maxCacheSize,
      utilization: (this.responseCache.size / this.maxCacheSize * 100).toFixed(2) + '%',
      hits: 0, // Would need to track hits separately
      miss: 0  // Would need to track misses separately
    };
  }
}

// Create singleton instance
const aiResponseCache = new AIResponseCache();
module.exports = aiResponseCache;