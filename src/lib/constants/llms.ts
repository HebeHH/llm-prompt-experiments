import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import { BaseLLMProvider } from './base';
import { LLMModel, LLMResponse, LLMConfig } from '../types/llm';

// Provider implementations
export class AnthropicProvider extends BaseLLMProvider {
    private client: Anthropic | null = null;

    initialize(config: { anthropicApiKey?: string }): void {
        super.initialize(config);
        if (!config.anthropicApiKey) {
            throw new Error('Anthropic API key is required');
        }
        this.client = new Anthropic({
            apiKey: config.anthropicApiKey,
            dangerouslyAllowBrowser: true
        });
    }

    async generateResponse(model: LLMModel, prompt: string): Promise<LLMResponse> {
        try {
            if (!this.client) {
                throw new Error('Anthropic client not initialized');
            }

            const completion = await this.client.messages.create({
                model: model.name,
                max_tokens: 1024,
                messages: [{ role: 'user', content: prompt }],
            });

            const responseText = completion.content.map(block => {
                if ('text' in block) {
                    return block.text;
                }
                return '';
            }).join('');

            return this.createResponse(model, prompt, responseText);
        } catch (error) {
            return this.createResponse(
                model,
                prompt,
                '',
                error instanceof Error ? error.message : 'Unknown error'
            );
        }
    }
}

export class OpenAIProvider extends BaseLLMProvider {
    private client: OpenAI | null = null;

    initialize(config: { openaiApiKey?: string }): void {
        super.initialize(config);
        if (!config.openaiApiKey) {
            throw new Error('OpenAI API key is required');
        }
        this.client = new OpenAI({
            apiKey: config.openaiApiKey,
            dangerouslyAllowBrowser: true
        });
    }

    async generateResponse(model: LLMModel, prompt: string): Promise<LLMResponse> {
        try {
            if (!this.client) {
                throw new Error('OpenAI client not initialized');
            }

            const completion = await this.client.chat.completions.create({
                model: model.name,
                messages: [{ role: 'user', content: prompt }],
            });

            const responseText = completion.choices[0]?.message?.content || '';
            
            return this.createResponse(model, prompt, responseText);
        } catch (error) {
            return this.createResponse(
                model,
                prompt,
                '',
                error instanceof Error ? error.message : 'Unknown error'
            );
        }
    }
}

export class GoogleProvider extends BaseLLMProvider {
    private client: GoogleGenerativeAI | null = null;

    initialize(config: { googleApiKey?: string }): void {
        super.initialize(config);
        if (!config.googleApiKey) {
            throw new Error('Google API key is required');
        }
        this.client = new GoogleGenerativeAI(config.googleApiKey);
    }

    async generateResponse(model: LLMModel, prompt: string): Promise<LLMResponse> {
        try {
            if (!this.client) {
                throw new Error('Google client not initialized');
            }

            const genModel = this.client.getGenerativeModel({ model: model.name });
            const result = await genModel.generateContent(prompt);
            const response = result.response;
            
            return this.createResponse(model, prompt, response.text());
        } catch (error) {
            return this.createResponse(
                model,
                prompt,
                '',
                error instanceof Error ? error.message : 'Unknown error'
            );
        }
    }
}

export class GroqProvider extends BaseLLMProvider {
    private client: any | null = null;  // Using any temporarily until we have proper types

    initialize(config: LLMConfig): void {
        super.initialize(config);
        if (!config.groqApiKey) {
            throw new Error('Groq API key is required');
        }
        this.client = new Groq({
            apiKey: config.groqApiKey,
            dangerouslyAllowBrowser: true
        });
    }

    async generateResponse(model: LLMModel, prompt: string): Promise<LLMResponse> {
        try {
            if (!this.client) {
                throw new Error('Groq client not initialized');
            }

            const completion = await this.client.chat.completions.create({
                model: model.name,
                messages: [{ role: 'user', content: prompt }],
            });

            const responseText = completion.choices[0]?.message?.content || '';
            
            return this.createResponse(model, prompt, responseText);
        } catch (error) {
            return this.createResponse(
                model,
                prompt,
                '',
                error instanceof Error ? error.message : 'Unknown error'
            );
        }
    }
}

// Provider registry - add new providers here
export const providers = {
    anthropic: new AnthropicProvider(),
    openai: new OpenAIProvider(),
    google: new GoogleProvider(),
    groq: new GroqProvider(),
} as const;

// Provider type derived from the registry
export type LLMProvider = keyof typeof providers;

