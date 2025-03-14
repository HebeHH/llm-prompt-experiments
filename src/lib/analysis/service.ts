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
            errorCode?: string;
        }>;
        errorCount: number;
        consecutiveErrorCount: number;
        disabled: boolean;
        resumedAfterError?: boolean;
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
        const totalPromptsPerModel = combinations.length * this.config.promptNoise.length;
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
                disabled: false,
                resumedAfterError: false
            };
        });

        // Create a deep copy to avoid reference issues
        this.onProgress(JSON.parse(JSON.stringify(this.progress)));
    }

    private calculateTotalPrompts(): number {
        const combinations = this.generateCombinations();
        return this.config.models.length * combinations.length * this.config.promptNoise.length;
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
            // Create a deep copy to avoid reference issues
            this.onProgress(JSON.parse(JSON.stringify(this.progress)));
        }
    }

    private updateResultVariablesProgress(success: boolean) {
        if (this.progress.resultVariablesProgress) {
            // Create a deep copy of the progress object
            const updatedProgress = JSON.parse(JSON.stringify(this.progress));
            
            if (success) {
                updatedProgress.resultVariablesProgress.completed++;
            } else {
                updatedProgress.resultVariablesProgress.failed++;
            }
            
            // Update the internal progress state
            this.progress = updatedProgress;
            
            // Send the updated progress to the callback
            this.onProgress(updatedProgress);
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
        try {
            await Promise.all(this.config.models.map(async (model) => {
                try {
                    const llm = LLMProviderFactory.getProvider(model.provider);
                    const modelProgress = this.progress.modelProgress[model.name];

                    for (let promptIdx = 0; promptIdx < this.config.promptNoise.length && !modelProgress.disabled; promptIdx++) {
                        const promptVariable = this.config.promptNoise[promptIdx];

                        for (const combination of combinations) {
                            if (modelProgress.disabled) break;

                            // Generate the prompt
                            const promptFactors = combination.map(({ option }) => option.prompt);
                            const prompt = this.config.promptFunction(promptFactors, promptVariable);

                            let success = false;
                            let retryCount = 0;
                            let backoffTime = INITIAL_BACKOFF_MS;

                            while (!success && retryCount < 3) {
                                try {
                                    // If we're retrying, wait for the backoff time
                                    if (retryCount > 0) {
                                        await new Promise(resolve => setTimeout(resolve, backoffTime));
                                        // Increase backoff time for next retry (exponential backoff)
                                        backoffTime *= 2;
                                    }

                                    retryCount++;
                                    const llmResponse = await llm.generateResponse(model, prompt);

                                    // If we got here, we have a valid response
                                    // Reset consecutive error count on success
                                    modelProgress.consecutiveErrorCount = 0;
                                    
                                    // If we had errors before, mark that we've resumed successfully
                                    if (modelProgress.errorCount > 0) {
                                        modelProgress.resumedAfterError = true;
                                    }
                                    
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
                                    
                                    // Create a deep copy of the progress object
                                    const updatedProgress = JSON.parse(JSON.stringify(this.progress));
                                    updatedProgress.modelProgress[model.name].completed++;
                                    updatedProgress.completedPrompts++;
                                    
                                    // Update the internal progress state
                                    this.progress = updatedProgress;
                                    
                                    // Send the updated progress to the callback
                                    this.onProgress(updatedProgress);
                                } catch (error) {
                                    // This should rarely happen since the LLM providers catch their own errors
                                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                                    console.error(`Unexpected error for model ${model.name}:`, errorMessage);
                                    
                                    // Extract error code if present
                                    let errorCode = '';
                                    if (errorMessage.includes('429')) errorCode = '429';
                                    else if (errorMessage.includes('403')) errorCode = '403';
                                    else if (errorMessage.includes('401')) errorCode = '401';
                                    else if (errorMessage.includes('500')) errorCode = '500';
                                    else if (errorMessage.includes('502')) errorCode = '502';
                                    else if (errorMessage.includes('503')) errorCode = '503';
                                    else if (errorMessage.includes('504')) errorCode = '504';
                                    
                                    // Check if it's a rate limit error
                                    const isRateLimit = errorMessage.toLowerCase().includes('rate limit') || 
                                                        errorMessage.includes('429') || 
                                                        errorMessage.toLowerCase().includes('too many requests');
                                    
                                    // Create a deep copy of the progress object
                                    const updatedProgress = JSON.parse(JSON.stringify(this.progress));
                                    
                                    const errorInfo = {
                                        message: errorMessage,
                                        timestamp: Date.now(),
                                        isRateLimit,
                                        errorCode
                                    };
                                    
                                    updatedProgress.modelProgress[model.name].errors.push(errorInfo);
                                    updatedProgress.modelProgress[model.name].errorCount++;
                                    updatedProgress.modelProgress[model.name].consecutiveErrorCount++;
                                    
                                    // Check if we've hit the max error count (total or consecutive)
                                    if (updatedProgress.modelProgress[model.name].errorCount >= MAX_TOTAL_ERROR_COUNT || 
                                        updatedProgress.modelProgress[model.name].consecutiveErrorCount >= MAX_CONSECUTIVE_ERROR_COUNT) {
                                        console.error(`Disabling model ${model.name} due to too many errors (${updatedProgress.modelProgress[model.name].errorCount} total, ${updatedProgress.modelProgress[model.name].consecutiveErrorCount} consecutive)`);
                                        updatedProgress.modelProgress[model.name].disabled = true;
                                        updatedProgress.modelProgress[model.name].failed += (updatedProgress.modelProgress[model.name].total - updatedProgress.modelProgress[model.name].completed - updatedProgress.modelProgress[model.name].failed);
                                        
                                        // Update the internal progress state
                                        this.progress = updatedProgress;
                                        
                                        // Send the updated progress to the callback
                                        this.onProgress(updatedProgress);
                                        break;
                                    }
                                    
                                    // Update the internal progress state
                                    this.progress = updatedProgress;
                                    
                                    // Send the updated progress to the callback
                                    this.onProgress(updatedProgress);
                                    
                                    // If we've reached the max retries, mark this prompt as failed
                                    if (retryCount >= 3) {
                                        // Create a deep copy of the progress object
                                        const finalProgress = JSON.parse(JSON.stringify(this.progress));
                                        finalProgress.modelProgress[model.name].failed++;
                                        
                                        // Update the internal progress state
                                        this.progress = finalProgress;
                                        
                                        // Send the updated progress to the callback
                                        this.onProgress(finalProgress);
                                    }
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error(`Fatal error for model ${model.name}:`, error);
                }
            }));
        } catch (error) {
            console.error("Fatal error in LLM responses:", error);
        }

        this.initializeResultVariablesProgress(results);

        try {
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
        } catch (error) {
            console.error("Fatal error in result variables calculation:", error);
        }

        return {
            config: this.config,
            results: results
        };
    }

    private generateCombinations() {
        // If no prompt factors, return an empty array
        if (this.config.promptFactors.length === 0) {
            return [[]];
        }

        // Generate all possible combinations of prompt factors
        const combinations: Array<Array<{ categoryName: string; option: { name: string; prompt: string } }>> = [];

        const generateCombinationsRecursive = (
            currentIndex: number,
            currentCombination: Array<{ categoryName: string; option: { name: string; prompt: string } }>
        ) => {
            if (currentIndex === this.config.promptFactors.length) {
                combinations.push([...currentCombination]);
                return;
            }

            const currentFactor = this.config.promptFactors[currentIndex];
            for (const option of currentFactor.levels) {
                currentCombination.push({
                    categoryName: currentFactor.name,
                    option: { name: option.name, prompt: option.prompt }
                });
                generateCombinationsRecursive(currentIndex + 1, currentCombination);
                currentCombination.pop();
            }
        };

        generateCombinationsRecursive(0, []);
        return combinations;
    }
} 