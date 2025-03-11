'use client';

import React, { useState } from 'react';
import { ExperimentCreator } from '@/components/experiment/ExperimentCreator';
import { ResultsVisualization } from '@/components/analysis/ResultsVisualization';
import { AnalysisService, AnalysisProgress } from '@/lib/analysis/service';
import { LLMProviderFactory } from '@/lib/constants/llms';
import { AnalysisData, AnalysisConfig } from '@/lib/types/analysis';
import { LLMProvider } from '@/lib/types/llm';

type ExtendedProvider = LLMProvider | 'jigsaw';

interface ExperimentConfigViewProps {
    config: AnalysisConfig;
    onClose: () => void;
}

const ExperimentConfigView: React.FC<ExperimentConfigViewProps> = ({ config, onClose }) => {
    return (
        <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold">Experiment Configuration</h3>
                <button
                    onClick={onClose}
                    className="text-gray-500 hover:text-gray-700"
                >
                    <span className="sr-only">Close panel</span>
                    ×
                </button>
            </div>
            <div className="space-y-6">
                <div>
                    <h4 className="font-medium mb-2">Selected Models</h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-600">
                        {config.models.map(model => (
                            <li key={model.name}>{model.name} ({model.provider})</li>
                        ))}
                    </ul>
                </div>
                <div>
                    <h4 className="font-medium mb-2">Prompt Factors</h4>
                    <div className="space-y-4">
                        {config.promptFactors.map(factor => (
                            <div key={factor.name} className="bg-gray-50 p-4 rounded-lg">
                                <h5 className="font-medium mb-2">{factor.name}</h5>
                                <ul className="list-disc list-inside space-y-1 text-gray-600">
                                    {factor.levels.map(level => (
                                        <li key={level.name}>
                                            {level.name}
                                            {level.prompt && (
                                                <span className="text-gray-500"> - {level.prompt}</span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
                <div>
                    <h4 className="font-medium mb-2">Prompt Covariates</h4>
                    <ul className="list-decimal list-inside space-y-1 text-gray-600">
                        {config.promptCovariates.map((variable, index) => (
                            <li key={index} className="flex items-start">
                                <span className="mr-2">{index + 1}.</span>
                                <span className="flex-1">{variable}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                <div>
                    <h4 className="font-medium mb-2">Response Variables</h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-600">
                        {config.responseVariables.map(attr => (
                            <li key={attr.name}>
                                {attr.name}
                                <span className="text-gray-500"> - {attr.description}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default function Home() {
    const [currentView, setCurrentView] = useState<'create' | 'progress' | 'results'>('create');
    const [showExperimentPanel, setShowExperimentPanel] = useState(false);
    const [showConfigView, setShowConfigView] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [apiKeys, setApiKeys] = useState<Record<ExtendedProvider, string>>({
        anthropic: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || '',
        google: process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '',
        openai: process.env.NEXT_PUBLIC_OPENAI_API_KEY || '',
        groq: process.env.NEXT_PUBLIC_GROQ_API_KEY || '',
        jigsaw: process.env.NEXT_PUBLIC_JIGSAW_API_KEY || ''
    });
    const [config, setConfig] = useState<AnalysisConfig>({
        name: 'New Experiment',
        description: 'A new experiment configuration',
        models: [],
        promptFactors: [],
        promptCovariates: [],
        responseVariables: [],
        promptFunction: (promptFactors: string[], variable: string) => {
            return `${promptFactors.join("\n")}\n${variable}`;
        },
    });
    const [results, setResults] = useState<AnalysisData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState<AnalysisProgress | null>(null);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleRunAnalysis = async () => {
        setIsRunning(true);
        setCurrentView('progress');
        setShowExperimentPanel(false);
        scrollToTop();
        setError(null);
        setProgress(null);

        try {
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

            const analysisService = new AnalysisService(configWithApiKeys, (progress) => {
                setProgress(progress);
            });
            const results = await analysisService.runAnalysis();
            setResults(results);
            setCurrentView('results');
            scrollToTop();
        } catch (error) {
            console.error("Error running analysis:", error);
            setError(error instanceof Error ? error.message : 'An error occurred');
            setCurrentView('create');
        } finally {
            setIsRunning(false);
        }
    };

    const handleNewExperiment = () => {
        setShowExperimentPanel(true);
        setShowConfigView(false);
    };

    const handleShowConfig = () => {
        setShowConfigView(true);
        setShowExperimentPanel(false);
    };

    const handleApiKeysChange = (keys: Record<ExtendedProvider, string>) => {
        setApiKeys(keys);
    };

    return (
        <main className="min-h-screen bg-teal-900 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-white">
                        s<span className="text-violet-300">hebe</span>testing
                    </h1>
                    {currentView === 'results' && (
                        <div className="flex gap-4">
                            <button
                                onClick={handleNewExperiment}
                                className="px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600 font-medium"
                            >
                                New Experiment
                            </button>
                            <button
                                onClick={handleShowConfig}
                                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium"
                            >
                                Show Configuration
                            </button>
                        </div>
                    )}
                </div>

                <div className="space-y-8">
                    {/* Create Experiment Panel */}
                    {(currentView === 'create' || showExperimentPanel) && (
                        <div className="bg-white rounded-xl shadow-xl flex flex-col h-[calc(100vh-12rem)]">
                            {currentView === 'results' && (
                                <div className="flex justify-end px-4 py-2">
                                    <button
                                        onClick={() => setShowExperimentPanel(false)}
                                        className="text-violet-500 hover:text-violet-700 p-1"
                                    >
                                        <span className="sr-only">Close panel</span>
                                        ×
                                    </button>
                                </div>
                            )}
                            <ExperimentCreator
                                onConfigChange={setConfig}
                                onRunAnalysis={handleRunAnalysis}
                                isRunning={isRunning}
                                onApiKeysChange={handleApiKeysChange}
                            />
                        </div>
                    )}

                    {/* Progress Panel */}
                    {currentView === 'progress' && progress && (
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

                    {/* Configuration View and Results Panel */}
                    {currentView === 'results' && results && !showExperimentPanel && (
                        <div className="space-y-8">
                            {showConfigView && (
                                <div className="bg-white rounded-xl shadow-xl overflow-hidden">
                                    <div className="flex items-center justify-between px-6 py-4 border-b border-violet-200 bg-violet-100">
                                        <h2 className="text-xl font-semibold text-violet-900">Experiment Configuration</h2>
                                        <button
                                            onClick={() => setShowConfigView(false)}
                                            className="text-violet-500 hover:text-violet-700 p-1"
                                        >
                                            <span className="sr-only">Close panel</span>
                                            ×
                                        </button>
                                    </div>
                                    <div className="p-6">
                                        <div className="space-y-6">
                                            <div>
                                                <h4 className="font-medium mb-2 text-violet-900">Selected Models</h4>
                                                <ul className="list-disc list-inside space-y-1 text-gray-700">
                                                    {config.models.map(model => (
                                                        <li key={model.name}>{model.name} ({model.provider})</li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div>
                                                <h4 className="font-medium mb-2 text-violet-900">Prompt Factors</h4>
                                                <div className="space-y-4">
                                                    {config.promptFactors.map(factor => (
                                                        <div key={factor.name} className="bg-violet-50 p-4 rounded-lg">
                                                            <h5 className="font-medium mb-2 text-violet-900">{factor.name}</h5>
                                                            <ul className="list-disc list-inside space-y-1 text-gray-700">
                                                                {factor.levels.map(level => (
                                                                    <li key={level.name}>
                                                                        {level.name}
                                                                        {level.prompt && (
                                                                            <span className="text-gray-600"> - {level.prompt}</span>
                                                                        )}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="font-medium mb-2 text-violet-900">Prompt Covariates</h4>
                                                <ul className="list-decimal list-inside space-y-1 text-gray-700">
                                                    {config.promptCovariates.map((variable, index) => (
                                                        <li key={index} className="flex items-start">
                                                            <span className="mr-2">{index + 1}.</span>
                                                            <span className="flex-1">{variable}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div>
                                                <h4 className="font-medium mb-2 text-violet-900">Response Variables</h4>
                                                <ul className="list-disc list-inside space-y-1 text-gray-700">
                                                    {config.responseVariables.map(attr => (
                                                        <li key={attr.name}>
                                                            {attr.name}
                                                            <span className="text-gray-600"> - {attr.description}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div className="bg-white rounded-xl shadow-xl overflow-hidden">
                                <div className="flex items-center justify-between px-6 py-4 border-b border-violet-200 bg-violet-100">
                                    <h2 className="text-xl font-semibold text-violet-900">Results</h2>
                                </div>
                                <div className="p-6">
                                    <ResultsVisualization data={results} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {error && (
                    <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-xl font-medium">
                        {error}
                    </div>
                )}
            </div>
        </main>
    );
}
