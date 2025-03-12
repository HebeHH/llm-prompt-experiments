import React from 'react';
import { DataAxis, GraphProps, getAvailableAxes } from '@/lib/types/graphs';
import { exportGraphAsImage, downloadImage } from '@/lib/utils/graphImageExport';

interface BaseGraphProps extends GraphProps {
    children: React.ReactNode;
}

export const BaseGraph: React.FC<BaseGraphProps> = ({ data, config, onConfigChange, onRemove, children }) => {
    const { categorical, numerical } = getAvailableAxes(data);

    const handleDownloadImage = async () => {
        try {
            const imageDataUrl = await exportGraphAsImage(data, config, {
                title: config.title,
                fileName: `${config.title || 'graph'}.png`
            });
            
            downloadImage(imageDataUrl, `${config.title || 'graph'}.png`);
        } catch (error) {
            console.error('Error generating graph image:', error);
            alert('Failed to generate graph image. Please try again.');
        }
    };

    const renderAxisSelector = (
        axis: 'xAxis' | 'yAxis' | 'colorAxis',
        label: string,
        allowedType: 'categorical' | 'numerical'
    ) => {
        // Check if this axis is applicable for the current graph type
        const isAxisApplicable = () => {
            switch (config.type) {
                case 'bar':
                    return axis === 'xAxis' || axis === 'yAxis';
                case 'stackedBar':
                case 'groupedBar':
                    return true;
                case 'radar':
                    return axis === 'colorAxis';
                case 'boxplot':
                    return axis === 'xAxis' || axis === 'yAxis';
                case 'histogram':
                    return axis === 'yAxis';
                default:
                    return false;
            }
        };

        if (!isAxisApplicable()) return null;

        const options = allowedType === 'categorical' ? categorical : numerical;
        const currentValue = (config as any)[axis];

        return (
            <div className="min-w-[200px]">
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
                            } as any);
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

    const renderMetricsSelector = () => {
        if (config.type !== 'radar') return null;

        return (
            <div className="min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Metrics
                </label>
                <select
                    multiple
                    value={config.metrics?.map(m => m.name) || []}
                    onChange={(e) => {
                        const selectedOptions = Array.from(e.target.selectedOptions);
                        const selectedMetrics = selectedOptions
                            .map(option => numerical.find(n => n.name === option.value))
                            .filter((m): m is DataAxis => m !== undefined);
                        
                        onConfigChange({
                            ...config,
                            metrics: selectedMetrics
                        } as any);
                    }}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 h-32"
                >
                    {numerical.map(option => (
                        <option key={option.name} value={option.name}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <p className="text-sm text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple metrics</p>
            </div>
        );
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
            <div className="flex justify-between items-center mb-4">
                <input
                    type="text"
                    value={config.title}
                    onChange={(e) => onConfigChange({ ...config, title: e.target.value } as any)}
                    placeholder="Graph Title"
                    className="text-lg font-semibold border-none focus:ring-0 p-0"
                />
                <div className="flex space-x-4">
                    <button
                        onClick={handleDownloadImage}
                        className="text-blue-600 hover:text-blue-800 flex items-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        Download Image
                    </button>
                    <button
                        onClick={onRemove}
                        className="text-red-600 hover:text-red-800"
                    >
                        Remove Graph
                    </button>
                </div>
            </div>
            <div className="flex flex-wrap gap-4 mb-6">
                {renderAxisSelector('xAxis', 'X Axis', 'categorical')}
                {renderAxisSelector('yAxis', 'Y Axis', 'numerical')}
                {renderAxisSelector('colorAxis', 'Color By', 'categorical')}
                {renderMetricsSelector()}
            </div>
            <div className="pl-8">
                {children}
            </div>
        </div>
    );
}; 