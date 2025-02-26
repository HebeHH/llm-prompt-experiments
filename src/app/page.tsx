'use client';

import React, { useState } from 'react';
import { ExperimentCreator } from '@/components/experiment/ExperimentCreator';
import { ResultsVisualization } from '@/components/analysis/ResultsVisualization';
import { AnalysisService, AnalysisProgress } from '@/lib/analysis/service';
import { LLMProviderFactory } from '@/lib/llm/factory';
import { AnalysisData, AnalysisConfig } from '@/lib/types/analysis';

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
                    <h4 className="font-medium mb-2">Prompt Categories</h4>
                    <div className="space-y-4">
                        {config.promptCategories.map(category => (
                            <div key={category.name} className="bg-gray-50 p-4 rounded-lg">
                                <h5 className="font-medium mb-2">{category.name}</h5>
                                <ul className="list-disc list-inside space-y-1 text-gray-600">
                                    {category.categories.map(option => (
                                        <li key={option.name}>
                                            {option.name}
                                            {option.prompt && (
                                                <span className="text-gray-500"> - {option.prompt}</span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
                <div>
                    <h4 className="font-medium mb-2">Prompt Variables</h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-600">
                        {config.promptVariables.map(variable => (
                            <li key={variable}>{variable}</li>
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
    const [config, setConfig] = useState<AnalysisConfig>({
        name: 'New Experiment',
        description: 'A new experiment configuration',
        models: [],
        promptCategories: [],
        promptVariables: [],
        responseAttributes: [],
        promptFunction: (categories: string[], variable: string) => {
            return `${categories.join("\n")}\n${variable}`;
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
        scrollToTop();
        setError(null);
        setProgress(null);

        try {
            // Initialize LLM providers with API keys from environment variables
            LLMProviderFactory.initialize({
                anthropicApiKey: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY,
                googleApiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
                openaiApiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
            });

            const analysisService = new AnalysisService(config, (progress) => {
                setProgress(progress);
            });
            const results = await analysisService.runAnalysis();
            setResults(results);
            setCurrentView('results');
            scrollToTop();
        } catch (error) {
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

    return (
        <main className="min-h-screen bg-gray-100 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">
                        AI Response Analysis Dashboard
                    </h1>
                    {currentView === 'results' && (
                        <div className="flex gap-4">
                            <button
                                onClick={handleNewExperiment}
                                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                                New Experiment
                            </button>
                            <button
                                onClick={handleShowConfig}
                                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                            >
                                Show Configuration
                            </button>
                        </div>
                    )}
                </div>

                <div className="space-y-8">
                    {/* Create Experiment Panel */}
                    {(currentView === 'create' || showExperimentPanel) && (
                        <div className="w-full">
                            <div className="bg-white rounded-lg shadow">
                                <div className="flex justify-between items-center p-6 border-b">
                                    <h2 className="text-xl font-semibold">Create Experiment</h2>
                                    {currentView === 'results' && (
                                        <button
                                            onClick={() => setShowExperimentPanel(false)}
                                            className="text-gray-500 hover:text-gray-700"
                                        >
                                            <span className="sr-only">Close panel</span>
                                            ×
                                        </button>
                                    )}
                                </div>
                                <div className="p-6">
                                    <ExperimentCreator
                                        onConfigChange={setConfig}
                                        onRunAnalysis={handleRunAnalysis}
                                        isRunning={isRunning}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Progress Panel */}
                    {currentView === 'progress' && progress && (
                        <div className="w-full">
                            <div className="bg-white rounded-lg shadow p-6">
                                <h2 className="text-xl font-semibold mb-6">Analysis Progress</h2>
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span>Overall Progress:</span>
                                            <span>{progress.completedPrompts} / {progress.totalPrompts} prompts</span>
                                        </div>
                                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-600 transition-all duration-500"
                                                style={{
                                                    width: `${(progress.completedPrompts / progress.totalPrompts) * 100}%`
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        {Object.entries(progress.modelProgress).map(([model, stats]) => (
                                            <div key={model}>
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span>{model}:</span>
                                                    <span>
                                                        {stats.completed} / {stats.total} 
                                                        {stats.failed > 0 && ` (${stats.failed} failed)`}
                                                    </span>
                                                </div>
                                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-blue-600 transition-all duration-500"
                                                        style={{
                                                            width: `${(stats.completed / stats.total) * 100}%`
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Configuration View and Results Panel */}
                    {currentView === 'results' && results && !showExperimentPanel && (
                        <div className="w-full space-y-8">
                            {showConfigView && (
                                <ExperimentConfigView
                                    config={config}
                                    onClose={() => setShowConfigView(false)}
                                />
                            )}
                            <ResultsVisualization data={results} />
                        </div>
                    )}
                </div>

                {error && (
                    <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-md">
                        {error}
                    </div>
                )}
            </div>
        </main>
    );
}
