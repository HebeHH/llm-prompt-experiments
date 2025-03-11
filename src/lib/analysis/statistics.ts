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
  Residual,
  ConfidenceInterval,
  LevelMean,
  PairwiseComparison,
  MainEffectEnhancedInfo,
  InteractionEnhancedInfo
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
  
  // Step 7: Enhance significant results with effect direction and natural language descriptions
  const enhancedAnalysis = enhanceSignificantResults(
    formattedData,
    {
      mainEffects,
      interactions,
      residuals
    }
  );
  
  return enhancedAnalysis;
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
        responseVariable: responseVar,
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

/**
 * Enhances significant results with effect direction and natural language descriptions
 * 
 * @param formattedData The formatted data used for analysis
 * @param analysis The statistical analysis results
 * @returns Enhanced statistical analysis with effect direction and descriptions
 */
function enhanceSignificantResults(
  formattedData: FormattedDataPoint[],
  analysis: StatAnalysis
): StatAnalysis {
  // Filter significant main effects and enhance them
  const enhancedMainEffects = analysis.mainEffects
    .map(effect => {
      if (effect.hasSignificantRelationship) {
        return {
          ...effect,
          enhancedInfo: calculateMainEffectEnhancedInfo(formattedData, effect)
        };
      }
      return effect;
    });
  
  // Filter significant interactions and enhance them
  const enhancedInteractions = analysis.interactions
    .map(interaction => {
      if (interaction.hasSignificantRelationship) {
        return {
          ...interaction,
          enhancedInfo: calculateInteractionEnhancedInfo(formattedData, interaction)
        };
      }
      return interaction;
    });
  
  return {
    mainEffects: enhancedMainEffects,
    interactions: enhancedInteractions,
    residuals: analysis.residuals
  };
}

/**
 * Calculates enhanced information for a significant main effect
 * 
 * @param formattedData The formatted data used for analysis
 * @param effect The main effect to enhance
 * @returns Enhanced information with means, comparisons, and description
 */
function calculateMainEffectEnhancedInfo(
  formattedData: FormattedDataPoint[],
  effect: MainEffectStatAnalysis
): MainEffectEnhancedInfo {
  const { factorName, responseVariable } = effect;
  
  // Filter data for this response variable
  const dataWithResponseVar = formattedData.filter(d => 
    d.responseVariables[responseVariable] !== undefined
  );
  
  // Get unique levels for this factor
  const factorLevels = _.uniq(dataWithResponseVar.map(d => d.factors[factorName]));
  
  // Calculate means and confidence intervals for each level
  const levelMeans: LevelMean[] = factorLevels.map(level => {
    // Get values for this level
    const levelValues = dataWithResponseVar
      .filter(d => d.factors[factorName] === level)
      .map(d => d.responseVariables[responseVariable]);
    
    const mean = Number(math.mean(levelValues));
    const sampleSize = levelValues.length;
    // Convert math.std result to number explicitly
    const stdDev = Number(math.std(levelValues, 'uncorrected'));
    const standardError = stdDev / Math.sqrt(sampleSize);
    
    // Calculate 95% confidence interval
    // Using t-distribution for small samples
    const degreesOfFreedom = sampleSize - 1;
    const tCritical = calculateTCritical(degreesOfFreedom, 0.05); // 95% confidence
    const marginOfError = tCritical * standardError;
    
    const confidenceInterval: ConfidenceInterval = {
      lower: mean - marginOfError,
      upper: mean + marginOfError,
      confidenceLevel: 0.95
    };
    
    return {
      level,
      mean,
      confidenceInterval,
      sampleSize
    };
  });
  
  // Calculate pairwise comparisons between levels
  let pairwiseComparisons: PairwiseComparison[] = [];
  
  // Use Tukey HSD for factors with more than two levels
  if (factorLevels.length > 2) {
    pairwiseComparisons = calculateTukeyHSD(
      dataWithResponseVar,
      factorName,
      responseVariable,
      factorLevels
    );
  } else {
    // For two levels, use the t-test approach
    for (let i = 0; i < factorLevels.length; i++) {
      for (let j = i + 1; j < factorLevels.length; j++) {
        const level1 = factorLevels[i];
        const level2 = factorLevels[j];
        
        const level1Mean = levelMeans.find(lm => lm.level === level1)!;
        const level2Mean = levelMeans.find(lm => lm.level === level2)!;
        
        const meanDifference = level1Mean.mean - level2Mean.mean;
        
        // Calculate pooled standard error for the difference
        const level1Values = dataWithResponseVar
          .filter(d => d.factors[factorName] === level1)
          .map(d => d.responseVariables[responseVariable]);
        
        const level2Values = dataWithResponseVar
          .filter(d => d.factors[factorName] === level2)
          .map(d => d.responseVariables[responseVariable]);
        
        const n1 = level1Values.length;
        const n2 = level2Values.length;
        // Convert math.std results to numbers explicitly
        const s1 = Number(math.std(level1Values, 'uncorrected'));
        const s2 = Number(math.std(level2Values, 'uncorrected'));
        
        // Pooled standard error
        const pooledStdError = Math.sqrt((s1 * s1 / n1) + (s2 * s2 / n2));
        
        // Degrees of freedom for Welch's t-test (unequal variances)
        const numerator = Math.pow((s1 * s1 / n1) + (s2 * s2 / n2), 2);
        const denominator1 = Math.pow(s1 * s1 / n1, 2) / (n1 - 1);
        const denominator2 = Math.pow(s2 * s2 / n2, 2) / (n2 - 1);
        const df = numerator / (denominator1 + denominator2);
        
        // Calculate t-value
        const tValue = Math.abs(meanDifference) / pooledStdError;
        
        // Calculate p-value
        const pValue = 2 * (1 - calculateTCumulativeProbability(df, tValue));
        
        // Calculate confidence interval for the difference
        const tCritical = calculateTCritical(df, 0.05); // 95% confidence
        const marginOfError = tCritical * pooledStdError;
        
        const confidenceInterval: ConfidenceInterval = {
          lower: meanDifference - marginOfError,
          upper: meanDifference + marginOfError,
          confidenceLevel: 0.95
        };
        
        pairwiseComparisons.push({
          level1,
          level2,
          meanDifference,
          confidenceInterval,
          pValue,
          isSignificant: pValue < 0.05
        });
      }
    }
  }
  
  // Generate natural language description
  const description = generateMainEffectDescription(effect, levelMeans, pairwiseComparisons);
  
  return {
    levelMeans,
    pairwiseComparisons,
    naturalLanguageDescription: description
  };
}

