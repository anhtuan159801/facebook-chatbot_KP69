module.exports = {
  apps: [
    {
      name: 'load-balancer',
      script: 'load_balancer.js',
      port: 3000,
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/load-balancer-error.log',
      out_file: './logs/load-balancer-out.log',
      log_file: './logs/load-balancer-combined.log',
      time: true,
      // Auto restart on failure
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'gemini-bot',
      script: 'gemini.js',
      port: 3001,
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/gemini-error.log',
      out_file: './logs/gemini-out.log',
      log_file: './logs/gemini-combined.log',
      time: true,
      // Auto restart on failure
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'router-hug-bot',
      script: 'router_hug.js',
      port: 3002,
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/router-hug-error.log',
      out_file: './logs/router-hug-out.log',
      log_file: './logs/router-hug-combined.log',
      time: true,
      // Auto restart on failure
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'keep-alive',
      script: 'keep-alive.js',
      env: {
        NODE_ENV: 'production',
        APP_URL: process.env.APP_URL || 'https://your-app-name.onrender.com',
        LOG_LEVEL: 'INFO',
        ENABLE_DETAILED_LOGS: 'true'
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '512M',
      error_file: './logs/keep-alive-error.log',
      out_file: './logs/keep-alive-out.log',
      log_file: './logs/keep-alive-combined.log',
      time: true,
      // Auto restart on failure
      autorestart: true,
      max_restarts: 5,
      min_uptime: '30s'
    }
  ]
};
