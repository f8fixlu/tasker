import React from 'react';
import { useAuth } from '../context/AuthContext';

const SessionExpiryWarning = () => {
  const {
    showTokenWarning,
    tokenWarningMessage,
    continueSession,
    endSession,
    dismissTokenWarning
  } = useAuth();

  const handleContinueSession = async () => {
    const result = await continueSession();
    if (result.success) {
      dismissTokenWarning();
    }
  };

  const handleEndSession = () => {
    endSession();
  };

  const handleClose = () => {
    dismissTokenWarning();
  };

  if (!showTokenWarning) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-96 max-w-[90%]">
        <div className="flex justify-between items-center border-b p-4">
          <h2 className="text-lg font-semibold text-gray-800">Session Expiring Soon</h2>
          <button className="text-gray-500 hover:text-gray-700 text-2xl" onClick={handleClose}>&times;</button>
        </div>
        <div className="p-6">
          <p className="mb-2">{tokenWarningMessage}</p>
          <p>Would you like to continue your session or end now?</p>
        </div>
        <div className="flex justify-end gap-2 p-4 bg-gray-50 border-t">
          <button className="btn-secondary px-4 py-2 rounded-md" onClick={handleClose}>
            Remind Me Later
          </button>
          <button className="btn-danger px-4 py-2 rounded-md text-white" onClick={handleEndSession}>
            End Session
          </button>
          <button className="btn-primary px-4 py-2 rounded-md text-white" onClick={handleContinueSession}>
            Continue Session
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionExpiryWarning;