import React, { useState, useEffect } from 'react';
import { ReportBuilder, ReportConfig, ReportOutline, CompiledReport } from '@/lib/types/report';
import { createTableOfContents, createReportHeader, embedImagesInMarkdown, formatSectionId } from '@/lib/report/reportUtils';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import ReactMarkdown from 'react-markdown';
import { getApiKeys } from '@/lib/utils/apiKeyManager';

interface ReportCompilationStepProps {
  reportBuilder: ReportBuilder;
  reportConfig: ReportConfig;
  onError?: (error: string) => void;
  readOnly?: boolean;
}

const ReportCompilationStep: React.FC<ReportCompilationStepProps> = ({
  reportBuilder,
  reportConfig,
  onError,
  readOnly = false
}) => {
  const [compiledReport, setCompiledReport] = useState<CompiledReport | null>(null);
  const [isCompiling, setIsCompiling] = useState(true);
  const [activeTab, setActiveTab] = useState<'preview' | 'markdown'>('preview');
  
  useEffect(() => {
    if (!readOnly) {
      compileReport();
    }
  }, [readOnly]);
  
  const compileReport = async () => {
    setIsCompiling(true);
    
    try {
      if (!reportBuilder.outline) {
        throw new Error('Report outline is missing');
      }
      
      // Get the API keys from our centralized manager
      const apiKeys = getApiKeys();
      // Use OpenAI as the default LLM model
      const llmModel = apiKeys.openai ? 'GPT-4' : 'Unknown LLM';
      
      // Create the header
      const header = createReportHeader(
        reportBuilder.outline.title,
        reportBuilder.outline.authorName,
        llmModel
      );
      
      // Create the table of contents
      const tableOfContents = createTableOfContents(reportBuilder.outline);
      
      // Combine all sections in the correct order
      let markdownContent = header + tableOfContents + '\n\n';
      
      // Add each section and its subsections
      reportBuilder.outline.sections.forEach(section => {
        const sectionId = formatSectionId(section.title);
        const sectionContent = reportBuilder.sections[section.title] || '';
        
        // Add section content
        markdownContent += `\n\n<a id="${sectionId}"></a>\n\n${sectionContent}\n\n`;
        
        // Add subsection content
        section.subsections.forEach(subsection => {
          const subsectionId = formatSectionId(subsection.title);
          const subsectionContent = reportBuilder.sections[subsection.title] || '';
          
          markdownContent += `\n\n<a id="${subsectionId}"></a>\n\n${subsectionContent}\n\n`;
        });
      });
      
      // Embed images in the markdown
      const finalMarkdown = embedImagesInMarkdown(markdownContent, reportBuilder.graphImages);
      
      // Create the compiled report
      const report: CompiledReport = {
        title: reportBuilder.outline.title,
        authorName: reportBuilder.outline.authorName,
        markdown: finalMarkdown,
        images: reportBuilder.graphImages
      };
      
      setCompiledReport(report);
    } catch (error) {
      console.error('Error compiling report:', error);
      onError?.(`Error compiling report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCompiling(false);
    }
  };
  
  const handleDownloadMarkdown = () => {
    if (!compiledReport) return;
    
    const blob = new Blob([compiledReport.markdown], { type: 'text/markdown;charset=utf-8' });
    saveAs(blob, `${compiledReport.title.replace(/\s+/g, '-').toLowerCase()}.md`);
  };
  
  const handleDownloadPDF = () => {
    // This is a placeholder for PDF generation
    // In a real implementation, you would use a library like jsPDF or a server-side solution
    alert('PDF download functionality would be implemented here');
  };
  
  const handleDownloadZip = async () => {
    if (!compiledReport) return;
    
    const zip = new JSZip();
    
    // Add the markdown file
    zip.file(`${compiledReport.title.replace(/\s+/g, '-').toLowerCase()}.md`, compiledReport.markdown);
    
    // Add the images
    const imagesFolder = zip.folder('images');
    if (imagesFolder) {
      Object.entries(compiledReport.images).forEach(([fileName, dataUrl]) => {
        // Convert data URL to blob
        const base64Data = dataUrl.split(',')[1];
        if (base64Data) {
          const binaryData = atob(base64Data);
          const array = new Uint8Array(binaryData.length);
          for (let i = 0; i < binaryData.length; i++) {
            array[i] = binaryData.charCodeAt(i);
          }
          imagesFolder.file(fileName, array);
        }
      });
    }
    
    // Generate the zip file
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `${compiledReport.title.replace(/\s+/g, '-').toLowerCase()}-report.zip`);
  };
  
  const handleSaveReportBuilder = () => {
    if (!reportBuilder) return;
    
    const json = JSON.stringify(reportBuilder);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    saveAs(blob, `${reportBuilder.outline?.title.replace(/\s+/g, '-').toLowerCase() || 'report'}-builder.json`);
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Final Report</h3>
        <p className="mt-1 text-sm text-gray-500">
          {readOnly 
            ? "Viewing the final compiled report."
            : "Your report has been compiled and is ready for download."}
        </p>
      </div>
      
      {isCompiling ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-500"></div>
        </div>
      ) : compiledReport ? (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`py-4 px-6 text-sm font-medium ${
                    activeTab === 'preview'
                      ? 'border-b-2 border-violet-500 text-violet-600'
                      : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Preview
                </button>
                <button
                  onClick={() => setActiveTab('markdown')}
                  className={`py-4 px-6 text-sm font-medium ${
                    activeTab === 'markdown'
                      ? 'border-b-2 border-violet-500 text-violet-600'
                      : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Markdown
                </button>
              </nav>
            </div>
            
            <div className="p-6">
              {activeTab === 'preview' ? (
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown>
                    {compiledReport.markdown}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-md">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-auto max-h-96">
                    {compiledReport.markdown}
                  </pre>
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="text-md font-medium text-gray-900 mb-4">Download Options</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={handleDownloadMarkdown}
                className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500"
              >
                <svg className="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Markdown File
              </button>
              
              <button
                onClick={handleDownloadZip}
                className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500"
              >
                <svg className="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                ZIP Archive
              </button>
              
              <button
                onClick={handleDownloadPDF}
                className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500"
              >
                <svg className="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                PDF Document
              </button>
              
              <button
                onClick={handleSaveReportBuilder}
                className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500"
              >
                <svg className="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Save Report Data
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error compiling report</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>There was an error compiling the report. Please try again.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportCompilationStep; 