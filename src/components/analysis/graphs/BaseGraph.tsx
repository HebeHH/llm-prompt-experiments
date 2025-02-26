import React from 'react';
import { DataAxis, GraphProps, getAvailableAxes } from '@/lib/types/graphs';

interface BaseGraphProps extends GraphProps {
    children: React.ReactNode;
}

export const BaseGraph: React.FC<BaseGraphProps> = ({ data, config, onConfigChange, onRemove, children }) => {
    const { categorical, numerical } = getAvailableAxes(data);

    const renderAxisSelector = (
        axis: 'xAxis' | 'yAxis' | 'colorAxis',
        label: string,
        allowedType: 'categorical' | 'numerical',
        required = true
    ) => {
        const options = allowedType === 'categorical' ? categorical : numerical;
        const currentValue = config[axis];

        if (!required && !currentValue) return null;

        return (
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                </label>
                <select
                    value={currentValue?.name || ''}
                    onChange={(e) => {
                        const selected = options.find(opt => opt.name === e.target.value);
                        if (selected) {
                            onConfigChange({
                                ...config,
                                [axis]: selected
                            });
                        }
                    }}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                    {options.map(option => (
                        <option key={option.name} value={option.name}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>
        );
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
            <div className="flex justify-between items-center mb-4">
                <input
                    type="text"
                    value={config.title}
                    onChange={(e) => onConfigChange({ ...config, title: e.target.value })}
                    placeholder="Graph Title"
                    className="text-lg font-semibold border-none focus:ring-0 p-0"
                />
                <button
                    onClick={onRemove}
                    className="text-red-600 hover:text-red-800"
                >
                    Remove Graph
                </button>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
                {renderAxisSelector('xAxis', 'X Axis', 'categorical')}
                {renderAxisSelector('yAxis', 'Y Axis', 'numerical')}
                {renderAxisSelector('colorAxis', 'Color By', 'categorical', false)}
            </div>
            {children}
        </div>
    );
}; 