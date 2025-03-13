import React, { useState } from 'react';
import { ReportOutline, ReportSection, ReportSubsection } from '@/lib/types/report';

interface OutlineConfirmationStepProps {
  reportOutline: ReportOutline;
  onComplete: (confirmedOutline: ReportOutline) => void;
}

const OutlineConfirmationStep: React.FC<OutlineConfirmationStepProps> = ({
  reportOutline,
  onComplete
}) => {
  const [outline, setOutline] = useState<ReportOutline>({...reportOutline});
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
    onComplete(outline);
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Confirm Report Outline</h3>
        <p className="mt-1 text-sm text-gray-500">
          Review and edit the generated outline before proceeding. You can add, remove, or reorder sections and subsections.
        </p>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        {/* Report Title */}
        <div className="mb-6">
          {editingTitle ? (
            <div className="flex items-center">
              <input
                type="text"
                value={outline.title}
                onChange={handleTitleChange}
                className="shadow-sm focus:ring-violet-500 focus:border-violet-500 block w-full sm:text-sm border-gray-300 rounded-md"
              />
              <button
                onClick={() => setEditingTitle(false)}
                className="ml-2 inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-white bg-violet-600 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex items-center">
              <h2 className="text-xl font-bold text-gray-900">{outline.title}</h2>
              <button
                onClick={() => setEditingTitle(true)}
                className="ml-2 text-gray-400 hover:text-gray-500"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </div>
          )}
        </div>
        
        {/* Author Name */}
        <div className="mb-6">
          {editingAuthor ? (
            <div className="flex items-center">
              <input
                type="text"
                value={outline.authorName}
                onChange={handleAuthorChange}
                className="shadow-sm focus:ring-violet-500 focus:border-violet-500 block w-full sm:text-sm border-gray-300 rounded-md"
              />
              <button
                onClick={() => setEditingAuthor(false)}
                className="ml-2 inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-white bg-violet-600 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex items-center">
              <p className="text-sm text-gray-500">By {outline.authorName}</p>
              <button
                onClick={() => setEditingAuthor(true)}
                className="ml-2 text-gray-400 hover:text-gray-500"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </div>
          )}
        </div>
        
        {/* Sections */}
        <div className="space-y-6">
          {outline.sections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="border border-gray-200 rounded-md p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1">
                  <input
                    type="text"
                    value={section.title}
                    onChange={(e) => handleSectionTitleChange(sectionIndex, e.target.value)}
                    className="block w-full text-lg font-medium text-gray-900 border-0 border-b border-transparent focus:border-violet-500 focus:ring-0"
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleMoveSectionUp(sectionIndex)}
                    disabled={sectionIndex === 0}
                    className={`p-1 rounded-full ${sectionIndex === 0 ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-100'}`}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleMoveSectionDown(sectionIndex)}
                    disabled={sectionIndex === outline.sections.length - 1}
                    className={`p-1 rounded-full ${sectionIndex === outline.sections.length - 1 ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-100'}`}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteSection(sectionIndex)}
                    className="p-1 rounded-full text-red-500 hover:bg-red-50"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="mb-4">
                <textarea
                  value={section.description}
                  onChange={(e) => handleSectionDescriptionChange(sectionIndex, e.target.value)}
                  rows={2}
                  className="shadow-sm focus:ring-violet-500 focus:border-violet-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
              
              {/* Subsections */}
              <div className="space-y-3 ml-4">
                {section.subsections.map((subsection, subsectionIndex) => (
                  <div key={subsectionIndex} className="border-l-2 border-violet-100 pl-4 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={subsection.title}
                          onChange={(e) => handleSubsectionTitleChange(sectionIndex, subsectionIndex, e.target.value)}
                          className="block w-full text-sm font-medium text-gray-700 border-0 border-b border-transparent focus:border-violet-500 focus:ring-0"
                        />
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleMoveSubsectionUp(sectionIndex, subsectionIndex)}
                          disabled={subsectionIndex === 0}
                          className={`p-1 rounded-full ${subsectionIndex === 0 ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-100'}`}
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleMoveSubsectionDown(sectionIndex, subsectionIndex)}
                          disabled={subsectionIndex === section.subsections.length - 1}
                          className={`p-1 rounded-full ${subsectionIndex === section.subsections.length - 1 ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-100'}`}
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteSubsection(sectionIndex, subsectionIndex)}
                          className="p-1 rounded-full text-red-500 hover:bg-red-50"
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <textarea
                        value={subsection.description}
                        onChange={(e) => handleSubsectionDescriptionChange(sectionIndex, subsectionIndex, e.target.value)}
                        rows={2}
                        className="shadow-sm focus:ring-violet-500 focus:border-violet-500 block w-full sm:text-xs border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                ))}
                
                <div className="mt-2">
                  <button
                    onClick={() => handleAddSubsection(sectionIndex)}
                    className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500"
                  >
                    <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Subsection
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          <div className="mt-4">
            <button
              onClick={handleAddSection}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500"
            >
              <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Section
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-violet-600 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500"
        >
          Confirm Outline
        </button>
      </div>
    </div>
  );
};

export default OutlineConfirmationStep; 