import React, { createContext, useContext, useState } from 'react';

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

  const openModal = (modalName) => {
    setModals(prev => ({
      ...prev,
      [modalName]: true
    }));
  };

  const closeModal = (modalName) => {
    setModals(prev => ({
      ...prev,
      [modalName]: false
    }));
  };

  const closeAllModals = () => {
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
  };

  const value = {
    modals,
    openModal,
    closeModal,
    closeAllModals,
    selectedTask,
    setSelectedTask,
    selectedEvent,
    setSelectedEvent
  };

  return (
    <ModalContext.Provider value={value}>
      {children}
    </ModalContext.Provider>
  );
};