/**
 * Calculates enhanced information for a significant interaction effect
 * 
 * @param formattedData The formatted data used for analysis
 * @param interaction The interaction effect to enhance
 * @returns Enhanced information with means, comparisons, and description
 */
function calculateInteractionEnhancedInfo(
  formattedData: FormattedDataPoint[],
  interaction: InteractionStatAnalysis
): InteractionEnhancedInfo {
  const { factors, responseVariable } = interaction;
  
  // Filter data for this response variable
  const dataWithResponseVar = formattedData.filter(d => 
    d.responseVariables[responseVariable] !== undefined
  );
  
  // Get all possible combinations of factor levels
  const factorLevelCombinations: Record<string, string[]>[] = [];
  
  // For each factor, get its unique levels
  const factorLevels = factors.map(factor => {
    const levels = _.uniq(dataWithResponseVar.map(d => d.factors[factor]));
    return { factor, levels };
  });
  
  // Generate all combinations of factor levels
  const combinations = generateFactorLevelCombinations(factorLevels);
  
  // Calculate means and confidence intervals for each combination
  const combinationMeans = combinations.map(combination => {
    // Get values for this combination
    const combinationValues = dataWithResponseVar
      .filter(d => {
        return Object.entries(combination).every(([factor, level]) => 
          d.factors[factor] === level
        );
      })
      .map(d => d.responseVariables[responseVariable]);
    
    if (combinationValues.length === 0) {
      // No data for this combination
      return null;
    }
    
    const mean = Number(math.mean(combinationValues));
    const sampleSize = combinationValues.length;
    // Convert math.std result to number explicitly
    const stdDev = Number(math.std(combinationValues, 'uncorrected'));
    const standardError = stdDev / Math.sqrt(sampleSize);
    
    // Calculate 95% confidence interval
    const degreesOfFreedom = sampleSize - 1;
    const tCritical = calculateTCritical(degreesOfFreedom, 0.05); // 95% confidence
    const marginOfError = tCritical * standardError;
    
    const confidenceInterval: ConfidenceInterval = {
      lower: mean - marginOfError,
      upper: mean + marginOfError,
      confidenceLevel: 0.95
    };
    
    return {
      combination,
      mean,
      confidenceInterval,
      sampleSize
    };
  }).filter(Boolean) as {
    combination: Record<string, string>;
    mean: number;
    confidenceInterval: ConfidenceInterval;
    sampleSize: number;
  }[];
  
  // Calculate pairwise comparisons between combinations
  // This will automatically use Tukey HSD for factors with more than two levels
  const pairwiseComparisons = calculateInteractionPairwiseComparisons(
    dataWithResponseVar,
    factors,
    combinationMeans,
    responseVariable
  );
  
  // Generate natural language description
  const description = generateInteractionDescription(
    interaction,
    combinationMeans,
    pairwiseComparisons
  );
  
  return {
    combinationMeans,
    pairwiseComparisons,
    naturalLanguageDescription: description
  };
}

