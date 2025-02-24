import { AnalysisConfig, AnalysisData, AnalysisResult } from '../types/analysis';
import { LLMProviderFactory } from '../llm/factory';

export interface AnalysisProgress {
    totalPrompts: number;
    completedPrompts: number;
    modelProgress: Record<string, {
        total: number;
        completed: number;
        failed: number;
    }>;
}

export class AnalysisService {
    private config: AnalysisConfig;
    private results: AnalysisResult[] = [];
    private progress: AnalysisProgress;
    private progressCallback?: (progress: AnalysisProgress) => void;

    constructor(config: AnalysisConfig, onProgress?: (progress: AnalysisProgress) => void) {
        this.config = config;
        this.progressCallback = onProgress;
        this.progress = {
            totalPrompts: 0,
            completedPrompts: 0,
            modelProgress: {},
        };
    }

    async runAnalysis(): Promise<AnalysisData> {
        const allPrompts = this.generatePrompts();
        const results: AnalysisResult[] = [];

        // Initialize progress tracking
        this.progress.totalPrompts = allPrompts.length * this.config.models.length;
        this.progress.modelProgress = Object.fromEntries(
            this.config.models.map(model => [
                model.name,
                { total: allPrompts.length, completed: 0, failed: 0 }
            ])
        );
        this.updateProgress();

        // Run prompts in parallel for each model
        await Promise.all(this.config.models.map(async model => {
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

                    // Update progress
                    this.progress.completedPrompts++;
                    this.progress.modelProgress[model.name].completed++;
                    this.updateProgress();
                } catch (error) {
                    console.error(`Error analyzing prompt for model ${model.name}:`, error);
                    this.progress.modelProgress[model.name].failed++;
                    this.updateProgress();
                }
            }
        }));

        this.results = results;

        return {
            config: this.config,
            results: this.results,
            timestamp: Date.now(),
        };
    }

    private updateProgress() {
        if (this.progressCallback) {
            this.progressCallback({ ...this.progress });
        }
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