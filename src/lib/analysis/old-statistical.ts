import * as math from 'mathjs';
import _ from 'lodash';
import { AnalysisResult as ExperimentResult } from '../types/analysis';

// Rename our analysis result to avoid name collision with the project's type
interface StatFactorAnalysisResult {
  factorName: string;
  responseVariable: string;
  hasSignificantRelationship: boolean;
  pValue: number;
  effectSize?: number;
  relationshipDescription: string;
  meansByLevel: Record<string, { mean: number; count: number }>;
  significanceLevel: 'high' | 'medium' | 'low' | 'none';
}

interface StatCategoricalAnalysisResult {
  factorName: string;
  responseVariable: string;
  hasSignificantRelationship: boolean;
  pValue: number;
  chiSquared: number;
  cramersV?: number;
  relationshipDescription: string;
  contingencyTable: Record<string, Record<string, number>>;
  significanceLevel: 'high' | 'medium' | 'low' | 'none';
}

type CategoricalStatAnalysis = {
  
}

type StatAnalysisResult = StatFactorAnalysisResult | StatCategoricalAnalysisResult;

/**
 * Analyzes factorial experiment data to determine significant relationships
 * between factors and response variables
 * 
 * @param data Array of experiment data points
 * @param options Configuration options for the analysis
 * @returns Analysis results for each factor-response variable combination
 */
export function analyzeFactorialExperiment(
  data: ExperimentResult[],
  options: {
    significanceThreshold?: number; // Default: 0.05
    adjustForMultipleComparisons?: boolean; // Default: true
    adjustmentMethod?: 'bonferroni' | 'holm' | 'fdr'; // Default: 'fdr' (False Discovery Rate)
    includeLLMModel?: boolean; // Default: true - whether to include LLM model as a factor
  } = {}
): Record<string, Record<string, StatAnalysisResult>> {
  // Set default options
  const opts = {
    significanceThreshold: 0.05,
    adjustForMultipleComparisons: true,
    adjustmentMethod: 'fdr' as 'bonferroni' | 'holm' | 'fdr',
    includeLLMModel: true,
    ...options
  };

  if (data.length === 0) {
    throw new Error('No data provided for analysis');
  }

  // Extract factor and response variable names
  const factorNames = Object.keys(data[0].factors);
  
  // Add LLM model as a factor if requested
  if (opts.includeLLMModel) {
    factorNames.push('llmModel');
  }
  
  const responseVariableNames = Object.keys(data[0].responseVariables);

  // Initialize results structure
  const results: Record<string, Record<string, StatAnalysisResult>> = {};
  
  // For each response variable
  for (const responseVar of responseVariableNames) {
    results[responseVar] = {};
    
    // Determine if response variable is numerical or categorical
    const isNumerical = data.every(d => 
      typeof d.responseVariables[responseVar] === 'number');
    
    // For each factor
    for (const factor of factorNames) {
      // Get unique levels of this factor
      let factorLevels: string[];
      
      if (factor === 'llmModel' && opts.includeLLMModel) {
        // Extract model names for the LLM model factor
        factorLevels = _.uniq(data.map(d => d.llmResponse.model.name));
      } else {
        factorLevels = _.uniq(data.map(d => d.factors[factor]));
      }
      
      if (isNumerical) {
        // Perform analysis for numerical response variables (ANOVA-like)
        results[responseVar][factor] = analyzeNumericalResponse(
          data, factor, responseVar, factorLevels, opts.significanceThreshold
        );
      } else {
        // Perform analysis for categorical response variables (Chi-square)
        results[responseVar][factor] = analyzeCategoricalResponse(
          data, factor, responseVar, factorLevels, opts.significanceThreshold
        );
      }
    }
  }
  
  // Adjust p-values for multiple comparisons if requested
  if (opts.adjustForMultipleComparisons) {
    adjustPValues(results, opts.adjustmentMethod);
  }
  
  return results;
}

/**
 * Analyzes relationship between a factor and a numerical response variable
 */
