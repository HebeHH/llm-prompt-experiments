import React, { useMemo } from 'react';
import {
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import { GraphProps, BoxPlotGraphConfig } from '@/lib/types/graphs';
import { BaseGraph } from './BaseGraph';

interface BoxPlotData {
    name: string;
    min: number;
    q1: number;
    median: number;
    q3: number;
    max: number;
    outliers: number[];
}

// Custom shape for line segments
const LineShape = (props: any) => {
    const { points } = props;
    return (
        <line
            x1={points[0].x}
            y1={points[0].y}
            x2={points[1].x}
            y2={points[1].y}
            stroke="#8884d8"
            strokeWidth={props.strokeWidth || 2}
            strokeDasharray={props.strokeDasharray}
        />
    );
};

function calculateQuartiles(data: number[]): [number, number, number] {
    const sorted = [...data].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    let median: number;
    if (sorted.length % 2 === 0) {
        median = (sorted[mid - 1] + sorted[mid]) / 2;
    } else {
        median = sorted[mid];
    }

    const lowerHalf = sorted.slice(0, mid);
    const upperHalf = sorted.slice(mid + (sorted.length % 2 === 0 ? 0 : 1));

    const q1 = lowerHalf.length % 2 === 0
        ? (lowerHalf[Math.floor(lowerHalf.length / 2) - 1] + lowerHalf[Math.floor(lowerHalf.length / 2)]) / 2
        : lowerHalf[Math.floor(lowerHalf.length / 2)];

    const q3 = upperHalf.length % 2 === 0
        ? (upperHalf[Math.floor(upperHalf.length / 2) - 1] + upperHalf[Math.floor(upperHalf.length / 2)]) / 2
        : upperHalf[Math.floor(upperHalf.length / 2)];

    return [q1, median, q3];
}

function findOutliers(data: number[], q1: number, q3: number): [number[], number, number] {
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    const outliers = data.filter(d => d < lowerBound || d > upperBound);
    const nonOutliers = data.filter(d => d >= lowerBound && d <= upperBound);

    return [
        outliers,
        nonOutliers.length > 0 ? Math.min(...nonOutliers) : q1,
        nonOutliers.length > 0 ? Math.max(...nonOutliers) : q3
    ];
}

export const BoxPlotGraph: React.FC<GraphProps> = (props) => {
    const { data, config } = props;

    // Type guard
    if (config.type !== 'boxplot') return null;
    const boxplotConfig = config as BoxPlotGraphConfig;

    const chartData = useMemo(() => {
        // First, group the data by the x-axis category
        const groupedData: Record<string, number[]> = {};

        data.results.forEach(result => {
            let key = '';
            if (boxplotConfig.xAxis.name === 'model') {
                key = result.llmResponse.model.name;
            } else {
                key = result.categories[boxplotConfig.xAxis.name] || 'default';
            }

            const value = result.attributes[boxplotConfig.yAxis.name];
            if (typeof value === 'number') {
                if (!groupedData[key]) {
                    groupedData[key] = [];
                }
                groupedData[key].push(value);
            }
        });

        // Then calculate box plot statistics for each group
        return Object.entries(groupedData).map(([key, values]): BoxPlotData => {
            const [q1, median, q3] = calculateQuartiles(values);
            const [outliers, min, max] = findOutliers(values, q1, q3);

            return {
                name: key,
                min,
                q1,
                median,
                q3,
                max,
                outliers
            };
        });
    }, [data.results, boxplotConfig.xAxis.name, boxplotConfig.yAxis.name]);

    const chart = (
        <div className="h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
                <ScatterChart
                    margin={{ top: 30, right: 30, bottom: 60, left: 50 }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                        dataKey="name"
                        type="category"
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        interval={0}
                        label={{
                            value: boxplotConfig.xAxis.label,
                            position: 'insideBottom',
                            offset: -15,
                            style: { textAnchor: 'middle' }
                        }}
                    />
                    <YAxis
                        type="number"
                        label={{
                            value: boxplotConfig.yAxis.label,
                            angle: -90,
                            position: 'insideLeft'
                        }}
                    />
                    <Tooltip />
                    <Legend verticalAlign="top" height={36} />
                    {chartData.map((item, index) => (
                        <React.Fragment key={item.name}>
                            {/* Box */}
                            <Scatter
                                name={`${item.name} Box`}
                                data={[
                                    { x: index, y: item.q1 },
                                    { x: index, y: item.q3 }
                                ]}
                                line={{ strokeWidth: 2 }}
                                fill="#8884d8"
                                shape={LineShape}
                            />
                            {/* Median line */}
                            <Scatter
                                name={`${item.name} Median`}
                                data={[
                                    { x: index - 0.2, y: item.median },
                                    { x: index + 0.2, y: item.median }
                                ]}
                                line={{ strokeWidth: 2 }}
                                fill="#8884d8"
                                shape={LineShape}
                            />
                            {/* Whiskers */}
                            <Scatter
                                name={`${item.name} Whiskers`}
                                data={[
                                    { x: index, y: item.min },
                                    { x: index, y: item.max }
                                ]}
                                line={{ strokeWidth: 1, strokeDasharray: '3 3' }}
                                fill="#8884d8"
                                shape={LineShape}
                            />
                            {/* Outliers */}
                            <Scatter
                                name={`${item.name} Outliers`}
                                data={item.outliers.map(y => ({ x: index, y }))}
                                fill="#8884d8"
                            />
                        </React.Fragment>
                    ))}
                </ScatterChart>
            </ResponsiveContainer>
        </div>
    );

    return (
        <BaseGraph {...props}>
            {chart}
        </BaseGraph>
    );
}; 