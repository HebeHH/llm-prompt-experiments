import type { LLMProvider } from '../constants/llms';

export type { LLMProvider };

export interface LLMModel {
    name: string,
    provider: LLMProvider, // Now properly constrained by the providers registry type
    pricing: {
        perMillionTokensInput: number,
        perMillionTokensOutput: number,
    }
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
    groqApiKey?: string;
} 