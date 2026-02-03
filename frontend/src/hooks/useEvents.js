import { useState, useEffect } from 'react';

export const useEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Mock events data for demonstration
  const mockEvents = [
    {
      id: 1,
      title: 'Design review',
      startDate: '2023-10-22',
      endDate: '2023-10-22',
      startTime: '10:00',
      endTime: '11:00',
      wholeDay: false,
      category: 'workshop',
      description: 'A session to review the latest design mockups for the new feature.',
      attachments: [
        { id: 1, name: 'mockup_v1.jpg', size: 2457600, type: 'image/jpeg' },
      ],
    },
    {
      id: 2,
      title: 'Team Sync',
      startDate: '2023-10-25',
      endDate: '2023-10-25',
      startTime: '09:00',
      endTime: '10:00',
      wholeDay: false,
      category: 'meeting',
      description: 'Weekly team synchronization meeting.',
      attachments: [],
    },
  ];

  useEffect(() => {
    // Simulate loading events from an API
    setLoading(true);
    setTimeout(() => {
      setEvents(mockEvents);
      setLoading(false);
    }, 500);
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      // In a real app, fetch events from API
      // const response = await fetch('/api/events');
      // const data = await response.json();
      // setEvents(data);
      
      // For now, just use mock data
      setEvents(mockEvents);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addEvent = async (eventData) => {
    try {
      // In a real app, send to API
      // const response = await fetch('/api/events', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(eventData)
      // });
      // const newEvent = await response.json();
      
      const newEvent = {
        id: Date.now(),
        ...eventData,
      };
      
      setEvents(prev => [newEvent, ...prev]);
      return newEvent;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const updateEvent = async (id, eventData) => {
    try {
      // In a real app, send to API
      // const response = await fetch(`/api/events/${id}`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(eventData)
      // });
      // const updatedEvent = await response.json();
      
      setEvents(prev => 
        prev.map(event => 
          event.id === id ? { ...event, ...eventData } : event
        )
      );
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const deleteEvent = async (id) => {
    try {
      // In a real app, send to API
      // await fetch(`/api/events/${id}`, { method: 'DELETE' });
      
      setEvents(prev => prev.filter(event => event.id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return {
    events,
    loading,
    error,
    fetchEvents,
    addEvent,
    updateEvent,
    deleteEvent,
  };
};