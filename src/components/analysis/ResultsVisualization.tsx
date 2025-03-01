import React, { useState } from 'react';
import { AnalysisConfig, AnalysisData } from '@/lib/types/analysis';
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
import { BoxPlotGraph } from './graphs/BoxPlotGraph'
import { HistogramGraph } from './graphs/HistogramGraph';
import { ResponseModal } from './ResponseModal';
import { v4 as uuidv4 } from 'uuid';

interface ResultsVisualizationProps {
    data: AnalysisData;
}

interface SortConfig {
    column: string;
    direction: 'asc' | 'desc';
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
                        <div className="text-sm text-gray-500">Compare values across factors</div>
                    </button>
                    <button
                        onClick={() => { onAdd('stackedBar'); onClose(); }}
                        className="w-full p-4 text-left border rounded hover:bg-gray-50"
                    >
                        <div className="font-medium">Stacked Bar Chart</div>
                        <div className="text-sm text-gray-500">Compare values across factors with stacking</div>
                    </button>
                    <button
                        onClick={() => { onAdd('groupedBar'); onClose(); }}
                        className="w-full p-4 text-left border rounded hover:bg-gray-50"
                    >
                        <div className="font-medium">Grouped Bar Chart</div>
                        <div className="text-sm text-gray-500">Compare values across factors side by side</div>
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
    const [selectedResponse, setSelectedResponse] = useState<string | null>(null);
    const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
    const [showRawResults, setShowRawResults] = useState(true);
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

    const handleSort = (column: string) => {
        setSortConfig(current => {
            if (current?.column === column) {
                return {
                    column,
                    direction: current.direction === 'asc' ? 'desc' : 'asc'
                };
            }
            return {
                column,
                direction: 'asc'
            };
        });
    };

    const sortedResults = React.useMemo(() => {
        if (!sortConfig) return data.results;

        return [...data.results].sort((a, b) => {
            let aValue: any;
            let bValue: any;

            if (sortConfig.column === 'model') {
                aValue = a.llmResponse.model.name;
                bValue = b.llmResponse.model.name;
            } else if (sortConfig.column === 'promptId') {
                aValue = a.promptVariableIndex;
                bValue = b.promptVariableIndex;
            } else if (sortConfig.column === 'response') {
                aValue = a.llmResponse.response;
                bValue = b.llmResponse.response;
            } else if (data.config.responseVariables.some(attr => attr.name === sortConfig.column)) {
                aValue = a.responseVariables[sortConfig.column];
                bValue = b.responseVariables[sortConfig.column];
            } else {
                aValue = a.factors[sortConfig.column] || 'default';
                bValue = b.factors[sortConfig.column] || 'default';
            }

            if (aValue === bValue) return 0;

            const compareResult = typeof aValue === 'number' && typeof bValue === 'number'
                ? aValue - bValue
                : String(aValue).localeCompare(String(bValue));

            return sortConfig.direction === 'asc' ? compareResult : -compareResult;
        });
    }, [data.results, sortConfig]);

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

