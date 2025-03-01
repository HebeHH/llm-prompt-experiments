import { LLMModel } from './llm';

export interface PromptFactor {
    name: string;
    levels: {
        name: string;
        prompt: string;
    }[];
}

export interface ResponseVariable {
    name: string;
    description: string;
    dataType: 'numerical' | 'categorical';
    function: (response: string) => number | string;
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