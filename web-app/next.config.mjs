/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // Ensure API routes work correctly
  async rewrites() {
    return [];
  },
};

export default nextConfig;


