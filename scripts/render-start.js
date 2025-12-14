#!/usr/bin/env node

/**
 * Render Startup Script with Keep-Alive
 * This script starts the server and implements keep-alive for Render deployment
 */

console.log('🚀 Starting Router Hug Bot with Keep-Alive support...');

// Set environment variables for production
process.env.NODE_ENV = 'production';
process.env.KEEP_ALIVE_ENABLED = 'true';

// Set default values if not provided
process.env.PORT = process.env.PORT || 10000;
process.env.HOST = process.env.HOST || '0.0.0.0';

// Log startup info
console.log('🔧 Configuration:');
console.log(`   PORT: ${process.env.PORT}`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`   KEEP_ALIVE_ENABLED: ${process.env.KEEP_ALIVE_ENABLED}`);
console.log(`   HOST: ${process.env.HOST}`);

// Start the main server
try {
  // Import and start the main server
  const server = require('../src/core/server_copy.js');
  console.log('✅ Router Hug Bot server started successfully!');
  
  // Keep the process alive
  process.on('SIGINT', () => {
    console.log('\n👋 Gracefully shutting down...');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n👋 Gracefully shutting down...');
    process.exit(0);
  });
  
} catch (error) {
  console.error('❌ Error starting server:', error);
  process.exit(1);
}