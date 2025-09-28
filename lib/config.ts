// Simple configuration that works with both server and client
const config = {
  // Get API key with fallback to empty string
  get openWeatherApiKey() {
    // In browser, we'll use the public API route
    if (typeof window !== 'undefined') {
      return ''; // We'll use the API route instead
    }
    
    // On server, try to get the key from environment variables
    return process.env.OPENWEATHER_API_KEY || '';
  },
  
  // Add other configuration options here
};

export function getConfig() {
  return config;
}

// Validate configuration in development
if (process.env.NODE_ENV === 'development' && !config.openWeatherApiKey) {
  console.error('❌ Error: OPENWEATHER_API_KEY is not set in environment variables');
  console.log('💡 Tip: Create a .env.local file in your project root with:');
  console.log('OPENWEATHER_API_KEY=your_api_key_here');
}
