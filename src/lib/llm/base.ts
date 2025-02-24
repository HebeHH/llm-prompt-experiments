import { LLMConfig, LLMModel, LLMResponse } from '../types/llm';

export interface LLMProvider {
    initialize(config: LLMConfig): void;
    generateResponse(model: LLMModel, prompt: string): Promise<LLMResponse>;
}

export abstract class BaseLLMProvider implements LLMProvider {
    protected config: LLMConfig = {};

    initialize(config: LLMConfig): void {
        this.config = config;
    }

    abstract generateResponse(model: LLMModel, prompt: string): Promise<LLMResponse>;

    protected createResponse(model: LLMModel, prompt: string, response: string, error?: string): LLMResponse {
        return {
            model,
            prompt,
            response,
            error,
            timestamp: Date.now(),
        };
    }
} 