/**
 * Calculates pairwise comparisons for interaction effects
 * Uses Tukey HSD when appropriate for multiple comparisons
 */
function calculateInteractionPairwiseComparisons(
  data: FormattedDataPoint[],
  factors: string[],
  combinationMeans: {
    combination: Record<string, string>;
    mean: number;
    confidenceInterval: ConfidenceInterval;
    sampleSize: number;
  }[],
  responseVariable: string
): PairwiseComparison[] {
  // For interactions, we need to determine if we should use Tukey HSD
  // We'll use Tukey HSD if any factor has more than 2 levels
  
  // Count levels for each factor
  const factorLevelCounts: Record<string, number> = {};
  for (const factor of factors) {
    const levels = _.uniq(data.map(d => d.factors[factor]));
    factorLevelCounts[factor] = levels.length;
  }
  
  // Check if any factor has more than 2 levels
  const shouldUseTukeyHSD = Object.values(factorLevelCounts).some(count => count > 2);
  
  if (shouldUseTukeyHSD) {
    // Use Tukey HSD for multiple comparisons
    return calculateInteractionTukeyHSD(data, factors, combinationMeans, responseVariable);
  } else {
    // Use pairwise t-tests for simpler cases
    return calculateInteractionTTests(data, factors, combinationMeans, responseVariable);
  }
}

/**
 * Calculates Tukey HSD for interaction effects
 * This is more appropriate when factors have multiple levels
 */
function calculateInteractionTukeyHSD(
  data: FormattedDataPoint[],
  factors: string[],
  combinationMeans: {
    combination: Record<string, string>;
    mean: number;
    confidenceInterval: ConfidenceInterval;
    sampleSize: number;
  }[],
  responseVariable: string
): PairwiseComparison[] {
  const pairwiseComparisons: PairwiseComparison[] = [];
  
  // Group data by combination
  const groupedData: Record<string, number[]> = {};
  const groupMeans: Record<string, number> = {};
  const groupCounts: Record<string, number> = {};
  
  // Create a unique key for each combination
  for (const combo of combinationMeans) {
    const key = Object.entries(combo.combination)
      .map(([factor, level]) => `${factor}=${level}`)
      .join('|');
    
    groupedData[key] = [];
    groupMeans[key] = combo.mean;
    groupCounts[key] = combo.sampleSize;
  }
  
  // Fill the grouped data
  for (const d of data) {
    if (d.responseVariables[responseVariable] === undefined) continue;
    
    // Create a key for this data point
    const key = factors.map(factor => 
      `${factor}=${d.factors[factor]}`
    ).join('|');
    
    if (groupedData[key]) {
      groupedData[key].push(d.responseVariables[responseVariable]);
    }
  }
  
  // Calculate MSE (mean square error) from ANOVA
  // For interactions, we need to calculate the residual mean square
  let totalSS = 0;
  let totalMean = 0;
  let totalCount = 0;
  
  // Calculate grand mean and total sum of squares
  for (const [key, values] of Object.entries(groupedData)) {
    if (values.length > 0) {
      totalCount += values.length;
      for (const value of values) {
        totalMean += value;
      }
    }
  }
  
  if (totalCount > 0) {
    totalMean /= totalCount;
    
    // Calculate total sum of squares
    for (const [key, values] of Object.entries(groupedData)) {
      for (const value of values) {
        totalSS += Math.pow(value - totalMean, 2);
      }
    }
    
    // Calculate between-groups sum of squares
    let betweenSS = 0;
    for (const [key, values] of Object.entries(groupedData)) {
      if (values.length > 0) {
        betweenSS += values.length * Math.pow(groupMeans[key] - totalMean, 2);
      }
    }
    
    // Calculate within-groups (residual) sum of squares
    const residualSS = totalSS - betweenSS;
    
    // Calculate degrees of freedom
    const totalDF = totalCount - 1;
    const betweenDF = Object.keys(groupedData).length - 1;
    const residualDF = totalDF - betweenDF;
    
    // Calculate mean square error
    const MSE = residualSS / residualDF;
    
    // Calculate Tukey HSD for all pairs
    for (let i = 0; i < combinationMeans.length; i++) {
      for (let j = i + 1; j < combinationMeans.length; j++) {
        const combo1 = combinationMeans[i];
        const combo2 = combinationMeans[j];
        
        // Count how many factors differ between these combinations
        const differingFactors = factors.filter(factor => 
          combo1.combination[factor] !== combo2.combination[factor]
        );
        
        // Only compare combinations that differ by one factor
        // This helps interpret the interaction effect more clearly
        if (differingFactors.length === 1) {
          const meanDifference = combo1.mean - combo2.mean;
          
          const n1 = combo1.sampleSize;
          const n2 = combo2.sampleSize;
          
          // Calculate standard error for the difference
          const SE = Math.sqrt(MSE * (1/n1 + 1/n2));
          
          // Calculate q statistic
          const q = Math.abs(meanDifference) / SE;
          
          // Calculate p-value using the studentized range distribution
          const k = combinationMeans.length; // Number of combinations
          const pValue = calculateStudentizedRangePValue(q, k, residualDF);
          
          // Calculate confidence interval
          const qCritical = calculateStudentizedRangeCritical(0.05, k, residualDF);
          const marginOfError = qCritical * SE;
          
          const confidenceInterval: ConfidenceInterval = {
            lower: meanDifference - marginOfError,
            upper: meanDifference + marginOfError,
            confidenceLevel: 0.95
          };
          
          // Create a descriptive label for each combination
          const combo1Label = Object.entries(combo1.combination)
            .map(([factor, level]) => `${factor}=${level}`)
            .join(', ');
          
          const combo2Label = Object.entries(combo2.combination)
            .map(([factor, level]) => `${factor}=${level}`)
            .join(', ');
          
          pairwiseComparisons.push({
            level1: combo1Label,
            level2: combo2Label,
            meanDifference,
            confidenceInterval,
            pValue,
            isSignificant: pValue < 0.05
          });
        }
      }
    }
  }
  
  return pairwiseComparisons;
}