function analyzeNumericalResponse(
  data: ExperimentResult[],
  factorName: string,
  responseVariable: string,
  factorLevels: string[],
  significanceThreshold: number
): StatFactorAnalysisResult {
  // Group data by factor levels
  const groupedData = factorName === 'llmModel' 
    ? _.groupBy(data, d => d.llmResponse.model.name)
    : _.groupBy(data, d => d.factors[factorName]);
  
  // Calculate means and variances for each level
  const levelStats = {} as Record<string, { 
    values: number[], 
    mean: number, 
    variance: number,
    count: number 
  }>;
  
  for (const level of factorLevels) {
    const values = groupedData[level]?.map(
      d => d.responseVariables[responseVariable] as number
    ) || [];
    
    levelStats[level] = {
      values,
      mean: values.length > 0 ? Number(math.mean(values)) : 0,
      variance: values.length > 1 ? Number(math.variance(values, 'uncorrected')) : 0,
      count: values.length
    };
  }
  
  // Calculate overall mean and total sample size
  const allValues = data.map(d => d.responseVariables[responseVariable] as number);
  const overallMean = Number(math.mean(allValues));
  const totalN = allValues.length;
  
  // Calculate sum of squares
  const ssTotal = Number(math.sum(allValues.map(v => Math.pow(v - overallMean, 2))));
  const ssBetween = Number(math.sum(Object.values(levelStats).map(
    stats => stats.count * Math.pow(stats.mean - overallMean, 2)
  )));
  const ssWithin = ssTotal - ssBetween;
  
  // Degrees of freedom
  const dfBetween = factorLevels.length - 1;
  const dfWithin = totalN - factorLevels.length;
  
  // Mean squares
  const msBetween = ssBetween / dfBetween;
  const msWithin = ssWithin / dfWithin;
  
  // F statistic
  const fStat = msBetween / msWithin;
  
  // P-value (using F distribution)
  const pValue = calculateFDistributionPValue(dfBetween, dfWithin, fStat);
  
  // Effect size (eta squared)
  const etaSquared = ssBetween / ssTotal;
  
  // Determine significance level
  let significanceLevel: 'high' | 'medium' | 'low' | 'none' = 'none';
  if (pValue < 0.001) significanceLevel = 'high';
  else if (pValue < 0.01) significanceLevel = 'medium';
  else if (pValue < significanceThreshold) significanceLevel = 'low';
  
  // Create level means for reporting
  const meansByLevel: Record<string, { mean: number; count: number }> = {};
  for (const level in levelStats) {
    meansByLevel[level] = {
      mean: levelStats[level].mean,
      count: levelStats[level].count
    };
  }
  
  // Find the levels with the highest and lowest means
  const levelsSorted = Object.entries(meansByLevel)
    .sort((a, b) => b[1].mean - a[1].mean);
  
  // Determine relationship description
  let relationshipDescription = "No significant relationship detected.";
  if (pValue < significanceThreshold) {
    const highest = levelsSorted[0];
    const lowest = levelsSorted[levelsSorted.length - 1];
    
    relationshipDescription = `Factor "${factorName}" has a significant effect on "${responseVariable}" (F(${dfBetween},${dfWithin})=${fStat.toFixed(2)}, p=${pValue.toExponential(2)}, η²=${etaSquared.toFixed(3)}). `;
    relationshipDescription += `Level "${highest[0]}" shows the highest mean (${highest[1].mean.toFixed(2)}), while "${lowest[0]}" shows the lowest (${lowest[1].mean.toFixed(2)}).`;
  }
  
  return {
    factorName,
    responseVariable,
    hasSignificantRelationship: pValue < significanceThreshold,
    pValue,
    effectSize: etaSquared,
    relationshipDescription,
    meansByLevel,
    significanceLevel
  };
}

/**
 * Calculate p-value from F-statistic using a better approximation
 */
function calculateFDistributionPValue(dfNum: number, dfDenom: number, fValue: number): number {
  // Better approximation for F-distribution p-value
  // Based on the F-distribution CDF approximation
  
  // For very small F values, return a high p-value
  if (fValue < 0.001) return 0.999;
  
  // For very large F values, return a small p-value
  if (fValue > 1000) return 0.0001;
  
  // Simple approximation based on Wilson-Hilferty transformation
  const z = Math.sqrt(2 * fValue) - Math.sqrt(2 * dfNum - 1);
  return 1 - normalCDF(z);
}

/**
 * Standard normal cumulative distribution function
 */
