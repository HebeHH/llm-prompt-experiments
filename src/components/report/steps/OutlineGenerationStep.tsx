import React, { useState, useEffect } from 'react';
import { ReportBackgroundData, ReportOutline } from '@/lib/types/report';
import { createLLMService } from '@/lib/services/llmService';
import { LLMProvider } from '@/lib/types/llm';
import { getApiKeys } from '@/lib/utils/apiKeyManager';

interface OutlineGenerationStepProps {
  reportBackgroundData: ReportBackgroundData;
  onComplete?: (outline: ReportOutline) => void;
  onError?: (error: string) => void;
  readOnly?: boolean;
}

const OutlineGenerationStep: React.FC<OutlineGenerationStepProps> = ({
  reportBackgroundData,
  onComplete,
  onError,
  readOnly = false
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [outline, setOutline] = useState<ReportOutline | null>(null);
  const streamContainerRef = React.useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!readOnly) {
      generateOutline();
    }
  }, [readOnly]);
  
  // Auto-scroll to bottom of streaming content
  useEffect(() => {
    if (streamContainerRef.current) {
      streamContainerRef.current.scrollTop = streamContainerRef.current.scrollHeight;
    }
  }, [progress]);
  
  const generateOutline = async () => {
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
      
      // Generate the outline
      const generatedOutline = await llmService.generateOutline(
        JSON.stringify(reportBackgroundData),
        (text) => {
          setProgress(text);
        }
      );
      
      setOutline(generatedOutline);
      onComplete?.(generatedOutline);
    } catch (error) {
      console.error('Error generating outline:', error);
      onError?.(`Error generating outline: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleRetry = () => {
    generateOutline();
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Report Outline Generation</h3>
        <p className="mt-1 text-sm text-gray-500">
          {readOnly 
            ? "Viewing the generated report outline."
            : "The AI is generating an outline for your report based on your configuration."}
        </p>
      </div>
      
      <div className="bg-gray-50 p-4 rounded-lg">
        {isGenerating ? (
          <div className="space-y-4">
            <div className="flex items-center">
              <div className="mr-3">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-violet-500"></div>
              </div>
              <p className="text-sm text-gray-700">Generating outline...</p>
            </div>
            
            {progress && (
              <div className="bg-white p-4 rounded border border-gray-200 h-96 overflow-hidden">
                <div 
                  ref={streamContainerRef}
                  className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
                >
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap">{progress}</pre>
                </div>
              </div>
            )}
          </div>
        ) : outline ? (
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-md p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Generated Outline</h3>
              <div className="prose prose-sm max-w-none">
                <h4 className="text-md font-medium">{outline.title}</h4>
                <ul className="space-y-2">
                  {outline.sections.map((section, index) => (
                    <li key={index}>
                      <div className="font-medium">{section.title}</div>
                      <div className="text-sm text-gray-500">{section.description}</div>
                      {section.subsections.length > 0 && (
                        <ul className="pl-5 mt-1 space-y-1">
                          {section.subsections.map((subsection, subIndex) => (
                            <li key={subIndex}>
                              <div className="font-medium">{subsection.title}</div>
                              <div className="text-sm text-gray-500">{subsection.description}</div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            {!readOnly && (
              <div className="flex justify-end">
                <button
                  onClick={() => onComplete?.(outline)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-violet-600 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500"
                >
                  Continue to Next Step
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex justify-center py-8">
            <button
              onClick={handleRetry}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-violet-600 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500"
            >
              Retry Generation
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OutlineGenerationStep; 