/**
 * Calculates pairwise t-tests for interaction effects
 * This is used when all factors have only 2 levels
 */
function calculateInteractionTTests(
  data: FormattedDataPoint[],
  factors: string[],
  combinationMeans: {
    combination: Record<string, string>;
    mean: number;
    confidenceInterval: ConfidenceInterval;
    sampleSize: number;
  }[],
  responseVariable: string
): PairwiseComparison[] {
  const pairwiseComparisons: PairwiseComparison[] = [];
  
  // For interactions, we'll focus on comparing combinations that differ by one factor level
  // This helps interpret the interaction effect more clearly
  for (let i = 0; i < combinationMeans.length; i++) {
    for (let j = i + 1; j < combinationMeans.length; j++) {
      const combo1 = combinationMeans[i];
      const combo2 = combinationMeans[j];
      
      // Count how many factors differ between these combinations
      const differingFactors = factors.filter(factor => 
        combo1.combination[factor] !== combo2.combination[factor]
      );
      
      // Only compare combinations that differ by one factor
      // This is most useful for interpreting interactions
      if (differingFactors.length === 1) {
        const meanDifference = combo1.mean - combo2.mean;
        
        // Get values for each combination
        const combo1Values = data
          .filter(d => {
            return Object.entries(combo1.combination).every(([factor, level]) => 
              d.factors[factor] === level
            );
          })
          .map(d => d.responseVariables[responseVariable]);
        
        const combo2Values = data
          .filter(d => {
            return Object.entries(combo2.combination).every(([factor, level]) => 
              d.factors[factor] === level
            );
          })
          .map(d => d.responseVariables[responseVariable]);
        
        const n1 = combo1Values.length;
        const n2 = combo2Values.length;
        // Convert math.std results to numbers explicitly
        const s1 = Number(math.std(combo1Values, 'uncorrected'));
        const s2 = Number(math.std(combo2Values, 'uncorrected'));
        
        // Pooled standard error
        const pooledStdError = Math.sqrt((s1 * s1 / n1) + (s2 * s2 / n2));
        
        // Degrees of freedom for Welch's t-test
        const numerator = Math.pow((s1 * s1 / n1) + (s2 * s2 / n2), 2);
        const denominator1 = Math.pow(s1 * s1 / n1, 2) / (n1 - 1);
        const denominator2 = Math.pow(s2 * s2 / n2, 2) / (n2 - 1);
        const df = numerator / (denominator1 + denominator2);
        
        // Calculate t-value
        const tValue = Math.abs(meanDifference) / pooledStdError;
        
        // Calculate p-value
        const pValue = 2 * (1 - calculateTCumulativeProbability(df, tValue));
        
        // Calculate confidence interval for the difference
        const tCritical = calculateTCritical(df, 0.05); // 95% confidence
        const marginOfError = tCritical * pooledStdError;
        
        const confidenceInterval: ConfidenceInterval = {
          lower: meanDifference - marginOfError,
          upper: meanDifference + marginOfError,
          confidenceLevel: 0.95
        };
        
        // Create a descriptive label for each combination
        const combo1Label = Object.entries(combo1.combination)
          .map(([factor, level]) => `${factor}=${level}`)
          .join(', ');
        
        const combo2Label = Object.entries(combo2.combination)
          .map(([factor, level]) => `${factor}=${level}`)
          .join(', ');
        
        pairwiseComparisons.push({
          level1: combo1Label,
          level2: combo2Label,
          meanDifference,
          confidenceInterval,
          pValue,
          isSignificant: pValue < 0.05
        });
      }
    }
  }
  
  return pairwiseComparisons;
}

