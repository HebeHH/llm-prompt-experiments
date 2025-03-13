import React, { useState, useEffect } from 'react';
import { ReportOutline, ReportBackgroundData, GraphImageSpec } from '@/lib/types/report';
import { createLLMService } from '@/lib/services/llmService';
import { LLMProvider } from '@/lib/types/llm';
import { getApiKeys } from '@/lib/utils/apiKeyManager';

interface SectionGenerationStepProps {
  reportOutline: ReportOutline;
  reportBackgroundData: ReportBackgroundData;
  graphImages: Record<string, string>;
  onComplete: (sections: Record<string, string>) => void;
  onError: (error: string) => void;
}

const SectionGenerationStep: React.FC<SectionGenerationStepProps> = ({
  reportOutline,
  reportBackgroundData,
  graphImages,
  onComplete,
  onError
}) => {
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [sections, setSections] = useState<Record<string, string>>({});
  
  useEffect(() => {
    if (currentSectionIndex < reportOutline.sections.length) {
      generateContentForCurrentSection();
    } else {
      // All sections processed, move to the next step
      onComplete(sections);
    }
  }, [currentSectionIndex]);
  
  const generateContentForCurrentSection = async () => {
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
      
      // Find graphs for this section
      const sectionGraphs = Object.entries(graphImages)
        .filter(([fileName]) => {
          // This is a simple heuristic - we're assuming the filename contains the section name
          // A more robust approach would be to store the section-graph mapping
          const sectionNameInFileName = currentSection.title
            .toLowerCase()
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, '-');
          
          return fileName.toLowerCase().includes(sectionNameInFileName);
        })
        .map(([fileName]) => ({ fileName }));
      
      // Generate content for the current section
      const content = await llmService.generateSectionContent(
        JSON.stringify(reportBackgroundData),
        reportOutline,
        currentSection.title,
        sectionGraphs as GraphImageSpec[],
        (text) => {
          setProgress(text);
        }
      );
      
      // Store the section content
      setSections(prev => ({
        ...prev,
        [currentSection.title]: content
      }));
      
      // Generate content for subsections
      if (currentSection.subsections.length > 0) {
        for (const subsection of currentSection.subsections) {
          const subsectionContent = await llmService.generateSectionContent(
            JSON.stringify(reportBackgroundData),
            reportOutline,
            subsection.title,
            sectionGraphs as GraphImageSpec[],
            (text) => {
              setProgress(text);
            }
          );
          
          // Store the subsection content
          setSections(prev => ({
            ...prev,
            [subsection.title]: subsectionContent
          }));
        }
      }
      
      // Move to the next section
      setCurrentSectionIndex(prev => prev + 1);
    } catch (error) {
      console.error('Error generating section content:', error);
      onError(`Error generating section content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
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
                <p>Content generation complete. Moving to the next step...</p>
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
              <p className="text-sm text-gray-700">Generating content for this section...</p>
            </div>
            
            {progress && (
              <div className="bg-gray-50 p-4 rounded border border-gray-200 max-h-96 overflow-y-auto">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap">{progress}</pre>
              </div>
            )}
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
          const sectionContent = sections[section.title] || '';
          const previewContent = sectionContent.length > 200 
            ? sectionContent.substring(0, 200) + '...' 
            : sectionContent;
          
          return (
            <div key={index} className="bg-gray-50 border border-gray-200 rounded-md p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">{section.title}</h4>
              
              <div className="bg-white p-3 rounded border border-gray-100">
                <div className="prose prose-sm max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: previewContent.replace(/\n/g, '<br/>') }} />
                </div>
              </div>
              
              {section.subsections.length > 0 && (
                <div className="mt-3 space-y-3">
                  <p className="text-xs font-medium text-gray-700">Subsections:</p>
                  
                  {section.subsections.map((subsection, subIndex) => {
                    const subsectionContent = sections[subsection.title] || '';
                    const subsectionPreview = subsectionContent.length > 100 
                      ? subsectionContent.substring(0, 100) + '...' 
                      : subsectionContent;
                    
                    return (
                      <div key={subIndex} className="bg-white p-3 rounded border border-gray-100">
                        <h5 className="text-xs font-medium text-gray-900 mb-1">{subsection.title}</h5>
                        <div className="prose prose-sm max-w-none">
                          <div dangerouslySetInnerHTML={{ __html: subsectionPreview.replace(/\n/g, '<br/>') }} />
                        </div>
                      </div>
                    );
                  })}
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
        <h3 className="text-lg font-medium text-gray-900">Content Generation</h3>
        <p className="mt-1 text-sm text-gray-500">
          The AI is generating content for each section of your report.
        </p>
      </div>
      
      {renderProgress()}
      {renderCurrentSection()}
      {renderCompletedSections()}
    </div>
  );
};

export default SectionGenerationStep; 