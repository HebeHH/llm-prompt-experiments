import React, { useMemo } from 'react';
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
import { GraphProps, StackedBarGraphConfig } from '@/lib/types/graphs';
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

export const StackedBarGraph: React.FC<GraphProps> = (props) => {
    const { data, config } = props;

    // Type guard
    if (config.type !== 'stackedBar') return null;
    const stackedConfig = config as StackedBarGraphConfig;

    const chartData = useMemo(() => {
        const groupedData: Record<string, Record<string, number[]>> = {};

        // Group data by x-axis and color categories
        data.results.forEach(result => {
            let xKey = '';
            if (stackedConfig.xAxis.name === 'model') {
                xKey = result.llmResponse.model.name;
            } else {
                xKey = result.factors[stackedConfig.xAxis.name] || 'default';
            }

            let colorKey = '';
            if (stackedConfig.colorAxis.name === 'model') {
                colorKey = result.llmResponse.model.name;
            } else {
                colorKey = result.factors[stackedConfig.colorAxis.name] || 'default';
            }

            if (!groupedData[xKey]) {
                groupedData[xKey] = {};
            }
            if (!groupedData[xKey][colorKey]) {
                groupedData[xKey][colorKey] = [];
            }

            const value = result.responseVariables[stackedConfig.yAxis.name];
            if (typeof value === 'number') {
                groupedData[xKey][colorKey].push(value);
            }
        });

        // Calculate averages and format data for the chart
        return Object.entries(groupedData).map(([xKey, colorGroups]) => {
            const entry: Record<string, any> = { name: xKey };
            Object.entries(colorGroups).forEach(([colorKey, values]) => {
                if (values.length > 0) {
                    const avg = values.reduce((a, b) => a + b, 0) / values.length;
                    entry[colorKey] = avg;
                }
            });
            return entry;
        });
    }, [data.results, stackedConfig.xAxis.name, stackedConfig.yAxis.name, stackedConfig.colorAxis.name]);

    const colorCategories = useMemo(() => {
        const categories = new Set<string>();
        data.results.forEach(result => {
            let colorKey = '';
            if (stackedConfig.colorAxis.name === 'model') {
                colorKey = result.llmResponse.model.name;
            } else {
                colorKey = result.factors[stackedConfig.colorAxis.name] || 'default';
            }
            categories.add(colorKey);
        });
        return Array.from(categories);
    }, [data.results, stackedConfig.colorAxis.name]);

    const chart = (
        <div className="h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                    data={chartData}
                    margin={{ top: 30, left: 50, right: 30, bottom: 60 }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                        dataKey="name"
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        interval={0}
                        label={{ 
                            value: stackedConfig.xAxis.label, 
                            position: 'insideBottom',
                            offset: -15,
                            style: { textAnchor: 'middle' }
                        }}
                    />
                    <YAxis
                        label={{ 
                            value: stackedConfig.yAxis.label,
                            angle: -90,
                            position: 'insideLeft'
                        }}
                    />
                    <Tooltip />
                    <Legend />
                    {colorCategories.map((category, index) => (
                        <Bar
                            key={category}
                            dataKey={category}
                            stackId="a"
                            fill={COLORS[index % COLORS.length]}
                            name={category}
                        />
                    ))}
                </BarChart>
            </ResponsiveContainer>
        </div>
    );

    return (
        <BaseGraph {...props}>
            {chart}
        </BaseGraph>
    );
}; 