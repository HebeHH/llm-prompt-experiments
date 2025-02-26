import { LLMModel, LLMResponse } from './llm';

export interface PromptCategory {
    name: string;
    categories: {
        name: string;
        prompt: string;
    }[];
}

export interface ResponseAttribute {
    name: string;
    description: string;
    function: (response: string) => number;
}

export interface AnalysisConfig {
    name: string;
    description: string;
    models: LLMModel[];
    promptCategories: PromptCategory[];
    promptVariables: string[];
    responseAttributes: ResponseAttribute[];
    promptFunction: (categories: string[], variable: string) => string;
}

export interface AnalysisResult {
    llmResponse: LLMResponse;
    attributes: Record<string, number>;
    categories: Record<string, string>;
}

export interface AnalysisData {
    config: AnalysisConfig;
    results: AnalysisResult[];
    timestamp: number;
} 