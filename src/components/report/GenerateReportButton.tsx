import React from 'react';
import { useRouter } from 'next/navigation';
import { AnalysisData } from '@/lib/types/analysis';
import { StatAnalysis } from '@/lib/types/statistics';

interface GenerateReportButtonProps {
  analysisData: AnalysisData;
  statResults: StatAnalysis;
  className?: string;
}

const GenerateReportButton: React.FC<GenerateReportButtonProps> = ({
  analysisData,
  statResults,
  className = ''
}) => {
  const router = useRouter();

  const handleGenerateReport = () => {
    console.log("Generating report with stats:", statResults);
    
    // Store the analysis data and stat results in localStorage
    localStorage.setItem('reportAnalysisData', JSON.stringify(analysisData));
    localStorage.setItem('reportStatResults', JSON.stringify(statResults));
    
    // Navigate to the report page
    router.push('/report');
  };

  return (
    <button
      onClick={handleGenerateReport}
      className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-violet-600 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 ${className}`}
    >
      <svg 
        className="mr-2 h-5 w-5" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
        />
      </svg>
      Generate Report
    </button>
  );
};

export default GenerateReportButton; 