import { AnalysisConfig, AnalysisData, AnalysisResult } from '../types/analysis';
import { LLMProviderFactory } from '../llm/factory';

export class AnalysisService {
    private config: AnalysisConfig;
    private results: AnalysisResult[] = [];

    constructor(config: AnalysisConfig) {
        this.config = config;
    }

    async runAnalysis(): Promise<AnalysisData> {
        const allPrompts = this.generatePrompts();
        const results: AnalysisResult[] = [];

        for (const model of this.config.models) {
            const provider = LLMProviderFactory.getProvider(model.provider);

            for (const prompt of allPrompts) {
                try {
                    const llmResponse = await provider.generateResponse(model, prompt.prompt);
                    
                    // Calculate response attributes
                    const attributes: Record<string, number> = {};
                    for (const attr of this.config.responseAttributes) {
                        attributes[attr.name] = attr.function(llmResponse.response);
                    }

                    results.push({
                        llmResponse,
                        attributes,
                        categories: prompt.categories,
                    });
                } catch (error) {
                    console.error(`Error analyzing prompt for model ${model.name}:`, error);
                }
            }
        }

        this.results = results;

        return {
            config: this.config,
            results: this.results,
            timestamp: Date.now(),
        };
    }

    private generatePrompts(): Array<{ prompt: string; categories: Record<string, string> }> {
        const prompts: Array<{ prompt: string; categories: Record<string, string> }> = [];

        // Generate all possible combinations of categories
        const categoryNames = this.config.promptCategories.map(cat => cat.name);
        const categoryValues = this.config.promptCategories.map(cat => 
            cat.categories.map(c => ({ name: c.name, prompt: c.prompt }))
        );

        const generateCombinations = (
            current: { name: string; prompt: string }[],
            index: number
        ) => {
            if (index === categoryNames.length) {
                // For each combination, generate prompts with all variables
                for (const variable of this.config.promptVariables) {
                    const categoryPrompts = current.map(c => c.prompt);
                    const prompt = this.config.promptFunction(categoryPrompts, variable);
                    const categories = Object.fromEntries(
                        current.map((c, i) => [categoryNames[i], c.name])
                    );

                    prompts.push({ prompt, categories });
                }
                return;
            }

            for (const value of categoryValues[index]) {
                generateCombinations([...current, value], index + 1);
            }
        };

        generateCombinations([], 0);
        return prompts;
    }

    getResults(): AnalysisResult[] {
        return this.results;
    }
} 