const { validateTask } = require('../../../middleware/validation');

describe('Task Model', () => {
  describe('validateTask', () => {
    test('should validate a correct task', () => {
      const task = {
        title: 'Test Task',
        description: 'This is a test task',
        due_date: '2023-12-31',
        quantity: 5,
        priority: 'High',
        status: 'Pending'
      };
      
      const errors = validateTask(task);
      expect(errors).toHaveLength(0);
    });

    test('should reject a task without a title', () => {
      const task = {
        description: 'This is a test task',
        due_date: '2023-12-31',
        quantity: 5,
        priority: 'High',
        status: 'Pending'
      };
      
      const errors = validateTask(task);
      expect(errors).toContain('Task title is required');
    });

    test('should reject a task with invalid priority', () => {
      const task = {
        title: 'Test Task',
        description: 'This is a test task',
        due_date: '2023-12-31',
        quantity: 5,
        priority: 'Invalid',
        status: 'Pending'
      };
      
      const errors = validateTask(task);
      expect(errors).toContain('Priority must be Low, Medium, or High');
    });

    test('should reject a task with invalid status', () => {
      const task = {
        title: 'Test Task',
        description: 'This is a test task',
        due_date: '2023-12-31',
        quantity: 5,
        priority: 'High',
        status: 'Invalid'
      };
      
      const errors = validateTask(task);
      expect(errors).toContain('Status must be Pending, In Progress, or Completed');
    });

    test('should reject a task with negative quantity', () => {
      const task = {
        title: 'Test Task',
        description: 'This is a test task',
        due_date: '2023-12-31',
        quantity: -1,
        priority: 'High',
        status: 'Pending'
      };
      
      const errors = validateTask(task);
      expect(errors).toContain('Quantity must be a positive number between 1 and 1000');
    });
  });
});