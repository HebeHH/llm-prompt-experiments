import React, { useState } from 'react';
import { AnalysisData } from '@/lib/types/analysis';
import { 
    StatAnalysis, 
    MainEffectStatAnalysis, 
    InteractionStatAnalysis, 
    Residual,
    PairwiseComparison,
    LevelMean
} from '@/lib/types/statistics';
import { performStatisticalAnalysis } from '@/lib/analysis/statistics';

interface StatisticalInfoProps {
    data: AnalysisData;
}

// Component for displaying a single pairwise comparison
const PairwiseComparisonRow: React.FC<{ comparison: PairwiseComparison }> = ({ comparison }) => {
    return (
        <tr className={comparison.isSignificant ? "bg-teal-50" : ""}>
            <td className="px-4 py-2 border text-sm">{comparison.level1}</td>
            <td className="px-4 py-2 border text-sm">{comparison.level2}</td>
            <td className="px-4 py-2 border text-right text-sm">{comparison.meanDifference.toFixed(4)}</td>
            <td className="px-4 py-2 border text-right text-sm">
                [{comparison.confidenceInterval.lower.toFixed(4)}, {comparison.confidenceInterval.upper.toFixed(4)}]
            </td>
            <td className="px-4 py-2 border text-right text-sm">
                {comparison.pValue < 0.001 ? "<0.001" : comparison.pValue.toFixed(4)}
            </td>
            <td className="px-4 py-2 border text-center text-sm">
                {comparison.isSignificant ? "Yes" : "No"}
            </td>
        </tr>
    );
};

// Component for displaying level means
const LevelMeanRow: React.FC<{ levelMean: LevelMean }> = ({ levelMean }) => {
    return (
        <tr>
            <td className="px-4 py-2 border text-sm">{levelMean.level}</td>
            <td className="px-4 py-2 border text-right text-sm">{levelMean.mean.toFixed(4)}</td>
            <td className="px-4 py-2 border text-right text-sm">
                [{levelMean.confidenceInterval.lower.toFixed(4)}, {levelMean.confidenceInterval.upper.toFixed(4)}]
            </td>
            <td className="px-4 py-2 border text-right text-sm">{levelMean.sampleSize}</td>
        </tr>
    );
};

// Component for displaying combination means for interactions
const CombinationMeanRow: React.FC<{ 
    combination: Record<string, string>; 
    mean: number; 
    confidenceInterval: { lower: number; upper: number; confidenceLevel: number };
    sampleSize: number;
}> = ({ combination, mean, confidenceInterval, sampleSize }) => {
    const combinationLabel = Object.entries(combination)
        .map(([factor, level]) => `${factor}=${level}`)
        .join(', ');
        
    return (
        <tr>
            <td className="px-4 py-2 border text-sm">{combinationLabel}</td>
            <td className="px-4 py-2 border text-right text-sm">{mean.toFixed(4)}</td>
            <td className="px-4 py-2 border text-right text-sm">
                [{confidenceInterval.lower.toFixed(4)}, {confidenceInterval.upper.toFixed(4)}]
            </td>
            <td className="px-4 py-2 border text-right text-sm">{sampleSize}</td>
        </tr>
    );
};