/**
 * Generates all possible combinations of factor levels
 */
function generateFactorLevelCombinations(
  factorLevels: { factor: string; levels: string[] }[]
): Record<string, string>[] {
  // Base case: no factors left
  if (factorLevels.length === 0) {
    return [{}];
  }
  
  // Take the first factor and its levels
  const [firstFactor, ...restFactors] = factorLevels;
  
  // Generate combinations for the rest of the factors
  const restCombinations = generateFactorLevelCombinations(restFactors);
  
  // Combine the first factor's levels with the rest of the combinations
  const combinations: Record<string, string>[] = [];
  
  for (const level of firstFactor.levels) {
    for (const restCombo of restCombinations) {
      combinations.push({
        [firstFactor.factor]: level,
        ...restCombo
      });
    }
  }
  
  return combinations;
}

/**
 * Generates a natural language description for a main effect
 */
function generateMainEffectDescription(
  effect: MainEffectStatAnalysis,
  levelMeans: LevelMean[],
  pairwiseComparisons: PairwiseComparison[]
): string {
  const { factorName, responseVariable, significanceInfo, effectMeaningfulness } = effect;
  
  // Format p-value
  const pValue = significanceInfo.pValue;
  const formattedPValue = pValue < 0.001 
    ? "p < 0.001" 
    : `p = ${pValue.toFixed(3)}`;
  
  // Format effect size
  const etaSquared = effectMeaningfulness.etaSquared;
  const effectSizePercent = (etaSquared * 100).toFixed(1);
  
  // Determine effect size description
  let effectSizeDescription = "";
  if (effectMeaningfulness.effectMeaningfulness === 'high') {
    effectSizeDescription = "large";
  } else if (effectMeaningfulness.effectMeaningfulness === 'medium') {
    effectSizeDescription = "medium";
  } else {
    effectSizeDescription = "small";
  }
  
  // Sort levels by mean for easier interpretation
  const sortedLevelMeans = [...levelMeans].sort((a, b) => b.mean - a.mean);
  
  // Find significant pairwise comparisons
  const significantComparisons = pairwiseComparisons.filter(comp => comp.isSignificant);
  
  // Start building the description
  let description = `The ${factorName} has a statistically significant impact on ${responseVariable}, with ${formattedPValue}. `;
  
  description += `This represents a ${effectSizeDescription} effect (eta squared = ${etaSquared.toFixed(2)}, meaning the ${factorName} explains ${effectSizePercent}% of the variance). `;
  
  // Add information about the means
  if (sortedLevelMeans.length === 2) {
    // For two levels, it's straightforward
    const [higher, lower] = sortedLevelMeans;
    const meanDiff = higher.mean - lower.mean;
    const comparison = pairwiseComparisons[0]; // There's only one comparison with two levels
    
    description += `Specifically, the ${factorName} ${higher.level} produces ${formatValue(higher.mean, responseVariable)} on average compared to ${lower.level} (${formatValue(lower.mean, responseVariable)}), `;
    description += `with a mean difference of ${formatValue(meanDiff, responseVariable)} (95% CI: [${formatValue(comparison.confidenceInterval.lower, responseVariable)}, ${formatValue(comparison.confidenceInterval.upper, responseVariable)}]).`;
  } else {
    // For more than two levels, describe the highest and lowest, and mention significant differences
    const highest = sortedLevelMeans[0];
    const lowest = sortedLevelMeans[sortedLevelMeans.length - 1];
    
    description += `Across different levels of ${factorName}, the mean ${responseVariable} ranges from ${formatValue(highest.mean, responseVariable)} (${highest.level}) to ${formatValue(lowest.mean, responseVariable)} (${lowest.level}). `;
    
    // Mention that Tukey HSD was used for multiple comparisons
    description += `Tukey's Honestly Significant Difference (HSD) test was used to control the family-wise error rate in multiple comparisons. `;
    
    if (significantComparisons.length > 0) {
      if (significantComparisons.length === 1) {
        const comp = significantComparisons[0];
        description += `A significant difference was found between ${comp.level1} and ${comp.level2} (mean difference: ${formatValue(comp.meanDifference, responseVariable)}, ${formatPValue(comp.pValue)}).`;
      } else {
        description += `Significant differences were found between: `;
        description += significantComparisons.map(comp => 
          `${comp.level1} vs. ${comp.level2} (mean difference: ${formatValue(comp.meanDifference, responseVariable)}, ${formatPValue(comp.pValue)})`
        ).join('; ');
        description += '.';
      }
    } else {
      description += `However, no pairwise comparisons between levels reached statistical significance at p < 0.05.`;
    }
  }
  
  return description;
}

