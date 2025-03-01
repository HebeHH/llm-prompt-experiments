import { LLMModel } from './llm';

export interface PromptFactor {
    name: string;
    levels: {
        name: string;
        prompt: string;
    }[];
}

export interface ResponseVariableConfig {
    name: string;
    description: string;
}

export interface WordOccurrenceConfig extends ResponseVariableConfig {
    searchTerm: string;
}

export interface SentimentConfig extends ResponseVariableConfig {
    apiKey: string;
}

export type ResponseVariableType = 'simple' | 'word-occurrence' | 'sentiment-api';

export interface ResponseVariable {
    name: string;
    description: string;
    type: ResponseVariableType;
    dataType: 'numerical' | 'categorical';
    config?: WordOccurrenceConfig | SentimentConfig;
    function: (response: string, config?: any) => Promise<number | string> | number | string;
    requiresApiCall?: boolean;
}

export interface AnalysisConfig {
    name: string;
    description: string;
    models: LLMModel[];
    promptFactors: PromptFactor[];
    promptCovariates: string[];
    responseVariables: ResponseVariable[];
    promptFunction: (categories: string[], variable: string) => string;
}

export interface AnalysisResult {
    llmResponse: {
        model: LLMModel;
        response: string;
    };
    factors: Record<string, string>;
    responseVariables: Record<string, number | string>;
    promptVariableIndex: number;
}

export interface AnalysisData {
    config: AnalysisConfig;
    results: AnalysisResult[];
} 