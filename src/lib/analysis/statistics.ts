import * as math from 'mathjs';
import _ from 'lodash';
// Import jStat with a type assertion to avoid TypeScript errors
import jstat from 'jstat';
const { jStat } = jstat as any;
import { 
  AnalysisData, 
  AnalysisResult, 
  ResponseVariable 
} from '../types/analysis';
import { 
  StatAnalysis, 
  MainEffectStatAnalysis, 
  InteractionStatAnalysis, 
  SignificanceInfo, 
  EffectMeaningfulness, 
  Residual 
} from '../types/statistics';

/**
 * Performs statistical analysis on experimental data
 * Calculates main effects, interactions, and residuals for ANOVA analysis
 * 
 * @param analysisData The complete analysis data including config and results
 * @returns A complete statistical analysis with main effects, interactions, and residuals
 */
export function performStatisticalAnalysis(analysisData: AnalysisData): StatAnalysis {
  // Validate input data
  if (!analysisData || !analysisData.config || !analysisData.results) {
    throw new Error('Invalid analysis data provided');
  }
  
  if (analysisData.results.length === 0) {
    return {
      mainEffects: [],
      interactions: [],
      residuals: []
    };
  }
  
  // Extract the data we need
  const { config, results } = analysisData;
  
  // Step 1: Identify valid factors (those with more than one level)
  const validFactors = identifyValidFactors(analysisData);
  
  // Step 2: Identify numerical response variables
  const numericalResponseVariables = identifyNumericalResponseVariables(analysisData);
  
  // Check if we have enough data to perform analysis
  if (validFactors.length === 0 || numericalResponseVariables.length === 0) {
    return {
      mainEffects: [],
      interactions: [],
      residuals: []
    };
  }
  
  // Step 3: Reformat data for easier statistical processing
  const formattedData = reformatDataForAnalysis(analysisData, validFactors);
  
  // Step 4: Calculate main effects
  // Note: For main effects, we use eta squared as the effect size measure
  // In one-way ANOVA, eta squared and partial eta squared are identical
  const mainEffects = calculateMainEffects(formattedData, validFactors, numericalResponseVariables);
  
  // Step 5: Calculate residuals
  const residuals = calculateResiduals(formattedData, validFactors, numericalResponseVariables);
  
  // Step 6: Calculate interactions (2-way and 3-way if enough factors)
  // Note: For interactions, we use partial eta squared as the effect size measure
  // Partial eta squared is preferred for interactions as it accounts for the presence of other effects
  const interactions = calculateInteractions(formattedData, validFactors, numericalResponseVariables);
  
  return {
    mainEffects,
    interactions,
    residuals
  };
}

/**
 * Identifies factors that have more than one level in the data
 */
function identifyValidFactors(analysisData: AnalysisData): string[] {
  const { config, results } = analysisData;
  const factors: string[] = [];
  
  // Add model as a factor if there's more than one model
  if (config.models.length > 1) {
    factors.push('model');
  }
  
  // Add prompt factors that have more than one level
  for (const promptFactor of config.promptFactors) {
    if (promptFactor.levels.length > 1) {
      factors.push(promptFactor.name);
    }
  }
  
  // Verify that these factors actually have multiple levels in the results
  return factors.filter(factor => {
    let values: string[];
    
    if (factor === 'model') {
      values = _.uniq(results.map(r => r.llmResponse.model.name));
    } else {
      values = _.uniq(results.map(r => r.factors[factor]));
    }
    
    return values.length > 1;
  });
}

/**
 * Identifies response variables that are numerical
 */
function identifyNumericalResponseVariables(analysisData: AnalysisData): string[] {
  const { config, results } = analysisData;
  
  // Get response variables that are defined as numerical
  const numericalVars = config.responseVariables
    .filter(variable => variable.dataType === 'numerical')
    .map(variable => variable.name);
  
  // Verify that these variables actually have numerical values in the results
  return numericalVars.filter(varName => {
    // Check if this variable exists in the results and has numerical values
    return results.some(r => 
      r.responseVariables[varName] !== undefined && 
      typeof r.responseVariables[varName] === 'number'
    );
  });
}

/**
 * Reformats the data for easier statistical processing
 */
