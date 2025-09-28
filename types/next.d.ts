import 'next';

declare module 'next' {
  export interface NextApiRequest {
    // Add any custom properties to the request object here
  }
  
  export interface NextApiResponse {
    // Add any custom methods to the response object here
  }
}

declare module 'next/config' {
  type ConfigTypes = {
    publicRuntimeConfig: {
      openWeatherApiKey?: string;
    };
    serverRuntimeConfig: {
      openWeatherApiKey?: string;
    };
  };
  
  declare function getConfig(): ConfigTypes;
  
  export default getConfig;
}
