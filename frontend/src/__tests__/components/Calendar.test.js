import React from 'react';
import { render, screen } from '@testing-library/react';
import Calendar from '../components/common/Calendar';

describe('Calendar Component', () => {
  const mockEvents = [
    { id: 1, title: 'Meeting', start_date: '2023-10-15T10:00:00', category: 'Work' },
    { id: 2, title: 'Lunch', start_date: '2023-10-15T12:00:00', category: 'Personal' },
  ];

  test('renders calendar with correct month and year', () => {
    const testDate = new Date('2023-10-15');
    render(<Calendar events={mockEvents} currentDate={testDate} />);
    
    // Check if the month and year are displayed correctly
    expect(screen.getByText('October 2023')).toBeInTheDocument();
  });

  test('displays weekdays correctly', () => {
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    render(<Calendar events={mockEvents} />);
    
    weekdays.forEach(day => {
      expect(screen.getByText(day)).toBeInTheDocument();
    });
  });

  test('renders events on correct dates', () => {
    render(<Calendar events={mockEvents} />);
    
    // Check if events are displayed (this would require more specific selectors in a real test)
    expect(screen.getByText('Meeting')).toBeInTheDocument();
    expect(screen.getByText('Lunch')).toBeInTheDocument();
  });

  test('calls onDayClick when a day is clicked', () => {
    const handleDayClick = jest.fn();
    render(<Calendar events={mockEvents} onDayClick={handleDayClick} />);
    
    // Find a day cell and click it (this is a simplified example)
    const dayCell = screen.getByText('15'); // Assuming this is a day with events
    dayCell.click();
    
    // We can't easily verify the exact date without more complex selectors
    expect(handleDayClick).toHaveBeenCalled();
  });

  test('calls onEventClick when an event is clicked', () => {
    const handleEventClick = jest.fn();
    render(<Calendar events={mockEvents} onEventClick={handleEventClick} />);
    
    const eventElement = screen.getByText('Meeting');
    eventElement.click();
    
    expect(handleEventClick).toHaveBeenCalledWith(mockEvents[0]);
  });
});