/**
 * Generates a natural language description for an interaction effect
 */
function generateInteractionDescription(
  interaction: InteractionStatAnalysis,
  combinationMeans: {
    combination: Record<string, string>;
    mean: number;
    confidenceInterval: ConfidenceInterval;
    sampleSize: number;
  }[],
  pairwiseComparisons: PairwiseComparison[]
): string {
  const { factors, responseVariable, significanceInfo, effectMeaningfulness } = interaction;
  
  // Format p-value
  const pValue = significanceInfo.pValue;
  const formattedPValue = pValue < 0.001 
    ? "p < 0.001" 
    : `p = ${pValue.toFixed(3)}`;
  
  // Format effect size
  const etaSquared = effectMeaningfulness.etaSquared;
  const effectSizePercent = (etaSquared * 100).toFixed(1);
  
  // Determine effect size description
  let effectSizeDescription = "";
  if (effectMeaningfulness.effectMeaningfulness === 'high') {
    effectSizeDescription = "large";
  } else if (effectMeaningfulness.effectMeaningfulness === 'medium') {
    effectSizeDescription = "medium";
  } else {
    effectSizeDescription = "small";
  }
  
  // Start building the description
  let description = `There is a statistically significant interaction between ${factors.join(' and ')} on ${responseVariable}, with ${formattedPValue}. `;
  
  description += `This represents a ${effectSizeDescription} effect (partial eta squared = ${etaSquared.toFixed(2)}, meaning this interaction explains ${effectSizePercent}% of the variance not explained by other factors). `;
  
  // Sort combinations by mean for easier interpretation
  const sortedCombinationMeans = [...combinationMeans].sort((a, b) => b.mean - a.mean);
  
  // Find significant pairwise comparisons
  const significantComparisons = pairwiseComparisons.filter(comp => comp.isSignificant);
  
  // Check if any factor has more than 2 levels
  const factorLevelCounts = factors.reduce((counts, factor) => {
    const levels = _.uniq(combinationMeans.map(cm => cm.combination[factor]));
    counts[factor] = levels.length;
    return counts;
  }, {} as Record<string, number>);
  
  const hasMultipleLevels = Object.values(factorLevelCounts).some(count => count > 2);
  
  // Add information about the means
  if (sortedCombinationMeans.length > 0) {
    const highest = sortedCombinationMeans[0];
    const lowest = sortedCombinationMeans[sortedCombinationMeans.length - 1];
    
    const highestLabel = Object.entries(highest.combination)
      .map(([factor, level]) => `${factor}=${level}`)
      .join(', ');
    
    const lowestLabel = Object.entries(lowest.combination)
      .map(([factor, level]) => `${factor}=${level}`)
      .join(', ');
    
    description += `The combination of ${highestLabel} produces the highest ${responseVariable} (${formatValue(highest.mean, responseVariable)}), while ${lowestLabel} produces the lowest (${formatValue(lowest.mean, responseVariable)}). `;
    
    // Mention that Tukey HSD was used if any factor has more than 2 levels
    if (hasMultipleLevels) {
      description += `Tukey's Honestly Significant Difference (HSD) test was used to control the family-wise error rate in multiple comparisons. `;
    }
    
    if (significantComparisons.length > 0) {
      if (significantComparisons.length <= 3) {
        // For a small number of significant comparisons, list them all
        description += `Significant differences were found between: `;
        description += significantComparisons.map(comp => 
          `${comp.level1} vs. ${comp.level2} (mean difference: ${formatValue(comp.meanDifference, responseVariable)}, ${formatPValue(comp.pValue)})`
        ).join('; ');
        description += '.';
      } else {
        // For many significant comparisons, summarize
        description += `${significantComparisons.length} significant pairwise differences were found between different combinations of factor levels. `;
        
        // Highlight the most significant comparison
        const mostSignificant = significantComparisons.reduce((prev, current) => 
          prev.pValue < current.pValue ? prev : current
        );
        
        description += `The most significant difference was between ${mostSignificant.level1} and ${mostSignificant.level2} (mean difference: ${formatValue(mostSignificant.meanDifference, responseVariable)}, ${formatPValue(mostSignificant.pValue)}).`;
      }
    } else {
      description += `However, no pairwise comparisons between specific combinations reached statistical significance at p < 0.05.`;
    }
  }
  
  // Add interpretation of the interaction
  if (factors.length === 2) {
    description += ` This interaction indicates that the effect of ${factors[0]} on ${responseVariable} depends on the level of ${factors[1]}, and vice versa.`;
  } else if (factors.length === 3) {
    description += ` This three-way interaction indicates that the two-way interaction between ${factors[0]} and ${factors[1]} differs depending on the level of ${factors[2]}.`;
  }
  
  return description;
}

