// CI(deploy.yml)가 배포 시 GEMINI_API_KEY, NEXT_PUBLIC_BASE_URL을 env에 주입함
module.exports = {
  apps: [
    {
      name: 'seobi-chat',
      script: 'server.js',
      cwd: '.',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
      },
    },
  ],
};
