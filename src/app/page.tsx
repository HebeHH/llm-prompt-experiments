'use client';

import { useState } from 'react';
import { AnalysisSelector } from '@/components/analysis/AnalysisSelector';
import { ResultsVisualization } from '@/components/analysis/ResultsVisualization';
import { emojiAnalysisConfig } from '@/lib/analysis/emoji';
import { AnalysisService, AnalysisProgress } from '@/lib/analysis/service';
import { LLMProviderFactory } from '@/lib/llm/factory';
import { AnalysisData } from '@/lib/types/analysis';

export default function Home() {
    const [isRunning, setIsRunning] = useState(false);
    const [config, setConfig] = useState(emojiAnalysisConfig);
    const [results, setResults] = useState<AnalysisData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState<AnalysisProgress | null>(null);

    const handleRunAnalysis = async () => {
        setIsRunning(true);
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
        } catch (error) {
            setError(error instanceof Error ? error.message : 'An error occurred');
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <main className="min-h-screen bg-gray-100 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">
                    AI Response Analysis Dashboard
                </h1>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                        <AnalysisSelector
                            config={config}
                            onConfigChange={setConfig}
                            onRunAnalysis={handleRunAnalysis}
                            isRunning={isRunning}
                            progress={progress}
                        />

                        {error && (
                            <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-md">
                                {error}
                            </div>
                        )}

                        {progress && (
                            <div className="mt-4 p-4 bg-white rounded-lg shadow">
                                <h3 className="text-lg font-semibold mb-2">Analysis Progress</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>Overall Progress:</span>
                                        <span>{progress.completedPrompts} / {progress.totalPrompts} prompts</span>
                                    </div>
                                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-600 transition-all duration-500"
                                            style={{
                                                width: `${(progress.completedPrompts / progress.totalPrompts) * 100}%`
                                            }}
                                        />
                                    </div>
                                    <div className="mt-4 space-y-2">
                                        {Object.entries(progress.modelProgress).map(([model, stats]) => (
                                            <div key={model} className="text-sm">
                                                <div className="flex justify-between">
                                                    <span>{model}:</span>
                                                    <span>
                                                        {stats.completed} / {stats.total} 
                                                        {stats.failed > 0 && ` (${stats.failed} failed)`}
                                                    </span>
                                                </div>
                                                <div className="h-1 bg-gray-200 rounded-full overflow-hidden mt-1">
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
                        )}
                    </div>

                    <div>
                        {results && <ResultsVisualization data={results} />}
                    </div>
                </div>
            </div>
        </main>
    );
}
