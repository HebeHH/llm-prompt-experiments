import { AnalysisConfig, AnalysisData, AnalysisResult } from '@/lib/types/analysis';
import { LLMProviderFactory } from '@/lib/constants/llms';

export interface AnalysisProgress {
    completedPrompts: number;
    totalPrompts: number;
    modelProgress: Record<string, {
        completed: number;
        failed: number;
        total: number;
    }>;
}

export class AnalysisService {
    private config: AnalysisConfig;
    private onProgress?: (progress: AnalysisProgress) => void;
    private progress: AnalysisProgress;

    constructor(config: AnalysisConfig, onProgress?: (progress: AnalysisProgress) => void) {
        this.config = config;
        this.onProgress = onProgress;
        this.progress = {
            completedPrompts: 0,
            totalPrompts: 0,
            modelProgress: {}
        };
    }

    private initializeProgress() {
        // Calculate total prompts: number of prompt variables * number of category combinations
        const categoryOptionCombinations = this.calculateTotalCombinations();
        const totalPromptsPerModel = this.config.promptCovariates.length * categoryOptionCombinations;
        const modelProgress: Record<string, { completed: number; failed: number; total: number }> = {};

        this.config.models.forEach(model => {
            modelProgress[model.name] = {
                completed: 0,
                failed: 0,
                total: totalPromptsPerModel
            };
        });

        this.progress = {
            completedPrompts: 0,
            totalPrompts: this.config.models.length * totalPromptsPerModel,
            modelProgress
        };

        if (this.onProgress) {
            this.onProgress({ ...this.progress });
        }
    }

    private updateProgress(modelName: string, success: boolean) {
        if (this.progress.modelProgress[modelName]) {
            if (success) {
                this.progress.modelProgress[modelName].completed++;
            } else {
                this.progress.modelProgress[modelName].failed++;
            }
            this.progress.completedPrompts++;

            // Create a new object to ensure React detects the change
            const newProgress = {
                ...this.progress,
                modelProgress: {
                    ...this.progress.modelProgress,
                    [modelName]: { ...this.progress.modelProgress[modelName] }
                }
            };
            this.progress = newProgress;

            if (this.onProgress) {
                this.onProgress(newProgress);
            }
        }
    }

    private calculateTotalCombinations(): number {
        return this.config.promptFactors.reduce((total, category) => {
            return total * category.levels.length;
        }, 1);
    }

    private generateCategoryCombinations() {
        const categories = this.config.promptFactors;
        if (categories.length === 0) return [[]];

        const combinations: Array<Array<{ categoryName: string; option: { name: string; prompt: string } }>> = [[]];
        
        categories.forEach(category => {
            const newCombinations: Array<Array<{ categoryName: string; option: { name: string; prompt: string } }>> = [];
            
            combinations.forEach(combination => {
                category.levels.forEach(option => {
                    newCombinations.push([
                        ...combination,
                        { categoryName: category.name, option }
                    ]);
                });
            });
            
            combinations.length = 0;
            combinations.push(...newCombinations);
        });

        return combinations;
    }

    public async runAnalysis(): Promise<AnalysisData> {
        this.initializeProgress();
        const results: AnalysisResult[] = [];
        const retryLimit = 3;
        const categoryCombinations = this.generateCategoryCombinations();

        // Process all models in parallel, but keep each model's prompts sequential
        await Promise.all(this.config.models.map(async (model) => {
            const llm = LLMProviderFactory.getProvider(model.provider);

            for (let promptIdx = 0; promptIdx < this.config.promptCovariates.length; promptIdx++) {
                const promptVariable = this.config.promptCovariates[promptIdx];

                // Process each category combination
                for (const combination of categoryCombinations) {
                    let retryCount = 0;
                    let success = false;

                    while (retryCount < retryLimit && !success) {
                        try {
                            // Get prompts from the current combination
                            const categoryPrompts = combination.map(c => c.option.prompt);

                            // Create the full prompt
                            const prompt = this.config.promptFunction(categoryPrompts, promptVariable);

                            // Get the response
                            const llmResponse = await llm.generateResponse(model, prompt);

                            // Create the result object
                            const result: AnalysisResult = {
                                llmResponse: {
                                    model: model,
                                    response: llmResponse.response
                                },
                                factors: {},
                                responseVariables: {},
                                promptVariableIndex: promptIdx
                            };

                            // Add category information
                            combination.forEach(({ categoryName, option }) => {
                                result.factors[categoryName] = option.name;
                            });

                            // Calculate attributes
                            this.config.responseVariables.forEach(attr => {
                                result.responseVariables[attr.name] = attr.function(llmResponse.response);
                            });

                            results.push(result);
                            success = true;
                        } catch (error) {
                            retryCount++;
                            if (retryCount === retryLimit) {
                                console.error(`Failed to get response after ${retryLimit} attempts for model ${model.name}`);
                            }
                        }
                    }

                    this.updateProgress(model.name, success);
                }
            }
        }));

        return {
            config: this.config,
            results
        };
    }
} 