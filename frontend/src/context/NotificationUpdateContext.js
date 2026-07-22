import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

const NotificationUpdateContext = createContext();

export const useNotificationUpdate = () => {
  const context = useContext(NotificationUpdateContext);
  if (!context) {
    throw new Error('useNotificationUpdate must be used within a NotificationUpdateProvider');
  }
  return context;
};

export const NotificationUpdateProvider = ({ children }) => {
  const [updateTrigger, setUpdateTrigger] = useState(0);

  const triggerNotificationUpdate = useCallback(() => {
    setUpdateTrigger(prev => prev + 1);
  }, []);

  const value = useMemo(() => ({
    updateTrigger,
    triggerNotificationUpdate
  }), [updateTrigger, triggerNotificationUpdate]);

  return (
    <NotificationUpdateContext.Provider value={value}>
      {children}
    </NotificationUpdateContext.Provider>
  );
};
