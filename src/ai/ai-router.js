/**
 * AI Router Module
 * 
 * Centralized module for routing AI requests to different providers
 * within the same process instead of using HTTP calls between services
 */

require('dotenv').config();
const { AIFactory, createRetryWrapper, createTimeoutWrapper } = require('./ai-models');
const aiProviderManager = require('./ai-provider-manager');

class AIRouter {
  constructor() {
    this.aiProviders = {};
    this.currentProvider = aiProviderManager.getCurrentProvider();
    
    // Initialize all AI providers
    this.initializeProviders();
    
    // Set up provider switching mechanism
    this.setupProviderMonitoring();
  }

  initializeProviders() {
    try {
      // Initialize Gemini AI
      if (process.env.GEMINI_API_KEY) {
        this.aiProviders.gemini = AIFactory.createGeminiAI();
      }
      
      // Initialize OpenRouter AI
      if (process.env.OPENROUTER_API_KEY) {
        this.aiProviders.openrouter = AIFactory.createOpenRouterAI();
      }
      
      // Initialize HuggingFace AI
      if (process.env.HUGGINGFACE_API_KEY) {
        this.aiProviders.huggingface = AIFactory.createHuggingFaceAI();
      }
      
      console.log('✅ AI Providers initialized:', Object.keys(this.aiProviders));
    } catch (error) {
      console.error('❌ Failed to initialize AI providers:', error);
      throw error;
    }
  }

