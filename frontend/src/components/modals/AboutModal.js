import React from 'react';
import Modal from '../common/Modal';

const AboutModal = ({ isOpen, onClose }) => {
  // Get system information
  const systemInfo = {
    platform: navigator.platform,
    userAgent: navigator.userAgent,
    language: navigator.language,
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    colorDepth: window.screen.colorDepth,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    appName: navigator.appName,
    appVersion: navigator.appVersion,
    vendor: navigator.vendor,
  };

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
              <p><span className="font-medium">Version:</span> 1.0.0</p>
              <p><span className="font-medium">Description:</span> A comprehensive task management application</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">System Information</h3>
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <p><span className="font-medium">Platform:</span> {systemInfo.platform}</p>
            <p><span className="font-medium">Language:</span> {systemInfo.language}</p>
            <p><span className="font-medium">Screen Resolution:</span> {systemInfo.screenResolution}</p>
            <p><span className="font-medium">Color Depth:</span> {systemInfo.colorDepth}</p>
            <p><span className="font-medium">Timezone:</span> {systemInfo.timezone}</p>
            <p><span className="font-medium">Online Status:</span> {systemInfo.onLine ? 'Yes' : 'No'}</p>
            <p><span className="font-medium">Cookies Enabled:</span> {systemInfo.cookieEnabled ? 'Yes' : 'No'}</p>
            <p><span className="font-medium">Browser:</span> {systemInfo.appName}</p>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">User Agent</h3>
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <p className="break-all text-xs">{systemInfo.userAgent}</p>
          </div>
        </div>

        <div className="pt-4">
          <p className="text-gray-600 dark:text-gray-300">
            Tasker is designed to help you manage your tasks efficiently. For support or feedback, please contact us at{' '}
            <a
              href="mailto:support@f8fixlu.biz"
              className="text-blue-500 hover:text-blue-700 underline"
            >
              support@f8fixlu.biz
            </a>.
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default AboutModal;