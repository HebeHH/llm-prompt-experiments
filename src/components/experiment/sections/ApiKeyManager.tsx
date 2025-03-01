import React, { useState } from 'react';
import { LLMProvider } from '@/lib/types/llm';

interface ApiKeyManagerProps {
    onApiKeysChange: (keys: Record<LLMProvider, string>) => void;
    initialApiKeys?: Partial<Record<LLMProvider, string>>;
}

interface ApiKeyState {
    value: string;
    isFromEnv: boolean;
}

export const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({
    onApiKeysChange,
    initialApiKeys = {}
}) => {
    const [apiKeys, setApiKeys] = useState<Record<LLMProvider, ApiKeyState>>(() => ({
        anthropic: {
            value: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || initialApiKeys?.anthropic || '',
            isFromEnv: !!process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY
        },
        google: {
            value: process.env.NEXT_PUBLIC_GOOGLE_API_KEY || initialApiKeys?.google || '',
            isFromEnv: !!process.env.NEXT_PUBLIC_GOOGLE_API_KEY
        },
        openai: {
            value: process.env.NEXT_PUBLIC_OPENAI_API_KEY || initialApiKeys?.openai || '',
            isFromEnv: !!process.env.NEXT_PUBLIC_OPENAI_API_KEY
        },
        groq: {
            value: process.env.NEXT_PUBLIC_GROQ_API_KEY || initialApiKeys?.groq || '',
            isFromEnv: !!process.env.NEXT_PUBLIC_GROQ_API_KEY
        }
    }));

    const handleApiKeyChange = (provider: LLMProvider, value: string) => {
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
        }), {} as Record<LLMProvider, string>);
        
        onApiKeysChange(simpleKeys);
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
                            onChange={(e) => handleApiKeyChange(provider as LLMProvider, e.target.value)}
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
                                API key will be stored in browser session only
                            </p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}; 