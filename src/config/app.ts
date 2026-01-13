// Application configuration
// Configure your production URL here for sharing
export const APP_CONFIG = {
  // Production URL for sharing (Netlify deployment)
  productionUrl: 'https://youcollect.netlify.app',
  
  // App name displayed in the header and QR codes
  appName: 'Youcollect',
  
  // Check if we're in production
  isProduction: import.meta.env.PROD,
};

// Get the correct base URL for sharing
export const getShareBaseUrl = (): string => {
  // Always use production URL for sharing if configured
  if (APP_CONFIG.productionUrl) {
    return APP_CONFIG.productionUrl;
  }
  
  // Fallback to current origin
  return window.location.origin;
};