function normalCDF(x: number): number {
  // Approximation of the standard normal CDF
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  if (x > 0) p = 1 - p;
  return p;
}

/**
 * Analyzes relationship between a factor and a categorical response variable
 */
function analyzeCategoricalResponse(
  data: ExperimentResult[],
  factorName: string,
  responseVariable: string,
  factorLevels: string[],
  significanceThreshold: number
): StatCategoricalAnalysisResult {
  // Get unique response variable values
  const responseValues = _.uniq(
    data.map(d => String(d.responseVariables[responseVariable]))
  );
  
  // Create contingency table
  const contingencyTable: Record<string, Record<string, number>> = {};
  
  // Initialize table with zeros
  for (const level of factorLevels) {
    contingencyTable[level] = {};
    for (const respValue of responseValues) {
      contingencyTable[level][respValue] = 0;
    }
  }
  
  // Fill contingency table
  for (const item of data) {
    const factorLevel = factorName === 'llmModel' 
      ? item.llmResponse.model.name 
      : item.factors[factorName];
    const respValue = String(item.responseVariables[responseVariable]);
    contingencyTable[factorLevel][respValue]++;
  }
  
  // Calculate row and column totals
  const rowTotals: Record<string, number> = {};
  for (const level of factorLevels) {
    rowTotals[level] = _.sum(Object.values(contingencyTable[level]));
  }
  
  const colTotals: Record<string, number> = {};
  for (const respValue of responseValues) {
    colTotals[respValue] = _.sum(
      factorLevels.map(level => contingencyTable[level][respValue])
    );
  }
  
  const grandTotal = _.sum(Object.values(rowTotals));
  
  // Calculate chi-squared statistic
  let chiSquared = 0;
  for (const level of factorLevels) {
    for (const respValue of responseValues) {
      const observed = contingencyTable[level][respValue];
      const expected = (rowTotals[level] * colTotals[respValue]) / grandTotal;
      
      if (expected > 0) {
        chiSquared += Math.pow(observed - expected, 2) / expected;
      }
    }
  }
  
  // Degrees of freedom
  const df = (factorLevels.length - 1) * (responseValues.length - 1);
  
  // P-value (using chi-squared distribution)
  const pValue = calculateChiSquaredPValue(df, chiSquared);
  
  // Calculate Cramer's V (effect size)
  const cramersV = Math.sqrt(
    chiSquared / (grandTotal * Math.min(factorLevels.length - 1, responseValues.length - 1))
  );
  
  // Determine significance level
  let significanceLevel: 'high' | 'medium' | 'low' | 'none' = 'none';
  if (pValue < 0.001) significanceLevel = 'high';
  else if (pValue < 0.01) significanceLevel = 'medium';
  else if (pValue < significanceThreshold) significanceLevel = 'low';
  
  // Determine relationship description
  let relationshipDescription = "No significant relationship detected.";
  if (pValue < significanceThreshold) {
    // Find the most significant deviations from expected
    let highestDeviation = { level: '', respValue: '', deviation: 0 };
    
    for (const level of factorLevels) {
      for (const respValue of responseValues) {
        const observed = contingencyTable[level][respValue];
        const expected = (rowTotals[level] * colTotals[respValue]) / grandTotal;
        const deviation = (observed - expected) / Math.sqrt(expected);
        
        if (Math.abs(deviation) > Math.abs(highestDeviation.deviation)) {
          highestDeviation = { level, respValue, deviation };
        }
      }
    }
    
    const direction = highestDeviation.deviation > 0 ? 'more likely' : 'less likely';
    
    relationshipDescription = `Factor "${factorName}" has a significant association with "${responseVariable}" (χ²(${df})=${chiSquared.toFixed(2)}, p=${pValue.toExponential(2)}, Cramer's V=${cramersV.toFixed(3)}). `;
    relationshipDescription += `When "${factorName}" is "${highestDeviation.level}", "${responseVariable}" is ${direction} to be "${highestDeviation.respValue}" than expected by chance.`;
  }
  
  return {
    factorName,
    responseVariable,
    hasSignificantRelationship: pValue < significanceThreshold,
    pValue,
    chiSquared,
    cramersV,
    relationshipDescription,
    contingencyTable,
    significanceLevel
  };
}

/**
 * Calculate p-value from chi-squared statistic
 */
