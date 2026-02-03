import { useState, useEffect } from 'react';

export const useTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Mock tasks data for demonstration
  const mockTasks = [
    {
      id: 1,
      title: 'Finalize Q3 Report',
      dueDate: '2023-10-22T15:00',
      category: 'work',
      type: 'design',
      subType: 'ui-ux',
      priority: 'high',
      quantity: 1,
      description: 'The Q3 report needs to be finalized and submitted by the end of the day.',
      attachments: [
        { id: 1, name: 'mockup_v1.jpg', size: 2457600, type: 'image/jpeg' },
      ],
      completed: false,
    },
    {
      id: 2,
      title: 'Team Meeting',
      dueDate: '2023-10-25T10:00',
      category: 'meeting',
      type: 'development',
      subType: 'frontend',
      priority: 'medium',
      quantity: 1,
      description: 'Weekly team sync meeting to discuss progress.',
      attachments: [],
      completed: false,
    },
  ];

  useEffect(() => {
    // Simulate loading tasks from an API
    setLoading(true);
    setTimeout(() => {
      setTasks(mockTasks);
      setLoading(false);
    }, 500);
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      // In a real app, fetch tasks from API
      // const response = await fetch('/api/tasks');
      // const data = await response.json();
      // setTasks(data);
      
      // For now, just use mock data
      setTasks(mockTasks);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addTask = async (taskData) => {
    try {
      // In a real app, send to API
      // const response = await fetch('/api/tasks', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(taskData)
      // });
      // const newTask = await response.json();
      
      const newTask = {
        id: Date.now(),
        ...taskData,
        completed: false,
      };
      
      setTasks(prev => [newTask, ...prev]);
      return newTask;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const updateTask = async (id, taskData) => {
    try {
      // In a real app, send to API
      // const response = await fetch(`/api/tasks/${id}`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(taskData)
      // });
      // const updatedTask = await response.json();
      
      setTasks(prev => 
        prev.map(task => 
          task.id === id ? { ...task, ...taskData } : task
        )
      );
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const deleteTask = async (id) => {
    try {
      // In a real app, send to API
      // await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      
      setTasks(prev => prev.filter(task => task.id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const toggleTaskCompletion = async (id) => {
    setTasks(prev => 
      prev.map(task => 
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  return {
    tasks,
    loading,
    error,
    fetchTasks,
    addTask,
    updateTask,
    deleteTask,
    toggleTaskCompletion,
  };
};