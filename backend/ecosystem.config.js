module.exports = {
  apps: [{
    name: 'red-dental',
    script: './dist/server.js',
    cwd: 'C:\\Users\\Admin\\.openclaw\\workspace\\OrtodonciaPlus\\backend',
    instances: 1,
    autorestart: true,
    watch: false,
    env: {
      NODE_ENV: 'production',
      PORT: 5000,
    }
  }]
};
