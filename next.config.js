/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React's strict mode
  reactStrictMode: true,
  
  // Image domains
  images: {
    domains: ['openweathermap.org', 'res.cloudinary.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  
  // Disable TypeScript checking during build
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Disable ESLint during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Environment variables that should be available on the client-side
  env: {
    NEXT_PUBLIC_VERCEL_URL: process.env.VERCEL_URL,
  },
  
  // Enable source maps in production for debugging
  productionBrowserSourceMaps: true,
};

// Only require keys in production
if (process.env.NODE_ENV === 'production' && !process.env.OPENWEATHER_API_KEY) {
  console.warn('⚠️  Warning: OPENWEATHER_API_KEY is not set in production environment');
}

module.exports = nextConfig;