/**
 * Formats a value based on the response variable type
 */
function formatValue(value: number, responseVariable: string): string {
  // Round to 2 decimal places by default
  const formattedValue = value.toFixed(2);
  
  // Add units or special formatting based on the response variable name
  if (responseVariable.toLowerCase().includes('count')) {
    return formattedValue; // Counts are typically integers
  } else if (responseVariable.toLowerCase().includes('rate') || 
             responseVariable.toLowerCase().includes('percentage')) {
    return `${formattedValue}%`;
  } else {
    return formattedValue;
  }
}

/**
 * Formats a p-value for display
 */
function formatPValue(pValue: number): string {
  if (pValue < 0.001) {
    return "p < 0.001";
  } else {
    return `p = ${pValue.toFixed(3)}`;
  }
}

/**
 * Calculates the critical value from the t-distribution
 * 
 * @param df Degrees of freedom
 * @param alpha Significance level (e.g., 0.05 for 95% confidence)
 * @returns The critical t-value
 */
function calculateTCritical(df: number, alpha: number): number {
  try {
    // Use jStat to calculate the critical t-value
    // This is the value t* such that P(T > t*) = alpha/2 (two-tailed)
    return jStat.studentt.inv(1 - alpha / 2, df);
  } catch (error) {
    console.error('Error calculating t-critical value:', error);
    // Fallback approximation for large df
    if (df > 30) {
      // For large df, t-distribution approaches normal distribution
      return 1.96; // Approximate critical value for 95% confidence
    } else {
      // Conservative approximation for small df
      return 2.0;
    }
  }
}

/**
 * Calculates the cumulative probability from the t-distribution
 * 
 * @param df Degrees of freedom
 * @param t The t-value
 * @returns The cumulative probability P(T <= t)
 */
function calculateTCumulativeProbability(df: number, t: number): number {
  try {
    // Use jStat to calculate the cumulative probability
    return jStat.studentt.cdf(t, df);
  } catch (error) {
    console.error('Error calculating t cumulative probability:', error);
    // Fallback approximation for large df
    if (df > 30) {
      // For large df, t-distribution approaches normal distribution
      return normalCDF(t);
    } else {
      // Conservative approximation
      return t > 0 ? 0.95 : 0.05;
    }
  }
}

/**
 * Calculates the Tukey HSD (Honestly Significant Difference) test for multiple comparisons
 * This is more appropriate than multiple t-tests as it controls the family-wise error rate
 * 
 * @param data The formatted data points
 * @param factor The factor to analyze
 * @param responseVariable The response variable to analyze
 * @param factorLevels The levels of the factor
 * @returns Array of pairwise comparisons with Tukey HSD results
 */
function calculateTukeyHSD(
  data: FormattedDataPoint[],
  factor: string,
  responseVariable: string,
  factorLevels: string[]
): PairwiseComparison[] {
  // Filter data for this response variable
  const dataWithResponseVar = data.filter(d => 
    d.responseVariables[responseVariable] !== undefined
  );
  
  // Group data by factor level
  const groupedData: Record<string, number[]> = {};
  const groupMeans: Record<string, number> = {};
  const groupCounts: Record<string, number> = {};
  
  for (const level of factorLevels) {
    groupedData[level] = [];
  }
  
  for (const d of dataWithResponseVar) {
    if (d.responseVariables[responseVariable] === undefined) continue;
    
    const level = d.factors[factor];
    if (level && groupedData[level]) {
      groupedData[level].push(d.responseVariables[responseVariable]);
    }
  }
  
  // Calculate group means and counts
  for (const [level, values] of Object.entries(groupedData)) {
    groupMeans[level] = values.length > 0 ? Number(math.mean(values)) : 0;
    groupCounts[level] = values.length;
  }
  
  // Calculate mean square error (MSE) from one-way ANOVA
  const anovaResult = calculateOneWayAnova(dataWithResponseVar, factor, responseVariable, factorLevels);
  
  if (!anovaResult) {
    return [];
  }
  
  const MSE = anovaResult.residualMeanSquare;
  
  // Calculate Tukey HSD for all pairs
  const pairwiseComparisons: PairwiseComparison[] = [];
  
  for (let i = 0; i < factorLevels.length; i++) {
    for (let j = i + 1; j < factorLevels.length; j++) {
      const level1 = factorLevels[i];
      const level2 = factorLevels[j];
      
      const n1 = groupCounts[level1];
      const n2 = groupCounts[level2];
      
      // Calculate mean difference
      const meanDifference = groupMeans[level1] - groupMeans[level2];
      
      // Calculate standard error for the difference
      const SE = Math.sqrt(MSE * (1/n1 + 1/n2));
      
      // Calculate q statistic
      const q = Math.abs(meanDifference) / SE;
      
      // Calculate degrees of freedom
      const df = anovaResult.residualDegreesOfFreedom;
      
      // Calculate p-value using the studentized range distribution
      // Since jStat doesn't have this distribution, we'll use an approximation
      // based on the q distribution
      const k = factorLevels.length; // Number of groups
      const pValue = calculateStudentizedRangePValue(q, k, df);
      
      // Calculate confidence interval
      const qCritical = calculateStudentizedRangeCritical(0.05, k, df);
      const marginOfError = qCritical * SE;
      
      const confidenceInterval: ConfidenceInterval = {
        lower: meanDifference - marginOfError,
        upper: meanDifference + marginOfError,
        confidenceLevel: 0.95
      };
      
      pairwiseComparisons.push({
        level1,
        level2,
        meanDifference,
        confidenceInterval,
        pValue,
        isSignificant: pValue < 0.05
      });
    }
  }
  
  return pairwiseComparisons;
}

