const { getDefaultConfig } = require('expo/metro-config');
const { createProxyMiddleware } = require('http-proxy-middleware');

const config = getDefaultConfig(__dirname);

const originalEnhanceMiddleware = config.server?.enhanceMiddleware;

config.server = {
  ...(config.server || {}),
  enhanceMiddleware: (metroMiddleware, server) => {
    const base = originalEnhanceMiddleware
      ? originalEnhanceMiddleware(metroMiddleware, server)
      : metroMiddleware;

    const apiProxy = createProxyMiddleware({
      target: 'http://localhost:8000',
      changeOrigin: false,
      logLevel: 'silent',
    });

    return (req, res, next) => {
      if (req.url && req.url.startsWith('/api')) {
        apiProxy(req, res, next);
      } else {
        base(req, res, next);
      }
    };
  },
};

module.exports = config;
