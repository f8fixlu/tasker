import { useModal as useModalContext } from '../context/ModalContext';

// Custom hook that wraps the ModalContext
export const useModal = () => {
  const context = useModalContext();
  
  // Convenience methods for opening specific modals
  const openNewTaskModal = () => context.openModal('showNewTask');
  const closeNewTaskModal = () => context.closeModal('showNewTask');
  
  const openViewTaskModal = (task) => {
    context.setSelectedTask(task);
    context.openModal('showViewTask');
  };
  const closeViewTaskModal = () => context.closeModal('showViewTask');
  
  const openEditTaskModal = (task) => {
    context.setSelectedTask(task);
    context.openModal('showEditTask');
  };
  const closeEditTaskModal = () => context.closeModal('showEditTask');
  
  const openNewEventModal = () => context.openModal('showNewEvent');
  const closeNewEventModal = () => context.closeModal('showNewEvent');
  
  const openViewEventModal = (event) => {
    context.setSelectedEvent(event);
    context.openModal('showViewEvent');
  };
  const closeViewEventModal = () => context.closeModal('showViewEvent');
  
  const openEditEventModal = (event) => {
    context.setSelectedEvent(event);
    context.openModal('showEditEvent');
  };
  const closeEditEventModal = () => context.closeModal('showEditEvent');
  
  const openNewCategoryModal = () => context.openModal('showNewCategory');
  const closeNewCategoryModal = () => context.closeModal('showNewCategory');
  
  const openNewTaskTypeModal = () => context.openModal('showNewTaskType');
  const closeNewTaskTypeModal = () => context.closeModal('showNewTaskType');
  
  const openNewSubTypeModal = () => context.openModal('showNewSubType');
  const closeNewSubTypeModal = () => context.closeModal('showNewSubType');

  const openAboutModal = () => context.openModal('showAbout');
  const closeAboutModal = () => context.closeModal('showAbout');

  return {
    ...context,
    openNewTaskModal,
    closeNewTaskModal,
    openViewTaskModal,
    closeViewTaskModal,
    openEditTaskModal,
    closeEditTaskModal,
    openNewEventModal,
    closeNewEventModal,
    openViewEventModal,
    closeViewEventModal,
    openEditEventModal,
    closeEditEventModal,
    openNewCategoryModal,
    closeNewCategoryModal,
    openNewTaskTypeModal,
    closeNewTaskTypeModal,
    openNewSubTypeModal,
    closeNewSubTypeModal,
    openAboutModal,
    closeAboutModal,
  };
};