import React from 'react';
import { useModal } from '../../hooks/useModal';  // Import from the custom hook, not directly from context
import { useTaskUpdate } from '../../context/TaskUpdateContext';
import { taskService } from '../../services/taskService';
import { categoryService } from '../../services/categoryService';
import { taskTypeService } from '../../services/taskTypeService';
import { subTypeService } from '../../services/subTypeService';
import NewTaskModal from './NewTaskModal';
import EditTaskModal from './EditTaskModal';
import ViewTaskModal from './ViewTaskModal';
import NewEventModal from './NewEventModal';
import EditEventModal from './EditEventModal';
import ViewEventModal from './ViewEventModal';
import NewCategoryModal from './NewCategoryModal';
import NewTaskTypeModal from './NewTaskTypeModal';
import NewSubTypeModal from './NewSubTypeModal';
import AboutModal from './AboutModal';

const ModalRenderer = () => {
  const { 
    modals, 
    closeAllModals, 
    selectedTask, 
    selectedEvent,
    openEditTaskModal
  } = useModal();
  const { triggerTaskUpdate } = useTaskUpdate();

  return (
    <>
      {/* Task Modals */}
      <NewTaskModal
        isOpen={modals.showNewTask}
        onSave={async (newTaskData) => {
          // Create the task via API
          try {
            const result = await taskService.createTask(newTaskData);
            // Trigger a task update so other components know to refresh
            triggerTaskUpdate();
            return result; // Return the result so NewTaskModal can extract the task ID
          } catch (error) {
            console.error('Error creating task:', error);
            throw error; // Re-throw to allow NewTaskModal to handle the error
          }
        }}
        onClose={() => closeAllModals()}
      />
      <ViewTaskModal 
        isOpen={modals.showViewTask} 
        task={selectedTask}
        onEdit={(task) => {
          console.log('onEdit called with task:', task);
          console.log('openEditTaskModal available:', typeof openEditTaskModal);
          if (typeof openEditTaskModal === 'function') {
            closeAllModals(); // Close the view modal first
            openEditTaskModal(task); // Open the edit modal with the task
          } else {
            console.error('openEditTaskModal is not available');
          }
        }}
        onClose={() => closeAllModals()} 
      />
      <EditTaskModal 
        isOpen={modals.showEditTask} 
        task={selectedTask}
        onSave={async (updatedTaskData) => {
          // Update the task via API
          try {
            await taskService.updateTask(updatedTaskData.id, updatedTaskData);
            // Trigger a task update so other components know to refresh
            triggerTaskUpdate();
          } catch (error) {
            console.error('Error updating task:', error);
          }
        }}
        onClose={() => closeAllModals()} 
      />
      
      {/* Event Modals */}
      <NewEventModal 
        isOpen={modals.showNewEvent} 
        onClose={() => closeAllModals()} 
      />
      <ViewEventModal 
        isOpen={modals.showViewEvent} 
        event={selectedEvent}
        onClose={() => closeAllModals()} 
      />
      <EditEventModal 
        isOpen={modals.showEditEvent} 
        event={selectedEvent}
        onClose={() => closeAllModals()} 
      />
      
      {/* Other Modals */}
      <NewCategoryModal
        isOpen={modals.showNewCategory}
        onClose={() => closeAllModals()}
      />
      <NewTaskTypeModal
        isOpen={modals.showNewTaskType}
        onClose={() => closeAllModals()}
      />
      <NewSubTypeModal
        isOpen={modals.showNewSubType}
        onClose={() => closeAllModals()}
      />
      <AboutModal
        isOpen={modals.showAbout}
        onClose={() => closeAllModals()}
      />
    </>
  );
};

export default ModalRenderer;