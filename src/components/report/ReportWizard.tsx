import React, { useState } from 'react';
import { AnalysisData } from '@/lib/types/analysis';
import { StatAnalysis } from '@/lib/types/statistics';
import ManualConfigStep from './steps/ManualConfigStep';
import OutlineGenerationStep from './steps/OutlineGenerationStep';
import OutlineConfirmationStep from './steps/OutlineConfirmationStep';
import GraphSelectionStep from './steps/GraphSelectionStep';
import SectionGenerationStep from './steps/SectionGenerationStep';
import ReportCompilationStep from './steps/ReportCompilationStep';
import { ReportConfig, ReportOutline, ReportBackgroundData, ReportBuilder } from '@/lib/types/report';
import { createReportBackgroundData } from '@/lib/report/reportUtils';

interface ReportWizardProps {
  analysisData: AnalysisData;
  statResults: StatAnalysis;
}

type WizardStep = 
  | 'manual-config' 
  | 'outline-generation' 
  | 'outline-confirmation' 
  | 'graph-selection' 
  | 'section-generation' 
  | 'report-compilation';

const ReportWizard: React.FC<ReportWizardProps> = ({ analysisData, statResults }) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>('manual-config');
  const [reportConfig, setReportConfig] = useState<ReportConfig | null>(null);
  const [reportBackgroundData, setReportBackgroundData] = useState<ReportBackgroundData | null>(null);
  const [reportOutline, setReportOutline] = useState<ReportOutline | null>(null);
  const [reportBuilder, setReportBuilder] = useState<ReportBuilder>({
    outline: null,
    sections: {},
    graphImages: {}
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfigComplete = (config: ReportConfig) => {
    setReportConfig(config);
    
    // Create the report background data
    const backgroundData = createReportBackgroundData(config, analysisData, statResults);
    setReportBackgroundData(backgroundData);
    
    setCurrentStep('outline-generation');
  };

  const handleOutlineGenerated = (outline: ReportOutline) => {
    setReportOutline(outline);
    setReportBuilder(prev => ({
      ...prev,
      outline
    }));
    setCurrentStep('outline-confirmation');
  };

  const handleOutlineConfirmed = (confirmedOutline: ReportOutline) => {
    setReportOutline(confirmedOutline);
    setReportBuilder(prev => ({
      ...prev,
      outline: confirmedOutline
    }));
    setCurrentStep('graph-selection');
  };

  const handleGraphSelectionComplete = (graphImages: Record<string, string>) => {
    setReportBuilder(prev => ({
      ...prev,
      graphImages
    }));
    setCurrentStep('section-generation');
  };

  const handleSectionGenerationComplete = (sections: Record<string, string>) => {
    setReportBuilder(prev => ({
      ...prev,
      sections
    }));
    setCurrentStep('report-compilation');
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'manual-config':
        return (
          <ManualConfigStep 
            analysisData={analysisData}
            statResults={statResults}
            onComplete={handleConfigComplete}
          />
        );
      case 'outline-generation':
        return reportBackgroundData ? (
          <OutlineGenerationStep 
            reportBackgroundData={reportBackgroundData}
            onComplete={handleOutlineGenerated}
            onError={setError}
          />
        ) : null;
      case 'outline-confirmation':
        return reportOutline ? (
          <OutlineConfirmationStep 
            reportOutline={reportOutline}
            onComplete={handleOutlineConfirmed}
          />
        ) : null;
      case 'graph-selection':
        return reportOutline && reportBackgroundData ? (
          <GraphSelectionStep 
            reportOutline={reportOutline}
            reportBackgroundData={reportBackgroundData}
            analysisData={analysisData}
            statResults={statResults}
            onComplete={handleGraphSelectionComplete}
            onError={setError}
          />
        ) : null;
      case 'section-generation':
        return reportOutline && reportBackgroundData && reportBuilder.graphImages ? (
          <SectionGenerationStep 
            reportOutline={reportOutline}
            reportBackgroundData={reportBackgroundData}
            graphImages={reportBuilder.graphImages}
            onComplete={handleSectionGenerationComplete}
            onError={setError}
          />
        ) : null;
      case 'report-compilation':
        return reportBuilder.outline && reportBuilder.sections && reportBuilder.graphImages ? (
          <ReportCompilationStep 
            reportBuilder={reportBuilder}
            reportConfig={reportConfig!}
            onError={setError}
          />
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-xl overflow-hidden">
      <div className="border-b border-gray-200 bg-violet-100 px-6 py-4">
        <h2 className="text-xl font-semibold text-violet-900">Generate Report</h2>
        <div className="mt-2">
          <nav className="flex space-x-4">
            {[
              { id: 'manual-config', name: 'Configuration' },
              { id: 'outline-generation', name: 'Outline' },
              { id: 'outline-confirmation', name: 'Confirm Outline' },
              { id: 'graph-selection', name: 'Graphs' },
              { id: 'section-generation', name: 'Content' },
              { id: 'report-compilation', name: 'Final Report' }
            ].map((step) => (
              <div
                key={step.id}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  currentStep === step.id
                    ? 'bg-violet-500 text-white'
                    : 'text-violet-700'
                }`}
              >
                {step.name}
              </div>
            ))}
          </nav>
        </div>
      </div>

      <div className="p-6">
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setError(null)}
                    className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-500"></div>
          </div>
        ) : (
          renderCurrentStep()
        )}
      </div>
    </div>
  );
};

export default ReportWizard; 