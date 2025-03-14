import React, { useState, useEffect, useRef } from 'react';
import { ReportBuilder, ReportConfig, ReportOutline, CompiledReport } from '@/lib/types/report';
import { createTableOfContents, createReportHeader, embedImagesInMarkdown, formatSectionId } from '@/lib/report/reportUtils';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import ReactMarkdown from 'react-markdown';
import { getApiKeys } from '@/lib/utils/apiKeyManager';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const reportContentRef = useRef<HTMLDivElement>(null);
  
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
  
  const handleDownloadPDF = async () => {
    if (!compiledReport || !reportContentRef.current) return;
    
    try {
      setIsPdfGenerating(true);
      
      // Create a temporary div to render the report content
      const tempDiv = document.createElement('div');
      tempDiv.className = 'pdf-export';
      tempDiv.style.width = '800px';
      tempDiv.style.padding = '40px';
      tempDiv.style.backgroundColor = 'white';
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '-9999px';
      
      // Clone the report content
      const contentClone = reportContentRef.current.cloneNode(true) as HTMLElement;
      
      // Append to body temporarily
      tempDiv.appendChild(contentClone);
      document.body.appendChild(tempDiv);
      
      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Calculate the number of pages needed
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Capture the content as canvas
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        logging: false
      });
      
      // Convert canvas to image
      const imgData = canvas.toDataURL('image/png');
      
      // Calculate the number of pages
      const imgHeight = canvas.height * 210 / canvas.width;
      const pageCount = Math.ceil(imgHeight / pageHeight);
      
      // Add each page to the PDF
      for (let i = 0; i < pageCount; i++) {
        if (i > 0) {
          pdf.addPage();
        }
        
        // Calculate the slice of the image to use for this page
        const sourceY = i * pageHeight * canvas.height / imgHeight;
        const sliceHeight = Math.min(canvas.height - sourceY, pageHeight * canvas.height / imgHeight);
        
        pdf.addImage({
          imageData: imgData,
          format: 'PNG',
          x: 0,
          y: 0,
          width: 210,
          height: sliceHeight * 210 / canvas.width,
          alias: undefined,
          compression: 'FAST',
          rotation: 0
        });
      }
      
      // Save the PDF
      pdf.save(`${compiledReport.title.replace(/\s+/g, '-').toLowerCase()}.pdf`);
      
      // Clean up
      document.body.removeChild(tempDiv);
    } catch (error) {
      console.error('Error generating PDF:', error);
      onError?.(`Error generating PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsPdfGenerating(false);
    }
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
            ? "View the final compiled report."
            : "Your report has been compiled. You can preview it below and download it in various formats."}
        </p>
      </div>
      
      {isCompiling ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-500"></div>
        </div>
      ) : compiledReport ? (
        <>
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex">
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`${
                    activeTab === 'preview'
                      ? 'border-violet-500 text-violet-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm`}
                >
                  Preview
                </button>
                <button
                  onClick={() => setActiveTab('markdown')}
                  className={`${
                    activeTab === 'markdown'
                      ? 'border-violet-500 text-violet-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm`}
                >
                  Markdown
                </button>
              </nav>
            </div>
            
            <div className="p-6">
              {activeTab === 'preview' ? (
                <div 
                  ref={reportContentRef}
                  className="prose prose-violet max-w-none"
                >
                  <ReactMarkdown>
                    {compiledReport.markdown}
                  </ReactMarkdown>
                </div>
              ) : (
                <pre className="bg-gray-50 p-4 rounded overflow-auto text-sm text-gray-800 h-[600px]">
                  {compiledReport.markdown}
                </pre>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleDownloadMarkdown}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500"
            >
              <svg className="-ml-1 mr-2 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Download Markdown
            </button>
            
            <button
              onClick={handleDownloadPDF}
              disabled={isPdfGenerating}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500"
            >
              {isPdfGenerating ? (
                <>
                  <div className="animate-spin -ml-1 mr-2 h-5 w-5 text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  Generating PDF...
                </>
              ) : (
                <>
                  <svg className="-ml-1 mr-2 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Download PDF
                </>
              )}
            </button>
            
            <button
              onClick={handleDownloadZip}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500"
            >
              <svg className="-ml-1 mr-2 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Download ZIP
            </button>
            
            <button
              onClick={handleSaveReportBuilder}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500"
            >
              <svg className="-ml-1 mr-2 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Save Report Builder
            </button>
          </div>
        </>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
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