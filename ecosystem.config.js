module.exports = {
  apps: [
    {
      name: 'monthly-budget-dashboard',
      script: 'npm',
      args: 'start',
      cwd: '/mnt/c/Users/monsky-home/playground/monthly-budget/dashboard-app',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3345
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3345
      },
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      error_file: '~/.pm2/logs/monthly-budget-dashboard-error.log',
      out_file: '~/.pm2/logs/monthly-budget-dashboard-out.log',
      log_file: '~/.pm2/logs/monthly-budget-dashboard-combined.log',
      time: true
    }
  ]
};