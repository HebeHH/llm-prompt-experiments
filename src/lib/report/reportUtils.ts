import { AnalysisData } from '@/lib/types/analysis';
import { StatAnalysis, MainEffectStatAnalysis, InteractionStatAnalysis } from '@/lib/types/statistics';
import { ReportConfig, ReportBackgroundData, ReportOutline, GraphImageSpec } from '@/lib/types/report';

/**
 * Creates the background data for the report generation based on the user's configuration
 * and the analysis data.
 */
export function createReportBackgroundData(
  config: ReportConfig,
  analysisData: AnalysisData,
  statResults: StatAnalysis
): ReportBackgroundData {
  // Get the style prompt
  const stylePrompt = getStylePrompt(config.style, config.customStylePrompt);
  
  // Create the experiment description
  const experimentDescription = createExperimentDescription();
  
  // Create the experiment configuration description
  const experimentConfig = createExperimentConfigDescription(analysisData);
  
  // Create the statistical data description
  const statisticalData = createStatisticalDataDescription(statResults, config.dataAnalysisFocus);
  
  return {
    style: stylePrompt,
    experimentDescription,
    experimentConfig,
    motivation: config.motivation,
    audience: config.audience,
    keyFindings: config.keyFindings,
    recommendations: config.recommendations,
    nextSteps: config.nextSteps,
    statisticalData
  };
}

/**
 * Gets the style prompt based on the selected style
 */
function getStylePrompt(style: string, customStylePrompt?: string): string {
  switch (style) {
    case 'academic':
      return 'Write in an academic style, with formal language, clear structure, and citations where appropriate. Use passive voice and avoid first person pronouns. Focus on methodology, results, and implications.';
    case 'blog':
      return 'Write in a conversational blog post style, with engaging language, personal tone, and accessible explanations. Use active voice and first person pronouns where appropriate. Focus on insights, stories, and practical applications.';
    case 'custom':
      return customStylePrompt || 'Write in a clear, professional style.';
    default:
      return 'Write in a clear, professional style.';
  }
}

/**
 * Creates a description of how factorial ANOVA experiments are structured
 */
function createExperimentDescription(): string {
  return `
This report is based on a factorial ANOVA experiment conducted using language models. 
In this type of experiment, we systematically vary different factors (independent variables) 
and measure their effects on response variables (dependent variables).

The experiment uses a full factorial design, meaning that all possible combinations of factor levels 
are tested. This allows us to analyze both main effects (the effect of a single factor) and 
interaction effects (how factors influence each other).

Statistical analysis is performed using ANOVA (Analysis of Variance) to determine if the factors 
have significant effects on the response variables. The analysis provides p-values (indicating statistical significance), 
effect sizes (indicating practical significance), and confidence intervals.
  `.trim();
}

/**
 * Creates a description of the specific experiment configuration
 */
function createExperimentConfigDescription(analysisData: AnalysisData): string {
  const { config } = analysisData;
  
  // Models description
  const modelsDescription = `
Models tested: ${config.models.map(m => `${m.name} (${m.provider})`).join(', ')}
  `.trim();
  
  // Factors description
  const factorsDescription = config.promptFactors.map(factor => {
    const levelsDescription = factor.levels.map(level => 
      `    - ${level.name}: "${level.prompt}"`
    ).join('\n');
    
    return `
Factor: ${factor.name}
  Levels:
${levelsDescription}
    `.trim();
  }).join('\n\n');
  
  // Prompt noise description
  const noiseDescription = `
Prompt Noise Variables (randomized for each trial):
${config.promptNoise.map(noise => `  - ${noise}`).join('\n')}
  `.trim();
  
  // Response variables description
  const responseDescription = `
Response Variables:
${config.responseVariables.map(rv => `  - ${rv.name}: ${rv.description}`).join('\n')}
  `.trim();
  
  // Sample prompt - handle case where promptFunction is not available
  let samplePrompt = '';
  if (typeof config.promptFunction === 'function') {
    samplePrompt = `
Sample Prompt Structure:
${config.promptFunction(['[Factor 1 Level]', '[Factor 2 Level]'], '[Prompt Noise]')}
    `.trim();
  } else {
    // Default sample prompt when function is not available
    samplePrompt = `
Sample Prompt Structure:
[Factor 1 Level]
[Factor 2 Level]
[Prompt Noise]
    `.trim();
  }
  
  return `
${modelsDescription}

${factorsDescription}

${noiseDescription}

${responseDescription}

${samplePrompt}
  `.trim();
}

