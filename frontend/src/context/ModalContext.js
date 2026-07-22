import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

const ModalContext = createContext();

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

export const ModalProvider = ({ children }) => {
  const [modals, setModals] = useState({
    showNewTask: false,
    showViewTask: false,
    showEditTask: false,
    showNewEvent: false,
    showViewEvent: false,
    showEditEvent: false,
    showNewCategory: false,
    showNewTaskType: false,
    showNewSubType: false,
    showAbout: false,
  });

  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const openModal = useCallback((modalName) => {
    setModals(prev => ({
      ...prev,
      [modalName]: true
    }));
  }, []);

  const closeModal = useCallback((modalName) => {
    setModals(prev => ({
      ...prev,
      [modalName]: false
    }));
  }, []);

  const closeAllModals = useCallback(() => {
    setModals({
      showNewTask: false,
      showViewTask: false,
      showEditTask: false,
      showNewEvent: false,
      showViewEvent: false,
      showEditEvent: false,
      showNewCategory: false,
      showNewTaskType: false,
      showNewSubType: false,
      showAbout: false,
    });
  }, []);

  const value = useMemo(() => ({
    modals,
    openModal,
    closeModal,
    closeAllModals,
    selectedTask,
    setSelectedTask,
    selectedEvent,
    setSelectedEvent
  }), [modals, openModal, closeModal, closeAllModals, selectedTask, selectedEvent]);

  return (
    <ModalContext.Provider value={value}>
      {children}
    </ModalContext.Provider>
  );
};
