import React, { useState } from 'react';
import { AnalysisData } from '@/lib/types/analysis';
import { GraphConfig, GraphType, DEFAULT_GRAPH_CONFIGS, getAvailableAxes } from '@/lib/types/graphs';
import { BarGraph } from './graphs/BarGraph';
import { StackedBarGraph } from './graphs/StackedBarGraph';
import { v4 as uuidv4 } from 'uuid';

interface ResultsVisualizationProps {
    data: AnalysisData;
}

const AddChartModal: React.FC<{
    onAdd: (type: GraphType) => void;
    onClose: () => void;
}> = ({ onAdd, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
                <h3 className="text-lg font-semibold mb-4">Add New Chart</h3>
                <div className="space-y-4">
                    <button
                        onClick={() => { onAdd('bar'); onClose(); }}
                        className="w-full p-4 text-left border rounded hover:bg-gray-50"
                    >
                        <div className="font-medium">Bar Chart</div>
                        <div className="text-sm text-gray-500">Compare values across categories</div>
                    </button>
                    <button
                        onClick={() => { onAdd('stackedBar'); onClose(); }}
                        className="w-full p-4 text-left border rounded hover:bg-gray-50"
                    >
                        <div className="font-medium">Stacked Bar Chart</div>
                        <div className="text-sm text-gray-500">Compare values across categories with an additional grouping</div>
                    </button>
                </div>
                <div className="mt-6 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export const ResultsVisualization: React.FC<ResultsVisualizationProps> = ({ data }) => {
    const { categorical, numerical } = getAvailableAxes(data);
    const [showAddModal, setShowAddModal] = useState(false);
    const [graphs, setGraphs] = useState<GraphConfig[]>(() => {
        // Start with a default bar graph
        const baseConfig = DEFAULT_GRAPH_CONFIGS.bar;
        return [{
            ...baseConfig,
            id: uuidv4(),
            title: 'Analysis Results',
            yAxis: {
                ...baseConfig.yAxis,
                ...numerical[0]
            }
        }];
    });

    const addGraph = (type: GraphType) => {
        const baseConfig = DEFAULT_GRAPH_CONFIGS[type];
        // For stacked bar chart, ensure we pick different axes
        let colorAxis = undefined;
        if (type === 'stackedBar' && categorical.length > 1) {
            // Pick a different category than the x-axis for color
            colorAxis = categorical.find(cat => cat.name !== baseConfig.xAxis.name) || categorical[0];
        }
        
        const config: GraphConfig = {
            ...baseConfig,
            id: uuidv4(),
            title: `New ${type} Graph`,
            yAxis: {
                ...baseConfig.yAxis,
                ...numerical[0]
            },
            ...(colorAxis ? { colorAxis } : {})
        };
        setGraphs([...graphs, config]);
    };

    const updateGraph = (id: string, newConfig: GraphConfig) => {
        setGraphs(graphs.map(g => g.id === id ? newConfig : g));
    };

    const removeGraph = (id: string) => {
        setGraphs(graphs.filter(g => g.id !== id));
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Analysis Results</h2>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    Add New Chart
                </button>
            </div>

            {graphs.map(graph => {
                const GraphComponent = graph.type === 'bar' ? BarGraph : StackedBarGraph;
                return (
                    <GraphComponent
                        key={graph.id}
                        data={data}
                        config={graph}
                        onConfigChange={(newConfig) => updateGraph(graph.id, newConfig)}
                        onRemove={() => removeGraph(graph.id)}
                    />
                );
            })}

            {showAddModal && (
                <AddChartModal
                    onAdd={addGraph}
                    onClose={() => setShowAddModal(false)}
                />
            )}

            <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4">Raw Results</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Model
                                </th>
                                {data.config.promptCategories.map(category => (
                                    <th key={category.name} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        {category.name}
                                    </th>
                                ))}
                                {data.config.responseAttributes.map(attr => (
                                    <th key={attr.name} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        {attr.name.replace(/([A-Z])/g, ' $1').trim()}
                                    </th>
                                ))}
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Response
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {data.results.map((result, index) => (
                                <tr key={index}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {result.llmResponse.model.name}
                                    </td>
                                    {data.config.promptCategories.map(category => (
                                        <td key={category.name} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {result.categories[category.name] || 'default'}
                                        </td>
                                    ))}
                                    {data.config.responseAttributes.map(attr => (
                                        <td key={attr.name} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {typeof result.attributes[attr.name] === 'number' 
                                                ? result.attributes[attr.name].toFixed(3)
                                                : result.attributes[attr.name]}
                                        </td>
                                    ))}
                                    <td className="px-6 py-4 text-sm text-gray-900 max-w-md truncate">
                                        <button
                                            onClick={() => alert(result.llmResponse.response)}
                                            className="text-blue-600 hover:text-blue-800"
                                        >
                                            View Response
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}; 