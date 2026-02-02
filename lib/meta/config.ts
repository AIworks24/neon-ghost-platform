// Meta API Configuration
export const META_CONFIG = {
  apiVersion: 'v21.0',
  baseUrl: 'https://graph.facebook.com',
  
  // Check if credentials are configured
  isConfigured: () => {
    return !!(
      process.env.META_APP_ID &&
      process.env.META_APP_SECRET &&
      process.env.META_ACCESS_TOKEN
    );
  },

  // Demo mode status
  isDemoMode: () => {
    return !META_CONFIG.isConfigured();
  },

  // Get credentials (returns null in demo mode)
  getCredentials: () => {
    if (!META_CONFIG.isConfigured()) {
      return null;
    }
    
    return {
      appId: process.env.META_APP_ID!,
      appSecret: process.env.META_APP_SECRET!,
      accessToken: process.env.META_ACCESS_TOKEN!,
      adAccountId: process.env.META_AD_ACCOUNT_ID,
    };
  },
};