#!/usr/bin/env node

/**
 * Keep-Alive Service for Render.com
 * 
 * This service ensures your application stays alive on Render by:
 * 1. Making periodic HTTP requests to your app's health endpoint
 * 2. Monitoring system health and restarting if needed
 * 3. Providing detailed logging for debugging
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

// Configuration
const CONFIG = {
    // Your Render app URL (replace with your actual URL)
    APP_URL: process.env.APP_URL || 'https://your-app-name.onrender.com',
    
    // Health check endpoint
    HEALTH_ENDPOINT: '/health',
    
    // Keep-alive interval (in milliseconds)
    PING_INTERVAL: 5 * 60 * 1000, // 5 minutes
    
    // Timeout for health checks (in milliseconds)
    HEALTH_TIMEOUT: 30 * 1000, // 30 seconds
    
    // Retry configuration
    MAX_RETRIES: 3,
    RETRY_DELAY: 10 * 1000, // 10 seconds
    
    // Logging
    LOG_LEVEL: process.env.LOG_LEVEL || 'INFO',
    ENABLE_DETAILED_LOGS: process.env.ENABLE_DETAILED_LOGS === 'true'
};

class KeepAliveService {
    constructor() {
        this.isRunning = false;
        this.retryCount = 0;
        this.lastSuccessfulPing = null;
        this.startTime = new Date();
        this.pingCount = 0;
        this.errorCount = 0;
    }

    log(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level}] ${message}`;
        
        if (data && CONFIG.ENABLE_DETAILED_LOGS) {
            console.log(logMessage, data);
        } else {
            console.log(logMessage);
        }
    }

    info(message, data = null) {
        this.log('INFO', message, data);
    }

    warn(message, data = null) {
        this.log('WARN', message, data);
    }

    error(message, data = null) {
        this.log('ERROR', message, data);
    }

    async makeHealthCheck() {
        return new Promise((resolve, reject) => {
            const url = new URL(CONFIG.HEALTH_ENDPOINT, CONFIG.APP_URL);
            const isHttps = url.protocol === 'https:';
            const httpModule = isHttps ? https : http;
            
            const options = {
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: url.pathname + url.search,
                method: 'GET',
                timeout: CONFIG.HEALTH_TIMEOUT,
                headers: {
                    'User-Agent': 'Keep-Alive-Service/1.0',
                    'Accept': 'application/json'
                }
            };

            const req = httpModule.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            const response = JSON.parse(data);
                            resolve({
                                status: 'success',
                                statusCode: res.statusCode,
                                response: response,
                                timestamp: new Date()
                            });
                        } catch (e) {
                            resolve({
                                status: 'success',
                                statusCode: res.statusCode,
                                response: data,
                                timestamp: new Date()
                            });
                        }
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    }
                });
            });

            req.on('error', (err) => {
                reject(err);
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            req.setTimeout(CONFIG.HEALTH_TIMEOUT);
            req.end();
        });
    }

    async pingWithRetry() {
        for (let attempt = 1; attempt <= CONFIG.MAX_RETRIES; attempt++) {
            try {
                this.info(`Ping attempt ${attempt}/${CONFIG.MAX_RETRIES} to ${CONFIG.APP_URL}${CONFIG.HEALTH_ENDPOINT}`);
                
                const result = await this.makeHealthCheck();
                
                this.pingCount++;
                this.lastSuccessfulPing = new Date();
                this.retryCount = 0;
                
                this.info(`✅ Ping successful (${result.statusCode})`, {
                    attempt,
                    response: result.response,
                    uptime: this.getUptime()
                });
                
                return result;
                
            } catch (error) {
                this.error(`❌ Ping failed (attempt ${attempt}/${CONFIG.MAX_RETRIES})`, {
                    error: error.message,
                    attempt
                });
                
                if (attempt < CONFIG.MAX_RETRIES) {
                    this.info(`Retrying in ${CONFIG.RETRY_DELAY / 1000} seconds...`);
                    await this.sleep(CONFIG.RETRY_DELAY);
                } else {
                    this.errorCount++;
                    this.warn(`All ping attempts failed. Error count: ${this.errorCount}`);
                    throw error;
                }
            }
        }
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getUptime() {
        const now = new Date();
        const diff = now - this.startTime;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        return `${hours}h ${minutes}m ${seconds}s`;
    }

    getStats() {
        return {
            isRunning: this.isRunning,
            startTime: this.startTime,
            uptime: this.getUptime(),
            pingCount: this.pingCount,
            errorCount: this.errorCount,
            lastSuccessfulPing: this.lastSuccessfulPing,
            retryCount: this.retryCount
        };
    }

    async start() {
        if (this.isRunning) {
            this.warn('Keep-alive service is already running');
            return;
        }

        this.isRunning = true;
        this.info('🚀 Starting Keep-Alive Service for Render.com');
        this.info(`Target URL: ${CONFIG.APP_URL}${CONFIG.HEALTH_ENDPOINT}`);
        this.info(`Ping interval: ${CONFIG.PING_INTERVAL / 1000} seconds`);
        this.info(`Health timeout: ${CONFIG.HEALTH_TIMEOUT / 1000} seconds`);
        this.info(`Max retries: ${CONFIG.MAX_RETRIES}`);

        // Initial ping
        try {
            await this.pingWithRetry();
        } catch (error) {
            this.error('Initial ping failed, but continuing with scheduled pings', error);
        }

        // Schedule regular pings
        this.schedulePings();
    }

    schedulePings() {
        if (!this.isRunning) return;

        setTimeout(async () => {
            if (!this.isRunning) return;

            try {
                await this.pingWithRetry();
            } catch (error) {
                this.error('Scheduled ping failed', error);
            }

            // Schedule next ping
            this.schedulePings();
        }, CONFIG.PING_INTERVAL);
    }

    stop() {
        this.info('🛑 Stopping Keep-Alive Service');
        this.isRunning = false;
    }

    // Graceful shutdown
    setupGracefulShutdown() {
        const shutdown = () => {
            this.info('📊 Final Stats:', this.getStats());
            this.stop();
            process.exit(0);
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);
        process.on('SIGUSR2', shutdown); // For nodemon
    }
}

// Main execution
async function main() {
    const keepAlive = new KeepAliveService();
    
    // Setup graceful shutdown
    keepAlive.setupGracefulShutdown();
    
    // Start the service
    await keepAlive.start();
    
    // Log stats every hour
    setInterval(() => {
        if (keepAlive.isRunning) {
            keepAlive.info('📊 Hourly Stats:', keepAlive.getStats());
        }
    }, 60 * 60 * 1000);
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Start the service
if (require.main === module) {
    main().catch(error => {
        console.error('💥 Failed to start Keep-Alive Service:', error);
        process.exit(1);
    });
}

module.exports = KeepAliveService;
