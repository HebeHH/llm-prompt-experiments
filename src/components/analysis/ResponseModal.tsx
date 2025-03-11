import React from 'react';

interface ResponseModalProps {
  response: string;
  onClose: () => void;
}

export const ResponseModal: React.FC<ResponseModalProps> = ({ response, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Response</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <span className="sr-only">Close panel</span>
            ×
          </button>
        </div>
        <div className="overflow-y-auto flex-grow whitespace-pre-wrap text-gray-700 font-mono text-sm bg-gray-50 p-4 rounded">
          {response}
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-violet-500 text-white rounded hover:bg-violet-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}; 