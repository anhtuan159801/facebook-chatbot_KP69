/**
 * Centralized Logging System
 * 
 * Provides consistent logging across all services with different log levels
 * and structured output for better monitoring and debugging.
 */

class Logger {
    constructor(serviceName = 'Unknown') {
        this.serviceName = serviceName;
        this.logLevel = process.env.LOG_LEVEL || 'INFO';
        this.enableDetailedLogs = process.env.ENABLE_DETAILED_LOGS === 'true';
        
        // Log levels hierarchy
        this.levels = {
            ERROR: 0,
            WARN: 1,
            INFO: 2,
            DEBUG: 3
        };
    }
    
    shouldLog(level) {
        return this.levels[level] <= this.levels[this.logLevel];
    }
    
    formatMessage(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const serviceTag = `[${this.serviceName}]`;
        const levelTag = `[${level}]`;
        
        let logMessage = `${timestamp} ${serviceTag} ${levelTag} ${message}`;
        
        if (data && this.enableDetailedLogs) {
            logMessage += `\n${JSON.stringify(data, null, 2)}`;
        }
        
        return logMessage;
    }
    
    log(level, message, data = null) {
        if (!this.shouldLog(level)) return;
        
        const formattedMessage = this.formatMessage(level, message, data);
        
        switch (level) {
            case 'ERROR':
                console.error(formattedMessage);
                break;
            case 'WARN':
                console.warn(formattedMessage);
                break;
            case 'DEBUG':
                console.debug(formattedMessage);
                break;
            default:
                console.log(formattedMessage);
        }
    }
    
    error(message, data = null) {
        this.log('ERROR', message, data);
    }
    
    warn(message, data = null) {
        this.log('WARN', message, data);
    }
    
    info(message, data = null) {
        this.log('INFO', message, data);
    }
    
    debug(message, data = null) {
        this.log('DEBUG', message, data);
    }
    
    // Service-specific logging methods
    logRequest(sender_psid, messageType, data = null) {
        this.info(`Request from ${sender_psid} (${messageType})`, data);
    }
    
    logResponse(sender_psid, success, data = null) {
        const status = success ? 'SUCCESS' : 'FAILED';
        this.info(`Response to ${sender_psid}: ${status}`, data);
    }
    
    logAIUsage(provider, tokens, duration) {
        this.info(`AI Usage - Provider: ${provider}, Tokens: ${tokens}, Duration: ${duration}ms`);
    }
    
    logQueueStatus(active, waiting, maxConcurrent) {
        this.info(`Queue Status - Active: ${active}/${maxConcurrent}, Waiting: ${waiting}`);
    }
    
    logHealthCheck(status, responseTime) {
        this.info(`Health Check - Status: ${status}, Response Time: ${responseTime}ms`);
    }
    
    logError(error, context = null) {
        this.error(`Error occurred${context ? ` in ${context}` : ''}`, {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
    }
    
    // Performance monitoring
    startTimer(label) {
        const startTime = Date.now();
        return {
            end: () => {
                const duration = Date.now() - startTime;
                this.debug(`Timer ${label}: ${duration}ms`);
                return duration;
            }
        };
    }
    
    // Memory monitoring
    logMemoryUsage() {
        const usage = process.memoryUsage();
        this.debug('Memory Usage', {
            rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
            heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
            external: `${Math.round(usage.external / 1024 / 1024)}MB`
        });
    }
}

// Create logger instances for different services
const createLogger = (serviceName) => new Logger(serviceName);

module.exports = {
    Logger,
    createLogger
};
