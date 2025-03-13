import React, { useState } from 'react';
import { ReportOutline, ReportSection, ReportSubsection } from '@/lib/types/report';

interface OutlineConfirmationStepProps {
  reportOutline: ReportOutline;
  onComplete?: (outline: ReportOutline) => void;
  readOnly?: boolean;
}

const OutlineConfirmationStep: React.FC<OutlineConfirmationStepProps> = ({
  reportOutline,
  onComplete,
  readOnly = false
}) => {
  const [outline, setOutline] = useState<ReportOutline>(reportOutline);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingAuthor, setEditingAuthor] = useState(false);
  
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOutline(prev => ({
      ...prev,
      title: e.target.value
    }));
  };
  
  const handleAuthorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOutline(prev => ({
      ...prev,
      authorName: e.target.value
    }));
  };
  
  const handleSectionTitleChange = (index: number, value: string) => {
    setOutline(prev => {
      const newSections = [...prev.sections];
      newSections[index] = {
        ...newSections[index],
        title: value
      };
      return {
        ...prev,
        sections: newSections
      };
    });
  };
  
  const handleSectionDescriptionChange = (index: number, value: string) => {
    setOutline(prev => {
      const newSections = [...prev.sections];
      newSections[index] = {
        ...newSections[index],
        description: value
      };
      return {
        ...prev,
        sections: newSections
      };
    });
  };
  
  const handleSubsectionTitleChange = (sectionIndex: number, subsectionIndex: number, value: string) => {
    setOutline(prev => {
      const newSections = [...prev.sections];
      const newSubsections = [...newSections[sectionIndex].subsections];
      newSubsections[subsectionIndex] = {
        ...newSubsections[subsectionIndex],
        title: value
      };
      newSections[sectionIndex] = {
        ...newSections[sectionIndex],
        subsections: newSubsections
      };
      return {
        ...prev,
        sections: newSections
      };
    });
  };
  
  const handleSubsectionDescriptionChange = (sectionIndex: number, subsectionIndex: number, value: string) => {
    setOutline(prev => {
      const newSections = [...prev.sections];
      const newSubsections = [...newSections[sectionIndex].subsections];
      newSubsections[subsectionIndex] = {
        ...newSubsections[subsectionIndex],
        description: value
      };
      newSections[sectionIndex] = {
        ...newSections[sectionIndex],
        subsections: newSubsections
      };
      return {
        ...prev,
        sections: newSections
      };
    });
  };
  
  const handleAddSection = () => {
    setOutline(prev => {
      const newSection: ReportSection = {
        title: 'New Section',
        description: 'Description of the new section',
        subsections: []
      };
      return {
        ...prev,
        sections: [...prev.sections, newSection]
      };
    });
  };
  
  const handleAddSubsection = (sectionIndex: number) => {
    setOutline(prev => {
      const newSections = [...prev.sections];
      const newSubsection: ReportSubsection = {
        title: 'New Subsection',
        description: 'Description of the new subsection'
      };
      newSections[sectionIndex] = {
        ...newSections[sectionIndex],
        subsections: [...newSections[sectionIndex].subsections, newSubsection]
      };
      return {
        ...prev,
        sections: newSections
      };
    });
  };
  
  const handleDeleteSection = (index: number) => {
    setOutline(prev => {
      const newSections = [...prev.sections];
      newSections.splice(index, 1);
      return {
        ...prev,
        sections: newSections
      };
    });
  };
  
  const handleDeleteSubsection = (sectionIndex: number, subsectionIndex: number) => {
    setOutline(prev => {
      const newSections = [...prev.sections];
      const newSubsections = [...newSections[sectionIndex].subsections];
      newSubsections.splice(subsectionIndex, 1);
      newSections[sectionIndex] = {
        ...newSections[sectionIndex],
        subsections: newSubsections
      };
      return {
        ...prev,
        sections: newSections
      };
    });
  };
  
  const handleMoveSectionUp = (index: number) => {
    if (index === 0) return;
    
    setOutline(prev => {
      const newSections = [...prev.sections];
      const temp = newSections[index];
      newSections[index] = newSections[index - 1];
      newSections[index - 1] = temp;
      return {
        ...prev,
        sections: newSections
      };
    });
  };
  
  const handleMoveSectionDown = (index: number) => {
    if (index === outline.sections.length - 1) return;
    
    setOutline(prev => {
      const newSections = [...prev.sections];
      const temp = newSections[index];
      newSections[index] = newSections[index + 1];
      newSections[index + 1] = temp;
      return {
        ...prev,
        sections: newSections
      };
    });
  };
  
  const handleMoveSubsectionUp = (sectionIndex: number, subsectionIndex: number) => {
    if (subsectionIndex === 0) return;
    
    setOutline(prev => {
      const newSections = [...prev.sections];
      const newSubsections = [...newSections[sectionIndex].subsections];
      const temp = newSubsections[subsectionIndex];
      newSubsections[subsectionIndex] = newSubsections[subsectionIndex - 1];
      newSubsections[subsectionIndex - 1] = temp;
      newSections[sectionIndex] = {
        ...newSections[sectionIndex],
        subsections: newSubsections
      };
      return {
        ...prev,
        sections: newSections
      };
    });
  };
  
  const handleMoveSubsectionDown = (sectionIndex: number, subsectionIndex: number) => {
    if (subsectionIndex === outline.sections[sectionIndex].subsections.length - 1) return;
    
    setOutline(prev => {
      const newSections = [...prev.sections];
      const newSubsections = [...newSections[sectionIndex].subsections];
      const temp = newSubsections[subsectionIndex];
      newSubsections[subsectionIndex] = newSubsections[subsectionIndex + 1];
      newSubsections[subsectionIndex + 1] = temp;
      newSections[sectionIndex] = {
        ...newSections[sectionIndex],
        subsections: newSubsections
      };
      return {
        ...prev,
        sections: newSections
      };
    });
  };
  
  const handleSubmit = () => {
    onComplete?.(outline);
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Confirm Report Outline</h3>
        <p className="mt-1 text-sm text-gray-500">
          {readOnly 
            ? "Viewing the confirmed report outline."
            : "Review and edit the outline before proceeding to the next step."}
        </p>
      </div>
      
      <div className="bg-white border border-gray-200 rounded-md p-4">
        <div className="mb-4">
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Report Title
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={outline.title}
            onChange={handleTitleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500 sm:text-sm"
            disabled={readOnly}
          />
        </div>
        
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900">Sections</h4>
          
          {outline.sections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="border border-gray-200 rounded-md p-3">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <input
                    type="text"
                    value={section.title}
                    onChange={(e) => handleSectionTitleChange(sectionIndex, e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500 sm:text-sm"
                    disabled={readOnly}
                  />
                </div>
                {!readOnly && (
                  <div className="ml-2 flex space-x-1">
                    <button
                      type="button"
                      onClick={() => handleMoveSectionUp(sectionIndex)}
                      disabled={sectionIndex === 0}
                      className="p-1 text-gray-400 hover:text-gray-500"
                    >
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveSectionDown(sectionIndex)}
                      disabled={sectionIndex === outline.sections.length - 1}
                      className="p-1 text-gray-400 hover:text-gray-500"
                    >
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSection(sectionIndex)}
                      className="p-1 text-red-400 hover:text-red-500"
                    >
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              
              <div className="mb-3">
                <textarea
                  value={section.description}
                  onChange={(e) => handleSectionDescriptionChange(sectionIndex, e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500 sm:text-sm"
                  rows={2}
                  disabled={readOnly}
                />
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h5 className="text-sm font-medium text-gray-700">Subsections</h5>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => handleAddSubsection(sectionIndex)}
                      className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-violet-700 bg-violet-100 hover:bg-violet-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500"
                    >
                      Add Subsection
                    </button>
                  )}
                </div>
                
                {section.subsections.map((subsection, subsectionIndex) => (
                  <div key={subsectionIndex} className="border border-gray-100 rounded-md p-2 bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={subsection.title}
                          onChange={(e) => handleSubsectionTitleChange(sectionIndex, subsectionIndex, e.target.value)}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500 sm:text-sm"
                          disabled={readOnly}
                        />
                      </div>
                      {!readOnly && (
                        <div className="ml-2 flex space-x-1">
                          <button
                            type="button"
                            onClick={() => handleMoveSubsectionUp(sectionIndex, subsectionIndex)}
                            disabled={subsectionIndex === 0}
                            className="p-1 text-gray-400 hover:text-gray-500"
                          >
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveSubsectionDown(sectionIndex, subsectionIndex)}
                            disabled={subsectionIndex === section.subsections.length - 1}
                            className="p-1 text-gray-400 hover:text-gray-500"
                          >
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSubsection(sectionIndex, subsectionIndex)}
                            className="p-1 text-red-400 hover:text-red-500"
                          >
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <textarea
                      value={subsection.description}
                      onChange={(e) => handleSubsectionDescriptionChange(sectionIndex, subsectionIndex, e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500 sm:text-sm"
                      rows={2}
                      disabled={readOnly}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        {!readOnly && (
          <div className="mt-4">
            <button
              type="button"
              onClick={handleAddSection}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-violet-700 bg-violet-100 hover:bg-violet-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500"
            >
              Add Section
            </button>
          </div>
        )}
      </div>
      
      {!readOnly && (
        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-violet-600 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500"
          >
            Continue to Next Step
          </button>
        </div>
      )}
    </div>
  );
};

export default OutlineConfirmationStep; 