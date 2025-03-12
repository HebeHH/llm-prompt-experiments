'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { loadSavedConfigs, SavedConfiguration } from '@/lib/utils/configStorage';

export default function Home() {
    const router = useRouter();
    const [savedConfigs, setSavedConfigs] = useState<SavedConfiguration[]>([]);
    const [showLoadModal, setShowLoadModal] = useState(false);
    
    // Load saved configurations when the component mounts
    useEffect(() => {
        setSavedConfigs(loadSavedConfigs());
    }, []);

    const handleLoadConfig = (configId: string) => {
        // Navigate to the create page with the config ID as a query parameter
        localStorage.setItem('selectedConfigId', configId);
        router.push(`/create`);
    };

    // Load Configuration Modal
    const LoadModal = () => (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
                <h3 className="text-lg font-semibold mb-4">Load Configuration</h3>
                {savedConfigs.length === 0 ? (
                    <p className="text-gray-600 mb-4">
                        No saved configurations found. Create and save a configuration to see it here.
                    </p>
                ) : (
                    <div className="max-h-[60vh] overflow-y-auto">
                        <p className="text-gray-600 mb-2">
                            Select a configuration to load:
                        </p>
                        <div className="space-y-2">
                            {savedConfigs.map((saved) => (
                                <div 
                                    key={saved.id} 
                                    className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer"
                                    onClick={() => handleLoadConfig(saved.id)}
                                >
                                    <div className="font-medium">{saved.name}</div>
                                    <div className="text-xs text-gray-500">
                                        Saved on {new Date(saved.updatedAt).toLocaleDateString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                <div className="mt-6 flex justify-end">
                    <button
                        onClick={() => setShowLoadModal(false)}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <main className="min-h-screen bg-teal-900 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <Header />

                <div className="bg-white rounded-xl shadow-xl p-8 text-center">
                    <h2 className="text-2xl font-semibold text-violet-900 mb-6">Welcome to LLM Prompt Testing</h2>
                    <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                        Create experiments to test different prompt factors across multiple LLM models.
                        Analyze results with interactive visualizations and statistical insights.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <button
                            onClick={() => router.push('/create')}
                            className="px-6 py-3 bg-violet-500 text-white rounded-lg hover:bg-violet-600 font-medium text-lg"
                        >
                            New Experiment
                        </button>
                        <button
                            onClick={() => setShowLoadModal(true)}
                            className={`px-6 py-3 rounded-lg font-medium text-lg ${
                                savedConfigs.length > 0
                                ? "bg-teal-500 text-white hover:bg-teal-600"
                                : "bg-gray-300 text-gray-500 cursor-not-allowed"
                            }`}
                            disabled={savedConfigs.length === 0}
                        >
                            Load Saved Configuration
                        </button>
                        <button
                            onClick={() => router.push('/saved')}
                            className="px-6 py-3 bg-violet-700 text-white rounded-lg hover:bg-violet-800 font-medium text-lg"
                        >
                            View Saved Experiments
                        </button>
                    </div>
                </div>
            </div>
            
            {showLoadModal && <LoadModal />}
        </main>
    );
}
