module.exports = {
  apps : [{
    name: 'live',
    script: './build/main.js',

    // Options reference: https://pm2.keymetrics.io/docs/usage/application-declaration/
    args: [
        '--color'
    ],
    env: {
        FORCE_COLOR: 1
    },
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
  }],
};
