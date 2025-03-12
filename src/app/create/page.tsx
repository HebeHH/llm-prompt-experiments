'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ExperimentCreator } from '@/components/experiment/ExperimentCreator';
import { AnalysisConfig, ResponseVariable } from '@/lib/types/analysis';
import { LLMProvider } from '@/lib/types/llm';
import { LLMProviderFactory } from '@/lib/constants/llms';
import { resultAttributes } from '@/lib/constants/resultAttributes';
import { Header } from '@/components/layout/Header';

type ExtendedProvider = LLMProvider | 'jigsaw';

// Default prompt function to use when restoring from localStorage
const defaultPromptFunction = (promptFactors: string[], variable: string) => {
    return `${promptFactors.join("\n")}\n${variable}`;
};

export default function CreateExperiment() {
    const router = useRouter();
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
        promptFunction: defaultPromptFunction,
    });

    const handleConfigChange = (newConfig: AnalysisConfig) => {
        setConfig(newConfig);
        
        // Save to localStorage for persistence, but handle the function separately
        const configForStorage = {
            ...newConfig,
            // Remove the functions as they can't be properly serialized
            promptFunction: undefined,
            responseVariables: newConfig.responseVariables.map(variable => ({
                ...variable,
                function: undefined
            }))
        };
        
        localStorage.setItem('experimentConfig', JSON.stringify(configForStorage));
        // Store a flag to indicate we're using the default prompt function
        localStorage.setItem('usingDefaultPromptFunction', 'true');
    };

    const handleApiKeysChange = (keys: Record<ExtendedProvider, string>) => {
        setApiKeys(keys);
        // Save API keys to localStorage
        localStorage.setItem('apiKeys', JSON.stringify(keys));
    };

    const handleRunAnalysis = async () => {
        setIsRunning(true);
        
        try {
            // Save config and API keys to localStorage before navigating
            const configForStorage = {
                ...config,
                // Remove the functions as they can't be properly serialized
                promptFunction: undefined,
                responseVariables: config.responseVariables.map(variable => ({
                    ...variable,
                    function: undefined
                }))
            };
            
            localStorage.setItem('experimentConfig', JSON.stringify(configForStorage));
            localStorage.setItem('apiKeys', JSON.stringify(apiKeys));
            // Store a flag to indicate we're using the default prompt function
            localStorage.setItem('usingDefaultPromptFunction', 'true');
            
            // Navigate to progress page
            router.push('/progress');
        } catch (error) {
            console.error("Error preparing analysis:", error);
            setIsRunning(false);
        }
    };

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

    // Load saved config and API keys on mount
    useEffect(() => {
        const savedConfig = localStorage.getItem('experimentConfig');
        const savedApiKeys = localStorage.getItem('apiKeys');
        
        if (savedConfig) {
            try {
                const parsedConfig = JSON.parse(savedConfig);
                // Restore the prompt function and response variable functions
                setConfig({
                    ...parsedConfig,
                    promptFunction: defaultPromptFunction,
                    responseVariables: restoreResponseVariableFunctions(parsedConfig.responseVariables || [])
                });
            } catch (e) {
                console.error("Error parsing saved config:", e);
            }
        }
        
        if (savedApiKeys) {
            try {
                const parsedKeys = JSON.parse(savedApiKeys);
                setApiKeys(parsedKeys);
            } catch (e) {
                console.error("Error parsing saved API keys:", e);
            }
        }
    }, []);

    return (
        <main className="min-h-screen bg-teal-900 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <Header 
                    rightContent={
                        <button
                            onClick={() => router.push('/')}
                            className="px-4 py-2 bg-teal-700 text-white rounded-lg hover:bg-teal-800 font-medium"
                        >
                            Back to Home
                        </button>
                    }
                />

                <div className="bg-white rounded-xl shadow-xl flex flex-col h-[calc(100vh-12rem)]">
                    <ExperimentCreator
                        onConfigChange={handleConfigChange}
                        onRunAnalysis={handleRunAnalysis}
                        isRunning={isRunning}
                        onApiKeysChange={handleApiKeysChange}
                    />
                </div>
            </div>
        </main>
    );
} 