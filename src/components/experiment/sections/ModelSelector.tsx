import React, { useState } from 'react';
import { LLMModel } from '../../../lib/types/llm';
import { models } from '../../../lib/constants/models';

interface ModelSelectorProps {
  selectedModels: LLMModel[];
  onChange: (models: LLMModel[]) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModels,
  onChange,
}) => {
  const [filterProvider, setFilterProvider] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'provider' | 'cost'>('provider');

  const providers = ['all', ...new Set(models.map(m => m.provider))];

  const filteredModels = models.filter(
    model => filterProvider === 'all' || model.provider === filterProvider
  );

  const sortedModels = [...filteredModels].sort((a, b) => {
    if (sortBy === 'provider') {
      return a.provider.localeCompare(b.provider);
    }
    // Sort by input cost as a proxy for overall cost
    return a.pricing.perMillionTokensInput - b.pricing.perMillionTokensInput;
  });

  const isModelSelected = (model: LLMModel) =>
    selectedModels.some(m => m.name === model.name);

  const handleModelToggle = (model: LLMModel) => {
    if (isModelSelected(model)) {
      onChange(selectedModels.filter(m => m.name !== model.name));
    } else {
      onChange([...selectedModels, model]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Models</h3>
        <div className="flex space-x-4">
          <select
            value={filterProvider}
            onChange={(e) => setFilterProvider(e.target.value)}
            className="px-3 py-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {providers.map(provider => (
              <option key={provider} value={provider}>
                {provider === 'all' ? 'All Providers' : provider}
              </option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'provider' | 'cost')}
            className="px-3 py-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="provider">Sort by Provider</option>
            <option value="cost">Sort by Cost</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedModels.map(model => (
          <div
            key={model.name}
            className={`p-4 rounded-lg border-2 transition-colors cursor-pointer ${
              isModelSelected(model)
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300'
            }`}
            onClick={() => handleModelToggle(model)}
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-gray-900">{model.name}</h4>
                <p className="text-sm text-gray-500 capitalize">{model.provider}</p>
              </div>
              <input
                type="checkbox"
                checked={isModelSelected(model)}
                onChange={() => handleModelToggle(model)}
                className="h-5 w-5 text-blue-600"
              />
            </div>
            <div className="mt-2 text-sm text-gray-600">
              <p>Input: ${model.pricing.perMillionTokensInput.toFixed(2)}/M tokens</p>
              <p>Output: ${model.pricing.perMillionTokensOutput.toFixed(2)}/M tokens</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 