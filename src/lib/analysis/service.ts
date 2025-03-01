import { AnalysisConfig, AnalysisData, AnalysisResult } from '@/lib/types/analysis';
import { LLMProviderFactory } from '@/lib/constants/llms';

export interface AnalysisProgress {
    totalPrompts: number;
    completedPrompts: number;
    modelProgress: Record<string, {
        total: number;
        completed: number;
        failed: number;
    }>;
    stage: 'llm-responses' | 'result-variables';
    resultVariablesProgress?: {
        total: number;
        completed: number;
        failed: number;
    };
}

export class AnalysisService {
    private config: AnalysisConfig;
    private onProgress: (progress: AnalysisProgress) => void;
    private progress: AnalysisProgress;

    constructor(config: AnalysisConfig, onProgress: (progress: AnalysisProgress) => void) {
        this.config = config;
        this.onProgress = onProgress;
        this.progress = {
            totalPrompts: 0,
            completedPrompts: 0,
            modelProgress: {},
            stage: 'llm-responses'
        };
    }

    private initializeProgress() {
        const totalPrompts = this.calculateTotalPrompts();
        this.progress = {
            totalPrompts,
            completedPrompts: 0,
            modelProgress: {},
            stage: 'llm-responses'
        };

        this.config.models.forEach(model => {
            this.progress.modelProgress[model.name] = {
                total: this.config.promptCovariates.length,
                completed: 0,
                failed: 0
            };
        });

        this.onProgress(this.progress);
    }

    private calculateTotalPrompts(): number {
        return this.config.models.length * this.config.promptCovariates.length;
    }

    private updateProgress(model: string, success: boolean) {
        if (success) {
            this.progress.modelProgress[model].completed++;
        } else {
            this.progress.modelProgress[model].failed++;
        }
        this.progress.completedPrompts++;
        this.onProgress({ ...this.progress });
    }

    private initializeResultVariablesProgress(results: AnalysisResult[]) {
        const apiVariables = this.config.responseVariables.filter(v => v.requiresApiCall);
        if (apiVariables.length > 0) {
            this.progress.stage = 'result-variables';
            this.progress.resultVariablesProgress = {
                total: results.length * apiVariables.length,
                completed: 0,
                failed: 0
            };
            this.onProgress({ ...this.progress });
        }
    }

    private updateResultVariablesProgress(success: boolean) {
        if (this.progress.resultVariablesProgress) {
            if (success) {
                this.progress.resultVariablesProgress.completed++;
            } else {
                this.progress.resultVariablesProgress.failed++;
            }
            this.onProgress({ ...this.progress });
        }
    }

    public async runAnalysis(): Promise<AnalysisData> {
        this.initializeProgress();
        const results: AnalysisResult[] = [];
        const retryLimit = 3;

        // Get all possible combinations of prompt factors
        const combinations = this.generateCombinations();

        // Step 1: Get LLM responses
        await Promise.all(this.config.models.map(async (model) => {
            const llm = LLMProviderFactory.getProvider(model.provider);

            for (let promptIdx = 0; promptIdx < this.config.promptCovariates.length; promptIdx++) {
                const promptVariable = this.config.promptCovariates[promptIdx];

                for (const combination of combinations) {
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

                            results.push(result);
                            success = true;
                            this.updateProgress(model.name, true);
                        } catch (error) {
                            retryCount++;
                            if (retryCount === retryLimit) {
                                this.updateProgress(model.name, false);
                                console.error(`Failed to get response after ${retryLimit} attempts for model ${model.name}`);
                            }
                        }
                    }
                }
            }
        }));

        // Step 2: Calculate result variables
        this.initializeResultVariablesProgress(results);

        // First handle non-API result variables
        const simpleVariables = this.config.responseVariables.filter(v => !v.requiresApiCall);
        for (const result of results) {
            for (const attr of simpleVariables) {
                try {
                    result.responseVariables[attr.name] = await attr.function(result.llmResponse.response, attr.config);
                } catch (error) {
                    console.error(`Failed to calculate ${attr.name}:`, error);
                    result.responseVariables[attr.name] = attr.dataType === 'numerical' ? 0 : 'error';
                }
            }
        }

        // Then handle API-based result variables
        const apiVariables = this.config.responseVariables.filter(v => v.requiresApiCall);
        if (apiVariables.length > 0) {
            for (const result of results) {
                for (const attr of apiVariables) {
                    try {
                        result.responseVariables[attr.name] = await attr.function(
                            result.llmResponse.response,
                            attr.config
                        );
                        this.updateResultVariablesProgress(true);
                    } catch (error) {
                        console.error(`Failed to calculate ${attr.name}:`, error);
                        result.responseVariables[attr.name] = attr.dataType === 'numerical' ? 0 : 'error';
                        this.updateResultVariablesProgress(false);
                    }
                }
            }
        }

        return {
            config: this.config,
            results: results
        };
    }

    private generateCombinations() {
        const combinations: Array<Array<{ categoryName: string; option: { name: string; prompt: string } }>> = [[]];

        this.config.promptFactors.forEach(category => {
            const temp: typeof combinations = [];
            combinations.forEach(combo => {
                category.levels.forEach(option => {
                    temp.push([...combo, { categoryName: category.name, option }]);
                });
            });
            combinations.length = 0;
            combinations.push(...temp);
        });

        return combinations;
    }
} 