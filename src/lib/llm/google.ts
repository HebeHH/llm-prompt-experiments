import { GoogleGenerativeAI } from '@google/generative-ai';
import { BaseLLMProvider } from './base';
import { LLMModel, LLMResponse } from '../types/llm';

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
            
            return this.createResponse(
                model,
                prompt,
                response.text()
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