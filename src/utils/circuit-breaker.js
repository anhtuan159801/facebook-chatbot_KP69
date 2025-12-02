/**
 * Circuit Breaker Pattern Implementation
 * 
 * Provides fault tolerance and prevents cascading failures by monitoring
 * service health and temporarily stopping requests to failing services.
 */

class CircuitBreaker {
    constructor(options = {}) {
        this.threshold = options.threshold || 5; // Number of failures before opening
        this.timeout = options.timeout || 60000; // Time to wait before trying again (ms)
        this.resetTimeout = options.resetTimeout || 30000; // Time to wait before half-open (ms)
        this.monitoringPeriod = options.monitoringPeriod || 10000; // Health check interval (ms)
        
        this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
        this.failureCount = 0;
        this.lastFailureTime = null;
        this.successCount = 0;
        this.requestCount = 0;
        
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            circuitOpened: 0,
            circuitClosed: 0
        };
        
        // Start monitoring
        this.startMonitoring();
    }
    
    async execute(operation, fallback = null) {
        this.requestCount++;
        this.stats.totalRequests++;
        
        if (this.state === 'OPEN') {
            if (this.shouldAttemptReset()) {
                this.state = 'HALF_OPEN';
                console.log('🔄 Circuit breaker: Moving to HALF_OPEN state');
            } else {
                console.log('🚫 Circuit breaker: OPEN - Request blocked');
                if (fallback) {
                    return await fallback();
                }
                throw new Error('Circuit breaker is OPEN');
            }
        }
        
        try {
            const result = await operation();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }
    
    onSuccess() {
        this.failureCount = 0;
        this.successCount++;
        this.stats.successfulRequests++;
        
        if (this.state === 'HALF_OPEN') {
            this.state = 'CLOSED';
            this.stats.circuitClosed++;
            console.log('✅ Circuit breaker: Moving to CLOSED state');
        }
    }
    
    onFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        this.stats.failedRequests++;
        
        if (this.failureCount >= this.threshold) {
            this.state = 'OPEN';
            this.stats.circuitOpened++;
            console.log('🚨 Circuit breaker: Moving to OPEN state');
        }
    }
    
    shouldAttemptReset() {
        if (!this.lastFailureTime) return true;
        return Date.now() - this.lastFailureTime >= this.resetTimeout;
    }
    
    startMonitoring() {
        setInterval(() => {
            this.logStats();
        }, this.monitoringPeriod);
    }
    
    logStats() {
        console.log(`📊 Circuit Breaker Stats:`, {
            state: this.state,
            failureCount: this.failureCount,
            successCount: this.successCount,
            requestCount: this.requestCount,
            stats: this.stats
        });
    }
    
    getState() {
        return {
            state: this.state,
            failureCount: this.failureCount,
            successCount: this.successCount,
            requestCount: this.requestCount,
            lastFailureTime: this.lastFailureTime,
            stats: this.stats
        };
    }
    
    reset() {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
        this.requestCount = 0;
        this.lastFailureTime = null;
        console.log('🔄 Circuit breaker: Manually reset to CLOSED state');
    }
}

// Service-specific circuit breakers
class ServiceCircuitBreaker {
    constructor() {
        this.breakers = new Map();
    }
    
    getBreaker(serviceName, options = {}) {
        if (!this.breakers.has(serviceName)) {
            this.breakers.set(serviceName, new CircuitBreaker(options));
        }
        return this.breakers.get(serviceName);
    }
    
    getStats() {
        const stats = {};
        for (const [serviceName, breaker] of this.breakers) {
            stats[serviceName] = breaker.getState();
        }
        return stats;
    }
    
    resetAll() {
        for (const breaker of this.breakers.values()) {
            breaker.reset();
        }
    }
}

module.exports = {
    CircuitBreaker,
    ServiceCircuitBreaker
};
