import { ResponseVariable, ResponseVariableType } from '@/lib/types/analysis';
import { resultAttributes } from '@/lib/constants/resultAttributes';
import { useEffect, useState } from 'react';

interface ResultAttributeSelectorProps {
  selectedAttributes: ResponseVariable[];
  onChange: (attributes: ResponseVariable[]) => void;
}

interface AttributeConfigModalProps {
  attribute: ResponseVariable;
  onSave: (attribute: ResponseVariable, config: any) => void;
  onCancel: () => void;
}

// Only select Word Count by default
const DEFAULT_SELECTED_ATTRIBUTES = ['Word Count'];

function AttributeConfigModal({ attribute, onSave, onCancel }: AttributeConfigModalProps) {
  const [config, setConfig] = useState<any>({});

  const handleSave = () => {
    if (attribute.type === 'sentiment-api') {
      // For sentiment analysis, use a placeholder API key that will be replaced later
      onSave(attribute, { 
        name: attribute.name,
        description: attribute.description,
        apiKey: '' 
      });
    } else {
      onSave(attribute, config);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
        <h3 className="text-lg font-semibold mb-4">Configure {attribute.name}</h3>
        
        {attribute.type === 'word-occurrence' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Search Term</label>
            <input
              type="text"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={config.searchTerm || ''}
              onChange={(e) => setConfig({ ...config, searchTerm: e.target.value })}
              placeholder="Enter word or phrase to search for"
            />
          </div>
        )}

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ResultAttributeSelector({
  selectedAttributes,
  onChange,
}: ResultAttributeSelectorProps) {
  const [configuring, setConfiguring] = useState<ResponseVariable | null>(null);

  useEffect(() => {
    // Set default attributes when component mounts and no attributes are selected
    if (selectedAttributes.length === 0) {
      const defaultAttributes = resultAttributes.filter(attr => 
        DEFAULT_SELECTED_ATTRIBUTES.includes(attr.name)
      );
      onChange(defaultAttributes);
    }
  }, [selectedAttributes.length, onChange]);

  const isAttributeSelected = (attribute: ResponseVariable) => {
    return selectedAttributes.some(a => a.name === attribute.name);
  };

  const handleAttributeToggle = (attribute: ResponseVariable) => {
    if (isAttributeSelected(attribute)) {
      onChange(selectedAttributes.filter(a => a.name !== attribute.name));
    } else if (attribute.type === 'simple') {
      onChange([...selectedAttributes, attribute]);
    } else if (attribute.type === 'sentiment-api') {
      // For sentiment analysis, add a placeholder config that will be replaced later
      const sentimentConfig = {
        ...attribute,
        config: {
          name: attribute.name,
          description: attribute.description,
          apiKey: '' // This will be replaced in the page.tsx before analysis
        }
      };
      onChange([...selectedAttributes, sentimentConfig]);
    } else {
      setConfiguring(attribute);
    }
  };

  const handleSaveConfig = (attribute: ResponseVariable, config: any) => {
    const updatedAttributes = [...selectedAttributes];
    const index = updatedAttributes.findIndex(a => a.name === attribute.name);
    
    if (index >= 0) {
      updatedAttributes[index] = { ...attribute, config };
    } else {
      updatedAttributes.push({ ...attribute, config });
    }
    
    onChange(updatedAttributes);
    setConfiguring(null);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Fixed header section */}
      <div className="flex-shrink-0 mb-4">
        <h3 className="text-lg font-medium">Select Result Variables</h3>
        <p className="text-sm text-gray-500">
          Choose which variables to calculate for each response
        </p>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resultAttributes.map(attribute => (
            <div
              key={attribute.name}
              className={`p-4 rounded-lg border-2 transition-colors cursor-pointer ${
                isAttributeSelected(attribute)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
              onClick={() => handleAttributeToggle(attribute)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">{attribute.name}</h4>
                  <p className="text-sm text-gray-600">{attribute.description}</p>
                  {attribute.type !== 'simple' && attribute.type !== 'sentiment-api' && !isAttributeSelected(attribute) && (
                    <span className="inline-block mt-2 text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                      Requires configuration
                    </span>
                  )}
                </div>
                <input
                  type="checkbox"
                  checked={isAttributeSelected(attribute)}
                  onChange={() => handleAttributeToggle(attribute)}
                  className="h-5 w-5 text-blue-600"
                />
              </div>
            </div>
          ))}
        </div>

        {configuring && (
          <AttributeConfigModal
            attribute={configuring}
            onSave={handleSaveConfig}
            onCancel={() => setConfiguring(null)}
          />
        )}
      </div>
    </div>
  );
} 