import { AnalysisData } from './analysis';

export type DataAxisType = 'categorical' | 'numerical';

export interface DataAxis {
    type: DataAxisType;
    name: string;
    label: string;
}

export type GraphType = 'bar' | 'stackedBar' | 'groupedBar' | 'radar' | 'boxplot' | 'histogram';

// Base configuration that all graphs share
interface BaseGraphConfig {
    id: string;
    type: GraphType;
    title: string;
}

// Type-specific configurations
export interface BarGraphConfig extends BaseGraphConfig {
    type: 'bar';
    xAxis: DataAxis;
    yAxis: DataAxis;
}

export interface StackedBarGraphConfig extends BaseGraphConfig {
    type: 'stackedBar';
    xAxis: DataAxis;
    yAxis: DataAxis;
    colorAxis: DataAxis;
}

export interface GroupedBarGraphConfig extends BaseGraphConfig {
    type: 'groupedBar';
    xAxis: DataAxis;
    yAxis: DataAxis;
    colorAxis: DataAxis;
}

export interface RadarGraphConfig extends BaseGraphConfig {
    type: 'radar';
    metrics: DataAxis[];
    colorAxis: DataAxis;
}

export interface BoxPlotGraphConfig extends BaseGraphConfig {
    type: 'boxplot';
    xAxis: DataAxis;
    yAxis: DataAxis;
}

export interface HistogramGraphConfig extends BaseGraphConfig {
    type: 'histogram';
    yAxis: DataAxis;
    colorAxis?: DataAxis;  // Optional category axis for grouping
}

export type GraphConfig = 
    | BarGraphConfig 
    | StackedBarGraphConfig 
    | GroupedBarGraphConfig 
    | RadarGraphConfig 
    | BoxPlotGraphConfig 
    | HistogramGraphConfig;

export interface GraphProps {
    data: AnalysisData;
    config: GraphConfig;
    onConfigChange: (config: GraphConfig) => void;
    onRemove: () => void;
}

export const getAvailableAxes = (data: AnalysisData): { categorical: DataAxis[], numerical: DataAxis[] } => {
    const categorical: DataAxis[] = [
        { type: 'categorical', name: 'model', label: 'Model' },
        ...data.config.promptCategories.map(cat => ({
            type: 'categorical' as const,
            name: cat.name,
            label: cat.name.charAt(0).toUpperCase() + cat.name.slice(1)
        }))
    ];

    const numerical: DataAxis[] = data.config.responseAttributes.map(attr => ({
        type: 'numerical',
        name: attr.name,
        label: attr.name.replace(/([A-Z])/g, ' $1').trim()
    }));

    return { categorical, numerical };
};

export const DEFAULT_GRAPH_CONFIGS = {
    bar: {
        type: 'bar',
        xAxis: { type: 'categorical', name: 'model', label: 'Model' },
        yAxis: { type: 'numerical', name: '', label: '' }
    } as Omit<BarGraphConfig, 'id' | 'title'>,
    stackedBar: {
        type: 'stackedBar',
        xAxis: { type: 'categorical', name: 'model', label: 'Model' },
        yAxis: { type: 'numerical', name: '', label: '' },
        colorAxis: { type: 'categorical', name: '', label: '' }
    } as Omit<StackedBarGraphConfig, 'id' | 'title'>,
    groupedBar: {
        type: 'groupedBar',
        xAxis: { type: 'categorical', name: 'model', label: 'Model' },
        yAxis: { type: 'numerical', name: '', label: '' },
        colorAxis: { type: 'categorical', name: '', label: '' }
    } as Omit<GroupedBarGraphConfig, 'id' | 'title'>,
    radar: {
        type: 'radar',
        metrics: [],
        colorAxis: { type: 'categorical', name: 'model', label: 'Model' }
    } as Omit<RadarGraphConfig, 'id' | 'title'>,
    boxplot: {
        type: 'boxplot',
        xAxis: { type: 'categorical', name: 'model', label: 'Model' },
        yAxis: { type: 'numerical', name: '', label: '' }
    } as Omit<BoxPlotGraphConfig, 'id' | 'title'>,
    histogram: {
        type: 'histogram',
        yAxis: { type: 'numerical', name: '', label: '' }
    } as Omit<HistogramGraphConfig, 'id' | 'title'>
} satisfies Record<GraphType, Omit<GraphConfig, 'id' | 'title'>>; 