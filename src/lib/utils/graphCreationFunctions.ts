import { AnalysisData } from '@/lib/types/analysis';
import { exportGraphAsImage } from './graphImageExport';
import React from 'react';

/**
 * Creates a bar chart and renders it in the provided container
 */
export const createBarChart = async (
  container: HTMLElement,
  data: AnalysisData,
  config: any
): Promise<void> => {
  const imageUrl = await exportGraphAsImage(data, {
    type: 'bar',
    ...config
  });
  
  renderImageToContainer(container, imageUrl);
};

/**
 * Creates a stacked bar chart and renders it in the provided container
 */
export const createStackedBarChart = async (
  container: HTMLElement,
  data: AnalysisData,
  config: any
): Promise<void> => {
  const imageUrl = await exportGraphAsImage(data, {
    type: 'stackedBar',
    ...config
  });
  
  renderImageToContainer(container, imageUrl);
};

/**
 * Creates a grouped bar chart and renders it in the provided container
 */
export const createGroupedBarChart = async (
  container: HTMLElement,
  data: AnalysisData,
  config: any
): Promise<void> => {
  const imageUrl = await exportGraphAsImage(data, {
    type: 'groupedBar',
    ...config
  });
  
  renderImageToContainer(container, imageUrl);
};

/**
 * Creates a line chart and renders it in the provided container
 */
export const createLineChart = async (
  container: HTMLElement,
  data: AnalysisData,
  config: any
): Promise<void> => {
  const imageUrl = await exportGraphAsImage(data, {
    type: 'line',
    ...config
  });
  
  renderImageToContainer(container, imageUrl);
};

/**
 * Creates a scatter plot and renders it in the provided container
 */
export const createScatterPlot = async (
  container: HTMLElement,
  data: AnalysisData,
  config: any
): Promise<void> => {
  const imageUrl = await exportGraphAsImage(data, {
    type: 'scatter',
    ...config
  });
  
  renderImageToContainer(container, imageUrl);
};

/**
 * Creates a box plot and renders it in the provided container
 */
export const createBoxPlot = async (
  container: HTMLElement,
  data: AnalysisData,
  config: any
): Promise<void> => {
  try {
    // First, try to use the boxplot type directly
    // We'll modify the exportGraphAsImage function to handle this case better
    const imageUrl = await exportGraphAsImage(data, {
      type: 'boxplot',
      ...config
    });
    
    renderImageToContainer(container, imageUrl);
  } catch (error) {
    console.error('Error creating boxplot:', error);
    
    // If that fails, fall back to a bar chart
    try {
      const fallbackImageUrl = await exportGraphAsImage(data, {
        type: 'bar',
        ...config
      });
      
      renderImageToContainer(container, fallbackImageUrl);
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      
      // Ultimate fallback to a simple message
      container.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; height: 100%; flex-direction: column;">
          <p style="color: #666; font-family: sans-serif;">Box plot visualization unavailable</p>
          <p style="color: #888; font-size: 0.8em; font-family: sans-serif;">${config.title || 'Chart'}</p>
        </div>
      `;
    }
  }
};

/**
 * Creates a radar chart and renders it in the provided container
 */
export const createRadarChart = async (
  container: HTMLElement,
  data: AnalysisData,
  config: any
): Promise<void> => {
  const imageUrl = await exportGraphAsImage(data, {
    type: 'radar',
    ...config
  });
  
  renderImageToContainer(container, imageUrl);
};

/**
 * Helper function to render an image to a container
 */
const renderImageToContainer = (container: HTMLElement, imageUrl: string): void => {
  // Clear the container
  container.innerHTML = '';
  
  // Create an image element
  const img = document.createElement('img');
  img.src = imageUrl;
  img.style.width = '100%';
  img.style.height = '100%';
  img.style.objectFit = 'contain';
  
  // Append the image to the container
  container.appendChild(img);
}; 