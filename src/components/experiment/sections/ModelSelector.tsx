import React, { useState } from 'react';
import { LLMModel, LLMProvider } from '@/lib/types/llm';
import { models } from '@/lib/constants/llms';

interface ModelSelectorProps {
  selectedModels: LLMModel[];
  onChange: (models: LLMModel[]) => void;
  availableApiKeys?: Record<LLMProvider, string>;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModels,
  onChange,
  availableApiKeys = {}
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
    const isSelected = selectedModels.some(m => m.name === model.name);
    if (isSelected) {
      onChange(selectedModels.filter(m => m.name !== model.name));
    } else {
      onChange([...selectedModels, model]);
    }
  };

  const isModelAvailable = (model: LLMModel) => {
    return !!availableApiKeys[model.provider];
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
        {sortedModels.map(model => {
          const isSelected = isModelSelected(model);
          const isAvailable = isModelAvailable(model);

          return (
            <div
              key={model.name}
              className={`relative flex items-center p-4 border rounded-lg 
                ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'} 
                ${!isAvailable ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'}`}
              onClick={() => isAvailable && handleModelToggle(model)}
            >
              <div className="flex-1">
                <h4 className="font-medium">{model.name}</h4>
                <p className="text-sm text-gray-500">{model.provider}</p>
              </div>
              {!isAvailable && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-50 rounded-lg">
                  <span className="text-sm text-gray-500">API key required</span>
                </div>
              )}
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <svg className="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}; 