/**
 * Creates a description of the statistical results based on the user's focus
 */
function createStatisticalDataDescription(
  statResults: StatAnalysis, 
  dataFocus: ReportConfig['dataAnalysisFocus']
): string {
  const { includeMainEffects, includeInteractions, discussInsignificantResults } = dataFocus;
  
  // Filter main effects based on user selection
  const mainEffects = statResults.mainEffects.filter(effect => 
    includeMainEffects.includes(effect.factorName) || 
    (effect.hasSignificantRelationship && !includeMainEffects.length)
  );
  
  // Filter interactions based on user selection
  const interactions = statResults.interactions.filter(interaction => {
    const interactionName = interaction.factors.join(' × ');
    return includeInteractions.includes(interactionName) || 
      (interaction.hasSignificantRelationship && !includeInteractions.length);
  });
  
  // Create main effects description
  const mainEffectsDescription = mainEffects.map(effect => {
    const significanceText = effect.hasSignificantRelationship 
      ? `Significant effect (p = ${effect.significanceInfo.pValue.toFixed(4)}, F(${effect.significanceInfo.degreesOfFreedom}, ${statResults.residuals[0].degreesOfFreedom}) = ${effect.significanceInfo.fValue.toFixed(2)})`
      : `No significant effect (p = ${effect.significanceInfo.pValue.toFixed(4)})`;
    
    const effectSizeText = `Effect size (η² = ${effect.effectMeaningfulness.etaSquared.toFixed(4)}, ${effect.effectMeaningfulness.effectMeaningfulness} effect)`;
    
    let description = `
Main Effect: ${effect.factorName} on ${effect.responseVariable}
${significanceText}
${effectSizeText}
    `.trim();
    
    if (effect.enhancedInfo) {
      description += `\nNatural Language Description: ${effect.enhancedInfo.naturalLanguageDescription}`;
      
      // Add level means
      description += `\n\nLevel Means:`;
      effect.enhancedInfo.levelMeans.forEach(levelMean => {
        description += `\n  - ${levelMean.level}: ${levelMean.mean.toFixed(4)} (95% CI: ${levelMean.confidenceInterval.lower.toFixed(4)} to ${levelMean.confidenceInterval.upper.toFixed(4)})`;
      });
      
      // Add pairwise comparisons if significant
      if (effect.hasSignificantRelationship) {
        const significantComparisons = effect.enhancedInfo.pairwiseComparisons.filter(comp => comp.isSignificant);
        if (significantComparisons.length > 0) {
          description += `\n\nSignificant Pairwise Comparisons:`;
          significantComparisons.forEach(comp => {
            description += `\n  - ${comp.level1} vs ${comp.level2}: Mean difference = ${comp.meanDifference.toFixed(4)} (p = ${comp.pValue.toFixed(4)})`;
          });
        }
      }
    }
    
    return description;
  }).join('\n\n');
  
  // Create interactions description
  const interactionsDescription = interactions.map(interaction => {
    const factorsText = interaction.factors.join(' × ');
    const significanceText = interaction.hasSignificantRelationship 
      ? `Significant interaction (p = ${interaction.significanceInfo.pValue.toFixed(4)}, F(${interaction.significanceInfo.degreesOfFreedom}, ${statResults.residuals[0].degreesOfFreedom}) = ${interaction.significanceInfo.fValue.toFixed(2)})`
      : `No significant interaction (p = ${interaction.significanceInfo.pValue.toFixed(4)})`;
    
    const effectSizeText = `Effect size (partial η² = ${interaction.effectMeaningfulness.etaSquared.toFixed(4)}, ${interaction.effectMeaningfulness.effectMeaningfulness} effect)`;
    
    let description = `
Interaction Effect: ${factorsText} on ${interaction.responseVariable}
${significanceText}
${effectSizeText}
    `.trim();
    
    if (interaction.enhancedInfo) {
      description += `\nNatural Language Description: ${interaction.enhancedInfo.naturalLanguageDescription}`;
      
      // Add combination means
      if (interaction.enhancedInfo.combinationMeans.length > 0) {
        description += `\n\nCombination Means:`;
        interaction.enhancedInfo.combinationMeans.forEach(combo => {
          const combinationText = Object.entries(combo.combination)
            .map(([factor, level]) => `${factor}: ${level}`)
            .join(', ');
          
          description += `\n  - ${combinationText}: ${combo.mean.toFixed(4)} (95% CI: ${combo.confidenceInterval.lower.toFixed(4)} to ${combo.confidenceInterval.upper.toFixed(4)})`;
        });
      }
      
      // Add significant pairwise comparisons
      if (interaction.hasSignificantRelationship) {
        const significantComparisons = interaction.enhancedInfo.pairwiseComparisons.filter(comp => comp.isSignificant);
        if (significantComparisons.length > 0) {
          description += `\n\nSignificant Pairwise Comparisons:`;
          significantComparisons.slice(0, 5).forEach(comp => {
            description += `\n  - ${comp.level1} vs ${comp.level2}: Mean difference = ${comp.meanDifference.toFixed(4)} (p = ${comp.pValue.toFixed(4)})`;
          });
          
          if (significantComparisons.length > 5) {
            description += `\n  - ... and ${significantComparisons.length - 5} more significant comparisons`;
          }
        }
      }
    }
    
    return description;
  }).join('\n\n');
  
  // Create insignificant results description if requested
  let insignificantDescription = '';
  if (discussInsignificantResults) {
    const insignificantMainEffects = statResults.mainEffects.filter(effect => 
      !effect.hasSignificantRelationship && !mainEffects.includes(effect)
    );
    
    const insignificantInteractions = statResults.interactions.filter(interaction => 
      !interaction.hasSignificantRelationship && !interactions.includes(interaction)
    );
    
    if (insignificantMainEffects.length > 0 || insignificantInteractions.length > 0) {
      insignificantDescription = `
Insignificant Results:

${insignificantMainEffects.map(effect => 
  `- Main Effect: ${effect.factorName} on ${effect.responseVariable} (p = ${effect.significanceInfo.pValue.toFixed(4)})`
).join('\n')}

${insignificantInteractions.map(interaction => 
  `- Interaction: ${interaction.factors.join(' × ')} on ${interaction.responseVariable} (p = ${interaction.significanceInfo.pValue.toFixed(4)})`
).join('\n')}
      `.trim();
    }
  }
  
  // Combine all descriptions
  return `
${mainEffectsDescription}

${interactionsDescription}

${insignificantDescription}
  `.trim();
}

