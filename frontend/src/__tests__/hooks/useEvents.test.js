import { renderHook, act } from '@testing-library/react';
import useEvents from '../hooks/useEvents';

// Mock the useEffect to prevent automatic data fetching
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useEffect: jest.fn((callback) => callback()),
}));

describe('useEvents Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should initialize with empty events', () => {
    const { result } = renderHook(() => useEvents());
    
    expect(result.current.events).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  test('should add a new event', () => {
    const { result } = renderHook(() => useEvents());
    
    const newEvent = {
      title: 'Test Event',
      description: 'This is a test event',
      start_date: '2023-12-31T10:00:00Z',
      end_date: '2023-12-31T11:00:00Z',
      is_whole_day: false,
      category: 'Meeting'
    };
    
    act(() => {
      result.current.addEvent(newEvent);
    });
    
    expect(result.current.events).toHaveLength(1);
    expect(result.current.events[0]).toMatchObject(newEvent);
  });

  test('should update an existing event', () => {
    const { result } = renderHook(() => useEvents());
    
    // First add an event
    const initialEvent = {
      id: 1,
      title: 'Initial Event',
      description: 'Initial description',
      start_date: '2023-12-31T10:00:00Z',
      end_date: '2023-12-31T11:00:00Z',
      is_whole_day: false,
      category: 'Meeting'
    };
    
    act(() => {
      result.current.addEvent(initialEvent);
    });
    
    // Then update it
    const updatedEvent = {
      title: 'Updated Event',
      description: 'Updated description',
      category: 'Workshop'
    };
    
    act(() => {
      result.current.updateEvent(1, updatedEvent);
    });
    
    expect(result.current.events).toHaveLength(1);
    expect(result.current.events[0].title).toBe('Updated Event');
    expect(result.current.events[0].description).toBe('Updated description');
    expect(result.current.events[0].category).toBe('Workshop');
  });

  test('should delete an event', () => {
    const { result } = renderHook(() => useEvents());
    
    // First add events
    act(() => {
      result.current.addEvent({ id: 1, title: 'Event 1' });
      result.current.addEvent({ id: 2, title: 'Event 2' });
    });
    
    // Then delete one
    act(() => {
      result.current.deleteEvent(1);
    });
    
    expect(result.current.events).toHaveLength(1);
    expect(result.current.events[0].id).toBe(2);
  });

  test('should filter events for a date range', () => {
    const { result } = renderHook(() => useEvents());
    
    // Add events with different dates
    act(() => {
      result.current.addEvent({
        id: 1,
        title: 'Event 1',
        start_date: '2023-10-15T10:00:00Z',
        end_date: '2023-10-15T11:00:00Z'
      });
      result.current.addEvent({
        id: 2,
        title: 'Event 2',
        start_date: '2023-10-20T10:00:00Z',
        end_date: '2023-10-20T11:00:00Z'
      });
      result.current.addEvent({
        id: 3,
        title: 'Event 3',
        start_date: '2023-10-25T10:00:00Z',
        end_date: '2023-10-25T11:00:00Z'
      });
    });
    
    // Filter for a specific date range
    const startDate = new Date('2023-10-18');
    const endDate = new Date('2023-10-22');
    const filteredEvents = result.current.getEventsForDateRange(startDate, endDate);
    
    expect(filteredEvents).toHaveLength(1);
    expect(filteredEvents[0].id).toBe(2);
  });

  test('should filter events for a specific day', () => {
    const { result } = renderHook(() => useEvents());
    
    // Add events
    act(() => {
      result.current.addEvent({
        id: 1,
        title: 'Event 1',
        start_date: '2023-10-15T10:00:00Z',
        end_date: '2023-10-15T11:00:00Z'
      });
      result.current.addEvent({
        id: 2,
        title: 'Event 2',
        start_date: '2023-10-15T14:00:00Z',
        end_date: '2023-10-15T15:00:00Z'
      });
      result.current.addEvent({
        id: 3,
        title: 'Event 3',
        start_date: '2023-10-16T10:00:00Z',
        end_date: '2023-10-16T11:00:00Z'
      });
    });
    
    // Filter for a specific day
    const targetDate = new Date('2023-10-15');
    const filteredEvents = result.current.getEventsForDay(targetDate);
    
    expect(filteredEvents).toHaveLength(2);
    expect(filteredEvents[0].id).toBe(1);
    expect(filteredEvents[1].id).toBe(2);
  });
});