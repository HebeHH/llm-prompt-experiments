import React, { useState, useMemo } from 'react';
import { AnalysisConfig, PromptCategory, ResponseAttribute } from '../../lib/types/analysis';
import { LLMModel } from '../../lib/types/llm';
import { ModelSelector } from './sections/ModelSelector';
import { PromptCategoryEditor } from './sections/PromptCategoryEditor';
import { PromptVariableEditor } from './sections/PromptVariableEditor';
import { ResultAttributeSelector } from './sections/ResultAttributeSelector';
import { PricingPredictor } from './sections/PricingPredictor';

interface ExperimentCreatorProps {
  onConfigChange: (config: AnalysisConfig) => void;
  onRunAnalysis: () => void;
  isRunning: boolean;
}

export const ExperimentCreator: React.FC<ExperimentCreatorProps> = ({
  onConfigChange,
  onRunAnalysis,
  isRunning,
}) => {
  const [config, setConfig] = useState<AnalysisConfig>({
    name: 'New Experiment',
    description: 'A new experiment configuration',
    models: [],
    promptCategories: [],
    promptVariables: [],
    responseAttributes: [],
    promptFunction: (categories: string[], variable: string) => {
      return `${categories.join("\n")}\n${variable}`;
    },
  });

  const handleConfigUpdate = (updates: Partial<AnalysisConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onConfigChange(newConfig);
  };

  const isValidConfig = useMemo(() => {
    // Must have at least one model
    if (config.models.length === 0) return false;

    // Must have at least one prompt variable
    if (config.promptVariables.length === 0) return false;

    // Must have at least one prompt category
    if (config.promptCategories.length === 0) return false;

    // All prompt categories must have at least one option
    if (config.promptCategories.some(cat => cat.categories.length === 0)) return false;

    // Must have at least one result attribute
    if (config.responseAttributes.length === 0) return false;

    return true;
  }, [config]);

  const getValidationMessage = () => {
    if (config.models.length === 0) return "Select at least one model";
    if (config.promptVariables.length === 0) return "Add at least one prompt variable";
    if (config.promptCategories.length === 0) return "Add at least one prompt category";
    if (config.promptCategories.some(cat => cat.categories.length === 0)) {
      return "Each prompt category must have at least one option";
    }
    if (config.responseAttributes.length === 0) return "Select at least one result attribute";
    return "";
  };

  return (
    <div className="space-y-6 p-6 bg-white rounded-lg shadow-lg">
      <div className="space-y-2">
        <input
          type="text"
          value={config.name}
          onChange={(e) => handleConfigUpdate({ name: e.target.value })}
          className="text-2xl font-bold w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Experiment Name"
        />
        <textarea
          value={config.description}
          onChange={(e) => handleConfigUpdate({ description: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Experiment Description"
          rows={2}
        />
      </div>

      <div className="space-y-6">
        <ModelSelector
          selectedModels={config.models}
          onChange={(models) => handleConfigUpdate({ models })}
        />

        <PromptCategoryEditor
          categories={config.promptCategories}
          onChange={(promptCategories) => handleConfigUpdate({ promptCategories })}
        />

        <PromptVariableEditor
          variables={config.promptVariables}
          onChange={(promptVariables) => handleConfigUpdate({ promptVariables })}
        />

        <ResultAttributeSelector
          selectedAttributes={config.responseAttributes}
          onChange={(responseAttributes) => handleConfigUpdate({ responseAttributes })}
        />

        <PricingPredictor
          models={config.models}
          promptCategories={config.promptCategories}
          promptVariables={config.promptVariables}
        />

        <div>
          <button
            onClick={onRunAnalysis}
            disabled={isRunning || !isValidConfig}
            className={`w-full py-3 px-6 rounded-lg text-white font-semibold ${
              isRunning
                ? 'bg-gray-400 cursor-not-allowed'
                : isValidConfig
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
            title={!isValidConfig ? getValidationMessage() : undefined}
          >
            {isRunning ? 'Running Analysis...' : 'Run Analysis'}
          </button>
          {!isValidConfig && (
            <p className="mt-2 text-sm text-red-600">{getValidationMessage()}</p>
          )}
        </div>
      </div>
    </div>
  );
}; 