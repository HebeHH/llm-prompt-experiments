import { LLMModel } from './llm';

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
    dataType: 'numerical' | 'categorical';
    function: (response: string) => number | string;
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
    llmResponse: {
        model: LLMModel;
        response: string;
    };
    categories: Record<string, string>;
    attributes: Record<string, number | string>;
    promptVariableIndex: number;
}

export interface AnalysisData {
    config: AnalysisConfig;
    results: AnalysisResult[];
} 