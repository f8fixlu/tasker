import React, { createContext, useContext, useState } from 'react';
import { categoryService } from '../services/categoryService';
import { taskTypeService } from '../services/taskTypeService';
import { subTypeService } from '../services/subTypeService';

const TaskUpdateContext = createContext();

export const useTaskUpdate = () => {
  const context = useContext(TaskUpdateContext);
  if (!context) {
    throw new Error('useTaskUpdate must be used within a TaskUpdateProvider');
  }
  return context;
};

export const TaskUpdateProvider = ({ children }) => {
  const [updateTrigger, setUpdateTrigger] = useState(0);
  const [dropdownUpdateTrigger, setDropdownUpdateTrigger] = useState(0);

  const triggerTaskUpdate = () => {
    setUpdateTrigger(prev => prev + 1);
  };

  // Function to trigger dropdown refresh in parent components
  const triggerDropdownUpdate = (type = 'all') => {
    // Pass the type of dropdown that needs refresh so parent components can decide what to update
    setDropdownUpdateTrigger(prev => prev + 1);
  };

  const value = {
    updateTrigger,
    triggerTaskUpdate,
    dropdownUpdateTrigger,
    triggerDropdownUpdate
  };

  return (
    <TaskUpdateContext.Provider value={value}>
      {children}
    </TaskUpdateContext.Provider>
  );
};