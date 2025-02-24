import OpenAI from 'openai';
import { BaseLLMProvider } from './base';
import { LLMModel, LLMResponse } from '../types/llm';

export class OpenAIProvider extends BaseLLMProvider {
    private client: OpenAI | null = null;

    initialize(config: { openaiApiKey?: string }): void {
        super.initialize(config);
        if (!config.openaiApiKey) {
            throw new Error('OpenAI API key is required');
        }
        this.client = new OpenAI({
            apiKey: config.openaiApiKey,
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