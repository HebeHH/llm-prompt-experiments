'use client';

import { useState } from 'react';
import { AnalysisSelector } from '@/components/analysis/AnalysisSelector';
import { ResultsVisualization } from '@/components/analysis/ResultsVisualization';
import { emojiAnalysisConfig } from '@/lib/analysis/emoji';
import { AnalysisService } from '@/lib/analysis/service';
import { LLMProviderFactory } from '@/lib/llm/factory';
import { AnalysisData } from '@/lib/types/analysis';

export default function Home() {
    const [isRunning, setIsRunning] = useState(false);
    const [config, setConfig] = useState(emojiAnalysisConfig);
    const [results, setResults] = useState<AnalysisData | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleRunAnalysis = async () => {
        setIsRunning(true);
        setError(null);

        try {
            // Initialize LLM providers with API keys from environment variables
            LLMProviderFactory.initialize({
                anthropicApiKey: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY,
                googleApiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
                openaiApiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
            });

            const analysisService = new AnalysisService(config);
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
                        />

                        {error && (
                            <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-md">
                                {error}
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
