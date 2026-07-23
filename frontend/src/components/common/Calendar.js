import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Icon } from './Icon';

const Calendar = ({ events = [], onDayClick, onEventClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Function to get the first day of the month
  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  };

  // Function to get the number of days in a month
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  // Function to get the day of the week for the first day of the month (0 = Sunday, 1 = Monday, etc.)
  const getFirstDayOfWeek = (date) => {
    return getFirstDayOfMonth(date).getDay();
  };

  // Function to navigate to the previous month
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  // Function to navigate to the next month
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Function to navigate to the current month
  const goToCurrentMonth = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  // Generate calendar days
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

  // Filter events for a specific date
  const getEventsForDate = (date) => {
    return events.filter(event => {
      const eventDate = new Date(event.date || event.start_date);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });
  };

  // Handle day click
  const handleDayClick = (date) => {
    setSelectedDate(date);
    if (onDayClick) {
      onDayClick(date);
    }
  };

  // Handle event click
  const handleEventClick = (event) => {
    if (onEventClick) {
      onEventClick(event);
    }
  };

  const calendarDays = generateCalendarDays();
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
      <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
          {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h2>
        <div className="flex items-center gap-2">
          <button 
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={prevMonth}
          >
            <Icon name="chevron_left" className="text-gray-600 dark:text-gray-300" />
          </button>
          <button 
            className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
            onClick={goToCurrentMonth}
          >
            Today
          </button>
          <button 
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={nextMonth}
          >
            <Icon name="chevron_right" className="text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-7">
        {weekdays.map((day) => (
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
            day.date.getDate() === selectedDate.getDate() &&
            day.date.getMonth() === selectedDate.getMonth() &&
            day.date.getFullYear() === selectedDate.getFullYear();
          
          const isToday = 
            day.date.getDate() === new Date().getDate() &&
            day.date.getMonth() === new Date().getMonth() &&
            day.date.getFullYear() === new Date().getFullYear();
          
          const dayEvents = getEventsForDate(day.date);
          
          return (
            <div
              key={index}
              onClick={() => handleDayClick(day.date)}
              className={`
                p-2 border-r border-b border-gray-200 dark:border-gray-700 min-h-24
                ${day.isCurrentMonth ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}
                ${isSelected ? 'bg-blue-50 dark:bg-blue-900/30' : ''}
                ${isToday ? 'bg-blue-100 dark:bg-blue-900/50 font-bold' : ''}
                hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer
              `}
            >
              <div className="flex justify-between">
                <span className={`${isToday ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                  {day.date.getDate()}
                </span>
              </div>
              <div className="mt-1 space-y-1 max-h-20 overflow-y-auto">
                {dayEvents.slice(0, 3).map((event, idx) => (
                  <div
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEventClick(event);
                    }}
                    className={`
                      text-xs p-1 rounded truncate
                      ${
                        event.category === 'Meeting' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200' :
                        event.category === 'Deadline' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200' :
                        event.category === 'Personal' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' :
                        'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200'
                      }
                    `}
                  >
                    {event.title}
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
  );
};

Calendar.propTypes = {
  events: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number.isRequired,
    title: PropTypes.string.isRequired,
    date: PropTypes.string, // YYYY-MM-DD format
    start_date: PropTypes.string, // Alternative date field name
    category: PropTypes.string,
    startTime: PropTypes.string, // HH:MM format
    endTime: PropTypes.string // HH:MM format
  })),
  onDayClick: PropTypes.func,
  onEventClick: PropTypes.func
};

export default Calendar;