// Component for displaying all enhanced info for significant effects
const SignificantEffectsDetails: React.FC<{ 
    analysis: StatAnalysis;
    isOpen: boolean;
}> = ({ analysis, isOpen }) => {
    // Filter significant effects
    const significantMainEffects = analysis.mainEffects.filter(effect => effect.hasSignificantRelationship);
    const significantInteractions = analysis.interactions.filter(interaction => interaction.hasSignificantRelationship);
    
    // Combine all significant effects
    const allSignificantEffects = [
        ...significantMainEffects.map(effect => ({ type: 'main' as const, effect })),
        ...significantInteractions.map(interaction => ({ type: 'interaction' as const, effect: interaction }))
    ];
    
    if (allSignificantEffects.length === 0) {
        return (
            <div className={`p-4 ${isOpen ? 'block' : 'hidden'}`}>
                <p className="text-gray-500 italic">No statistically significant effects found.</p>
            </div>
        );
    }
    
    return (
        <div className={`p-4 ${isOpen ? 'block' : 'hidden'}`}>
            {allSignificantEffects.map((item, index) => {
                // Set the first effect to be open by default
                const shouldBeOpenByDefault = index === 0;
                
                if (item.type === 'main') {
                    return (
                        <MainEffectEnhancedInfoWithDefaultState 
                            key={`main-${index}`} 
                            effect={item.effect as MainEffectStatAnalysis}
                            defaultOpen={shouldBeOpenByDefault}
                        />
                    );
                } else {
                    return (
                        <InteractionEnhancedInfoWithDefaultState 
                            key={`interaction-${index}`} 
                            interaction={item.effect as InteractionStatAnalysis}
                            defaultOpen={shouldBeOpenByDefault}
                        />
                    );
                }
            })}
        </div>
    );
};

