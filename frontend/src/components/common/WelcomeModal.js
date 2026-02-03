import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { authService } from '../../services/authService';

const WelcomeModal = ({ user, isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "Welcome to Tasker!",
      content: "Tasker is your comprehensive task and event management system. Let's get you familiar with the interface."
    },
    {
      title: "Dashboard Overview",
      content: "Your dashboard provides an overview of your tasks, events, and productivity metrics. You can quickly see what's due today and track your progress."
    },
    {
      title: "Task Management",
      content: "Create, edit, and organize your tasks with categories, priorities, and due dates. Track your progress and stay on top of your responsibilities."
    },
    {
      title: "Event Management",
      content: "Schedule and manage events with categories and types. Set reminders and never miss an important appointment."
    },
    {
      title: "Reports & Analytics",
      content: "Generate detailed reports to analyze your productivity and get insights about your task completion patterns."
    },
    {
      title: "Settings & Customization",
      content: "Customize your profile, notification preferences, and signatory information in the settings panel."
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = async () => {
    // Mark the welcome modal as seen for this user
    if (user?.id) {
      localStorage.setItem(`welcomeModalSeen_${user.id}`, 'true');
    }
    try {
      // Call the API to mark welcome as shown in the database
      await authService.markWelcomeShown();
    } catch (error) {
      console.error('Error marking welcome as shown:', error);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <div className="p-6">
        <div className="flex flex-col items-center text-center">

          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            {steps[currentStep].title}
          </h2>
          
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {steps[currentStep].content}
          </p>
          
          <div className="flex space-x-2 mb-6">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === currentStep ? 'bg-primary dark:bg-primary-400' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>
          
          <div className="flex space-x-3 w-full">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className={`flex-1 py-2 px-4 rounded-md ${
                currentStep === 0
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              } dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600`}
            >
              Previous
            </button>
            
            <button
              onClick={handleNext}
              className="flex-1 py-2 px-4 bg-primary text-white rounded-md hover:bg-primary-dark"
            >
              {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default WelcomeModal;