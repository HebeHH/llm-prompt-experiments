export type SignificanceInfo = {
    sumOfSquares: number;
    degreesOfFreedom: number;
    meanSquare: number;
    fValue: number;
    pValue: number;
}

export type EffectMeaningfulness = {
    /**
     * The effect size value - can be either eta squared (for main effects) 
     * or partial eta squared (for interactions)
     */
    etaSquared: number;
    
    /**
     * Qualitative interpretation of the effect size
     */
    effectMeaningfulness: 'high' | 'medium' | 'low';
}

/**
 * Represents a confidence interval for a mean
 */
export type ConfidenceInterval = {
    lower: number;
    upper: number;
    confidenceLevel: number; // e.g., 0.95 for 95% confidence
}

/**
 * Represents the mean for a specific level of a factor
 */
export type LevelMean = {
    level: string;
    mean: number;
    confidenceInterval: ConfidenceInterval;
    sampleSize: number;
}

/**
 * Represents a pairwise comparison between two levels
 */
export type PairwiseComparison = {
    level1: string;
    level2: string;
    meanDifference: number;
    confidenceInterval: ConfidenceInterval;
    pValue: number;
    isSignificant: boolean;
}

/**
 * Enhanced information for main effects with means and comparisons
 */
export type MainEffectEnhancedInfo = {
    levelMeans: LevelMean[];
    pairwiseComparisons: PairwiseComparison[];
    naturalLanguageDescription: string;
}

/**
 * Enhanced information for interaction effects with means and comparisons
 */
export type InteractionEnhancedInfo = {
    combinationMeans: {
        combination: Record<string, string>;
        mean: number;
        confidenceInterval: ConfidenceInterval;
        sampleSize: number;
    }[];
    pairwiseComparisons: PairwiseComparison[];
    naturalLanguageDescription: string;
}

export type MainEffectStatAnalysis = {
    factorName: string;
    numWays: 1;
    responseVariable: string;
    responseDataType: 'numerical';
    hasSignificantRelationship: boolean;
    significanceInfo: SignificanceInfo;
    effectMeaningfulness: EffectMeaningfulness;
    enhancedInfo?: MainEffectEnhancedInfo; // Optional enhanced information for significant effects
}

export type Residual = {
    responseVariable: string;
    degreesOfFreedom: number;
    sumOfSquares: number;
    meanSquares: number;
}

export type InteractionStatAnalysis = {
    factors: string[];
    numWays: 2 | 3;
    responseVariable: string;
    responseDataType: 'numerical';
    hasSignificantRelationship: boolean;
    significanceInfo: SignificanceInfo;
    effectMeaningfulness: EffectMeaningfulness;
    enhancedInfo?: InteractionEnhancedInfo; // Optional enhanced information for significant effects
}

export type StatAnalysis = {
    mainEffects: MainEffectStatAnalysis[];
    interactions: InteractionStatAnalysis[];
    residuals: Residual[];
}