// Component for displaying enhanced info for a main effect with default state
const MainEffectEnhancedInfoWithDefaultState: React.FC<{ 
    effect: MainEffectStatAnalysis;
    defaultOpen: boolean;
}> = ({ effect, defaultOpen }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    
    if (!effect.enhancedInfo) return null;
    
    return (
        <div className="mb-4 border border-teal-600 rounded-lg overflow-hidden bg-white">
            <div 
                className="flex justify-between items-center p-4 bg-teal-600 cursor-pointer"
                onClick={() => setIsOpen(!isOpen)}
            >
                <h4 className="font-medium text-violet-50">
                    Main Effect: <span className="font-bold">{effect.factorName}</span> on {effect.responseVariable}
                </h4>
                <div className="flex items-center space-x-4 text-white">
                    <div className="text-sm">
                        <span className="font-medium text-violet-100">p-value:</span> {effect.significanceInfo.pValue < 0.001 ? "<0.001" : effect.significanceInfo.pValue.toFixed(4)}
                        <span className="mx-2">|</span>
                        <span className="font-medium text-violet-100">η²:</span> {effect.effectMeaningfulness.etaSquared.toFixed(4)}
                    </div>
                    <span className="text-gray-200 transform transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                        ▼
                    </span>
                </div>
            </div>
            
            {isOpen && (
                <div className="p-4">
                    <p className="mb-4 text-gray-700 text-sm">{effect.enhancedInfo.naturalLanguageDescription}</p>
                    
                    <h5 className="font-medium text-violet-800 mb-2">Level Means</h5>
                    <div className="overflow-x-auto mb-4">
                        <table className="min-w-full border-collapse">
                            <thead className="bg-violet-100">
                                <tr>
                                    <th className="px-4 py-2 border text-left text-sm">Level</th>
                                    <th className="px-4 py-2 border text-right text-sm">Mean</th>
                                    <th className="px-4 py-2 border text-right text-sm">95% CI</th>
                                    <th className="px-4 py-2 border text-right text-sm">Sample Size</th>
                                </tr>
                            </thead>
                            <tbody>
                                {effect.enhancedInfo.levelMeans.map((levelMean, index) => (
                                    <LevelMeanRow key={index} levelMean={levelMean} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    <h5 className="font-medium text-violet-800 mb-2">Pairwise Comparisons</h5>
                    <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse">
                            <thead className="bg-violet-100">
                                <tr>
                                    <th className="px-4 py-2 border text-left text-sm">Level 1</th>
                                    <th className="px-4 py-2 border text-left text-sm">Level 2</th>
                                    <th className="px-4 py-2 border text-right text-sm">Mean Difference</th>
                                    <th className="px-4 py-2 border text-right text-sm">95% CI</th>
                                    <th className="px-4 py-2 border text-right text-sm">p-value</th>
                                    <th className="px-4 py-2 border text-center text-sm">Significant</th>
                                </tr>
                            </thead>
                            <tbody>
                                {effect.enhancedInfo.pairwiseComparisons.map((comparison, index) => (
                                    <PairwiseComparisonRow key={index} comparison={comparison} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

// Component for displaying enhanced info for an interaction effect with default state
const InteractionEnhancedInfoWithDefaultState: React.FC<{ 
    interaction: InteractionStatAnalysis;
    defaultOpen: boolean;
}> = ({ interaction, defaultOpen }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    
    if (!interaction.enhancedInfo) return null;
    
    return (
        <div className="mb-4 border border-teal-600 rounded-lg overflow-hidden bg-white">
            <div 
                 className="flex justify-between items-center p-4 bg-teal-600 cursor-pointer"
                onClick={() => setIsOpen(!isOpen)}
            >
                <h4 className="font-medium text-violet-50">
                    {interaction.numWays}-Way Interaction: <span className="font-bold">{interaction.factors.join(' × ')}</span> on {interaction.responseVariable}
                </h4>
                <div className="flex items-center space-x-4 text-white">
                    <div className="text-sm">
                        <span className="font-medium text-violet-100">p-value:</span> {interaction.significanceInfo.pValue < 0.001 ? "<0.001" : interaction.significanceInfo.pValue.toFixed(4)}
                        <span className="mx-2">|</span>
                        <span className="font-medium text-violet-100">partial η²:</span> {interaction.effectMeaningfulness.etaSquared.toFixed(4)}
                    </div>
                    <span className="text-gray-200 transform transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                        ▼
                    </span>
                </div>
            </div>
            
            {isOpen && (
                <div className="p-4">
                    <p className="mb-4 text-gray-700 text-sm">{interaction.enhancedInfo.naturalLanguageDescription}</p>
                    
                    <h5 className="font-medium text-violet-800 mb-2">Combination Means</h5>
                    <div className="overflow-x-auto mb-4">
                        <table className="min-w-full border-collapse">
                            <thead className="bg-violet-100">
                                <tr>
                                    <th className="px-4 py-2 border text-left text-sm">Combination</th>
                                    <th className="px-4 py-2 border text-right text-sm">Mean</th>
                                    <th className="px-4 py-2 border text-right text-sm">95% CI</th>
                                    <th className="px-4 py-2 border text-right text-sm">Sample Size</th>
                                </tr>
                            </thead>
                            <tbody>
                                {interaction.enhancedInfo.combinationMeans.map((combo, index) => (
                                    <CombinationMeanRow 
                                        key={index} 
                                        combination={combo.combination} 
                                        mean={combo.mean} 
                                        confidenceInterval={combo.confidenceInterval}
                                        sampleSize={combo.sampleSize}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    <h5 className="font-medium text-violet-800 mb-2">Pairwise Comparisons</h5>
                    <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse">
                            <thead className="bg-violet-100">
                                <tr>
                                    <th className="px-4 py-2 border text-left text-sm">Combination 1</th>
                                    <th className="px-4 py-2 border text-left text-sm">Combination 2</th>
                                    <th className="px-4 py-2 border text-right text-sm">Mean Difference</th>
                                    <th className="px-4 py-2 border text-right text-sm">95% CI</th>
                                    <th className="px-4 py-2 border text-right text-sm">p-value</th>
                                    <th className="px-4 py-2 border text-center text-sm">Significant</th>
                                </tr>
                            </thead>
                            <tbody>
                                {interaction.enhancedInfo.pairwiseComparisons.map((comparison, index) => (
                                    <PairwiseComparisonRow key={index} comparison={comparison} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

// Main component for displaying statistical information
export const StatisticalInfo: React.FC<StatisticalInfoProps> = ({ data }) => {
    // Perform statistical analysis
    const analysis = performStatisticalAnalysis(data);
    
    // Get counts of significant effects
    const significantMainEffectsCount = analysis.mainEffects.filter(effect => effect.hasSignificantRelationship).length;
    const significantInteractionsCount = analysis.interactions.filter(interaction => interaction.hasSignificantRelationship).length;
    const totalSignificantEffects = significantMainEffectsCount + significantInteractionsCount;
    
    // Auto-expand the significant effects section if there are any significant effects
    const [showSignificantEffects, setShowSignificantEffects] = useState(totalSignificantEffects > 0);
    
    // Helper function to get background color based on significance
    const getSignificanceRowClass = (isSignificant: boolean) => {
        return isSignificant ? "bg-teal-50" : "";
    };
    
    // Helper function to get effect meaningfulness color
    const getEffectMeaningfulnessClass = (meaningfulness: 'high' | 'medium' | 'low') => {
        switch (meaningfulness) {
            case 'high':
                return "bg-teal-100";
            case 'medium':
                return "bg-violet-100";
            case 'low':
                return "bg-gray-100";
            default:
                return "";
        }
    };
    
    return (
        <div className="bg-white rounded-xl shadow-xl overflow-hidden mb-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-teal-200 bg-teal-100">
                <h2 className="text-xl font-semibold text-teal-900">Statistical Analysis</h2>
            </div>
            
            <div className="p-6 space-y-6">
                {/* Main Effects Table */}
                <div>
                    <h3 className="text-lg font-semibold text-teal-900 mb-3">Main Effects</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse">
                            <thead className="bg-violet-100">
                                <tr>
                                    <th className="px-4 py-2 border text-left text-sm">Factor</th>
                                    <th className="px-4 py-2 border text-left text-sm">Response Variable</th>
                                    <th className="px-4 py-2 border text-center text-sm">Significant</th>
                                    <th className="px-4 py-2 border text-right text-sm">p-value</th>
                                    <th className="px-4 py-2 border text-right text-sm">F-value</th>
                                    <th className="px-4 py-2 border text-right text-sm">η²</th>
                                    <th className="px-4 py-2 border text-center text-sm">Effect Size</th>
                                </tr>
                            </thead>
                            <tbody>
                                {analysis.mainEffects.map((effect, index) => (
                                    <tr key={index} className={getSignificanceRowClass(effect.hasSignificantRelationship)}>
                                        <td className="px-4 py-2 border text-sm">{effect.factorName}</td>
                                        <td className="px-4 py-2 border text-sm">{effect.responseVariable}</td>
                                        <td className="px-4 py-2 border text-center text-sm">
                                            {effect.hasSignificantRelationship ? "Yes" : "No"}
                                        </td>
                                        <td className="px-4 py-2 border text-right text-sm">
                                            {effect.significanceInfo.pValue < 0.001 ? "<0.001" : effect.significanceInfo.pValue.toFixed(4)}
                                        </td>
                                        <td className="px-4 py-2 border text-right text-sm">{effect.significanceInfo.fValue.toFixed(2)}</td>
                                        <td className="px-4 py-2 border text-right text-sm">{effect.effectMeaningfulness.etaSquared.toFixed(4)}</td>
                                        <td className={`px-4 py-2 border text-center text-sm ${getEffectMeaningfulnessClass(effect.effectMeaningfulness.effectMeaningfulness)}`}>
                                            {effect.effectMeaningfulness.effectMeaningfulness}
                                        </td>
                                    </tr>
                                ))}
                                {analysis.mainEffects.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-2 border text-center text-sm text-gray-500 italic">No main effects analyzed</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                {/* Interactions Table */}
                <div>
                    <h3 className="text-lg font-semibold text-teal-900 mb-3">Interactions</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse">
                            <thead className="bg-violet-100">
                                <tr>
                                    <th className="px-4 py-2 border text-left text-sm">Factors</th>
                                    <th className="px-4 py-2 border text-left text-sm">Response Variable</th>
                                    <th className="px-4 py-2 border text-center text-sm">Significant</th>
                                    <th className="px-4 py-2 border text-right text-sm">p-value</th>
                                    <th className="px-4 py-2 border text-right text-sm">F-value</th>
                                    <th className="px-4 py-2 border text-right text-sm">partial η²</th>
                                    <th className="px-4 py-2 border text-center text-sm">Effect Size</th>
                                </tr>
                            </thead>
                            <tbody>
                                {analysis.interactions.map((interaction, index) => (
                                    <tr key={index} className={getSignificanceRowClass(interaction.hasSignificantRelationship)}>
                                        <td className="px-4 py-2 border text-sm">{interaction.factors.join(' × ')}</td>
                                        <td className="px-4 py-2 border text-sm">{interaction.responseVariable}</td>
                                        <td className="px-4 py-2 border text-center text-sm">
                                            {interaction.hasSignificantRelationship ? "Yes" : "No"}
                                        </td>
                                        <td className="px-4 py-2 border text-right text-sm">
                                            {interaction.significanceInfo.pValue < 0.001 ? "<0.001" : interaction.significanceInfo.pValue.toFixed(4)}
                                        </td>
                                        <td className="px-4 py-2 border text-right text-sm">{interaction.significanceInfo.fValue.toFixed(2)}</td>
                                        <td className="px-4 py-2 border text-right text-sm">{interaction.effectMeaningfulness.etaSquared.toFixed(4)}</td>
                                        <td className={`px-4 py-2 border text-center text-sm ${getEffectMeaningfulnessClass(interaction.effectMeaningfulness.effectMeaningfulness)}`}>
                                            {interaction.effectMeaningfulness.effectMeaningfulness}
                                        </td>
                                    </tr>
                                ))}
                                {analysis.interactions.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-2 border text-center text-sm text-gray-500 italic">No interactions analyzed</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                {/* Residuals Table */}
                <div>
                    <h3 className="text-lg font-semibold text-teal-900 mb-3">Residuals</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse">
                            <thead className="bg-violet-100">
                                <tr>
                                    <th className="px-4 py-2 border text-left text-sm">Response Variable</th>
                                    <th className="px-4 py-2 border text-right text-sm">Degrees of Freedom</th>
                                    <th className="px-4 py-2 border text-right text-sm">Sum of Squares</th>
                                    <th className="px-4 py-2 border text-right text-sm">Mean Squares</th>
                                </tr>
                            </thead>
                            <tbody>
                                {analysis.residuals.map((residual, index) => (
                                    <tr key={index}>
                                        <td className="px-4 py-2 border text-left text-sm">{residual.responseVariable}</td>
                                        <td className="px-4 py-2 border text-right text-sm">{residual.degreesOfFreedom}</td>
                                        <td className="px-4 py-2 border text-right text-sm">{residual.sumOfSquares.toFixed(4)}</td>
                                        <td className="px-4 py-2 border text-right text-sm">{residual.meanSquares.toFixed(4)}</td>
                                    </tr>
                                ))}
                                {analysis.residuals.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-2 border text-center text-sm text-gray-500 italic">No residuals calculated</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                {/* Significant Effects Details */}
                <div className="border rounded-lg overflow-hidden">
                    <div 
                        className="flex justify-between items-center p-4 bg-violet-100 cursor-pointer"
                        onClick={() => setShowSignificantEffects(!showSignificantEffects)}
                    >
                        <h3 className="text-lg font-semibold text-violet-900">
                            Statistically Significant Effects ({totalSignificantEffects})
                        </h3>
                        <div className="flex items-center space-x-2">
                            <div className="text-sm text-violet-700">
                                {significantMainEffectsCount} main effects, {significantInteractionsCount} interactions
                            </div>
                            <span className="text-gray-500 transform transition-transform duration-200" style={{ transform: showSignificantEffects ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                                ▼
                            </span>
                        </div>
                    </div>
                    
                    <SignificantEffectsDetails 
                        analysis={analysis}
                        isOpen={showSignificantEffects}
                    />
                </div>
            </div>
        </div>
    );
}; 