function calculateChiSquaredPValue(df: number, chiSquared: number): number {
  // Better approximation for chi-squared p-value
  
  // For very small chi-squared values, return a high p-value
  if (chiSquared < 0.001) return 0.999;
  
  // For very large chi-squared values, return a small p-value
  if (chiSquared > 1000) return 0.0001;
  
  // Wilson-Hilferty transformation to normal
  const z = Math.sqrt(2 * chiSquared) - Math.sqrt(2 * df - 1);
  return 1 - normalCDF(z);
}

/**
 * Adjusts p-values for multiple comparisons
 */
function adjustPValues(
  results: Record<string, Record<string, StatAnalysisResult>>,
  method: 'bonferroni' | 'holm' | 'fdr' = 'fdr'
): void {
  // Collect all p-values
  const pValues: { pValue: number; result: StatAnalysisResult }[] = [];
  
  for (const responseVar in results) {
    for (const factor in results[responseVar]) {
      pValues.push({
        pValue: results[responseVar][factor].pValue,
        result: results[responseVar][factor]
      });
    }
  }
  
  const n = pValues.length;
  
  if (method === 'bonferroni') {
    // Bonferroni correction
    for (const item of pValues) {
      const adjustedP = Math.min(item.pValue * n, 1);
      item.result.pValue = adjustedP;
      item.result.hasSignificantRelationship = adjustedP < 0.05;
      
      // Update significance level
      if (adjustedP < 0.001) item.result.significanceLevel = 'high';
      else if (adjustedP < 0.01) item.result.significanceLevel = 'medium';
      else if (adjustedP < 0.05) item.result.significanceLevel = 'low';
      else item.result.significanceLevel = 'none';
    }
  } else if (method === 'holm') {
    // Holm-Bonferroni correction
    pValues.sort((a, b) => a.pValue - b.pValue);
    
    for (let i = 0; i < n; i++) {
      const adjustedP = Math.min(pValues[i].pValue * (n - i), 1);
      pValues[i].result.pValue = adjustedP;
      pValues[i].result.hasSignificantRelationship = adjustedP < 0.05;
      
      // Update significance level
      if (adjustedP < 0.001) pValues[i].result.significanceLevel = 'high';
      else if (adjustedP < 0.01) pValues[i].result.significanceLevel = 'medium';
      else if (adjustedP < 0.05) pValues[i].result.significanceLevel = 'low';
      else pValues[i].result.significanceLevel = 'none';
    }
  } else if (method === 'fdr') {
    // Benjamini-Hochberg False Discovery Rate
    pValues.sort((a, b) => a.pValue - b.pValue);
    
    // Calculate adjusted p-values
    const adjustedPs: number[] = new Array(n);
    adjustedPs[n - 1] = pValues[n - 1].pValue;
    
    for (let i = n - 2; i >= 0; i--) {
      adjustedPs[i] = Math.min(
        pValues[i].pValue * n / (i + 1),
        adjustedPs[i + 1]
      );
    }
    
    // Apply adjusted p-values
    for (let i = 0; i < n; i++) {
      pValues[i].result.pValue = adjustedPs[i];
      pValues[i].result.hasSignificantRelationship = adjustedPs[i] < 0.05;
      
      // Update significance level
      if (adjustedPs[i] < 0.001) pValues[i].result.significanceLevel = 'high';
      else if (adjustedPs[i] < 0.01) pValues[i].result.significanceLevel = 'medium';
      else if (adjustedPs[i] < 0.05) pValues[i].result.significanceLevel = 'low';
      else pValues[i].result.significanceLevel = 'none';
    }
  }
}

/**
 * Generate a human-readable summary report of the factorial analysis
 * 
 * @param results The analysis results to summarize
 * @returns A formatted string summary of the results
 */
