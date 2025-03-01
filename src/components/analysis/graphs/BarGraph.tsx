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
import { GraphProps, BarGraphConfig } from '@/lib/types/graphs';
import { BaseGraph } from './BaseGraph';

export const BarGraph: React.FC<GraphProps> = (props) => {
    const { data, config } = props;
    
    // Type guard
    if (config.type !== 'bar') return null;
    const barConfig = config as BarGraphConfig;

    const chartData = useMemo(() => {
        const groupedData: Record<string, { total: number; count: number }> = {};

        data.results.forEach(result => {
            let key = '';
            if (barConfig.xAxis.name === 'model') {
                key = result.llmResponse.model.name;
            } else {
                key = result.factors[barConfig.xAxis.name] || String(result.responseVariables[barConfig.xAxis.name]) || 'default';
            }

            if (!groupedData[key]) {
                groupedData[key] = { total: 0, count: 0 };
            }

            const value = result.responseVariables[barConfig.yAxis.name];
            // Only aggregate if the value is a number
            if (typeof value === 'number') {
                groupedData[key].total += value;
                groupedData[key].count += 1;
            }
        });

        return Object.entries(groupedData).map(([name, { total, count }]) => ({
            name,
            value: total / count,
        }));
    }, [data.results, barConfig.xAxis.name, barConfig.yAxis.name]);

    const chart = (
        <div className="h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                    data={chartData}
                    layout="horizontal"
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
                            value: barConfig.xAxis.label, 
                            position: 'insideBottom',
                            offset: -15,
                            style: { textAnchor: 'middle' }
                        }}
                    />
                    <YAxis
                        label={{ 
                            value: barConfig.yAxis.label,
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
                        fill="#93C5FD"
                        name={barConfig.yAxis.label}
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