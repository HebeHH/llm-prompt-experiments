import { StatAnalysis } from './statistics';

/**
 * Predefined report styles
 */
export type ReportStyle = 'academic' | 'blog' | 'custom';

/**
 * Configuration for the report generation
 */
export interface ReportConfig {
  title: string;
  authorName: string;
  style: ReportStyle;
  customStylePrompt?: string;
  motivation: string;
  dataAnalysisFocus: {
    includeMainEffects: string[];
    includeInteractions: string[];
    discussInsignificantResults: boolean;
  };
  audience: string;
  keyFindings: string;
  recommendations: string;
  nextSteps: string;
}

/**
 * Subsection of a report outline
 */
export interface ReportSubsection {
  title: string;
  description: string;
}

/**
 * Section of a report outline
 */
export interface ReportSection {
  title: string;
  description: string;
  subsections: ReportSubsection[];
}

/**
 * Complete outline of a report
 */
export interface ReportOutline {
  title: string;
  authorName: string;
  sections: ReportSection[];
}

/**
 * Background data for the report generation
 */
export interface ReportBackgroundData {
  style: string;
  experimentDescription: string;
  experimentConfig: string;
  motivation: string;
  audience: string;
  keyFindings: string;
  recommendations: string;
  nextSteps: string;
  statisticalData: string;
}

/**
 * Graph image specification
 */
export interface GraphImageSpec {
  graphType: string;
  xAxis?: string;
  yAxis?: string;
  colorAxis?: string;
  title: string;
  fileName: string;
  caption: string;
  description?: string;
}

/**
 * Builder object for the report
 */
export interface ReportBuilder {
  outline: ReportOutline | null;
  sections: Record<string, string>;
  graphImages: Record<string, string>;
}

/**
 * Final compiled report
 */
export interface CompiledReport {
  title: string;
  authorName: string;
  markdown: string;
  images: Record<string, string>;
} 