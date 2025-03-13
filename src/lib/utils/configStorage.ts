import { AnalysisConfig, ResponseVariable, AnalysisData } from '@/lib/types/analysis';
import { resultAttributes } from '@/lib/constants/resultAttributes';
import { LLMProvider } from '@/lib/types/llm';
import { StatResult } from '@/lib/types/statistics';
import { getApiKeys, saveApiKeysToStorage } from './apiKeyManager';

// Check if code is running in browser environment
const isBrowser = typeof window !== 'undefined';

export type ExtendedProvider = LLMProvider | 'jigsaw';

// Default prompt function to use when restoring from localStorage
export const defaultPromptFunction = (promptFactors: string[], variable: string) => {
    return `${promptFactors.join("\n")}\n${variable}`;
};

// Type for saved configuration with metadata
export interface SavedConfiguration {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    config: Omit<AnalysisConfig, 'promptFunction' | 'responseVariables'> & {
        responseVariables: Omit<ResponseVariable, 'function'>[];
    };
}

// Type for saved results with metadata
export interface SavedResults {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    results: AnalysisData;
    stats?: Record<string, StatResult[]>;
}

// Type for the list of saved configurations
export interface SavedConfigurations {
    lastConfig: SavedConfiguration | null;
    savedConfigs: SavedConfiguration[];
}

// Type for the list of saved results
export interface SavedResultsList {
    lastResults: SavedResults | null;
    savedResults: SavedResults[];
}

// Create a function to restore response variable functions
export const restoreResponseVariableFunctions = (variables: Omit<ResponseVariable, 'function'>[]): ResponseVariable[] => {
    return variables.map(variable => {
        // Find the matching variable in resultAttributes
        const matchingAttribute = resultAttributes.find(attr => attr.name === variable.name);
        if (matchingAttribute) {
            // Restore the function from the matching attribute
            return {
                ...variable,
                function: matchingAttribute.function,
                requiresApiCall: matchingAttribute.requiresApiCall
            };
        }
        // This should not happen but provide a default function if needed
        return {
            ...variable,
            function: (response: string) => response,
            requiresApiCall: false
        };
    });
};

// Type for serialized response variable (without function)
export type SerializedResponseVariable = Omit<ResponseVariable, 'function'> & { function?: undefined };

// Type for serialized config (without functions)
export type SerializedConfig = Omit<AnalysisConfig, 'promptFunction' | 'responseVariables'> & {
    promptFunction?: undefined;
    responseVariables: SerializedResponseVariable[];
};

// Function to prepare config for storage by removing non-serializable parts
export const prepareConfigForStorage = (config: AnalysisConfig): SerializedConfig => {
    return {
        ...config,
        // Remove functions as they can't be properly serialized
        promptFunction: undefined,
        responseVariables: config.responseVariables.map(variable => ({
            ...variable,
            function: undefined
        }))
    };
};

// Function to restore config from storage by adding back functions
export const restoreConfigFromStorage = (savedConfig: SerializedConfig): AnalysisConfig => {
    return {
        ...savedConfig,
        promptFunction: defaultPromptFunction,
        responseVariables: restoreResponseVariableFunctions(savedConfig.responseVariables || [])
    };
};

// Save current config to localStorage
export const saveCurrentConfig = (config: AnalysisConfig): void => {
    if (!isBrowser) return;
    
    const serializedConfig = prepareConfigForStorage(config);
    localStorage.setItem('currentConfig', JSON.stringify(serializedConfig));
};

// Load current config from localStorage
export const loadCurrentConfig = (): AnalysisConfig | null => {
    if (!isBrowser) return null;
    
    try {
        const savedConfig = localStorage.getItem('currentConfig');
        if (!savedConfig) return null;
        
        const parsedConfig = JSON.parse(savedConfig) as SerializedConfig;
        return restoreConfigFromStorage(parsedConfig);
    } catch (error) {
        console.error('Error loading current config:', error);
        return null;
    }
};

// Save API keys to localStorage
export const saveApiKeys = (keys: Record<ExtendedProvider, string>): void => {
    if (!isBrowser) return;
    saveApiKeysToStorage(keys);
};

// Load API keys from localStorage
export const loadApiKeys = (): Record<ExtendedProvider, string> => {
    if (!isBrowser) return {} as Record<ExtendedProvider, string>;
    return getApiKeys();
};