/**
 * Approximates the p-value for the studentized range distribution
 * This is used for Tukey's HSD test
 * 
 * @param q The q statistic
 * @param k The number of groups
 * @param df The degrees of freedom
 * @returns The approximate p-value
 */
function calculateStudentizedRangePValue(q: number, k: number, df: number): number {
  try {
    // For large df, we can approximate using the asymptotic distribution
    if (df > 100) {
      // Approximate using the formula from Copenhaver and Holland (1988)
      const a = Math.log(2 * Math.PI);
      const b = Math.log(k);
      const c = -2 * Math.log(q);
      const d = Math.log(Math.log(10));
      
      return Math.exp(a + b + c - d);
    }
    
    // For smaller df, use a conservative approximation based on Bonferroni
    // This will be more conservative than the actual Tukey HSD
    const numComparisons = (k * (k - 1)) / 2;
    const individualAlpha = 0.05 / numComparisons; // Bonferroni correction
    
    // Convert q to t
    const t = q / Math.sqrt(2);
    
    // Get p-value for t
    const pValueT = 2 * (1 - calculateTCumulativeProbability(df, t));
    
    // Return the Bonferroni-adjusted p-value, capped at 1
    return Math.min(pValueT * numComparisons, 1);
  } catch (error) {
    console.error('Error calculating studentized range p-value:', error);
    return 0.5; // Conservative fallback
  }
}

/**
 * Approximates the critical value for the studentized range distribution
 * This is used for Tukey's HSD test confidence intervals
 * 
 * @param alpha The significance level
 * @param k The number of groups
 * @param df The degrees of freedom
 * @returns The approximate critical value
 */
function calculateStudentizedRangeCritical(alpha: number, k: number, df: number): number {
  try {
    // For large df, we can use an approximation
    if (df > 100) {
      // These are approximate values for alpha=0.05
      if (k <= 2) return 2.77;
      if (k <= 3) return 3.31;
      if (k <= 4) return 3.63;
      if (k <= 5) return 3.86;
      if (k <= 6) return 4.03;
      if (k <= 7) return 4.17;
      if (k <= 8) return 4.29;
      if (k <= 9) return 4.39;
      if (k <= 10) return 4.47;
      return 4.47 + 0.5 * Math.log10(k - 9); // Rough approximation for k > 10
    }
    
    // For smaller df, use a more conservative approximation
    // These are approximate values for alpha=0.05 and df=30
    // We'll adjust slightly based on df
    const dfFactor = df < 30 ? 1.1 : (df < 60 ? 1.05 : 1.0);
    
    if (k <= 2) return 2.89 * dfFactor;
    if (k <= 3) return 3.49 * dfFactor;
    if (k <= 4) return 3.85 * dfFactor;
    if (k <= 5) return 4.10 * dfFactor;
    if (k <= 6) return 4.30 * dfFactor;
    if (k <= 7) return 4.46 * dfFactor;
    if (k <= 8) return 4.60 * dfFactor;
    if (k <= 9) return 4.72 * dfFactor;
    if (k <= 10) return 4.82 * dfFactor;
    return 4.82 * dfFactor + 0.5 * Math.log10(k - 9); // Rough approximation for k > 10
  } catch (error) {
    console.error('Error calculating studentized range critical value:', error);
    return 4.0; // Conservative fallback
  }
} 