import React, { useMemo } from 'react';
import {
    ResponsiveContainer,
    ComposedChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    Scatter,
    RectangleProps
} from 'recharts';
import { GraphProps } from '@/lib/types/graphs';
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

// Original data of boxplot graph
interface BoxPlotStats {
    min: number;
    lowerQuartile: number;
    median: number;
    upperQuartile: number;
    max: number;
    average: number;
}

// Used in stacked bar graph
interface BoxPlotData {
    name: string;
    min: number;
    bottomWhisker: number;
    bottomBox: number;
    topBox: number;
    topWhisker: number;
    average: number;
    size: number; // for average dot size
}

const HorizonBar = (props: RectangleProps) => {
    const { x, y, width, height } = props;

    if (x == null || y == null || width == null || height == null) {
        return null;
    }

    return (
        <line x1={x} y1={y} x2={x + width} y2={y} stroke={"#000"} strokeWidth={3} />
    );
};

const DotBar = (props: RectangleProps) => {
    const { x, y, width, height } = props;

    if (x == null || y == null || width == null || height == null) {
        return null;
    }

    return (
        <line
            x1={x + width / 2}
            y1={y + height}
            x2={x + width / 2}
            y2={y}
            stroke={"#000"}
            strokeWidth={1}
            strokeDasharray={"3"}
        />
    );
};

const calculateStats = (values: number[]): BoxPlotStats | null => {
    if (values.length === 0) return null;
    
    const sorted = [...values].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    
    const q1Index = Math.floor(sorted.length * 0.25);
    const q3Index = Math.floor(sorted.length * 0.75);
    const medianIndex = Math.floor(sorted.length * 0.5);
    
    const lowerQuartile = sorted[q1Index];
    const upperQuartile = sorted[q3Index];
    const median = sorted[medianIndex];
    const average = values.reduce((a, b) => a + b, 0) / values.length;
    
    return { min, max, lowerQuartile, upperQuartile, median, average };
};

const transformToBoxPlotData = (stats: BoxPlotStats, name: string): BoxPlotData => {
    return {
        name,
        min: stats.min,
        bottomWhisker: stats.lowerQuartile - stats.min,
        bottomBox: stats.median - stats.lowerQuartile,
        topBox: stats.upperQuartile - stats.median,
        topWhisker: stats.max - stats.upperQuartile,
        average: stats.average,
        size: 250
    };
};

export const BoxPlotGraph: React.FC<GraphProps> = (props) => {
    const { data, config } = props;

    const chartData = useMemo(() => {
        const groupedData: Record<string, number[]> = {};

        data.results.forEach(result => {
            let key = '';
            if (config.type === 'boxplot') {
                if (config.xAxis.name === 'model') {
                    key = result.llmResponse.model.name;
                } else {
                    key = result.factors[config.xAxis.name] || 'default';
                }

                if (!groupedData[key]) {
                    groupedData[key] = [];
                }
                groupedData[key].push(Number(result.responseVariables[config.yAxis.name]));
            }
        });

        return Object.entries(groupedData)
            .map(([name, values]) => {
                const stats = calculateStats(values);
                if (!stats) return null;
                return transformToBoxPlotData(stats, name);
            })
            .filter((d): d is BoxPlotData => d !== null);
    }, [data.results, config]);

    const chart = (
        <div className="h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 30, left: 50, right: 30, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                        dataKey="name"
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        interval={0}
                        label={{ 
                            value: config.type === 'boxplot' ? config.xAxis.label : '', 
                            position: 'insideBottom',
                            offset: -15,
                            style: { textAnchor: 'middle' }
                        }}
                    />
                    <YAxis
                        label={{ 
                            value: config.type === 'boxplot' ? config.yAxis.label : '',
                            angle: -90,
                            position: 'insideLeft'
                        }}
                    />
                    <Tooltip
                        content={({ payload }) => {
                            if (!payload || payload.length === 0) return null;
                            const data = payload[0].payload as BoxPlotData;
                            return (
                                <div className="bg-white p-2 border rounded shadow">
                                    <p className="font-medium">{data.name}</p>
                                    <p>Min: {data.min.toFixed(2)}</p>
                                    <p>Q1: {(data.min + data.bottomWhisker).toFixed(2)}</p>
                                    <p>Median: {(data.min + data.bottomWhisker + data.bottomBox).toFixed(2)}</p>
                                    <p>Q3: {(data.min + data.bottomWhisker + data.bottomBox + data.topBox).toFixed(2)}</p>
                                    <p>Max: {(data.min + data.bottomWhisker + data.bottomBox + data.topBox + data.topWhisker).toFixed(2)}</p>
                                    <p>Average: {data.average.toFixed(2)}</p>
                                </div>
                            );
                        }}
                    />
                    <Bar stackId="a" dataKey="min" fill="none" isAnimationActive={false} />
                    <Bar stackId="a" dataKey="bar" shape={<HorizonBar />} isAnimationActive={false} />
                    <Bar stackId="a" dataKey="bottomWhisker" shape={<DotBar />} isAnimationActive={false} />
                    <Bar stackId="a" dataKey="bottomBox" fill={COLORS[0]} isAnimationActive={false} />
                    <Bar stackId="a" dataKey="bar" shape={<HorizonBar />} isAnimationActive={false} />
                    <Bar stackId="a" dataKey="topBox" fill={COLORS[0]} isAnimationActive={false} />
                    <Bar stackId="a" dataKey="topWhisker" shape={<DotBar />} isAnimationActive={false} />
                    <Bar stackId="a" dataKey="bar" shape={<HorizonBar />} isAnimationActive={false} />
                    <Scatter dataKey="average" fill="red" name="Average" />
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