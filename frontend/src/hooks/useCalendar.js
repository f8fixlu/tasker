import { useState, useEffect } from 'react';

export const useCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Helper function to get days in a month
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  // Helper function to get the first day of the month (adjusted to start on Sunday)
  const getCalendarDays = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // Get first day of month (1st of month)
    const firstDayOfMonth = new Date(year, month, 1);
    // Get last day of previous month to calculate how many days to show from previous month
    const lastDayPrevMonth = new Date(year, month, 0).getDate();
    
    // What day of the week is the 1st? (0 = Sunday, 1 = Monday, etc.)
    const firstDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Get days in current month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Build calendar array
    const calendarDays = [];
    
    // Add days from previous month to fill the first week
    for (let i = firstDayOfWeek; i > 0; i--) {
      calendarDays.push(new Date(year, month - 1, lastDayPrevMonth - i + 1));
    }
    
    // Add days from current month
    for (let i = 1; i <= daysInMonth; i++) {
      calendarDays.push(new Date(year, month, i));
    }
    
    // Add days from next month to fill the remaining days
    const totalCells = 42; // 6 weeks * 7 days
    const remainingDays = totalCells - calendarDays.length;
    for (let i = 1; i <= remainingDays; i++) {
      calendarDays.push(new Date(year, month + 1, i));
    }
    
    return calendarDays;
  };

  // Mock events and tasks data for demonstration
  const mockEvents = [
    {
      id: 1,
      title: 'Design review',
      date: '2023-10-15',
      startTime: '10:00',
      endTime: '11:00',
      category: 'workshop',
      type: 'event'
    },
    {
      id: 2,
      title: 'Team Meeting',
      date: '2023-10-20',
      startTime: '14:00',
      endTime: '15:00',
      category: 'meeting',
      type: 'event'
    },
  ];

  const mockTasks = [
    {
      id: 1,
      title: 'Finalize Q3 Report',
      dueDate: '2023-10-22T15:00',
      category: 'work',
      type: 'task'
    },
    {
      id: 2,
      title: 'Prepare Presentation',
      dueDate: '2023-10-25T09:00',
      category: 'work',
      type: 'task'
    },
  ];

  useEffect(() => {
    // Simulate loading calendar data from an API
    setLoading(true);
    setTimeout(() => {
      setEvents(mockEvents);
      setTasks(mockTasks);
      setLoading(false);
    }, 500);
  }, []);

  const fetchCalendarData = async () => {
    setLoading(true);
    try {
      // In a real app, fetch events and tasks from API
      // const eventsResponse = await fetch('/api/events');
      // const tasksResponse = await fetch('/api/tasks');
      // const eventsData = await eventsResponse.json();
      // const tasksData = await tasksResponse.json();
      // setEvents(eventsData);
      // setTasks(tasksData);
      
      // For now, just use mock data
      setEvents(mockEvents);
      setTasks(mockTasks);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getEventsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    return [
      ...events.filter(event => event.date === dateStr),
      ...tasks.filter(task => task.dueDate && task.dueDate.split('T')[0] === dateStr)
    ];
  };

  const navigateToPreviousMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const navigateToNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const navigateToToday = () => {
    setCurrentDate(new Date());
  };

  const getMonthName = (date) => {
    return date.toLocaleString('default', { month: 'long' });
  };

  const getYear = (date) => {
    return date.getFullYear();
  };

  return {
    currentDate,
    events,
    tasks,
    loading,
    error,
    getDaysInMonth,
    getCalendarDays,
    getEventsForDate,
    navigateToPreviousMonth,
    navigateToNextMonth,
    navigateToToday,
    getMonthName,
    getYear,
    fetchCalendarData,
  };
};