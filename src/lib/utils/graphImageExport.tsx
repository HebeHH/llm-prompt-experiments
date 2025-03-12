import React from 'react';
import { AnalysisData } from '@/lib/types/analysis';
import { GraphConfig, GraphType } from '@/lib/types/graphs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart,
  Line,
  Rectangle,
  ReferenceArea,
} from 'recharts';
import { toPng } from 'html-to-image';

// Colors for different data series
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

/**
 * Generates a default title based on the graph configuration
 */
const generateDefaultTitle = (config: GraphConfig): string => {
  switch (config.type) {
    case 'bar':
      return `${config.yAxis.label || config.yAxis.name} by ${config.xAxis.label || config.xAxis.name}`;
    case 'stackedBar':
    case 'groupedBar':
      return `${config.yAxis.label || config.yAxis.name} by ${config.xAxis.label || config.xAxis.name} and ${config.colorAxis.label || config.colorAxis.name}`;
    case 'radar':
      return `Metrics by ${config.colorAxis.label || config.colorAxis.name}`;
    case 'boxplot':
      return `Distribution of ${config.yAxis.label || config.yAxis.name} by ${config.xAxis.label || config.xAxis.name}`;
    case 'histogram':
      return `Distribution of ${config.yAxis.label || config.yAxis.name}`;
    default:
      return 'Analysis Results';
  }
};

/**
 * Exports a graph as an image
 * @param data The analysis data
 * @param config The graph configuration
 * @param options Additional options for the export
 * @returns A Promise that resolves to the image data URL
 */
export const exportGraphAsImage = async (
  data: AnalysisData,
  config: GraphConfig,
  options: {
    title?: string;
    width?: number;
    height?: number;
    fileName?: string;
  } = {}
): Promise<string> => {
  // For boxplots, we'll use a different approach to ensure proper rendering
  if (config.type === 'boxplot') {
    return exportBoxplotAsImage(data, config, options);
  }

  // Create a container element for the graph
  const container = document.createElement('div');
  const width = options.width || 800;
  const height = options.height || 600;
  
  container.style.width = `${width}px`;
  container.style.height = `${height}px`;
  container.style.position = 'fixed'; // Use fixed instead of absolute
  container.style.left = '0';
  container.style.top = '0';
  container.style.zIndex = '-1000'; // Keep it behind everything but still in the document flow
  container.style.backgroundColor = 'white';
  container.style.padding = '20px';
  container.style.overflow = 'hidden';
  
  // Create a title element
  const titleElement = document.createElement('h2');
  titleElement.textContent = options.title || config.title || generateDefaultTitle(config);
  titleElement.style.textAlign = 'center';
  titleElement.style.marginBottom = '20px';
  titleElement.style.fontFamily = 'sans-serif';
  titleElement.style.fontSize = '18px';
  titleElement.style.color = '#333';
  
  // Append the title to the container
  container.appendChild(titleElement);
  
  // Create a div for the chart
  const chartContainer = document.createElement('div');
  chartContainer.style.width = '100%';
  chartContainer.style.height = 'calc(100% - 60px)';
  container.appendChild(chartContainer);
  
  // Append the container to the document body
  document.body.appendChild(container);
  
  // Render the appropriate chart based on the graph type
  try {
    // Render the chart and wait for it to be fully rendered
    await renderChart(chartContainer, data, config);
    
    // Wait for rendering
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Convert the container to an image
    const dataUrl = await toPng(container, { 
      width, 
      height,
      backgroundColor: '#ffffff',
      pixelRatio: 2 // Higher quality
    });
    
    // Clean up
    document.body.removeChild(container);
    
    return dataUrl;
  } catch (error) {
    console.error('Error generating chart image:', error);
    // Clean up on error
    document.body.removeChild(container);
    throw error;
  }
};

/**
 * Special export function for boxplots that captures the actual rendered boxplot
 */
