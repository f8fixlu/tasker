import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../hooks/useModal';
import { useDebounce } from '../hooks/useDebounce';
import { taskService } from '../services/taskService';
import { eventService } from '../services/eventService';
import { optimizedDateUtils, formatToLocalDateTime } from '../utils/dateOptimized';
import Tooltip from '../components/common/Tooltip';
import ViewTaskModal from '../components/modals/ViewTaskModal';
import { useTaskUpdate } from '../context/TaskUpdateContext';
import Skeleton from '../components/common/Skeleton';
import { TaskStatsSkeleton, EventStatsSkeleton, RecentTasksSkeleton, TaskOverviewSkeleton } from '../components/common/Skeleton';
import WelcomeModal from '../components/common/WelcomeModal';

// Function to truncate text if too long
const truncateText = (text, maxLength = 50) => {
  if (!text) return 'N/A';
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

const Dashboard = () => {
  const { user } = useAuth();
  const { openViewTaskModal } = useModal();
  const { updateTrigger } = useTaskUpdate(); // Get the task update trigger state
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [stats, setStats] = useState({
    totalTasks: 0,
    recentTasks: 0,
    tasksToday: 0,
    tasksThisMonth: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0
  });
  const [eventStats, setEventStats] = useState({
    totalEvents: 0,
    completedEvents: 0,  // Note: events don't have status like tasks, so this will be 0 for now
    eventsToday: 0,
    eventsThisMonth: 0
  });
  const [recentTasks, setRecentTasks] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);
  const [loading, setLoading] = useState(false); // Changed to false since we're using progressive loading
  const [loadingStates, setLoadingStates] = useState({
    taskStats: true,
    eventStats: true,
    recentTasks: true,
    upcomingEvents: true,
    upcomingDeadlines: true
  });
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [error, setError] = useState(null);


  // Define the dashboard data fetching function with true progressive loading
  const fetchDashboardData = useCallback(async () => {
    try {
      setError(null);

      // Reset stats initially but don't set global loading to true since we're doing progressive loading
      setStats({
        totalTasks: 0,
        recentTasks: 0,
        tasksToday: 0,
        tasksThisMonth: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        pendingTasks: 0,
        overdueTasks: 0,
        archivedTasks: 0
      });

      setEventStats({
        totalEvents: 0,
        completedEvents: 0,
        eventsToday: 0,
        eventsThisMonth: 0
      });

      // Set initial loading state for each section individually
      // We'll manage loading state per section rather than globally

      // Run all API calls in parallel to improve performance
      // Each will update its respective state as it completes
      const [statsResponse, eventStatsResponse, tasksResponse, eventsResponse] = await Promise.allSettled([
        taskService.getTaskStats(),
        eventService.getEventStats(),
        taskService.getAllTasks({ limit: 20 }), // Get enough tasks for both recent tasks and deadlines
        eventService.getUpcomingEvents(5)
      ]);

      // Process task stats
      if (statsResponse.status === 'fulfilled') {
        const apiStats = statsResponse.value.stats || statsResponse.value.taskStats || {};
        setStats(prev => ({
          ...prev,
          totalTasks: apiStats.total_tasks || 0,
          recentTasks: apiStats.recent_tasks || 0,
          tasksToday: apiStats.tasks_today || 0,
          tasksThisMonth: apiStats.tasks_this_month || 0,
          completedTasks: apiStats.completed_tasks || 0,
          inProgressTasks: apiStats.in_progress_tasks || 0,
          pendingTasks: apiStats.pending_tasks || 0,
          overdueTasks: apiStats.overdue_tasks || 0,
          archivedTasks: apiStats.archived_tasks || 0
        }));
        setLoadingStates(prev => ({ ...prev, taskStats: false })); // Mark as loaded
      } else {
        console.error('Error fetching task stats:', statsResponse.reason);
        setLoadingStates(prev => ({ ...prev, taskStats: false })); // Still mark as loaded to stop showing loader
      }

      // Process event stats
      if (eventStatsResponse.status === 'fulfilled') {
        const apiEventStats = eventStatsResponse.value.stats || eventStatsResponse.value.eventStats || {};
        setEventStats(prev => ({
          ...prev,
          totalEvents: apiEventStats.total_events || 0,
          completedEvents: apiEventStats.completed_events || 0,
          eventsToday: apiEventStats.events_today || 0,
          eventsThisMonth: apiEventStats.events_this_month || 0
        }));
        setLoadingStates(prev => ({ ...prev, eventStats: false })); // Mark as loaded
      } else {
        console.error('Error fetching event stats:', eventStatsResponse.reason);
        setLoadingStates(prev => ({ ...prev, eventStats: false })); // Still mark as loaded to stop showing loader
      }

      // Process both recent tasks and upcoming deadlines from the same API response
      if (tasksResponse.status === 'fulfilled') {
        const tasks = tasksResponse.value.tasks || tasksResponse.value.data || [];

        // Process recent tasks (first 5 from the response)
        const recentTasksList = tasks.slice(0, 5);
        const formattedRecentTasks = recentTasksList.map(task => ({
          id: task.id,
          taskName: task.title,
          status: task.status,
          dueDate: task.due_date ? optimizedDateUtils.memoizedFormatDate(task.due_date, 'dateTime') : 'N/A',
          dashboardPriority: task.priority ? task.priority.toLowerCase() : 'medium',
          category: task.category_name,
          title: task.title,
          description: task.description || 'No description provided',
          due_date: task.due_date,
          task_date: task.task_date,
          created_date: task.created_date,
          edited_date: task.edited_date,
          category_name: task.category_name,
          type_name: task.type_name,
          sub_type_name: task.sub_type_name,
          quantity: task.quantity,
          priority: task.priority,
          category_id: task.category_id,
          type_id: task.type_id,
          sub_type_id: task.sub_type_id
        }));
        setRecentTasks(formattedRecentTasks);
        setLoadingStates(prev => ({ ...prev, recentTasks: false })); // Mark as loaded

        // Process upcoming deadlines
        const today = new Date();
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

        let deadlineTasks = tasks.filter(task => {
          if (!task.due_date || task.status === 'Completed') return false;
          const dueDate = new Date(task.due_date);
          return dueDate >= today && dueDate <= nextWeek;
        });

        deadlineTasks.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
        deadlineTasks = deadlineTasks.slice(0, 5);

        const formattedDeadlines = deadlineTasks.map(task => {
          const dueDate = new Date(task.due_date);
          const formattedDate = optimizedDateUtils.memoizedFormatDate(dueDate, 'dateOnly');
          const timeStr = optimizedDateUtils.memoizedFormatDate(dueDate, 'timeOnly');

          return {
            id: task.id,
            title: task.title,
            description: task.description,
            date: formattedDate,
            time: timeStr,
            category_name: task.category_name || 'N/A',
            type_name: task.type_name || 'N/A',
            priority: task.priority || 'Medium',
            color_class: task.priority ?
              (task.priority.toLowerCase() === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200' :
               task.priority.toLowerCase() === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200' :
               'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200') :
              'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
          };
        });

        setUpcomingDeadlines(formattedDeadlines);
        setLoadingStates(prev => ({ ...prev, upcomingDeadlines: false })); // Mark as loaded
      } else {
        console.error('Error fetching tasks for dashboard:', tasksResponse.reason);
        setRecentTasks([]);
        setUpcomingDeadlines([]);
        setLoadingStates(prev => ({ ...prev, recentTasks: false, upcomingDeadlines: false })); // Mark as loaded
      }

      // Process upcoming events
      if (eventsResponse.status === 'fulfilled') {
        const events = eventsResponse.value.events || eventsResponse.value.data || [];

        const formattedEvents = events.map(event => {
          if (!event.start_date) return null;

          const dateStr = event.start_date || 'N/A';
          const eventDate = new Date(dateStr);
          const formattedDate = optimizedDateUtils.memoizedFormatDate(eventDate, 'dateOnly');

          let timeStr = 'N/A';
          if (event.start_date && event.end_date) {
            const startDate = new Date(event.start_date);
            const endDate = new Date(event.end_date);
            timeStr = `${optimizedDateUtils.memoizedFormatDate(startDate, 'timeOnly')} - ${optimizedDateUtils.memoizedFormatDate(endDate, 'timeOnly')}`;
          } else if (event.start_date) {
            const startDate = new Date(event.start_date);
            timeStr = optimizedDateUtils.memoizedFormatDate(startDate, 'timeOnly');
          }

          return {
            id: event.id,
            title: event.title,
            date: formattedDate,
            time: timeStr,
            location: event.location || 'N/A',
            category_name: event.category || 'N/A',
            color_class: event.color_class
          };
        }).filter(Boolean);

        setUpcomingEvents(formattedEvents);
        setLoadingStates(prev => ({ ...prev, upcomingEvents: false })); // Mark as loaded
      } else {
        console.error('Error fetching upcoming events:', eventsResponse.reason);
        setUpcomingEvents([]);
        setLoadingStates(prev => ({ ...prev, upcomingEvents: false })); // Mark as loaded
      }

    } catch (err) {
      console.error('General error in dashboard data fetching:', err);
      setError('Failed to load dashboard data. Please try again later.');

      // Set default empty states to prevent UI issues
      setRecentTasks([]);
      setUpcomingEvents([]);
      setUpcomingDeadlines([]);
    } finally {
      // Only set initialLoadComplete after all data is processed
      if (!initialLoadComplete) {
        setInitialLoadComplete(true);
      }
    }
  }, [initialLoadComplete]);

  // Check if welcome modal should be shown
  useEffect(() => {
    if (user?.id) {
      // Check if the user has already seen the welcome modal based on the database flag
      const hasSeenWelcome = user.welcome_shown === 1;
      const hasSeenWelcomeLocally = localStorage.getItem(`welcomeModalSeen_${user.id}`);

      if (!hasSeenWelcome && !hasSeenWelcomeLocally) {
        setShowWelcomeModal(true);
      }
    }
  }, [user]);

  // Initial data fetch
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]); // Run once when component mounts

  // Debounced refresh for task updates to prevent excessive API calls
  const debouncedRefresh = useCallback(
    (() => {
      let timeoutId;
      return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          fetchDashboardData(...args);
        }, 500); // 500ms delay
      };
    })(),
    [fetchDashboardData]
  );

  // Refresh dashboard data when task updates occur
  useEffect(() => {
    debouncedRefresh();
  }, [updateTrigger, debouncedRefresh]); // Run when updateTrigger changes

  // Memoize the transformed task data to prevent unnecessary recalculations
  const handleViewTask = useCallback((task) => {
    // Transform task data for ViewTaskModal
    const transformedTask = {
      ...task,
      dueDate: task.due_date ? formatToLocalDateTime(task.due_date) : 'N/A',
      taskDate: task.task_date ? formatToLocalDateTime(task.task_date) : 'N/A',
      createdDate: task.created_date ? formatToLocalDateTime(task.created_date) : 'N/A',
      editedDate: task.edited_date ? formatToLocalDateTime(task.edited_date) : 'N/A',
      category: task.category_name,
      type: task.type_name,
      subType: task.sub_type_name
    };
    // Use modal context to open view modal
    openViewTaskModal(transformedTask);
  }, [openViewTaskModal]);

  // Memoize the recent tasks table rows to prevent unnecessary re-renders
  const recentTasksRows = useMemo(() => {
    return recentTasks.map((task) => (
      <tr key={task.id} className="border-b border-border-light dark:border-border-dark hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
        <td className="py-3 px-3 sm:px-4 text-text-light dark:text-text-dark">
          <Tooltip content={task.description || 'No description provided'} position="top">
            <span className="cursor-default">{truncateText(task.taskName, 30)}</span>
          </Tooltip>
        </td>
        <td className="py-3 px-3 sm:px-4 text-text-light dark:text-text-dark">{task.category || 'N/A'}</td>
        <td className="py-3 px-3 sm:px-4">
          <div className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
            task.status === 'Completed'
              ? 'bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-400'
              : task.status === 'In Progress'
                ? 'bg-warning-100 text-warning-800 dark:bg-warning-900/30 dark:text-warning-400'
                : task.status === 'Overdue'
                  ? 'bg-error-100 text-error-800 dark:bg-error-900/30 dark:text-error-400'
                  : 'bg-danger-100 text-danger-800 dark:bg-danger-900/30 dark:text-danger-400'
          }`}>
            {task.status}
          </div>
        </td>
        <td className="py-3 px-3 sm:px-4 text-text-secondary-light dark:text-text-secondary-dark">{task.dueDate}</td>
        <td className="py-3 px-3 sm:px-4">
          <button
            className="text-text-secondary-light hover:text-primary-600 dark:text-text-secondary-dark dark:hover:text-primary-400"
            onClick={() => handleViewTask(task)}
          >
            <span className="material-symbols-outlined text-base">visibility</span>
          </button>
        </td>
      </tr>
    ));
  }, [recentTasks, handleViewTask]);

  // Memoize the upcoming deadlines to prevent unnecessary re-renders
  const upcomingDeadlinesContent = useMemo(() => {
    if (upcomingDeadlines.length > 0) {
      return upcomingDeadlines.map((deadline) => (
        <div key={deadline.id} className="flex items-start gap-3 sm:gap-4 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          <div className="flex flex-col items-center shrink-0">
            <span className={`font-bold ${
              deadline.color_class ?
                (deadline.color_class.includes('red') ? 'text-red-600 dark:text-red-400' :
                 deadline.color_class.includes('yellow') ? 'text-yellow-600 dark:text-yellow-400' :
                 deadline.color_class.includes('green') ? 'text-green-600 dark:text-green-400' :
                 deadline.color_class.includes('blue') ? 'text-blue-600 dark:text-blue-400' :
                 'text-primary-600')
              : 'text-primary-600'
            }`}>
              {deadline.date.split(' ')[1]}
            </span>
            <span className={`text-xs ${
              deadline.color_class ?
                (deadline.color_class.includes('red') ? 'text-red-500 dark:text-red-300' :
                 deadline.color_class.includes('yellow') ? 'text-yellow-500 dark:text-yellow-300' :
                 deadline.color_class.includes('green') ? 'text-green-500 dark:text-green-300' :
                 deadline.color_class.includes('blue') ? 'text-blue-500 dark:text-blue-300' :
                 'text-text-secondary-light dark:text-text-secondary-dark')
              : 'text-text-secondary-light dark:text-text-secondary-dark'
            }`}>
              {deadline.date.split(' ')[0]}
            </span>
          </div>
          <div className={`flex-1 border-l-2 ${
            deadline.color_class ?
              (deadline.color_class.includes('red') ? 'border-red-600' :
               deadline.color_class.includes('yellow') ? 'border-yellow-600' :
               deadline.color_class.includes('green') ? 'border-green-600' :
               deadline.color_class.includes('blue') ? 'border-blue-600' :
               'border-primary-600')
            : 'border-primary-600'
          } pl-3 sm:pl-4`}>
            <p className="font-medium text-text-light dark:text-text-dark">{deadline.title}</p>
            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">{deadline.time}</p>
            <div className="flex gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                deadline.color_class.includes('red') ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200' :
                deadline.color_class.includes('yellow') ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200' :
                deadline.color_class.includes('green') ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' :
                deadline.color_class.includes('blue') ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200' :
                'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
              }`}>
                {deadline.priority}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                {deadline.category_name}
              </span>
            </div>
          </div>
        </div>
      ));
    } else {
      return <p className="text-text-secondary-light dark:text-text-secondary-dark text-center py-4">No upcoming deadlines</p>;
    }
  }, [upcomingDeadlines]);

  // Memoize the upcoming events to prevent unnecessary re-renders
  const upcomingEventsContent = useMemo(() => {
    if (upcomingEvents.length > 0) {
      return upcomingEvents.map((event) => (
        <div key={event.id} className="flex items-start gap-3 sm:gap-4 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          <div className="flex flex-col items-center shrink-0">
            <span className={`font-bold ${
              event.color_class ?
                (event.color_class.includes('blue') ? 'text-blue-600 dark:text-blue-400' :
                 event.color_class.includes('red') ? 'text-red-600 dark:text-red-400' :
                 event.color_class.includes('green') ? 'text-green-600 dark:text-green-400' :
                 event.color_class.includes('purple') ? 'text-purple-600 dark:text-purple-400' :
                 event.color_class.includes('yellow') ? 'text-yellow-600 dark:text-yellow-400' :
                 event.color_class.includes('pink') ? 'text-pink-600 dark:text-pink-400' :
                 event.color_class.includes('indigo') ? 'text-indigo-600 dark:text-indigo-400' :
                 event.color_class.includes('teal') ? 'text-teal-600 dark:text-teal-400' :
                 event.color_class.includes('orange') ? 'text-orange-600 dark:text-orange-400' :
                 event.color_class.includes('cyan') ? 'text-cyan-600 dark:text-cyan-400' :
                 event.color_class.includes('lime') ? 'text-lime-600 dark:text-lime-400' :
                 event.color_class.includes('amber') ? 'text-amber-600 dark:text-amber-400' :
                 'text-primary-600')
              : 'text-primary-600'
            }`}>
              {event.date.split(' ')[1]}
            </span>
            <span className={`text-xs ${
              event.color_class ?
                (event.color_class.includes('blue') ? 'text-blue-500 dark:text-blue-300' :
                 event.color_class.includes('red') ? 'text-red-500 dark:text-red-300' :
                 event.color_class.includes('green') ? 'text-green-500 dark:text-green-300' :
                 event.color_class.includes('purple') ? 'text-purple-500 dark:text-purple-300' :
                 event.color_class.includes('yellow') ? 'text-yellow-500 dark:text-yellow-300' :
                 event.color_class.includes('pink') ? 'text-pink-500 dark:text-pink-300' :
                 event.color_class.includes('indigo') ? 'text-indigo-500 dark:text-indigo-300' :
                 event.color_class.includes('teal') ? 'text-teal-500 dark:text-teal-300' :
                 event.color_class.includes('orange') ? 'text-orange-500 dark:text-orange-300' :
                 event.color_class.includes('cyan') ? 'text-cyan-500 dark:text-cyan-300' :
                 event.color_class.includes('lime') ? 'text-lime-500 dark:text-lime-300' :
                 event.color_class.includes('amber') ? 'text-amber-500 dark:text-amber-300' :
                 'text-text-secondary-light dark:text-text-secondary-dark')
              : 'text-text-secondary-light dark:text-text-secondary-dark'
            }`}>
              {event.date.split(' ')[0]}
            </span>
          </div>
          <div className={`flex-1 border-l-2 ${
            event.color_class ?
              (event.color_class.includes('blue') ? 'border-blue-600' :
               event.color_class.includes('red') ? 'border-red-600' :
               event.color_class.includes('green') ? 'border-green-600' :
               event.color_class.includes('purple') ? 'border-purple-600' :
               event.color_class.includes('yellow') ? 'border-yellow-600' :
               event.color_class.includes('pink') ? 'border-pink-600' :
               event.color_class.includes('indigo') ? 'border-indigo-600' :
               event.color_class.includes('teal') ? 'border-teal-600' :
               event.color_class.includes('orange') ? 'border-orange-600' :
               event.color_class.includes('cyan') ? 'border-cyan-600' :
               event.color_class.includes('lime') ? 'border-lime-600' :
               event.color_class.includes('amber') ? 'border-amber-600' :
               'border-primary-600')
            : 'border-primary-600'
          } pl-3 sm:pl-4`}>
            <p className="font-medium text-text-light dark:text-text-dark">{event.title}</p>
            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">{event.time}</p>
            <p className={`text-xs ${
              event.color_class ?
                (event.color_class.includes('blue') ? 'text-blue-600/80 dark:text-blue-400/80' :
                 event.color_class.includes('red') ? 'text-red-600/80 dark:text-red-400/80' :
                 event.color_class.includes('green') ? 'text-green-600/80 dark:text-green-400/80' :
                 event.color_class.includes('purple') ? 'text-purple-600/80 dark:text-purple-400/80' :
                 event.color_class.includes('yellow') ? 'text-yellow-600/80 dark:text-yellow-400/80' :
                 event.color_class.includes('pink') ? 'text-pink-600/80 dark:text-pink-400/80' :
                 event.color_class.includes('indigo') ? 'text-indigo-600/80 dark:text-indigo-400/80' :
                 event.color_class.includes('teal') ? 'text-teal-600/80 dark:text-teal-400/80' :
                 event.color_class.includes('orange') ? 'text-orange-600/80 dark:text-orange-400/80' :
                 event.color_class.includes('cyan') ? 'text-cyan-600/80 dark:text-cyan-400/80' :
                 event.color_class.includes('lime') ? 'text-lime-600/80 dark:text-lime-400/80' :
                 event.color_class.includes('amber') ? 'text-amber-600/80 dark:text-amber-400/80' :
                 'text-primary-600/80 dark:text-primary-400/80')
              : 'text-primary-600/80 dark:text-primary-400/80'
            }`}>
              {event.location}
            </p>
          </div>
        </div>
      ));
    } else {
      return <p className="text-text-secondary-light dark:text-text-secondary-dark text-center py-4">No upcoming events</p>;
    }
  }, [upcomingEvents]);

  // Show skeleton for only the data sections during initial load
  if (loading && !initialLoadComplete) {
    return (
      <div className="layout-content-container flex flex-col w-full gap-4 sm:gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-text-light dark:text-text-dark text-2xl sm:text-3xl font-bold">Dashboard</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 flex flex-col gap-4 sm:gap-6">
            <TaskStatsSkeleton />
            <EventStatsSkeleton />
            <RecentTasksSkeleton />
          </div>

          <div className="flex flex-col gap-4 sm:gap-6">
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-card p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <Skeleton type="button" className="w-6 h-6 text-gray-400" />
                </div>
                <div>
                  <Skeleton type="text" className="w-16 h-4 mb-1" />
                  <Skeleton type="text" className="w-24 h-5" />
                </div>
              </div>
            </div>

            <TaskOverviewSkeleton />

            <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-card p-4 sm:p-6">
              <h2 className="text-text-light dark:text-text-dark text-xl sm:text-[22px] font-bold pb-3">Upcoming Deadlines</h2>
              <div className="flex flex-col gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-start gap-3 sm:gap-4">
                    <Skeleton type="text" className="w-8 h-10" />
                    <div className="flex-1 border-l-2 border-primary-600 pl-3 sm:pl-4">
                      <Skeleton type="text" className="w-32 mb-1" />
                      <Skeleton type="text" className="w-24 h-4" />
                      <div className="flex gap-2 mt-1">
                        <Skeleton type="text" className="w-12 h-4" />
                        <Skeleton type="text" className="w-16 h-4" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-card p-4 sm:p-6">
              <h2 className="text-text-light dark:text-text-dark text-xl sm:text-[22px] font-bold pb-3">Upcoming Events</h2>
              <div className="flex flex-col gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-start gap-3 sm:gap-4">
                    <Skeleton type="text" className="w-8 h-10" />
                    <div className="flex-1 border-l-2 border-primary-600 pl-3 sm:pl-4">
                      <Skeleton type="text" className="w-32 mb-1" />
                      <Skeleton type="text" className="w-24 h-4" />
                      <Skeleton type="text" className="w-16 h-3" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="layout-content-container flex flex-col w-full gap-8 items-center justify-center h-64">
        <div className="text-red-500 text-center">
          <p className="text-lg font-medium">Error loading dashboard</p>
          <p className="text-base">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="layout-content-container flex flex-col w-full gap-4 sm:gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-text-light dark:text-text-dark text-2xl sm:text-3xl font-bold">Dashboard</h1>
      </div>

      <WelcomeModal
        user={user}
        isOpen={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
      />

      {/* Today box moved to appear first on screens <1024px */}
      <div className="lg:hidden bg-surface-light dark:bg-surface-dark rounded-xl shadow-card p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-xl">today</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-secondary-light dark:text-text-secondary-dark">Today</h3>
            <p className="text-base font-medium text-text-light dark:text-text-dark">{optimizedDateUtils.memoizedFormatDate(new Date().toISOString(), 'fullDateWithDay')}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 flex flex-col gap-4 sm:gap-6">
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-card p-4 sm:p-6">
            <h2 className="text-text-light dark:text-text-dark text-xl sm:text-[22px] font-bold pb-3">My Tasks</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {loadingStates.taskStats ? (
                <div className="flex flex-col gap-2 rounded-lg p-3 bg-gray-100 dark:bg-gray-700 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                    <div className="h-6 w-6 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                  </div>
                  <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                </div>
              ) : (
                <div className="flex flex-col gap-2 rounded-lg p-3 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-blue-700 dark:text-blue-300 text-sm">Total Tasks</h3>
                    <span className="material-symbols-outlined text-blue-700 dark:text-blue-300 text-base">list_alt</span>
                  </div>
                  <p className="text-xl font-bold text-blue-900 dark:text-text-dark">{stats.totalTasks}</p>
                </div>
              )}

              {loadingStates.taskStats ? (
                <div className="flex flex-col gap-2 rounded-lg p-3 bg-gray-100 dark:bg-gray-700 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                    <div className="h-6 w-6 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                  </div>
                  <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                </div>
              ) : (
                <div className="flex flex-col gap-2 rounded-lg p-3 bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-800/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-purple-700 dark:text-purple-300 text-sm">Recent Tasks</h3>
                    <span className="material-symbols-outlined text-purple-700 dark:text-purple-300 text-base">history</span>
                  </div>
                  <p className="text-xl font-bold text-purple-900 dark:text-text-dark">{stats.recentTasks}</p>
                </div>
              )}

              {loadingStates.taskStats ? (
                <div className="flex flex-col gap-2 rounded-lg p-3 bg-gray-100 dark:bg-gray-700 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                    <div className="h-6 w-6 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                  </div>
                  <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                </div>
              ) : (
                <div className="flex flex-col gap-2 rounded-lg p-3 bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-800/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-green-700 dark:text-green-300 text-sm">Tasks Today</h3>
                    <span className="material-symbols-outlined text-green-700 dark:text-green-300 text-base">today</span>
                  </div>
                  <p className="text-xl font-bold text-green-900 dark:text-text-dark">{stats.tasksToday}</p>
                </div>
              )}

              {loadingStates.taskStats ? (
                <div className="flex flex-col gap-2 rounded-lg p-3 bg-gray-100 dark:bg-gray-700 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                    <div className="h-6 w-6 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                  </div>
                  <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                </div>
              ) : (
                <div className="flex flex-col gap-2 rounded-lg p-3 bg-orange-100 dark:bg-orange-900/30 hover:bg-orange-200 dark:hover:bg-orange-800/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-orange-700 dark:text-orange-300 text-sm">Tasks this Month</h3>
                    <span className="material-symbols-outlined text-orange-700 dark:text-orange-300 text-base">calendar_month</span>
                  </div>
                  <p className="text-xl font-bold text-orange-900 dark:text-text-dark">{stats.tasksThisMonth}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-card p-4 sm:p-6">
            <h2 className="text-text-light dark:text-text-dark text-xl sm:text-[22px] font-bold pb-3">My Events</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {loadingStates.eventStats ? (
                <div className="flex flex-col gap-2 rounded-lg p-3 bg-gray-100 dark:bg-gray-700 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                    <div className="h-6 w-6 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                  </div>
                  <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                </div>
              ) : (
                <div className="flex flex-col gap-2 rounded-lg p-3 bg-indigo-100 dark:bg-indigo-900/30 hover:bg-indigo-200 dark:hover:bg-indigo-800/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-indigo-700 dark:text-indigo-300 text-sm">Total Events</h3>
                    <span className="material-symbols-outlined text-indigo-700 dark:text-indigo-300 text-base">event</span>
                  </div>
                  <p className="text-xl font-bold text-indigo-900 dark:text-text-dark">{eventStats.totalEvents}</p>
                </div>
              )}

              {loadingStates.eventStats ? (
                <div className="flex flex-col gap-2 rounded-lg p-3 bg-gray-100 dark:bg-gray-700 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                    <div className="h-6 w-6 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                  </div>
                  <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                </div>
              ) : (
                <div className="flex flex-col gap-2 rounded-lg p-3 bg-cyan-100 dark:bg-cyan-900/30 hover:bg-cyan-200 dark:hover:bg-cyan-800/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-cyan-700 dark:text-cyan-300 text-sm">Events Today</h3>
                    <span className="material-symbols-outlined text-cyan-700 dark:text-cyan-300 text-base">today</span>
                  </div>
                  <p className="text-xl font-bold text-cyan-900 dark:text-text-dark">{eventStats.eventsToday}</p>
                </div>
              )}

              {loadingStates.eventStats ? (
                <div className="flex flex-col gap-2 rounded-lg p-3 bg-gray-100 dark:bg-gray-700 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                    <div className="h-6 w-6 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                  </div>
                  <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                </div>
              ) : (
                <div className="flex flex-col gap-2 rounded-lg p-3 bg-teal-100 dark:bg-teal-900/30 hover:bg-teal-200 dark:hover:bg-teal-800/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-teal-700 dark:text-teal-300 text-sm">Events This Month</h3>
                    <span className="material-symbols-outlined text-teal-700 dark:text-teal-300 text-base">calendar_month</span>
                  </div>
                  <p className="text-xl font-bold text-teal-900 dark:text-text-dark">{eventStats.eventsThisMonth}</p>
                </div>
              )}

              {loadingStates.eventStats ? (
                <div className="flex flex-col gap-2 rounded-lg p-3 bg-gray-100 dark:bg-gray-700 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                    <div className="h-6 w-6 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                  </div>
                  <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                </div>
              ) : (
                <div className="flex flex-col gap-2 rounded-lg p-3 bg-rose-100 dark:bg-rose-900/30 hover:bg-rose-200 dark:hover:bg-rose-800/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-rose-700 dark:text-rose-300 text-sm">Completed Events</h3>
                    <span className="material-symbols-outlined text-rose-700 dark:text-rose-300 text-base">check_circle</span>
                  </div>
                  <p className="text-xl font-bold text-rose-900 dark:text-text-dark">{eventStats.completedEvents}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-card p-4 sm:p-6">
            <div className="flex justify-between items-center pb-3">
              <h2 className="text-text-light dark:text-text-dark text-xl sm:text-[22px] font-bold">Recent Tasks</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border-light dark:border-border-dark">
                    <th className="py-2 px-3 sm:px-4 font-medium text-text-secondary-light dark:text-text-secondary-dark">Task Name</th>
                    <th className="py-2 px-3 sm:px-4 font-medium text-text-secondary-light dark:text-text-secondary-dark">Category</th>
                    <th className="py-2 px-3 sm:px-4 font-medium text-text-secondary-light dark:text-text-secondary-dark">Status</th>
                    <th className="py-2 px-3 sm:px-4 font-medium text-text-secondary-light dark:text-text-secondary-dark">Due Date</th>
                    <th className="py-2 px-3 sm:px-4 font-medium text-text-secondary-light dark:text-text-secondary-dark"></th>
                  </tr>
                </thead>
                <tbody>
                  {loadingStates.recentTasks ? (
                    // Show skeleton loading rows when recent tasks are loading
                    [...Array(5)].map((_, i) => (
                      <tr key={i} className="border-b border-border-light dark:border-border-dark">
                        <td className="py-3 px-3 sm:px-4">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                        </td>
                        <td className="py-3 px-3 sm:px-4">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"></div>
                        </td>
                        <td className="py-3 px-3 sm:px-4">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2"></div>
                        </td>
                        <td className="py-3 px-3 sm:px-4">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-2/3"></div>
                        </td>
                        <td className="py-3 px-3 sm:px-4">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-6"></div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    recentTasksRows
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:gap-6">
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-card p-4 sm:p-6 hidden lg:block">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-xl">today</span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text-secondary-light dark:text-text-secondary-dark">Today</h3>
                <p className="text-base font-medium text-text-light dark:text-text-dark">{optimizedDateUtils.memoizedFormatDate(new Date().toISOString(), 'fullDateWithDay')}</p>
              </div>
            </div>
          </div>

          <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-card p-4 sm:p-6">
            <div className="flex justify-between items-center pb-3">
              <h2 className="text-text-light dark:text-text-dark text-xl sm:text-[22px] font-bold">Task Status Overview</h2>
            </div>
            <div className="grid grid-cols-[1fr_24px_1fr] gap-0 relative">
              <div className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <span className="text-text-secondary-light dark:text-text-secondary-dark">Completed</span>
                <span className="font-bold text-success-600 dark:text-success-400">{stats.completedTasks}</span>
              </div>
              <div className="flex items-center justify-center">
                
              </div>
              <div className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <span className="text-text-secondary-light dark:text-text-secondary-dark">In Progress</span>
                <span className="font-bold text-warning-600 dark:text-warning-400">{stats.inProgressTasks}</span>
              </div>
              
              <div className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <span className="text-text-secondary-light dark:text-text-secondary-dark">Pending</span>
                <span className="font-bold text-danger-600 dark:text-danger-400">{stats.pendingTasks}</span>
              </div>
              <div className="flex items-center justify-center">
                
              </div>
              <div className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <span className="text-text-secondary-light dark:text-text-secondary-dark">Overdue</span>
                <span className="font-bold text-red-600 dark:text-red-400">{stats.overdueTasks}</span>
              </div>
              
              <div className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <span className="text-text-secondary-light dark:text-text-secondary-dark">Archived</span>
                <span className="font-bold text-gray-600 dark:text-gray-400">{stats.archivedTasks}</span>
              </div>
              <div className="flex items-center justify-center">
                
              </div>
              <div className="p-2"></div>
            </div>
          </div>

          <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-card p-4 sm:p-6">
            <h2 className="text-text-light dark:text-text-dark text-xl sm:text-[22px] font-bold pb-3">Upcoming Deadlines</h2>
            <div className="flex flex-col gap-4">
              {loadingStates.upcomingDeadlines ? (
                // Show skeleton loading when upcoming deadlines are loading
                [...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-start gap-3 sm:gap-4 p-2 rounded-lg">
                    <div className="w-8 h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    <div className="flex-1 border-l-2 border-primary-600 pl-3 sm:pl-4">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2 mb-2"></div>
                      <div className="flex gap-2 mt-1">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-12"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-16"></div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                upcomingDeadlinesContent
              )}
            </div>
          </div>

          <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-card p-4 sm:p-6">
            <h2 className="text-text-light dark:text-text-dark text-xl sm:text-[22px] font-bold pb-3">Upcoming Events</h2>
            <div className="flex flex-col gap-4">
              {loadingStates.upcomingEvents ? (
                // Show skeleton loading when upcoming events are loading
                [...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-start gap-3 sm:gap-4 p-2 rounded-lg">
                    <div className="w-8 h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    <div className="flex-1 border-l-2 border-primary-600 pl-3 sm:pl-4">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2 mb-2"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-16"></div>
                    </div>
                  </div>
                ))
              ) : (
                upcomingEventsContent
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default React.memo(Dashboard);