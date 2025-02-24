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

type ChartType = 'model' | 'style' | 'length';
type MetricType = 'emojiCount' | 'uniqueEmojiCount' | 'emojiDensity';

export const ResultsVisualization: React.FC<ResultsVisualizationProps> = ({ data }) => {
    const [chartType, setChartType] = useState<ChartType>('model');
    const [metric, setMetric] = useState<MetricType>('emojiCount');

    const chartData = useMemo(() => {
        const groupedData: Record<string, { total: number; count: number }> = {};

        data.results.forEach(result => {
            let key = '';
            switch (chartType) {
                case 'model':
                    key = result.llmResponse.model.name;
                    break;
                case 'style':
                    key = result.categories.style || 'default';
                    break;
                case 'length':
                    key = result.categories.length || 'default';
                    break;
            }

            if (!groupedData[key]) {
                groupedData[key] = { total: 0, count: 0 };
            }
            groupedData[key].total += result.attributes[metric];
            groupedData[key].count += 1;
        });

        return Object.entries(groupedData).map(([name, { total, count }]) => ({
            name,
            value: total / count,
        }));
    }, [data.results, chartType, metric]);

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex justify-between mb-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Group By
                    </label>
                    <select
                        value={chartType}
                        onChange={(e) => setChartType(e.target.value as ChartType)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                        <option value="model">Model</option>
                        <option value="style">Style</option>
                        <option value="length">Length</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Metric
                    </label>
                    <select
                        value={metric}
                        onChange={(e) => setMetric(e.target.value as MetricType)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                        <option value="emojiCount">Total Emojis</option>
                        <option value="uniqueEmojiCount">Unique Emojis</option>
                        <option value="emojiDensity">Emoji Density</option>
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
                            name={metric}
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
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Style
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Length
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Total Emojis
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Unique Emojis
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Emoji Density
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {data.results.map((result, index) => (
                                <tr key={index}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {result.llmResponse.model.name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {result.categories.style || 'default'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {result.categories.length || 'default'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {result.attributes.emojiCount}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {result.attributes.uniqueEmojiCount}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {result.attributes.emojiDensity.toFixed(3)}
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