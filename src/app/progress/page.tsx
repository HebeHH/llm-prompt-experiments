'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnalysisService, AnalysisProgress } from '@/lib/analysis/service';
import { AnalysisConfig, AnalysisData, ResponseVariable } from '@/lib/types/analysis';
import { LLMProvider } from '@/lib/types/llm';
import { LLMProviderFactory } from '@/lib/constants/llms';
import { resultAttributes } from '@/lib/constants/resultAttributes';
import { Header } from '@/components/layout/Header';
import { getApiKeys } from '@/lib/utils/apiKeyManager';

type ExtendedProvider = LLMProvider | 'jigsaw';

// Default prompt function to use when restoring from localStorage
const defaultPromptFunction = (promptFactors: string[], variable: string) => {
    return `${promptFactors.join("\n")}\n${variable}`;
};

export default function ProgressPage() {
    const router = useRouter();
    const [progress, setProgress] = useState<AnalysisProgress | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isAnalysisStarted, setIsAnalysisStarted] = useState(false);

    useEffect(() => {
        const runAnalysis = async () => {
            if (isAnalysisStarted) return;
            setIsAnalysisStarted(true);
            
            try {
                // Get config from localStorage
                const configJson = localStorage.getItem('experimentConfig');
                
                if (!configJson) {
                    throw new Error("Missing configuration. Please go back to the experiment creation page.");
                }
                
                // Get API keys from our centralized manager
                const apiKeys = getApiKeys();
                
                // Check if we have any API keys
                if (Object.values(apiKeys).every(key => !key)) {
                    throw new Error("Missing API keys. Please go back to the experiment creation page.");
                }
                
                const parsedConfig = JSON.parse(configJson);
                
                // Create a function to restore response variable functions
                const restoreResponseVariableFunctions = (variables: ResponseVariable[]): ResponseVariable[] => {
                    return variables.map(variable => {
                        // Find the matching variable in resultAttributes
                        const matchingAttribute = resultAttributes.find(attr => attr.name === variable.name);
                        if (matchingAttribute) {
                            // Restore the function from the matching attribute
                            return {
                                ...variable,
                                function: matchingAttribute.function,
                                requiresApiCall: matchingAttribute.requiresApiCall
                            };
                        }
                        return variable;
                    });
                };
                
                // Restore the prompt function and response variable functions
                const config: AnalysisConfig = {
                    ...parsedConfig,
                    promptFunction: defaultPromptFunction,
                    responseVariables: restoreResponseVariableFunctions(parsedConfig.responseVariables)
                };
                
                // Initialize LLM providers with API keys
                try {
                    LLMProviderFactory.initialize({
                        anthropicApiKey: apiKeys.anthropic,
                        googleApiKey: apiKeys.google,
                        openaiApiKey: apiKeys.openai,
                        groqApiKey: apiKeys.groq
                    });
                } catch (error) {
                    console.error("Error initializing LLM providers:", error);
                    throw new Error("Failed to initialize LLM providers. Please check your API keys.");
                }

                // Create a copy of the config with the API keys
                const configWithApiKeys = {
                    ...config,
                    responseVariables: config.responseVariables.map(variable => {
                        if (variable.type === 'sentiment-api') {
                            return {
                                ...variable,
                                config: {
                                    name: variable.name,
                                    description: variable.description,
                                    apiKey: apiKeys.jigsaw
                                }
                            };
                        }
                        return variable;
                    })
                };

                // Run the analysis
                const analysisService = new AnalysisService(configWithApiKeys, (progress) => {
                    setProgress(progress);
                });
                
                const results = await analysisService.runAnalysis();
                
                // Save results to localStorage
                // Store the config without the function
                const resultsForStorage = {
                    ...results,
                    config: {
                        ...results.config,
                        promptFunction: undefined,
                        responseVariables: results.config.responseVariables.map(variable => ({
                            ...variable,
                            function: undefined,
                        }))
                    }
                };
                
                localStorage.setItem('analysisResults', JSON.stringify(resultsForStorage));
                localStorage.setItem('usingDefaultPromptFunction', 'true');
                
                // Navigate to results page
                router.push('/results');
            } catch (error) {
                console.error("Error running analysis:", error);
                setError(error instanceof Error ? error.message : 'An error occurred');
            }
        };

        runAnalysis();
    }, [router]);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <main className="min-h-screen bg-teal-900 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <Header />
                
                {progress && (
                    <div className="bg-white rounded-xl shadow-xl overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-violet-200 bg-violet-100">
                            <h2 className="text-xl font-semibold text-violet-900">Analysis Progress</h2>
                        </div>
                        <div className="p-6">
                            <div className="mb-6">
                                <div className="flex justify-between text-sm font-medium mb-2">
                                    <span>Stage:</span>
                                    <span className="capitalize">
                                        {progress.stage === 'llm-responses' ? 'Getting LLM Responses' : 'Calculating Result Variables'}
                                    </span>
                                </div>
                                {progress.stage === 'llm-responses' && (
                                    <>
                                        <div className="flex justify-between text-sm font-medium mb-2">
                                            <span>Overall Progress:</span>
                                            <span>
                                                {progress.completedPrompts} / {progress.totalPrompts} prompts
                                                {' '}({Math.round((progress.completedPrompts / progress.totalPrompts) * 100)}%)
                                            </span>
                                        </div>
                                        <div className="h-3 bg-violet-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-teal-500 transition-all duration-500 ease-in-out"
                                                style={{
                                                    width: `${(progress.completedPrompts / progress.totalPrompts) * 100}%`
                                                }}
                                            />
                                        </div>
                                    </>
                                )}
                                {progress.stage === 'result-variables' && progress.resultVariablesProgress && (
                                    <>
                                        <div className="flex justify-between text-sm font-medium mb-2">
                                            <span>Result Variables Progress:</span>
                                            <span>
                                                {progress.resultVariablesProgress.completed} / {progress.resultVariablesProgress.total} calculations
                                                {' '}({Math.round((progress.resultVariablesProgress.completed / progress.resultVariablesProgress.total) * 100)}%)
                                            </span>
                                        </div>
                                        <div className="h-3 bg-violet-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-teal-500 transition-all duration-500 ease-in-out"
                                                style={{
                                                    width: `${(progress.resultVariablesProgress.completed / progress.resultVariablesProgress.total) * 100}%`
                                                }}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                            {progress.stage === 'llm-responses' && (
                                <div className="space-y-4">
                                    {Object.entries(progress.modelProgress).map(([model, stats]) => (
                                        <div key={model} className="space-y-2">
                                            <div className="flex justify-between text-sm font-medium">
                                                <span>{model}:</span>
                                                <span>
                                                    {stats.completed} / {stats.total} prompts
                                                    {stats.failed > 0 && ` (${stats.failed} failed)`}
                                                    {stats.disabled && ' - DISABLED'}
                                                    {' '}({Math.round(((stats.completed + stats.failed) / stats.total) * 100)}%)
                                                </span>
                                            </div>
                                            <div className="h-2 bg-violet-100 rounded-full overflow-hidden">
                                                <div className="flex h-full">
                                                    <div
                                                        className="h-full bg-teal-500 transition-all duration-500 ease-in-out"
                                                        style={{
                                                            width: `${(stats.completed / stats.total) * 100}%`
                                                        }}
                                                    />
                                                    {stats.failed > 0 && (
                                                        <div
                                                            className="h-full bg-red-500 transition-all duration-500 ease-in-out"
                                                            style={{
                                                                width: `${(stats.failed / stats.total) * 100}%`
                                                            }}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                            {stats.errors.length > 0 && (
                                                <div className="mt-2 p-3 bg-red-50 rounded-md border border-red-200">
                                                    <h4 className="text-sm font-medium text-red-700 mb-1">
                                                        {stats.errors.length} Error{stats.errors.length !== 1 ? 's' : ''}
                                                    </h4>
                                                    <div className="text-xs text-red-600 mb-2">
                                                        {stats.failed > 0 && `${stats.failed} skipped, `}
                                                        {stats.disabled ? 
                                                            <span className="font-medium">Model disabled</span> : 
                                                            stats.consecutiveErrorCount > 0 ? 
                                                                <span>Backing off</span> : 
                                                                stats.resumedAfterError ? 
                                                                    <span>Successfully resumed</span> : 
                                                                    <span>Processing</span>
                                                        }
                                                        {stats.consecutiveErrorCount > 0 && 
                                                            <span className="block italic mt-1">{stats.consecutiveErrorCount} consecutive error{stats.consecutiveErrorCount !== 1 ? 's' : ''}</span>
                                                        }
                                                    </div>
                                                    
                                                    {/* Group errors by error code */}
                                                    <div className="text-xs text-red-600">
                                                        {(() => {
                                                            // Count errors by code
                                                            const errorCounts: Record<string, number> = {};
                                                            stats.errors.forEach(error => {
                                                                const code = error.errorCode || (error.isRateLimit ? 'Rate limit' : 'Unknown');
                                                                errorCounts[code] = (errorCounts[code] || 0) + 1;
                                                            });
                                                            
                                                            // Display counts
                                                            return Object.entries(errorCounts).map(([code, count]) => (
                                                                <div key={code}>
                                                                    {count}x {code === 'Rate limit' ? 
                                                                        '⏱️ Rate limit' : 
                                                                        code === '429' ? 
                                                                            '⏱️ 429 Rate limit' : 
                                                                            code === '403' ? 
                                                                                '🔒 403 Forbidden' : 
                                                                                code === '401' ? 
                                                                                    '🔑 401 Unauthorized' : 
                                                                                    code === '500' || code === '502' || code === '503' || code === '504' ? 
                                                                                        `⚠️ ${code} Server error` : 
                                                                                        `❌ ${code}`}
                                                                </div>
                                                            ));
                                                        })()}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {error && (
                    <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-xl font-medium">
                        <p>{error}</p>
                        <div className="mt-4 flex justify-center">
                            <button
                                onClick={() => router.push('/create')}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                            >
                                Back to Experiment Creation
                            </button>
                        </div>
                    </div>
                )}

                {!progress && !error && (
                    <div className="bg-white rounded-xl shadow-xl p-8 text-center">
                        <div className="animate-pulse">
                            <div className="h-8 bg-violet-100 rounded w-1/2 mx-auto mb-4"></div>
                            <div className="h-4 bg-violet-100 rounded w-3/4 mx-auto mb-2"></div>
                            <div className="h-4 bg-violet-100 rounded w-2/3 mx-auto mb-2"></div>
                            <div className="h-4 bg-violet-100 rounded w-1/2 mx-auto"></div>
                        </div>
                        <p className="mt-6 text-gray-600">Initializing analysis...</p>
                    </div>
                )}
            </div>
        </main>
    );
} 