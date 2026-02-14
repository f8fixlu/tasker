import React, { useState, useEffect, useRef } from 'react';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import { reportsService } from '../services/reportsService';
import { categoryService } from '../services/categoryService';
import { eventCategoryService } from '../services/eventCategoryService';
import { useAuth } from '../context/AuthContext';
import { useTaskUpdate } from '../context/TaskUpdateContext';
import { formatToLocalDateTime } from '../utils/date';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
pdfMake.vfs = pdfFonts;
import * as pdfjsLib from 'pdfjs-dist';
import { GlobalWorkerOptions } from 'pdfjs-dist';
GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
  ArcElement,
  Filler
} from 'chart.js';

import { Line, Pie } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  ChartLegend,
  ArcElement,
  Filler
);

// Create a custom hook for outside click detection
const useOutsideClick = (ref, callback) => {
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        callback();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [ref, callback]);
};

const Reports = () => {
  const { user } = useAuth();
  const { updateTrigger } = useTaskUpdate();
  const categoryFiltersDropdownRef = useRef(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [signatoryData, setSignatoryData] = useState([]);
  const [printSections, setPrintSections] = useState({
    reportStats: false,
    taskList: true,  // Default to true
    charts: false
  });
  const [showCategoryFiltersDropdown, setShowCategoryFiltersDropdown] = useState(false);

  // State to track hover for category filters dropdown
  const [isCategoryFiltersHovered, setIsCategoryFiltersHovered] = useState(false);

  // State for dynamic categories
  const [taskCategories, setTaskCategories] = useState([]);
  const [eventCategories, setEventCategories] = useState([]);
  const [categoryFilters, setCategoryFilters] = useState({
    task: {},
    event: {}
  });
  const [loadingCategories, setLoadingCategories] = useState(true);

  // State for task type summary
  const [taskTypeSummary, setTaskTypeSummary] = useState([]);
  const [taskTypeSummaryLoading, setTaskTypeSummaryLoading] = useState(false);
  const [taskTypeSummaryError, setTaskTypeSummaryError] = useState(null);
  const [taskTypeGrouping, setTaskTypeGrouping] = useState('combined'); // only 'combined' available now

  // State for event summary
  const [eventSummary, setEventSummary] = useState([]);
  const [eventSummaryLoading, setEventSummaryLoading] = useState(false);
  const [eventSummaryError, setEventSummaryError] = useState(null);

  // Format category name to have proper capitalization (WORK -> Work, personal -> Personal)
  const formatCategoryName = (name) => {
    if (!name) return '';
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  };

  // Dynamic Category Filters Dropdown
  const CategoryFiltersDropdown = ({ filters, onChange, onClear, taskCategories, eventCategories }) => {
    const handleClearTaskCategories = () => {
      // Reset all task category filters to false
      taskCategories.forEach(category => {
        onChange('task', category.name.toLowerCase(), false);
      });
    };

    const handleClearEventCategories = () => {
      // Reset all event category filters to false
      eventCategories.forEach(category => {
        onChange('event', category.name.toLowerCase(), false);
      });
    };

    return (
      <div className="absolute left-0 mt-2 w-52 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 py-2 border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-2 space-y-1">
          <div className="flex justify-between items-center mb-2">
            <div className="font-medium text-sm text-gray-500 dark:text-gray-400">Task</div>
            <button
              type="button"
              className="text-xs text-primary hover:text-primary-600 dark:hover:text-primary-400"
              onClick={handleClearTaskCategories}
            >
              Clear All
            </button>
          </div>
          {taskCategories.map((category) => (
            <div key={`task-${category.name.toLowerCase()}`} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.task[category.name.toLowerCase()] || false}
                  onChange={(e) => onChange('task', category.name.toLowerCase(), e.target.checked)}
                  className="rounded text-primary focus:ring-primary"
                />
                <span>{formatCategoryName(category.name)}</span>
              </label>
            </div>
          ))}

          <div className="flex justify-between items-center mb-2 mt-3">
            <div className="font-medium text-sm text-gray-500 dark:text-gray-400">Event</div>
            <button
              type="button"
              className="text-xs text-primary hover:text-primary-600 dark:hover:text-primary-400"
              onClick={handleClearEventCategories}
            >
              Clear All
            </button>
          </div>
          {eventCategories.map((category) => (
            <div key={`event-${category.name.toLowerCase()}`} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.event[category.name.toLowerCase()] || false}
                  onChange={(e) => onChange('event', category.name.toLowerCase(), e.target.checked)}
                  className="rounded text-primary focus:ring-primary"
                />
                <span>{formatCategoryName(category.name)}</span>
              </label>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Handle outside click for category filters dropdown
  useOutsideClick(categoryFiltersDropdownRef, () => {
    setShowCategoryFiltersDropdown(false);
  });

  // Effect to handle hover functionality for category filters
  useEffect(() => {
    let timeout;
    if (isCategoryFiltersHovered && !showCategoryFiltersDropdown) {
      // Show dropdown on hover if not already open
      timeout = setTimeout(() => {
        setShowCategoryFiltersDropdown(true);
      }, 300); // Delay to prevent accidental opening
    } else if (!isCategoryFiltersHovered && showCategoryFiltersDropdown) {
      // Hide dropdown after a delay when not hovered
      timeout = setTimeout(() => {
        setShowCategoryFiltersDropdown(false);
      }, 500); // Delay to allow movement to dropdown
    }
    return () => clearTimeout(timeout);
  }, [isCategoryFiltersHovered, showCategoryFiltersDropdown]);

  const [pageSize, setPageSize] = useState('A4'); // Default to A4
  const [zoomLevel, setZoomLevel] = useState(100); // Default zoom level 100%

  // Helper function to format category filters for API
  const formatCategoryFiltersForAPI = () => {
    // Create a copy of the current category filters to send to the API
    return {
      task: { ...categoryFilters.task },
      event: { ...categoryFilters.event }
    };
  };

  const handleCategoryFilterChange = (type, filterName, checked) => {
    setCategoryFilters(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [filterName]: checked
      }
    }));
  };
  const [reportStats, setReportStats] = useState({
    tasksCompleted: 0,
    productivityScore: 0,
    eventsAttended: 0,
    taskStats: {},
    dueTodayCount: 0,
    dueThisMonthCount: 0,
    unreadNotificationsCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    return {
      startDate: startOfMonth.toISOString().split('T')[0], // Start of current month
      endDate: today.toISOString().split('T')[0]          // Current day
    };
  });

  // Load signatory data from local storage or API (using only dynamic signatory format)
  const loadSignatoryData = async () => {
    if (user) {
      try {
        const savedSignatories = localStorage.getItem(`signatories_${user?.id}`);
        if (savedSignatories) {
          const parsedData = JSON.parse(savedSignatories);

          // Only use array format: array of signatories
          let newData = [];
          if (Array.isArray(parsedData)) {
            // If it's already an array (like from DB), use it directly
            newData = parsedData;
          } else {
            // If data is in signatoryX format, convert it to array format using sequential numbering
            const signatoryArray = [];

            // Handle any signatory fields that might be in the format signatory1, signatory2, etc.
            // Loop through potential signatory fields
            let signatoryIndex = 1;
            while (parsedData[`signatory${signatoryIndex}`]) {
              const signatoryField = parsedData[`signatory${signatoryIndex}`];
              if (signatoryField && (signatoryField.name || signatoryField.position)) {
                signatoryArray.push({
                  title: signatoryField.title || `Signatory ${signatoryArray.length + 1}`,
                  name: signatoryField.name || '',
                  position: signatoryField.position || ''
                });
              }
              signatoryIndex++;
            }

            newData = signatoryArray;
          }

          // Only update state if the data has actually changed
          if (JSON.stringify(newData) !== JSON.stringify(signatoryData)) {
            setSignatoryData(newData);
          }
        } else {
          // If no data in localStorage, set to empty array only if current state is not already empty
          if (JSON.stringify(signatoryData) !== JSON.stringify([])) {
            setSignatoryData([]);
          }
        }
      } catch (error) {
        console.error('Error loading signatory data:', error);
        // Set default empty array if there's an error, only if current state is not already empty
        if (JSON.stringify(signatoryData) !== JSON.stringify([])) {
          setSignatoryData([]);
        }
      }
    }
  };


  // Format date range for display (can handle same month, different months, or different years)
  const formatPrintDateRange = (start, end) => {
    const startDate = new Date(start);
    const endDate = new Date(end);

    // Format the start date
    const startDay = startDate.getDate();
    const startMonth = startDate.toLocaleDateString('en-US', { month: 'long' });
    const startYear = startDate.getFullYear();

    // Format the end date
    const endDay = endDate.getDate();
    const endMonth = endDate.toLocaleDateString('en-US', { month: 'long' });
    const endYear = endDate.getFullYear();

    // Check if both dates are exactly the same
    if (startDate.toDateString() === endDate.toDateString()) {
      // Same date: "Month Day, Year"
      return `${startMonth} ${startDay}, ${startYear}`;
    } else if (startYear === endYear && startMonth === endMonth) {
      // Same month and year: "Month Start Day - End Day, Year"
      return `${startMonth} ${startDay} - ${endDay}, ${startYear}`;
    } else if (startYear === endYear) {
      // Same year, different months: "Month Start Day - Month End Day, Year"
      return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${endYear}`;
    } else {
      // Different years: "Month Start Day, Year - Month End Day, Year"
      return `${startMonth} ${startDay}, ${startYear} - ${endMonth} ${endDay}, ${endYear}`;
    }
  };

  // Simple approach: fetch fresh signatory data from localStorage when preview is opened

  // Handle printing only the report content
  const handlePrint = () => {
    // In the multi-page implementation, each .page div already has the correct paper size class
    // The CSS @page rules will handle the paper size during printing
    window.print();
  };

  // Function to create multiple pages based on content length
  const renderReportPages = () => {
    // Define content that should go on every page (header and footer)
    const renderPageHeader = () => (
      <header className="page-header p-6 border-b border-gray-200" style={{ fontFamily: "'Bookman Old Style', serif", fontSize: '12pt' }}>
        <div className="flex items-center justify-center space-x-1">
          <img
            src="/logo/logoleft.png"
            alt="Left Logo"
            className="h-16 w-16 flex-shrink-0 rounded"
            onError={(e) => {
              e.target.style.display = 'none';
              const span = document.createElement('span');
              span.className = 'text-xs text-gray-500';
              span.textContent = 'Logo';
              e.target.parentNode.appendChild(span);
            }}
          />
          <div className="text-center px-1">
            <p style={{ fontSize: '10pt' }}>Republic of the Philippines</p>
            <p style={{ fontSize: '10pt' }}>OFFICE OF THE PRESIDENT</p>
            <p className="font-bold" style={{ fontSize: '10pt' }}>COMMISSION ON HIGHER EDUCATION</p>
            <p style={{ fontSize: '10pt' }}>Regional Office I</p>
            <p style={{ fontSize: '10pt' }}>San Fernando City, La Union</p>
          </div>
          <img
            src="/logo/logoright.png"
            alt="Right Logo"
            className="h-16 w-16 flex-shrink-0 rounded"
            onError={(e) => {
              e.target.style.display = 'none';
              const span = document.createElement('span');
              span.className = 'text-xs text-gray-500';
              span.textContent = 'Logo';
              e.target.parentNode.appendChild(span);
            }}
          />
        </div>
      </header>
    );

    const renderPageFooter = (pageNumber, totalPages) => (
      <div className="page-footer p-4 text-right" style={{ fontFamily: "'Bookman Old Style', serif", fontSize: '12pt' }}>
        Page {pageNumber} of {totalPages}
      </div>
    );

    // Define signature section that should go on the last page only (using dynamic signatory system)
    const renderSignatureSection = () => {
      if (!Array.isArray(signatoryData) || signatoryData.length === 0) {
        return null;
      }

      const signatoryArray = signatoryData.filter(sig => sig.name || sig.position);
      
      if (signatoryArray.length === 0) {
        return null;
      }

      // Process signatories in pairs (left/right columns) with remaining ones below
      const signatureRows = [];
      for (let i = 0; i < signatoryArray.length; i += 2) {
        const leftSig = signatoryArray[i];
        const rightSig = signatoryArray[i + 1];

        if (rightSig) {
          // Two signatories in this row
          signatureRows.push(
            <div key={`sig-row-${i}`} className="flex justify-between">
              <div className="w-1/2">
                <p>{leftSig.title || `Signatory ${i + 1}`}</p>
                <div className="mt-8">
                  {leftSig.name && (
                    <p className="font-bold mt-4" style={{ fontSize: '12pt' }}>{leftSig.name}</p>
                  )}
                  {leftSig.position && (
                    <p className="mt-2" style={{ fontSize: '12pt' }}>{leftSig.position}</p>
                  )}
                </div>
              </div>
              <div className="w-1/2">
                <p>{rightSig.title || `Signatory ${i + 2}`}</p>
                <div className="mt-8">
                  {rightSig.name && (
                    <p className="font-bold mt-4" style={{ fontSize: '12pt' }}>{rightSig.name}</p>
                  )}
                  {rightSig.position && (
                    <p className="mt-2" style={{ fontSize: '12pt' }}>{rightSig.position}</p>
                  )}
                </div>
              </div>
            </div>
          );
        } else {
          // Single signatory in this row
          signatureRows.push(
            <div key={`sig-row-${i}`} className="flex justify-between">
              <div className="w-1/2">
                <p>{leftSig.title || `Signatory ${i + 1}`}</p>
                <div className="mt-8">
                  {leftSig.name && (
                    <p className="font-bold mt-4" style={{ fontSize: '12pt' }}>{leftSig.name}</p>
                  )}
                  {leftSig.position && (
                    <p className="mt-2" style={{ fontSize: '12pt' }}>{leftSig.position}</p>
                  )}
                </div>
              </div>
              <div className="w-1/2">
                {/* Empty space to maintain layout */}
              </div>
            </div>
          );
        }
      }

      return (
        <div className="mt-12" style={{ fontFamily: "'Bookman Old Style', serif", fontSize: '12pt' }}>
          {signatureRows}
        </div>
      );
    };

    // Create pages array
    const pages = [];

    // Check if we have signatory data using dynamic signatory system
    const hasSignatoryData = Array.isArray(signatoryData) && signatoryData.some(sig => sig.name || sig.position);

    // Determine how many task groups per page based on paper size
    let tasksPerPage = 5; // Start with 5 task groups per page as a default

    // Adjust for different paper sizes
    switch(pageSize.toLowerCase()) {
      case 'folio':
        tasksPerPage = 8; // Folio is taller, can fit more
        break;
      case 'letter':
        tasksPerPage = 6; // Letter size is intermediate
        break;
      case 'a4':
      default:
        tasksPerPage = 5; // A4 standard
        break;
    }

    // Add report title and date to the first page
    const reportTitle = (
      <div key="report-title" className="mb-12" style={{ fontFamily: "'Bookman Old Style', serif", fontSize: '12pt' }}>
        <h1 className="text-center font-bold text-lg tracking-wider">ACCOMPLISHMENT REPORT</h1>
        <p className="text-center mt-2">For the period of {formatPrintDateRange(dateRange.startDate, dateRange.endDate)}</p>
      </div>
    );

    // Prepare static content that goes on the first page (stats and charts)
    const staticContent = [];
    

    // Add charts if enabled
    if (printSections.charts) {
      staticContent.push(
        <div key="charts" className="chart-section p-4 border border-gray-200 rounded mb-8">
          <h2 className="font-bold mb-3">PERFORMANCE CHARTS</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-50 p-4 rounded">
              <h3 className="text-center font-medium mb-2">Task Completion Rate</h3>
              <div className="h-64">
                <Line data={taskCompletionData} options={lineChartOptions} />
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded">
              <h3 className="text-center font-medium mb-2">Activity Breakdown</h3>
              <div className="h-64">
                <Pie type="doughnut" data={activityBreakdownChartData} options={pieChartOptions} />
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (error) {
      // If there's an error, just show one page with the error
      const shouldShowSignatureOnSamePage = hasSignatoryData;

      pages.push(
        <div key="page-1" className={`page paper-${pageSize.toLowerCase()} bg-white shadow-lg print:shadow-none mb-8`} style={{fontFamily: "'Bookman Old Style', serif", fontSize: '12pt'}}>
          {renderPageHeader()}

          {/* Page Content */}
          <div className="page-content p-6">
            <main className="mt-8">
              <div className="text-center py-8">
                <p className="text-red-500">{error}</p>
                <Button
                  variant="primary"
                  onClick={() => {
                    fetchReportData();
                    setIsPrintModalOpen(false);
                  }}
                  className="mt-4"
                >
                  Retry
                </Button>

                {/* Signature section on the same page if there is signatory data */}
                {hasSignatoryData && renderSignatureSection()}
              </div>
            </main>
          </div>

          {renderPageFooter(1, 1)}
        </div>
      );
    } else if (taskListLoading) {
      // If loading, show a single page with loading state
      const shouldShowSignatureOnSamePage = hasSignatoryData;

      pages.push(
        <div key="page-1" className={`page paper-${pageSize.toLowerCase()} bg-white shadow-lg print:shadow-none mb-8`} style={{fontFamily: "'Bookman Old Style', serif", fontSize: '12pt'}}>
          {renderPageHeader()}

          {/* Page Content */}
          <div className="page-content p-6">
            <main className="mt-8">
              {reportTitle}
              <div className="task-list-section p-4 border border-gray-200 rounded mb-8">
                <h2 className="font-bold mb-3">TASKS/ACTIVITIES UNDERTAKEN</h2>
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <div className="w-3/4 h-4 bg-gray-200 rounded animate-pulse"></div>
                      <div className="w-16 h-4 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>

                {/* Signature section on the same page if there is signatory data */}
                {hasSignatoryData && renderSignatureSection()}
              </div>
            </main>
          </div>

          {renderPageFooter(1, 1)}
        </div>
      );
    } else if (!printSections.taskList || groupedTasks.length === 0) {
      // If no task list is selected or no tasks exist, create a single page with static content
      const shouldShowSignatureOnSamePage = hasSignatoryData;

      pages.push(
        <div key="page-1" className={`page paper-${pageSize.toLowerCase()} bg-white shadow-lg print:shadow-none mb-8`} style={{fontFamily: "'Bookman Old Style', serif", fontSize: '12pt'}}>
          {renderPageHeader()}

          {/* Page Content */}
          <div className="page-content p-6">
            <main className="mt-8">
              <div className="space-y-6">
                {reportTitle}
                {staticContent}
                {printSections.taskList && (
                  <div key="no-tasks" className="task-list-section p-4 border border-gray-200 rounded mb-8">
                    <h2 className="font-bold mb-3">TASKS/ACTIVITIES UNDERTAKEN</h2>
                    <p className="text-gray-500 text-center py-2">No tasks found for the selected date range</p>
                  </div>
                )}

                {/* Signature section on the same page if there is signatory data */}
                {hasSignatoryData && renderSignatureSection()}
              </div>
            </main>
          </div>

          {renderPageFooter(1, 1)}
        </div>
      );
    } else {
      // Handle multiple pages when there are tasks
      // Use line count based pagination for consistent page sizing
      
      // Calculate how many task lines per page based on paper size
      let linesPerPage = 30; // Default for A4

      // Adjust for different paper sizes to maintain consistent page sizing
      switch(pageSize.toLowerCase()) {
        case 'folio':
          linesPerPage = 45; // Folio is taller, can fit more lines
          break;
        case 'letter':
          linesPerPage = 35; // Letter size is intermediate
          break;
        case 'a4':
        default:
          linesPerPage = 30; // A4 standard
          break;
      }

      // Flatten all tasks from all groups into a single array with their date
      let allTasksWithDate = [];
      groupedTasks.forEach(group => {
        group.tasks.forEach(task => {
          allTasksWithDate.push({
            ...task,
            groupDate: group.date
          });
        });
      });

      // Calculate pages needed for tasks
      const taskPagesCount = Math.ceil(allTasksWithDate.length / linesPerPage);

      // Create pages with tasks
      for (let pageNum = 0; pageNum < taskPagesCount; pageNum++) {
        const startIdx = pageNum * linesPerPage;
        const endIdx = Math.min(startIdx + linesPerPage, allTasksWithDate.length);
        const pageTasks = allTasksWithDate.slice(startIdx, endIdx);

        let pageTaskGroups = {};
        pageTasks.forEach(task => {
          const date = task.groupDate;
          if (!pageTaskGroups[date]) {
            pageTaskGroups[date] = [];
          }
          pageTaskGroups[date].push(task);
        });

        // Convert to array format for rendering
        const pageTaskGroupsArray = Object.entries(pageTaskGroups).map(([date, tasks]) => ({
          date,
          tasks
        }));

        // Determine if this is the last task page and if we should add signatures to it
        const isLastTaskPage = (pageNum === taskPagesCount - 1);
        const shouldAddSignatureToThisPage = isLastTaskPage && hasSignatoryData;

        pages.push(
          <div key={`page-${pageNum + 1}`} className={`page paper-${pageSize.toLowerCase()} bg-white shadow-lg print:shadow-none mb-8`} style={{fontFamily: "'Bookman Old Style', serif", fontSize: '12pt', width: pageSize.toLowerCase() === 'folio' ? '8.5in' : pageSize.toLowerCase() === 'letter' ? '8.5in' : '8.27in', height: pageSize.toLowerCase() === 'folio' ? '13in' : pageSize.toLowerCase() === 'letter' ? '11in' : '11.69in', display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
            {renderPageHeader()}

            {/* Page Content */}
            <div className="page-content p-4 flex-grow" style={{ maxHeight: pageSize.toLowerCase() === 'folio' ? '12in' : pageSize.toLowerCase() === 'letter' ? '10in' : '10.69in', overflow: 'hidden' }}>
              <main className="mt-4 flex-grow" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="space-y-4 flex-grow" style={{ overflow: 'hidden' }}>
                  {/* Report title and static content (stats and charts) only on first page */}
                  {pageNum === 0 && (
                    <>
                      {reportTitle}
                      {staticContent}
                    </>
                  )}

                  {/* Combined task/event list content is distributed across pages */}
                  {printSections.taskList && (
                    <div className="task-list-section space-y-6 flex-grow overflow-hidden">
                      {pageTaskGroupsArray.map((group, groupIdx) => {
                        // Find the corresponding event group for the same date
                        const eventGroup = groupedEvents.find(eg => eg.date === group.date);

                        // Combine tasks and events for this date, keeping them sorted
                        let combinedItems = [];

                        // Add tasks
                        combinedItems = combinedItems.concat(group.tasks.map(task => ({
                          type: 'task',
                          content: task.description || 'No description'
                        })));

                        // Add events
                        if (eventGroup) {
                          combinedItems = combinedItems.concat(eventGroup.events.map(event => ({
                            type: 'event',
                            content: event.description || 'No description'
                          })));
                        }

                        return (
                          <div key={`combined-${pageNum}-${groupIdx}`} className="mb-6">
                            <h2 className="font-bold" style={{ fontFamily: "'Bookman Old Style', serif", fontSize: '12pt' }}>Tasks/Activities Undertaken ({group.date}):</h2>
                            <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                              {combinedItems.map((item, itemIdx) => (
                                <li key={`item-${pageNum}-${groupIdx}-${itemIdx}`} className="text-base" style={{ fontSize: '12pt' }}>
                                  {item.content}
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add signature section to the last task page if there is signatory data */}
                  {shouldAddSignatureToThisPage && renderSignatureSection()}
                </div>
              </main>
            </div>

            {renderPageFooter(pageNum + 1, taskPagesCount)}
          </div>
        );
      }
    }

    return pages;
  };

  // Fetch report data on component mount
  const fetchReportData = async () => {
    try {
      // Don't set loading to true when using cached data to avoid flickering
      setError(null); // Clear any previous errors
      const stats = await reportsService.getDashboardStats({
        start_date: dateRange.startDate,
        end_date: dateRange.endDate,
        category_filters: JSON.stringify(formatCategoryFiltersForAPI())
      });

      // Calculate productivity score based on completion rate
      const taskStats = stats.taskStats || {};
      const completed = taskStats.completed_tasks || 0;
      const total = taskStats.total_tasks || 1; // Avoid division by zero
      const completionRate = total > 0 ? (completed / total) * 10 : 0;
      const productivityScore = Math.min(10, completionRate); // Cap at 10

      setReportStats({
        tasksCompleted: completed,
        productivityScore: parseFloat(productivityScore.toFixed(1)),
        eventsAttended: stats.upcomingEvents?.count || 0, // Using upcoming events as events attended
        taskStats,
        dueTodayCount: stats.dueTodayCount || 0,
        dueThisMonthCount: stats.dueThisMonthCount || 0,
        unreadNotificationsCount: stats.unreadNotificationsCount || 0
      });
    } catch (err) {
      console.error('Error fetching report data:', err);
      setError('Failed to load report data');
    }
  };

  useEffect(() => {
    setLoading(true); // Set loading to true initially
    loadSignatoryData(); // Load signatory data first
    fetchReportData().finally(() => {
      setLoading(false); // Then set loading to false after initial fetch
    });
  }, [dateRange, categoryFilters, user]);

  // Fetch task and event categories when component mounts
  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true);
      try {
        // Fetch task categories
        const taskCategoriesResponse = await categoryService.getAllCategories();
        const taskCategoriesList = Array.isArray(taskCategoriesResponse.categories)
          ? taskCategoriesResponse.categories
          : taskCategoriesResponse;

        // Fetch event categories
        const eventCategoriesResponse = await eventCategoryService.getAllEventCategories();
        const eventCategoriesList = Array.isArray(eventCategoriesResponse.categories)
          ? eventCategoriesResponse.categories
          : eventCategoriesResponse;

        // Set the categories state
        setTaskCategories(taskCategoriesList);
        setEventCategories(eventCategoriesList);

        // Initialize categoryFilters state with specific defaults
        // For tasks: only "work" category by default
        const initialTaskFilters = {};
        taskCategoriesList.forEach(category => {
          initialTaskFilters[category.name.toLowerCase()] = category.name.toLowerCase() === 'work';
        });

        // For events: "absent", "holiday", and "work" categories by default
        const initialEventFilters = {};
        eventCategoriesList.forEach(category => {
          const categoryName = category.name.toLowerCase();
          initialEventFilters[categoryName] = categoryName === 'absent' || categoryName === 'holiday' || categoryName === 'work';
        });

        setCategoryFilters({
          task: initialTaskFilters,
          event: initialEventFilters
        });
      } catch (error) {
        console.error('Error fetching categories:', error);
        // Initialize with default categories if API call fails
        setCategoryFilters({
          task: { work: true, personal: false },  // Only "work" selected
          event: { work: true, personal: false, holiday: true, absent: true }  // Only "absent", "holiday", "work"
        });
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  // State for task completion data
  const [taskCompletionData, setTaskCompletionData] = useState({
    labels: [],
    datasets: [
      {
        label: 'Tasks Completed',
        data: [],
        borderColor: '#4A90E2',
        backgroundColor: 'rgba(74, 144, 226, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  });

  // State for task list data
  const [taskList, setTaskList] = useState([]);
  const [taskListLoading, setTaskListLoading] = useState(false);

  // State for grouped task data by date
  const [groupedTasks, setGroupedTasks] = useState([]);

  // State for event list data
  const [eventList, setEventList] = useState([]);
  const [eventListLoading, setEventListLoading] = useState(false);

  // State for grouped event data by date
  const [groupedEvents, setGroupedEvents] = useState([]);

  // State for sidebar event list
  const [sidebarEventList, setSidebarEventList] = useState([]);
  const [sidebarEventListLoading, setSidebarEventListLoading] = useState(false);
  const [sidebarEventListPage, setSidebarEventListPage] = useState(1);
  const [sidebarEventListHasMore, setSidebarEventListHasMore] = useState(true);
  const [sidebarEventTotal, setSidebarEventTotal] = useState(0);
  const [sidebarEventListLoadingMore, setSidebarEventListLoadingMore] = useState(false);
  const eventListContainerRef = useRef(null);

  // State for sidebar task list
  const [sidebarTaskList, setSidebarTaskList] = useState([]);
  const [sidebarTaskListLoading, setSidebarTaskListLoading] = useState(false);
  const [sidebarTaskListPage, setSidebarTaskListPage] = useState(1);
  const [sidebarTaskListHasMore, setSidebarTaskListHasMore] = useState(true);
  const [sidebarTaskListTotal, setSidebarTaskListTotal] = useState(0);
  const [sidebarTaskListLoadingMore, setSidebarTaskListLoadingMore] = useState(false);
  const taskListContainerRef = useRef(null);

  // Fetch task completion trend data
  const fetchTaskCompletionTrend = async () => {
    try {
      const data = await reportsService.getTaskCompletionTrend({
        start_date: dateRange.startDate,
        end_date: dateRange.endDate,
        category_filters: JSON.stringify(formatCategoryFiltersForAPI())
      });
      
      // Format the data for Chart.js
      const labels = data.data.map(item => item.date);
      const chartData = data.data.map(item => item.tasks);
      
      setTaskCompletionData({
        labels: labels,
        datasets: [
          {
            label: 'Tasks Completed',
            data: chartData,
            borderColor: '#4A90E2',
            backgroundColor: 'rgba(74, 144, 226, 0.1)',
            fill: true,
            tension: 0.4
          }
        ]
      });
    } catch (err) {
      console.error('Error fetching task completion trend:', err);
      // Fallback to simple data if API call fails
      const fallbackLabels = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      });
      
      setTaskCompletionData({
        labels: fallbackLabels,
        datasets: [
          {
            label: 'Tasks Completed',
            data: Array(30).fill(0).map(() => Math.floor(Math.random() * 10)),
            borderColor: '#4A90E2',
            backgroundColor: 'rgba(74, 144, 226, 0.1)',
            fill: true,
            tension: 0.4
          }
        ]
      });
    }
  };

  // Load task completion trend when component mounts or report stats change
  useEffect(() => {
    if (!loading) {
      fetchTaskCompletionTrend();
    }
  }, [loading, dateRange, categoryFilters]);

  // Fetch task list for report
  const fetchTaskList = async () => {
    setTaskListLoading(true);
    try {
      const data = await reportsService.getTaskListForReport({
        start_date: dateRange.startDate,
        end_date: dateRange.endDate,
        category_filters: JSON.stringify(formatCategoryFiltersForAPI()),
        limit: 9999  // High limit to get all matching records for print preview
      });
      const tasks = data.tasks || [];
      setTaskList(tasks);
      
      // Sort all tasks by task_date only, then by description
      const sortedTasks = [...tasks].sort((a, b) => {
        // Primary sort: by task date only
        const dateA = new Date(a.task_date || new Date().toISOString());
        const dateB = new Date(b.task_date || new Date().toISOString());

        if (dateA - dateB !== 0) {
          return dateA - dateB; // If dates differ, sort by date
        }

        // Secondary sort: by description (or title if no description)
        const descA = a.description || a.title || '';
        const descB = b.description || b.title || '';
        return descA.localeCompare(descB);
      });

      // Group the already sorted tasks by task date only
      const grouped = {};
      sortedTasks.forEach(task => {
        const dateValue = task.task_date || new Date().toISOString();
        const dateKey = new Date(dateValue).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(task);
      });

      // Convert to array format - no need to sort the date groups since tasks are already sorted globally
      const groupedArray = Object.entries(grouped).map(([date, tasks]) => ({
        date,
        tasks // Tasks are already sorted properly
      }));

      setGroupedTasks(groupedArray);
    } catch (error) {
      console.error('Error fetching task list:', error);
      setTaskList([]); // Set to empty array on error
      setGroupedTasks([]);
    } finally {
      setTaskListLoading(false);
    }
  };

  // Fetch event list for report
  const fetchEventList = async () => {
    setEventListLoading(true);
    try {
      const data = await reportsService.getEventListForReport({
        start_date: dateRange.startDate,
        end_date: dateRange.endDate,
        category_filters: JSON.stringify(formatCategoryFiltersForAPI()), // Add category filters like for tasks
        limit: 9999  // High limit to get all matching records for print preview
      });
      const events = data.events || [];
      setEventList(events);

      // Sort all events by start_date only, then by title
      const sortedEvents = [...events].sort((a, b) => {
        // Primary sort: by event start date only
        const dateA = new Date(a.start_date || new Date().toISOString());
        const dateB = new Date(b.start_date || new Date().toISOString());

        if (dateA - dateB !== 0) {
          return dateA - dateB; // If dates differ, sort by date
        }

        // Secondary sort: by title
        const titleA = a.title || '';
        const titleB = b.title || '';
        return titleA.localeCompare(titleB);
      });

      // Group the already sorted events by start date only
      const grouped = {};
      sortedEvents.forEach(event => {
        const dateValue = event.start_date || new Date().toISOString();
        const dateKey = new Date(dateValue).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(event);
      });

      // Convert to array format - no need to sort the date groups since events are already sorted globally
      const groupedArray = Object.entries(grouped).map(([date, events]) => ({
        date,
        events // Events are already sorted properly
      }));

      setGroupedEvents(groupedArray);
    } catch (error) {
      console.error('Error fetching event list:', error);
      setEventList([]); // Set to empty array on error
      setGroupedEvents([]);
    } finally {
      setEventListLoading(false);
    }
  };

  // Fetch sidebar task total count
  const fetchSidebarTaskListTotal = async () => {
    try {
      // Fetch total count by requesting with a high limit to get all matching records
      const totalData = await reportsService.getTaskListForReport({
        start_date: dateRange.startDate,
        end_date: dateRange.endDate,
        category_filters: JSON.stringify(formatCategoryFiltersForAPI()),
        limit: 9999  // High limit to get all matching records
      });
      
      // Use the count of returned tasks as the total
      const totalFromResponse = totalData.tasks?.length || 0;
      setSidebarTaskListTotal(totalFromResponse);
    } catch (error) {
      console.error('Error fetching sidebar task list total:', error);
      setSidebarTaskListTotal(0);
    }
  };

  // Fetch sidebar task list
  const fetchSidebarTaskList = async (page = 1, append = false) => {
    if (page === 1) {
      setSidebarTaskListLoading(true);
    } else {
      setSidebarTaskListLoadingMore(true);
    }
    
    try {
      // Fetch the actual paginated data
      const data = await reportsService.getTaskListForReport({
        start_date: dateRange.startDate,
        end_date: dateRange.endDate,
        category_filters: JSON.stringify(formatCategoryFiltersForAPI()),
        limit: 14,  // Load 14 items at a time
        offset: (page - 1) * 14
      });

      const newTasks = data.tasks || [];

      if (page === 1) {
        setSidebarTaskList(newTasks);
      } else {
        setSidebarTaskList(prev => [...prev, ...newTasks]);
      }

      setSidebarTaskListHasMore(newTasks.length === 14); // If we got 14 items, there might be more
      setSidebarTaskListPage(page);
    } catch (error) {
      console.error('Error fetching sidebar task list:', error);
      if (page === 1) {
        setSidebarTaskList([]); // Set to empty array on error
      }
    } finally {
      setSidebarTaskListLoading(page === 1 ? false : false);
      setSidebarTaskListLoadingMore(false);
    }
  };

  // Fetch sidebar event total count
  const fetchSidebarEventTotal = async () => {
    try {
      // Fetch total count by requesting with a high limit to get all matching records
      const totalData = await reportsService.getEventListForReport({
        start_date: dateRange.startDate,
        end_date: dateRange.endDate,
        category_filters: JSON.stringify(formatCategoryFiltersForAPI()), // Include category filters
        limit: 9999  // High limit to get all matching records
      });

      // Use the count of returned events as the total
      const totalFromResponse = totalData.events?.length || 0;
      setSidebarEventTotal(totalFromResponse);
    } catch (error) {
      console.error('Error fetching sidebar event total:', error);
      setSidebarEventTotal(0);
    }
  };

  // Fetch sidebar event list
  const fetchSidebarEventList = async (page = 1, append = false) => {
    if (page === 1) {
      setSidebarEventListLoading(true);
    } else {
      setSidebarEventListLoadingMore(true);
    }

    try {
      // Fetch the actual paginated data
      const data = await reportsService.getEventListForReport({
        start_date: dateRange.startDate,
        end_date: dateRange.endDate,
        category_filters: JSON.stringify(formatCategoryFiltersForAPI()), // Include category filters
        limit: 10,  // Load 10 items at a time
        offset: (page - 1) * 10
      });

      const newEvents = data.events || [];

      if (page === 1) {
        setSidebarEventList(newEvents);
      } else {
        setSidebarEventList(prev => [...prev, ...newEvents]);
      }

      setSidebarEventListHasMore(newEvents.length === 10); // If we got 10 items, there might be more
      setSidebarEventListPage(page);
    } catch (error) {
      console.error('Error fetching sidebar event list:', error);
      if (page === 1) {
        setSidebarEventList([]); // Set to empty array on error
      }
    } finally {
      setSidebarEventListLoading(page === 1 ? false : false);
      setSidebarEventListLoadingMore(false);
    }
  };

  // Load task list when component mounts or date range/ category filters change
  useEffect(() => {
    if (!loading) {
      fetchTaskList();
      fetchEventList();  // Also fetch events
      fetchSidebarTaskList(1, false); // Fetch first page, don't append
      fetchSidebarTaskListTotal(); // Fetch total count
      fetchSidebarEventList(1, false); // Fetch first page, don't append
      fetchSidebarEventTotal(); // Fetch total count
      fetchTaskTypeSummary(); // Fetch task type summary
      fetchEventSummary(); // Fetch event summary
    }
  }, [loading, dateRange, categoryFilters]);

  // Load more when scrolling
  useEffect(() => {
    const container = taskListContainerRef.current;
    if (!container) return;

    let timeoutId = null; // To debounce scroll events

    const handleScroll = () => {
      // Debounce the scroll event to avoid excessive calls
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = setTimeout(() => {
        if (!sidebarTaskListHasMore || sidebarTaskListLoadingMore) return;
        
        // Check if we're near the bottom of the container
        const threshold = 20; // pixels from bottom to trigger load
        const position = container.scrollTop + container.clientHeight;
        const height = container.scrollHeight;
        
        if (position >= height - threshold) {
          // Load next page if not already loading
          fetchSidebarTaskList(sidebarTaskListPage + 1, true);
        }
      }, 100); // Debounce for 100ms
    };

    // Add scroll listener
    container.addEventListener('scroll', handleScroll);
    
    // Initial check in case the content is smaller than container
    handleScroll();
    
    // Clean up
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [sidebarTaskListHasMore, sidebarTaskListLoadingMore, sidebarTaskListPage, fetchSidebarTaskList]);

  // Fetch task type summary data
  const fetchTaskTypeSummary = async () => {
    setTaskTypeSummaryLoading(true);
    setTaskTypeSummaryError(null);
    try {
      const data = await reportsService.getTaskTypeSummary({
        start_date: dateRange.startDate,
        end_date: dateRange.endDate,
        category_filters: JSON.stringify(formatCategoryFiltersForAPI()),
        grouping: taskTypeGrouping // Add grouping parameter
      });
      setTaskTypeSummary(data.taskTypeSummary || []);
    } catch (error) {
      console.error('Error fetching task type summary:', error);
      setTaskTypeSummaryError('Failed to load task type summary');
      setTaskTypeSummary([]);
    } finally {
      setTaskTypeSummaryLoading(false);
    }
  };

  // Fetch event summary data
  const fetchEventSummary = async () => {
    setEventSummaryLoading(true);
    setEventSummaryError(null);
    try {
      const data = await reportsService.getConsolidatedEventSummary({
        start_date: dateRange.startDate,
        end_date: dateRange.endDate,
        category_filters: JSON.stringify(formatCategoryFiltersForAPI())
      });
      setEventSummary(data.eventSummary || []);
    } catch (error) {
      console.error('Error fetching event summary:', error);
      setEventSummaryError('Failed to load event summary');
      setEventSummary([]);
    } finally {
      setEventSummaryLoading(false);
    }
  };

  // Load more events when scrolling in event container
  useEffect(() => {
    const container = eventListContainerRef.current;
    if (!container) return;

    let timeoutId = null; // To debounce scroll events

    const handleEventScroll = () => {
      // Debounce the scroll event to avoid excessive calls
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        if (!sidebarEventListHasMore || sidebarEventListLoadingMore) return;

        // Check if we're near the bottom of the container
        const threshold = 20; // pixels from bottom to trigger load
        const position = container.scrollTop + container.clientHeight;
        const height = container.scrollHeight;

        if (position >= height - threshold) {
          // Load next page if not already loading
          fetchSidebarEventList(sidebarEventListPage + 1, true);
        }
      }, 100); // Debounce for 100ms
    };

    // Add scroll listener
    container.addEventListener('scroll', handleEventScroll);

    // Initial check in case the content is smaller than container
    handleEventScroll();

    // Clean up
    return () => {
      container.removeEventListener('scroll', handleEventScroll);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [sidebarEventListHasMore, sidebarEventListLoadingMore, sidebarEventListPage, fetchSidebarEventList]);

  // Refresh data when tasks are updated elsewhere
  useEffect(() => {
    if (!loading) {
      fetchReportData();
      fetchTaskList();
      fetchEventList();  // Also refresh events
      fetchSidebarTaskList(1, false); // Fetch first page, don't append
      fetchSidebarTaskListTotal(); // Fetch total count
      fetchSidebarEventList(1, false); // Fetch first page, don't append
      fetchSidebarEventTotal(); // Fetch total count
      fetchTaskCompletionTrend();
      fetchTaskTypeSummary(); // Refresh task type summary
      fetchEventSummary(); // Refresh event summary
    }
  }, [updateTrigger, dateRange]);

  // Refresh print preview data when category filters change while print modal is open
  useEffect(() => {
    if (isPrintModalOpen && !loading) {
      fetchTaskList();
      fetchEventList();  // Also refresh events for preview
      fetchSidebarTaskList(1, false); // Fetch first page, don't append
      fetchSidebarEventList(1, false); // Fetch first page, don't append
      fetchTaskTypeSummary(); // Also refresh task type summary for preview
      fetchEventSummary(); // Also refresh event summary for preview
    }
  }, [categoryFilters, isPrintModalOpen, loading]);

  // Add CSS for zoom that doesn't affect printing 
  useEffect(() => {
    // Create style element
    const style = document.createElement('style');
    style.id = 'reports-zoom-styles';
    style.textContent = `
      @media screen {
        .zoom-50 { transform: scale(0.5); transform-origin: top center; }
        .zoom-75 { transform: scale(0.75); transform-origin: top center; }
        .zoom-100 { transform: scale(1); transform-origin: top center; }
        .zoom-125 { transform: scale(1.25); transform-origin: top center; }
        .zoom-150 { transform: scale(1.5); transform-origin: top center; }
        .zoom-175 { transform: scale(1.75); transform-origin: top center; }
        .zoom-200 { transform: scale(2); transform-origin: top center; }
      }
      @media print {
        .zoom-50, .zoom-75, .zoom-100, .zoom-125, .zoom-150, .zoom-175, .zoom-200 {
          transform: none !important;
          transform-origin: initial !important;
        }
      }
    `;

    // Add style to head
    document.head.appendChild(style);

    // Cleanup function to remove the style when component unmounts
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Add CSS for fixed paper sizes 
  useEffect(() => {
    // Create style element
    const style = document.createElement('style');
    style.id = 'reports-paper-styles';
    style.textContent = `
      @media screen {
        .paper-a4 {
          width: 8.27in !important;
          height: 11.69in !important;
          overflow: hidden;
        }
        .paper-letter {
          width: 8.5in !important;
          height: 11in !important;
          overflow: hidden;
        }
        .paper-folio {
          width: 8.5in !important;
          height: 13in !important;
          overflow: hidden;
        }
      }
      @media print {
        .paper-a4 {
          width: 8.27in !important;
          height: 11.69in !important;
          overflow: hidden;
        }
        .paper-letter {
          width: 8.5in !important;
          height: 11in !important;
          overflow: hidden;
        }
        .paper-folio {
          width: 8.5in !important;
          height: 13in !important;
          overflow: hidden;
        }
        .page {
          page-break-after: always;
          break-after: page;
        }
        .page:last-child {
          page-break-after: avoid;
          break-after: avoid;
        }
      }
    `;

    // Add style to head
    document.head.appendChild(style);

    // Cleanup function to remove the style when component unmounts
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Generate activity breakdown chart data for Chart.js
  const activityBreakdownChartData = {
    labels: ['Pending', 'In Progress', 'Overdue', 'Completed'],
    datasets: [
      {
        label: 'Task Status',
        data: [
          reportStats.taskStats.pending_tasks || 0,
          reportStats.taskStats.in_progress_tasks || 0,
          reportStats.taskStats.overdue_tasks || 0,
          reportStats.taskStats.completed_tasks || 0
        ],
        backgroundColor: ['#2196F3', '#3F51B5', '#00BCD4', '#4CAF50'], // Shades of blue and green
        hoverOffset: 4
      }
    ]
  };

  // Add custom CSS for list heights
  useEffect(() => {
    // Create style element
    const style = document.createElement('style');
    style.textContent = `
      .custom-list-height {
        height: 34rem !important;
      }
    `;

    // Add style to head
    document.head.appendChild(style);

    // Cleanup function to remove the style when component unmounts
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Chart options
  const lineChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.y}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      }
    }
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '50%', // Creates the doughnut hole in the center
    plugins: {
      legend: {
        display: false, // Hide the built-in legend since we're using custom legend
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = Math.round((value / total) * 100);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  // Helper function to determine if signature section has all fields populated (dynamic signatory system)
  const hasAllSignatureFields = () => {
    // Check if signatoryData is in array format
    if (Array.isArray(signatoryData)) {
      return signatoryData.length > 0 && signatoryData.every(sig => sig.name && sig.position);
    }
    
    return false;
  };

  // Function to create PDFMake document definition for the report
  const createReportDefinition = async () => {
    return new Promise(async (resolve) => {
      // Start building the content array
      let content = [];

      // Load logo images as base64
      let leftLogoImage = null;
      let rightLogoImage = null;

      try {
        // Fetch and convert left logo to base64
        const leftLogoResponse = await fetch('/logo/logoleft.png');
        if (leftLogoResponse.ok) {
          const leftLogoBlob = await leftLogoResponse.blob();
          leftLogoImage = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(leftLogoBlob);
          });
        }
      } catch (error) {
        console.warn('Failed to load left logo image:', error);
      }

      try {
        // Fetch and convert right logo to base64
        const rightLogoResponse = await fetch('/logo/logoright.png');
        if (rightLogoResponse.ok) {
          const rightLogoBlob = await rightLogoResponse.blob();
          rightLogoImage = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(rightLogoBlob);
          });
        }
      } catch (error) {
        console.warn('Failed to load right logo image:', error);
      }

      // Header section
      content.push({
        columns: [
          {
            width: 64,
            stack: [
              leftLogoImage ? {
                image: leftLogoImage,
                width: 64,
                height: 64,
                alignment: 'center',
                margin: [0, 5, 0, 0]
              } : {
                text: '[LOGO]',
                fontSize: 10,
                alignment: 'center',
                bold: true,
                margin: [0, 10, 0, 0]
              }
            ],
            margin: [0, 0, 2, 0]
          },
          {
            width: '*',
            alignment: 'center',
            stack: [
              { text: 'Republic of the Philippines', fontSize: 10, margin: [0, 0, 0, 1] },
              { text: 'OFFICE OF THE PRESIDENT', fontSize: 10, margin: [0, 0, 0, 1] },
              { text: 'COMMISSION ON HIGHER EDUCATION', fontSize: 10, bold: true, margin: [0, 0, 0, 1] },
              { text: 'Regional Office I', fontSize: 10, margin: [0, 0, 0, 1] },
              { text: 'San Fernando City, La Union', fontSize: 10, margin: [0, 0, 0, 8] }
            ],
            margin: [2, 0, 2, 15]
          },
          {
            width: 64,
            stack: [
              rightLogoImage ? {
                image: rightLogoImage,
                width: 64,
                height: 64,
                alignment: 'center',
                margin: [0, 5, 0, 0]
              } : {
                text: '[LOGO]',
                fontSize: 10,
                alignment: 'center',
                bold: true,
                margin: [0, 10, 0, 0]
              }
            ],
            margin: [2, 0, 0, 0]
          }
        ]
      });

      // Add the rest of the document content by duplicating the logic from the original function
      // Report title and date
      content.push(
        {
          text: 'ACCOMPLISHMENT REPORT',
          fontSize: 12,
          bold: true,
          alignment: 'center',
          margin: [0, 0, 0, 5]
        },
        {
          text: `For the period of ${formatPrintDateRange(dateRange.startDate, dateRange.endDate)}`,
          fontSize: 12,
          alignment: 'center',
          margin: [0, 0, 0, 30]
        }
      );


      // Combined task/event list section if enabled
      if (printSections.taskList && (groupedTasks.length > 0 || groupedEvents.length > 0)) {
        // Get all unique dates and sort them chronologically
        const allDatesSet = new Set();

        groupedTasks.forEach(group => allDatesSet.add(group.date));
        groupedEvents.forEach(group => allDatesSet.add(group.date));

        // Convert to array and sort chronologically based on the original date format
        const allDates = Array.from(allDatesSet);
        const sortedDates = allDates.sort((dateA, dateB) => {
          // Convert the date strings to actual Date objects for comparison
          // The format is "Month DD, YYYY" (e.g., "October 28, 2025")
          const dateAObj = new Date(dateA);
          const dateBObj = new Date(dateB);
          return dateAObj - dateBObj;
        });

        // Process each date, combining tasks and events
        sortedDates.forEach(date => {
          // Get tasks for this date
          const taskGroup = groupedTasks.find(g => g.date === date);
          // Get events for this date
          const eventGroup = groupedEvents.find(g => g.date === date);

          // Combine items for this date
          let combinedItems = [];

          // Add tasks first
          if (taskGroup) {
            combinedItems = combinedItems.concat(taskGroup.tasks.map(task => task.description || 'No description'));
          }

          // Add events next
          if (eventGroup) {
            combinedItems = combinedItems.concat(eventGroup.events.map(event => event.description || 'No description'));
          }

          // Only add the date section if there are items to display
          if (combinedItems.length > 0) {
            content.push(
              {
                text: `Tasks/Activities Undertaken (${date}):`,
                bold: true,
                fontSize: 12,
                margin: [0, 0, 0, 10]
              },
              {
                ul: combinedItems.map(item => ({
                  text: item,
                  fontSize: 12,
                  margin: [0, 0, 0, 5]
                })),
                margin: [20, 0, 0, 15]
              }
            );
          }
        });
      } else if (printSections.taskList) {
        content.push(
          {
            text: 'TASKS/ACTIVITIES UNDERTAKEN',
            bold: true,
            fontSize: 12,
            margin: [0, 0, 0, 10]
          },
          {
            text: 'No tasks found for the selected date range',
            color: '#6b7280',
            alignment: 'center',
            margin: [0, 10, 0, 20]
          }
        );
      }

      // Add signature section using dynamic signatory system
      let signatureSection = [];

      // Use signatoryData directly as an array
      const signatoryArray = Array.isArray(signatoryData) ? 
        signatoryData.filter(sig => sig.name || sig.position) : [];

      // Check if all signature fields are populated to determine if we need a new page
      const hasAllSignatureFieldsPDF = () => {
        return signatoryArray.length > 0 && signatoryArray.every(sig => sig.name && sig.position);
      };

      if (signatoryArray.length > 0) {
        // Process signatories in pairs (left/right columns) with remaining ones below
        for (let i = 0; i < signatoryArray.length; i += 2) {
          const leftSig = signatoryArray[i];
          const rightSig = signatoryArray[i + 1];

          if (rightSig) {
            // Two signatories in this row
            signatureSection.push({
              columns: [
                {
                  width: '50%',
                  stack: [
                    { text: leftSig.title || `Signatory ${i + 1}`, margin: [0, 0, 0, 15] },
                    ...(leftSig.name ? [{ text: leftSig.name, fontSize: 12, bold: true, margin: [0, 10, 0, 0] }] : []),
                    ...(leftSig.position ? [{ text: leftSig.position, fontSize: 12, margin: [0, 5, 0, 0] }] : [])
                  ]
                },
                {
                  width: '50%',
                  stack: [
                    { text: rightSig.title || `Signatory ${i + 2}`, margin: [0, 0, 0, 15] },
                    ...(rightSig.name ? [{ text: rightSig.name, fontSize: 12, bold: true, margin: [0, 10, 0, 0] }] : []),
                    ...(rightSig.position ? [{ text: rightSig.position, fontSize: 12, margin: [0, 5, 0, 0] }] : [])
                  ]
                }
              ],
              margin: [0, 0, 0, 30]
            });
          } else {
            // Single signatory in this row
            signatureSection.push({
              columns: [
                {
                  width: '50%',
                  stack: [
                    { text: leftSig.title || `Signatory ${i + 1}`, margin: [0, 0, 0, 15] },
                    ...(leftSig.name ? [{ text: leftSig.name, fontSize: 12, bold: true, margin: [0, 10, 0, 0] }] : []),
                    ...(leftSig.position ? [{ text: leftSig.position, fontSize: 12, margin: [0, 5, 0, 0] }] : [])
                  ]
                },
                {
                  width: '50%',
                  stack: [] // Empty space to maintain layout
                }
              ],
              margin: [0, 0, 0, 30]
            });
          }
        }
      }

      if (signatureSection.length > 0) {
        // Add spacer before signature section
        content.push({ text: ' ', margin: [0, 40, 0, 0] }); // Spacer
        content = content.concat(signatureSection);
      }

      const docDefinition = {
        pageSize: pageSize.toLowerCase() === 'folio' ? { width: 612, height: 936 } : // 8.5in x 13in in points (72 points per inch)
                   pageSize.toLowerCase() === 'letter' ? 'LETTER' : 'A4',
        pageMargins: [60, 60, 60, 80], // Increased bottom margin to prevent content bleeding
        content: content,
        footer: (currentPage, pageCount) => {
          return {
            text: `Page ${currentPage} of ${pageCount}`,
            alignment: 'right',
            margin: [0, 0, 60, 10],
            fontSize: 10
          };
        },
        defaultStyle: {
          font: 'Roboto', // PDFMake default font
          fontSize: 12
        },
        styles: {
          statBox: {
            fillColor: '#f3f4f6',
            padding: 15,
            borderRadius: 5,
            color: '#6b7280'
          }
        }
      };

      resolve(docDefinition);
    });
  };

const generatePDF = async () => {
    try {
      const docDefinition = await createReportDefinition();
      pdfMake.createPdf(docDefinition).download('accomplishment_report.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF: ' + error.message);
    }
  };

  // Function to generate PDF blob for preview
  const generatePDFBlob = async () => {
    try {
      const docDefinition = await createReportDefinition();
      return new Promise((resolve, reject) => {
        pdfMake.createPdf(docDefinition).getBlob((blob) => {
          resolve(blob);
        }, (error) => {
          reject(error);
        });
      });
    } catch (error) {
      console.error('Error generating PDF blob:', error);
      return Promise.reject(error);
    }
  };

  // Function to show PDF preview
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [showPdfPreviewModal, setShowPdfPreviewModal] = useState(false);

  const showPdfPreview = async () => {
    try {
      // Fetch fresh signatory data from localStorage when opening preview
      if (user) {
        const savedSignatories = localStorage.getItem(`signatories_${user?.id}`);
        if (savedSignatories) {
          try {
            const freshSignatoryData = JSON.parse(savedSignatories);
            // Only update state if data is different to prevent unnecessary re-renders
            if (JSON.stringify(freshSignatoryData) !== JSON.stringify(signatoryData)) {
              setSignatoryData(freshSignatoryData);
            }
          } catch (parseError) {
            console.error('Error parsing fresh signatory data:', parseError);
          }
        }
      }
      
      // Small delay to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const blob = await generatePDFBlob();
      const url = URL.createObjectURL(blob);
      setPdfPreviewUrl(url);
      setShowPdfPreviewModal(true);
    } catch (error) {
      console.error('Error generating PDF preview:', error);
      alert('Failed to generate PDF preview: ' + error.message);
    }
  };

  // Update PDF preview when page size or signatory data changes
  useEffect(() => {
    if (showPdfPreviewModal) {
      // Regenerate the PDF when page size or signatory data changes while modal is open
      const regeneratePreview = async () => {
        try {
          const blob = await generatePDFBlob();
          const url = URL.createObjectURL(blob);
          setPdfPreviewUrl(url);
        } catch (error) {
          console.error('Error regenerating PDF preview:', error);
        }
      };
      regeneratePreview();
    }
  }, [pageSize, signatoryData, showPdfPreviewModal]);

  // Function to handle PDF printing from preview
  const handlePrintFromPreview = () => {
    if (pdfPreviewUrl) {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = pdfPreviewUrl;
      document.body.appendChild(iframe);
      
      iframe.onload = () => {
        iframe.contentWindow.print();
        document.body.removeChild(iframe);
      };
    }
  };

  // Function to close preview modal and revoke URL
  const closePdfPreviewModal = () => {
    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl);
      setPdfPreviewUrl(null);
    }
    setShowPdfPreviewModal(false);
  };

  // Function to download the PDF
  const downloadPdf = async () => {
    try {
      const docDefinition = createReportDefinition();
      pdfMake.createPdf(docDefinition).download('accomplishment_report.pdf');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF: ' + error.message);
    }
  };

  // Function to export task type summary to CSV
  const exportTaskTypeSummaryToCSV = () => {
    if (taskTypeSummary.length === 0) {
      alert('No data to export');
      return;
    }

    let csvContent = '';
    if (taskTypeGrouping === 'type') {
      // When grouped by type only, export as Type,Quantity with date range
      csvContent = `Date Range: ${dateRange.startDate} to ${dateRange.endDate}\n\nTask Type,Quantity\n`;
      taskTypeSummary.forEach(item => {
        const type = item.type_name || 'N/A';
        const quantity = item.quantity || 0;
        // Properly escape commas, quotes, and newlines in values
        const escapedType = type.includes(',') || type.includes('"') || type.includes('\n')
          ? `"${type.replace(/"/g, '""')}"` : type;
        csvContent += `${escapedType},${quantity}\n`;
      });
    } else if (taskTypeGrouping === 'combined') {
      // When grouped combined, export as Task Type,Sub Type,Record Count,Quantity with date range
      csvContent = `Date Range: ${dateRange.startDate} to ${dateRange.endDate}\n\nTask Type,Sub Type,Record Count,Quantity\n`;
      taskTypeSummary.forEach(item => {
        const type = item.type_name || 'N/A';
        const subType = item.sub_type_name || 'N/A';
        const quantity = item.quantity || 0;
        const recordCount = item.record_count || 0;

        // Properly escape commas, quotes, and newlines in values
        const escapedType = type.includes(',') || type.includes('"') || type.includes('\n')
          ? `"${type.replace(/"/g, '""')}"` : type;
        const escapedSubType = subType.includes(',') || subType.includes('"') || subType.includes('\n')
          ? `"${subType.replace(/"/g, '""')}"` : subType;
        csvContent += `${escapedType},${escapedSubType},${recordCount},${quantity}\n`;
      });
    } else {
      // When grouped by type and subtype, export as Type,Sub Type,Quantity with date range
      csvContent = `Date Range: ${dateRange.startDate} to ${dateRange.endDate}\n\nTask Type,Sub Type,Quantity\n`;
      taskTypeSummary.forEach(item => {
        const type = item.type_name || 'N/A';
        const subType = item.sub_type_name || 'N/A';
        const quantity = item.quantity || 0;
        // Properly escape commas, quotes, and newlines in values
        const escapedType = type.includes(',') || type.includes('"') || type.includes('\n')
          ? `"${type.replace(/"/g, '""')}"` : type;
        const escapedSubType = subType.includes(',') || subType.includes('"') || subType.includes('\n')
          ? `"${subType.replace(/"/g, '""')}"` : subType;
        csvContent += `${escapedType},${escapedSubType},${quantity}\n`;
      });
    }

    // Create a Blob and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `task_type_summary_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Function to export event summary to CSV
  const exportEventSummaryToCSV = () => {
    if (eventSummary.length === 0) {
      alert('No data to export');
      return;
    }

    // Export event summary with date range
    let csvContent = `Date Range: ${dateRange.startDate} to ${dateRange.endDate}\n\nEvent Category,Event Type,Record Count,Quantity\n`;
    eventSummary.forEach(item => {
      const category = item.category_name || 'N/A';
      const type = item.type_name || 'N/A';
      const quantity = item.quantity || 0;
      const recordCount = item.record_count || 0;

      // Properly escape commas, quotes, and newlines in values
      const escapedCategory = category.includes(',') || category.includes('"') || category.includes('\n')
        ? `"${category.replace(/"/g, '""')}"` : category;
      const escapedType = type.includes(',') || type.includes('"') || type.includes('\n')
        ? `"${type.replace(/"/g, '""')}"` : type;
      csvContent += `${escapedCategory},${escapedType},${recordCount},${quantity}\n`;
    });

    // Create a Blob and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `event_summary_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="layout-content-container flex flex-col w-full gap-8">
      <div className="flex justify-between items-center">
        <h1 className="text-[#111418] dark:text-white text-3xl font-bold">Reports</h1>
        <div className="flex items-center gap-4">
          <div className="relative"
               onMouseEnter={() => setIsCategoryFiltersHovered(true)}
               onMouseLeave={() => setIsCategoryFiltersHovered(false)}>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 h-[34px]"
              onClick={() => setShowCategoryFiltersDropdown(s => !s)}
              onMouseEnter={() => setIsCategoryFiltersHovered(true)}
            >
              <span className="material-symbols-outlined text-sm">filter_list</span>
              <span className="text-sm">Category</span>
            </Button>
            {showCategoryFiltersDropdown && !loadingCategories && (
              <div
                ref={categoryFiltersDropdownRef}
                onMouseEnter={() => setIsCategoryFiltersHovered(true)}
                onMouseLeave={() => setIsCategoryFiltersHovered(false)}
              >
                <CategoryFiltersDropdown
                  filters={categoryFilters}
                  onChange={handleCategoryFilterChange}
                  taskCategories={taskCategories}
                  eventCategories={eventCategories}
                />
              </div>
            )}
          </div>
          <Button
            variant="outline"
            className="flex items-center gap-2 h-[34px]"
            onClick={showPdfPreview}
          >
            <span className="material-symbols-outlined">visibility</span>
            Preview Report
          </Button>
                    <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
            <input
              className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-medium px-4 py-1.5 rounded-l-lg border-0 focus:outline-none focus:ring-2 focus:ring-primary-500 w-36 [color-scheme:light] dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:text-white dark:[&::-webkit-calendar-picker-indicator]:text-white"
              type="date"
              value={dateRange.startDate}
              onChange={(e) => {
                const newStartDate = e.target.value;
                // If new start date is after current end date, update end date to match start date
                if (newStartDate > dateRange.endDate) {
                  setDateRange({
                    ...dateRange,
                    startDate: newStartDate,
                    endDate: newStartDate
                  });
                } else {
                  setDateRange({
                    ...dateRange,
                    startDate: newStartDate
                  });
                }
              }}
            />
            <span className="px-2 text-gray-500 dark:text-gray-400">-</span>
            <input
              className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-medium px-4 py-1.5 rounded-r-lg border-0 focus:outline-none focus:ring-2 focus:ring-primary-500 w-36 [color-scheme:light] dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:text-white dark:[&::-webkit-calendar-picker-indicator]:text-white"
              type="date"
              value={dateRange.endDate}
              min={dateRange.startDate} // Ensure end date can't be earlier than start date
              onChange={(e) => {
                const newEndDate = e.target.value;
                // If new end date is before current start date, update start date to match end date
                if (newEndDate < dateRange.startDate) {
                  setDateRange({
                    ...dateRange,
                    startDate: newEndDate,
                    endDate: newEndDate
                  });
                } else {
                  setDateRange({
                    ...dateRange,
                    endDate: newEndDate
                  });
                }
              }}
            />
          </div>
        </div>
      </div>
      
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Combined chart card for Task Completion Rate and Activity Breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-[#111418] dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em] pb-4">Performance Overview</h2>
            <div className="space-y-2 sm:space-y-4">
              <div className="h-56 sm:h-64">
                <h3 className="text-lg font-medium text-[#617589] dark:text-gray-400 mb-2 text-left">Task Completion Rate</h3>
                <div className="h-full">
                  <div className="h-full flex justify-start">
                    <Line data={taskCompletionData} options={lineChartOptions} />
                  </div>
                </div>
              </div>
              <div className="h-64 sm:h-72">
                <h3 className="text-lg font-medium text-[#617589] dark:text-gray-400 mb-2 text-left">Activity Breakdown</h3>
                <div className="h-full">
                  <div className="h-full flex items-center flex-col sm:flex-row">
                    <div className="w-full sm:w-2/3 h-40 sm:h-56 flex items-center justify-start">
                      <Pie type="doughnut" data={activityBreakdownChartData} options={pieChartOptions} />
                    </div>
                    <div className="w-full sm:w-1/3 flex flex-col items-start justify-center pl-0 sm:pl-4 mt-2 sm:mt-0">
                      {activityBreakdownChartData.labels.map((label, index) => (
                        <div key={label} className="flex items-center my-1">
                          <div
                            className="w-3 h-3 mr-2 rounded-full"
                            style={{ backgroundColor: activityBreakdownChartData.datasets[0].backgroundColor[index] }}
                          ></div>
                          <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Task List Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-[#111418] dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em] pb-2">
              Task List
              {sidebarTaskListTotal > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                  ({sidebarTaskListTotal})
                </span>
              )}
            </h2>
            <div
              ref={taskListContainerRef}
              className="custom-list-height overflow-y-auto scrollbar-hide pb-1"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Title</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {sidebarTaskList.length > 0 ? (
                    sidebarTaskList.map((task, index) => (
                      <tr key={task.id || index} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {task.task_date ? formatToLocalDateTime(task.task_date).split(',')[0] : (task.created_date ? formatToLocalDateTime(task.created_date).split(',')[0] : 'N/A')}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white max-w-xs truncate" title={task.title}>
                          {task.title || 'No title'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="2" className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        No tasks found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {sidebarTaskListLoadingMore && (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              )}
            </div>
          </div>

          {/* Event List Card - now positioned as the third column beside Task List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-[#111418] dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em] pb-2">
              Event List
              {sidebarEventTotal > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                  ({sidebarEventTotal})
                </span>
              )}
            </h2>
            <div
              ref={eventListContainerRef}
              className="custom-list-height overflow-y-auto scrollbar-hide pb-1"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Title</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {sidebarEventList.length > 0 ? (
                    sidebarEventList.map((event, index) => (
                      <tr key={event.id || index} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {event.start_date ? formatToLocalDateTime(event.start_date).split(',')[0] : (event.created_at ? formatToLocalDateTime(event.created_at).split(',')[0] : 'N/A')}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white max-w-xs truncate" title={event.title}>
                          {event.title || 'No title'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="2" className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        No events found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {sidebarEventListLoadingMore && (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Consolidated Tasks Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
            <h2 className="text-[#111418] dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em]">
              Consolidated Tasks
            </h2>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={exportTaskTypeSummaryToCSV}
                disabled={taskTypeSummaryLoading}
              >
                <span className="material-symbols-outlined text-sm">download</span>
                Export as CSV
              </Button>
            </div>
          </div>

          {taskTypeSummaryLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : taskTypeSummaryError ? (
            <div className="text-center py-8 text-red-500">
              {taskTypeSummaryError}
            </div>
          ) : taskTypeSummary.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No task type summary data available
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {(() => {
                // Group the data by task type
                const groupedData = {};
                taskTypeSummary.forEach(item => {
                  const type = item.type_name || 'N/A';
                  if (!groupedData[type]) {
                    groupedData[type] = [];
                  }
                  groupedData[type].push(item);
                });

                // Convert grouped data to cards - one card per task type showing all its sub types with consolidated quantities
                const cards = [];
                Object.entries(groupedData).forEach(([taskType, subTypes]) => {
                  // Consolidate quantities and record counts for the same sub type under each task type
                  const consolidatedSubTypes = {};
                  let totalQuantity = 0; // Track total quantity for this task type
                  subTypes.forEach(item => {
                    const subType = item.sub_type_name || 'N/A';
                    if (!consolidatedSubTypes[subType]) {
                      consolidatedSubTypes[subType] = { quantity: 0, record_count: 0 };
                    }
                    consolidatedSubTypes[subType].quantity += item.quantity || 0;
                    consolidatedSubTypes[subType].record_count += item.record_count || 0;
                    totalQuantity += item.quantity || 0;
                  });

                  cards.push(
                    <div
                      key={taskType}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 cursor-default"
                    >
                      <div className="font-bold text-gray-900 dark:text-white text-sm mb-2">
                        {taskType}
                      </div>
                      <div className="space-y-1">
                        {Object.entries(consolidatedSubTypes).map(([subType, data], idx) => (
                          <div key={idx} className="flex justify-between text-xs">
                            <span className="text-gray-700 dark:text-gray-300 truncate max-w-[60%]">
                              {subType} ({data.record_count})
                            </span>
                            <span className="text-gray-900 dark:text-white font-medium">
                              {data.quantity}
                            </span>
                          </div>
                        ))}
                        {/* Total line for this task type */}
                        <div className="flex justify-between text-xs border-t border-gray-200 dark:border-gray-600 pt-1 mt-1">
                          <span className="text-gray-900 dark:text-white font-bold">
                            Total
                          </span>
                          <span className="text-gray-900 dark:text-white font-bold">
                            {totalQuantity}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                });

                return cards;
              })()}
            </div>
          )}
        </div>

        {/* Consolidated Events Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
            <h2 className="text-[#111418] dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em]">
              Consolidated Events
            </h2>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={exportEventSummaryToCSV}
                disabled={eventSummaryLoading}
              >
                <span className="material-symbols-outlined text-sm">download</span>
                Export as CSV
              </Button>
            </div>
          </div>

          {eventSummaryLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : eventSummaryError ? (
            <div className="text-center py-8 text-red-500">
              {eventSummaryError}
            </div>
          ) : eventSummary.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No event summary data available
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {(() => {
                // Group the data by event category
                const groupedData = {};
                eventSummary.forEach(item => {
                  const category = item.category_name || 'N/A';
                  if (!groupedData[category]) {
                    groupedData[category] = [];
                  }
                  groupedData[category].push(item);
                });

                // Convert grouped data to cards - one card per event category showing all its event types with consolidated quantities
                const cards = [];
                Object.entries(groupedData).forEach(([eventCategory, eventTypes]) => {
                  // Consolidate quantities for the same event type under each event category
                  const consolidatedEventTypes = {};
                  let totalQuantity = 0; // Track total quantity for this event category
                  eventTypes.forEach(item => {
                    const eventType = item.type_name || 'N/A';
                    if (!consolidatedEventTypes[eventType]) {
                      consolidatedEventTypes[eventType] = { quantity: 0, record_count: 0 };
                    }
                    consolidatedEventTypes[eventType].quantity += item.quantity || 0;
                    consolidatedEventTypes[eventType].record_count += item.record_count || 0;
                    totalQuantity += item.quantity || 0;
                  });

                  cards.push(
                    <div
                      key={eventCategory}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 cursor-default"
                    >
                      <div className="font-bold text-gray-900 dark:text-white text-sm mb-2">
                        {formatCategoryName(eventCategory)}
                      </div>
                      <div className="space-y-1">
                        {Object.entries(consolidatedEventTypes).map(([eventType, data], idx) => (
                          <div key={idx} className="flex justify-between text-xs">
                            <span className="text-gray-700 dark:text-gray-300 truncate max-w-[60%]">
                              {eventType}
                            </span>
                            <span className="text-gray-900 dark:text-white font-medium">
                              {data.quantity}
                            </span>
                          </div>
                        ))}
                        {/* Total line for this event category */}
                        <div className="flex justify-between text-xs border-t border-gray-200 dark:border-gray-600 pt-1 mt-1">
                          <span className="text-gray-900 dark:text-white font-bold">
                            Total
                          </span>
                          <span className="text-gray-900 dark:text-white font-bold">
                            {totalQuantity}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                });

                return cards;
              })()}
            </div>
          )}
        </div>

      {/* Fullscreen Print Report Modal */}
      <div className={`fixed inset-0 z-[1000] bg-gray-100 dark:bg-gray-800 flex flex-col ${isPrintModalOpen ? 'block' : 'hidden'}`}>
        {/* Modal Header */}
        <div className="w-full max-w-7xl flex justify-end items-center px-4 py-4 sticky top-0 z-50" style={{background: 'transparent'}}>
        </div>

        {/* Document Content */}
        <div className="flex-grow overflow-auto p-4 bg-gray-100 dark:bg-gray-800">
          <div className="flex justify-center">
            <div 
              className={`page-container space-y-8 ${pageSize.toLowerCase() === 'folio' ? 'max-w-[8.5in]' : pageSize.toLowerCase() === 'letter' ? 'max-w-[8.5in]' : 'max-w-[8.27in]'} zoom-${zoomLevel}`}
            >
              {renderReportPages()}
            </div>
          </div>
        </div>
        
      </div>

      {/* PDF Preview Modal */}
      <div className={`fixed inset-0 z-[1001] bg-gray-100 dark:bg-gray-800 flex flex-col ${showPdfPreviewModal ? 'block' : 'hidden'}`}>
        {/* Modal Header */}
        <div className="w-full max-w-7xl flex justify-between items-center px-4 py-4 sticky top-0 z-50 bg-white dark:bg-gray-800">
          <div className="flex items-center gap-2 text-sm">
            <label htmlFor="pdf-page-size-select" className="text-gray-700 dark:text-gray-300">Page Size:</label>
            <select
              id="pdf-page-size-select"
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              onClick={(e) => e.stopPropagation()} // Prevent click from affecting modal
            >
              <option value="A4">A4</option>
              <option value="Letter">Letter</option>
              <option value="Folio">Folio</option>
            </select>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => {
                const link = document.createElement('a');
                link.href = pdfPreviewUrl;
                link.download = 'accomplishment_report.pdf'; // Keep original filename
                link.click();
              }}
              className="flex items-center gap-2"
            >
              <span className="material-symbols-outlined mr-2">download</span>
              Download
            </Button>
            <Button
              variant="outline"
              onClick={closePdfPreviewModal}
              className="flex items-center gap-2"
            >
              Close
            </Button>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="flex-grow overflow-hidden bg-gray-100 dark:bg-gray-800">
          {pdfPreviewUrl ? (
            <iframe
              src={pdfPreviewUrl}
              width="100%"
              height="100%"
              style={{ minHeight: '100%', border: 'none' }}
              title="PDF Preview"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