function reformatDataForAnalysis(
  analysisData: AnalysisData, 
  validFactors: string[]
): FormattedDataPoint[] {
  const { results } = analysisData;
  const formattedData: FormattedDataPoint[] = [];
  
  for (const result of results) {
    const dataPoint: FormattedDataPoint = {
      factors: {},
      responseVariables: {}
    };
    
    // Add model as a factor
    if (validFactors.includes('model')) {
      dataPoint.factors['model'] = result.llmResponse.model.name;
    }
    
    // Add other factors
    for (const factor of validFactors) {
      if (factor !== 'model' && result.factors[factor]) {
        dataPoint.factors[factor] = result.factors[factor];
      }
    }
    
    // Add response variables
    for (const [key, value] of Object.entries(result.responseVariables)) {
      if (typeof value === 'number') {
        dataPoint.responseVariables[key] = value;
      }
    }
    
    // Only add data points that have all required factors and at least one response variable
    const hasAllFactors = validFactors.every(f => 
      f === 'model' ? dataPoint.factors['model'] : dataPoint.factors[f]
    );
    
    const hasResponseVariables = Object.keys(dataPoint.responseVariables).length > 0;
    
    if (hasAllFactors && hasResponseVariables) {
      formattedData.push(dataPoint);
    }
  }
  
  return formattedData;
}

/**
 * Interface for formatted data points used in statistical analysis
 */
interface FormattedDataPoint {
  factors: Record<string, string>;
  responseVariables: Record<string, number>;
}

/**
 * Calculates main effects for each factor and response variable
 */
function calculateMainEffects(
  formattedData: FormattedDataPoint[],
  validFactors: string[],
  numericalResponseVariables: string[]
): MainEffectStatAnalysis[] {
  const mainEffects: MainEffectStatAnalysis[] = [];
  
  // For each response variable
  for (const responseVar of numericalResponseVariables) {
    // Check if we have enough data points with this response variable
    const dataWithResponseVar = formattedData.filter(d => 
      d.responseVariables[responseVar] !== undefined
    );
    
    if (dataWithResponseVar.length < 3) {
      // Not enough data points for meaningful analysis
      continue;
    }
    
    // For each factor
    for (const factor of validFactors) {
      try {
        // Get unique levels for this factor
        const factorLevels = _.uniq(dataWithResponseVar.map(d => d.factors[factor]));
        
        // Skip if there's only one level (no variance to analyze)
        if (factorLevels.length <= 1) continue;
        
        // Calculate ANOVA for this factor and response variable
        const anovaResult = calculateOneWayAnova(dataWithResponseVar, factor, responseVar, factorLevels);
        
        // Skip if the calculation failed
        if (!anovaResult) continue;
        
        // Calculate effect size (eta squared for main effects)
        // For one-way ANOVA, eta squared and partial eta squared are the same
        const etaSquared = anovaResult.sumOfSquares / 
          (anovaResult.sumOfSquares + anovaResult.residualSumOfSquares);
        
        // Determine effect meaningfulness (using eta squared)
        const effectMeaningfulness = determineEffectMeaningfulness(etaSquared, false);
        
        // Create main effect analysis result
        const mainEffect: MainEffectStatAnalysis = {
          factorName: factor,
          numWays: 1,
          responseVariable: responseVar,
          responseDataType: 'numerical',
          hasSignificantRelationship: anovaResult.pValue < 0.05,
          significanceInfo: {
            sumOfSquares: anovaResult.sumOfSquares,
            degreesOfFreedom: anovaResult.degreesOfFreedom,
            meanSquare: anovaResult.meanSquare,
            fValue: anovaResult.fValue,
            pValue: anovaResult.pValue
          },
          effectMeaningfulness: effectMeaningfulness
        };
        
        mainEffects.push(mainEffect);
      } catch (error) {
        console.error(`Error calculating main effect for ${factor} on ${responseVar}:`, error);
        // Continue with the next factor
      }
    }
  }
  
  return mainEffects;
}

/**
 * Calculates one-way ANOVA for a factor and response variable
 */
interface AnovaResult {
  sumOfSquares: number;
  degreesOfFreedom: number;
  meanSquare: number;
  fValue: number;
  pValue: number;
  residualSumOfSquares: number;
  residualDegreesOfFreedom: number;
  residualMeanSquare: number;
  grandMean: number;
  groupMeans: Record<string, number>;
  groupCounts: Record<string, number>;
}

function calculateOneWayAnova(
  data: FormattedDataPoint[],
  factorName: string,
  responseVariable: string,
  factorLevels: string[]
): AnovaResult | null {
  try {
    // Extract response values
    const responseValues = data
      .filter(d => d.responseVariables[responseVariable] !== undefined)
      .map(d => d.responseVariables[responseVariable]);
    
    // Check if we have enough data
    if (responseValues.length < factorLevels.length + 2) {
      // Not enough data points for meaningful analysis
      return null;
    }
    
    // Calculate grand mean
    const grandMean = math.mean(responseValues);
    
    // Group data by factor level
    const groupedData: Record<string, number[]> = {};
    const groupMeans: Record<string, number> = {};
    const groupCounts: Record<string, number> = {};
    
    for (const level of factorLevels) {
      groupedData[level] = [];
    }
    
    for (const d of data) {
      if (d.responseVariables[responseVariable] === undefined) continue;
      
      const level = d.factors[factorName];
      if (level && groupedData[level]) {
        groupedData[level].push(d.responseVariables[responseVariable]);
      }
    }
    
    // Check if each group has at least one data point
    const hasEmptyGroups = Object.values(groupedData).some(values => values.length === 0);
    if (hasEmptyGroups) {
      // Some groups have no data points
      return null;
    }
    
    // Calculate group means and counts
    for (const [level, values] of Object.entries(groupedData)) {
      groupMeans[level] = values.length > 0 ? math.mean(values) : 0;
      groupCounts[level] = values.length;
    }
    
    // Calculate sum of squares between groups (SSB)
    let ssb = 0;
    for (const [level, values] of Object.entries(groupedData)) {
      if (values.length > 0) {
        ssb += values.length * Math.pow(groupMeans[level] - grandMean, 2);
      }
    }
    
    // Calculate sum of squares within groups (SSW)
    let ssw = 0;
    for (const [level, values] of Object.entries(groupedData)) {
      for (const value of values) {
        ssw += Math.pow(value - groupMeans[level], 2);
      }
    }
    
    // Calculate degrees of freedom
    const dfb = factorLevels.length - 1;
    const dfw = responseValues.length - factorLevels.length;
    
    // Check for division by zero
    if (dfb <= 0 || dfw <= 0) {
      return null;
    }
    
    // Calculate mean squares
    const msb = ssb / dfb;
    const msw = ssw / dfw;
    
    // Check for division by zero
    if (msw === 0) {
      return null;
    }
    
    // Calculate F-value
    const fValue = msb / msw;
    
    // Calculate p-value using jStat
    const pValue = calculateFDistributionPValue(dfb, dfw, fValue);
    
    return {
      sumOfSquares: ssb,
      degreesOfFreedom: dfb,
      meanSquare: msb,
      fValue,
      pValue,
      residualSumOfSquares: ssw,
      residualDegreesOfFreedom: dfw,
      residualMeanSquare: msw,
      grandMean,
      groupMeans,
      groupCounts
    };
  } catch (error) {
    console.error('Error in calculateOneWayAnova:', error);
    return null;
  }
}

/**
 * Calculates p-value from F-distribution using jStat
 * 
 * @param dfNum Numerator degrees of freedom
 * @param dfDenom Denominator degrees of freedom
 * @param fValue F-value from ANOVA
 * @returns The p-value representing the probability of observing an F-value as extreme or more extreme
 */
function calculateFDistributionPValue(dfNum: number, dfDenom: number, fValue: number): number {
  try {
    // Use jStat to calculate the p-value from the F-distribution
    // 1 - cdf gives the right tail probability (p-value)
    return 1 - jStat.centralF.cdf(fValue, dfNum, dfDenom);
  } catch (error) {
    console.error('Error calculating p-value with jStat:', error);
    // Fallback to approximation if jStat fails
    return approximateFDistributionPValue(dfNum, dfDenom, fValue);
  }
}

/**
 * Approximates p-value from F-distribution when jStat fails
 * This is a simplified approximation and should be used as fallback only
 */
function approximateFDistributionPValue(dfNum: number, dfDenom: number, fValue: number): number {
  try {
    // For large degrees of freedom, F approaches normal distribution
    if (dfDenom > 100) {
      const z = Math.sqrt(fValue) - Math.sqrt((2 * dfNum - 1) / dfNum);
      return 1 - normalCDF(z);
    }
    
    // Very conservative approximation
    if (fValue < 1) return 0.5;
    if (fValue > 10) return 0.001;
    return 0.05 / fValue; // Rough approximation
  } catch (error) {
    // If all else fails, return a conservative p-value
    return 0.5;
  }
}

