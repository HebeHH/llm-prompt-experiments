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

export const BarGraph: React.FC<GraphProps> = (props) => {
    const { data, config } = props;

    const chartData = useMemo(() => {
        const groupedData: Record<string, { total: number; count: number }> = {};

        data.results.forEach(result => {
            let key = '';
            if (config.xAxis.name === 'model') {
                key = result.llmResponse.model.name;
            } else {
                key = result.categories[config.xAxis.name] || 'default';
            }

            if (!groupedData[key]) {
                groupedData[key] = { total: 0, count: 0 };
            }
            groupedData[key].total += result.attributes[config.yAxis.name];
            groupedData[key].count += 1;
        });

        return Object.entries(groupedData).map(([name, { total, count }]) => ({
            name,
            value: total / count,
        }));
    }, [data.results, config.xAxis.name, config.yAxis.name]);

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
                    <Bar
                        dataKey="value"
                        fill="#4F46E5"
                        name={config.yAxis.label}
                    />
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