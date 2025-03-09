import React, { useState, useRef, useEffect } from 'react';
import { PromptFactor } from '@/lib/types/analysis';

interface PromptFactorEditorProps {
  factors: PromptFactor[];
  onChange: (factors: PromptFactor[]) => void;
  promptCovariates?: string[];
  promptFunction?: (factors: string[], variable: string) => string;
}

export const PromptFactorEditor: React.FC<PromptFactorEditorProps> = ({
  factors,
  onChange,
  promptCovariates = ["COVARIATE TEXT HERE"],
  promptFunction = (factors, variable) => `${factors.join("\n")}\n${variable}`,
}) => {
  const [newFactorName, setNewFactorName] = useState('');
  const [expandedFactors, setExpandedFactors] = useState<string[]>([]);
  const [showPromptsModal, setShowPromptsModal] = useState(false);
  const newFactorInputRef = useRef<HTMLInputElement>(null);
  const newLevelNameRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const toggleFactor = (factorName: string) => {
    setExpandedFactors(prev =>
      prev.includes(factorName)
        ? prev.filter(name => name !== factorName)
        : [...prev, factorName]
    );
  };

  const addFactor = () => {
    if (!newFactorName.trim()) return;
    const newFactor = {
      name: newFactorName,
      levels: [],
    };
    // Add new factor at the top of the list
    onChange([newFactor, ...factors]);
    setNewFactorName('');
    
    // Collapse all existing factors and only expand the new one
    setExpandedFactors([newFactorName]);
    
    // Schedule focus for the next render cycle
    setTimeout(() => {
      if (newLevelNameRefs.current[newFactorName]) {
        newLevelNameRefs.current[newFactorName]?.focus();
      }
    }, 0);
  };

  const deleteFactor = (factorName: string) => {
    onChange(factors.filter(factor => factor.name !== factorName));
    setExpandedFactors(prev => prev.filter(name => name !== factorName));
  };

  const addLevel = (factorName: string, levelName: string, levelPrompt: string) => {
    onChange(
      factors.map(cat =>
        cat.name === factorName
          ? {
              ...cat,
              levels: [
                ...cat.levels,
                { name: levelName, prompt: levelPrompt },
              ],
            }
          : cat
      )
    );
    
    // Focus back on the level name input after adding
    setTimeout(() => {
      if (newLevelNameRefs.current[factorName]) {
        newLevelNameRefs.current[factorName]?.focus();
      }
    }, 0);
  };

  const deleteLevel = (factorName: string, levelName: string) => {
    onChange(
      factors.map(cat =>
        cat.name === factorName
          ? {
              ...cat,
              levels: cat.levels.filter(level => level.name !== levelName),
            }
          : cat
      )
    );
  };

  const handleAddEmptyLevel = (factorIndex: number) => {
    const newFactors = [...factors];
    newFactors[factorIndex].levels.push({
      name: 'Empty',
      prompt: ''
    });
    onChange(newFactors);
  };

  // Generate all possible combinations of factor levels
  const generateAllPromptCombinations = () => {
    // If no factors or no levels, return empty array
    if (factors.length === 0 || factors.some(f => f.levels.length === 0)) {
      return [];
    }

    // Get all possible combinations of factor levels
    const combinations: Array<{ factorName: string; levelName: string; prompt: string }[]> = [];
    
    const generateCombinations = (
      currentIndex: number,
      currentCombination: Array<{ factorName: string; levelName: string; prompt: string }>
    ) => {
      if (currentIndex === factors.length) {
        combinations.push([...currentCombination]);
        return;
      }

      const currentFactor = factors[currentIndex];
      for (const level of currentFactor.levels) {
        generateCombinations(currentIndex + 1, [
          ...currentCombination,
          { factorName: currentFactor.name, levelName: level.name, prompt: level.prompt }
        ]);
      }
    };

    generateCombinations(0, []);
    return combinations;
  };

  // Generate all prompts for all combinations and covariates
  const generateAllPrompts = () => {
    const combinations = generateAllPromptCombinations();
    const allPrompts: Array<{ 
      combination: string; 
      covariate: string; 
      prompt: string 
    }> = [];

    for (const combination of combinations) {
      const factorPrompts = combination.map(c => c.prompt);
      const combinationString = combination.map(c => `${c.factorName}: ${c.levelName}`).join(", ");
      
      for (const covariate of (promptCovariates.length > 0 ? promptCovariates : ["PROMPT COVARIATE TEXT HERE."])) {
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
      <div className="flex-shrink-0 space-y-4 mb-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-violet-800">Prompt Factors</h3>
          <button
            onClick={() => setShowPromptsModal(true)}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
          >
            See Prompts
          </button>
        </div>

        <div className="flex space-x-2">
          <input
            ref={newFactorInputRef}
            type="text"
            value={newFactorName}
            onChange={(e) => setNewFactorName(e.target.value)}
            placeholder="New Factor Name"
            className="flex-1 px-3 py-2 border border-violet-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <button
            onClick={addFactor}
            disabled={!newFactorName.trim()}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-400 transition-colors"
          >
            Add Factor
          </button>
        </div>
      </div>

      {/* Scrollable factors list */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="space-y-4">
          {factors.map((factor, index) => (
            <div
              key={factor.name}
              className="border border-violet-200 rounded-lg overflow-hidden shadow-sm"
            >
              <div
                className="flex items-center justify-between p-4 bg-violet-50 cursor-pointer"
                onClick={() => toggleFactor(factor.name)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <h4 className="font-medium text-violet-800 truncate">{factor.name}</h4>
                    <span className="text-sm text-violet-500 whitespace-nowrap">
                      ({factor.levels.length} levels)
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddEmptyLevel(index);
                    }}
                    className="px-3 py-1 text-sm bg-teal-500 text-white rounded hover:bg-teal-600 transition-colors"
                  >
                    Add Empty
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteFactor(factor.name);
                    }}
                    className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                  >
                    Delete
                  </button>
                  <span className="text-violet-500">
                    {expandedFactors.includes(factor.name) ? '▼' : '▶'}
                  </span>
                </div>
              </div>

              {expandedFactors.includes(factor.name) && (
                <div className="p-4 space-y-4">
                  <CategoryLevelForm
                    factorName={factor.name}
                    onSubmit={(name, prompt) => addLevel(factor.name, name, prompt)}
                    inputRef={(el) => (newLevelNameRefs.current[factor.name] = el)}
                  />

                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {factor.levels.map(level => (
                      <div
                        key={level.name}
                        className="flex items-start justify-between p-3 bg-violet-50 rounded border border-violet-100"
                      >
                        <div className="overflow-hidden flex-grow">
                          <h5 className="font-medium text-violet-800">{level.name}</h5>
                          <p className="text-sm text-violet-600 break-words">{level.prompt}</p>
                        </div>
                        <button
                          onClick={() => deleteLevel(factor.name, level.name)}
                          className="p-1 text-red-600 hover:bg-red-100 rounded flex-shrink-0 ml-2"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
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
              {generateAllPromptCombinations().length === 0 ? (
                <p className="text-violet-600">
                  Add at least one factor with at least one level to see possible prompts.
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

interface CategoryLevelFormProps {
  factorName: string;
  onSubmit: (name: string, prompt: string) => void;
  inputRef: (el: HTMLInputElement | null) => void;
}

const CategoryLevelForm: React.FC<CategoryLevelFormProps> = ({ factorName, onSubmit, inputRef }) => {
  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !prompt.trim()) return;
    onSubmit(name, prompt);
    setName('');
    setPrompt('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Level name"
        className="w-full px-3 py-2 border border-violet-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
      />
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Level prompt"
        rows={2}
        className="w-full px-3 py-2 border border-violet-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
      />
      <button
        type="submit"
        disabled={!name.trim() || !prompt.trim()}
        className="w-full py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-400 transition-colors"
      >
        Add Level
      </button>
    </form>
  );
}; 