/**
 * Calculates cumulative distribution function for standard normal distribution
 */
function normalCDF(x: number): number {
  try {
    // Error function approximation
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    if (x > 0) p = 1 - p;
    return p;
  } catch (error) {
    // If calculation fails, return a conservative value
    return x > 0 ? 0.5 : 0.5;
  }
}

/**
 * Determines the meaningfulness of an effect based on partial eta squared or eta squared
 * Using Cohen's guidelines adapted for effect size measures
 * 
 * @param effectSize The effect size value (eta squared or partial eta squared)
 * @param isPartialEtaSquared Whether the effect size is partial eta squared (true) or eta squared (false)
 * @returns An object containing the effect size and its qualitative interpretation
 */
function determineEffectMeaningfulness(
  effectSize: number, 
  isPartialEtaSquared: boolean = false
): EffectMeaningfulness {
  let effectMeaningfulness: 'high' | 'medium' | 'low';
  
  if (isPartialEtaSquared) {
    // Cohen's guidelines for partial eta squared
    // These are commonly used thresholds in the literature
    if (effectSize >= 0.14) {
      effectMeaningfulness = 'high';
    } else if (effectSize >= 0.06) {
      effectMeaningfulness = 'medium';
    } else {
      effectMeaningfulness = 'low';
    }
  } else {
    // Cohen's guidelines for eta squared
    // These are the traditional thresholds
    if (effectSize >= 0.14) {
      effectMeaningfulness = 'high';
    } else if (effectSize >= 0.06) {
      effectMeaningfulness = 'medium';
    } else {
      effectMeaningfulness = 'low';
    }
  }
  
  return {
    etaSquared: effectSize,
    effectMeaningfulness
  };
}

/**
 * Calculates residuals for the statistical model
 */
function calculateResiduals(
  formattedData: FormattedDataPoint[],
  validFactors: string[],
  numericalResponseVariables: string[]
): Residual[] {
  const residuals: Residual[] = [];
  
  // For each response variable
  for (const responseVar of numericalResponseVariables) {
    try {
      // Check if we have enough data points with this response variable
      const dataWithResponseVar = formattedData.filter(d => 
        d.responseVariables[responseVar] !== undefined
      );
      
      if (dataWithResponseVar.length < 3) {
        // Not enough data points for meaningful analysis
        continue;
      }
      
      // Calculate total sum of squares
      const responseValues = dataWithResponseVar.map(d => d.responseVariables[responseVar]);
      const grandMean = math.mean(responseValues);
      const totalSS = responseValues.reduce((sum, val) => sum + Math.pow(val - grandMean, 2), 0);
      
      // Calculate model sum of squares (sum of all factor sum of squares)
      let modelSS = 0;
      let modelDF = 0;
      
      // Calculate sum of squares for each factor
      for (const factor of validFactors) {
        const factorLevels = _.uniq(dataWithResponseVar.map(d => d.factors[factor]));
        
        // Skip if there's only one level
        if (factorLevels.length <= 1) continue;
        
        // Calculate one-way ANOVA for this factor
        const anovaResult = calculateOneWayAnova(dataWithResponseVar, factor, responseVar, factorLevels);
        
        // Skip if the calculation failed
        if (!anovaResult) continue;
        
        // Add to model sum of squares
        modelSS += anovaResult.sumOfSquares;
        modelDF += anovaResult.degreesOfFreedom;
      }
      
      // Calculate residual sum of squares
      const residualSS = totalSS - modelSS;
      
      // Calculate residual degrees of freedom
      // Total df = n - 1, where n is the number of observations
      const totalDF = responseValues.length - 1;
      const residualDF = totalDF - modelDF;
      
      // Check for division by zero
      if (residualDF <= 0) {
        continue;
      }
      
      // Calculate residual mean squares
      const residualMS = residualSS / residualDF;
      
      // Create residual object
      const residual: Residual = {
        degreesOfFreedom: residualDF,
        sumOfSquares: residualSS,
        meanSquares: residualMS
      };
      
      residuals.push(residual);
    } catch (error) {
      console.error(`Error calculating residuals for ${responseVar}:`, error);
      // Continue with the next response variable
    }
  }
  
  return residuals;
}

/**
 * Calculates interaction effects between factors
 */
