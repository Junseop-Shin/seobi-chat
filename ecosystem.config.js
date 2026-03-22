module.exports = {
  apps: [
    {
      name: 'seobi-chat',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: './',
      instances: 1,
      autorestart: true,        // 크래시 시 자동 재시작
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3002, // profile=3000, lotto-oracle=3001 충돌 방지
      },
    },
  ],
};
