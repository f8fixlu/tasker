import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

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

  const triggerTaskUpdate = useCallback(() => {
    setUpdateTrigger(prev => prev + 1);
  }, []);

  const triggerDropdownUpdate = useCallback((type = 'all') => {
    setDropdownUpdateTrigger(prev => prev + 1);
  }, []);

  const value = useMemo(() => ({
    updateTrigger,
    triggerTaskUpdate,
    dropdownUpdateTrigger,
    triggerDropdownUpdate
  }), [updateTrigger, triggerTaskUpdate, dropdownUpdateTrigger, triggerDropdownUpdate]);

  return (
    <TaskUpdateContext.Provider value={value}>
      {children}
    </TaskUpdateContext.Provider>
  );
};