const exportBoxplotAsImage = async (
  data: AnalysisData,
  config: GraphConfig,
  options: {
    title?: string;
    width?: number;
    height?: number;
    fileName?: string;
  } = {}
): Promise<string> => {
  // Find the existing boxplot in the DOM
  const existingBoxplots = document.querySelectorAll('.recharts-wrapper');
  let boxplotElement: Element | null = null;
  
  // Look for the boxplot that matches our config
  for (const element of existingBoxplots) {
    const parentElement = element.closest('.bg-white');
    if (parentElement) {
      const titleElement = parentElement.querySelector('input[type="text"]');
      if (titleElement && (titleElement as HTMLInputElement).value === config.title) {
        boxplotElement = element;
        break;
      }
    }
  }
  
  if (!boxplotElement) {
    throw new Error('Could not find the boxplot element in the DOM');
  }
  
  // Create a container for the image
  const container = document.createElement('div');
  const width = options.width || 800;
  const height = options.height || 600;
  
  container.style.width = `${width}px`;
  container.style.height = `${height}px`;
  container.style.backgroundColor = 'white';
  container.style.padding = '20px';
  container.style.position = 'fixed';
  container.style.left = '0';
  container.style.top = '0';
  container.style.zIndex = '-1000';
  
  // Create a title element
  const titleElement = document.createElement('h2');
  titleElement.textContent = options.title || config.title || generateDefaultTitle(config);
  titleElement.style.textAlign = 'center';
  titleElement.style.marginBottom = '20px';
  titleElement.style.fontFamily = 'sans-serif';
  titleElement.style.fontSize = '18px';
  titleElement.style.color = '#333';
  
  // Append the title to the container
  container.appendChild(titleElement);
  
  // Clone the boxplot element
  const boxplotClone = boxplotElement.cloneNode(true) as HTMLElement;
  boxplotClone.style.width = '100%';
  boxplotClone.style.height = 'calc(100% - 60px)';
  
  // Append the boxplot clone to the container
  container.appendChild(boxplotClone);
  
  // Append the container to the document body
  document.body.appendChild(container);
  
  try {
    // Wait for rendering
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Convert the container to an image
    const dataUrl = await toPng(container, { 
      width, 
      height,
      backgroundColor: '#ffffff',
      pixelRatio: 2 // Higher quality
    });
    
    // Clean up
    document.body.removeChild(container);
    
    return dataUrl;
  } catch (error) {
    console.error('Error generating boxplot image:', error);
    // Clean up on error
    document.body.removeChild(container);
    throw error;
  }
};

/**
 * Renders the appropriate chart based on the graph type
 */
const renderChart = async (
  container: HTMLElement,
  data: AnalysisData,
  config: GraphConfig
): Promise<void> => {
  return new Promise((resolve) => {
    // Import the appropriate React component dynamically
    import('react-dom/client').then((ReactDOM) => {
      // Determine which chart to render based on config.type
      let chartElement;
      
      switch (config.type) {
        case 'bar':
          chartElement = renderBarChart(data, config);
          break;
        case 'stackedBar':
          chartElement = renderStackedBarChart(data, config);
          break;
        case 'groupedBar':
          chartElement = renderGroupedBarChart(data, config);
          break;
        case 'radar':
          chartElement = renderRadarChart(data, config);
          break;
        case 'boxplot':
          chartElement = renderBoxPlotChart(data, config);
          break;
        case 'histogram':
          chartElement = renderHistogramChart(data, config);
          break;
        default:
          chartElement = <div>Unsupported chart type</div>;
      }
      
      // Render the chart
      const root = ReactDOM.createRoot(container);
      root.render(
        <React.StrictMode>
          {chartElement}
        </React.StrictMode>
      );
      
      // Allow more time for the chart to render, especially for boxplots
      const waitTime = config.type === 'boxplot' ? 500 : 300;
      setTimeout(resolve, waitTime);
    });
  });
};

/**
 * Helper function to download an image
 */
export const downloadImage = (dataUrl: string, fileName: string): void => {
  try {
    // Create a link element
    const link = document.createElement('a');
    link.download = fileName;
    link.href = dataUrl;
    link.style.display = 'none';
    
    // Add to document, trigger click, then remove
    document.body.appendChild(link);
    link.click();
    
    // Clean up after a short delay
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(dataUrl);
    }, 100);
  } catch (error) {
    console.error('Error downloading image:', error);
    alert('Failed to download image. Please try again.');
  }
};

// The following functions render specific chart types
// They reuse the same logic from the existing graph components

