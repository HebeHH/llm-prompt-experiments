import React, { useState, useMemo, useCallback } from 'react';
import { AnalysisConfig, PromptFactor, ResponseVariable } from '@/lib/types/analysis';
import { LLMModel, LLMProvider } from '@/lib/types/llm';
import { ModelSelector } from '@/components/experiment/sections/ModelSelector';
import { PromptFactorEditor } from '@/components/experiment/sections/PromptFactorEditor';
import { PromptVariableEditor } from '@/components/experiment/sections/PromptVariableEditor';
import ResultAttributeSelector from '@/components/experiment/sections/ResultAttributeSelector';
import { PricingPredictor } from '@/components/experiment/sections/PricingPredictor';
import { ApiKeyManager } from '@/components/experiment/sections/ApiKeyManager';
import { resultAttributes } from '@/lib/constants/resultAttributes';

type ExtendedProvider = LLMProvider | 'jigsaw';

interface ExperimentCreatorProps {
  onConfigChange: (config: AnalysisConfig) => void;
  onRunAnalysis: () => void;
  isRunning: boolean;
  onApiKeysChange?: (keys: Record<ExtendedProvider, string>) => void;
}

const defaultApiKeys: Record<ExtendedProvider, string> = {
  anthropic: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || '',
  google: process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '',
  openai: process.env.NEXT_PUBLIC_OPENAI_API_KEY || '',
  groq: process.env.NEXT_PUBLIC_GROQ_API_KEY || '',
  jigsaw: process.env.NEXT_PUBLIC_JIGSAW_API_KEY || ''
};

type WizardStep = {
  id: string;
  title: string;
  component: React.FC<any>;
  isValid: (config: AnalysisConfig, apiKeys: Record<ExtendedProvider, string>) => boolean;
  validationMessage: (config: AnalysisConfig, apiKeys: Record<ExtendedProvider, string>) => string;
};

