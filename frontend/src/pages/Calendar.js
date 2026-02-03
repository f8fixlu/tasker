import React, { useState, useEffect } from 'react';
import Button from '../components/common/Button';
import NewEventModal from '../components/modals/NewEventModal';
import ViewEventModal from '../components/modals/ViewEventModal';
import { eventService } from '../services/eventService';
import { useTaskUpdate } from '../context/TaskUpdateContext';
import { useNotifications } from '../hooks/useNotifications';

// Add custom CSS for hiding scrollbars and drag effects
const scrollbarHideStyle = `
  .scrollbar-hide {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;  /* Chrome, Safari, Opera*/
  }

  .drag-over {
    background-color: #dbeafe !important; /* Light blue highlight */
    border: 2px dashed #3b82f6 !important; /* Blue dashed border */
  }

  .dragging {
    opacity: 0.7;
  }
`;

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month'); // 'day', 'week', or 'month'
  const [isNewEventModalOpen, setIsNewEventModalOpen] = useState(false);
  const [isViewEventModalOpen, setIsViewEventModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [newEventPrefillData, setNewEventPrefillData] = useState({});

  const { updateTrigger: taskUpdateTrigger, triggerTaskUpdate, dropdownUpdateTrigger } = useTaskUpdate();
  const { fetchNotifications } = useNotifications();

  // Function to fetch events from the database
  const fetchEvents = async () => {
    try {
      setLoading(true);
      // Fetch all events without any limit by explicitly setting high limit
      const response = await eventService.getAllEvents({ limit: 1000 });
      setEvents(response.events || response);
    } catch (error) {
      console.error('Error fetching events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
      if (!initialLoadComplete) {
        setInitialLoadComplete(true);
      }
    }
  };

  // Effect to load events when component mounts
  useEffect(() => {
    fetchEvents();
  }, []);

  // Function to check if a date is in the past
  const isDateInPast = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for comparison
    return date < today;
  };

  // Function to handle day click - opens new event modal with pre-filled date (if not in past)
  const handleDayClick = (date) => {
    if (isDateInPast(date)) {
      return; // Don't open modal for past dates
    }
    
    // Prefill the date in the new event modal
    const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    setNewEventPrefillData({
      startDate: formattedDate,
      endDate: formattedDate
    });
    setIsNewEventModalOpen(true);
  };

  // Function to handle event click - opens view event modal
  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setIsViewEventModalOpen(true);
  };

  // Function to handle new event button click (from header)
  const handleNewEventClick = () => {
    setNewEventPrefillData({});
    setIsNewEventModalOpen(true);
  };

  // Helper functions for calendar calculations
  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  };

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfWeek = (date) => {
    return getFirstDayOfMonth(date).getDay();
  };

  // Generate calendar days for month view
  const generateCalendarDays = () => {
    const days = [];
    const firstDayOfWeek = getFirstDayOfWeek(currentDate);
    const daysInMonth = getDaysInMonth(currentDate);
    const prevMonthDays = getDaysInMonth(new Date(currentDate.getFullYear(), currentDate.getMonth(), 0));

    // Previous month's days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, day);
      days.push({ date, isCurrentMonth: false });
    }

    // Current month's days
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
      days.push({ date, isCurrentMonth: true });
    }

    // Next month's days
    const totalCells = 42; // 6 rows x 7 days
    const nextMonthDays = totalCells - days.length;
    for (let i = 1; i <= nextMonthDays; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, i);
      days.push({ date, isCurrentMonth: false });
    }

    return days;
  };

  // Helper function to filter events for a specific date
  const getEventsForDate = (date) => {
    return events.filter(event => {
      const eventDate = new Date(event.startDate || event.start_date);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });
  };

  // Function to update an event's dates only (preserving times)
  const updateEventDates = async (event, newStartDate, newEndDate) => {
    try {
      // Extract the time portions from the original event
      const originalStart = new Date(event.start_date || event.startDate);
      const originalEnd = new Date(event.end_date || event.endDate);

      // Combine the new dates with the original times
      const newStartDateTime = new Date(
        newStartDate.getFullYear(),
        newStartDate.getMonth(),
        newStartDate.getDate(),
        originalStart.getHours(),
        originalStart.getMinutes(),
        originalStart.getSeconds()
      );

      const newEndDateTime = new Date(
        newEndDate.getFullYear(),
        newEndDate.getMonth(),
        newEndDate.getDate(),
        originalEnd.getHours(),
        originalEnd.getMinutes(),
        originalEnd.getSeconds()
      );

      // Create update object - using the same field names as the backend expects
      const updateData = {
        ...event,
        start_date: newStartDateTime.toISOString(),
        end_date: newEndDateTime.toISOString()
      };

      // Remove the old date fields to avoid conflicts
      delete updateData.startDate;
      delete updateData.endDate;

      await eventService.updateEvent(event.id, updateData);
      await fetchEvents(); // Refresh events after update

      // Trigger notification refresh to update badge count
      triggerTaskUpdate();
      // Also fetch notifications directly for immediate update
      setTimeout(() => fetchNotifications(), 100);

      return true;
    } catch (error) {
      console.error('Error updating event dates:', error);
      return false;
    }
  };

  // Function to handle saving a new event
  const handleSaveEvent = async (eventData) => {
    try {
      await eventService.createEvent(eventData);
      await fetchEvents(); // Refresh events after creation

      // Trigger notification refresh to update badge count
      triggerTaskUpdate();
      // Also fetch notifications directly for immediate update
      setTimeout(() => fetchNotifications(), 100);
    } catch (error) {
      console.error('Error creating event:', error);
    }
  };


  return (
    <>
      <style>{scrollbarHideStyle}</style>
      <div className="layout-content-container flex flex-col w-full gap-8">
      <div className="flex justify-between items-center">
        <h1 className="text-[#111418] dark:text-white text-3xl font-bold leading-tight tracking-[-0.015em]">Calendar</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {view === 'month' ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-[34px]"
                  onClick={() => {
                    const newDate = new Date(currentDate);
                    newDate.setMonth(newDate.getMonth() - 1);
                    setCurrentDate(newDate);
                  }}
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </Button>
                <span className="text-lg font-semibold text-[#111418] dark:text-white">
                  {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-[34px]"
                  onClick={() => {
                    const newDate = new Date(currentDate);
                    newDate.setMonth(newDate.getMonth() + 1);
                    setCurrentDate(newDate);
                  }}
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </Button>
              </>
            ) : view === 'week' ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-[34px]"
                  onClick={() => {
                    const newDate = new Date(currentDate);
                    newDate.setDate(newDate.getDate() - 7);
                    setCurrentDate(newDate);
                  }}
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </Button>
                <span className="text-lg font-semibold text-[#111418] dark:text-white">
                  Week of {currentDate.toLocaleString('default', { month: 'short', day: 'numeric' })}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-[34px]"
                  onClick={() => {
                    const newDate = new Date(currentDate);
                    newDate.setDate(newDate.getDate() + 7);
                    setCurrentDate(newDate);
                  }}
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </Button>
              </>
            ) : view === 'day' ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-[34px]"
                  onClick={() => {
                    const newDate = new Date(currentDate);
                    newDate.setDate(newDate.getDate() - 1);
                    setCurrentDate(newDate);
                  }}
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </Button>
                <span className="text-lg font-semibold text-[#111418] dark:text-white">
                  {currentDate.toLocaleString('default', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-[34px]"
                  onClick={() => {
                    const newDate = new Date(currentDate);
                    newDate.setDate(newDate.getDate() + 1);
                    setCurrentDate(newDate);
                  }}
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </Button>
              </>
            ) : null}
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              className="px-3 py-1.5 h-[34px]"
              onClick={() => setView('day')}
            >
              Day
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="px-3 py-1.5 h-[34px]"
              onClick={() => setView('week')}
            >
              Week
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="px-3 py-1.5 h-[34px]"
              onClick={() => setView('month')}
            >
              Month
            </Button>
          </div>
          <Button
            variant="outline"
            className="flex items-center gap-2 h-[34px]"
            onClick={handleNewEventClick}
          >
            <span className="material-symbols-outlined">event</span>
            New Event
          </Button>
        </div>
      </div>
      
      {/* Render different views based on selected view */}
      {view === 'month' && (
        <>
          {loading && !initialLoadComplete ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="bg-gray-200 dark:bg-gray-700 h-6 w-32 rounded animate-pulse"></div>
                <div className="flex items-center gap-2">
                  <div className="bg-gray-200 dark:bg-gray-700 h-8 w-8 rounded-full animate-pulse"></div>
                  <div className="bg-gray-200 dark:bg-gray-700 h-8 w-16 rounded-md animate-pulse"></div>
                  <div className="bg-gray-200 dark:bg-gray-700 h-8 w-8 rounded-full animate-pulse"></div>
                </div>
              </div>
              
              <div className="grid grid-cols-7">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div 
                    key={day} 
                    className="py-3 text-center font-medium text-[#617589] dark:text-gray-400 text-sm"
                  >
                    {day}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7">
                {Array.from({ length: 42 }).map((_, index) => (
                  <div
                    key={index}
                    className="p-2 border-r border-b border-gray-200 dark:border-gray-700 min-h-24"
                  >
                    <div className="bg-gray-200 dark:bg-gray-700 h-4 w-6 rounded animate-pulse mb-2"></div>
                    <div className="space-y-1">
                      <div className="bg-gray-200 dark:bg-gray-700 h-4 w-full rounded animate-pulse"></div>
                      <div className="bg-gray-200 dark:bg-gray-700 h-4 w-3/4 rounded animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                  {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                    onClick={() => {
                      const newDate = new Date(currentDate);
                      newDate.setMonth(newDate.getMonth() - 1);
                      setCurrentDate(newDate);
                    }}
                  >
                    <span className="material-symbols-outlined text-gray-600 dark:text-gray-300">chevron_left</span>
                  </button>
                  <button
                    className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors duration-200"
                    onClick={() => {
                      setCurrentDate(new Date());
                    }}
                  >
                    Today
                  </button>
                  <button
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                    onClick={() => {
                      const newDate = new Date(currentDate);
                      newDate.setMonth(newDate.getMonth() + 1);
                      setCurrentDate(newDate);
                    }}
                  >
                    <span className="material-symbols-outlined text-gray-600 dark:text-gray-300">chevron_right</span>
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-7">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div 
                    key={day} 
                    className="py-3 text-center font-medium text-[#617589] dark:text-gray-400 text-sm"
                  >
                    {day}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7">
                {generateCalendarDays().map((day, index) => {
                  const isSelected = 
                    day.date.getDate() === currentDate.getDate() &&
                    day.date.getMonth() === currentDate.getMonth() &&
                    day.date.getFullYear() === currentDate.getFullYear();
                  
                  const isToday = 
                    day.date.getDate() === new Date().getDate() &&
                    day.date.getMonth() === new Date().getMonth() &&
                    day.date.getFullYear() === new Date().getFullYear();
                  
                  const dayEvents = getEventsForDate(day.date);
                  
                  const formattedDate = `${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, '0')}-${String(day.date.getDate()).padStart(2, '0')}`;
                  
                  return (
                    <div
                      key={index}
                      className={`
                        p-2 border-r border-b border-gray-200 dark:border-gray-700 min-h-24 relative group
                        ${day.isCurrentMonth ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}
                        ${isSelected ? 'bg-blue-50 dark:bg-blue-900/30' : ''}
                        ${isToday ? 'bg-blue-100 dark:bg-blue-900/50 font-bold' : ''}
                        ${!isDateInPast(day.date) ? 'hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors duration-200' : 'opacity-50'}
                      `}
                      onClick={() => handleDayClick(day.date)}
                      onDragOver={(e) => {
                        e.preventDefault(); // Necessary to allow dropping
                        if (!isDateInPast(day.date)) {
                          e.currentTarget.classList.add('drag-over');
                        }
                      }}
                      onDragLeave={(e) => {
                        e.currentTarget.classList.remove('drag-over');
                      }}
                      onDrop={async (e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('drag-over');
                        if (view !== 'month') return; // Only for month view
                        if (isDateInPast(day.date)) return; // Can't drop on past dates

                        const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));
                        const originalEvent = events.find(ev => ev.id === dragData.eventId);
                        if (!originalEvent) return;

                        // Calculate new start and end dates based on the difference
                        const originalStartDate = new Date(dragData.originalStartDate);
                        const originalStartDay = new Date(originalStartDate.getFullYear(), originalStartDate.getMonth(), originalStartDate.getDate());
                        const dateDiff = (day.date - originalStartDay) / (1000 * 60 * 60 * 24); // Difference in days

                        const newStartDate = new Date(originalEvent.start_date || originalEvent.startDate);
                        newStartDate.setDate(newStartDate.getDate() + dateDiff);

                        const newEndDate = new Date(originalEvent.end_date || originalEvent.endDate);
                        newEndDate.setDate(newEndDate.getDate() + dateDiff);

                        // Update the event's dates
                        await updateEventDates(originalEvent, newStartDate, newEndDate);
                      }}
                    >
                      {/* Add icon that appears on hover - only show for future dates */}
                      {!isDateInPast(day.date) && (
                        <button
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-primary text-white p-0.5 rounded-full shadow z-10 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent day click handler
                            setNewEventPrefillData({
                              startDate: formattedDate,
                              endDate: formattedDate
                            });
                            setIsNewEventModalOpen(true);
                          }}
                          aria-label="Add event to this day"
                        >
                          <span className="material-symbols-outlined text-xs">add</span>
                        </button>
                      )}
                      
                      <div className="flex justify-between">
                        <span className={`${isToday ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                          {day.date.getDate()}
                        </span>
                      </div>
                      <div className="mt-1 space-y-1 max-h-20 overflow-y-auto scrollbar-hide">
                        {dayEvents.slice(0, 3).map((event, idx) => (
                          <div
                            key={idx}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEventClick(event);
                            }}
                            draggable={view === 'month' || view === 'week'} // Enable dragging only in month and week views
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', JSON.stringify({
                                eventId: event.id,
                                originalStartDate: event.start_date || event.startDate,
                                originalEndDate: event.end_date || event.endDate
                              }));
                              e.currentTarget.classList.add('dragging');
                            }}
                            onDragEnd={(e) => {
                              e.currentTarget.classList.remove('dragging');
                            }}
                            onDragOver={(e) => {
                              e.preventDefault(); // Necessary to allow dropping
                            }}
                            onDrop={async (e) => {
                              e.preventDefault();
                              if (view !== 'month' && view !== 'week') return; // Only for month and week views

                              const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));
                              if (dragData.eventId !== event.id) return; // Only process drop on the same event

                              // Calculate new date based on the day being dropped on
                              const newDate = new Date(day.date);

                              // Get the original event from the state to get the full event object
                              const originalEvent = events.find(ev => ev.id === dragData.eventId);
                              if (!originalEvent) return;

                              // Calculate new start and end dates based on the difference
                              const originalStartDate = new Date(dragData.originalStartDate);
                              const originalStartDay = new Date(originalStartDate.getFullYear(), originalStartDate.getMonth(), originalStartDate.getDate());
                              const dateDiff = (newDate - originalStartDay) / (1000 * 60 * 60 * 24); // Difference in days

                              const newStartDate = new Date(originalEvent.start_date || originalEvent.startDate);
                              newStartDate.setDate(newStartDate.getDate() + dateDiff);

                              const newEndDate = new Date(originalEvent.end_date || originalEvent.endDate);
                              newEndDate.setDate(newEndDate.getDate() + dateDiff);

                              // Update the event's dates
                              await updateEventDates(originalEvent, newStartDate, newEndDate);
                            }}
                            className={`
                              text-xs p-1 rounded truncate relative cursor-move
                              ${event.color_class || 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200'}
                            `}
                          >
                            <div className="flex items-center justify-between">
                              <span className="truncate flex-1">{event.title}</span>
                              {event.status && event.status !== 'Scheduled' && (
                                <span className={`
                                  ml-1 text-[0.6rem] px-1 rounded
                                  ${event.status === 'Completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' : 
                                    event.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200' : 
                                    event.status === 'Cancelled' ? 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200' : 
                                    'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'}
                                `}>
                                  {event.status}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            +{dayEvents.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
      
      {view === 'week' && (
        <>
          {loading && !initialLoadComplete ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
              <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                  <div 
                    key={index}
                    className="p-4 text-center bg-gray-50 dark:bg-gray-700"
                  >
                    <div className="text-sm text-gray-500 dark:text-gray-400">{day}</div>
                    <div className="bg-gray-200 dark:bg-gray-600 h-6 w-8 rounded animate-pulse mt-1"></div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 min-h-96">
                {Array.from({ length: 7 }).map((_, index) => (
                  <div 
                    key={index} 
                    className="border-r border-gray-200 dark:border-gray-700 p-2 min-h-24"
                  >
                    <div className="space-y-2">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="bg-gray-200 dark:bg-gray-600 h-4 rounded animate-pulse"></div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
              <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => {
                  const date = new Date(currentDate);
                  const dayOffset = index - currentDate.getDay();
                  date.setDate(currentDate.getDate() + dayOffset);
                  
                  const isToday = 
                    date.getDate() === new Date().getDate() &&
                    date.getMonth() === new Date().getMonth() &&
                    date.getFullYear() === new Date().getFullYear();
                  
                  return (
                    <div 
                      key={index}
                      className={`p-4 text-center ${isToday ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-gray-50 dark:bg-gray-700'}`}
                    >
                      <div className="text-sm text-gray-500 dark:text-gray-400">{day}</div>
                      <div className={`text-lg font-medium ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                        {date.getDate()}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="grid grid-cols-7 min-h-96">
                {Array.from({ length: 7 }).map((_, index) => {
                  const date = new Date(currentDate);
                  const dayOffset = index - currentDate.getDay();
                  date.setDate(currentDate.getDate() + dayOffset);
                  
                  const dayEvents = events.filter(event => {
                    const eventDate = new Date(event.date || event.start_date);
                    return (
                      eventDate.getDate() === date.getDate() &&
                      eventDate.getMonth() === date.getMonth() &&
                      eventDate.getFullYear() === date.getFullYear()
                    );
                  });
                  
                  const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                  
                  return (
                    <div
                      key={index}
                      className={`border-r border-gray-200 dark:border-gray-700 p-2 min-h-24 overflow-y-auto relative group ${!isDateInPast(date) ? 'cursor-pointer' : 'opacity-50'}`}
                      onClick={() => handleDayClick(date)}
                      onDragOver={(e) => {
                        e.preventDefault(); // Necessary to allow dropping
                        if (!isDateInPast(date)) {
                          e.currentTarget.classList.add('drag-over');
                        }
                      }}
                      onDragLeave={(e) => {
                        e.currentTarget.classList.remove('drag-over');
                      }}
                      onDrop={async (e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('drag-over');
                        if (view !== 'week') return; // Only for week view
                        if (isDateInPast(date)) return; // Can't drop on past dates

                        const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));
                        const originalEvent = events.find(ev => ev.id === dragData.eventId);
                        if (!originalEvent) return;

                        // Calculate new start and end dates based on the difference
                        const originalStartDate = new Date(dragData.originalStartDate);
                        const originalStartDay = new Date(originalStartDate.getFullYear(), originalStartDate.getMonth(), originalStartDate.getDate());
                        const dateDiff = (date - originalStartDay) / (1000 * 60 * 60 * 24); // Difference in days

                        const newStartDate = new Date(originalEvent.start_date || originalEvent.startDate);
                        newStartDate.setDate(newStartDate.getDate() + dateDiff);

                        const newEndDate = new Date(originalEvent.end_date || originalEvent.endDate);
                        newEndDate.setDate(newEndDate.getDate() + dateDiff);

                        // Update the event's dates
                        await updateEventDates(originalEvent, newStartDate, newEndDate);
                      }}
                    >
                      {/* Add icon that appears on hover - only show for future dates */}
                      {!isDateInPast(date) && (
                        <button
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-primary text-white p-1 rounded-full shadow z-10 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent day click handler
                            setNewEventPrefillData({
                              startDate: formattedDate,
                              endDate: formattedDate
                            });
                            setIsNewEventModalOpen(true);
                          }}
                          aria-label="Add event to this day"
                        >
                          <span className="material-symbols-outlined text-xs">add</span>
                        </button>
                      )}
                      
                      <div className="max-h-40 overflow-y-auto scrollbar-hide">
                        {dayEvents.map((event, idx) => (
                          <div
                            key={idx}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEventClick(event);
                            }}
                            draggable={view === 'month' || view === 'week'} // Enable dragging only in month and week views
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', JSON.stringify({
                                eventId: event.id,
                                originalStartDate: event.start_date || event.startDate,
                                originalEndDate: event.end_date || event.endDate
                              }));
                              e.currentTarget.classList.add('dragging');
                            }}
                            onDragEnd={(e) => {
                              e.currentTarget.classList.remove('dragging');
                            }}
                            onDragOver={(e) => {
                              e.preventDefault(); // Necessary to allow dropping
                            }}
                            onDrop={async (e) => {
                              e.preventDefault();
                              if (view !== 'month' && view !== 'week') return; // Only for month and week views

                              const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));
                              if (dragData.eventId !== event.id) return; // Only process drop on the same event

                              // Calculate new date based on the day being dropped on
                              const newDate = new Date(date);

                              // Get the original event from the state to get the full event object
                              const originalEvent = events.find(ev => ev.id === dragData.eventId);
                              if (!originalEvent) return;

                              // Calculate new start and end dates based on the difference
                              const originalStartDate = new Date(dragData.originalStartDate);
                              const originalStartDay = new Date(originalStartDate.getFullYear(), originalStartDate.getMonth(), originalStartDate.getDate());
                              const dateDiff = (newDate - originalStartDay) / (1000 * 60 * 60 * 24); // Difference in days

                              const newStartDate = new Date(originalEvent.start_date || originalEvent.startDate);
                              newStartDate.setDate(newStartDate.getDate() + dateDiff);

                              const newEndDate = new Date(originalEvent.end_date || originalEvent.endDate);
                              newEndDate.setDate(newEndDate.getDate() + dateDiff);

                              // Update the event's dates
                              await updateEventDates(originalEvent, newStartDate, newEndDate);
                            }}
                            className={`
                              text-xs p-2 rounded mb-1 cursor-move
                              ${event.color_class || 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200'}
                            `}
                          >
                            <div className="font-medium truncate">{event.title}</div>
                            {event.status && event.status !== 'Scheduled' && (
                              <span className={`
                                text-[0.6rem] px-1 rounded
                                ${event.status === 'Completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' : 
                                  event.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200' : 
                                  event.status === 'Cancelled' ? 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200' : 
                                  'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'}
                              `}>
                                {event.status}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
      
      {view === 'day' && (
        <>
          {loading && !initialLoadComplete ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                <div className="bg-gray-200 dark:bg-gray-600 h-6 w-64 rounded animate-pulse"></div>
              </div>
              <div className="p-4 min-h-96">
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="p-3 rounded-lg">
                      <div className="bg-gray-200 dark:bg-gray-600 h-4 w-3/4 rounded animate-pulse mb-2"></div>
                      <div className="bg-gray-200 dark:bg-gray-600 h-3 w-1/2 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                  {currentDate.toLocaleString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </h3>
              </div>
              <div className="p-4 min-h-96">
                <div className="space-y-2 overflow-y-auto max-h-96 scrollbar-hide">
                  {events
                    .filter(event => {
                      const eventDate = new Date(event.date || event.start_date);
                      return (
                        eventDate.getDate() === currentDate.getDate() &&
                        eventDate.getMonth() === currentDate.getMonth() &&
                        eventDate.getFullYear() === currentDate.getFullYear()
                      );
                    })
                    .map((event, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleEventClick(event)}
                        className={`
                          p-3 rounded-lg cursor-pointer
                          ${event.color_class || 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200'}
                        `}
                      >
                        <div className="font-medium">{event.title}</div>
                        <div className="flex justify-between items-center">
                          <div className="text-sm opacity-80">{event.category}</div>
                          {event.status && event.status !== 'Scheduled' && (
                            <span className={`
                              text-xs px-2 py-0.5 rounded
                              ${event.status === 'Completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' : 
                                event.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200' : 
                                event.status === 'Cancelled' ? 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200' : 
                                'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'}
                            `}>
                              {event.status}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  {events.filter(event => {
                    const eventDate = new Date(event.date || event.start_date);
                    return (
                      eventDate.getDate() === currentDate.getDate() &&
                      eventDate.getMonth() === currentDate.getMonth() &&
                      eventDate.getFullYear() === currentDate.getFullYear()
                    );
                  }).length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      No events scheduled for today
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
      
      <NewEventModal 
        isOpen={isNewEventModalOpen} 
        onClose={() => setIsNewEventModalOpen(false)} 
        prefillData={newEventPrefillData}
        onSave={handleSaveEvent}
      />
      
      <ViewEventModal
        isOpen={isViewEventModalOpen}
        onClose={() => setIsViewEventModalOpen(false)}
        event={selectedEvent}
        onEventUpdate={() => {
          fetchEvents();
          triggerTaskUpdate();
          setTimeout(() => fetchNotifications(), 100);
        }}
      />
      
    </div>
    </>
  );
};

export default Calendar;