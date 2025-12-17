/**
 * Enhanced Logging System
 * 
 * Provides improved logging with request tracing, performance metrics, and centralized logging
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

class EnhancedLogging {
  constructor(serviceName = 'UnknownService') {
    this.serviceName = serviceName;
    this.requestIdCounter = 0;
    
    // Set up log file if specified
    this.logFilePath = process.env.LOG_FILE_PATH || null;
    this.logLevel = process.env.LOG_LEVEL || 'info';
    
    // Create logs directory if it doesn't exist
    if (this.logFilePath) {
      const logDir = path.dirname(this.logFilePath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    }
    
    // Log levels mapping
    this.levelMap = {
      'error': 0,
      'warn': 1, 
      'info': 2,
      'debug': 3
    };
    
    this.currentLogLevel = this.levelMap[this.logLevel] || 2;
  }

  /**
   * Generate a unique request ID
   */
  generateRequestId() {
    return `${Date.now()}-${this.serviceName}-${++this.requestIdCounter}`;
  }

  /**
   * Check if log level should be output
   */
  shouldLog(level) {
    return this.levelMap[level] <= this.currentLogLevel;
  }

  /**
   * Format log message with metadata
   */
  formatLog(level, message, metadata = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      service: this.serviceName,
      message,
      ...metadata
    };

    // Add to structured log file if configured
    if (this.logFilePath && this.shouldLog(level)) {
      try {
        fs.appendFileSync(this.logFilePath, JSON.stringify(logEntry) + '\n');
      } catch (error) {
        console.error('Failed to write to log file:', error);
      }
    }

    return logEntry;
  }

  /**
   * Log with request tracing
   */
  log(level, message, metadata = {}) {
    if (!this.shouldLog(level)) return;

    const logEntry = this.formatLog(level, message, metadata);
    const formattedMessage = `[${logEntry.timestamp}] ${level.toUpperCase()} ${this.serviceName} - ${message}`;
    
    // Add metadata if present
    if (Object.keys(logEntry).length > 4) { // More than timestamp, level, service, message
      const extraData = { ...logEntry };
      delete extraData.timestamp;
      delete extraData.level; 
      delete extraData.service;
      delete extraData.message;
      console.log(formattedMessage, extraData);
    } else {
      console.log(formattedMessage);
    }
  }

  /**
   * Log error with stack trace
   */
  error(message, metadata = {}) {
    this.log('error', message, metadata);
  }

  /**
   * Log warning
   */
  warn(message, metadata = {}) {
    this.log('warn', message, metadata);
  }

  /**
   * Log info
   */
  info(message, metadata = {}) {
    this.log('info', message, metadata);
  }

  /**
   * Log debug
   */
  debug(message, metadata = {}) {
    this.log('debug', message, metadata);
  }

  /**
   * Create a sub-logger with request context
   */
  createRequestLogger(requestId, context = {}) {
    const self = this;
    return {
      error: (message, metadata = {}) => self.log('error', message, { requestId, ...context, ...metadata }),
      warn: (message, metadata = {}) => self.log('warn', message, { requestId, ...context, ...metadata }),
      info: (message, metadata = {}) => self.log('info', message, { requestId, ...context, ...metadata }),
      debug: (message, metadata = {}) => self.log('debug', message, { requestId, ...context, ...metadata })
    };
  }

  /**
   * Log performance metrics
   */
  logPerformance(operation, duration, metadata = {}) {
    this.info(`Performance: ${operation} took ${duration}ms`, {
      operation,
      duration,
      ...metadata
    });
  }

  /**
   * Log an entire request lifecycle
   */
  async logRequestLifecycle(userId, operation, handler) {
    const requestId = this.generateRequestId();
    const startTime = Date.now();
    const requestLogger = this.createRequestLogger(requestId, { userId, operation });

    requestLogger.info('Request started');

    try {
      const result = await handler(requestLogger);
      const duration = Date.now() - startTime;
      
      requestLogger.info(`Request completed in ${duration}ms`, { 
        status: 'success',
        duration 
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      requestLogger.error(`Request failed after ${duration}ms`, { 
        status: 'error',
        duration,
        error: error.message,
        stack: error.stack
      });
      
      throw error;
    }
  }
}

// Create utility function for creating loggers
function createLogger(serviceName) {
  return new EnhancedLogging(serviceName);
}

module.exports = { EnhancedLogging, createLogger };