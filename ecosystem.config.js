module.exports = {
  apps: [
    {
      name: 'seobi-chat',
      script: 'server.js',
      // Node 20+의 --env-file 플래그로 .env.local 로드
      // (Next.js standalone은 .env.local을 자동 로드하지 않음)
      interpreter_args: '--env-file=.env.local',
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
