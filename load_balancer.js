require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const { createLogger } = require('./logger');
const { ServiceCircuitBreaker } = require('./circuit-breaker');
const app = express();
const port = process.env.PORT || 3000;

// Initialize logging and circuit breaker
const logger = createLogger('LoadBalancer');
const circuitBreaker = new ServiceCircuitBreaker();

// Note: Không import trực tiếp các module chatbot vì chúng chạy trên port khác nhau
// Load Balancer sẽ route requests thông qua HTTP calls

app.use(express.json());

// ==== CẤU HÌNH LOAD BALANCER ====
const LOAD_BALANCER_CONFIG = {
    PRIMARY_SYSTEM: 'gemini',      // Hệ thống chính
    BACKUP_SYSTEM: 'router_hug',   // Hệ thống backup
    RECOVERY_TIME: 12 * 60 * 60 * 1000, // 12 giờ = 43,200,000ms
    HEALTH_CHECK_INTERVAL: 5 * 60 * 1000,   // 5 phút (chỉ khi cần)
    MAX_RETRY_ATTEMPTS: 3,              // Số lần thử lại tối đa
    RETRY_DELAY: 5000                   // 5 giây delay giữa các lần thử
};

// ==== TRẠNG THÁI HỆ THỐNG ====
const systemStatus = {
    currentSystem: LOAD_BALANCER_CONFIG.PRIMARY_SYSTEM,
    gemini: {
        status: 'unknown',           // 'healthy', 'unhealthy', 'unknown'
        lastCheck: null,
        lastError: null,
        consecutiveFailures: 0,
        nextRecoveryTime: null,
        isRecovering: false
    },
    router_hug: {
        status: 'unknown',
        lastCheck: null,
        lastError: null,
        consecutiveFailures: 0,
        nextRecoveryTime: null,
        isRecovering: false
    },
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    lastSwitchTime: null,
    maintenanceMode: false
};

// ==== DATABASE CONNECTION ====
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
        rejectUnauthorized: false
    }
});

// ==== HEALTH CHECK SYSTEM ====
class HealthChecker {
    constructor() {
        this.isRunning = false;
        this.intervalId = null;
    }

    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        console.log('🏥 Health Checker started (Lazy Mode - only when needed)');
        
