import React, { useState, useEffect } from 'react';
import { ReportBackgroundData, ReportOutline } from '@/lib/types/report';
import { createLLMService } from '@/lib/services/llmService';
import { LLMProvider } from '@/lib/types/llm';
import { getApiKeys } from '@/lib/utils/apiKeyManager';

interface OutlineGenerationStepProps {
  reportBackgroundData: ReportBackgroundData;
  onComplete: (outline: ReportOutline) => void;
  onError: (error: string) => void;
}

const OutlineGenerationStep: React.FC<OutlineGenerationStepProps> = ({
  reportBackgroundData,
  onComplete,
  onError
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [outline, setOutline] = useState<ReportOutline | null>(null);
  
  useEffect(() => {
    generateOutline();
  }, []);
  
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
      onComplete(generatedOutline);
    } catch (error) {
      console.error('Error generating outline:', error);
      onError(`Error generating outline: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        <h3 className="text-lg font-medium text-gray-900">Generating Report Outline</h3>
        <p className="mt-1 text-sm text-gray-500">
          The AI is generating an outline for your report based on your configuration.
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
              <div className="bg-white p-4 rounded border border-gray-200 max-h-96 overflow-y-auto">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap">{progress}</pre>
              </div>
            )}
          </div>
        ) : outline ? (
          <div className="space-y-4">
            <div className="flex items-center text-green-600">
              <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="text-sm font-medium">Outline generated successfully!</p>
            </div>
            
            <div className="bg-white p-4 rounded border border-gray-200">
              <h4 className="text-md font-medium text-gray-900 mb-2">{outline.title}</h4>
              <p className="text-sm text-gray-500 mb-4">By {outline.authorName}</p>
              
              <div className="space-y-4">
                {outline.sections.map((section, index) => (
                  <div key={index} className="border-l-2 border-violet-200 pl-4">
                    <h5 className="text-sm font-medium text-gray-900">{section.title}</h5>
                    <p className="text-xs text-gray-500 mt-1">{section.description}</p>
                    
                    {section.subsections.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {section.subsections.map((subsection, subIndex) => (
                          <div key={subIndex} className="border-l-2 border-violet-100 pl-3 ml-2">
                            <h6 className="text-xs font-medium text-gray-800">{subsection.title}</h6>
                            <p className="text-xs text-gray-500">{subsection.description}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={handleRetry}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500"
              >
                Regenerate Outline
              </button>
            </div>
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