    const generateCSV = (data: AnalysisData): string => {
        // Header row
        const headers = [
            'Model',
            'Prompt ID',
            ...data.config.promptFactors.map(cat => cat.name),
            ...data.config.responseVariables.map(attr => attr.name)
        ];
        
        // Data rows
        const rows = data.results.map(result => [
            result.llmResponse.model.name,
            (result.promptVariableIndex + 1).toString(),
            ...data.config.promptFactors.map(factor => 
                result.factors[factor.name] || 'default'
            ),
            ...data.config.responseVariables.map(attr => {
                const value = result.responseVariables[attr.name];
                return typeof value === 'number' ? value.toFixed(3) : value;
            })
        ]);

        // Combine headers and rows
        return [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');
    };

    const generateJSON = (data: AnalysisData) => {
        const experimentConfig = {
            name: data.config.name,
            description: data.config.description,
            models: data.config.models.map(model => ({
                name: model.name,
                provider: model.provider
            })),
            promptFactors: data.config.promptFactors.map(factor => ({
                name: factor.name,
                levels: factor.levels.map(level => ({
                    name: level.name,
                    prompt: level.prompt
                }))
            })),
            promptCovariates: data.config.promptCovariates,
            responseVariables: data.config.responseVariables
        };

        return {
            config: experimentConfig,
            results: data.results
        };
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

            {selectedResponse && (
                <ResponseModal
                    response={selectedResponse}
                    onClose={() => setSelectedResponse(null)}
                />
            )}

            <div className="mt-8">
                <div 
                    className="flex items-center justify-between mb-4 cursor-pointer hover:bg-gray-50 p-2 rounded"
                    onClick={() => setShowRawResults(!showRawResults)}
                >
                    <h3 className="text-lg font-semibold">Raw Results</h3>
                    <div className="flex items-center space-x-4">
                        {showRawResults && (
                            <div className="flex space-x-2">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const csvContent = generateCSV(data);
                                        const blob = new Blob([csvContent], { type: 'text/csv' });
                                        const url = window.URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `${data.config.name || 'experiment'}_results.csv`;
                                        document.body.appendChild(a);
                                        a.click();
                                        document.body.removeChild(a);
                                        window.URL.revokeObjectURL(url);
                                    }}
                                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                    Download CSV
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const jsonContent = generateJSON(data);
                                        const blob = new Blob([JSON.stringify(jsonContent, null, 2)], { type: 'application/json' });
                                        const url = window.URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `${data.config.name || 'experiment'}_full.json`;
                                        document.body.appendChild(a);
                                        a.click();
                                        document.body.removeChild(a);
                                        window.URL.revokeObjectURL(url);
                                    }}
                                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                    Download JSON
                                </button>
                            </div>
                        )}
                        <span className="text-gray-500 transform transition-transform duration-200" style={{ transform: showRawResults ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                            ▼
                        </span>
                    </div>
                </div>
                {showRawResults && (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th 
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                        onClick={() => handleSort('model')}
                                    >
                                        <div className="flex items-center">
                                            Model
                                            {sortConfig?.column === 'model' && (
                                                <span className="ml-1">
                                                    {sortConfig.direction === 'asc' ? '▲' : '▼'}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                    <th 
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                        onClick={() => handleSort('promptId')}
                                    >
                                        <div className="flex items-center">
                                            Prompt ID
                                            {sortConfig?.column === 'promptId' && (
                                                <span className="ml-1">
                                                    {sortConfig.direction === 'asc' ? '▲' : '▼'}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                    {data.config.promptFactors.map(factor => (
                                        <th 
                                            key={factor.name}
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                            onClick={() => handleSort(factor.name)}
                                        >
                                            <div className="flex items-center">
                                                {factor.name}
                                                {sortConfig?.column === factor.name && (
                                                    <span className="ml-1">
                                                        {sortConfig.direction === 'asc' ? '▲' : '▼'}
                                                    </span>
                                                )}
                                            </div>
                                        </th>
                                    ))}
                                    {data.config.responseVariables.map(attr => (
                                        <th 
                                            key={attr.name}
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                            onClick={() => handleSort(attr.name)}
                                        >
                                            <div className="flex items-center">
                                                {attr.name.replace(/([A-Z])/g, ' $1').trim()}
                                                {sortConfig?.column === attr.name && (
                                                    <span className="ml-1">
                                                        {sortConfig.direction === 'asc' ? '▲' : '▼'}
                                                    </span>
                                                )}
                                            </div>
                                        </th>
                                    ))}
                                    <th 
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                        onClick={() => handleSort('response')}
                                    >
                                        <div className="flex items-center">
                                            Response
                                            {sortConfig?.column === 'response' && (
                                                <span className="ml-1">
                                                    {sortConfig.direction === 'asc' ? '▲' : '▼'}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {sortedResults.map((result, index) => (
                                    <tr key={index}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {result.llmResponse.model.name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {result.promptVariableIndex + 1}
                                        </td>
                                        {data.config.promptFactors.map(factor => (
                                            <td key={factor.name} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {result.factors[factor.name] || 'default'}
                                            </td>
                                        ))}
                                        {data.config.responseVariables.map(attr => (
                                            <td key={attr.name} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {typeof result.responseVariables[attr.name] === 'number'
                                                    ? (result.responseVariables[attr.name] as number).toFixed(3)
                                                    : result.responseVariables[attr.name]}
                                            </td>
                                        ))}
                                        <td className="px-6 py-4 text-sm text-gray-900 max-w-md truncate">
                                            <button
                                                onClick={() => setSelectedResponse(result.llmResponse.response)}
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
                )}
            </div>
        </div>
    );
}; 