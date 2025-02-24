import React from 'react';
import { AnalysisConfig } from '@/lib/types/analysis';

interface AnalysisSelectorProps {
    config: AnalysisConfig;
    onConfigChange: (config: AnalysisConfig) => void;
    onRunAnalysis: () => void;
    isRunning: boolean;
}

export const AnalysisSelector: React.FC<AnalysisSelectorProps> = ({
    config,
    onConfigChange,
    onRunAnalysis,
    isRunning,
}) => {
    const handleModelToggle = (modelName: string) => {
        const updatedModels = config.models.map(model => ({
            ...model,
            enabled: model.name === modelName ? !(model as any).enabled : (model as any).enabled,
        }));
        onConfigChange({ ...config, models: updatedModels });
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-4">{config.name}</h2>
            <p className="text-gray-600 mb-6">{config.description}</p>

            <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Models</h3>
                <div className="space-y-2">
                    {config.models.map(model => (
                        <div key={model.name} className="flex items-center">
                            <input
                                type="checkbox"
                                id={model.name}
                                checked={(model as any).enabled !== false}
                                onChange={() => handleModelToggle(model.name)}
                                className="mr-2"
                            />
                            <label htmlFor={model.name} className="text-gray-700">
                                {model.name} ({model.provider})
                            </label>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Prompt Categories</h3>
                {config.promptCategories.map(category => (
                    <div key={category.name} className="mb-4">
                        <h4 className="font-medium text-gray-700 mb-2">{category.name}</h4>
                        <div className="grid grid-cols-2 gap-2">
                            {category.categories.map(cat => (
                                <div key={cat.name} className="text-sm text-gray-600">
                                    {cat.name}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Sample Questions</h3>
                <div className="text-sm text-gray-600 space-y-1">
                    {config.promptVariables.map((variable, index) => (
                        <div key={index}>{variable}</div>
                    ))}
                </div>
            </div>

            <button
                onClick={onRunAnalysis}
                disabled={isRunning}
                className={`w-full py-2 px-4 rounded-md text-white font-medium ${
                    isRunning
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700'
                }`}
            >
                {isRunning ? 'Running Analysis...' : 'Run Analysis'}
            </button>
        </div>
    );
}; 