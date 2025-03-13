'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ResultsVisualization } from '@/components/analysis/ResultsVisualization';
import { AnalysisConfig, AnalysisData, ResponseVariable } from '@/lib/types/analysis';
import { resultAttributes } from '@/lib/constants/resultAttributes';
import { Header } from '@/components/layout/Header';
import { loadResultById } from '@/lib/utils/configStorage';
import GenerateReportButton from '@/components/report/GenerateReportButton';
import { StatAnalysis } from '@/lib/types/statistics';
import { performStatisticalAnalysis } from '@/lib/analysis/statistics';

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
    const [statResults, setStatResults] = useState<StatAnalysis | null>(null);

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

    useEffect(() => {
        // First try to load the most recent analysis results
        try {
            const savedResults = localStorage.getItem('analysisResults');
            
            if (savedResults) {
                const parsedResults = JSON.parse(savedResults);
                
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
                return; // Exit early if we found recent results
            }
        } catch (e) {
            console.error("Error parsing recent results:", e);
        }
        
        // If no recent results, check for selectedResultsId from the saved results
        const selectedResultsId = localStorage.getItem('selectedResultsId');
        
        if (selectedResultsId) {
            // Load the selected results
            const loadedResult = loadResultById(selectedResultsId);
            if (loadedResult) {
                console.log("Loaded result stats:", loadedResult.stats);
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
                
                // Set the statistical results if available
                if (loadedResult.stats) {
                    // Check if the stats data has the required structure
                    const stats = loadedResult.stats;
                    console.log("Stats structure check:", 
                        'mainEffects' in stats, 
                        'interactions' in stats, 
                        'residuals' in stats
                    );
                    if ('mainEffects' in stats && 'interactions' in stats && 'residuals' in stats) {
                        setStatResults(stats as unknown as StatAnalysis);
                    } else {
                        console.error("Stats data doesn't have the required structure");
                    }
                } else {
                    console.log("No stats data available in loaded result");
                }
            } else {
                setError("Selected results not found. Please run the experiment again.");
            }
        } else {
            setError("No results found. Please run the experiment first.");
        }
    }, []);

    // Generate statistical analysis when results are available
    useEffect(() => {
        if (results) {
            try {
                // Generate statistical analysis
                const analysis = performStatisticalAnalysis(results);
                setStatResults(analysis);
                console.log("Generated statistical analysis:", analysis);
            } catch (error) {
                console.error("Error generating statistical analysis:", error);
            }
        }
    }, [results]);

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
                                        <h4 className="font-medium mb-2 text-violet-900">Response Variables</h4>
                                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                                            {results.config.responseVariables.map(variable => (
                                                <li key={variable.name}>{variable.name} - {variable.description}</li>
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
                                {/* Debug info */}
                                {(() => { 
                                    console.log("Results available:", !!results, "Stats available:", !!statResults);
                                    return null;
                                })()}
                                {results && statResults ? (
                                    <GenerateReportButton 
                                        analysisData={results} 
                                        statResults={statResults} 
                                    />
                                ) : (
                                    <div className="text-sm text-gray-500">
                                        {!statResults && "Statistical analysis required for report generation"}
                                    </div>
                                )}
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
                </div>
            </div>
        </main>
    );
} 