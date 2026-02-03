import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';

const FullscreenModal = ({ isOpen, onClose, children }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-gray-900">
      {/* Header with close button */}
      <div className="flex justify-end p-4 border-b border-gray-200 dark:border-gray-700">
        <button
          type="button"
          className="text-gray-400 hover:text-gray-500 focus:outline-none"
          onClick={onClose}
        >
          <span className="sr-only">Close</span>
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {/* Content */}
      <div className="flex-grow overflow-auto p-4">
        {children}
      </div>
    </div>,
    document.body
  );
};

export default FullscreenModal;