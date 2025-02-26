import React, { useMemo } from 'react';
import { LLMModel } from '../../../lib/types/llm';
import { PromptCategory } from '../../../lib/types/analysis';

interface PricingPredictorProps {
  models: LLMModel[];
  promptCategories: PromptCategory[];
  promptVariables: string[];
}

export const PricingPredictor: React.FC<PricingPredictorProps> = ({
  models,
  promptCategories,
  promptVariables,
}) => {
  const estimations = useMemo(() => {
    // Calculate total number of prompts
    const totalPromptCombinations = promptCategories.reduce((acc, category) => {
      // Each category must have at least one option (even if it's empty)
      const optionCount = Math.max(1, category.categories.length);
      return acc * optionCount;
    }, 1);
    const totalPrompts = totalPromptCombinations * promptVariables.length;

    // Calculate average prompt length (in words) from categories
    const avgCategoryPromptLength = promptCategories.reduce((acc, category) => {
      const categoryPrompts = category.categories.map(c => c.prompt);
      const totalWords = categoryPrompts.reduce(
        (sum, prompt) => sum + (prompt.match(/\b\w+\b/g)?.length || 0),
        0
      );
      return acc + (totalWords / (categoryPrompts.length || 1));
    }, 0);

    // Average variable length (assuming 10 words per variable)
    const avgVariableLength = 10;

    // Total words per prompt
    const totalWordsPerPrompt = avgCategoryPromptLength + avgVariableLength;

    // Estimate tokens using the 4 words = 3 tokens rule
    const inputTokensPerPrompt = Math.ceil((totalWordsPerPrompt * 4) / 3);
    const outputTokens = 500; // Assuming 500 output tokens per response

    return models.map(model => {
      const totalInputTokens = inputTokensPerPrompt * totalPrompts;
      const totalOutputTokens = outputTokens * totalPrompts;

      const inputCost = (totalInputTokens / 1_000_000) * model.pricing.perMillionTokensInput;
      const outputCost = (totalOutputTokens / 1_000_000) * model.pricing.perMillionTokensOutput;

      return {
        model,
        totalPrompts,
        totalInputTokens,
        totalOutputTokens,
        inputCost,
        outputCost,
        totalCost: inputCost + outputCost,
      };
    });
  }, [models, promptCategories, promptVariables]);

  if (estimations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Cost Estimation</h3>
      <div className="space-y-4">
        {estimations.map(({
          model,
          totalPrompts,
          totalInputTokens,
          totalOutputTokens,
          inputCost,
          outputCost,
          totalCost,
        }) => (
          <div
            key={model.name}
            className="p-4 border rounded-lg space-y-2"
          >
            <div className="flex justify-between items-center">
              <h4 className="font-medium">{model.name}</h4>
              <span className="text-lg font-semibold text-blue-600">
                ${totalCost.toFixed(4)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <p>Total Prompts: {totalPrompts}</p>
                <p>Input Tokens: {totalInputTokens.toLocaleString()}</p>
                <p>Output Tokens: {totalOutputTokens.toLocaleString()}</p>
              </div>
              <div>
                <p>Input Cost: ${inputCost.toFixed(4)}</p>
                <p>Output Cost: ${outputCost.toFixed(4)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 