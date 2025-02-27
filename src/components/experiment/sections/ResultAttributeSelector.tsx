import React from 'react';
import { ResponseAttribute } from '@/lib/types/analysis';
import { resultAttributes } from '@/lib/constants/resultAttributes'

interface ResultAttributeSelectorProps {
  selectedAttributes: ResponseAttribute[];
  onChange: (attributes: ResponseAttribute[]) => void;
}

export const ResultAttributeSelector: React.FC<ResultAttributeSelectorProps> = ({
  selectedAttributes,
  onChange,
}) => {
  const isAttributeSelected = (attribute: ResponseAttribute) =>
    selectedAttributes.some(a => a.name === attribute.name);

  const handleAttributeToggle = (attribute: ResponseAttribute) => {
    if (isAttributeSelected(attribute)) {
      onChange(selectedAttributes.filter(a => a.name !== attribute.name));
    } else {
      onChange([...selectedAttributes, attribute]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Result Attributes</h3>
      </div>

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
    </div>
  );
}; 