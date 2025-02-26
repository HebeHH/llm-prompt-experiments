import React, { useMemo } from 'react';
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    Legend,
    Tooltip,
} from 'recharts';
import { GraphProps, RadarGraphConfig, DataAxis } from '@/lib/types/graphs';
import { BaseGraph } from './BaseGraph';

const COLORS = [
    '#93C5FD', // blue-300
    '#86EFAC', // green-300
    '#FCD34D', // yellow-300
    '#FCA5A5', // red-300
    '#C4B5FD', // violet-300
    '#F9A8D4', // pink-300
    '#5EEAD4', // teal-300
    '#FDBA74'  // orange-300
];

export const RadarGraph: React.FC<GraphProps> = (props) => {
    const { data, config } = props;

    // Type guard
    if (config.type !== 'radar') return null;
    const radarConfig = config as RadarGraphConfig;

    const chartData = useMemo(() => {
        const groupedData: Record<string, Record<string, number[]>> = {};
        const metrics = radarConfig.metrics;

        // Group data by category
        data.results.forEach(result => {
            let category = '';
            if (radarConfig.colorAxis.name === 'model') {
                category = result.llmResponse.model.name;
            } else {
                category = result.categories[radarConfig.colorAxis.name] || 'default';
            }

            if (!groupedData[category]) {
                groupedData[category] = {};
                metrics.forEach((metric: DataAxis) => {
                    groupedData[category][metric.name] = [];
                });
            }

            metrics.forEach((metric: DataAxis) => {
                const value = result.attributes[metric.name];
                if (typeof value === 'number') {
                    groupedData[category][metric.name].push(value);
                }
            });
        });

        // Calculate averages for each metric in each category
        const categories = Object.keys(groupedData);
        const metricRanges = metrics.reduce((acc, metric: DataAxis) => {
            const allValues = categories.flatMap(cat => groupedData[cat][metric.name]);
            acc[metric.name] = {
                min: Math.min(...allValues),
                max: Math.max(...allValues),
            };
            return acc;
        }, {} as Record<string, { min: number; max: number }>);

        // Normalize values to 0-100 scale and format data for the chart
        return metrics.map((metric: DataAxis) => {
            const entry: Record<string, any> = { metric: metric.label };
            categories.forEach(category => {
                const values = groupedData[category][metric.name];
                if (values.length > 0) {
                    const avg = values.reduce((a: number, b: number) => a + b, 0) / values.length;
                    const range = metricRanges[metric.name];
                    const normalized = ((avg - range.min) / (range.max - range.min)) * 100;
                    entry[category] = normalized;
                }
            });
            return entry;
        });
    }, [data.results, radarConfig.colorAxis.name, radarConfig.metrics]);

    const categories = useMemo(() => {
        const cats = new Set<string>();
        data.results.forEach(result => {
            let category = '';
            if (radarConfig.colorAxis.name === 'model') {
                category = result.llmResponse.model.name;
            } else {
                category = result.categories[radarConfig.colorAxis.name] || 'default';
            }
            cats.add(category);
        });
        return Array.from(cats);
    }, [data.results, radarConfig.colorAxis.name]);

    const chart = (
        <div className="h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart
                    data={chartData}
                    margin={{ top: 30, right: 30, bottom: 30, left: 30 }}
                >
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" />
                    <PolarRadiusAxis
                        angle={30}
                        domain={[0, 100]}
                    />
                    <Tooltip
                        content={({ payload }) => {
                            if (!payload || payload.length === 0) return null;
                            const metric = payload[0].payload.metric;
                            return (
                                <div className="bg-white p-2 border rounded shadow">
                                    <p className="font-medium">{metric}</p>
                                    {payload.map(entry => (
                                        <p key={entry.name}>
                                            {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : 'N/A'}
                                        </p>
                                    ))}
                                </div>
                            );
                        }}
                    />
                    <Legend />
                    {categories.map((category, index) => (
                        <Radar
                            key={category}
                            name={category}
                            dataKey={category}
                            stroke={COLORS[index % COLORS.length]}
                            fill={COLORS[index % COLORS.length]}
                            fillOpacity={0.3}
                        />
                    ))}
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );

    return (
        <BaseGraph {...props}>
            {chart}
        </BaseGraph>
    );
}; 