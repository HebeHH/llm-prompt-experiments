import React, { useState, useEffect, useRef } from 'react';
import { AnalysisData } from '@/lib/types/analysis';
import { StatAnalysis } from '@/lib/types/statistics';
import { ReportOutline, ReportBackgroundData, GraphImageSpec } from '@/lib/types/report';
import { createLLMService } from '@/lib/services/llmService';
import { GraphService } from '@/lib/services/graphService';
import { LLMProvider } from '@/lib/types/llm';
import { getApiKeys } from '@/lib/utils/apiKeyManager';

interface GraphSelectionStepProps {
  reportOutline: ReportOutline;
  reportBackgroundData: ReportBackgroundData;
  analysisData: AnalysisData;
  statResults: StatAnalysis;
  onComplete?: (graphImages: Record<string, string>) => void;
  onError?: (error: string) => void;
  readOnly?: boolean;
}

const GraphSelectionStep: React.FC<GraphSelectionStepProps> = ({
  reportOutline,
  reportBackgroundData,
  analysisData,
  statResults,
  onComplete,
  onError,
  readOnly = false
}) => {
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [graphSpecs, setGraphSpecs] = useState<Record<string, GraphImageSpec[]>>({});
  const [graphImages, setGraphImages] = useState<Record<string, string>>({});
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const streamContainerRef = React.useRef<HTMLDivElement>(null);
  
  // Initialize graph service
  const graphService = new GraphService(analysisData, statResults);
  
  useEffect(() => {
    if (!readOnly && currentSectionIndex === 0) {
      generateGraphsForCurrentSection();
    }
  }, [currentSectionIndex, readOnly]);
  
  useEffect(() => {
    if (currentSectionIndex < reportOutline.sections.length) {
      generateGraphsForCurrentSection();
    } else {
      // All sections processed, move to the next step
      onComplete?.(graphImages);
    }
  }, [currentSectionIndex]);
  
  // Auto-scroll to bottom of streaming content
  useEffect(() => {
    if (streamContainerRef.current) {
      streamContainerRef.current.scrollTop = streamContainerRef.current.scrollHeight;
    }
  }, [progress]);
  
  const generateGraphsForCurrentSection = async () => {
    const currentSection = reportOutline.sections[currentSectionIndex];
    setIsGenerating(true);
    setProgress('');
    
    try {
      // Get API keys from our centralized manager
      const apiKeys = getApiKeys();
      const provider = 'openai' as LLMProvider; // Currently only supporting OpenAI
      const apiKey = apiKeys[provider];
      
      if (!apiKey) {
        throw new Error(`No API key found for ${provider}. Please go back and enter your API key.`);
      }
      
      // Create the LLM service
      const llmService = createLLMService(provider, apiKey);
      
      // Get available data axes
      const availableDataAxes = graphService.getAvailableDataAxes();
      
      // Generate graph specifications for the current section
      const specs = await llmService.selectGraphs(
        JSON.stringify(reportBackgroundData),
        reportOutline,
        currentSection.title,
        availableDataAxes,
        (text) => {
          setProgress(text);
        }
      );
      
      // Store the graph specifications
      setGraphSpecs(prev => ({
        ...prev,
        [currentSection.title]: specs
      }));
      
      // Generate the graph images
      await generateGraphImages(currentSection.title, specs);
      
      // Move to the next section
      setCurrentSectionIndex(prev => prev + 1);
    } catch (error) {
      console.error('Error generating graphs:', error);
      onError?.(`Error generating graphs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };
  
  const generateGraphImages = async (sectionTitle: string, specs: GraphImageSpec[]) => {
    if (specs.length === 0) {
      return; // No graphs to generate
    }
    
    setIsGeneratingImages(true);
    
    try {
      // Generate images for each graph specification
      for (const spec of specs) {
        try {
          const imageData = await graphService.generateGraphImage(spec);
          
          // Store the image data
          setGraphImages(prev => ({
            ...prev,
            [spec.fileName]: imageData
          }));
        } catch (error) {
          console.error(`Error generating graph image for ${spec.fileName}:`, error);
          onError?.(`Error generating graph image for ${spec.fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } finally {
      setIsGeneratingImages(false);
    }
  };
  
  const renderProgress = () => {
    const totalSections = reportOutline.sections.length;
    const completedSections = currentSectionIndex;
    const progressPercentage = (completedSections / totalSections) * 100;
    
    return (
      <div className="mb-4">
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm font-medium text-gray-700">{completedSections} of {totalSections} sections</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-violet-600 h-2.5 rounded-full" 
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>
    );
  };
  
  const renderCurrentSection = () => {
    if (currentSectionIndex >= reportOutline.sections.length) {
      return (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">All sections processed</h3>
              <div className="mt-2 text-sm text-green-700">
                <p>Graph selection complete. Moving to the next step...</p>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    const currentSection = reportOutline.sections[currentSectionIndex];
    
    return (
      <div className="bg-white border border-gray-200 rounded-md p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Processing: {currentSection.title}
        </h3>
        <p className="text-sm text-gray-500 mb-4">{currentSection.description}</p>
        
        {isGenerating ? (
          <div className="space-y-4">
            <div className="flex items-center">
              <div className="mr-3">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-violet-500"></div>
              </div>
              <p className="text-sm text-gray-700">Selecting graphs for this section...</p>
            </div>
            
            {progress && (
              <div className="bg-gray-50 p-4 rounded border border-gray-200 h-80 overflow-hidden">
                <div 
                  ref={streamContainerRef}
                  className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
                >
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap">{progress}</pre>
                </div>
              </div>
            )}
          </div>
        ) : isGeneratingImages ? (
          <div className="space-y-4">
            <div className="flex items-center">
              <div className="mr-3">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-violet-500"></div>
              </div>
              <p className="text-sm text-gray-700">Generating graph images...</p>
            </div>
          </div>
        ) : null}
      </div>
    );
  };
  
  const renderCompletedSections = () => {
    const completedSections = reportOutline.sections.slice(0, currentSectionIndex);
    
    if (completedSections.length === 0) {
      return null;
    }
    
    return (
      <div className="space-y-4 mt-6">
        <h3 className="text-md font-medium text-gray-900">Completed Sections</h3>
        
        {completedSections.map((section, index) => {
          const sectionGraphs = graphSpecs[section.title] || [];
          
          return (
            <div key={index} className="bg-gray-50 border border-gray-200 rounded-md p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">{section.title}</h4>
              
              {sectionGraphs.length === 0 ? (
                <p className="text-sm text-gray-500">No graphs needed for this section</p>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500">{sectionGraphs.length} graph(s) selected:</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {sectionGraphs.map((spec, graphIndex) => (
                      <div key={graphIndex} className="border border-gray-200 rounded-md p-3 bg-white">
                        <p className="text-xs font-medium text-gray-900 mb-1">{spec.title}</p>
                        <p className="text-xs text-gray-500 mb-2">Type: {spec.graphType}</p>
                        
                        {graphImages[spec.fileName] && (
                          <div className="border border-gray-100 rounded overflow-hidden">
                            <img 
                              src={graphImages[spec.fileName]} 
                              alt={spec.title} 
                              className="w-full h-auto"
                            />
                          </div>
                        )}
                        
                        <p className="text-xs text-gray-500 mt-2">{spec.caption}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Graph Selection</h3>
        <p className="mt-1 text-sm text-gray-500">
          {readOnly 
            ? "Viewing the graphs selected for each section."
            : "The AI is selecting and generating graphs for each section of your report."}
        </p>
      </div>
      
      {renderProgress()}
      {renderCurrentSection()}
      {renderCompletedSections()}
      
      {!readOnly && !isGenerating && !isGeneratingImages && currentSectionIndex < reportOutline.sections.length && (
        <div className="flex justify-end">
          <button
            onClick={generateGraphsForCurrentSection}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-violet-600 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500"
          >
            Generate Graphs for Current Section
          </button>
        </div>
      )}
      
      {!readOnly && !isGenerating && !isGeneratingImages && currentSectionIndex >= reportOutline.sections.length && (
        <div className="flex justify-end">
          <button
            onClick={() => onComplete?.(graphImages)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-violet-600 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500"
          >
            Continue to Next Step
          </button>
        </div>
      )}
    </div>
  );
};

export default GraphSelectionStep; 