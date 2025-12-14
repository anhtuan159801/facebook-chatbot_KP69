const axios = require('axios');
const express = require('express');
const path = require('path');
require('dotenv').config();

// Create a simple express server for health checks
const app = express();
const PORT = process.env.PORT || 3000;

// Simple health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    message: 'Router Hug Bot is running and ready to serve!'
  });
});

// Serve health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'alive', 
    service: 'Router Hug Bot',
    functionality: 'Government Services Chatbot',
    timestamp: new Date().toISOString()
  });
});

// Start the health check server
app.listen(PORT, () => {
  console.log(`🛡️  Health check server running on port ${PORT}`);
  console.log(`📍 Health endpoint: http://localhost:${PORT}/health`);
});

// Keep alive function - periodically ping the service to prevent sleep
function keepAlive() {
  const baseURL = process.env.BASE_URL || `http://localhost:${PORT}`;
  
  // Ping the health endpoint to keep the service awake
  axios.get(`${baseURL}/health`)
    .then(response => {
      console.log(`🔄 Keep-alive ping successful at ${new Date().toISOString()}`);
      console.log(`📊 Health status: ${response.data.status}`);
    })
    .catch(error => {
      console.log(`⚠️  Keep-alive ping attempt failed: ${error.message}`);
    });
}

// Ping every 14 minutes (just before 15-minute timeout)
const keepAliveInterval = 14 * 60 * 1000; // 14 minutes in milliseconds

console.log(`⏰ Setting up keep-alive ping every ${keepAliveInterval / 1000 / 60} minutes...`);

// Start the keep-alive mechanism
setInterval(keepAlive, keepAliveInterval);

// Initial ping
keepAlive();

// Export for use in other modules if needed
module.exports = { app, keepAlive };