import { NextResponse } from 'next/server';
import { getConfig } from '@/lib/config';

export async function GET() {
  const config = getConfig();
  
  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV,
    openWeatherApiKey: process.env.OPENWEATHER_API_KEY ? '✅ موجود' : '❌ غير موجود',
    configOpenWeatherApiKey: config.openWeatherApiKey ? '✅ موجود' : '❌ غير موجود',
    allEnvVars: Object.keys(process.env).filter(key => 
      key.includes('NEXT_') || 
      key.includes('OPENWEATHER') || 
      key.includes('NODE_ENV')
    ).reduce((obj, key) => {
      obj[key] = key.includes('KEY') || key.includes('SECRET') ? '***' : process.env[key];
      return obj;
    }, {} as Record<string, string>)
  });
}
