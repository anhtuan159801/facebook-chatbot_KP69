/**
 * Enhanced Error Handling and Logging System
 *
 * Provides comprehensive error handling, structured logging,
 * and monitoring capabilities for the chatbot system
 */

const { EnhancedLogging, createLogger: createNewLogger } = require('./enhanced-logging');

class EnhancedLogger {
  constructor(serviceName = 'Unknown', options = {}) {
    // Use the new enhanced logging system
    this.newLogger = createNewLogger(serviceName);
    this.serviceName = serviceName;

    // Keep backward compatibility with old methods
    this.logLevel = process.env.LOG_LEVEL || 'INFO';
    this.enableDetailedLogs = process.env.ENABLE_DETAILED_LOGS === 'true';
    this.logToFile = process.env.LOG_TO_FILE === 'true';

    // Track error statistics (keeping old functionality)
    this.errorStats = {
      totalErrors: 0,
      errorTypes: {},
      lastErrors: []
    };
  }

  shouldLog(level) {
    // Map old log levels to new system
    const levelMap = {
      'ERROR': 0,
      'WARN': 1,
      'INFO': 2,
      'DEBUG': 3
    };

    const currentLevelMap = {
      'ERROR': 0,
      'WARN': 1,
      'INFO': 2,
      'DEBUG': 3
    };

    const requestedLevel = levelMap[level] || 2;
    const currentLevel = currentLevelMap[this.logLevel] || 2;

    return requestedLevel <= currentLevel;
  }

  error(message, data = null) {
    this.newLogger.error(message, data);
    this.trackError(message, data);
  }

  warn(message, data = null) {
    this.newLogger.warn(message, data);
  }

  info(message, data = null) {
    this.newLogger.info(message, data);
  }

  debug(message, data = null) {
    this.newLogger.debug(message, data);
  }

  // Error tracking and statistics (maintaining old functionality)
  trackError(message, data = null) {
    this.errorStats.totalErrors++;

    // Track error type
    const errorType = data && data.name ? data.name : 'UnknownError';
    this.errorStats.errorTypes[errorType] = (this.errorStats.errorTypes[errorType] || 0) + 1;

    // Keep last 100 errors
    this.errorStats.lastErrors.push({
      timestamp: new Date(),
      message,
      data,
      service: this.serviceName
    });

    if (this.errorStats.lastErrors.length > 100) {
      this.errorStats.lastErrors.shift();
    }
  }

  // Get error statistics
  getErrorStats() {
    return {
      ...this.errorStats,
      errorRate: this.calculateErrorRate()
    };
  }

  calculateErrorRate() {
    // Calculate error rate over the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentErrors = this.errorStats.lastErrors.filter(
      error => error.timestamp > oneHourAgo
    );

    return {
      errorsPerHour: recentErrors.length,
      hourlyRate: recentErrors.length > 0 ?
        (recentErrors.length / 60).toFixed(2) : '0.00'
    };
  }
}

class ErrorHandler {
  constructor(logger) {
    this.logger = logger;
  }

  static handle(error, context = {}, logger = null) {
    const errorInfo = {
      message: error.message,
      name: error.name,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      context: context
    };

    // Classify error type
    const errorType = ErrorHandler.classifyError(error);
    
    // Log appropriately based on error type
    if (logger) {
      switch (errorType) {
        case 'BUSINESS_LOGIC':
          logger.warn('Business logic error occurred', errorInfo);
          break;
        case 'EXTERNAL_SERVICE':
          logger.error('External service error occurred', errorInfo);
          break;
        case 'SYSTEM':
          logger.error('System error occurred', errorInfo);
          break;
        case 'VALIDATION':
          logger.warn('Validation error occurred', errorInfo);
          break;
        default:
          logger.error('Unknown error occurred', errorInfo);
      }
    } else {
      console.error('Error occurred:', errorInfo);
    }
    
    // Return appropriate user message
    return ErrorHandler.formatUserMessage(errorType, error);
  }

  static classifyError(error) {
    if (error.message.includes('API') || 
        error.message.includes('fetch') || 
        error.message.includes('network')) {
      return 'EXTERNAL_SERVICE';
    }
    
    if (error.message.includes('database') || 
        error.message.includes('pool') || 
        error.message.includes('SQL')) {
      return 'SYSTEM';
    }
    
    if (error.message.includes('validation') || 
        error.message.includes('invalid') ||
        error.message.includes('format')) {
      return 'VALIDATION';
    }
    
    // Check if it's a business logic error
    const businessKeywords = ['quota', 'limit', 'exceeded', 'unauthorized', 'forbidden'];
    for (const keyword of businessKeywords) {
      if (error.message.toLowerCase().includes(keyword)) {
        return 'BUSINESS_LOGIC';
      }
    }
    
    return 'SYSTEM'; // Default classification
  }

  static formatUserMessage(errorType, error) {
    let userMessage = "Xin lỗi, hiện tôi đang gặp sự cố kỹ thuật. ";

    switch (errorType) {
      case 'BUSINESS_LOGIC':
        userMessage += "Vui lòng thử lại sau hoặc kiểm tra lại thông tin bạn cung cấp. ";
        break;
      case 'EXTERNAL_SERVICE':
        userMessage += "Hệ thống bên ngoài đang tạm thời không khả dụng, vui lòng thử lại sau. ";
        break;
      case 'VALIDATION':
        userMessage += "Vui lòng kiểm tra lại định dạng thông tin bạn đã gửi. ";
        break;
      case 'SYSTEM':
      default:
        userMessage += "Bạn có thể thử lại sau ít phút hoặc liên hệ hỗ trợ nếu vấn đề tiếp diễn. ";
    }

    userMessage += "Cảm ơn bạn đã kiên nhẫn! 🙏";
    
    return userMessage;
  }

  /**
   * Execute function with error handling and retry logic
   */
  async executeWithRetry(func, options = {}) {
    const maxRetries = options.maxRetries || 3;
    const retryDelay = options.retryDelay || 1000;
    const backoff = options.backoff || 'exponential'; // 'linear' or 'exponential'

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await func();
      } catch (error) {
        if (attempt === maxRetries) {
          // Log final failure
          if (this.logger) {
            this.logger.error(`Function failed after ${maxRetries} attempts`, {
              error: error.message,
              function: func.name,
              attempts: maxRetries
            });
          }
          throw error;
        }

        // Calculate delay based on backoff strategy
        let delay = retryDelay;
        if (backoff === 'exponential') {
          delay = retryDelay * Math.pow(2, attempt - 1);
        } else if (backoff === 'linear') {
          delay = retryDelay * attempt;
        }

        // Add some jitter to prevent thundering herd
        delay = delay + Math.floor(Math.random() * 1000);

        console.log(`Attempt ${attempt} failed, retrying in ${delay}ms:`, error.message);

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}

// Create logger factory function
const createLogger = (serviceName, options = {}) => new EnhancedLogger(serviceName, options);

// Export both the logger and error handler
module.exports = {
  EnhancedLogger,
  ErrorHandler,
  createLogger
};