import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'openweathermap.org',
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Environment variables that should be available on the client-side
  env: {
    NEXT_PUBLIC_OPENWEATHER_API_KEY: process.env.OPENWEATHER_API_KEY,
  },
  // Server-side environment variables
  serverRuntimeConfig: {
    openWeatherApiKey: process.env.OPENWEATHER_API_KEY,
  },
  // Public environment variables that will be available on both server and client
  publicRuntimeConfig: {
    openWeatherApiKey: process.env.OPENWEATHER_API_KEY,
  },
  reactStrictMode: true,
};

// التحقق من وجود مفتاح API
if (!process.env.OPENWEATHER_API_KEY) {
  console.warn('⚠️  تحذير: لم يتم تعيين مفتاح OpenWeather API. يرجى إضافته إلى ملف .env.local');
}

export default nextConfig;