function calculateInteractions(
  formattedData: FormattedDataPoint[],
  validFactors: string[],
  numericalResponseVariables: string[]
): InteractionStatAnalysis[] {
  const interactions: InteractionStatAnalysis[] = [];
  
  // Skip if there are not enough factors
  if (validFactors.length < 2) {
    return interactions;
  }
  
  // For each response variable
  for (const responseVar of numericalResponseVariables) {
    try {
      // Check if we have enough data points with this response variable
      const dataWithResponseVar = formattedData.filter(d => 
        d.responseVariables[responseVar] !== undefined
      );
      
      if (dataWithResponseVar.length < 5) {
        // Not enough data points for meaningful interaction analysis
        continue;
      }
      
      // Calculate 2-way interactions
      const twoWayInteractions = calculateNWayInteractions(
        dataWithResponseVar, 
        validFactors, 
        responseVar, 
        2
      );
      interactions.push(...twoWayInteractions);
      
      // Calculate 3-way interactions if there are enough factors
      if (validFactors.length >= 3) {
        const threeWayInteractions = calculateNWayInteractions(
          dataWithResponseVar, 
          validFactors, 
          responseVar, 
          3
        );
        interactions.push(...threeWayInteractions);
      }
    } catch (error) {
      console.error(`Error calculating interactions for ${responseVar}:`, error);
      // Continue with the next response variable
    }
  }
  
  return interactions;
}

/**
 * Calculates n-way interactions between factors
 */
function calculateNWayInteractions(
  formattedData: FormattedDataPoint[],
  validFactors: string[],
  responseVariable: string,
  numWays: 2 | 3
): InteractionStatAnalysis[] {
  const interactions: InteractionStatAnalysis[] = [];
  
  // Generate all possible combinations of factors
  const factorCombinations = generateCombinations(validFactors, numWays);
  
  // For each combination of factors
  for (const factors of factorCombinations) {
    try {
      // Calculate interaction effect
      const interactionResult = calculateInteractionEffect(
        formattedData,
        factors,
        responseVariable
      );
      
      // Skip if the calculation failed
      if (!interactionResult) continue;
      
      // Calculate effect size (partial eta squared)
      // Partial eta squared is SS_effect / (SS_effect + SS_error)
      const partialEtaSquared = interactionResult.sumOfSquares / 
        (interactionResult.sumOfSquares + interactionResult.residualSumOfSquares);
      
      // Determine effect meaningfulness based on partial eta squared
      const effectMeaningfulness = determineEffectMeaningfulness(partialEtaSquared, true);
      
      // Create interaction analysis result
      const interaction: InteractionStatAnalysis = {
        factors,
        numWays: numWays as 2 | 3,
        responseVariable,
        responseDataType: 'numerical',
        hasSignificantRelationship: interactionResult.pValue < 0.05,
        significanceInfo: {
          sumOfSquares: interactionResult.sumOfSquares,
          degreesOfFreedom: interactionResult.degreesOfFreedom,
          meanSquare: interactionResult.meanSquare,
          fValue: interactionResult.fValue,
          pValue: interactionResult.pValue
        },
        effectMeaningfulness
      };
      
      interactions.push(interaction);
    } catch (error) {
      console.error(`Error calculating ${numWays}-way interaction for ${factors.join(', ')} on ${responseVariable}:`, error);
      // Continue with the next combination
    }
  }
  
  return interactions;
}

/**
 * Generates all possible combinations of k elements from an array
 */
function generateCombinations<T>(array: T[], k: number): T[][] {
  const result: T[][] = [];
  
  // Recursive helper function
  function combine(start: number, current: T[]) {
    if (current.length === k) {
      result.push([...current]);
      return;
    }
    
    for (let i = start; i < array.length; i++) {
      current.push(array[i]);
      combine(i + 1, current);
      current.pop();
    }
  }
  
  combine(0, []);
  return result;
}

/**
 * Calculates interaction effect between factors
 */
interface InteractionResult {
  sumOfSquares: number;
  degreesOfFreedom: number;
  meanSquare: number;
  fValue: number;
  pValue: number;
  residualSumOfSquares: number;
  residualDegreesOfFreedom: number;
}

