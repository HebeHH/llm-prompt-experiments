import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { AnalysisConfig, PromptFactor, ResponseVariable } from '@/lib/types/analysis';
import { LLMModel, LLMProvider } from '@/lib/types/llm';
import { ModelSelector } from '@/components/experiment/sections/ModelSelector';
import { PromptFactorEditor } from '@/components/experiment/sections/PromptFactorEditor';
import { PromptVariableEditor } from '@/components/experiment/sections/PromptVariableEditor';
import ResultAttributeSelector from '@/components/experiment/sections/ResultAttributeSelector';
import { PricingPredictor } from '@/components/experiment/sections/PricingPredictor';
import { ApiKeyManager } from '@/components/experiment/sections/ApiKeyManager';
import { resultAttributes } from '@/lib/constants/resultAttributes';
import { 
  saveNamedConfig, 
  loadSavedConfigs, 
  deleteConfig,
  SavedConfiguration,
  ExtendedProvider
} from '@/lib/utils/configStorage';
import { getApiKeys } from '@/lib/utils/apiKeyManager';

interface ExperimentCreatorProps {
  config?: AnalysisConfig;
  apiKeys?: Record<ExtendedProvider, string>;
  onConfigChange: (config: AnalysisConfig) => void;
  onRunAnalysis: () => void;
  isRunning: boolean;
  onApiKeysChange?: (keys: Record<ExtendedProvider, string>) => void;
}

const defaultApiKeys = getApiKeys();

type WizardStep = {
  id: string;
  title: string;
  component: React.FC<any>;
  isValid: (config: AnalysisConfig, apiKeys: Record<ExtendedProvider, string>) => boolean;
  validationMessage: (config: AnalysisConfig, apiKeys: Record<ExtendedProvider, string>) => string;
};

