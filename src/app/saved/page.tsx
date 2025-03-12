'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
    loadSavedConfigs, 
    loadSavedResults, 
    SavedConfiguration, 
    SavedResults,
    deleteConfig,
    deleteResult
} from '@/lib/utils/configStorage';
import { Header } from '@/components/layout/Header';

export default function SavedExperiments() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'configurations' | 'results'>('configurations');
    const [configurations, setConfigurations] = useState<SavedConfiguration[]>([]);
    const [results, setResults] = useState<SavedResults[]>([]);

    // Load saved data on mount
    useEffect(() => {
        setConfigurations(loadSavedConfigs());
        setResults(loadSavedResults());
    }, []);

    const handleOpenConfig = (configId: string) => {
        // Store the selected config ID in localStorage and navigate to create page
        localStorage.setItem('selectedConfigId', configId);
        router.push('/create');
    };

    const handleOpenResults = (resultId: string) => {
        // Store the selected results ID in localStorage and navigate to results page
        localStorage.setItem('selectedResultsId', resultId);
        router.push('/results');
    };

    const handleDeleteConfig = (configId: string, configName: string) => {
        if (confirm(`Are you sure you want to delete "${configName}"?`)) {
            deleteConfig(configId);
            setConfigurations(loadSavedConfigs());
        }
    };

    const handleDeleteResult = (resultId: string, resultName: string) => {
        if (confirm(`Are you sure you want to delete "${resultName}"?`)) {
            deleteResult(resultId);
            setResults(loadSavedResults());
        }
    };

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

                <div className="bg-white rounded-xl shadow-xl p-6">
                    <h1 className="text-2xl font-bold text-violet-900 mb-6">Saved Experiments</h1>
                    
                    {/* Tabs */}
                    <div className="flex border-b border-violet-200 mb-6">
                        <button
                            onClick={() => setActiveTab('configurations')}
                            className={`py-2 px-4 -mb-px relative text-sm font-medium ${
                                activeTab === 'configurations'
                                    ? 'text-teal-600 border-b-2 border-teal-500'
                                    : 'text-violet-600 hover:text-violet-800'
                            }`}
                        >
                            Configurations
                        </button>
                        <button
                            onClick={() => setActiveTab('results')}
                            className={`py-2 px-4 -mb-px relative text-sm font-medium ${
                                activeTab === 'results'
                                    ? 'text-teal-600 border-b-2 border-teal-500'
                                    : 'text-violet-600 hover:text-violet-800'
                            }`}
                        >
                            Results
                        </button>
                    </div>

                    {/* Configurations Tab */}
                    {activeTab === 'configurations' && (
                        <div>
                            {configurations.length === 0 ? (
                                <p className="text-gray-600 p-4 text-center">
                                    No saved configurations found. Create and save a configuration to see it here.
                                </p>
                            ) : (
                                <div className="space-y-4">
                                    {configurations.map((config) => (
                                        <div 
                                            key={config.id}
                                            className="border rounded-lg p-4 hover:bg-gray-50 flex justify-between"
                                        >
                                            <div className="flex-1">
                                                <h3 className="font-medium text-lg text-violet-800">{config.name}</h3>
                                                <div className="text-sm text-gray-600 mt-1">
                                                    <p>Models: {config.config.models.length}</p>
                                                    <p>Prompt Factors: {config.config.promptFactors.length}</p>
                                                    <p>Saved on: {new Date(config.updatedAt).toLocaleString()}</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col space-y-2">
                                                <button
                                                    onClick={() => handleOpenConfig(config.id)}
                                                    className="px-3 py-1 bg-teal-500 text-white rounded hover:bg-teal-600"
                                                >
                                                    Open
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteConfig(config.id, config.name)}
                                                    className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Results Tab */}
                    {activeTab === 'results' && (
                        <div>
                            {results.length === 0 ? (
                                <p className="text-gray-600 p-4 text-center">
                                    No saved results found. Run an analysis and save the results to see them here.
                                </p>
                            ) : (
                                <div className="space-y-4">
                                    {results.map((result) => (
                                        <div 
                                            key={result.id}
                                            className="border rounded-lg p-4 hover:bg-gray-50 flex justify-between"
                                        >
                                            <div className="flex-1">
                                                <h3 className="font-medium text-lg text-violet-800">{result.name}</h3>
                                                <div className="text-sm text-gray-600 mt-1">
                                                    <p>Results: {result.results.results.length}</p>
                                                    <p>Models: {result.results.config.models.length}</p>
                                                    <p>Saved on: {new Date(result.updatedAt).toLocaleString()}</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col space-y-2">
                                                <button
                                                    onClick={() => handleOpenResults(result.id)}
                                                    className="px-3 py-1 bg-teal-500 text-white rounded hover:bg-teal-600"
                                                >
                                                    Open
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteResult(result.id, result.name)}
                                                    className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}