        // KHÔNG chạy health check định kỳ
        // Chỉ check khi có request thực tế hoặc khi cần thiết
        console.log('🏥 Health Checker in ON-DEMAND mode - no periodic checks');
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
        console.log('🏥 Health Checker stopped');
    }

    async performHealthCheck() {
        console.log('🔍 Performing health check...');
        
        // Kiểm tra Gemini
        await this.checkSystemHealth('gemini');
        
        // Kiểm tra Router Hug
        await this.checkSystemHealth('router_hug');
        
        // Cập nhật trạng thái hệ thống
        this.updateSystemStatus();
        
        console.log(`📊 System Status: ${systemStatus.currentSystem} | Gemini: ${systemStatus.gemini.status} | Router: ${systemStatus.router_hug.status}`);
    }

    async checkSystemHealth(systemName) {
        const maxRetries = 3;
        const retryDelay = 1000;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const startTime = Date.now();
                
                // Gọi health check endpoint của từng hệ thống
                let isHealthy = false;
                const targetPort = systemName === 'gemini' ? 3001 : 3002;
                
                try {
                    const fetch = await import('node-fetch');
                    const response = await fetch.default(`http://localhost:${targetPort}/health`, {
                        method: 'GET',
                        timeout: 10000, // Tăng timeout lên 10 giây
                        headers: {
                            'User-Agent': 'LoadBalancer/1.0',
                            'Connection': 'keep-alive'
                        }
                    });
                    isHealthy = response.ok;
                } catch (fetchError) {
                    if (attempt < maxRetries) {
                        console.log(`⚠️ ${systemName} attempt ${attempt}/${maxRetries} failed: ${fetchError.message}`);
                        await new Promise(resolve => setTimeout(resolve, retryDelay));
                        continue;
                    }
                    console.log(`⚠️ ${systemName} connection failed: ${fetchError.message}`);
                    throw new Error(`Connection failed: request to http://localhost:${targetPort}/health failed, reason: ${fetchError.message}`);
                }

                const responseTime = Date.now() - startTime;
                
                if (isHealthy) {
                    systemStatus[systemName].status = 'healthy';
                    systemStatus[systemName].consecutiveFailures = 0;
                    systemStatus[systemName].lastError = null;
                    console.log(`✅ ${systemName} is healthy (${responseTime}ms)`);
                    systemStatus[systemName].lastCheck = new Date();
                    return; // Thành công, thoát khỏi retry loop
                } else {
                    throw new Error(`Health check failed for ${systemName}`);
                }
                
            } catch (error) {
                if (attempt < maxRetries) {
                    console.log(`⚠️ ${systemName} attempt ${attempt}/${maxRetries} failed: ${error.message}`);
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                    continue;
                }
                
                // Tất cả attempts đều fail
                systemStatus[systemName].status = 'unhealthy';
                systemStatus[systemName].consecutiveFailures++;
                systemStatus[systemName].lastError = error.message;
                console.log(`❌ ${systemName} is unhealthy: ${error.message}`);
                systemStatus[systemName].lastCheck = new Date();
                return;
            }
        }
    }

    updateSystemStatus() {
        const geminiHealthy = systemStatus.gemini.status === 'healthy';
        const routerHealthy = systemStatus.router_hug.status === 'healthy';
        
        // Nếu cả 2 hệ thống đều lỗi
        if (!geminiHealthy && !routerHealthy) {
            systemStatus.maintenanceMode = true;
            console.log('🚨 MAINTENANCE MODE: Both systems are down');
            return;
        }
        
        systemStatus.maintenanceMode = false;
        
        // Logic chuyển đổi hệ thống
        if (systemStatus.currentSystem === 'gemini') {
            if (!geminiHealthy && routerHealthy) {
                this.switchToBackup();
            }
        } else if (systemStatus.currentSystem === 'router_hug') {
            // Kiểm tra xem có thể chuyển về Gemini không
            if (geminiHealthy && this.canRecoverToPrimary()) {
                this.switchToPrimary();
            }
        }
    }

    switchToBackup() {
        console.log('🔄 Switching to backup system (router_hug)');
        systemStatus.currentSystem = 'router_hug';
        systemStatus.lastSwitchTime = new Date();
        
        // Set recovery time cho Gemini
        systemStatus.gemini.nextRecoveryTime = new Date(Date.now() + LOAD_BALANCER_CONFIG.RECOVERY_TIME);
        systemStatus.gemini.isRecovering = true;
        
        console.log(`⏰ Gemini will be retried at: ${systemStatus.gemini.nextRecoveryTime}`);
    }

    switchToPrimary() {
        console.log('🔄 Switching back to primary system (gemini)');
        systemStatus.currentSystem = 'gemini';
        systemStatus.lastSwitchTime = new Date();
        
        // Reset recovery state
        systemStatus.gemini.isRecovering = false;
        systemStatus.gemini.nextRecoveryTime = null;
        
        console.log('✅ Successfully switched back to Gemini');
    }

    canRecoverToPrimary() {
        if (systemStatus.gemini.status !== 'healthy') return false;
        if (!systemStatus.gemini.isRecovering) return false;
        if (!systemStatus.gemini.nextRecoveryTime) return false;
        
        return new Date() >= systemStatus.gemini.nextRecoveryTime;
    }
}

// Khởi tạo Health Checker
const healthChecker = new HealthChecker();