  setupProviderMonitoring() {
    // Set up periodic check for provider switch
    setInterval(() => {
      const shouldSwitch = aiProviderManager.checkForGeminiSwitch();
      if (shouldSwitch) {
        this.currentProvider = aiProviderManager.getCurrentProvider();
        console.log(`🔄 Switched to provider: ${this.currentProvider}`);
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  /**
   * Route request to appropriate AI provider
   */
  async routeAIRequest(messages, sender_psid, options = {}) {
    // Check if we should switch back to Gemini
    aiProviderManager.checkForGeminiSwitch();

    const currentProvider = aiProviderManager.getCurrentProvider();

    if (currentProvider === 'error') {
      console.log('❌ All AI providers failed');
      return "Xin lỗi, hiện tại hệ thống đang gặp sự cố. Vui lòng thử lại sau.";
    }

    console.log(`🤖 Using AI Provider: ${currentProvider}`);

    try {
      let aiInstance;

      // Get AI instance based on current provider
      switch (currentProvider) {
        case 'gemini':
          aiInstance = this.aiProviders.gemini;
          break;
        case 'openrouter':
          aiInstance = this.aiProviders.openrouter;
          break;
        case 'huggingface':
          aiInstance = this.aiProviders.huggingface;
          break;
        default:
          throw new Error(`Unsupported AI provider: ${currentProvider}`);
      }

      if (!aiInstance) {
        throw new Error(`AI provider ${currentProvider} not initialized`);
      }

      // Call AI with retry and timeout wrappers
      const result = await createTimeoutWrapper(
        createRetryWrapper(aiInstance.generateText.bind(aiInstance), 2, 1000),
        30000
      )(messages, sender_psid);

      // Handle success
      aiProviderManager.handleProviderSuccess(currentProvider);
      console.log(`✅ ${currentProvider} request successful`);
      return result;

    } catch (error) {
      console.log(`❌ ${currentProvider} failed:`, error.message);

      // Handle provider error
      aiProviderManager.handleProviderError(currentProvider, error);

      // Get new provider after switch
      const newProvider = aiProviderManager.getCurrentProvider();

      if (newProvider === 'error') {
        console.log('❌ All AI providers failed, using error message');
        return "Xin lỗi, hiện tại hệ thống đang gặp sự cố. Vui lòng thử lại sau.";
      }

      // Retry with new provider
      console.log(`🔄 Retrying with new provider: ${newProvider}`);
      return await this.routeAIRequest(messages, sender_psid, options);
    }
  }

  /**
   * Route request with intelligent caching to optimize costs and performance
   */
  async routeAIRequestWithCaching(messages, sender_psid, options = {}) {
    // Create a cache key based on the messages content
    const cacheKey = this.generateRequestCacheKey(messages, sender_psid);

    // First, try to get from cache
    const cachedResult = await this.getCachedResult(cacheKey);
    if (cachedResult) {
      console.log(`✅ Using cached result for key: ${cacheKey}`);
      return cachedResult;
    }

    // If not in cache, process with the normal routing
    const result = await this.routeAIRequest(messages, sender_psid, options);

    // Cache the result for future use (only for common queries)
    const userMessage = this.extractUserMessage(messages);
    if (this.isCommonQuery(userMessage)) {
      await this.setCachedResult(cacheKey, result);
    }

    return result;
  }

  /**
   * Generate cache key for AI requests
   */
  generateRequestCacheKey(messages, sender_psid) {
    const userMessage = this.extractUserMessage(messages);
    const messageHash = this.simpleHash(userMessage.substring(0, 100));
    return `ai_request_${messageHash}_${sender_psid}`;
  }

  /**
   * Extract user message from messages array
   */
  extractUserMessage(messages) {
    // Find the last user message in the conversation
    const userMessages = messages.filter(msg => msg.role === 'user');
    if (userMessages.length > 0) {
      const lastUserMessage = userMessages[userMessages.length - 1];
      return typeof lastUserMessage.content === 'string' ?
        lastUserMessage.content :
        JSON.stringify(lastUserMessage.content);
    }
    return 'empty_message';
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
   * Check if query is common enough to be cached
   */
  isCommonQuery(message) {
    // Define common query patterns to cache
    const commonPatterns = [
      /xin\s+chào|chào\s+mừng|hello/i,
      /giúp\s+tôi|giúp\s+đỡ|hỗ\s+trợ/i,
      /thủ\s+tục|giấy\s+tờ|hồ\s+sơ/i,
      /vneid|vssid|etax/i,
      /cảm\s+ơn|thank|thanks/i
    ];

    const msg = message.toLowerCase();
    return commonPatterns.some(pattern => pattern.test(msg));
  }

  /**
   * Get cached result
   */
  async getCachedResult(key) {
    // Use a simple in-memory cache for now - would use Redis in production
    if (!this.requestCache) {
      this.requestCache = new Map();
      this.cacheTimestamp = new Map();
    }

    if (this.requestCache.has(key)) {
      const timestamp = this.cacheTimestamp.get(key);
      const cacheDuration = 30 * 60 * 1000; // 30 minutes

      if (Date.now() - timestamp < cacheDuration) {
        return this.requestCache.get(key);
      } else {
        // Remove expired cache entry
        this.requestCache.delete(key);
        this.cacheTimestamp.delete(key);
      }
    }

    return null;
  }

  /**
   * Set cached result
   */
  async setCachedResult(key, result) {
    if (!this.requestCache) {
      this.requestCache = new Map();
      this.cacheTimestamp = new Map();
    }

    // Limit cache size to prevent memory issues
    if (this.requestCache.size > 500) { // Max 500 cached items
      const firstKey = this.requestCache.keys().next().value;
      if (firstKey) {
        this.requestCache.delete(firstKey);
        this.cacheTimestamp.delete(firstKey);
      }
    }

    this.requestCache.set(key, result);
    this.cacheTimestamp.set(key, Date.now());
  }

  /**
   * Handle audio transcription with appropriate provider
   */
  async transcribeAudio(audioBuffer, mimeType) {
    try {
      console.log('🎵 Audio received, processing...');

      // Try HuggingFace first if available
      if (this.aiProviders.huggingface) {
        try {
          const transcript = await this.aiProviders.huggingface.transcribeAudio(audioBuffer, mimeType);
          console.log('✅ HuggingFace transcription successful');
          return transcript;
        } catch (hfError) {
          console.log('⚠️ HuggingFace failed:', hfError.message);
        }
      }

      // Fallback to OpenRouter
      if (this.aiProviders.openrouter) {
        try {
          const transcript = await this.aiProviders.openrouter.transcribeAudio(audioBuffer, mimeType);
          console.log('✅ OpenRouter transcription successful');
          return transcript;
        } catch (orError) {
          console.log('⚠️ OpenRouter failed:', orError.message);
        }
      }

      // If all providers fail, return fallback message
      console.log('⚠️ All transcription providers failed');
      return "Cảm ơn bạn đã gửi tin nhắn âm thanh! Hiện tại tôi chưa thể xử lý file âm thanh. Vui lòng gửi tin nhắn văn bản để tôi có thể hỗ trợ bạn tốt hơn.";

    } catch (error) {
      console.log('⚠️ All audio transcription methods failed:', error.message);
      return "Cảm ơn bạn đã gửi tin nhắn âm thanh! Hiện tại tôi chưa thể xử lý file âm thanh. Vui lòng gửi tin nhắn văn bản để tôi có thể hỗ trợ bạn tốt hơn.";
    }
  }

  /**
   * Get status of all providers
   */
  getProviderStatus() {
    const status = aiProviderManager.getProviderStatus();
    return {
      ...status,
      availableProviders: Object.keys(this.aiProviders),
      timestamp: new Date().toISOString()
    };
  }
}

// Create and export singleton instance
const aiRouter = new AIRouter();
module.exports = aiRouter;