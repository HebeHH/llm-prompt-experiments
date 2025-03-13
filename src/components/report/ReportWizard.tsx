import React, { useState, useEffect } from 'react';
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
  const [viewingStep, setViewingStep] = useState<WizardStep | null>(null);

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

  // Function to check if a step is completed
  const isStepCompleted = (step: WizardStep): boolean => {
    switch (step) {
      case 'manual-config':
        return !!reportConfig;
      case 'outline-generation':
        return !!reportOutline;
      case 'outline-confirmation':
        return !!reportOutline && currentStep !== 'outline-generation';
      case 'graph-selection':
        return Object.keys(reportBuilder.graphImages).length > 0;
      case 'section-generation':
        return Object.keys(reportBuilder.sections).length > 0;
      case 'report-compilation':
        return currentStep === 'report-compilation';
      default:
        return false;
    }
  };

  // Function to handle step navigation
  const handleStepClick = (step: WizardStep) => {
    // Only allow navigation to completed steps or the current step
    if (isStepCompleted(step) || step === currentStep) {
      if (step === currentStep) {
        // If clicking the current step, clear the viewing state
        setViewingStep(null);
      } else {
        // Otherwise, set the viewing state to the clicked step
        setViewingStep(step);
      }
    }
  };

  // Function to return to the current step
  const handleReturnToCurrent = () => {
    setViewingStep(null);
  };

  const renderStep = () => {
    // If viewing a previous step, render that step in read-only mode
    const stepToRender = viewingStep || currentStep;
    
    switch (stepToRender) {
      case 'manual-config':
        return (
          <ManualConfigStep 
            analysisData={analysisData}
            statResults={statResults}
            onComplete={viewingStep ? undefined : handleConfigComplete}
            readOnly={!!viewingStep}
          />
        );
      case 'outline-generation':
        return reportBackgroundData ? (
          <OutlineGenerationStep 
            reportBackgroundData={reportBackgroundData}
            onComplete={viewingStep ? undefined : handleOutlineGenerated}
            onError={viewingStep ? undefined : setError}
            readOnly={!!viewingStep}
          />
        ) : null;
      case 'outline-confirmation':
        return reportOutline ? (
          <OutlineConfirmationStep 
            reportOutline={reportOutline}
            onComplete={viewingStep ? undefined : handleOutlineConfirmed}
            readOnly={!!viewingStep}
          />
        ) : null;
      case 'graph-selection':
        return reportOutline && reportBackgroundData ? (
          <GraphSelectionStep 
            reportOutline={reportOutline}
            reportBackgroundData={reportBackgroundData}
            analysisData={analysisData}
            statResults={statResults}
            onComplete={viewingStep ? undefined : handleGraphSelectionComplete}
            onError={viewingStep ? undefined : setError}
            readOnly={!!viewingStep}
          />
        ) : null;
      case 'section-generation':
        return reportOutline && reportBackgroundData && reportBuilder.graphImages ? (
          <SectionGenerationStep 
            reportOutline={reportOutline}
            reportBackgroundData={reportBackgroundData}
            graphImages={reportBuilder.graphImages}
            onComplete={viewingStep ? undefined : handleSectionGenerationComplete}
            onError={viewingStep ? undefined : setError}
            readOnly={!!viewingStep}
          />
        ) : null;
      case 'report-compilation':
        return reportBuilder.outline && reportBuilder.sections && reportBuilder.graphImages ? (
          <ReportCompilationStep 
            reportBuilder={reportBuilder}
            reportConfig={reportConfig!}
            onError={viewingStep ? undefined : setError}
            readOnly={!!viewingStep}
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
            ].map((step) => {
              const stepId = step.id as WizardStep;
              const isCompleted = isStepCompleted(stepId);
              const isCurrent = currentStep === stepId;
              const isViewing = viewingStep === stepId;
              
              return (
                <button
                  key={step.id}
                  onClick={() => handleStepClick(stepId)}
                  disabled={!isCompleted && !isCurrent}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isViewing
                      ? 'bg-violet-500 text-white'
                      : isCurrent
                      ? 'bg-violet-500 text-white'
                      : isCompleted
                      ? 'bg-violet-200 text-violet-800 hover:bg-violet-300'
                      : 'text-violet-700 opacity-50 cursor-not-allowed'
                  }`}
                >
                  {step.name}
                  {isCompleted && !isCurrent && !isViewing && (
                    <span className="ml-1.5 text-xs">✓</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="p-6">
        {viewingStep && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-md p-3 flex justify-between items-center">
            <div className="text-blue-700">
              <span className="font-medium">Viewing:</span> You are viewing a completed step. No changes will be saved.
            </div>
            <button
              onClick={handleReturnToCurrent}
              className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm font-medium"
            >
              Return to Current Step
            </button>
          </div>
        )}
        
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
          renderStep()
        )}
      </div>
    </div>
  );
};

export default ReportWizard; 