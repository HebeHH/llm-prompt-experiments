import { ExtendedProvider } from './configStorage';

/**
 * Centralized API key management utility
 * 
 * Priority order:
 * 1. User-provided keys in the UI (highest priority, saved to localStorage)
 * 2. Keys from .env file (not saved to localStorage)
 * 3. Keys previously saved in localStorage
 */

// Get all available API keys following the priority order
export const getApiKeys = (): Record<ExtendedProvider, string> => {
  // Start with empty keys
  const keys: Record<ExtendedProvider, string> = {
    anthropic: '',
    google: '',
    openai: '',
    groq: '',
    jigsaw: ''
  };

  // Try to load from localStorage (lowest priority)
  try {
    const savedKeys = localStorage.getItem('apiKeys');
    if (savedKeys) {
      const parsedKeys = JSON.parse(savedKeys);
      Object.keys(parsedKeys).forEach(key => {
        if (key in keys && parsedKeys[key]) {
          keys[key as ExtendedProvider] = parsedKeys[key];
        }
      });
    }
  } catch (error) {
    console.error('Error loading API keys from localStorage:', error);
  }

  // Apply environment variables (medium priority)
  if (process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY) {
    keys.anthropic = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;
  }
  if (process.env.NEXT_PUBLIC_GOOGLE_API_KEY) {
    keys.google = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  }
  if (process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
    keys.openai = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  }
  if (process.env.NEXT_PUBLIC_GROQ_API_KEY) {
    keys.groq = process.env.NEXT_PUBLIC_GROQ_API_KEY;
  }
  if (process.env.NEXT_PUBLIC_JIGSAW_API_KEY) {
    keys.jigsaw = process.env.NEXT_PUBLIC_JIGSAW_API_KEY;
  }

  return keys;
};

// Save API keys to localStorage
export const saveApiKeysToStorage = (keys: Record<ExtendedProvider, string>): void => {
  try {
    // Get current keys from localStorage
    const savedKeysJson = localStorage.getItem('apiKeys');
    let currentStoredKeys: Record<ExtendedProvider, string> = {
      anthropic: '',
      google: '',
      openai: '',
      groq: '',
      jigsaw: ''
    };
    
    if (savedKeysJson) {
      try {
        const parsedKeys = JSON.parse(savedKeysJson);
        Object.keys(parsedKeys).forEach(key => {
          if (key in currentStoredKeys) {
            currentStoredKeys[key as ExtendedProvider] = parsedKeys[key];
          }
        });
      } catch (e) {
        console.error('Error parsing saved API keys:', e);
      }
    }
    
    // Merge with new keys (new keys take priority)
    const mergedKeys = { ...currentStoredKeys };
    
    // Only update keys that are provided and not from env
    let hasChanged = false;
    Object.keys(keys).forEach(key => {
      const provider = key as ExtendedProvider;
      if (keys[provider]) {
        // Don't override env keys with empty values
        if (keys[provider] || !process.env[`NEXT_PUBLIC_${provider.toUpperCase()}_API_KEY`]) {
          if (mergedKeys[provider] !== keys[provider]) {
            mergedKeys[provider] = keys[provider];
            hasChanged = true;
          }
        }
      }
    });
    
    // Only save to localStorage if something has changed
    if (hasChanged) {
      localStorage.setItem('apiKeys', JSON.stringify(mergedKeys));
    }
  } catch (error) {
    console.error('Error saving API keys to localStorage:', error);
  }
};

// Get a specific API key
export const getApiKey = (provider: ExtendedProvider): string => {
  const keys = getApiKeys();
  return keys[provider] || '';
};

// Check if an API key is available for a provider
export const hasApiKey = (provider: ExtendedProvider): boolean => {
  return !!getApiKey(provider);
};

// Check if an API key is from environment variables
export const isApiKeyFromEnv = (provider: ExtendedProvider): boolean => {
  const envKey = process.env[`NEXT_PUBLIC_${provider.toUpperCase()}_API_KEY`];
  return !!envKey;
};

// Get API key source information
export const getApiKeyInfo = (): Record<ExtendedProvider, { value: string; isFromEnv: boolean }> => {
  const keys = getApiKeys();
  const result: Record<ExtendedProvider, { value: string; isFromEnv: boolean }> = {} as any;
  
  (Object.keys(keys) as ExtendedProvider[]).forEach(provider => {
    result[provider] = {
      value: keys[provider],
      isFromEnv: isApiKeyFromEnv(provider)
    };
  });
  
  return result;
}; 