// Save a named configuration to localStorage
export const saveNamedConfig = (config: AnalysisConfig): void => {
    if (!isBrowser) return;
    
    const configId = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const configForStorage = prepareConfigForStorage(config);
    
    const newSavedConfig: SavedConfiguration = {
        id: configId,
        name: config.name || 'Unnamed Configuration',
        createdAt: now,
        updatedAt: now,
        config: configForStorage
    };
    
    // Get existing saved configurations
    const existingConfigs = localStorage.getItem('savedConfigurations');
    let savedConfigs: SavedConfigurations = { lastConfig: null, savedConfigs: [] };
    
    if (existingConfigs) {
        try {
            savedConfigs = JSON.parse(existingConfigs);
        } catch (e) {
            console.error("Error parsing saved configurations:", e);
        }
    }
    
    // Add new configuration
    savedConfigs.savedConfigs.push(newSavedConfig);
    savedConfigs.lastConfig = newSavedConfig;
    
    // Save back to localStorage
    localStorage.setItem('savedConfigurations', JSON.stringify(savedConfigs));
};

// Load saved configurations from localStorage
export const loadSavedConfigs = (): SavedConfiguration[] => {
    if (!isBrowser) return [];
    
    const savedConfigs = localStorage.getItem('savedConfigurations');
    if (!savedConfigs) return [];
    
    try {
        const parsed: SavedConfigurations = JSON.parse(savedConfigs);
        return parsed.savedConfigs;
    } catch (e) {
        console.error("Error parsing saved configurations:", e);
        return [];
    }
};

// Load a specific configuration by ID
export const loadConfigById = (configId: string): AnalysisConfig | null => {
    if (!isBrowser) return null;
    
    const savedConfigs = loadSavedConfigs();
    const foundConfig = savedConfigs.find(config => config.id === configId);
    
    if (!foundConfig) return null;
    
    return restoreConfigFromStorage(foundConfig.config as SerializedConfig);
};

// Delete a configuration by ID
export const deleteConfig = (configId: string): void => {
    if (!isBrowser) return;
    
    const savedConfigs = localStorage.getItem('savedConfigurations');
    if (!savedConfigs) return;
    
    try {
        const parsed: SavedConfigurations = JSON.parse(savedConfigs);
        
        // Filter out the configuration to delete
        parsed.savedConfigs = parsed.savedConfigs.filter(config => config.id !== configId);
        
        // If lastConfig was the deleted one, set to null
        if (parsed.lastConfig && parsed.lastConfig.id === configId) {
            parsed.lastConfig = null;
        }
        
        // Save back to localStorage
        localStorage.setItem('savedConfigurations', JSON.stringify(parsed));
    } catch (e) {
        console.error("Error parsing saved configurations:", e);
    }
};

// Functions for handling analysis results

// Save results to localStorage
export const saveResults = (data: AnalysisData, stats?: Record<string, StatResult[]>): void => {
    if (!isBrowser) return;
    
    const resultsId = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const newSavedResults: SavedResults = {
        id: resultsId,
        name: data.config.name || 'Unnamed Results',
        createdAt: now,
        updatedAt: now,
        results: data,
        stats
    };
    
    // Get existing saved results
    const existingResults = localStorage.getItem('savedResults');
    let savedResults: SavedResultsList = { lastResults: null, savedResults: [] };
    
    if (existingResults) {
        try {
            savedResults = JSON.parse(existingResults);
        } catch (e) {
            console.error("Error parsing saved results:", e);
        }
    }
    
    // Add new results
    savedResults.savedResults.push(newSavedResults);
    savedResults.lastResults = newSavedResults;
    
    // Save back to localStorage
    localStorage.setItem('savedResults', JSON.stringify(savedResults));
};

// Load saved results from localStorage
export const loadSavedResults = (): SavedResults[] => {
    if (!isBrowser) return [];
    
    const savedResults = localStorage.getItem('savedResults');
    if (!savedResults) return [];
    
    try {
        const parsed: SavedResultsList = JSON.parse(savedResults);
        return parsed.savedResults;
    } catch (e) {
        console.error("Error parsing saved results:", e);
        return [];
    }
};

// Load a specific result by ID
export const loadResultById = (resultId: string): { results: AnalysisData, stats?: Record<string, StatResult[]> } | null => {
    if (!isBrowser) return null;
    
    const savedResults = loadSavedResults();
    const foundResult = savedResults.find(result => result.id === resultId);
    
    if (!foundResult) return null;
    
    return { 
        results: foundResult.results,
        stats: foundResult.stats
    };
};

// Delete a result by ID
export const deleteResult = (resultId: string): void => {
    if (!isBrowser) return;
    
    const savedResults = localStorage.getItem('savedResults');
    if (!savedResults) return;
    
    try {
        const parsed: SavedResultsList = JSON.parse(savedResults);
        
        // Filter out the result to delete
        parsed.savedResults = parsed.savedResults.filter(result => result.id !== resultId);
        
        // If lastResults was the deleted one, set to null
        if (parsed.lastResults && parsed.lastResults.id === resultId) {
            parsed.lastResults = null;
        }
        
        // Save back to localStorage
        localStorage.setItem('savedResults', JSON.stringify(parsed));
    } catch (e) {
        console.error("Error parsing saved results:", e);
    }
};