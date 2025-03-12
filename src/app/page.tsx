'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
    const router = useRouter();

    return (
        <main className="min-h-screen bg-teal-900 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-white">
                        s<span className="text-violet-300">hebe</span>testing
                    </h1>
                </div>

                <div className="bg-white rounded-xl shadow-xl p-8 text-center">
                    <h2 className="text-2xl font-semibold text-violet-900 mb-6">Welcome to LLM Prompt Testing</h2>
                    <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                        Create experiments to test different prompt factors across multiple LLM models.
                        Analyze results with interactive visualizations and statistical insights.
                    </p>
                    <button
                        onClick={() => router.push('/create')}
                        className="px-6 py-3 bg-violet-500 text-white rounded-lg hover:bg-violet-600 font-medium text-lg"
                    >
                        New Experiment
                    </button>
                </div>
            </div>
        </main>
    );
}
