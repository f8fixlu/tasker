import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Button from '../components/common/Button';
import { useTaskUpdate } from '../context/TaskUpdateContext';
import { useNotificationUpdate } from '../context/NotificationUpdateContext';
import { eventService } from '../services/eventService';
import { holidayService } from '../services/holidayService';
import { Icon } from '../components/common/Icon';

const NewEventModal = React.lazy(() => import('../components/modals/NewEventModal'));
const ViewEventModal = React.lazy(() => import('../components/modals/ViewEventModal'));

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
  const { triggerTaskUpdate } = useTaskUpdate();
  const { triggerNotificationUpdate } = useNotificationUpdate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month'); // 'day', 'week', or 'month'
  const [isNewEventModalOpen, setIsNewEventModalOpen] = useState(false);
  const [isViewEventModalOpen, setIsViewEventModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [events, setEvents] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [newEventPrefillData, setNewEventPrefillData] = useState({});
  const [calendarEventPopup, setCalendarEventPopup] = useState(null);
  const popupTimeoutRef = useRef(null);
  const [savedHolidayKeys, setSavedHolidayKeys] = useState(new Set());

  // Compute "today" once per render to avoid 126+ new Date() calls per render
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return { date: d.getDate(), month: d.getMonth(), year: d.getFullYear(), raw: d };
  }, []);

  // Function to fetch events from the database using calendar endpoint
  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      // Calculate visible date range based on current view
      let startDate, endDate;
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();

      if (view === 'month') {
        // Full visible month grid: previous month overflow + current month + next month overflow
        const firstDay = new Date(year, month, 1);
        const startOffset = firstDay.getDay(); // Day of week of first day
        startDate = new Date(year, month, 1 - startOffset);
        endDate = new Date(year, month + 1, 6); // 6 extra days for next month grid
      } else if (view === 'week') {
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
        startDate = startOfWeek;
        endDate = new Date(startOfWeek);
        endDate.setDate(startOfWeek.getDate() + 6);
      } else {
        // Day view - just fetch the current day
        startDate = new Date(currentDate);
        endDate = new Date(currentDate);
      }

      const formatDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const response = await eventService.getCalendarEvents(formatDate(startDate), formatDate(endDate));
      setEvents(response.events || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
      if (!initialLoadComplete) {
        setInitialLoadComplete(true);
      }
    }
  }, [currentDate, view, initialLoadComplete]);

  // Fetch Philippine holidays from the backend
  const fetchHolidays = async () => {
    const year = currentDate.getFullYear();
    const data = await holidayService.getPhilippineHolidays(year);
    setHolidays(data);
  };

  // Convert a holiday object to an event-like object for display
  const holidayToEvent = (holiday) => ({
    id: `holiday-${holiday.date}-${holiday.name.replace(/\s+/g, '-')}`,
    title: holiday.name,
    isHoliday: true,
    color_class: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
    start_date: holiday.date,
    end_date: holiday.date,
    description: holiday.description || `${holiday.name} - Philippine Public Holiday`
  });

  const isDateOccupiedByEvent = (date) => {
    return events.some(event => {
      const eventDate = event.startDate || event.start_date;
      if (!eventDate) return false;
      const d = new Date(eventDate);
      if (isNaN(d.getTime())) return false;
      const eventDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return eventDateStr === date;
    });
  };

  const formatDateOnly = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Effect to load events and holidays when component mounts
  useEffect(() => {
    fetchEvents();
    fetchHolidays();
  }, [fetchEvents]);

  // Re-fetch holidays when the viewed year changes
  useEffect(() => {
    if (initialLoadComplete) {
      fetchHolidays();
    }
  }, [currentDate.getFullYear()]);

  // Function to check if a date is in the past
  const isDateInPast = useCallback((date) => {
    return date < today.raw;
  }, [today.raw]);

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

  // Generate calendar days for month view (memoized)
  const calendarDays = useMemo(() => {
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
  }, [currentDate.getFullYear(), currentDate.getMonth()]);

  // Helper function to filter events and holidays for a specific date (memoized per events/holidays change)
  const getEventsForDate = useCallback((date) => {
    const eventResults = events.filter(event => {
      const eventDate = new Date(event.startDate || event.start_date);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });

    const holidayResults = holidays
      .filter(h => {
        const hDate = new Date(h.date + 'T00:00:00');
        return (
          hDate.getDate() === date.getDate() &&
          hDate.getMonth() === date.getMonth() &&
          hDate.getFullYear() === date.getFullYear()
        );
      })
      .filter(h => !isDateOccupiedByEvent(h.date))
      .map(h => holidayToEvent(h));

    return [...holidayResults, ...eventResults];
  }, [events, holidays]);

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
      setTimeout(() => triggerNotificationUpdate(), 100);

      return true;
    } catch (error) {
      console.error('Error updating event dates:', error);
      return false;
    }
  };

  // Function to handle saving a new event
  const handleSaveEvent = async (eventData) => {
    try {
      const result = await eventService.createEvent(eventData);
      await fetchEvents(); // Refresh events after creation

      // Trigger notification refresh to update badge count
      triggerTaskUpdate();
      // Also fetch notifications directly for immediate update
      setTimeout(() => triggerNotificationUpdate(), 100);
      
      return result; // Return the result so the modal can extract the event ID
    } catch (error) {
      console.error('Error creating event:', error);
    }
  };

  const handleSaveHolidayAsEvent = async (holidayEvent) => {
    const date = holidayEvent.start_date?.slice(0, 10) || holidayEvent.date;
    const name = holidayEvent.title || holidayEvent.name;
    try {
      const eventData = {
        title: name,
        description: holidayEvent.description || `${name} - Philippine Public Holiday`,
        start_date: date + 'T00:00:00.000Z',
        end_date: date + 'T00:00:00.000Z',
        is_whole_day: true
      };
      await eventService.createEvent(eventData);
      setSavedHolidayKeys(prev => new Set([...prev, `${date}-${name}`]));
      await fetchEvents();
      triggerTaskUpdate();
      setTimeout(() => triggerNotificationUpdate(), 100);
    } catch (error) {
      console.error('Error saving holiday as event:', error);
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
                  <Icon name="chevron_left" className="" />
                </Button>
                <span className="text-lg font-semibold text-[#111418] dark:text-white hidden">
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
                  <Icon name="chevron_right" className="" />
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
                  <Icon name="chevron_left" className="" />
                </Button>
                <span className="text-lg font-semibold text-[#111418] dark:text-white hidden">
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
                  <Icon name="chevron_right" className="" />
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
                  <Icon name="chevron_left" className="" />
                </Button>
                <span className="text-lg font-semibold text-[#111418] dark:text-white hidden">
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
                  <Icon name="chevron_right" className="" />
                </Button>
              </>
            ) : null}
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              className="px-3 py-1.5 h-[34px]"
              onClick={() => setCurrentDate(new Date())}
            >
              Today
            </Button>
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
            variant="primary"
            className="flex items-center gap-2 h-[34px]"
            onClick={handleNewEventClick}
          >
            <Icon name="event" className="" />
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
                {calendarDays.map((day, index) => {
                  const isSelected = 
                    day.date.getDate() === currentDate.getDate() &&
                    day.date.getMonth() === currentDate.getMonth() &&
                    day.date.getFullYear() === currentDate.getFullYear();
                  
                  const isToday = 
                    day.date.getDate() === today.date &&
                    day.date.getMonth() === today.month &&
                    day.date.getFullYear() === today.year;
                  
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
                          <Icon name="add" className="text-xs" />
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
                              if (!event.isHoliday) handleEventClick(event);
                            }}
                            draggable={!event.isHoliday && (view === 'month' || view === 'week')}
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
                              e.preventDefault();
                            }}
                            onDrop={async (e) => {
                              e.preventDefault();
                              if (view !== 'month' && view !== 'week') return;

                              const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));
                              if (dragData.eventId !== event.id) return;

                              const newDate = new Date(day.date);

                              const originalEvent = events.find(ev => ev.id === dragData.eventId);
                              if (!originalEvent) return;

                              const originalStartDate = new Date(dragData.originalStartDate);
                              const originalStartDay = new Date(originalStartDate.getFullYear(), originalStartDate.getMonth(), originalStartDate.getDate());
                              const dateDiff = (newDate - originalStartDay) / (1000 * 60 * 60 * 24);

                              const newStartDate = new Date(originalEvent.start_date || originalEvent.startDate);
                              newStartDate.setDate(newStartDate.getDate() + dateDiff);

                              const newEndDate = new Date(originalEvent.end_date || originalEvent.endDate);
                              newEndDate.setDate(newEndDate.getDate() + dateDiff);

                              await updateEventDates(originalEvent, newStartDate, newEndDate);
                            }}
                            onMouseEnter={(e) => {
                              if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
                              const popupWidth = 312;
                              const estimatedHeight = 300;
                              const gap = 4;
                              const spaceRight = window.innerWidth - e.clientX;
                              const spaceBelow = window.innerHeight - e.clientY;
                              const x = spaceRight >= popupWidth + 12 ? e.clientX + 12 : e.clientX - popupWidth - 12;
                              const showAbove = spaceBelow < estimatedHeight + gap;
                              setCalendarEventPopup({ event, x, showAbove, cursorY: e.clientY });
                            }}
                            onMouseLeave={() => {
                              popupTimeoutRef.current = setTimeout(() => setCalendarEventPopup(null), 250);
                            }}
                            className={`
                              text-xs p-1 rounded truncate relative ${event.isHoliday ? 'cursor-default' : 'cursor-move'}
                              ${event.color_class || 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200'}
                            `}
                          >
                            <div className="flex items-center justify-between">
                              <span className="truncate flex-1">{event.title}</span>
                              {event.isHoliday ? (
                                <span className="ml-1 text-[0.6rem] px-1 rounded bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200">Holiday</span>
                              ) : event.status && event.status !== 'Scheduled' && (
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
                    date.getDate() === today.date &&
                    date.getMonth() === today.month &&
                    date.getFullYear() === today.year;
                  
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
                  
                  const dayEvents = [
                    ...holidays
                      .filter(h => {
                        const hDate = new Date(h.date + 'T00:00:00');
                        return (
                          hDate.getDate() === date.getDate() &&
                          hDate.getMonth() === date.getMonth() &&
                          hDate.getFullYear() === date.getFullYear()
                        );
                      })
                      .filter(h => !isDateOccupiedByEvent(h.date))
                      .map(h => holidayToEvent(h)),
                    ...events.filter(event => {
                      const eventDate = new Date(event.date || event.start_date);
                      return (
                        eventDate.getDate() === date.getDate() &&
                        eventDate.getMonth() === date.getMonth() &&
                        eventDate.getFullYear() === date.getFullYear()
                      );
                    })
                  ];
                  
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
                          <Icon name="add" className="text-xs" />
                        </button>
                      )}
                      
                      <div className="max-h-40 overflow-y-auto scrollbar-hide">
                        {dayEvents.map((event, idx) => (
                          <div
                            key={idx}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!event.isHoliday) handleEventClick(event);
                            }}
                            draggable={!event.isHoliday && (view === 'month' || view === 'week')}
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
                              e.preventDefault();
                            }}
                            onDrop={async (e) => {
                              e.preventDefault();
                              if (view !== 'month' && view !== 'week') return;

                              const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));
                              if (dragData.eventId !== event.id) return;

                              const newDate = new Date(date);

                              const originalEvent = events.find(ev => ev.id === dragData.eventId);
                              if (!originalEvent) return;

                              const originalStartDate = new Date(dragData.originalStartDate);
                              const originalStartDay = new Date(originalStartDate.getFullYear(), originalStartDate.getMonth(), originalStartDate.getDate());
                              const dateDiff = (newDate - originalStartDay) / (1000 * 60 * 60 * 24);

                              const newStartDate = new Date(originalEvent.start_date || originalEvent.startDate);
                              newStartDate.setDate(newStartDate.getDate() + dateDiff);

                              const newEndDate = new Date(originalEvent.end_date || originalEvent.endDate);
                              newEndDate.setDate(newEndDate.getDate() + dateDiff);

                              await updateEventDates(originalEvent, newStartDate, newEndDate);
                            }}
                            onMouseEnter={(e) => {
                              if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
                              const popupWidth = 312;
                              const estimatedHeight = 300;
                              const gap = 4;
                              const spaceRight = window.innerWidth - e.clientX;
                              const spaceBelow = window.innerHeight - e.clientY;
                              const x = spaceRight >= popupWidth + 12 ? e.clientX + 12 : e.clientX - popupWidth - 12;
                              const showAbove = spaceBelow < estimatedHeight + gap;
                              setCalendarEventPopup({ event, x, showAbove, cursorY: e.clientY });
                            }}
                            onMouseLeave={() => {
                              popupTimeoutRef.current = setTimeout(() => setCalendarEventPopup(null), 250);
                            }}
                            className={`
                              text-xs p-2 rounded mb-1 ${event.isHoliday ? 'cursor-default' : 'cursor-move'}
                              ${event.color_class || 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200'}
                            `}
                          >
                            <div className="font-medium truncate">{event.title}</div>
                            {event.isHoliday ? (
                              <span className="text-[0.6rem] px-1 rounded bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200">Holiday</span>
                            ) : event.status && event.status !== 'Scheduled' && (
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
              <div className="flex">
                <div className="flex-shrink-0 w-16 border-r border-gray-200 dark:border-gray-700">
                  {Array.from({ length: 24 }, (_, i) => {
                    const hour = i === 0 ? 12 : i > 12 ? i - 12 : i;
                    const ampm = i < 12 ? 'AM' : 'PM';
                    return (
                      <div key={i} className="h-16 border-b border-gray-100 dark:border-gray-700 flex items-start justify-center pt-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">{hour}{ampm}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex-1 min-h-96">
                  <div className="relative">
                    {Array.from({ length: 24 }, (_, i) => (
                      <div
                        key={i}
                        className={`h-16 border-b border-gray-100 dark:border-gray-700 transition-colors ${
                          (() => {
                            const slotDate = new Date(currentDate);
                            slotDate.setHours(i, 0, 0, 0);
                            return slotDate < new Date()
                              ? 'opacity-40 cursor-not-allowed'
                              : 'hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer';
                          })()
                        }`}
                        onClick={() => {
                          const slotDate = new Date(currentDate);
                          slotDate.setHours(i, 0, 0, 0);
                          if (slotDate < new Date()) return;
                          const dateStr = currentDate.toLocaleString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' });
                          const startTime = `${String(i).padStart(2, '0')}:00`;
                          const endTime = `${String(i + 1).padStart(2, '0')}:00`;
                          setNewEventPrefillData({ startDate: dateStr, endDate: dateStr, startTime, endTime });
                          setIsNewEventModalOpen(true);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          const slotDate = new Date(currentDate);
                          slotDate.setHours(i, 0, 0, 0);
                          if (slotDate >= new Date()) {
                            e.currentTarget.classList.add('bg-blue-100', 'dark:bg-blue-900/40');
                          }
                        }}
                        onDragLeave={(e) => {
                          e.currentTarget.classList.remove('bg-blue-100', 'dark:bg-blue-900/40');
                        }}
                        onDrop={async (e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove('bg-blue-100', 'dark:bg-blue-900/40');
                          const slotDate = new Date(currentDate);
                          slotDate.setHours(i, 0, 0, 0);
                          if (slotDate < new Date()) return;

                          const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));
                          const originalEvent = events.find(ev => ev.id === dragData.eventId);
                          if (!originalEvent) return;

                          const originalStart = new Date(originalEvent.start_date || originalEvent.startDate);
                          const originalEnd = new Date(originalEvent.end_date || originalEvent.endDate);
                          const durationMs = originalEnd - originalStart;

                          const newStartDate = new Date(currentDate);
                          newStartDate.setHours(i, 0, 0, 0);

                          const newEndDate = new Date(newStartDate.getTime() + durationMs);

                          const updateData = {
                            ...originalEvent,
                            start_date: newStartDate.toISOString(),
                            end_date: newEndDate.toISOString()
                          };
                          delete updateData.startDate;
                          delete updateData.endDate;

                          await eventService.updateEvent(originalEvent.id, updateData);
                          await fetchEvents();
                          triggerTaskUpdate();
                          setTimeout(() => triggerNotificationUpdate(), 100);
                        }}
                      ></div>
                    ))}
                    {(() => {
                      const dayItems = [
                        ...holidays
                          .filter(h => {
                            const hDate = new Date(h.date + 'T00:00:00');
                            return (
                              hDate.getDate() === currentDate.getDate() &&
                              hDate.getMonth() === currentDate.getMonth() &&
                              hDate.getFullYear() === currentDate.getFullYear()
                            );
                          })
                          .filter(h => !isDateOccupiedByEvent(h.date))
                          .map(h => holidayToEvent(h)),
                        ...events.filter(event => {
                          const eventDate = new Date(event.date || event.start_date);
                          return (
                            eventDate.getDate() === currentDate.getDate() &&
                            eventDate.getMonth() === currentDate.getMonth() &&
                            eventDate.getFullYear() === currentDate.getFullYear()
                          );
                        })
                      ];

                      return dayItems.length > 0 ? dayItems.map((event, idx) => {
                        const eventDate = new Date(event.start_date || event.date);
                        const hour = eventDate.getHours();
                        const minutes = eventDate.getMinutes();
                        const topOffset = hour * 64 + (minutes / 60) * 64;

                        let eventHeight = null;
                        if (event.end_date && !event.isHoliday) {
                          const endDate = new Date(event.end_date);
                          const endHour = endDate.getHours();
                          const endMinutes = endDate.getMinutes();
                          const durationMinutes = (endHour * 60 + endMinutes) - (hour * 60 + minutes);
                          eventHeight = Math.max((durationMinutes / 60) * 64, 24);
                        }

                        const eventStartDate = new Date(event.start_date || event.date);
                        const isPastEvent = eventStartDate < new Date();

                        return (
                          <div
                            key={idx}
                            onClick={() => {
                              if (!event.isHoliday) handleEventClick(event);
                            }}
                            onMouseEnter={(e) => {
                              if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
                              const popupWidth = 312;
                              const estimatedHeight = 300;
                              const gap = 4;
                              const spaceRight = window.innerWidth - e.clientX;
                              const spaceBelow = window.innerHeight - e.clientY;
                              const x = spaceRight >= popupWidth + 12 ? e.clientX + 12 : e.clientX - popupWidth - 12;
                              const showAbove = spaceBelow < estimatedHeight + gap;
                              setCalendarEventPopup({ event, x, showAbove, cursorY: e.clientY });
                            }}
                            onMouseLeave={() => {
                              popupTimeoutRef.current = setTimeout(() => setCalendarEventPopup(null), 250);
                            }}
                            draggable={!event.isHoliday && !isPastEvent}
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', JSON.stringify({
                                eventId: event.id,
                                originalStartDate: event.start_date || event.startDate,
                                originalEndDate: event.end_date || event.endDate
                              }));
                              e.currentTarget.classList.add('opacity-50');
                            }}
                            onDragEnd={(e) => {
                              e.currentTarget.classList.remove('opacity-50');
                            }}
                            className={`
                              absolute left-1 right-1 p-2 rounded text-xs overflow-hidden cursor-pointer
                              ${event.isHoliday ? 'cursor-default' : 'cursor-pointer'}
                              ${event.color_class || 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200'}
                            `}
                            style={{ top: `${topOffset}px`, height: eventHeight ? `${eventHeight}px` : undefined, minHeight: '24px' }}
                          >
                            <div className="font-medium truncate">{event.title}</div>
                            {event.isHoliday ? (
                              <div className="opacity-80 truncate">Holiday</div>
                            ) : (
                              <>
                                <div className="opacity-80 truncate">{event.category}</div>
                                <div className="opacity-60 truncate">
                                  {event.start_date ? new Date(event.start_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : ''}
                                  {event.end_date ? ` - ${new Date(event.end_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}` : ''}
                                </div>
                              </>
                            )}
                          </div>
                        );
                      }) : null;
                    })()}
                  </div>
                  {(() => {
                    const dayItems = [
                      ...holidays
                        .filter(h => {
                          const hDate = new Date(h.date + 'T00:00:00');
                          return (
                            hDate.getDate() === currentDate.getDate() &&
                            hDate.getMonth() === currentDate.getMonth() &&
                            hDate.getFullYear() === currentDate.getFullYear()
                          );
                        })
                        .filter(h => !isDateOccupiedByEvent(h.date))
                        .map(h => holidayToEvent(h)),
                      ...events.filter(event => {
                        const eventDate = new Date(event.date || event.start_date);
                        return (
                          eventDate.getDate() === currentDate.getDate() &&
                          eventDate.getMonth() === currentDate.getMonth() &&
                          eventDate.getFullYear() === currentDate.getFullYear()
                        );
                      })
                    ];

                    return dayItems.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          No events scheduled for today
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </>
      )}
      
      <React.Suspense fallback={null}>
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
            setTimeout(() => triggerNotificationUpdate(), 100);
          }}
        />
      </React.Suspense>
      
      {/* Event hover popup */}
      {calendarEventPopup && (
        <div
          className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-3 min-w-[240px] max-w-[300px]"
          style={{ left: calendarEventPopup.x, ...(calendarEventPopup.showAbove ? { bottom: window.innerHeight - calendarEventPopup.cursorY + 4 } : { top: calendarEventPopup.cursorY + 4 }) }}
          onMouseEnter={() => {
            if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
          }}
          onMouseLeave={() => {
            popupTimeoutRef.current = setTimeout(() => setCalendarEventPopup(null), 250);
          }}
        >
          {calendarEventPopup.event.isHoliday ? (
            <>
              <div className="flex items-center gap-2 mb-2 border-b border-gray-200 dark:border-gray-700 pb-1.5">
                <Icon name="celebration" className="text-red-500 text-sm" />
                <span className="font-semibold text-sm text-gray-900 dark:text-white">
                  {calendarEventPopup.event.title}
                </span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Philippine Public Holiday
              </div>
              {calendarEventPopup.event.description && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-3">
                  {calendarEventPopup.event.description}
                </div>
              )}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 dark:text-gray-400 w-16 shrink-0">Date</span>
                  <span className="text-gray-700 dark:text-gray-300">
                    {calendarEventPopup.event.start_date?.slice(0, 10) || 'N/A'}
                  </span>
                </div>
              </div>
              {(() => {
                const popupDate = calendarEventPopup.event.start_date?.slice(0, 10) || calendarEventPopup.event.date;
                return !isDateOccupiedByEvent(popupDate);
              })() && (
                <button
                  className="mt-2 w-full text-xs bg-blue-600 text-white rounded py-1.5 hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSaveHolidayAsEvent(calendarEventPopup.event);
                    setCalendarEventPopup(null);
                  }}
                >
                  <Icon name="add" className="text-xs" />
                  Save as Event
                </button>
              )}
            </>
          ) : (
            <>
              <div className="font-semibold text-sm text-gray-900 dark:text-white mb-2 border-b border-gray-200 dark:border-gray-700 pb-1.5">
                {calendarEventPopup.event.title || 'Event Details'}
              </div>
              {calendarEventPopup.event.description && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-3">
                  {calendarEventPopup.event.description}
                </div>
              )}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 dark:text-gray-400 w-16 shrink-0">Status</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium capitalize ${
                    calendarEventPopup.event.status === 'Completed' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                    calendarEventPopup.event.status === 'In Progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                    calendarEventPopup.event.status === 'Cancelled' ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' :
                    'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {calendarEventPopup.event.status || 'Scheduled'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 dark:text-gray-400 w-16 shrink-0">Category</span>
                  <span className="text-gray-700 dark:text-gray-300">{calendarEventPopup.event.category || 'N/A'}</span>
                </div>
                {calendarEventPopup.event.event_type && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 dark:text-gray-400 w-16 shrink-0">Type</span>
                    <span className="text-gray-700 dark:text-gray-300 capitalize">{calendarEventPopup.event.event_type}</span>
                  </div>
                )}
                {calendarEventPopup.event.location && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 dark:text-gray-400 w-16 shrink-0">Location</span>
                    <span className="text-gray-700 dark:text-gray-300 truncate">{calendarEventPopup.event.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 dark:text-gray-400 w-16 shrink-0">Start</span>
                  <span className="text-gray-700 dark:text-gray-300">{formatDateOnly(calendarEventPopup.event.start_date || calendarEventPopup.event.startDate)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 dark:text-gray-400 w-16 shrink-0">End</span>
                  <span className="text-gray-700 dark:text-gray-300">{formatDateOnly(calendarEventPopup.event.end_date || calendarEventPopup.event.endDate)}</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
    </>
  );
};

export default Calendar;