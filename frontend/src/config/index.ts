// Configuration management for the frontend application
// This centralizes all environment variables and configuration

interface Config {
  // API Configuration
  api: {
    baseUrl: string;
    timeout: number;
  };
  
  // WebSocket Configuration
  ws: {
    baseUrl: string;
  };
  
  // External Services
  stripe: {
    publishableKey: string;
  };

  // Supabase
  supabase: {
    url: string;
    publishableKey: string;
  };
  
  // Application Settings
  app: {
    name: string;
    version: string;
    environment: string;
    debug: boolean;
  };
  
  // Feature Flags
  features: {
    enableAudioRecording: boolean;
    enablePayments: boolean;
    enableAnalytics: boolean;
  };
  
  // UI Configuration
  ui: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    timezone: string;
  };
}

// Get environment variable with fallback
const getEnvVar = (key: string, fallback: string = ''): string => {
  return import.meta.env[key] || fallback;
};

// Get boolean environment variable
const getBooleanEnvVar = (key: string, fallback: boolean = false): boolean => {
  const value = getEnvVar(key);
  if (value === '') return fallback;
  return value.toLowerCase() === 'true';
};

// Get number environment variable
const getNumberEnvVar = (key: string, fallback: number = 0): number => {
  const value = getEnvVar(key);
  if (value === '') return fallback;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
};

// Load configuration from environment variables
const loadConfig = (): Config => {
  const environment = getEnvVar('VITE_NODE_ENV', 'development');
  
  return {
    api: {
      baseUrl: getEnvVar('VITE_API_URL', 'http://localhost:8080/api/v1'),
      timeout: getNumberEnvVar('VITE_API_TIMEOUT', 10000),
    },
    
    ws: {
      baseUrl: getEnvVar('VITE_WS_URL', 'ws://localhost:8080/ws'),
    },
    
    stripe: {
      publishableKey: getEnvVar('VITE_STRIPE_PUBLISHABLE_KEY', ''),
    },

    supabase: {
      url: getEnvVar('VITE_SUPABASE_URL', ''),
      publishableKey: getEnvVar('VITE_SUPABASE_PUBLISHABLE_KEY', ''),
    },

    app: {
      name: 'PreparationAI',
      version: '1.0.0',
      environment,
      debug: getBooleanEnvVar('VITE_DEBUG', environment === 'development'),
    },
    
    features: {
      enableAudioRecording: getBooleanEnvVar('VITE_ENABLE_AUDIO_RECORDING', true),
      enablePayments: getBooleanEnvVar('VITE_ENABLE_PAYMENTS', true),
      enableAnalytics: getBooleanEnvVar('VITE_ENABLE_ANALYTICS', false),
    },
    
    ui: {
      theme: (getEnvVar('VITE_THEME', 'light') as 'light' | 'dark' | 'auto'),
      language: getEnvVar('VITE_LANGUAGE', 'en'),
      timezone: getEnvVar('VITE_TIMEZONE', 'UTC'),
    },
  };
};

// Create and export the configuration
export const config = loadConfig();

// Validation function to check if required configuration is present
export const validateConfig = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Check required API configuration
  if (!config.api.baseUrl) {
    errors.push('VITE_API_URL is required');
  }
  
  // Check Stripe configuration if payments are enabled
  if (config.features.enablePayments && !config.stripe.publishableKey) {
    errors.push('VITE_STRIPE_PUBLISHABLE_KEY is required when payments are enabled');
  }
  
  // Validate API URL format
  try {
    new URL(config.api.baseUrl);
  } catch {
    errors.push('VITE_API_URL must be a valid URL');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Helper functions for common configuration access
export const isDevelopment = (): boolean => config.app.environment === 'development';
export const isProduction = (): boolean => config.app.environment === 'production';
export const isDebugMode = (): boolean => config.app.debug;

// API configuration helpers
export const getApiUrl = (endpoint: string = ''): string => {
  const baseUrl = config.api.baseUrl.endsWith('/') 
    ? config.api.baseUrl.slice(0, -1) 
    : config.api.baseUrl;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
};

// Feature flag helpers
export const isFeatureEnabled = (feature: keyof Config['features']): boolean => {
  return config.features[feature];
};

// Log configuration in development
if (isDevelopment()) {
  console.log('🔧 Configuration loaded:', {
    environment: config.app.environment,
    apiUrl: config.api.baseUrl,
    features: config.features,
    debug: config.app.debug,
  });
}

// Validate configuration on load
const validation = validateConfig();
if (!validation.isValid) {
  console.error('❌ Configuration validation failed:', validation.errors);
  if (isProduction()) {
    throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
  }
}

export default config;
