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
import { GraphProps } from '@/lib/types/graphs';
import { BaseGraph } from './BaseGraph';

const COLORS = [
    '#4F46E5', '#10B981', '#F59E0B', '#EF4444',
    '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'
];

export const StackedBarGraph: React.FC<GraphProps> = (props) => {
    const { data, config } = props;

    const chartData = useMemo(() => {
        if (!config.colorAxis) return [];

        const groupedData: Record<string, Record<string, { total: number; count: number }>> = {};

        data.results.forEach(result => {
            let xKey = '';
            if (config.xAxis.name === 'model') {
                xKey = result.llmResponse.model.name;
            } else {
                xKey = result.categories[config.xAxis.name] || 'default';
            }

            let colorKey = '';
            if (config.colorAxis!.name === 'model') {
                colorKey = result.llmResponse.model.name;
            } else {
                colorKey = result.categories[config.colorAxis!.name] || 'default';
            }

            if (!groupedData[xKey]) {
                groupedData[xKey] = {};
            }
            if (!groupedData[xKey][colorKey]) {
                groupedData[xKey][colorKey] = { total: 0, count: 0 };
            }

            groupedData[xKey][colorKey].total += result.attributes[config.yAxis.name];
            groupedData[xKey][colorKey].count += 1;
        });

        const colorKeys = new Set<string>();
        Object.values(groupedData).forEach(group => {
            Object.keys(group).forEach(key => colorKeys.add(key));
        });

        return Object.entries(groupedData).map(([name, values]) => ({
            name,
            ...Object.fromEntries(
                Array.from(colorKeys).map(colorKey => [
                    colorKey,
                    values[colorKey] 
                        ? values[colorKey].total / values[colorKey].count 
                        : 0
                ])
            )
        }));
    }, [data.results, config.xAxis.name, config.yAxis.name, config.colorAxis]);

    const colorCategories = useMemo(() => {
        if (!config.colorAxis) return [];
        
        const categories = new Set<string>();
        data.results.forEach(result => {
            if (config.colorAxis!.name === 'model') {
                categories.add(result.llmResponse.model.name);
            } else {
                categories.add(result.categories[config.colorAxis!.name] || 'default');
            }
        });
        return Array.from(categories);
    }, [data.results, config.colorAxis]);

    const chart = (
        <div className="h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                    data={chartData}
                    layout="horizontal"
                    margin={{ top: 30, left: 10, right: 10, bottom: 100 }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                        dataKey="name"
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        interval={0}
                        label={{ 
                            value: config.xAxis.label, 
                            position: 'bottom', 
                            offset: -80
                        }}
                    />
                    <YAxis
                        label={{ 
                            value: config.yAxis.label,
                            angle: -90,
                            position: 'insideLeft'
                        }}
                    />
                    <Tooltip />
                    <Legend 
                        verticalAlign="top"
                        height={36}
                    />
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