// ==== REQUEST ROUTING ====
async function routeRequest(req, res) {
    systemStatus.totalRequests++;
    
    // Chỉ health check khi có request thực tế và hệ thống chưa được check
    if (systemStatus.totalRequests === 1 || systemStatus.gemini.status === 'unknown') {
        console.log('🎯 Performing on-demand health check');
        await healthChecker.performHealthCheck();
    }
    
    // Nếu đang trong chế độ bảo trì
    if (systemStatus.maintenanceMode) {
        systemStatus.failedRequests++;
        return res.status(503).json({
            error: 'Hệ thống đang được bảo trì. Vui lòng thử lại sau ít phút.',
            maintenance: true,
            timestamp: new Date().toISOString()
        });
    }
    
    try {
        let result;
        
        if (systemStatus.currentSystem === 'gemini') {
            console.log('📤 Routing request to Gemini');
            result = await routeToGemini(req, res);
        } else if (systemStatus.currentSystem === 'router_hug') {
            console.log('📤 Routing request to Router Hug');
            result = await routeToRouterHug(req, res);
        }
        
        if (result) {
            systemStatus.successfulRequests++;
        }
        
    } catch (error) {
        systemStatus.failedRequests++;
        console.error('❌ Request routing failed:', error);
        
        // Thử hệ thống backup nếu có
        if (systemStatus.currentSystem === 'gemini' && systemStatus.router_hug.status === 'healthy') {
            console.log('🔄 Retrying with backup system');
            try {
                await routeToRouterHug(req, res);
                systemStatus.successfulRequests++;
                systemStatus.failedRequests--; // Trừ lại vì đã thành công
            } catch (backupError) {
                console.error('❌ Backup system also failed:', backupError);
                res.status(500).json({
                    error: 'Hệ thống đang gặp sự cố. Vui lòng thử lại sau.',
                    timestamp: new Date().toISOString()
                });
            }
        } else {
            res.status(500).json({
                error: 'Hệ thống đang gặp sự cố. Vui lòng thử lại sau.',
                timestamp: new Date().toISOString()
            });
        }
    }
}

async function routeToGemini(req, res) {
    const breaker = circuitBreaker.getBreaker('gemini', {
        threshold: 3,
        timeout: 30000,
        resetTimeout: 60000
    });
    
    try {
        const result = await breaker.execute(async () => {
            const fetch = await import('node-fetch');
            const response = await fetch.default(`http://localhost:3001/webhook`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(req.body),
                timeout: 30000
            });
            
            if (response.ok) {
                logger.info('Successfully routed to Gemini');
                return true;
            } else {
                throw new Error(`Gemini responded with status: ${response.status}`);
            }
        });
        
        res.status(200).send('EVENT_RECEIVED');
        return result;
    } catch (error) {
        logger.error('Failed to route to Gemini', { error: error.message });
        throw error;
    }
}

async function routeToRouterHug(req, res) {
    const breaker = circuitBreaker.getBreaker('router_hug', {
        threshold: 3,
        timeout: 30000,
        resetTimeout: 60000
    });
    
    try {
        const result = await breaker.execute(async () => {
            const fetch = await import('node-fetch');
            const response = await fetch.default(`http://localhost:3002/webhook`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(req.body),
                timeout: 30000
            });
            
            if (response.ok) {
                logger.info('Successfully routed to Router Hug');
                return true;
            } else {
                throw new Error(`Router Hug responded with status: ${response.status}`);
            }
        });
        
        res.status(200).send('EVENT_RECEIVED');
        return result;
    } catch (error) {
        logger.error('Failed to route to Router Hug', { error: error.message });
        throw error;
    }
}

// ==== WEBHOOK ENDPOINTS ====
app.get('/webhook', (req, res) => {
    const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];
    
    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('✅ Webhook verified');
            res.status(200).send(challenge);
        } else {
            console.log('❌ Verification failed: Token mismatch');
            res.sendStatus(403);
        }
    } else {
        console.log('❌ Verification failed: Missing parameters');
        res.sendStatus(403);
    }
});

app.post('/webhook', async (req, res) => {
    console.log('📨 Received webhook request');
    await routeRequest(req, res);
});

