const { validateEvent } = require('../../../middleware/validation');

describe('Event Model', () => {
  describe('validateEvent', () => {
    test('should validate a correct event', () => {
      const event = {
        title: 'Test Event',
        description: 'This is a test event',
        start_date: '2023-12-31T10:00:00Z',
        end_date: '2023-12-31T11:00:00Z',
        is_whole_day: false,
        category: 'Meeting'
      };
      
      const errors = validateEvent(event);
      expect(errors).toHaveLength(0);
    });

    test('should reject an event without a title', () => {
      const event = {
        description: 'This is a test event',
        start_date: '2023-12-31T10:00:00Z',
        end_date: '2023-12-31T11:00:00Z',
        is_whole_day: false,
        category: 'Meeting'
      };
      
      const errors = validateEvent(event);
      expect(errors).toContain('Event title is required');
    });

    test('should reject an event with invalid dates', () => {
      const event = {
        title: 'Test Event',
        description: 'This is a test event',
        start_date: '2023-12-31T11:00:00Z',
        end_date: '2023-12-31T10:00:00Z', // End date before start date
        is_whole_day: false,
        category: 'Meeting'
      };
      
      const errors = validateEvent(event);
      expect(errors).toContain('End date must be after start date');
    });

    test('should reject an event with missing start date', () => {
      const event = {
        title: 'Test Event',
        description: 'This is a test event',
        end_date: '2023-12-31T11:00:00Z',
        is_whole_day: false,
        category: 'Meeting'
      };
      
      const errors = validateEvent(event);
      expect(errors).toContain('Valid start date is required');
    });

    test('should reject an event with missing end date', () => {
      const event = {
        title: 'Test Event',
        description: 'This is a test event',
        start_date: '2023-12-31T10:00:00Z',
        is_whole_day: false,
        category: 'Meeting'
      };
      
      const errors = validateEvent(event);
      expect(errors).toContain('Valid end date is required');
    });
  });
});