// Models configuration - add new models here
export const models: LLMModel[] = [
    {
        "provider": "anthropic",
        "name": "claude-3-7-sonnet-20250219",
        "pricing": {
            "perMillionTokensInput": 3.00,
            "perMillionTokensOutput": 15.00
        }
    },
    {
        "provider": "anthropic",
        "name": "claude-3-5-haiku-20241022",
        "pricing": {
            "perMillionTokensInput": 0.80,
            "perMillionTokensOutput": 4.00
        }
    },
    {
        "provider": "anthropic",
        "name": "claude-3-opus-20240229",
        "pricing": {
            "perMillionTokensInput": 15.00,
            "perMillionTokensOutput": 75.00
        }
    },
    {
        "provider": "anthropic",
        "name": "claude-3-haiku-20240307",
        "pricing": {
            "perMillionTokensInput": 0.25,
            "perMillionTokensOutput": 1.25
        }
    },
    {
        "provider": "openai",
        "name": "gpt-4o",
        "pricing": {
            "perMillionTokensInput": 2.50,
            "perMillionTokensOutput": 10.00
        }
    },
    {
        "provider": "openai",
        "name": "gpt-4o-realtime-preview",
        "pricing": {
            "perMillionTokensInput": 5.00,
            "perMillionTokensOutput": 20.00
        }
    },
    {
        "provider": "openai",
        "name": "gpt-4o-mini",
        "pricing": {
            "perMillionTokensInput": 0.15,
            "perMillionTokensOutput": 0.60
        }
    },
    {
        "provider": "openai",
        "name": "gpt-4o-mini-realtime-preview",
        "pricing": {
            "perMillionTokensInput": 0.60,
            "perMillionTokensOutput": 2.40
        }
    },
    {
        "provider": "openai",
        "name": "o1",
        "pricing": {
            "perMillionTokensInput": 15.00,
            "perMillionTokensOutput": 60.00
        }
    },
    {
        "provider": "openai",
        "name": "o3-mini",
        "pricing": {
            "perMillionTokensInput": 1.10,
            "perMillionTokensOutput": 4.40
        }
    },
    {
        "provider": "openai",
        "name": "o1-mini",
        "pricing": {
            "perMillionTokensInput": 1.10,
            "perMillionTokensOutput": 4.40
        }
    },
    {
        "provider": "google",
        "name": "gemini-2.0-flash",
        "pricing": {
            "perMillionTokensInput": 0.10,
            "perMillionTokensOutput": 0.40
        }
    },
    {
        "provider": "google",
        "name": "gemini-2.0-flash-lite",
        "pricing": {
            "perMillionTokensInput": 0.075,
            "perMillionTokensOutput": 0.30
        }
    },
    {
        "provider": "google",
        "name": "gemini-1.5-flash",
        "pricing": {
            "perMillionTokensInput": 0.075,
            "perMillionTokensOutput": 0.30
        }
    },
    {
        "provider": "google",
        "name": "gemini-1.5-pro",
        "pricing": {
            "perMillionTokensInput": 1.25,
            "perMillionTokensOutput": 5.00
        }
    },
    {
        "provider": "groq",
        "name": "gemma2-9b-it",
        "pricing": {
            "perMillionTokensInput": 0.10,  // Placeholder pricing - adjust as needed
            "perMillionTokensOutput": 0.40
        }
    },
    {
        "provider": "groq",
        "name": "deepseek-r1-distill-qwen-32b",
        "pricing": {
            "perMillionTokensInput": 0.25,
            "perMillionTokensOutput": 1.00
        }
    },
    {
        "provider": "groq",
        "name": "llama-3.1-8b-instant",
        "pricing": {
            "perMillionTokensInput": 0.10,
            "perMillionTokensOutput": 0.40
        }
    },
    {
        "provider": "groq",
        "name": "llama-3.3-70b-versatile",
        "pricing": {
            "perMillionTokensInput": 0.50,
            "perMillionTokensOutput": 2.00
        }
    },
    {
        "provider": "groq",
        "name": "qwen-2.5-32b",
        "pricing": {
            "perMillionTokensInput": 0.25,
            "perMillionTokensOutput": 1.00
        }
    },
    {
        "provider": "groq",
        "name": "llama-guard-3-8b",
        "pricing": {
            "perMillionTokensInput": 0.10,
            "perMillionTokensOutput": 0.40
        }
    }
] as const;

// Factory with simplified initialization
export class LLMProviderFactory {
    private static initialized = false;

    static initialize(config: LLMConfig): void {
        if (this.initialized) return;

        Object.entries(providers).forEach(([provider, instance]) => {
            try {
                instance.initialize(config);
            } catch (error) {
                console.warn(`Failed to initialize ${provider} provider:`, error);
            }
        });

        this.initialized = true;
    }

    static getProvider(provider: LLMProvider) {
        if (!this.initialized) {
            throw new Error('LLMProviderFactory not initialized');
        }

        const instance = providers[provider];
        if (!instance) {
            throw new Error(`Provider ${provider} not found`);
        }

        return instance;
    }
} 