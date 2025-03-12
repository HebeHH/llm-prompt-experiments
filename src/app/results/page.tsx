'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ResultsVisualization } from '@/components/analysis/ResultsVisualization';
import { AnalysisConfig, AnalysisData, ResponseVariable } from '@/lib/types/analysis';
import { resultAttributes } from '@/lib/constants/resultAttributes';
import { Header } from '@/components/layout/Header';
import { loadResultById } from '@/lib/utils/configStorage';

// Default prompt function to use when restoring from localStorage
const defaultPromptFunction = (promptFactors: string[], variable: string) => {
    return `${promptFactors.join("\n")}\n${variable}`;
};

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
                    <h4 className="font-medium mb-2">Prompt Noise</h4>
                    <ul className="list-decimal list-inside space-y-1 text-gray-600">
                        {config.promptNoise.map((variable, index) => (
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

export default function ResultsPage() {
    const router = useRouter();
    const [results, setResults] = useState<AnalysisData | null>(null);
    const [showConfigView, setShowConfigView] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Check for selectedResultsId from the homepage
        const selectedResultsId = localStorage.getItem('selectedResultsId');
        
        if (selectedResultsId) {
            // Load the selected results
            const loadedResult = loadResultById(selectedResultsId);
            if (loadedResult) {
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
                const resultsWithFunction: AnalysisData = {
                    ...loadedResult.results,
                    config: {
                        ...loadedResult.results.config,
                        promptFunction: defaultPromptFunction,
                        responseVariables: restoreResponseVariableFunctions(loadedResult.results.config.responseVariables)
                    }
                };
                
                setResults(resultsWithFunction);
                // Clear the selectedResultsId after loading
                localStorage.removeItem('selectedResultsId');
                return;
            }
        }
        
        // Otherwise, load from analysisResults in localStorage
        const resultsJson = localStorage.getItem('analysisResults');
        
        if (!resultsJson) {
            setError("No results found. Please run an experiment first.");
            return;
        }
        
        try {
            const parsedResults = JSON.parse(resultsJson);
            
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
            const resultsWithFunction: AnalysisData = {
                ...parsedResults,
                config: {
                    ...parsedResults.config,
                    promptFunction: defaultPromptFunction,
                    responseVariables: restoreResponseVariableFunctions(parsedResults.config.responseVariables)
                }
            };
            
            setResults(resultsWithFunction);
        } catch (e) {
            console.error("Error parsing results:", e);
            setError("Error loading results. Please run the experiment again.");
        }
    }, []);

    const handleNewExperiment = () => {
        router.push('/create');
    };

    const handleShowConfig = () => {
        setShowConfigView(true);
    };

    return (
        <main className="min-h-screen bg-teal-900 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <Header 
                    rightContent={
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
                    }
                />

                <div className="space-y-8">
                    {showConfigView && results && (
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
                                            {results.config.models.map(model => (
                                                <li key={model.name}>{model.name} ({model.provider})</li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div>
                                        <h4 className="font-medium mb-2 text-violet-900">Prompt Factors</h4>
                                        <div className="space-y-4">
                                            {results.config.promptFactors.map(factor => (
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
                                        <h4 className="font-medium mb-2 text-violet-900">Prompt Noise</h4>
                                        <ul className="list-decimal list-inside space-y-1 text-gray-700">
                                            {results.config.promptNoise.map((variable, index) => (
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
                                            {results.config.responseVariables.map(attr => (
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
                    
                    {results && (
                        <div className="bg-white rounded-xl shadow-xl overflow-hidden">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-violet-200 bg-violet-100">
                                <h2 className="text-xl font-semibold text-violet-900">Results</h2>
                            </div>
                            <div className="p-6">
                                <ResultsVisualization data={results} />
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
                                    Create New Experiment
                                </button>
                            </div>
                        </div>
                    )}

                    {!results && !error && (
                        <div className="bg-white rounded-xl shadow-xl p-8 text-center">
                            <div className="animate-pulse">
                                <div className="h-8 bg-violet-100 rounded w-1/2 mx-auto mb-4"></div>
                                <div className="h-4 bg-violet-100 rounded w-3/4 mx-auto mb-2"></div>
                                <div className="h-4 bg-violet-100 rounded w-2/3 mx-auto mb-2"></div>
                                <div className="h-4 bg-violet-100 rounded w-1/2 mx-auto"></div>
                            </div>
                            <p className="mt-6 text-gray-600">Loading results...</p>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
} 