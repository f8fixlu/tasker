import { renderHook, act } from '@testing-library/react';
import useTasks from '../hooks/useTasks';

// Mock the useEffect to prevent automatic data fetching
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useEffect: jest.fn((callback) => callback()),
}));

describe('useTasks Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should initialize with empty tasks', () => {
    const { result } = renderHook(() => useTasks());
    
    expect(result.current.tasks).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  test('should handle search term changes', () => {
    const { result } = renderHook(() => useTasks());
    
    act(() => {
      result.current.handleSearchChange('test search');
    });
    
    expect(result.current.searchTerm).toBe('test search');
  });

  test('should handle filter changes', () => {
    const { result } = renderHook(() => useTasks());
    
    act(() => {
      result.current.handleFilterChange('status', 'Completed');
    });
    
    expect(result.current.filters.status).toBe('Completed');
  });

  test('should add a new task', () => {
    const { result } = renderHook(() => useTasks());
    
    const newTask = {
      title: 'Test Task',
      description: 'This is a test task',
      dueDate: '2023-12-31',
      priority: 'High'
    };
    
    act(() => {
      result.current.addTask(newTask);
    });
    
    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0]).toMatchObject(newTask);
  });

  test('should update an existing task', () => {
    const { result } = renderHook(() => useTasks());
    
    // First add a task
    const initialTask = {
      id: 1,
      title: 'Initial Task',
      description: 'Initial description',
      dueDate: '2023-12-31',
      priority: 'High'
    };
    
    act(() => {
      result.current.addTask(initialTask);
    });
    
    // Then update it
    const updatedTask = {
      title: 'Updated Task',
      description: 'Updated description',
      priority: 'Medium'
    };
    
    act(() => {
      result.current.updateTask(1, updatedTask);
    });
    
    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0].title).toBe('Updated Task');
    expect(result.current.tasks[0].description).toBe('Updated description');
    expect(result.current.tasks[0].priority).toBe('Medium');
  });

  test('should delete a task', () => {
    const { result } = renderHook(() => useTasks());
    
    // First add tasks
    act(() => {
      result.current.addTask({ id: 1, title: 'Task 1' });
      result.current.addTask({ id: 2, title: 'Task 2' });
    });
    
    // Then delete one
    act(() => {
      result.current.deleteTask(1);
    });
    
    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0].id).toBe(2);
  });

  test('should perform bulk delete operations', () => {
    const { result } = renderHook(() => useTasks());
    
    // First add tasks
    act(() => {
      result.current.addTask({ id: 1, title: 'Task 1' });
      result.current.addTask({ id: 2, title: 'Task 2' });
      result.current.addTask({ id: 3, title: 'Task 3' });
    });
    
    // Then delete multiple tasks
    act(() => {
      result.current.bulkDeleteTasks([1, 3]);
    });
    
    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0].id).toBe(2);
  });

  test('should perform bulk update operations', () => {
    const { result } = renderHook(() => useTasks());
    
    // First add tasks
    act(() => {
      result.current.addTask({ id: 1, title: 'Task 1', status: 'Pending' });
      result.current.addTask({ id: 2, title: 'Task 2', status: 'Pending' });
      result.current.addTask({ id: 3, title: 'Task 3', status: 'Pending' });
    });
    
    // Then update multiple tasks
    act(() => {
      result.current.bulkUpdateTasks([1, 2], { status: 'Completed' });
    });
    
    expect(result.current.tasks[0].status).toBe('Completed');
    expect(result.current.tasks[1].status).toBe('Completed');
    expect(result.current.tasks[2].status).toBe('Pending');
  });
});