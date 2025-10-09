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
        PORT: 3344
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3344
      },
      time: true
    }
  ]
};