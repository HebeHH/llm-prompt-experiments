

export type SignificanceInfo = {
    sumOfSquares: number;
    degreesOfFreedom: number;
    meanSquare: number;
    fValue: number;
    pValue: number;
}

export type EffectMeaningfulness = {
    etaSquared: number;
    effectMeaningfulness: 'high' | 'medium' | 'low';
}

export type MainEffectStatAnalysis = {
    factorName: string;
    numWays: 1;
    responseVariable: string;
    responseDataType: 'numerical';
    hasSignificantRelationship: boolean;
    significanceInfo: SignificanceInfo;
    effectMeaningfulness: EffectMeaningfulness;
}

export type Residual = {
    degreesOfFreedom: number;
    sumOfSquares: number;
    meanSquares: number;
}

export type InteractionStatAnalysis = {
    factors: string[];
    numWays: 2 | 3;
    responseVariable: string;
    responseDataType:  'numerical';
    hasSignificantRelationship: boolean;
    significanceInfo: SignificanceInfo;
    effectMeaningfulness: EffectMeaningfulness;
}

export type StatAnalysis = {
    mainEffects: MainEffectStatAnalysis[];
    interactions: InteractionStatAnalysis[];
    residuals: Residual[];
}