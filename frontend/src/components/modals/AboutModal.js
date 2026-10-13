import React from 'react';
import Modal from '../common/Modal';

const AboutModal = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="About Tasker"
      size="lg"
    >
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Application Information</h3>
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg flex items-start">
            <img
              src="/logo/tasker_logo.png"
              alt="Tasker Logo"
              className="w-16 h-16 mr-4 object-contain"
            />
            <div>
              <p><span className="font-medium">Application:</span> Tasker</p>
              <p><span className="font-medium">Version:</span> 2.0.0</p>
              <p><span className="font-medium">Description:</span> A comprehensive task management application</p>
            </div>
          </div>
        </div>

        <div className="pt-4">
          <p className="text-gray-600 dark:text-gray-300">
            Tasker is designed to help you manage your tasks efficiently. For support or feedback, please contact us at{' '}
            <a
              href="mailto:support@f8fixlu.cc"
              className="text-blue-500 hover:text-blue-700 underline"
            >
              support@f8fixlu.cc
            </a>.
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default AboutModal;