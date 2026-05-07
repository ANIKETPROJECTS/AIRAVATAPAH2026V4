module.exports = {
  apps: [
    {
      name: "krushi-suvidha",
      cwd: "./artifacts/api-server",
      script: "node",
      args: "--enable-source-maps ./dist/index.mjs",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        PORT: 3014,
        NODE_ENV: "production",
      },
    },
  ],
};