/**
 * Creates a formatted section ID from a section title
 * @param title The section title
 * @returns A formatted ID suitable for HTML anchors
 */
export const formatSectionId = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');
};

/**
 * Creates a markdown table of contents from a report outline
 * @param outline The report outline
 * @returns A markdown string containing the table of contents
 */
export const createTableOfContents = (outline: ReportOutline): string => {
  let toc = '## Table of Contents\n\n';
  
  outline.sections.forEach((section, sectionIndex) => {
    const sectionId = formatSectionId(section.title);
    toc += `${sectionIndex + 1}. [${section.title}](#${sectionId})\n`;
    
    section.subsections.forEach((subsection, subsectionIndex) => {
      const subsectionId = formatSectionId(subsection.title);
      toc += `   ${sectionIndex + 1}.${subsectionIndex + 1}. [${subsection.title}](#${subsectionId})\n`;
    });
  });
  
  return toc;
};

/**
 * Creates a markdown header for the report
 * @param title The report title
 * @param authorName The author's name
 * @param llmModel The LLM model used for generation
 * @returns A markdown string containing the report header
 */
export const createReportHeader = (
  title: string,
  authorName: string,
  llmModel: string
): string => {
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  return `# ${title}\n\n` +
    `**Author:** ${authorName}  \n` +
    `**Date:** ${date}  \n` +
    `**Generated with:** ${llmModel}\n\n`;
};

/**
 * Embeds images in markdown content
 * @param markdown The markdown content
 * @param images The graph images to embed
 * @returns A markdown string with embedded images
 */
export const embedImagesInMarkdown = (
  markdown: string,
  images: Record<string, string>
): string => {
  // Create a regex to find image placeholders in the markdown
  const imagePlaceholderRegex = /\!\[([^\]]+)\]\(IMAGE_PLACEHOLDER:([^)]+)\)/g;
  
  // Replace image placeholders with actual image references
  return markdown.replace(imagePlaceholderRegex, (match, altText, imageId) => {
    const imageUrl = images[imageId];
    if (imageUrl) {
      return `![${altText}](${imageUrl})`;
    }
    return match; // Keep the placeholder if image not found
  });
}; 