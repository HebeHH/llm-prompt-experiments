import { AnalysisData } from '@/lib/types/analysis';
import { StatAnalysis } from '@/lib/types/statistics';
import { GraphImageSpec } from '@/lib/types/report';
import { toPng } from 'html-to-image';

// Import the graph creation functions from the new file
import { 
  createBarChart, 
  createStackedBarChart, 
  createGroupedBarChart,
  createLineChart,
  createScatterPlot,
  createBoxPlot,
  createRadarChart
} from '@/lib/utils/graphCreationFunctions';

/**
 * Service for generating graph images
 */
export class GraphService {
  private analysisData: AnalysisData;
  private statResults: StatAnalysis;
  
  constructor(analysisData: AnalysisData, statResults: StatAnalysis) {
    this.analysisData = analysisData;
    this.statResults = statResults;
  }
  
  /**
   * Get available data axes for graphs
   */
  getAvailableDataAxes(): string[] {
    const axes = [];
    
    // Add model as an axis
    axes.push('model');
    
    // Add factors as axes
    this.analysisData.config.promptFactors.forEach(factor => {
      axes.push(factor.name);
    });
    
    // Add response variables as axes
    this.analysisData.config.responseVariables.forEach(variable => {
      axes.push(variable.name);
    });
    
    return axes;
  }
  
  /**
   * Generate a graph image based on the specification
   */
  async generateGraphImage(spec: GraphImageSpec): Promise<string> {
    // Create a container element for the graph
    const container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '500px';
    container.style.backgroundColor = 'white';
    container.style.padding = '20px';
    document.body.appendChild(container);
    
    try {
      // Generate the appropriate graph based on the type
      switch (spec.graphType) {
        case 'bar':
          await this.createBarGraph(container, spec);
          break;
        case 'stackedBar':
          await this.createStackedBarGraph(container, spec);
          break;
        case 'groupedBar':
          await this.createGroupedBarGraph(container, spec);
          break;
        case 'line':
          await this.createLineGraph(container, spec);
          break;
        case 'scatter':
          await this.createScatterGraph(container, spec);
          break;
        case 'boxplot':
          await this.createBoxPlotGraph(container, spec);
          break;
        case 'radar':
          await this.createRadarGraph(container, spec);
          break;
        default:
          throw new Error(`Unsupported graph type: ${spec.graphType}`);
      }
      
      // Convert the graph to a PNG data URL
      const dataUrl = await toPng(container);
      
      // Clean up
      document.body.removeChild(container);
      
      return dataUrl;
    } catch (error) {
      // Clean up in case of error
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
      
      console.error('Error generating graph image:', error);
      throw error;
    }
  }
  
  /**
   * Create a bar graph
   */
  private async createBarGraph(container: HTMLElement, spec: GraphImageSpec): Promise<void> {
    if (!spec.xAxis || !spec.yAxis) {
      throw new Error('Bar graph requires xAxis and yAxis');
    }
    
    const config = {
      title: spec.title,
      xAxis: {
        name: spec.xAxis,
        label: spec.xAxis
      },
      yAxis: {
        name: spec.yAxis,
        label: spec.yAxis
      }
    };
    
    createBarChart(container, this.analysisData, config);
  }
  
  /**
   * Create a stacked bar graph
   */
  private async createStackedBarGraph(container: HTMLElement, spec: GraphImageSpec): Promise<void> {
    if (!spec.xAxis || !spec.yAxis || !spec.colorAxis) {
      throw new Error('Stacked bar graph requires xAxis, yAxis, and colorAxis');
    }
    
    const config = {
      title: spec.title,
      xAxis: {
        name: spec.xAxis,
        label: spec.xAxis
      },
      yAxis: {
        name: spec.yAxis,
        label: spec.yAxis
      },
      colorAxis: {
        name: spec.colorAxis,
        label: spec.colorAxis
      }
    };
    
    createStackedBarChart(container, this.analysisData, config);
  }
  
  /**
   * Create a grouped bar graph
   */
  private async createGroupedBarGraph(container: HTMLElement, spec: GraphImageSpec): Promise<void> {
    if (!spec.xAxis || !spec.yAxis || !spec.colorAxis) {
      throw new Error('Grouped bar graph requires xAxis, yAxis, and colorAxis');
    }
    
    const config = {
      title: spec.title,
      xAxis: {
        name: spec.xAxis,
        label: spec.xAxis
      },
      yAxis: {
        name: spec.yAxis,
        label: spec.yAxis
      },
      colorAxis: {
        name: spec.colorAxis,
        label: spec.colorAxis
      }
    };
    
    createGroupedBarChart(container, this.analysisData, config);
  }
  
  /**
   * Create a line graph
   */
  private async createLineGraph(container: HTMLElement, spec: GraphImageSpec): Promise<void> {
    if (!spec.xAxis || !spec.yAxis) {
      throw new Error('Line graph requires xAxis and yAxis');
    }
    
    const config = {
      title: spec.title,
      xAxis: {
        name: spec.xAxis,
        label: spec.xAxis
      },
      yAxis: {
        name: spec.yAxis,
        label: spec.yAxis
      },
      colorAxis: spec.colorAxis ? {
        name: spec.colorAxis,
        label: spec.colorAxis
      } : undefined
    };
    
    createLineChart(container, this.analysisData, config);
  }
  
  /**
   * Create a scatter graph
   */
  private async createScatterGraph(container: HTMLElement, spec: GraphImageSpec): Promise<void> {
    if (!spec.xAxis || !spec.yAxis) {
      throw new Error('Scatter graph requires xAxis and yAxis');
    }
    
    const config = {
      title: spec.title,
      xAxis: {
        name: spec.xAxis,
        label: spec.xAxis
      },
      yAxis: {
        name: spec.yAxis,
        label: spec.yAxis
      },
      colorAxis: spec.colorAxis ? {
        name: spec.colorAxis,
        label: spec.colorAxis
      } : undefined
    };
    
    createScatterPlot(container, this.analysisData, config);
  }
  
  /**
   * Create a box plot graph
   */
  private async createBoxPlotGraph(container: HTMLElement, spec: GraphImageSpec): Promise<void> {
    if (!spec.xAxis || !spec.yAxis) {
      throw new Error('Box plot requires xAxis and yAxis');
    }
    
    const config = {
      title: spec.title,
      xAxis: {
        name: spec.xAxis,
        label: spec.xAxis
      },
      yAxis: {
        name: spec.yAxis,
        label: spec.yAxis
      }
    };
    
    createBoxPlot(container, this.analysisData, config);
  }
  
  /**
   * Create a radar graph
   */
  private async createRadarGraph(container: HTMLElement, spec: GraphImageSpec): Promise<void> {
    if (!spec.colorAxis) {
      throw new Error('Radar graph requires colorAxis');
    }
    
    const config = {
      title: spec.title,
      colorAxis: {
        name: spec.colorAxis,
        label: spec.colorAxis
      }
    };
    
    createRadarChart(container, this.analysisData, config);
  }
} 