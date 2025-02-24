import React, { useMemo, useState } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import { AnalysisData, AnalysisResult } from '@/lib/types/analysis';

interface ResultsVisualizationProps {
    data: AnalysisData;
}

export const ResultsVisualization: React.FC<ResultsVisualizationProps> = ({ data }) => {
    const [selectedCategory, setSelectedCategory] = useState<string>('model');
    const [selectedMetric, setSelectedMetric] = useState<string>(data.config.responseAttributes[0].name);

    const availableCategories = useMemo(() => {
        return ['model', ...data.config.promptCategories.map(cat => cat.name)];
    }, [data.config.promptCategories]);

    const chartData = useMemo(() => {
        const groupedData: Record<string, { total: number; count: number }> = {};

        data.results.forEach(result => {
            let key = '';
            if (selectedCategory === 'model') {
                key = result.llmResponse.model.name;
            } else {
                key = result.categories[selectedCategory] || 'default';
            }

            if (!groupedData[key]) {
                groupedData[key] = { total: 0, count: 0 };
            }
            groupedData[key].total += result.attributes[selectedMetric];
            groupedData[key].count += 1;
        });

        return Object.entries(groupedData).map(([name, { total, count }]) => ({
            name,
            value: total / count,
        }));
    }, [data.results, selectedCategory, selectedMetric]);

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex justify-between mb-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Group By
                    </label>
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                        {availableCategories.map(category => (
                            <option key={category} value={category}>
                                {category.charAt(0).toUpperCase() + category.slice(1)}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Metric
                    </label>
                    <select
                        value={selectedMetric}
                        onChange={(e) => setSelectedMetric(e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                        {data.config.responseAttributes.map(attr => (
                            <option key={attr.name} value={attr.name}>
                                {attr.name.replace(/([A-Z])/g, ' $1').trim()}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            dataKey="name"
                            angle={-45}
                            textAnchor="end"
                            height={80}
                            interval={0}
                        />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar
                            dataKey="value"
                            fill="#4F46E5"
                            name={selectedMetric.replace(/([A-Z])/g, ' $1').trim()}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>

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