function calculateInteractionEffect(
  data: FormattedDataPoint[],
  factors: string[],
  responseVariable: string
): InteractionResult | null {
  try {
    // Extract response values
    const responseValues = data
      .filter(d => d.responseVariables[responseVariable] !== undefined)
      .map(d => d.responseVariables[responseVariable]);
    
    // Check if we have enough data
    if (responseValues.length < 5) {
      // Not enough data points for meaningful analysis
      return null;
    }
    
    // Calculate total sum of squares
    const grandMean = math.mean(responseValues);
    const totalSS = responseValues.reduce((sum, val) => sum + Math.pow(val - grandMean, 2), 0);
    
    // Calculate main effects sum of squares
    let mainEffectsSS = 0;
    let mainEffectsDF = 0;
    
    for (const factor of factors) {
      const factorLevels = _.uniq(data.map(d => d.factors[factor]));
      
      // Skip if there's only one level
      if (factorLevels.length <= 1) continue;
      
      const anovaResult = calculateOneWayAnova(data, factor, responseVariable, factorLevels);
      
      // Skip if the calculation failed
      if (!anovaResult) continue;
      
      mainEffectsSS += anovaResult.sumOfSquares;
      mainEffectsDF += anovaResult.degreesOfFreedom;
    }
    
    // Calculate combined model sum of squares (including interaction)
    // Group data by combination of factor levels
    const groupedData: Record<string, number[]> = {};
    const groupMeans: Record<string, number> = {};
    const groupCounts: Record<string, number> = {};
    
    // Create a unique key for each combination of factor levels
    for (const d of data) {
      if (d.responseVariables[responseVariable] === undefined) continue;
      
      // Skip if any factor is missing
      if (!factors.every(f => d.factors[f] !== undefined)) continue;
      
      const key = factors.map(f => `${f}:${d.factors[f]}`).join('|');
      if (!groupedData[key]) {
        groupedData[key] = [];
      }
      groupedData[key].push(d.responseVariables[responseVariable]);
    }
    
    // Check if we have enough groups
    if (Object.keys(groupedData).length <= factors.length) {
      // Not enough groups for interaction analysis
      return null;
    }
    
    // Calculate group means and counts
    for (const [key, values] of Object.entries(groupedData)) {
      groupMeans[key] = values.length > 0 ? math.mean(values) : 0;
      groupCounts[key] = values.length;
    }
    
    // Calculate combined model sum of squares
    let combinedModelSS = 0;
    for (const [key, values] of Object.entries(groupedData)) {
      if (values.length > 0) {
        combinedModelSS += values.length * Math.pow(groupMeans[key] - grandMean, 2);
      }
    }
    
    // Calculate interaction sum of squares
    const interactionSS = combinedModelSS - mainEffectsSS;
    
    // Calculate degrees of freedom for interaction
    // Get unique levels for each factor
    const factorLevels = factors.map(f => _.uniq(data.map(d => d.factors[f])));
    
    // Calculate degrees of freedom for combined model
    let combinedModelDF = 1;
    for (const levels of factorLevels) {
      combinedModelDF *= levels.length;
    }
    combinedModelDF -= 1; // Subtract 1 for the grand mean
    
    // Calculate interaction degrees of freedom
    const interactionDF = combinedModelDF - mainEffectsDF;
    
    // Check for invalid degrees of freedom
    if (interactionDF <= 0) {
      return null;
    }
    
    // Calculate residual sum of squares and degrees of freedom
    let residualSS = 0;
    for (const [key, values] of Object.entries(groupedData)) {
      for (const value of values) {
        residualSS += Math.pow(value - groupMeans[key], 2);
      }
    }
    
    const totalDF = responseValues.length - 1;
    const residualDF = totalDF - combinedModelDF;
    
    // Check for invalid degrees of freedom
    if (residualDF <= 0) {
      return null;
    }
    
    // Calculate mean squares
    const interactionMS = interactionSS / interactionDF;
    const residualMS = residualSS / residualDF;
    
    // Check for division by zero
    if (residualMS === 0) {
      return null;
    }
    
    // Calculate F-value
    const fValue = interactionMS / residualMS;
    
    // Calculate p-value using jStat
    const pValue = calculateFDistributionPValue(interactionDF, residualDF, fValue);
    
    return {
      sumOfSquares: interactionSS,
      degreesOfFreedom: interactionDF,
      meanSquare: interactionMS,
      fValue,
      pValue,
      residualSumOfSquares: residualSS,
      residualDegreesOfFreedom: residualDF
    };
  } catch (error) {
    console.error('Error in calculateInteractionEffect:', error);
    return null;
  }
} 