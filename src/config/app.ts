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
// ALWAYS use production URL for consistency
export const getShareBaseUrl = (): string => {
  // Always use production URL for sharing
  return APP_CONFIG.productionUrl;
};

// Get the survey URL
export const getSurveyUrl = (surveyId: string): string => {
  return `${getShareBaseUrl()}/survey/${surveyId}`;
};
