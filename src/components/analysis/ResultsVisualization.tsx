import React, { useState } from 'react';
import { AnalysisData } from '@/lib/types/analysis';
import { 
    GraphConfig, 
    GraphType, 
    DEFAULT_GRAPH_CONFIGS, 
    getAvailableAxes,
    BarGraphConfig,
    StackedBarGraphConfig,
    GroupedBarGraphConfig,
    RadarGraphConfig,
    BoxPlotGraphConfig,
    HistogramGraphConfig
} from '@/lib/types/graphs';
import { BarGraph } from './graphs/BarGraph';
import { StackedBarGraph } from './graphs/StackedBarGraph';
import { GroupedBarGraph } from './graphs/GroupedBarGraph';
import { RadarGraph } from './graphs/RadarGraph';
import { BoxPlotGraph } from './graphs/BoxPlotGraph';
import { HistogramGraph } from './graphs/HistogramGraph';
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
                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
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
                        <div className="text-sm text-gray-500">Compare values across categories with stacking</div>
                    </button>
                    <button
                        onClick={() => { onAdd('groupedBar'); onClose(); }}
                        className="w-full p-4 text-left border rounded hover:bg-gray-50"
                    >
                        <div className="font-medium">Grouped Bar Chart</div>
                        <div className="text-sm text-gray-500">Compare values across categories side by side</div>
                    </button>
                    <button
                        onClick={() => { onAdd('radar'); onClose(); }}
                        className="w-full p-4 text-left border rounded hover:bg-gray-50"
                    >
                        <div className="font-medium">Radar Chart</div>
                        <div className="text-sm text-gray-500">Compare multiple metrics in a radial layout</div>
                    </button>
                    <button
                        onClick={() => { onAdd('boxplot'); onClose(); }}
                        className="w-full p-4 text-left border rounded hover:bg-gray-50"
                    >
                        <div className="font-medium">Box Plot</div>
                        <div className="text-sm text-gray-500">Show statistical distribution with quartiles and outliers</div>
                    </button>
                    <button
                        onClick={() => { onAdd('histogram'); onClose(); }}
                        className="w-full p-4 text-left border rounded hover:bg-gray-50"
                    >
                        <div className="font-medium">Histogram</div>
                        <div className="text-sm text-gray-500">Display frequency distribution of a numerical variable</div>
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
        let newConfig: GraphConfig;

        // Add default values based on graph type
        switch (type) {
            case 'bar':
            case 'boxplot': {
                const typedBaseConfig = baseConfig as typeof DEFAULT_GRAPH_CONFIGS['bar' | 'boxplot'];
                newConfig = {
                    ...baseConfig,
                    id: uuidv4(),
                    title: `New ${type} Graph`,
                    yAxis: {
                        ...typedBaseConfig.yAxis,
                        ...numerical[0]
                    }
                } as BarGraphConfig | BoxPlotGraphConfig;
                break;
            }
            case 'stackedBar':
            case 'groupedBar': {
                const typedBaseConfig = baseConfig as typeof DEFAULT_GRAPH_CONFIGS['stackedBar' | 'groupedBar'];
                newConfig = {
                    ...baseConfig,
                    id: uuidv4(),
                    title: `New ${type} Graph`,
                    yAxis: {
                        ...typedBaseConfig.yAxis,
                        ...numerical[0]
                    },
                    colorAxis: categorical.length > 1
                        ? categorical.find(cat => cat.name !== typedBaseConfig.xAxis.name) || categorical[0]
                        : categorical[0]
                } as StackedBarGraphConfig | GroupedBarGraphConfig;
                break;
            }
            case 'radar': {
                newConfig = {
                    ...baseConfig,
                    id: uuidv4(),
                    title: `New ${type} Graph`,
                    metrics: numerical.slice(0, Math.min(5, numerical.length)),
                    colorAxis: categorical[0]
                } as RadarGraphConfig;
                break;
            }
            case 'histogram': {
                const typedBaseConfig = baseConfig as typeof DEFAULT_GRAPH_CONFIGS['histogram'];
                newConfig = {
                    ...baseConfig,
                    id: uuidv4(),
                    title: `New ${type} Graph`,
                    yAxis: {
                        ...typedBaseConfig.yAxis,
                        ...numerical[0]
                    }
                } as HistogramGraphConfig;
                break;
            }
            default: {
                newConfig = {
                    ...baseConfig,
                    id: uuidv4(),
                    title: `New ${type} Graph`
                } as GraphConfig;
            }
        }

        setGraphs([newConfig, ...graphs]); // Add new graph at the start
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
                let GraphComponent;
                switch (graph.type) {
                    case 'bar':
                        GraphComponent = BarGraph;
                        break;
                    case 'stackedBar':
                        GraphComponent = StackedBarGraph;
                        break;
                    case 'groupedBar':
                        GraphComponent = GroupedBarGraph;
                        break;
                    case 'radar':
                        GraphComponent = RadarGraph;
                        break;
                    case 'boxplot':
                        GraphComponent = BoxPlotGraph;
                        break;
                    case 'histogram':
                        GraphComponent = HistogramGraph;
                        break;
                    default:
                        GraphComponent = BarGraph;
                }
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