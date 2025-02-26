import { AnalysisData } from './analysis';

export type DataAxisType = 'categorical' | 'numerical';

export interface DataAxis {
    type: DataAxisType;
    name: string;
    label: string;
}

export interface GraphConfig {
    id: string;
    type: GraphType;
    title: string;
    xAxis: DataAxis;
    yAxis: DataAxis;
    colorAxis?: DataAxis;
}

export type GraphType = 'bar' | 'stackedBar';

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

export const DEFAULT_GRAPH_CONFIGS: Record<GraphType, Omit<GraphConfig, 'id' | 'title'>> = {
    bar: {
        type: 'bar',
        xAxis: { type: 'categorical', name: 'model', label: 'Model' },
        yAxis: { type: 'numerical', name: '', label: '' } // Will be filled with first numerical axis
    },
    stackedBar: {
        type: 'stackedBar',
        xAxis: { type: 'categorical', name: 'model', label: 'Model' },
        yAxis: { type: 'numerical', name: '', label: '' }, // Will be filled with first numerical axis
        colorAxis: { type: 'categorical', name: '', label: '' } // Will be filled with first prompt category
    }
}; 