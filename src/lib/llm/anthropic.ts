import Anthropic from '@anthropic-ai/sdk';
import { BaseLLMProvider } from './base';
import { LLMModel, LLMResponse } from '../types/llm';

export class AnthropicProvider extends BaseLLMProvider {
    private client: Anthropic | null = null;

    initialize(config: { anthropicApiKey?: string }): void {
        super.initialize(config);
        if (!config.anthropicApiKey) {
            throw new Error('Anthropic API key is required');
        }
        this.client = new Anthropic({
            apiKey: config.anthropicApiKey,
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

            return this.createResponse(
                model,
                prompt,
                responseText
            );
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