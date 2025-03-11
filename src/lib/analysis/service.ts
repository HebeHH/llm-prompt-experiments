import { AnalysisConfig, AnalysisData, AnalysisResult } from '@/lib/types/analysis';
import { LLMProviderFactory } from '@/lib/constants/llms';

export interface AnalysisProgress {
    totalPrompts: number;
    completedPrompts: number;
    modelProgress: Record<string, {
        total: number;
        completed: number;
        failed: number;
        errors: Array<{
            message: string;
            timestamp: number;
            isRateLimit: boolean;
        }>;
        errorCount: number;
        consecutiveErrorCount: number;
        disabled: boolean;
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
        // Get all possible combinations of prompt factors
        const combinations = this.generateCombinations();
        // Calculate total prompts per model: combinations × promptCovariates
        const totalPromptsPerModel = combinations.length * this.config.promptCovariates.length;
        const totalPrompts = this.config.models.length * totalPromptsPerModel;
        
        this.progress = {
            totalPrompts,
            completedPrompts: 0,
            modelProgress: {},
            stage: 'llm-responses'
        };

        this.config.models.forEach(model => {
            this.progress.modelProgress[model.name] = {
                total: totalPromptsPerModel,
                completed: 0,
                failed: 0,
                errors: [],
                errorCount: 0,
                consecutiveErrorCount: 0,
                disabled: false
            };
        });

        this.onProgress(this.progress);
    }

    private calculateTotalPrompts(): number {
        const combinations = this.generateCombinations();
        return this.config.models.length * combinations.length * this.config.promptCovariates.length;
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
        const MAX_TOTAL_ERROR_COUNT = 10;
        const MAX_CONSECUTIVE_ERROR_COUNT = 5;
        const INITIAL_BACKOFF_MS = 10000; // 10 seconds

        // Get all possible combinations of prompt factors
        const combinations = this.generateCombinations();

        // Step 1: Get LLM responses
        await Promise.all(this.config.models.map(async (model) => {
            const llm = LLMProviderFactory.getProvider(model.provider);
            const modelProgress = this.progress.modelProgress[model.name];

            for (let promptIdx = 0; promptIdx < this.config.promptCovariates.length && !modelProgress.disabled; promptIdx++) {
                const promptVariable = this.config.promptCovariates[promptIdx];

                for (const combination of combinations) {
                    // Skip if model has been disabled due to too many errors
                    if (modelProgress.disabled) break;

                    let success = false;
                    let backoffTime = INITIAL_BACKOFF_MS;
                    let retryCount = 0;

                    while (!success && retryCount < 3) {
                        try {
                            // Get prompts from the current combination
                            const categoryPrompts = combination.map(c => c.option.prompt);

                            // Create the full prompt
                            const prompt = this.config.promptFunction(categoryPrompts, promptVariable);

                            // Get the response
                            const llmResponse = await llm.generateResponse(model, prompt);

                            // Check if there was an error in the response
                            if (llmResponse.error) {
                                const isRateLimit = llmResponse.error.toLowerCase().includes('rate') || 
                                                   llmResponse.error.toLowerCase().includes('limit') ||
                                                   llmResponse.error.toLowerCase().includes('capacity') ||
                                                   llmResponse.error.toLowerCase().includes('too many');
                                
                                // Track the error
                                const errorInfo = {
                                    message: llmResponse.error,
                                    timestamp: Date.now(),
                                    isRateLimit
                                };
                                
                                modelProgress.errors.push(errorInfo);
                                modelProgress.errorCount++;
                                modelProgress.consecutiveErrorCount++;
                                
                                console.error(`Error from ${model.name}: ${llmResponse.error}`);
                                
                                // Check if we've hit the max error count (total or consecutive)
                                if (modelProgress.errorCount >= MAX_TOTAL_ERROR_COUNT || 
                                    modelProgress.consecutiveErrorCount >= MAX_CONSECUTIVE_ERROR_COUNT) {
                                    console.error(`Disabling model ${model.name} due to too many errors (${modelProgress.errorCount} total, ${modelProgress.consecutiveErrorCount} consecutive)`);
                                    modelProgress.disabled = true;
                                    modelProgress.failed += (modelProgress.total - modelProgress.completed - modelProgress.failed);
                                    this.onProgress({ ...this.progress });
                                    break;
                                }
                                
                                // If it's a rate limit error, implement exponential backoff
                                if (isRateLimit) {
                                    console.log(`Rate limit hit for ${model.name}, backing off for ${backoffTime/1000} seconds`);
                                    await new Promise(resolve => setTimeout(resolve, backoffTime));
                                    backoffTime *= 2; // Exponential backoff
                                    retryCount++;
                                    continue;
                                } else {
                                    // For non-rate limit errors, mark as failed and move on
                                    modelProgress.failed++;
                                    this.progress.completedPrompts++;
                                    this.onProgress({ ...this.progress });
                                    break;
                                }
                            }

                            // If we got here, we have a valid response
                            // Reset consecutive error count on success
                            modelProgress.consecutiveErrorCount = 0;
                            
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
                            modelProgress.completed++;
                            this.progress.completedPrompts++;
                            this.onProgress({ ...this.progress });
                        } catch (error) {
                            // This should rarely happen since the LLM providers catch their own errors
                            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                            console.error(`Unexpected error for model ${model.name}:`, errorMessage);
                            
                            // Track the error
                            const isRateLimit = errorMessage.toLowerCase().includes('rate') || 
                                               errorMessage.toLowerCase().includes('limit') ||
                                               errorMessage.toLowerCase().includes('capacity') ||
                                               errorMessage.toLowerCase().includes('too many');
                            
                            const errorInfo = {
                                message: errorMessage,
                                timestamp: Date.now(),
                                isRateLimit
                            };
                            
                            modelProgress.errors.push(errorInfo);
                            modelProgress.errorCount++;
                            modelProgress.consecutiveErrorCount++;
                            
                            // Check if we've hit the max error count (total or consecutive)
                            if (modelProgress.errorCount >= MAX_TOTAL_ERROR_COUNT || 
                                modelProgress.consecutiveErrorCount >= MAX_CONSECUTIVE_ERROR_COUNT) {
                                console.error(`Disabling model ${model.name} due to too many errors (${modelProgress.errorCount} total, ${modelProgress.consecutiveErrorCount} consecutive)`);
                                modelProgress.disabled = true;
                                modelProgress.failed += (modelProgress.total - modelProgress.completed - modelProgress.failed);
                                this.onProgress({ ...this.progress });
                                break;
                            }
                            
                            // If it's a rate limit error, implement exponential backoff
                            if (isRateLimit) {
                                console.log(`Rate limit hit for ${model.name}, backing off for ${backoffTime/1000} seconds`);
                                await new Promise(resolve => setTimeout(resolve, backoffTime));
                                backoffTime *= 2; // Exponential backoff
                                retryCount++;
                            } else {
                                // For non-rate limit errors, mark as failed and move on
                                modelProgress.failed++;
                                this.progress.completedPrompts++;
                                this.onProgress({ ...this.progress });
                                break;
                            }
                        }
                    }
                    
                    // If we've tried 3 times and still failed, mark as failed
                    if (!success && !modelProgress.disabled) {
                        modelProgress.failed++;
                        this.progress.completedPrompts++;
                        this.onProgress({ ...this.progress });
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