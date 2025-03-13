'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnalysisData } from '@/lib/types/analysis';
import { StatAnalysis } from '@/lib/types/statistics';
import { Header } from '@/components/layout/Header';
import ReportWizard from '@/components/report/ReportWizard';

export default function ReportPage() {
  const router = useRouter();
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [statResults, setStatResults] = useState<StatAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load analysis data and stat results from localStorage
    const analysisDataJson = localStorage.getItem('reportAnalysisData');
    const statResultsJson = localStorage.getItem('reportStatResults');

    if (!analysisDataJson || !statResultsJson) {
      setError('No analysis data or statistical results found. Please go back to the results page and click "Create Report".');
      return;
    }

    try {
      const parsedAnalysisData = JSON.parse(analysisDataJson);
      const parsedStatResults = JSON.parse(statResultsJson);
      
      setAnalysisData(parsedAnalysisData);
      setStatResults(parsedStatResults);
    } catch (e) {
      console.error('Error parsing data:', e);
      setError('Error loading data. Please go back to the results page and try again.');
    }
  }, []);

  const handleBackToResults = () => {
    router.push('/results');
  };

  return (
    <main className="min-h-screen bg-teal-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Header 
          rightContent={
            <button
              onClick={handleBackToResults}
              className="px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600 font-medium"
            >
              Back to Results
            </button>
          }
        />

        <div className="mt-8">
          {error ? (
            <div className="bg-white rounded-xl shadow-xl p-6">
              <div className="text-red-500 font-medium">{error}</div>
              <button
                onClick={handleBackToResults}
                className="mt-4 px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600 font-medium"
              >
                Go to Results
              </button>
            </div>
          ) : !analysisData || !statResults ? (
            <div className="bg-white rounded-xl shadow-xl p-6">
              <div className="animate-pulse flex space-x-4">
                <div className="flex-1 space-y-6 py-1">
                  <div className="h-4 bg-slate-200 rounded"></div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="h-4 bg-slate-200 rounded col-span-2"></div>
                      <div className="h-4 bg-slate-200 rounded col-span-1"></div>
                    </div>
                    <div className="h-4 bg-slate-200 rounded"></div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <ReportWizard 
              analysisData={analysisData} 
              statResults={statResults} 
            />
          )}
        </div>
      </div>
    </main>
  );
} 