// ==== ADMIN ENDPOINTS ====
app.get('/status', (req, res) => {
    const circuitBreakerStats = circuitBreaker.getStats();
    
    res.json({
        loadBalancer: {
            currentSystem: systemStatus.currentSystem,
            maintenanceMode: systemStatus.maintenanceMode,
            lastSwitchTime: systemStatus.lastSwitchTime,
            uptime: process.uptime()
        },
        systems: {
            gemini: {
                status: systemStatus.gemini.status,
                lastCheck: systemStatus.gemini.lastCheck,
                consecutiveFailures: systemStatus.gemini.consecutiveFailures,
                isRecovering: systemStatus.gemini.isRecovering,
                nextRecoveryTime: systemStatus.gemini.nextRecoveryTime,
                lastError: systemStatus.gemini.lastError,
                circuitBreaker: circuitBreakerStats.gemini || null
            },
            router_hug: {
                status: systemStatus.router_hug.status,
                lastCheck: systemStatus.router_hug.lastCheck,
                consecutiveFailures: systemStatus.router_hug.consecutiveFailures,
                isRecovering: systemStatus.router_hug.isRecovering,
                nextRecoveryTime: systemStatus.router_hug.nextRecoveryTime,
                lastError: systemStatus.router_hug.lastError,
                circuitBreaker: circuitBreakerStats.router_hug || null
            }
        },
        statistics: {
            totalRequests: systemStatus.totalRequests,
            successfulRequests: systemStatus.successfulRequests,
            failedRequests: systemStatus.failedRequests,
            successRate: systemStatus.totalRequests > 0 ? 
                ((systemStatus.successfulRequests / systemStatus.totalRequests) * 100).toFixed(2) + '%' : '0%'
        },
        circuitBreakers: circuitBreakerStats,
        timestamp: new Date().toISOString()
    });
});

app.get('/health', async (req, res) => {
    // Force health check khi được gọi
    console.log('🔍 Performing on-demand health check');
    await healthChecker.checkSystemHealth('gemini');
    await healthChecker.checkSystemHealth('router_hug');
    
    const isHealthy = !systemStatus.maintenanceMode && 
                     (systemStatus.gemini.status === 'healthy' || systemStatus.router_hug.status === 'healthy');
    
    res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? 'healthy' : 'unhealthy',
        currentSystem: systemStatus.currentSystem,
        maintenanceMode: systemStatus.maintenanceMode,
        timestamp: new Date().toISOString()
    });
});

app.post('/force-switch', (req, res) => {
    const { system, adminKey } = req.body;
    
    if (adminKey !== process.env.ADMIN_KEY) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    
    if (system === 'gemini' && systemStatus.gemini.status === 'healthy') {
        systemStatus.currentSystem = 'gemini';
        systemStatus.lastSwitchTime = new Date();
        res.json({ message: 'Switched to Gemini', timestamp: new Date().toISOString() });
    } else if (system === 'router_hug' && systemStatus.router_hug.status === 'healthy') {
        systemStatus.currentSystem = 'router_hug';
        systemStatus.lastSwitchTime = new Date();
        res.json({ message: 'Switched to Router Hug', timestamp: new Date().toISOString() });
    } else {
        res.status(400).json({ error: 'Invalid system or system is not healthy' });
    }
});

// ==== GRACEFUL SHUTDOWN ====
process.on('SIGTERM', async () => {
    console.log('🛑 Load Balancer shutting down...');
    
    healthChecker.stop();
    
    if (pool) {
        await pool.end();
        console.log('📊 Database pool closed');
    }
    
    console.log('✅ Load Balancer shutdown completed');
    process.exit(0);
});

// ==== STARTUP ====
async function startLoadBalancer() {
    try {
        // Start health checker
        healthChecker.start();
        
        // Start server
        app.listen(port, () => {
            console.log('🚀 Load Balancer started successfully!');
            console.log(`🌍 Running on port ${port}`);
            console.log(`🎯 Primary system: ${LOAD_BALANCER_CONFIG.PRIMARY_SYSTEM}`);
            console.log(`🔄 Backup system: ${LOAD_BALANCER_CONFIG.BACKUP_SYSTEM}`);
            console.log(`⏰ Recovery time: ${LOAD_BALANCER_CONFIG.RECOVERY_TIME / 1000 / 60 / 60} hours`);
            console.log('📊 Available endpoints:');
            console.log('   ✅ GET  /webhook - Facebook verification');
            console.log('   🤖 POST /webhook - Route to active system');
            console.log('   📊 GET  /status - System status');
            console.log('   🏥 GET  /health - Health check');
            console.log('   🔄 POST /force-switch - Manual system switch');
            console.log('🎉 Load Balancer is ready to handle requests!');
        });
        
    } catch (error) {
        console.error('❌ Failed to start Load Balancer:', error);
        process.exit(1);
    }
}

startLoadBalancer();
