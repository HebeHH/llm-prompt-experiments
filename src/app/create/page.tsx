'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { ExperimentCreator } from '@/components/experiment/ExperimentCreator';
import { AnalysisConfig } from '@/lib/types/analysis';
import { Header } from '@/components/layout/Header';
import { 
    loadCurrentConfig, 
    saveCurrentConfig, 
    saveApiKeys, 
    loadApiKeys, 
    loadConfigById, 
    defaultPromptFunction,
    ExtendedProvider
} from '@/lib/utils/configStorage';
import { getApiKeys } from '@/lib/utils/apiKeyManager';

function ConfigCreator() {
    const router = useRouter();
    const [configId, setConfigId] = useState<string | null>(null);
    
    // Check for configId on client side only
    useEffect(() => {
        // Instead of using searchParams, check localStorage directly
        const selectedConfigId = localStorage.getItem('selectedConfigId');
        if (selectedConfigId) {
            setConfigId(selectedConfigId);
        }
    }, []);
    
    const [isRunning, setIsRunning] = useState(false);
    const [apiKeys, setApiKeys] = useState<Record<ExtendedProvider, string>>(getApiKeys());
    const [config, setConfig] = useState<AnalysisConfig>({
        name: 'New Experiment',
        description: 'A new experiment configuration',
        models: [],
        promptFactors: [],
        promptNoise: [], // Renamed from promptCovariates
        responseVariables: [],
        promptFunction: defaultPromptFunction,
    });

    const handleConfigChange = (newConfig: AnalysisConfig) => {
        setConfig(newConfig);
        saveCurrentConfig(newConfig);
    };

    const handleApiKeysChange = (keys: Record<ExtendedProvider, string>) => {
        setApiKeys(keys);
        saveApiKeys(keys);
    };

    const handleRunAnalysis = async () => {
        setIsRunning(true);
        
        try {
            // Save config and API keys to localStorage before navigating
            localStorage.setItem('experimentConfig', JSON.stringify(config));
            saveApiKeys(apiKeys);
            
            // Navigate to progress page
            router.push('/progress');
        } catch (error) {
            console.error("Error preparing analysis:", error);
            setIsRunning(false);
        }
    };

    // Load saved config and API keys on mount
    useEffect(() => {
        // Check for a selectedConfigId in localStorage (from home page)
        if (configId) {
            const savedConfig = loadConfigById(configId);
            if (savedConfig) {
                setConfig(savedConfig);
                // Clear the selectedConfigId after loading
                localStorage.removeItem('selectedConfigId');
                return;
            }
        }
        
        // Otherwise load from localStorage
        const savedConfig = loadCurrentConfig();
        if (savedConfig) {
            setConfig(savedConfig);
        }
        
        // Load API keys
        const savedApiKeys = loadApiKeys();
        if (savedApiKeys) {
            setApiKeys(savedApiKeys);
        }
    }, [configId]);

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
                        config={config}
                        apiKeys={apiKeys}
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

// We need a client component as the default export
const CreateExperiment = ConfigCreator;
export default CreateExperiment; 