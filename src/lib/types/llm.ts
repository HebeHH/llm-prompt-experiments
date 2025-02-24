export type LLMProvider = 'anthropic' | 'google' | 'openai';

export interface LLMModel {
    name: string;
    provider: LLMProvider;
}

export interface LLMResponse {
    model: LLMModel;
    prompt: string;
    response: string;
    error?: string;
    timestamp: number;
}

export interface LLMConfig {
    anthropicApiKey?: string;
    googleApiKey?: string;
    openaiApiKey?: string;
} 