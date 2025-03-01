import React, { useState } from 'react';
import { defaultQuestions } from '@/lib/constants/defaultQuestions';
import { PromptFactor } from '@/lib/types/analysis';

interface PromptVariableEditorProps {
  variables: string[];
  onChange: (variables: string[]) => void;
  promptFactors?: PromptFactor[];
  promptFunction?: (factors: string[], variable: string) => string;
}

export const PromptVariableEditor: React.FC<PromptVariableEditorProps> = ({
  variables,
  onChange,
  promptFactors = [],
  promptFunction = (factors, variable) => `${factors.join("\n")}\n${variable}`,
}) => {
  const [newVariable, setNewVariable] = useState('');
  const [useDefaultQuestions, setUseDefaultQuestions] = useState(false);
  const [numRandomQuestions, setNumRandomQuestions] = useState(5);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [showPromptsModal, setShowPromptsModal] = useState(false);

  const handleAddVariable = () => {
    if (!newVariable.trim()) return;
    onChange([...variables, newVariable]);
    setNewVariable('');
  };

  const handleDeleteVariable = (variable: string) => {
    onChange(variables.filter(v => v !== variable));
  };

  const handleUseDefaultQuestionsChange = (checked: boolean) => {
    setUseDefaultQuestions(checked);
    if (checked && selectedQuestions.length === 0) {
      // Only use random questions if no specific questions are selected
      const randomQs = getRandomQuestions(numRandomQuestions);
      setSelectedQuestions(randomQs);
      onChange(randomQs);
    } else if (!checked) {
      setSelectedQuestions([]);
      onChange([]);
    }
  };

  const handleNumRandomQuestionsChange = (value: number) => {
    setNumRandomQuestions(value);
    if (useDefaultQuestions && selectedQuestions.length === 0) {
      // Only update random questions if no specific questions are selected
      const randomQs = getRandomQuestions(value);
      setSelectedQuestions(randomQs);
      onChange(randomQs);
    }
  };

  const handleQuestionSelect = (question: string, isSelected: boolean) => {
    const newSelected = isSelected
      ? [...selectedQuestions, question]
      : selectedQuestions.filter(q => q !== question);
    setSelectedQuestions(newSelected);
    onChange(newSelected);
  };

  const handleClearSelection = () => {
    setSelectedQuestions([]);
    if (useDefaultQuestions) {
      const randomQs = getRandomQuestions(numRandomQuestions);
      setSelectedQuestions(randomQs);
      onChange(randomQs);
    } else {
      onChange([]);
    }
  };

  const getRandomQuestions = (count: number) => {
    const shuffled = [...defaultQuestions].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  };

  // Generate all possible factor level combinations
  const getAllFactorLevelCombinations = () => {
    if (promptFactors.length === 0 || promptFactors.some(f => f.levels.length === 0)) {
      return [[]]; // Return a single empty combination if no factors
    }

    const combinations: Array<{ factorName: string; levelName: string; prompt: string }[]> = [];
    
    const generateCombinations = (
      currentIndex: number,
      currentCombination: Array<{ factorName: string; levelName: string; prompt: string }>
    ) => {
      if (currentIndex === promptFactors.length) {
        combinations.push([...currentCombination]);
        return;
      }

      const currentFactor = promptFactors[currentIndex];
      for (const level of currentFactor.levels) {
        generateCombinations(currentIndex + 1, [
          ...currentCombination,
          { factorName: currentFactor.name, levelName: level.name, prompt: level.prompt }
        ]);
      }
    };

    generateCombinations(0, []);
    return combinations.length > 0 ? combinations : [[]];
  };

  // Generate all prompts for all combinations and covariates
  const generateAllPrompts = () => {
    const combinations = getAllFactorLevelCombinations();
    const allPrompts: Array<{ 
      combination: string; 
      covariate: string; 
      prompt: string 
    }> = [];

    for (const combination of combinations) {
      const factorPrompts = combination.map(c => c.prompt);
      const combinationString = combination.length > 0 
        ? combination.map(c => `${c.factorName}: ${c.levelName}`).join(", ")
        : "No factors defined";
      
      for (const covariate of variables.length > 0 ? variables : ["COVARIATE TEXT HERE"]) {
        const fullPrompt = promptFunction(factorPrompts, covariate);
        allPrompts.push({
          combination: combinationString,
          covariate,
          prompt: fullPrompt
        });
      }
    }

    return allPrompts;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Fixed header section */}
      <div className="flex-shrink-0 px-4 pb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-violet-800">Prompt Variables</h3>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowPromptsModal(true)}
              className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
            >
              See Prompts
            </button>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={useDefaultQuestions}
                onChange={(e) => handleUseDefaultQuestionsChange(e.target.checked)}
                className="h-4 w-4 text-teal-600 border-violet-300 rounded focus:ring-teal-500"
              />
              <span className="text-violet-700">Use Default Questions</span>
            </label>
          </div>
        </div>
      </div>

      {/* Scrollable content area */}
      <div className="overflow-y-auto px-4 pb-4 flex-grow" style={{ maxHeight: 'calc(100% - 80px)' }}>
        {useDefaultQuestions ? (
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <span className="text-violet-700">Number of random questions:</span>
                <input
                  type="number"
                  min={1}
                  max={defaultQuestions.length}
                  value={numRandomQuestions}
                  onChange={(e) => handleNumRandomQuestionsChange(Number(e.target.value))}
                  className="w-20 px-2 py-1 border border-violet-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                  disabled={selectedQuestions.length > 0}
                />
              </label>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-violet-600">Or select specific questions:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[calc(100vh-30rem)] overflow-y-auto border border-violet-200 rounded-lg p-3 bg-violet-50">
                {defaultQuestions.map(question => (
                  <label
                    key={question}
                    className="flex items-start space-x-2 p-2 rounded hover:bg-violet-100 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedQuestions.includes(question)}
                      onChange={(e) => handleQuestionSelect(question, e.target.checked)}
                      className="mt-1 h-4 w-4 text-teal-600 border-violet-300 rounded focus:ring-teal-500"
                    />
                    <span className="text-sm text-violet-800">{question}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newVariable}
                onChange={(e) => setNewVariable(e.target.value)}
                placeholder="Enter a prompt variable"
                className="flex-1 px-3 py-2 border border-violet-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <button
                onClick={handleAddVariable}
                disabled={!newVariable.trim()}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-400 transition-colors"
              >
                Add
              </button>
            </div>

            <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 30rem)' }}>
              {variables.map(variable => (
                <div
                  key={variable}
                  className="flex items-center justify-between p-3 bg-violet-50 rounded border border-violet-200"
                >
                  <span className="text-violet-800 break-words flex-1 mr-2">{variable}</span>
                  <button
                    onClick={() => handleDeleteVariable(variable)}
                    className="p-1 text-red-600 hover:bg-red-100 rounded flex-shrink-0"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Prompts Modal */}
      {showPromptsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-violet-200">
              <h3 className="text-xl font-semibold text-violet-800">All Possible Prompts</h3>
              <button
                onClick={() => setShowPromptsModal(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {variables.length === 0 && promptFactors.length === 0 ? (
                <p className="text-violet-600">
                  Add at least one prompt variable to see possible prompts.
                </p>
              ) : (
                <div className="space-y-6">
                  {generateAllPrompts().map((item, index) => (
                    <div key={index} className="border border-violet-200 rounded-lg p-4 bg-violet-50">
                      <div className="mb-2">
                        <span className="font-medium text-violet-800">Combination:</span>{" "}
                        <span className="text-violet-600">{item.combination}</span>
                      </div>
                      <div className="mb-2">
                        <span className="font-medium text-violet-800">Covariate:</span>{" "}
                        <span className="text-violet-600">{item.covariate}</span>
                      </div>
                      <div>
                        <span className="font-medium text-violet-800">Prompt:</span>
                        <pre className="mt-2 p-3 bg-white border border-violet-100 rounded-lg text-sm text-violet-800 whitespace-pre-wrap">
                          {item.prompt}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 