import { LLMConfig, LLMProvider as LLMProviderType } from '../types/llm';
import { LLMProvider } from './base';
import { AnthropicProvider } from './anthropic';
import { GoogleProvider } from './google';
import { OpenAIProvider } from './openai';

export class LLMProviderFactory {
    private static providers: Record<LLMProviderType, LLMProvider> = {
        anthropic: new AnthropicProvider(),
        google: new GoogleProvider(),
        openai: new OpenAIProvider(),
    };

    private static initialized = false;

    static initialize(config: LLMConfig): void {
        if (this.initialized) {
            return;
        }

        Object.entries(this.providers).forEach(([provider, instance]) => {
            try {
                instance.initialize(config);
            } catch (error) {
                console.warn(`Failed to initialize ${provider} provider:`, error);
            }
        });

        this.initialized = true;
    }

    static getProvider(provider: LLMProviderType): LLMProvider {
        if (!this.initialized) {
            throw new Error('LLMProviderFactory not initialized');
        }

        const instance = this.providers[provider];
        if (!instance) {
            throw new Error(`Provider ${provider} not found`);
        }

        return instance;
    }
} 