export const ExperimentCreator: React.FC<ExperimentCreatorProps> = ({
  onConfigChange,
  onRunAnalysis,
  isRunning,
  onApiKeysChange
}) => {
  const [config, setConfig] = useState<AnalysisConfig>({
    name: '',
    description: '',
    models: [],
    promptFactors: [],
    promptCovariates: [],
    responseVariables: [],
    promptFunction: (factors: string[], variable: string) => {
      return `${factors.join("\n")}\n${variable}`;
    },
  });

  const [apiKeys, setApiKeys] = useState<Record<ExtendedProvider, string>>(defaultApiKeys);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const handleConfigUpdate = useCallback((update: Partial<AnalysisConfig>) => {
    const newConfig = { ...config, ...update };
    setConfig(newConfig);
    onConfigChange(newConfig);
  }, [config, onConfigChange]);

  const handleApiKeysUpdate = useCallback((keys: Record<ExtendedProvider, string>) => {
    setApiKeys(keys);
    if (onApiKeysChange) {
      onApiKeysChange(keys);
    }
  }, [onApiKeysChange]);

  const steps: WizardStep[] = useMemo(() => [
    {
      id: 'setup',
      title: 'Setup',
      component: ApiKeyManager,
      isValid: (_, apiKeys) => Object.values(apiKeys).some(key => !!key),
      validationMessage: () => "At least one API key is required"
    },
    {
      id: 'models',
      title: 'Models',
      component: ModelSelector,
      isValid: (config, apiKeys) => 
        config.models.length > 0 && config.models.some(model => !!apiKeys[model.provider]),
      validationMessage: () => "Select at least one model with a valid API key"
    },
    {
      id: 'factors',
      title: 'Prompt Factors',
      component: PromptFactorEditor,
      isValid: (config: AnalysisConfig) => 
        config.promptFactors.length > 0 && 
        !config.promptFactors.some(factor => factor.levels.length === 0),
      validationMessage: (config) => 
        config.promptFactors.length === 0 
          ? "Add at least one prompt factor" 
          : "Each prompt factor must have at least one level"
    },
    {
      id: 'covariates',
      title: 'Prompt Covariates',
      component: PromptVariableEditor,
      isValid: (config) => config.promptCovariates.length > 0,
      validationMessage: () => "Add at least one prompt covariate"
    },
    {
      id: 'response',
      title: 'Response Variables',
      component: ResultAttributeSelector,
      isValid: (config) => config.responseVariables.length > 0,
      validationMessage: () => "Select at least one response variable"
    },
    {
      id: 'pricing',
      title: 'Pricing',
      component: PricingPredictor,
      isValid: () => true,
      validationMessage: () => ""
    }
  ], []);

  const currentStep = steps[currentStepIndex];
  
  const isValidConfig = useMemo(() => {
    return steps.every(step => step.isValid(config, apiKeys));
  }, [steps, config, apiKeys]);

  const canGoNext = currentStepIndex < steps.length - 1 && 
    currentStep.isValid(config, apiKeys);
  
  const canGoPrev = currentStepIndex > 0;

  // Prepare props for each component
  const getComponentProps = (stepId: string) => {
    const baseProps = {
      onChange: (value: any) => {
        const updates: Partial<AnalysisConfig> = {};
        if (stepId === 'models') updates.models = value;
        if (stepId === 'factors') updates.promptFactors = value;
        if (stepId === 'covariates') updates.promptCovariates = value;
        if (stepId === 'response') updates.responseVariables = value;
        handleConfigUpdate(updates);
      },
    };

    // Add specific props for each component
    switch (stepId) {
      case 'setup':
        return {
          ...baseProps,
          onApiKeysChange: handleApiKeysUpdate,
          initialApiKeys: defaultApiKeys,
        };
      case 'models':
        return {
          ...baseProps,
          selectedModels: config.models,
          availableApiKeys: apiKeys,
        };
      case 'factors':
        return {
          ...baseProps,
          factors: config.promptFactors,
          promptCovariates: config.promptCovariates,
          promptFunction: config.promptFunction,
        };
      case 'covariates':
        return {
          ...baseProps,
          variables: config.promptCovariates,
          promptFactors: config.promptFactors,
          promptFunction: config.promptFunction,
        };
      case 'response':
        return {
          ...baseProps,
          selectedAttributes: config.responseVariables,
        };
      case 'pricing':
        return {
          ...baseProps,
          models: config.models,
          promptFactors: config.promptFactors,
          promptCovariates: config.promptCovariates,
        };
      default:
        return baseProps;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center px-3 sm:px-6 py-3 sm:py-4 border-b border-violet-200 bg-violet-50">
        <div className="flex-1">
          <div className="flex items-center gap-2 group">
            <input
              type="text"
              value={config.name}
              onChange={(e) => handleConfigUpdate({ name: e.target.value })}
              className="text-base sm:text-xl font-semibold bg-transparent focus:bg-white px-2 py-1 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 w-full sm:w-64"
              placeholder="New Experiment"
            />
            <span className="text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity">
              ✎
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 px-3 sm:px-6 border-b border-violet-200">
        <div className="flex space-x-1 overflow-x-auto hide-scrollbar">
          {steps.map((step, index) => (
            <button
              key={step.id}
              onClick={() => setCurrentStepIndex(index)}
              className={`py-2 sm:py-3 px-2 sm:px-4 -mb-px relative whitespace-nowrap text-xs sm:text-sm ${
                index === currentStepIndex
                  ? 'text-teal-600 font-medium'
                  : 'text-violet-600 hover:text-violet-800'
              }`}
            >
              {step.title}
              {index === currentStepIndex && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full overflow-y-auto p-3 sm:p-6">
          {React.createElement(
            currentStep.component, 
            getComponentProps(currentStep.id)
          )}
        </div>
      </div>

      {/* Footer with navigation */}
      <div className="flex-shrink-0 p-3 sm:p-6 border-t border-violet-200 bg-violet-100">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0">
          {!currentStep.isValid(config, apiKeys) && (
            <p className="text-xs sm:text-sm text-red-600 font-medium">
              {currentStep.validationMessage(config, apiKeys)}
            </p>
          )}
          <div className="flex-grow" />
          <div className="flex space-x-3">
            {canGoPrev && (
              <button
                onClick={() => setCurrentStepIndex(prev => prev - 1)}
                className="px-4 sm:px-6 py-1 sm:py-2 border-2 border-violet-400 rounded-lg text-violet-700 hover:bg-violet-50 hover:border-violet-500 font-medium text-xs sm:text-sm"
              >
                Previous
              </button>
            )}
            {currentStepIndex < steps.length - 1 ? (
              <button
                onClick={() => setCurrentStepIndex(prev => prev + 1)}
                disabled={!canGoNext}
                className={`px-4 sm:px-6 py-1 sm:py-2 rounded-lg font-medium text-xs sm:text-sm ${
                  canGoNext
                    ? 'bg-violet-600 text-white hover:bg-violet-700'
                    : 'bg-gray-100 text-gray-400 border-2 border-gray-200 cursor-not-allowed'
                }`}
              >
                Next
              </button>
            ) : (
              <button
                onClick={onRunAnalysis}
                disabled={!isValidConfig || isRunning}
                className={`px-4 sm:px-6 py-1 sm:py-2 rounded-lg font-medium text-xs sm:text-sm ${
                  !isValidConfig || isRunning
                    ? 'bg-gray-100 text-gray-400 border-2 border-gray-200 cursor-not-allowed'
                    : 'bg-teal-600 text-white hover:bg-teal-700'
                }`}
              >
                {isRunning ? 'Running...' : 'Run Analysis'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};