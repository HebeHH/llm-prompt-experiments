import React, { useState } from 'react';
import { ExtendedProvider } from '@/lib/utils/configStorage';
import { getApiKeyInfo, saveApiKeysToStorage } from '@/lib/utils/apiKeyManager';

interface ApiKeyManagerProps {
    onApiKeysChange: (keys: Record<ExtendedProvider, string>) => void;
    initialApiKeys?: Partial<Record<ExtendedProvider, string>>;
}

interface ApiKeyState {
    value: string;
    isFromEnv: boolean;
}

type ApiKeyRecord = Record<ExtendedProvider, ApiKeyState>;

export const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({
    onApiKeysChange,
    initialApiKeys = {}
}) => {
    // Initialize with API keys from our centralized manager
    const [apiKeys, setApiKeys] = useState<ApiKeyRecord>(() => {
        const keyInfo = getApiKeyInfo();
        
        // Apply any initialApiKeys that were passed in (highest priority)
        Object.keys(initialApiKeys).forEach(key => {
            const provider = key as ExtendedProvider;
            if (initialApiKeys[provider]) {
                keyInfo[provider].value = initialApiKeys[provider] || '';
                // If we're explicitly setting a key, it's not from env
                keyInfo[provider].isFromEnv = false;
            }
        });
        
        return keyInfo;
    });

    const handleApiKeyChange = (provider: ExtendedProvider, value: string) => {
        const newApiKeys = {
            ...apiKeys,
            [provider]: {
                ...apiKeys[provider],
                value
            }
        };
        setApiKeys(newApiKeys);
        
        // Convert to simple key-value pairs and notify parent
        const simpleKeys = Object.entries(newApiKeys).reduce((acc, [key, state]) => ({
            ...acc,
            [key]: state.value
        }), {} as Record<ExtendedProvider, string>);
        
        // Notify parent of the change
        onApiKeysChange(simpleKeys);
        
        // Save to localStorage
        saveApiKeysToStorage(simpleKeys);
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-medium">API Keys</h3>
            <div className="space-y-4">
                {Object.entries(apiKeys).map(([provider, state]) => (
                    <div key={provider} className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            {provider.charAt(0).toUpperCase() + provider.slice(1)} API Key
                            {state.isFromEnv && (
                                <span className="ml-2 text-xs text-green-600">
                                    (Using environment variable)
                                </span>
                            )}
                        </label>
                        <input
                            type="password"
                            value={state.value}
                            onChange={(e) => handleApiKeyChange(provider as ExtendedProvider, e.target.value)}
                            disabled={state.isFromEnv}
                            placeholder={state.isFromEnv ? "API key set in environment" : `Enter ${provider} API key`}
                            className={`mt-1 block w-full rounded-md shadow-sm 
                                ${state.isFromEnv 
                                    ? 'bg-gray-100 cursor-not-allowed' 
                                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                                } sm:text-sm`}
                        />
                        {!state.isFromEnv && state.value && (
                            <p className="text-xs text-gray-500">
                                API key will be stored in browser localStorage
                            </p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}; 