export const ExperimentCreator: React.FC<ExperimentCreatorProps> = ({
  config: initialConfig,
  apiKeys: initialApiKeys,
  onConfigChange,
  onRunAnalysis,
  isRunning,
  onApiKeysChange
}) => {
  const defaultConfig: AnalysisConfig = {
    name: '',
    description: '',
    models: [],
    promptFactors: [],
    promptNoise: [], // Renamed from promptCovariates
    responseVariables: [],
    promptFunction: (factors: string[], variable: string) => {
      return `${factors.join("\n")}\n${variable}`;
    },
  };

  const [config, setConfig] = useState<AnalysisConfig>(initialConfig || defaultConfig);
  const [apiKeys, setApiKeys] = useState<Record<ExtendedProvider, string>>(initialApiKeys || defaultApiKeys);
  
  // Update state if props change
  useEffect(() => {
    if (initialConfig) {
      setConfig(initialConfig);
    }
  }, [initialConfig]);
  
  useEffect(() => {
    if (initialApiKeys) {
      setApiKeys(initialApiKeys);
    }
  }, [initialApiKeys]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [savedConfigs, setSavedConfigs] = useState<SavedConfiguration[]>([]);
  const configNameInputRef = useRef<HTMLInputElement>(null);

  // Load saved configurations when load modal is opened
  const handleOpenLoadModal = useCallback(() => {
    setSavedConfigs(loadSavedConfigs());
    setShowLoadModal(true);
  }, []);

  const handleSaveConfig = useCallback(() => {
    if (config.name.trim() === '') {
      // If no name is set, focus the name input
      if (configNameInputRef.current) {
        configNameInputRef.current.focus();
      }
      alert('Please provide a name for your configuration before saving.');
      return;
    }

    // Check if a configuration with this name already exists
    const existingConfigs = loadSavedConfigs();
    const nameExists = existingConfigs.some(c => c.name === config.name);
    if (nameExists) {
      const confirmOverwrite = confirm(`A configuration named "${config.name}" already exists. Do you want to replace it?`);
      if (!confirmOverwrite) {
        return;
      }
    }

    // Save the configuration
    saveNamedConfig(config);
    setShowSaveModal(false);
    alert(`Configuration "${config.name}" has been saved successfully!`);
  }, [config]);

  const handleDeleteConfig = useCallback((configId: string, configName: string) => {
    if (confirm(`Are you sure you want to delete "${configName}"?`)) {
      deleteConfig(configId);
      setSavedConfigs(loadSavedConfigs());
    }
  }, []);

  const handleLoadConfig = useCallback((savedConfig: SavedConfiguration) => {
    // Restore functions to the configuration
    const restoredConfig: AnalysisConfig = {
      ...savedConfig.config,
      promptFunction: config.promptFunction,
      responseVariables: savedConfig.config.responseVariables.map(variable => {
        const matchingAttribute = resultAttributes.find(attr => attr.name === variable.name);
        if (matchingAttribute) {
          return {
            ...variable,
            function: matchingAttribute.function,
            requiresApiCall: matchingAttribute.requiresApiCall
          };
        }
        return variable as ResponseVariable;
      })
    };
    
    // Update the current configuration
    setConfig(restoredConfig);
    onConfigChange(restoredConfig);
    setShowLoadModal(false);
  }, [config.promptFunction, onConfigChange]);

  const handleConfigUpdate = useCallback((update: Partial<AnalysisConfig>) => {
    const newConfig = { ...config, ...update };
    setConfig(newConfig);
    onConfigChange(newConfig);
  }, [config, onConfigChange]);

  const handleApiKeysUpdate = useCallback((keys: Record<ExtendedProvider, string>) => {
    // Only update state if the keys have actually changed
    setApiKeys(prevKeys => {
      // Check if keys are different from previous keys
      const hasChanged = Object.entries(keys).some(
        ([provider, value]) => prevKeys[provider as ExtendedProvider] !== value
      );
      
      // If keys haven't changed, return the previous state to avoid re-render
      if (!hasChanged) return prevKeys;
      
      // Otherwise, update the keys
      if (onApiKeysChange) {
        onApiKeysChange(keys);
      }
      return keys;
    });
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
      id: 'noise',
      title: 'Prompt Noise',
      component: PromptVariableEditor,
      isValid: (config) => config.promptNoise?.length > 0,
      validationMessage: () => "Add at least one prompt noise variable"
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
        if (stepId === 'noise') updates.promptNoise = value; // Updated from 'covariates'
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
          promptNoise: config.promptNoise, // Renamed from promptCovariates
          promptFunction: config.promptFunction,
        };
      case 'noise':
        return {
          ...baseProps,
          variables: config.promptNoise, // Renamed from promptCovariates
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
          promptNoise: config.promptNoise, // Renamed from promptCovariates
        };
      default:
        return baseProps;
    }
  };

  // Save Configuration Modal
  const SaveModal = () => {
    // Use local state to avoid input focus issues
    const [configName, setConfigName] = useState(config.name);
    
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setConfigName(e.target.value);
    };
    
    const handleSave = () => {
      handleConfigUpdate({ name: configName });
      // Call the save function with a small delay to ensure name update is processed
      setTimeout(() => handleSaveConfig(), 0);
    };
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
          <h3 className="text-lg font-semibold mb-4">Save Configuration</h3>
          <p className="mb-4 text-gray-600">
            Save this experiment configuration for later use. The configuration will be stored in your browser.
          </p>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Configuration Name
            </label>
            <input
              type="text"
              value={configName}
              onChange={handleNameChange}
              ref={configNameInputRef}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="My Experiment Configuration"
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowSaveModal(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-violet-600 text-white rounded hover:bg-violet-700"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    );
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
                  className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer flex justify-between items-center"
                >
                  <div 
                    className="flex-1"
                    onClick={() => handleLoadConfig(saved)}
                  >
                    <div className="font-medium">{saved.name}</div>
                    <div className="text-xs text-gray-500">
                      Saved on {new Date(saved.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteConfig(saved.id, saved.name)}
                    className="text-red-600 hover:text-red-800"
                    title="Delete configuration"
                  >
                    ×
                  </button>
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
        
        {/* Save/Load buttons */}
        <div className="flex space-x-2">
          <button
            onClick={() => setShowSaveModal(true)}
            className="px-3 py-1 text-sm bg-violet-500 text-white rounded hover:bg-violet-600"
            title="Save this configuration"
          >
            Save
          </button>
          <button
            onClick={handleOpenLoadModal}
            className="px-3 py-1 text-sm bg-teal-500 text-white rounded hover:bg-teal-600"
            title="Load a saved configuration"
          >
            Load
          </button>
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

      {/* Modals */}
      {showSaveModal && <SaveModal />}
      {showLoadModal && <LoadModal />}
    </div>
  );
};