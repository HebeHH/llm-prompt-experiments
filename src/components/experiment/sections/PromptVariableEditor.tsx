import React, { useState } from 'react';
import { defaultQuestions } from '../../../lib/constants/defaultQuestions';

interface PromptVariableEditorProps {
  variables: string[];
  onChange: (variables: string[]) => void;
}

export const PromptVariableEditor: React.FC<PromptVariableEditorProps> = ({
  variables,
  onChange,
}) => {
  const [newVariable, setNewVariable] = useState('');
  const [useDefaultQuestions, setUseDefaultQuestions] = useState(false);
  const [numRandomQuestions, setNumRandomQuestions] = useState(5);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Prompt Variables</h3>
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={useDefaultQuestions}
              onChange={(e) => handleUseDefaultQuestionsChange(e.target.checked)}
              className="h-4 w-4 text-blue-600"
            />
            <span>Use Default Questions</span>
          </label>
        </div>
      </div>

      {useDefaultQuestions ? (
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <span>Number of random questions:</span>
              <input
                type="number"
                min={1}
                max={defaultQuestions.length}
                value={numRandomQuestions}
                onChange={(e) => handleNumRandomQuestionsChange(Number(e.target.value))}
                className="w-20 px-2 py-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={selectedQuestions.length > 0}
              />
            </label>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-gray-600">Or select specific questions:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {defaultQuestions.map(question => (
                <label
                  key={question}
                  className="flex items-start space-x-2 p-2 rounded hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedQuestions.includes(question)}
                    onChange={(e) => handleQuestionSelect(question, e.target.checked)}
                    className="mt-1 h-4 w-4 text-blue-600"
                  />
                  <span className="text-sm">{question}</span>
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
              className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddVariable}
              disabled={!newVariable.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              Add
            </button>
          </div>

          <div className="space-y-2">
            {variables.map(variable => (
              <div
                key={variable}
                className="flex items-center justify-between p-3 bg-gray-50 rounded"
              >
                <span>{variable}</span>
                <button
                  onClick={() => handleDeleteVariable(variable)}
                  className="p-1 text-red-600 hover:bg-red-100 rounded"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}; 