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
      time: true
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
      time: true
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
      time: true
    }
  ]
};
