import React from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';

const WarningModal = ({ 
  open, 
  onClose, 
  message, 
  title = 'Warning', 
  onConfirm = null,
  confirmText = 'OK',
  showCancel = false,
  onCancel = null,
  cancelText = 'Cancel'
}) => {
  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{title}</h3>
          <p className="text-gray-700 dark:text-gray-300">{message}</p>
          
          <div className="mt-6 flex justify-end space-x-3">
            {showCancel && (
              <Button 
                variant="outline" 
                onClick={handleCancel}
                className="px-4 py-2 text-sm"
              >
                {cancelText}
              </Button>
            )}
            <Button 
              variant="primary" 
              onClick={handleConfirm}
              className="px-4 py-2 text-sm"
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarningModal;