/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  output: 'standalone',
  eslint: {
    dirs: ['src'],
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
