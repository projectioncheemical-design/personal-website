// @ts-check

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  // Enable React's strict mode
  reactStrictMode: true,
  
  // Image optimization
  images: {
    domains: [
      'openweathermap.org',
      'res.cloudinary.com',
      'lh3.googleusercontent.com',
      'avatars.githubusercontent.com'
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    minimumCacheTTL: 60, // 1 minute
  },
  
  // Disable TypeScript checking during build
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Disable ESLint during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Enable SWC minification
  swcMinify: true,
  
  // Configure page revalidation (ISR)
  experimental: {
    // Enable server actions
    serverActions: true,
  },
  
  // Environment variables that should be available on the client-side
  env: {
    NEXT_PUBLIC_VERCEL_URL: process.env.VERCEL_URL,
    NEXT_PUBLIC_SITE_URL: process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000',
  },
};

export default nextConfig;