const renderBarChart = (data: AnalysisData, config: GraphConfig) => {
  if (config.type !== 'bar') return null;
  
  // Process data for the chart (similar to BarGraph.tsx)
  const chartData = processBarChartData(data, config);
  
  return (
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
            value: config.xAxis.label, 
            position: 'insideBottom',
            offset: -15,
            style: { textAnchor: 'middle' }
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
          fill="#93C5FD"
          name={config.yAxis.label || 'Value'}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

const renderStackedBarChart = (data: AnalysisData, config: GraphConfig) => {
  if (config.type !== 'stackedBar') return null;
  
  // Process data for the chart (similar to StackedBarGraph.tsx)
  const { chartData, colorCategories } = processStackedBarChartData(data, config);
  
  return (
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
            value: config.xAxis.label, 
            position: 'insideBottom',
            offset: -15,
            style: { textAnchor: 'middle' }
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
        <Legend verticalAlign="top" height={36} />
        {colorCategories.map((category, index) => (
          <Bar
            key={category}
            dataKey={category}
            stackId="a"
            fill={COLORS[index % COLORS.length]}
            name={category}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};

const renderGroupedBarChart = (data: AnalysisData, config: GraphConfig) => {
  if (config.type !== 'groupedBar') return null;
  
  // Process data for the chart (similar to GroupedBarGraph.tsx)
  const { chartData, colorCategories } = processGroupedBarChartData(data, config);
  
  return (
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
            value: config.xAxis.label, 
            position: 'insideBottom',
            offset: -15,
            style: { textAnchor: 'middle' }
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
        <Legend verticalAlign="top" height={36} />
        {colorCategories.map((category, index) => (
          <Bar
            key={category}
            dataKey={category}
            fill={COLORS[index % COLORS.length]}
            name={category}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};

const renderRadarChart = (data: AnalysisData, config: GraphConfig) => {
  if (config.type !== 'radar') return null;
  
  // Process data for the chart (similar to RadarGraph.tsx)
  const { chartData, colorCategories } = processRadarChartData(data, config);
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart 
        cx="50%" 
        cy="50%" 
        outerRadius="80%" 
        data={chartData}
      >
        <PolarGrid />
        <PolarAngleAxis dataKey="metric" />
        <PolarRadiusAxis />
        <Tooltip />
        <Legend />
        {colorCategories.map((category, index) => (
          <Radar
            key={category}
            name={category}
            dataKey={category}
            stroke={COLORS[index % COLORS.length]}
            fill={COLORS[index % COLORS.length]}
            fillOpacity={0.6}
            isAnimationActive={false}
          />
        ))}
      </RadarChart>
    </ResponsiveContainer>
  );
};

// Custom BoxPlot component since recharts doesn't export BoxPlot directly
const CustomBoxPlot = (props: any) => {
  const { x, y, width, height, fill, stroke, data } = props;
  const { min, max, median, q1, q3 } = data;
  
  // Ensure we have valid numbers for calculations
  if (isNaN(min) || isNaN(max) || isNaN(median) || isNaN(q1) || isNaN(q3) || 
      min === undefined || max === undefined || median === undefined || q1 === undefined || q3 === undefined ||
      max === min) {
    return null; // Don't render if we have invalid data
  }
  
  // Calculate positions safely
  const range = max - min;
  const boxHeight = q3 - q1;
  const topWhiskerY = y + height - ((max - min) / range) * height;
  const boxTopY = y + height - ((q3 - min) / range) * height;
  const medianY = y + height - ((median - min) / range) * height;
  const boxBottomY = y + height - ((q1 - min) / range) * height;
  const bottomWhiskerY = y + height;
  
  return (
    <g>
      {/* Whiskers */}
      <line 
        x1={x + width / 2} 
        y1={topWhiskerY} 
        x2={x + width / 2} 
        y2={boxTopY} 
        stroke={stroke} 
      />
      <line 
        x1={x + width / 2} 
        y1={boxBottomY} 
        x2={x + width / 2} 
        y2={bottomWhiskerY} 
        stroke={stroke} 
      />
      
      {/* Whisker caps */}
      <line 
        x1={x + width / 4} 
        y1={topWhiskerY} 
        x2={x + 3 * width / 4} 
        y2={topWhiskerY} 
        stroke={stroke} 
      />
      <line 
        x1={x + width / 4} 
        y1={bottomWhiskerY} 
        x2={x + 3 * width / 4} 
        y2={bottomWhiskerY} 
        stroke={stroke} 
      />
      
      {/* Box */}
      <rect 
        x={x + width / 4} 
        y={boxTopY} 
        width={width / 2} 
        height={Math.max(0, boxBottomY - boxTopY)} 
        fill={fill} 
        stroke={stroke} 
      />
      
      {/* Median */}
      <line 
        x1={x + width / 4} 
        y1={medianY} 
        x2={x + 3 * width / 4} 
        y2={medianY} 
        stroke={stroke} 
        strokeWidth={2} 
      />
    </g>
  );
};

const renderBoxPlotChart = (data: AnalysisData, config: GraphConfig) => {
  if (config.type !== 'boxplot') return null;
  
  // Process data for the chart (similar to BoxPlotGraph.tsx)
  const chartData = processBoxPlotChartData(data, config);
  
  // Transform the data for better rendering
  const transformedData = chartData.map((entry, index) => {
    // Create a transformed entry with explicit values for each part of the boxplot
    return {
      name: entry.name,
      min: entry.boxPlotData.min,
      q1: entry.boxPlotData.q1,
      median: entry.boxPlotData.median,
      q3: entry.boxPlotData.q3,
      max: entry.boxPlotData.max,
      // Add IQR as a separate value for the box
      iqr: entry.boxPlotData.q3 - entry.boxPlotData.q1,
      // Add index for positioning
      index
    };
  });
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        data={transformedData}
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
            value: config.xAxis.label, 
            position: 'insideBottom',
            offset: -15,
            style: { textAnchor: 'middle' }
          }}
        />
        <YAxis
          domain={['auto', 'auto']}
          label={{ 
            value: config.yAxis.label,
            angle: -90,
            position: 'insideLeft'
          }}
        />
        <Tooltip 
          formatter={(value: any, name: string) => {
            if (name === 'Box') {
              const item = transformedData.find(d => d.iqr === value);
              if (item) {
                return [`Min: ${item.min}, Q1: ${item.q1}, Median: ${item.median}, Q3: ${item.q3}, Max: ${item.max}`, name];
              }
            }
            return [value, name];
          }}
        />
        <Legend verticalAlign="top" height={36} />
        
        {/* Min-Max whiskers */}
        {transformedData.map((entry, index) => (
          <React.Fragment key={`boxplot-${index}`}>
            {/* Vertical line from min to max */}
            <Line
              dataKey="min"
              data={[entry]}
              stroke="#3B82F6"
              isAnimationActive={false}
              name="Min"
              hide={true} // Hide from legend
            />
            <Line
              dataKey="max"
              data={[entry]}
              stroke="#3B82F6"
              isAnimationActive={false}
              name="Max"
              hide={true} // Hide from legend
            />
            
            {/* Horizontal line at min */}
            <Line
              dataKey="min"
              data={[
                { ...entry, name: `${entry.name}-left`, x: index - 0.2 },
                { ...entry, name: `${entry.name}-right`, x: index + 0.2 }
              ]}
              stroke="#3B82F6"
              isAnimationActive={false}
              name="Min Line"
              hide={true} // Hide from legend
            />
            
            {/* Horizontal line at max */}
            <Line
              dataKey="max"
              data={[
                { ...entry, name: `${entry.name}-left`, x: index - 0.2 },
                { ...entry, name: `${entry.name}-right`, x: index + 0.2 }
              ]}
              stroke="#3B82F6"
              isAnimationActive={false}
              name="Max Line"
              hide={true} // Hide from legend
            />
          </React.Fragment>
        ))}
        
        {/* Q1-Q3 boxes */}
        <Bar
          dataKey="iqr"
          fill="#93C5FD"
          stroke="#3B82F6"
          name="Box"
          isAnimationActive={false}
          barSize={40}
        />
        
        {/* Median lines */}
        {transformedData.map((entry, index) => (
          <Line
            key={`median-${index}`}
            data={[
              { ...entry, name: `${entry.name}-left`, x: index - 0.2, y: entry.median },
              { ...entry, name: `${entry.name}-right`, x: index + 0.2, y: entry.median }
            ]}
            dataKey="y"
            stroke="#1E40AF"
            strokeWidth={2}
            isAnimationActive={false}
            name="Median"
            hide={true} // Hide from legend
          />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
};

const renderHistogramChart = (data: AnalysisData, config: GraphConfig) => {
  if (config.type !== 'histogram') return null;
  
  // Process data for the chart (similar to HistogramGraph.tsx)
  const chartData = processHistogramChartData(data, config);
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        margin={{ top: 30, left: 50, right: 30, bottom: 60 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="binRange"
          angle={-45}
          textAnchor="end"
          height={60}
          interval={0}
          label={{ 
            value: config.yAxis.label, 
            position: 'insideBottom',
            offset: -15,
            style: { textAnchor: 'middle' }
          }}
        />
        <YAxis
          label={{ 
            value: "Frequency",
            angle: -90,
            position: 'insideLeft'
          }}
        />
        <Tooltip />
        <Legend verticalAlign="top" height={36} />
        <Bar
          dataKey="frequency"
          fill="#93C5FD"
          name="Frequency"
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

// Data processing functions for each chart type
// These are similar to the data processing in the existing graph components

const processBarChartData = (data: AnalysisData, config: GraphConfig) => {
  if (config.type !== 'bar') return [];
  
  const groupedData: Record<string, { total: number; count: number }> = {};

  data.results.forEach(result => {
    let key = '';
    if (config.xAxis.name === 'model') {
      key = result.llmResponse.model.name;
    } else {
      key = result.factors[config.xAxis.name] || String(result.responseVariables[config.xAxis.name]) || 'default';
    }

    if (!groupedData[key]) {
      groupedData[key] = { total: 0, count: 0 };
    }

    const value = result.responseVariables[config.yAxis.name];
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
};

const processStackedBarChartData = (data: AnalysisData, config: GraphConfig) => {
  if (config.type !== 'stackedBar') return { chartData: [], colorCategories: [] };
  
  const groupedData: Record<string, Record<string, number[]>> = {};

  // Group data by x-axis and color categories
  data.results.forEach(result => {
    let xKey = '';
    if (config.xAxis.name === 'model') {
      xKey = result.llmResponse.model.name;
    } else {
      xKey = result.factors[config.xAxis.name] || String(result.responseVariables[config.xAxis.name]) || 'default';
    }

    let colorKey = '';
    if (config.colorAxis.name === 'model') {
      colorKey = result.llmResponse.model.name;
    } else {
      colorKey = result.factors[config.colorAxis.name] || String(result.responseVariables[config.colorAxis.name]) || 'default';
    }

    if (!groupedData[xKey]) {
      groupedData[xKey] = {};
    }
    if (!groupedData[xKey][colorKey]) {
      groupedData[xKey][colorKey] = [];
    }

    const value = result.responseVariables[config.yAxis.name];
    if (typeof value === 'number') {
      groupedData[xKey][colorKey].push(value);
    }
  });

  // Calculate averages and format data for the chart
  const chartData = Object.entries(groupedData).map(([xKey, colorGroups]) => {
    const entry: Record<string, any> = { name: xKey };
    Object.entries(colorGroups).forEach(([colorKey, values]) => {
      if (values.length > 0) {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        entry[colorKey] = avg;
      }
    });
    return entry;
  });

  // Get unique color categories
  const colorCategories = new Set<string>();
  data.results.forEach(result => {
    let colorKey = '';
    if (config.colorAxis.name === 'model') {
      colorKey = result.llmResponse.model.name;
    } else {
      colorKey = result.factors[config.colorAxis.name] || String(result.responseVariables[config.colorAxis.name]) || 'default';
    }
    colorCategories.add(colorKey);
  });

  return { 
    chartData, 
    colorCategories: Array.from(colorCategories)
  };
};

const processGroupedBarChartData = (data: AnalysisData, config: GraphConfig) => {
  if (config.type !== 'groupedBar') return { chartData: [], colorCategories: [] };
  
  // Similar to stacked bar chart processing
  const groupedData: Record<string, Record<string, number[]>> = {};

  data.results.forEach(result => {
    let xKey = '';
    if (config.xAxis.name === 'model') {
      xKey = result.llmResponse.model.name;
    } else {
      xKey = result.factors[config.xAxis.name] || String(result.responseVariables[config.xAxis.name]) || 'default';
    }

    let colorKey = '';
    if (config.colorAxis.name === 'model') {
      colorKey = result.llmResponse.model.name;
    } else {
      colorKey = result.factors[config.colorAxis.name] || String(result.responseVariables[config.colorAxis.name]) || 'default';
    }

    if (!groupedData[xKey]) {
      groupedData[xKey] = {};
    }
    if (!groupedData[xKey][colorKey]) {
      groupedData[xKey][colorKey] = [];
    }

    const value = result.responseVariables[config.yAxis.name];
    if (typeof value === 'number') {
      groupedData[xKey][colorKey].push(value);
    }
  });

  const chartData = Object.entries(groupedData).map(([xKey, colorGroups]) => {
    const entry: Record<string, any> = { name: xKey };
    Object.entries(colorGroups).forEach(([colorKey, values]) => {
      if (values.length > 0) {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        entry[colorKey] = avg;
      }
    });
    return entry;
  });

  const colorCategories = new Set<string>();
  data.results.forEach(result => {
    let colorKey = '';
    if (config.colorAxis.name === 'model') {
      colorKey = result.llmResponse.model.name;
    } else {
      colorKey = result.factors[config.colorAxis.name] || String(result.responseVariables[config.colorAxis.name]) || 'default';
    }
    colorCategories.add(colorKey);
  });

  return { 
    chartData, 
    colorCategories: Array.from(colorCategories)
  };
};

const processRadarChartData = (data: AnalysisData, config: GraphConfig) => {
  if (config.type !== 'radar') return { chartData: [], colorCategories: [] };
  
  // Group data by color category and metric
  const groupedData: Record<string, Record<string, number[]>> = {};
  
  data.results.forEach(result => {
    let colorKey = '';
    if (config.colorAxis.name === 'model') {
      colorKey = result.llmResponse.model.name;
    } else {
      colorKey = result.factors[config.colorAxis.name] || String(result.responseVariables[config.colorAxis.name]) || 'default';
    }

    if (!groupedData[colorKey]) {
      groupedData[colorKey] = {};
    }

    config.metrics.forEach(metric => {
      if (!groupedData[colorKey][metric.name]) {
        groupedData[colorKey][metric.name] = [];
      }

      const value = result.responseVariables[metric.name];
      if (typeof value === 'number') {
        groupedData[colorKey][metric.name].push(value);
      }
    });
  });

  // Calculate averages for each metric and category
  const metricAverages: Record<string, Record<string, number>> = {};
  Object.entries(groupedData).forEach(([colorKey, metrics]) => {
    metricAverages[colorKey] = {};
    Object.entries(metrics).forEach(([metricName, values]) => {
      if (values.length > 0) {
        metricAverages[colorKey][metricName] = values.reduce((a, b) => a + b, 0) / values.length;
      }
    });
  });

  // Format data for the radar chart
  const chartData = config.metrics.map(metric => {
    const entry: Record<string, any> = { 
      metric: metric.label || metric.name 
    };
    
    Object.entries(metricAverages).forEach(([colorKey, metrics]) => {
      entry[colorKey] = metrics[metric.name] || 0;
    });
    
    return entry;
  });

  return {
    chartData,
    colorCategories: Object.keys(metricAverages)
  };
};

const processBoxPlotChartData = (data: AnalysisData, config: GraphConfig) => {
  if (config.type !== 'boxplot') return [];
  
  // Group data by x-axis category
  const groupedData: Record<string, number[]> = {};
  
  data.results.forEach(result => {
    let xKey = '';
    if (config.xAxis.name === 'model') {
      xKey = result.llmResponse.model.name;
    } else {
      xKey = result.factors[config.xAxis.name] || String(result.responseVariables[config.xAxis.name]) || 'default';
    }

    if (!groupedData[xKey]) {
      groupedData[xKey] = [];
    }

    const value = result.responseVariables[config.yAxis.name];
    if (typeof value === 'number') {
      groupedData[xKey].push(value);
    }
  });

  // Calculate box plot statistics for each group
  return Object.entries(groupedData).map(([name, values]) => {
    if (values.length === 0) {
      return { name, boxPlotData: { min: 0, max: 0, median: 0, q1: 0, q3: 0 } };
    }

    // Sort values for percentile calculations
    values.sort((a, b) => a - b);
    
    const min = values[0];
    const max = values[values.length - 1];
    const q1 = values[Math.floor(values.length * 0.25)];
    const median = values[Math.floor(values.length * 0.5)];
    const q3 = values[Math.floor(values.length * 0.75)];

    return {
      name,
      boxPlotData: { min, max, median, q1, q3 }
    };
  });
};

const processHistogramChartData = (data: AnalysisData, config: GraphConfig) => {
  if (config.type !== 'histogram') return [];
  
  // Extract all values for the selected metric
  const allValues: number[] = [];
  
  data.results.forEach(result => {
    const value = result.responseVariables[config.yAxis.name];
    if (typeof value === 'number') {
      allValues.push(value);
    }
  });

  if (allValues.length === 0) {
    return [];
  }

  // Determine bin range
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const binCount = 10; // Default number of bins
  const binWidth = (max - min) / binCount;

  // Create bins
  const bins: number[] = Array(binCount).fill(0);
  
  // Count values in each bin
  allValues.forEach(value => {
    const binIndex = Math.min(Math.floor((value - min) / binWidth), binCount - 1);
    bins[binIndex]++;
  });

  // Format data for the chart
  return bins.map((count, index) => {
    const binStart = min + index * binWidth;
    const binEnd = binStart + binWidth;
    return {
      binRange: `${binStart.toFixed(2)} - ${binEnd.toFixed(2)}`,
      frequency: count
    };
  });
}; 