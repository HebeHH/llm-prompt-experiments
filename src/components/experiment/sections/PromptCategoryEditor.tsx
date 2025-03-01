import React, { useState } from 'react';
import { PromptFactor } from '@/lib/types/analysis';

interface PromptFactorEditorProps {
  factors: PromptFactor[];
  onChange: (categories: PromptFactor[]) => void;
}

export const PromptFactorEditor: React.FC<PromptFactorEditorProps> = ({
  factors: categories,
  onChange,
}) => {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryName)
        ? prev.filter(name => name !== categoryName)
        : [...prev, categoryName]
    );
  };

  const addCategory = () => {
    if (!newCategoryName.trim()) return;
    onChange([
      ...categories,
      {
        name: newCategoryName,
        levels: [],
      },
    ]);
    setNewCategoryName('');
    setExpandedCategories(prev => [...prev, newCategoryName]);
  };

  const deleteCategory = (categoryName: string) => {
    onChange(categories.filter(cat => cat.name !== categoryName));
    setExpandedCategories(prev => prev.filter(name => name !== categoryName));
  };

  const addOption = (categoryName: string, optionName: string, optionPrompt: string) => {
    onChange(
      categories.map(cat =>
        cat.name === categoryName
          ? {
              ...cat,
              levels: [
                ...cat.levels,
                { name: optionName, prompt: optionPrompt },
              ],
            }
          : cat
      )
    );
  };

  const deleteOption = (categoryName: string, optionName: string) => {
    onChange(
      categories.map(cat =>
        cat.name === categoryName
          ? {
              ...cat,
              levels: cat.levels.filter(opt => opt.name !== optionName),
            }
          : cat
      )
    );
  };

  const handleAddOption = (categoryIndex: number) => {
    const newCategories = [...categories];
    newCategories[categoryIndex].levels.push({
      name: 'New Option',
      prompt: ''
    });
    onChange(newCategories);
  };

  const handleAddEmptyOption = (categoryIndex: number) => {
    const newCategories = [...categories];
    newCategories[categoryIndex].levels.push({
      name: 'Empty',
      prompt: ''
    });
    onChange(newCategories);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Prompt Categories</h3>

      <div className="flex space-x-2">
        <input
          type="text"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          placeholder="New category name"
          className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={addCategory}
          disabled={!newCategoryName.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          Add Category
        </button>
      </div>

      <div className="space-y-4">
        {categories.map((category, index) => (
          <div
            key={category.name}
            className="border rounded-lg overflow-hidden"
          >
            <div
              className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer"
              onClick={() => toggleCategory(category.name)}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{category.name}</h4>
                  <span className="text-sm text-gray-500">
                    ({category.levels.length} options: {category.levels.map(opt => opt.name).join(', ')})
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddOption(index);
                  }}
                  className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Add Option
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddEmptyOption(index);
                  }}
                  className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Add Empty Option
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteCategory(category.name);
                  }}
                  className="p-1 text-red-600 hover:bg-red-100 rounded"
                >
                  Delete
                </button>
                <span className="text-gray-500">
                  {expandedCategories.includes(category.name) ? '▼' : '▶'}
                </span>
              </div>
            </div>

            {expandedCategories.includes(category.name) && (
              <div className="p-4 space-y-4">
                <CategoryOptionForm
                  onSubmit={(name, prompt) => addOption(category.name, name, prompt)}
                />

                <div className="space-y-2">
                  {category.levels.map(option => (
                    <div
                      key={option.name}
                      className="flex items-start justify-between p-3 bg-gray-50 rounded"
                    >
                      <div>
                        <h5 className="font-medium">{option.name}</h5>
                        <p className="text-sm text-gray-600">{option.prompt}</p>
                      </div>
                      <button
                        onClick={() => deleteOption(category.name, option.name)}
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
        ))}
      </div>
    </div>
  );
};

interface CategoryOptionFormProps {
  onSubmit: (name: string, prompt: string) => void;
}

const CategoryOptionForm: React.FC<CategoryOptionFormProps> = ({ onSubmit }) => {
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
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Option name"
        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Option prompt"
        rows={2}
        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="submit"
        disabled={!name.trim() || !prompt.trim()}
        className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
      >
        Add Option
      </button>
    </form>
  );
}; 