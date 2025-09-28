#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// ==== CẤU HÌNH HỆ THỐNG ====
const SYSTEM_CONFIG = {
    loadBalancer: {
        port: 3000,
        file: 'load_balancer.js',
        name: 'Load Balancer'
    },
    gemini: {
        port: 3001,
        file: 'gemini.js',
        name: 'Gemini Bot'
    },
    routerHug: {
        port: 3002,
        file: 'router_hug.js',
        name: 'Router Hug Bot'
    }
};

// ==== QUẢN LÝ PROCESS ====
class SystemManager {
    constructor() {
        this.processes = new Map();
        this.isShuttingDown = false;
    }

    async startSystem() {
        console.log('🚀 Starting Chatbot System...\n');
        
        // Kiểm tra file tồn tại
        this.checkFiles();
        
        // Khởi động các service
        await this.startService('gemini');
        await this.delay(2000); // Chờ 2 giây
        
        await this.startService('routerHug');
        await this.delay(2000); // Chờ 2 giây
        
        await this.startService('loadBalancer');
        
        console.log('\n✅ All services started successfully!');
        console.log('📊 System Status:');
        console.log(`   🔄 Load Balancer: http://localhost:${SYSTEM_CONFIG.loadBalancer.port}`);
        console.log(`   🤖 Gemini Bot: http://localhost:${SYSTEM_CONFIG.gemini.port}`);
        console.log(`   🔧 Router Hug Bot: http://localhost:${SYSTEM_CONFIG.routerHug.port}`);
        console.log('\n🎯 Load Balancer will route requests to the active system');
        console.log('📱 Facebook webhook should point to Load Balancer port 3000');
        
        // Setup graceful shutdown
        this.setupGracefulShutdown();
    }

    checkFiles() {
        const requiredFiles = [
            SYSTEM_CONFIG.loadBalancer.file,
            SYSTEM_CONFIG.gemini.file,
            SYSTEM_CONFIG.routerHug.file
        ];

        for (const file of requiredFiles) {
            if (!fs.existsSync(file)) {
                console.error(`❌ Required file not found: ${file}`);
                process.exit(1);
            }
        }
        console.log('✅ All required files found');
    }

    async startService(serviceName) {
        const config = SYSTEM_CONFIG[serviceName];
        console.log(`🔄 Starting ${config.name} on port ${config.port}...`);
        
        return new Promise((resolve, reject) => {
            const child = spawn('node', [config.file], {
                stdio: 'pipe',
                env: {
                    ...process.env,
                    PORT: config.port
                }
            });

            // Lưu process
            this.processes.set(serviceName, child);

            // Xử lý output
            child.stdout.on('data', (data) => {
                const output = data.toString().trim();
                if (output) {
                    console.log(`[${config.name}] ${output}`);
                }
            });

            child.stderr.on('data', (data) => {
                const error = data.toString().trim();
                if (error && !error.includes('DeprecationWarning')) {
                    console.error(`[${config.name} ERROR] ${error}`);
                }
            });

            child.on('close', (code) => {
                if (!this.isShuttingDown) {
                    console.error(`❌ ${config.name} exited with code ${code}`);
                    if (code !== 0) {
                        reject(new Error(`${config.name} failed to start`));
                    }
                }
            });

            child.on('error', (error) => {
                console.error(`❌ Failed to start ${config.name}:`, error);
                reject(error);
            });

            // Chờ service khởi động
            setTimeout(() => {
                if (child.exitCode === null) {
                    console.log(`✅ ${config.name} started successfully`);
                    resolve();
                }
            }, 3000);
        });
    }

    async stopService(serviceName) {
        const process = this.processes.get(serviceName);
        if (process) {
            console.log(`🛑 Stopping ${SYSTEM_CONFIG[serviceName].name}...`);
            process.kill('SIGTERM');
            
            // Chờ process kết thúc
            return new Promise((resolve) => {
                process.on('close', () => {
                    console.log(`✅ ${SYSTEM_CONFIG[serviceName].name} stopped`);
                    resolve();
                });
                
                // Force kill sau 10 giây
                setTimeout(() => {
                    if (!process.killed) {
                        process.kill('SIGKILL');
                        resolve();
                    }
                }, 10000);
            });
        }
    }

    async stopAllServices() {
        this.isShuttingDown = true;
        console.log('\n🛑 Shutting down all services...');
        
        const stopOrder = ['loadBalancer', 'gemini', 'routerHug'];
        
        for (const serviceName of stopOrder) {
            await this.stopService(serviceName);
        }
        
        console.log('✅ All services stopped');
    }

    setupGracefulShutdown() {
        const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
        
        signals.forEach(signal => {
            process.on(signal, async () => {
                console.log(`\n📡 Received ${signal}, shutting down gracefully...`);
                await this.stopAllServices();
                process.exit(0);
            });
        });
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// ==== CLI COMMANDS ====
async function main() {
    const command = process.argv[2];
    const manager = new SystemManager();

    switch (command) {
        case 'start':
            await manager.startSystem();
            break;
            
        case 'stop':
            await manager.stopAllServices();
            break;
            
        case 'restart':
            await manager.stopAllServices();
            await manager.delay(2000);
            await manager.startSystem();
            break;
            
        case 'status':
            console.log('📊 System Status:');
            for (const [serviceName, process] of manager.processes) {
                const config = SYSTEM_CONFIG[serviceName];
                const status = process.exitCode === null ? 'Running' : 'Stopped';
                console.log(`   ${config.name}: ${status} (Port ${config.port})`);
            }
            break;
            
        default:
            console.log('🤖 Chatbot System Manager');
            console.log('Usage: node start_system.js <command>');
            console.log('');
            console.log('Commands:');
            console.log('  start    - Start all services');
            console.log('  stop     - Stop all services');
            console.log('  restart  - Restart all services');
            console.log('  status   - Show system status');
            console.log('');
            console.log('Examples:');
            console.log('  node start_system.js start');
            console.log('  node start_system.js status');
            break;
    }
}

// Chạy main function
main().catch(error => {
    console.error('❌ System Manager Error:', error);
    process.exit(1);
});