export function generateFactorialAnalysisReport(
  results: Record<string, Record<string, StatAnalysisResult>>,
  options: {
    includeNonSignificant?: boolean; // Default: false
    sortBySignificance?: boolean; // Default: true
    detailedOutput?: boolean; // Default: true
  } = {}
): string {
  const opts = {
    includeNonSignificant: false,
    sortBySignificance: true,
    detailedOutput: true,
    ...options
  };
  
  let report = "## Factorial Experiment Analysis Report\n\n";
  
  // Collect all results in a flat array
  const allResults: (StatAnalysisResult & { responseVarName: string })[] = [];
  
  for (const responseVar in results) {
    for (const factor in results[responseVar]) {
      allResults.push({
        ...results[responseVar][factor],
        responseVarName: responseVar
      });
    }
  }
  
  // Filter non-significant results if not included
  const filteredResults = opts.includeNonSignificant 
    ? allResults 
    : allResults.filter(r => r.hasSignificantRelationship);
  
  if (filteredResults.length === 0) {
    return report + "No significant relationships were found in the analysis.";
  }
  
  // Sort results
  if (opts.sortBySignificance) {
    filteredResults.sort((a, b) => a.pValue - b.pValue);
  }
  
  // Group by response variable
  const groupedByResponse = _.groupBy(filteredResults, 'responseVarName');
  
  // Generate report for each response variable
  for (const responseVar in groupedByResponse) {
    report += `### Response Variable: ${responseVar}\n\n`;
    
    for (const result of groupedByResponse[responseVar]) {
      // Significance indicator
      let sigIndicator = '';
      if (result.significanceLevel === 'high') sigIndicator = '***';
      else if (result.significanceLevel === 'medium') sigIndicator = '**';
      else if (result.significanceLevel === 'low') sigIndicator = '*';
      
      report += `#### Factor: ${result.factorName} ${sigIndicator}\n\n`;
      report += `${result.relationshipDescription}\n\n`;
      
      if (opts.detailedOutput) {
        if ('effectSize' in result) {
          // Numerical response variable
          report += `- **Statistical details**: F-test, p-value: ${result.pValue.toExponential(2)}, Effect size (η²): ${result.effectSize?.toFixed(3) || 'N/A'}\n`;
          report += "- **Mean values by factor level**:\n";
          
          const levelEntries = Object.entries(result.meansByLevel)
            .sort((a, b) => b[1].mean - a[1].mean);
          
          for (const [level, stats] of levelEntries) {
            report += `  - ${level}: ${stats.mean.toFixed(2)} (n=${stats.count})\n`;
          }
        } else if ('contingencyTable' in result && 'cramersV' in result) {
          // Categorical response variable
          report += `- **Statistical details**: Chi-squared test, p-value: ${result.pValue.toExponential(2)}, Cramer's V: ${result.cramersV?.toFixed(3) || 'N/A'}\n`;
          report += "- **Contingency table**:\n";
          
          // Get response values from first level
          const firstLevel = Object.keys(result.contingencyTable)[0];
          const responseValues = Object.keys(result.contingencyTable[firstLevel]);
          
          // Column headers
          report += "  | ";
          for (const respValue of responseValues) {
            report += `${respValue} | `;
          }
          report += "Total |\n";
          
          // Separator row
          report += "  | ";
          for (let i = 0; i <= responseValues.length; i++) {
            report += "--- | ";
          }
          report += "\n";
          
          // Data rows
          for (const level of Object.keys(result.contingencyTable)) {
            report += `  | **${level}** | `;
            
            let rowTotal = 0;
            for (const respValue of responseValues) {
              const count = result.contingencyTable[level][respValue];
              rowTotal += count;
              report += `${count} | `;
            }
            
            report += `${rowTotal} |\n`;
          }
          
          // Column totals
          report += "  | **Total** | ";
          let grandTotal = 0;
          
          for (const respValue of responseValues) {
            let colTotal = 0;
            for (const level of Object.keys(result.contingencyTable)) {
              colTotal += result.contingencyTable[level][respValue];
            }
            grandTotal += colTotal;
            report += `${colTotal} | `;
          }
          
          report += `${grandTotal} |\n`;
        }
      }
      
      report += "\n";
    }
  }
  
  // Add significance level legend
  report += "### Significance Legend\n\n";
  report += "- *** p < 0.001 (highly significant)\n";
  report += "- ** p < 0.01 (very significant)\n";
  report += "- * p < 0.05 (significant)\n\n";
  
  if (opts.includeNonSignificant) {
    report += "Note: Both significant and non-significant relationships are shown.\n";
  } else {
    report += "Note: Only significant relationships are shown. Set 'includeNonSignificant: true' to show all results.\n";
  }
  
  return report;
}