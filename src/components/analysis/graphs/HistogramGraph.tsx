import React, { useMemo } from 'react';
import {
    ResponsiveContainer,
    ComposedChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend
} from 'recharts';
import { GraphProps, HistogramGraphConfig } from '@/lib/types/graphs';
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

const BINS = 20;

interface HistogramData {
    binStart: number;
    [key: string]: number;
}

export const HistogramGraph: React.FC<GraphProps> = (props) => {
    const { data, config } = props;

    // Type guard
    if (config.type !== 'histogram') return null;
    const histogramConfig = config as HistogramGraphConfig;

    const chartData = useMemo(() => {
        // Get all values for the y-axis
        const allValues = data.results.map(r => r.attributes[histogramConfig.yAxis.name]);
        
        // Calculate bin size
        const min = Math.min(...allValues);
        const max = Math.max(...allValues);
        const binSize = (max - min) / BINS;

        // Initialize bins
        const bins: { [key: string]: { [key: string]: number } } = {};
        for (let i = 0; i < BINS; i++) {
            const binStart = min + i * binSize;
            bins[binStart] = {};
        }

        // Group data by category if colorAxis is specified
        const categories = histogramConfig.colorAxis 
            ? [...new Set(data.results.map(r => 
                histogramConfig.colorAxis!.name === 'model' 
                    ? r.llmResponse.model.name 
                    : r.categories[histogramConfig.colorAxis!.name] || 'default'
            ))]
            : ['default'];

        // Initialize category counts in each bin
        Object.keys(bins).forEach(binStart => {
            categories.forEach(category => {
                bins[binStart][category] = 0;
            });
        });

        // Count values in bins
        data.results.forEach(result => {
            const value = result.attributes[histogramConfig.yAxis.name];
            const binIndex = Math.floor((value - min) / binSize);
            const binStart = min + binIndex * binSize;
            
            const category = histogramConfig.colorAxis
                ? histogramConfig.colorAxis.name === 'model'
                    ? result.llmResponse.model.name
                    : result.categories[histogramConfig.colorAxis.name] || 'default'
                : 'default';

            if (bins[binStart]) {
                bins[binStart][category]++;
            }
        });

        // Convert to chart data format
        return Object.entries(bins)
            .map(([binStart, counts]) => ({
                binStart: parseFloat(binStart).toFixed(2),
                ...counts
            }));
    }, [data.results, histogramConfig]);

    const chart = (
        <div className="h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 30, left: 50, right: 30, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                        dataKey="binStart"
                        label={{ 
                            value: histogramConfig.yAxis.label,
                            position: 'insideBottom',
                            offset: -15,
                            style: { textAnchor: 'middle' }
                        }}
                    />
                    <YAxis
                        label={{ 
                            value: 'Count',
                            angle: -90,
                            position: 'insideLeft'
                        }}
                    />
                    <Tooltip />
                    <Legend />
                    {(histogramConfig.colorAxis?.name === 'model'
                        ? data.results.map(r => r.llmResponse.model.name)
                        : histogramConfig.colorAxis
                            ? [...new Set(data.results.map(r => r.categories[histogramConfig.colorAxis!.name] || 'default'))]
                            : ['default']
                    ).map((category, index) => (
                        <Bar
                            key={category}
                            dataKey={category}
                            fill={COLORS[index % COLORS.length]}
                            barSize={40}
                        />
                    ))}
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );

    return (
        <BaseGraph {...props}>
            {chart}
        </BaseGraph>
    );
}; 