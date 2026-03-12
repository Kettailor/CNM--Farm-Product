/** @type {import('next').NextConfig} */
const API_PROXY_TARGET = process.env.API_PROXY_TARGET ?? 'http://localhost:8000';
const API_PROXY_PREFIX = process.env.API_PROXY_PREFIX ?? '/api';

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_PROXY_TARGET}${API_PROXY_PREFIX}/:path*`
      }
    ];
  }
};

module.exports = nextConfig;
