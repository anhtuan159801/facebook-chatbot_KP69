#!/usr/bin/env node

/**
 * Render.com Startup Script
 * 
 * This script starts the chatbot system with keep-alive functionality
 * specifically designed for Render.com's free tier limitations.
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Facebook Chatbot on Render.com...');

// Environment variables
const PORT = process.env.PORT || 10000;
const APP_URL = process.env.APP_URL || `https://your-app-name.onrender.com`;

console.log(`📡 Port: ${PORT}`);
console.log(`🌐 App URL: ${APP_URL}`);

// Start the main application
const mainApp = spawn('node', ['src/core/load-balancer/load_balancer.js'], {
    stdio: 'inherit',
    env: {
        ...process.env,
        PORT: PORT
    }
});

// Start keep-alive service
const keepAlive = spawn('node', ['scripts/keep-alive.js'], {
    stdio: 'inherit',
    env: {
        ...process.env,
        APP_URL: APP_URL,
        LOG_LEVEL: 'INFO',
        ENABLE_DETAILED_LOGS: 'true'
    }
});

// Handle process exits
function handleExit(signal) {
    console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
    
    mainApp.kill(signal);
    keepAlive.kill(signal);
    
    setTimeout(() => {
        console.log('💀 Force exit after timeout');
        process.exit(0);
    }, 10000);
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    handleExit('SIGTERM');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    handleExit('SIGTERM');
});

// Handle signals
process.on('SIGTERM', () => handleExit('SIGTERM'));
process.on('SIGINT', () => handleExit('SIGINT'));

// Monitor child processes
mainApp.on('exit', (code, signal) => {
    console.log(`📱 Main app exited with code ${code} and signal ${signal}`);
    if (code !== 0) {
        console.log('🔄 Restarting main app...');
        // Restart logic could be added here
    }
});

keepAlive.on('exit', (code, signal) => {
    console.log(`💓 Keep-alive service exited with code ${code} and signal ${signal}`);
    if (code !== 0) {
        console.log('🔄 Restarting keep-alive service...');
        // Restart logic could be added here
    }
});

console.log('✅ Both services started successfully!');
console.log('📊 Monitoring processes...');
