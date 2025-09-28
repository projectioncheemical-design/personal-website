import { NextResponse } from 'next/server';
import { getConfig } from '@/lib/config';

// Get the API key
const config = getConfig();
const OPENWEATHER_API_KEY = config.openWeatherApiKey;

export async function GET(request: Request) {
  console.log('🌦️ Weather API called');
  const { searchParams } = new URL(request.url);
  const city = searchParams.get('city') || 'Delengat,EG'; // Default to Delengat, Egypt

  // Log diagnostic information (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('🌍 City:', city);
    console.log('🔑 API Key exists:', !!OPENWEATHER_API_KEY);
  }

  if (!OPENWEATHER_API_KEY) {
    const errorMessage = 'OpenWeather API key is not properly configured on the server.';
    console.error('❌ Error:', errorMessage);
    
    return NextResponse.json(
      { 
        error: 'خطأ في التكوين',
        details: errorMessage,
        solution: 'Please set the OPENWEATHER_API_KEY environment variable in your deployment environment.'
      },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        }
      }
    );
  }

  try {
    const apiUrl = new URL('https://api.openweathermap.org/data/2.5/weather');
    apiUrl.searchParams.append('q', city);
    apiUrl.searchParams.append('appid', OPENWEATHER_API_KEY);
    apiUrl.searchParams.append('units', 'metric');
    apiUrl.searchParams.append('lang', 'ar');
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🌐 Fetching weather from:', 
        apiUrl.toString().replace(OPENWEATHER_API_KEY, '***')
      );
    }
    
    const response = await fetch(apiUrl.toString(), {
      next: { revalidate: 300 }, // Cache for 5 minutes
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
    });
    
    const responseData = await response.text();
    
    if (process.env.NODE_ENV === 'development') {
      console.log('API Response Status:', response.status);
      console.log('API Response Headers:', Object.fromEntries([...response.headers.entries()]));
      console.log('API Response Body:', responseData);
    }
    
    if (!response.ok) {
      let errorMessage = `فشل في جلب بيانات الطقس: ${response.status} ${response.statusText}`;
      try {
        const errorData = JSON.parse(responseData);
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        console.error('Error parsing error response:', e);
      }
      
      console.error('Weather API error:', errorMessage);
      return NextResponse.json(
        { 
          error: 'فشل في جلب بيانات الطقس',
          details: errorMessage,
          status: response.status
        },
        { 
          status: response.status,
          headers: {
            'Cache-Control': 'no-store, max-age=0',
          }
        }
      );
    }
    
    const data = JSON.parse(responseData);
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300', // 5 minutes
      },
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
    console.error('Weather API error:', errorMessage, error);
    
    return NextResponse.json(
      { 
        error: 'فشل في جلب بيانات الطقس',
        details: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        }
      }
    );
  }
}
