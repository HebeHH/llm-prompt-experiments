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
        // Need at least 3 metrics for a proper radar chart
        if (radarConfig.metrics.length < 3) {
            return [];
        }

        const groupedData: Record<string, Record<string, number[]>> = {};
        const metrics = radarConfig.metrics;

        // Group data by category
        data.results.forEach(result => {
            let category = '';
            if (radarConfig.colorAxis.name === 'model') {
                category = result.llmResponse.model.name;
            } else {
                category = result.factors[radarConfig.colorAxis.name] || String(result.responseVariables[radarConfig.colorAxis.name]) || 'default';
            }

            if (!groupedData[category]) {
                groupedData[category] = {};
                metrics.forEach((metric: DataAxis) => {
                    groupedData[category][metric.name] = [];
                });
            }

            metrics.forEach((metric: DataAxis) => {
                const value = result.responseVariables[metric.name];
                if (typeof value === 'number') {
                    groupedData[category][metric.name].push(value);
                }
            });
        });

        // Calculate ranges for each metric
        const categories = Object.keys(groupedData);
        const metricRanges = metrics.reduce((acc, metric: DataAxis) => {
            const allValues = categories.flatMap(cat => groupedData[cat][metric.name]);
            // Ensure we have valid values
            if (allValues.length === 0) {
                acc[metric.name] = { min: 0, max: 100 };
                return acc;
            }
            
            const min = Math.min(...allValues);
            const max = Math.max(...allValues);
            
            // Handle case where min === max (avoid division by zero)
            if (min === max) {
                acc[metric.name] = { min: min > 0 ? 0 : min, max: max > 0 ? max * 1.1 : 1 };
            } else {
                acc[metric.name] = { min, max };
            }
            
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
                    // Prevent division by zero
                    const normalized = range.max !== range.min 
                        ? ((avg - range.min) / (range.max - range.min)) * 100 
                        : 50; // Default to middle value if range is 0
                    
                    entry[category] = normalized;
                } else {
                    // Ensure all categories have a value for this metric
                    entry[category] = 0;
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
                category = result.factors[radarConfig.colorAxis.name] || String(result.responseVariables[radarConfig.colorAxis.name]) || 'default';
            }
            cats.add(category);
        });
        return Array.from(cats);
    }, [data.results, radarConfig.colorAxis.name]);

    const chart = (
        <div className="h-[500px]">
            {radarConfig.metrics.length < 3 ? (
                <div className="flex h-full items-center justify-center">
                    <div className="text-center p-6 bg-gray-100 rounded-lg">
                        <p className="text-lg font-medium text-gray-700">
                            Please select at least 3 metrics for the radar chart
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                            A radar chart requires 3 or more metrics to form a polygon
                        </p>
                    </div>
                </div>
            ) : (
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart
                        data={chartData}
                        margin={{ top: 30, right: 30, bottom: 30, left: 30 }}
                    >
                        <PolarGrid gridType="polygon" />
                        <PolarAngleAxis dataKey="metric" />
                        <PolarRadiusAxis
                            angle={30}
                            domain={[0, 100]}
                        />
                        <Tooltip
                            content={(props: any) => {
                                if (!props || !props.payload || !props.payload.length) return null;
                                const metric = props.payload[0]?.payload?.metric;
                                if (!metric) return null;
                                
                                return (
                                    <div className="bg-white p-2 border rounded shadow">
                                        <p className="font-medium">{metric}</p>
                                        {props.payload.map((entry: any, i: number) => (
                                            <p key={`${entry.name}-${i}`}>
                                                {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : 'N/A'}
                                            </p>
                                        ))}
                                    </div>
                                );
                            }}
                        />
                        <Legend 
                            verticalAlign="top"
                            height={36}
                        />
                        {categories.map((category, index) => (
                            <Radar
                                key={category}
                                name={category}
                                dataKey={category}
                                stroke={COLORS[index % COLORS.length]}
                                fill={COLORS[index % COLORS.length]}
                                fillOpacity={0.3}
                                dot
                                isAnimationActive={false}
                                animationBegin={0}
                                animationDuration={0}
                            />
                        ))}
                    </RadarChart>
                </ResponsiveContainer>
            )}
        </div>
    );

    return (
        <BaseGraph {...props}>
            {chart}
        </BaseGraph>
    );
}; 