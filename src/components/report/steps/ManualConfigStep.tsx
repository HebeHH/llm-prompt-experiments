import React, { useState } from 'react';
import { AnalysisData } from '@/lib/types/analysis';
import { StatAnalysis } from '@/lib/types/statistics';
import { ReportConfig, ReportStyle } from '@/lib/types/report';
import { LLMProvider } from '@/lib/types/llm';
import { createLLMService } from '@/lib/services/llmService';
import { getApiKeys, saveApiKeysToStorage } from '@/lib/utils/apiKeyManager';

interface ManualConfigStepProps {
  analysisData: AnalysisData;
  statResults: StatAnalysis;
  onComplete: (config: ReportConfig) => void;
}

const ManualConfigStep: React.FC<ManualConfigStepProps> = ({
  analysisData,
  statResults,
  onComplete
}) => {
  const [config, setConfig] = useState<ReportConfig>({
    title: `Analysis Report: ${analysisData.config.name || 'Experiment'}`,
    authorName: 'AI Researcher',
    style: 'academic',
    motivation: '',
    dataAnalysisFocus: {
      includeMainEffects: [],
      includeInteractions: [],
      discussInsignificantResults: false
    },
    audience: 'Technical audience familiar with statistical analysis',
    keyFindings: '',
    recommendations: '',
    nextSteps: ''
  });
  
  const [apiKeys, setApiKeys] = useState<Partial<Record<LLMProvider, string>>>(() => {
    // Get API keys from our centralized manager
    const keys = getApiKeys();
    return {
      openai: keys.openai,
      anthropic: keys.anthropic,
      google: keys.google
    };
  });
  
  const [isValidatingApiKey, setIsValidatingApiKey] = useState(false);
  const [apiKeyValidationResult, setApiKeyValidationResult] = useState<{
    isValid: boolean;
    message: string;
  } | null>(null);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setConfig(prev => {
        const updatedConfig = { ...prev };
        if (parent === 'dataAnalysisFocus') {
          updatedConfig.dataAnalysisFocus = {
            ...updatedConfig.dataAnalysisFocus,
            [child]: value
          };
        } else if (parent in updatedConfig) {
          (updatedConfig as any)[parent] = {
            ...(updatedConfig as any)[parent],
            [child]: value
          };
        }
        return updatedConfig;
      });
    } else {
      setConfig(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setConfig(prev => {
        const updatedConfig = { ...prev };
        if (parent === 'dataAnalysisFocus') {
          updatedConfig.dataAnalysisFocus = {
            ...updatedConfig.dataAnalysisFocus,
            [child]: checked
          };
        } else if (parent in updatedConfig) {
          (updatedConfig as any)[parent] = {
            ...(updatedConfig as any)[parent],
            [child]: checked
          };
        }
        return updatedConfig;
      });
    }
  };
  
  const handleApiKeysChange = (keys: Partial<Record<LLMProvider, string>>) => {
    // Only update if the keys have actually changed
    setApiKeys(prevKeys => {
      const hasChanged = Object.entries(keys).some(
        ([provider, value]) => prevKeys[provider as LLMProvider] !== value
      );
      
      // If keys haven't changed, return the previous state to avoid re-render
      if (!hasChanged) return prevKeys;
      
      return { ...prevKeys, ...keys };
    });
  };
  
  const handleMainEffectToggle = (factorName: string) => {
    setConfig(prev => {
      const includeMainEffects = prev.dataAnalysisFocus.includeMainEffects.includes(factorName)
        ? prev.dataAnalysisFocus.includeMainEffects.filter(name => name !== factorName)
        : [...prev.dataAnalysisFocus.includeMainEffects, factorName];
      
      return {
        ...prev,
        dataAnalysisFocus: {
          ...prev.dataAnalysisFocus,
          includeMainEffects
        }
      };
    });
  };
  
  const handleInteractionToggle = (interactionName: string) => {
    setConfig(prev => {
      const includeInteractions = prev.dataAnalysisFocus.includeInteractions.includes(interactionName)
        ? prev.dataAnalysisFocus.includeInteractions.filter(name => name !== interactionName)
        : [...prev.dataAnalysisFocus.includeInteractions, interactionName];
      
      return {
        ...prev,
        dataAnalysisFocus: {
          ...prev.dataAnalysisFocus,
          includeInteractions
        }
      };
    });
  };
  
  const validateApiKey = async () => {
    setIsValidatingApiKey(true);
    setApiKeyValidationResult(null);
    
    try {
      // Get the selected provider (currently only supporting OpenAI)
      const provider = 'openai' as LLMProvider;
      const apiKey = apiKeys[provider];
      
      if (!apiKey) {
        setApiKeyValidationResult({
          isValid: false,
          message: 'Please enter an API key.'
        });
        return;
      }
      
      // Create the LLM service and validate the API key
      const llmService = createLLMService(provider, apiKey);
      const isValid = await llmService.isApiKeyValid();
      
      if (isValid) {
        setApiKeyValidationResult({
          isValid: true,
          message: 'API key is valid!'
        });
        
        // Save the API key using our centralized manager
        saveApiKeysToStorage({
          ...getApiKeys(),
          [provider]: apiKey
        });
      } else {
        setApiKeyValidationResult({
          isValid: false,
          message: 'Invalid API key. Please check and try again.'
        });
      }
    } catch (error) {
      console.error('Error validating API key:', error);
      setApiKeyValidationResult({
        isValid: false,
        message: `Error validating API key: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsValidatingApiKey(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate the API key if not already validated
    if (!apiKeyValidationResult?.isValid) {
      await validateApiKey();
      
      // If validation failed, don't proceed
      if (!apiKeyValidationResult?.isValid) {
        return;
      }
    }
    
    // Call the onComplete callback with the config
    onComplete(config);
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Report Configuration</h3>
        <p className="mt-1 text-sm text-gray-500">
          Configure the settings for your report generation.
        </p>
      </div>
      
      <div className="space-y-6">
        <div className="bg-white shadow-sm rounded-lg p-6 space-y-6">
          <h4 className="text-md font-medium text-gray-900">Basic Information</h4>
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Report Title
              </label>
              <input
                type="text"
                name="title"
                id="title"
                value={config.title}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500 sm:text-sm"
                required
              />
            </div>
            
            <div>
              <label htmlFor="authorName" className="block text-sm font-medium text-gray-700">
                Author Name
              </label>
              <input
                type="text"
                name="authorName"
                id="authorName"
                value={config.authorName}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500 sm:text-sm"
                required
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="style" className="block text-sm font-medium text-gray-700">
              Report Style
            </label>
            <select
              id="style"
              name="style"
              value={config.style}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500 sm:text-sm"
            >
              <option value="academic">Academic</option>
              <option value="blog">Blog Post</option>
              <option value="custom">Custom</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              {config.style === 'academic' && 'Formal language, clear structure, passive voice, focus on methodology and results.'}
              {config.style === 'blog' && 'Conversational tone, engaging language, active voice, focus on insights and applications.'}
              {config.style === 'custom' && 'Define your own style in the custom prompt field below.'}
            </p>
          </div>
          
          {config.style === 'custom' && (
            <div>
              <label htmlFor="customStylePrompt" className="block text-sm font-medium text-gray-700">
                Custom Style Prompt
              </label>
              <textarea
                id="customStylePrompt"
                name="customStylePrompt"
                rows={3}
                value={config.customStylePrompt || ''}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500 sm:text-sm"
                placeholder="Describe the writing style you want for your report..."
                required={config.style === 'custom'}
              />
            </div>
          )}
        </div>
        
        <div className="bg-white shadow-sm rounded-lg p-6 space-y-6">
          <h4 className="text-md font-medium text-gray-900">API Key</h4>
          
          <div>
            <label htmlFor="openaiApiKey" className="block text-sm font-medium text-gray-700">
              OpenAI API Key
            </label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <input
                type="password"
                name="openaiApiKey"
                id="openaiApiKey"
                value={apiKeys.openai || ''}
                onChange={(e) => setApiKeys(prev => ({ ...prev, openai: e.target.value }))}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500 sm:text-sm"
                placeholder="sk-..."
                required
              />
              <button
                type="button"
                onClick={validateApiKey}
                className="ml-3 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500"
                disabled={isValidatingApiKey}
              >
                {isValidatingApiKey ? 'Validating...' : 'Validate'}
              </button>
            </div>
            
            {apiKeyValidationResult && (
              <p className={`mt-2 text-sm ${apiKeyValidationResult.isValid ? 'text-green-600' : 'text-red-600'}`}>
                {apiKeyValidationResult.message}
              </p>
            )}
            
            <p className="mt-1 text-xs text-gray-500">
              Your API key is stored locally in your browser and is never sent to our servers.
            </p>
          </div>
        </div>
        
        <div className="bg-white shadow-sm rounded-lg p-6 space-y-6">
          <h4 className="text-md font-medium text-gray-900">Report Content</h4>
          
          <div>
            <label htmlFor="audience" className="block text-sm font-medium text-gray-700">
              Target Audience
            </label>
            <input
              type="text"
              name="audience"
              id="audience"
              value={config.audience}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500 sm:text-sm"
              placeholder="Who is this report for?"
              required
            />
          </div>
          
          <div>
            <label htmlFor="motivation" className="block text-sm font-medium text-gray-700">
              Motivation
            </label>
            <textarea
              id="motivation"
              name="motivation"
              rows={3}
              value={config.motivation}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500 sm:text-sm"
              placeholder="Why was this experiment conducted? What questions were you trying to answer?"
              required
            />
          </div>
          
          <div>
            <label htmlFor="keyFindings" className="block text-sm font-medium text-gray-700">
              Key Findings
            </label>
            <textarea
              id="keyFindings"
              name="keyFindings"
              rows={3}
              value={config.keyFindings}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500 sm:text-sm"
              placeholder="What are the most important findings from this experiment?"
              required
            />
          </div>
          
          <div>
            <label htmlFor="recommendations" className="block text-sm font-medium text-gray-700">
              Recommendations
            </label>
            <textarea
              id="recommendations"
              name="recommendations"
              rows={3}
              value={config.recommendations}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500 sm:text-sm"
              placeholder="What actions or decisions should be taken based on these results?"
              required
            />
          </div>
          
          <div>
            <label htmlFor="nextSteps" className="block text-sm font-medium text-gray-700">
              Next Steps
            </label>
            <textarea
              id="nextSteps"
              name="nextSteps"
              rows={3}
              value={config.nextSteps}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500 sm:text-sm"
              placeholder="What future experiments or research should be conducted?"
              required
            />
          </div>
        </div>
        
        <div className="bg-white shadow-sm rounded-lg p-6 space-y-6">
          <h4 className="text-md font-medium text-gray-900">Data Analysis Focus</h4>
          
          <div>
            <fieldset>
              <legend className="text-sm font-medium text-gray-700">Main Effects to Include</legend>
              <div className="mt-2 space-y-2">
                {statResults.mainEffects.map((effect, index) => (
                  <div key={index} className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id={`mainEffect-${index}`}
                        name={`mainEffect-${effect.factorName}`}
                        type="checkbox"
                        checked={config.dataAnalysisFocus.includeMainEffects.includes(effect.factorName)}
                        onChange={() => handleMainEffectToggle(effect.factorName)}
                        className="focus:ring-violet-500 h-4 w-4 text-violet-600 border-gray-300 rounded"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor={`mainEffect-${index}`} className="font-medium text-gray-700">
                        {effect.factorName} on {effect.responseVariable}
                      </label>
                      <p className="text-gray-500">
                        {effect.hasSignificantRelationship 
                          ? `Significant (p = ${effect.significanceInfo.pValue.toFixed(4)})` 
                          : `Not significant (p = ${effect.significanceInfo.pValue.toFixed(4)})`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                If none selected, all significant main effects will be included.
              </p>
            </fieldset>
          </div>
          
          <div>
            <fieldset>
              <legend className="text-sm font-medium text-gray-700">Interactions to Include</legend>
              <div className="mt-2 space-y-2">
                {statResults.interactions.map((interaction, index) => {
                  const interactionName = interaction.factors.join(' × ');
                  return (
                    <div key={index} className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id={`interaction-${index}`}
                          name={`interaction-${interactionName}`}
                          type="checkbox"
                          checked={config.dataAnalysisFocus.includeInteractions.includes(interactionName)}
                          onChange={() => handleInteractionToggle(interactionName)}
                          className="focus:ring-violet-500 h-4 w-4 text-violet-600 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor={`interaction-${index}`} className="font-medium text-gray-700">
                          {interactionName} on {interaction.responseVariable}
                        </label>
                        <p className="text-gray-500">
                          {interaction.hasSignificantRelationship 
                            ? `Significant (p = ${interaction.significanceInfo.pValue.toFixed(4)})` 
                            : `Not significant (p = ${interaction.significanceInfo.pValue.toFixed(4)})`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                If none selected, all significant interactions will be included.
              </p>
            </fieldset>
          </div>
          
          <div>
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="discussInsignificantResults"
                  name="dataAnalysisFocus.discussInsignificantResults"
                  type="checkbox"
                  checked={config.dataAnalysisFocus.discussInsignificantResults}
                  onChange={handleCheckboxChange}
                  className="focus:ring-violet-500 h-4 w-4 text-violet-600 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="discussInsignificantResults" className="font-medium text-gray-700">
                  Discuss Insignificant Results
                </label>
                <p className="text-gray-500">
                  Include a section discussing factors and interactions that did not show significant effects.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end">
        <button
          type="submit"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-violet-600 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500"
        >
          Continue to Next Step
        </button>
      </div>
    </form>
  );
};

export default ManualConfigStep; 