import React, { useState, useMemo, useCallback } from 'react';
import { AnalysisConfig, PromptCategory, ResponseAttribute } from '@/lib/types/analysis';
import { LLMModel, LLMProvider } from '@/lib/types/llm';
import { ModelSelector } from '@/components/experiment/sections/ModelSelector';
import { PromptCategoryEditor } from '@/components/experiment/sections/PromptCategoryEditor';
import { PromptVariableEditor } from '@/components/experiment/sections/PromptVariableEditor';
import { ResultAttributeSelector } from '@/components/experiment/sections/ResultAttributeSelector';
import { PricingPredictor } from '@/components/experiment/sections/PricingPredictor';
import { ApiKeyManager } from '@/components/experiment/sections/ApiKeyManager';
import { resultAttributes } from '@/lib/constants/resultAttributes';

interface ExperimentCreatorProps {
  onConfigChange: (config: AnalysisConfig) => void;
  onRunAnalysis: () => void;
  isRunning: boolean;
  onApiKeysChange?: (keys: Record<LLMProvider, string>) => void;
}

const defaultApiKeys: Record<LLMProvider, string> = {
  anthropic: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || '',
  google: process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '',
  openai: process.env.NEXT_PUBLIC_OPENAI_API_KEY || '',
  groq: process.env.NEXT_PUBLIC_GROQ_API_KEY || ''
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
    promptCategories: [],
    promptVariables: [],
    responseAttributes: [...resultAttributes],
    promptFunction: (categories: string[], variable: string) => {
      return `${categories.join("\n")}\n${variable}`;
    },
  });

  const [apiKeys, setApiKeys] = useState<Record<LLMProvider, string>>(defaultApiKeys);

  const handleConfigUpdate = useCallback((update: Partial<AnalysisConfig>) => {
    const newConfig = { ...config, ...update };
    setConfig(newConfig);
    onConfigChange(newConfig);
  }, [config, onConfigChange]);

  const handleApiKeysUpdate = useCallback((keys: Record<LLMProvider, string>) => {
    setApiKeys(keys);
    if (onApiKeysChange) {
      onApiKeysChange(keys);
    }
  }, [onApiKeysChange]);

  const isValidConfig = useMemo(() => {
    // Must have at least one model with an available API key
    if (config.models.length === 0) return false;
    if (!config.models.some(model => !!apiKeys[model.provider])) return false;

    // Must have at least one prompt variable
    if (config.promptVariables.length === 0) return false;

    // Must have at least one prompt category
    if (config.promptCategories.length === 0) return false;

    // All prompt categories must have at least one option
    if (config.promptCategories.some(cat => cat.categories.length === 0)) return false;

    // Must have at least one result attribute
    if (config.responseAttributes.length === 0) return false;

    return true;
  }, [config, apiKeys]);

  const getValidationMessage = () => {
    if (config.models.length === 0) return "Select at least one model";
    if (!config.models.some(model => !!apiKeys[model.provider])) return "Selected models require API keys";
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
        <ApiKeyManager
          onApiKeysChange={handleApiKeysUpdate}
          initialApiKeys={defaultApiKeys}
        />

        <ModelSelector
          selectedModels={config.models}
          onChange={(models: LLMModel[]) => handleConfigUpdate({ models })}
          availableApiKeys={apiKeys}
        />

        <PromptCategoryEditor
          categories={config.promptCategories}
          onChange={(promptCategories: PromptCategory[]) => handleConfigUpdate({ promptCategories })}
        />

        <PromptVariableEditor
          variables={config.promptVariables}
          onChange={(promptVariables: string[]) => handleConfigUpdate({ promptVariables })}
        />

        <ResultAttributeSelector
          selectedAttributes={config.responseAttributes}
          onChange={(responseAttributes: ResponseAttribute[]) => handleConfigUpdate({ responseAttributes })}
        />

        <PricingPredictor
          models={config.models}
          promptCategories={config.promptCategories}
          promptVariables={config.promptVariables}
        />

        <div className="flex justify-between items-center">
          {!isValidConfig && (
            <p className="text-sm text-red-600">{getValidationMessage()}</p>
          )}
          <div className="flex-grow" />
          <button
            onClick={onRunAnalysis}
            disabled={!isValidConfig || isRunning}
            className={`px-6 py-2 rounded-lg text-white ${
              !isValidConfig || isRunning
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isRunning ? 'Running Analysis...' : 'Run Analysis'}
          </button>
        </div>
      </div>
    </div>
  );
};