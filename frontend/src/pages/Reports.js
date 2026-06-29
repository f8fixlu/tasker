import React, { useState, useEffect, useRef } from 'react';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import MarginSettingsModal from '../components/common/MarginSettingsModal';
import { reportsService } from '../services/reportsService';
import { categoryService } from '../services/categoryService';
import { eventCategoryService } from '../services/eventCategoryService';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTaskUpdate } from '../context/TaskUpdateContext';
import { formatToLocalDateTime } from '../utils/date';
import * as pdfjsLib from 'pdfjs-dist';
import { GlobalWorkerOptions } from 'pdfjs-dist';

// Initialize pdfjs worker
GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// Import pdfmake dynamically
let pdfMake = null;
const loadPdfMake = async () => {
  if (!pdfMake) {
    const module = await import('pdfmake/build/pdfmake');
    const fonts = await import('pdfmake/build/vfs_fonts');

    pdfMake = module.default;
    pdfMake.addVirtualFileSystem(fonts.default || fonts);
  }
  return pdfMake;
};

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
  const [headerImage, setHeaderImage] = useState(null);
  const [footerImage, setFooterImage] = useState(null);
  const [showDefaultHeader, setShowDefaultHeader] = useState(true);
  const [headerOnAllPages, setHeaderOnAllPages] = useState(true);
  const [reportTitleText, setReportTitleText] = useState('ACCOMPLISHMENT REPORT');
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
  const [taskTypeSummaryLoaded, setTaskTypeSummaryLoaded] = useState(false);
  const [taskTypeSummaryError, setTaskTypeSummaryError] = useState(null);
  const [taskTypeGrouping, setTaskTypeGrouping] = useState('combined'); // only 'combined' available now

  // State for task hover popup
  const [taskPopup, setTaskPopup] = useState(null);
  const taskPopupTimeoutRef = useRef(null);

  // State for event summary
  const [eventSummary, setEventSummary] = useState([]);
  const [eventSummaryLoading, setEventSummaryLoading] = useState(false);
  const [eventSummaryLoaded, setEventSummaryLoaded] = useState(false);
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
  const [showMarginModal, setShowMarginModal] = useState(false);
  const [pdfMargins, setPdfMargins] = useState({
    page: [60, 36, 60, 36],
    customHeader: [0, 0, 0, 15],
    defaultHeader: [0, 0, 0, 0],
    reportTitle: [0, 0, 0, 5],
    dateRange: [0, 0, 0, 30],
    taskSection: [0, 0, 0, 10],
    dateHeader: [0, 0, 0, 5],
    firstEventLine: [20, 0, 0, 15],
    eachActivity: [0, 10, 0, 20],
    signatoryTitle: [0, 0, 0, 15],
    signatoryName: [0, 10, 0, 0],
    signatoryPosition: [0, 5, 0, 0],
    signatoryWrapper: [0, 0, 0, 30],
    spacer: [0, 40, 0, 0],
    footerLeft: [60, 0, 0, 10],
    footerRight: [0, 0, 60, 10],
    footerImage: [0, 40, 0, 0],
  });

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

  // Load signatory data from API first, fallback to local storage (using only dynamic signatory format)
  const loadSignatoryData = async () => {
    if (user) {
      try {
        // First try to get from API via user profile
        console.log('Loading signatory data from API...');
        const userData = await api.get('/users/profile');
        console.log('User data received:', userData);

        // Check if signatory data exists in user profile
        if (userData.user?.signatories) {
          console.log('Signatories found in user data:', userData.user.signatories);
          let newData = [];
          
          // If signatories is an array (like from DB), use it directly
          if (Array.isArray(userData.user.signatories)) {
            newData = userData.user.signatories;
            console.log('Loaded signatory data from API (array format):', newData);
          } else if (typeof userData.user.signatories === 'object') {
            // If it's in object format, convert to array format
            const signatoryArray = [];

            // Handle signatory1, signatory2, etc. format
            let signatoryIndex = 1;
            while (userData.user.signatories[`signatory${signatoryIndex}`]) {
              const signatoryField = userData.user.signatories[`signatory${signatoryIndex}`];
              if (signatoryField && (signatoryField.name || signatoryField.position)) {
                signatoryArray.push({
                  title: signatoryField.title || `Signatory ${signatoryArray.length + 1}`,
                  name: signatoryField.name || '',
                  position: signatoryField.position || ''
                });
              }
              signatoryIndex++;
            }

            // Also handle legacy format (preparedBy, reviewedBy, notedBy) if they exist
            if (userData.user.signatories.preparedBy && (userData.user.signatories.preparedBy.name || userData.user.signatories.preparedBy.position)) {
              signatoryArray.push({
                title: userData.user.signatories.preparedBy.title || `Signatory ${signatoryArray.length + 1}`,
                name: userData.user.signatories.preparedBy.name || '',
                position: userData.user.signatories.preparedBy.position || ''
              });
            }

            if (userData.user.signatories.reviewedBy && (userData.user.signatories.reviewedBy.name || userData.user.signatories.reviewedBy.position)) {
              signatoryArray.push({
                title: userData.user.signatories.reviewedBy.title || `Signatory ${signatoryArray.length + 1}`,
                name: userData.user.signatories.reviewedBy.name || '',
                position: userData.user.signatories.reviewedBy.position || ''
              });
            }

            if (userData.user.signatories.notedBy && (userData.user.signatories.notedBy.name || userData.user.signatories.notedBy.position)) {
              signatoryArray.push({
                title: userData.user.signatories.notedBy.title || `Signatory ${signatoryArray.length + 1}`,
                name: userData.user.signatories.notedBy.name || '',
                position: userData.user.signatories.notedBy.position || ''
              });
            }

            newData = signatoryArray;
            console.log('Loaded signatory data from API (object format):', newData);
          }

          // Only update state if the data has actually changed
          if (JSON.stringify(newData) !== JSON.stringify(signatoryData)) {
            setSignatoryData(newData);
          }

          // Load header image from API
          if (userData.user?.header_image) {
            setHeaderImage(userData.user.header_image);
          } else {
            const savedHeaderImage = localStorage.getItem(`headerImage_${user?.id}`);
            if (savedHeaderImage) {
              setHeaderImage(savedHeaderImage);
            }
          }

          // Load footer image from API
          if (userData.user?.footer_image) {
            setFooterImage(userData.user.footer_image);
          } else {
            const savedFooterImage = localStorage.getItem(`footerImage_${user?.id}`);
            if (savedFooterImage) {
              setFooterImage(savedFooterImage);
            }
          }

          // Load show default header setting
          if (userData.user?.show_default_header !== undefined) {
            setShowDefaultHeader(!!userData.user.show_default_header);
          } else {
            const saved = localStorage.getItem(`showDefaultHeader_${user?.id}`);
            if (saved !== null) {
              setShowDefaultHeader(saved === 'true');
            }
          }

          // Load header on all pages setting
          if (userData.user?.header_on_all_pages !== undefined) {
            setHeaderOnAllPages(!!userData.user.header_on_all_pages);
          } else {
            const saved = localStorage.getItem(`headerOnAllPages_${user?.id}`);
            if (saved !== null) {
              setHeaderOnAllPages(saved === 'true');
            }
          }

          // Load report title
          if (userData.user?.report_title) {
            setReportTitleText(userData.user.report_title);
          } else {
            const saved = localStorage.getItem(`reportTitleText_${user?.id}`);
            if (saved) {
              setReportTitleText(saved);
            }
          }

          return; // Exit early since we got data from API
        } else {
          console.log('No signatories in API response, trying localStorage');
        }

        // If no signatories in API, try localStorage as fallback
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
          console.log('Loaded signatory data from localStorage:', newData);
        } else {
          // If no data in localStorage, set to empty array only if current state is not already empty
          if (JSON.stringify(signatoryData) !== JSON.stringify([])) {
            setSignatoryData([]);
          }
        }
      } catch (error) {
        console.error('Error loading signatory data from API:', error);
        // Fallback to localStorage if API fails
        console.log('Falling back to localStorage due to API error');
        try {
          const savedSignatories = localStorage.getItem(`signatories_${user?.id}`);
          if (savedSignatories) {
            const parsedData = JSON.parse(savedSignatories);
            let newData = [];
            
            if (Array.isArray(parsedData)) {
              newData = parsedData;
            } else {
              const signatoryArray = [];
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
            
            if (JSON.stringify(newData) !== JSON.stringify(signatoryData)) {
              setSignatoryData(newData);
            }
            console.log('Loaded signatory data from localStorage (fallback):', newData);
          }
        } catch (localStorageError) {
          console.error('Error loading from localStorage:', localStorageError);
        }
        
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
    const renderPageHeader = (pageNum) => {
      if (!headerOnAllPages && pageNum > 0) return null;

      if (headerImage) {
        return (
          <header className="page-header p-6 border-b border-gray-200 flex justify-center" style={{ fontFamily: "'Bookman Old Style', serif", fontSize: '12pt' }}>
            <img src={headerImage} alt="Header" className="max-w-full h-auto" style={{ maxHeight: '100px' }} />
          </header>
        );
      }

      if (!showDefaultHeader) return null;

      return (
        <header className="page-header p-6 border-b border-gray-200 flex justify-center" style={{ fontFamily: "'Bookman Old Style', serif", fontSize: '12pt' }}>
          <img
            src="/header/ched_header.png"
            alt="CHED Header"
            className="max-w-full h-auto"
            style={{ maxHeight: '100px' }}
          />
        </header>
      );
    };

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
        <h1 className="text-center font-bold text-lg tracking-wider">{reportTitleText}</h1>
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
              <div className="h-64 flex flex-row items-center">
                <div className="w-1/2 h-48 flex items-center justify-center">
                  <Pie type="doughnut" data={activityBreakdownChartData} options={pieChartOptions} />
                </div>
                <div className="w-1/2 flex flex-col justify-center pl-2">
                  {activityBreakdownChartData.labels.map((label, index) => (
                    <div key={label} className="flex items-center my-0.5">
                      <div
                        className="w-2.5 h-2.5 mr-1.5 rounded-full"
                        style={{ backgroundColor: activityBreakdownChartData.datasets[0].backgroundColor[index] }}
                      ></div>
                      <span className="text-xs text-gray-700 dark:text-gray-300">{label}</span>
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
      // If there's an error, just show one page with the error
      const shouldShowSignatureOnSamePage = hasSignatoryData;

      pages.push(
        <div key="page-1" className={`page paper-${pageSize.toLowerCase()} bg-white shadow-lg print:shadow-none mb-8`} style={{fontFamily: "'Bookman Old Style', serif", fontSize: '12pt'}}>
          {renderPageHeader(0)}

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
          {renderPageHeader(0)}

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
          {renderPageHeader(0)}

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
            {renderPageHeader(pageNum)}

            {/* Page Content */}
            <div className="page-content p-6 pb-10 flex-grow" style={{ maxHeight: pageSize.toLowerCase() === 'folio' ? '12in' : pageSize.toLowerCase() === 'letter' ? '10in' : '10.69in', overflow: 'hidden' }}>
              <main className="mt-6 flex-grow" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="space-y-4 flex-grow" style={{ overflow: 'hidden' }}>
                  {/* Report title only on first page */}
                  {pageNum === 0 && reportTitle}

                  {/* Maintain same spacing on subsequent pages */}
                  {pageNum > 0 && <div className="mb-12" style={{ height: '60px' }} />}

                  {/* Static content (stats and charts) only on first page */}
                  {pageNum === 0 && staticContent}

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
                          <div key={`combined-${pageNum}-${groupIdx}`} className="mb-10">
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
  const [sidebarEventListLoaded, setSidebarEventListLoaded] = useState(false);
  const [sidebarEventListPage, setSidebarEventListPage] = useState(1);
  const [sidebarEventListHasMore, setSidebarEventListHasMore] = useState(true);
  const [sidebarEventTotal, setSidebarEventTotal] = useState(0);
  const [sidebarEventListLoadingMore, setSidebarEventListLoadingMore] = useState(false);
  const eventListContainerRef = useRef(null);

  // State for sidebar task list
  const [sidebarTaskList, setSidebarTaskList] = useState([]);
  const [sidebarTaskListLoading, setSidebarTaskListLoading] = useState(false);
  const [sidebarTaskListLoaded, setSidebarTaskListLoaded] = useState(false);
  const [sidebarTaskListPage, setSidebarTaskListPage] = useState(1);
  const [sidebarTaskListHasMore, setSidebarTaskListHasMore] = useState(true);
  const [sidebarTaskListTotal, setSidebarTaskListTotal] = useState(0);
  const [sidebarTaskListLoadingMore, setSidebarTaskListLoadingMore] = useState(false);
  const taskListContainerRef = useRef(null);
  const [sidebarTaskPopup, setSidebarTaskPopup] = useState(null);
  const sidebarTaskPopupTimeoutRef = useRef(null);
  const [sidebarEventPopup, setSidebarEventPopup] = useState(null);
  const sidebarEventPopupTimeoutRef = useRef(null);
  const [consolidatedEventPopup, setConsolidatedEventPopup] = useState(null);
  const consolidatedEventPopupTimeoutRef = useRef(null);

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
        setSidebarTaskListLoaded(true);
      } else {
        setSidebarTaskList(prev => [...prev, ...newTasks]);
      }

      setSidebarTaskListHasMore(newTasks.length === 14); // If we got 14 items, there might be more
      setSidebarTaskListPage(page);
    } catch (error) {
      console.error('Error fetching sidebar task list:', error);
      if (page === 1) {
        setSidebarTaskList([]); // Set to empty array on error
        setSidebarTaskListLoaded(true);
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
        setSidebarEventListLoaded(true);
      } else {
        setSidebarEventList(prev => [...prev, ...newEvents]);
      }

      setSidebarEventListHasMore(newEvents.length === 10); // If we got 10 items, there might be more
      setSidebarEventListPage(page);
    } catch (error) {
      console.error('Error fetching sidebar event list:', error);
      if (page === 1) {
        setSidebarEventList([]); // Set to empty array on error
        setSidebarEventListLoaded(true);
      }
    } finally {
      setSidebarEventListLoading(page === 1 ? false : false);
      setSidebarEventListLoadingMore(false);
    }
  };

  // Load task list when component mounts or date range/ category filters change
  useEffect(() => {
    if (!loading) {
      // Reset loaded state when filters change to show skeleton during refresh
      setSidebarTaskListLoaded(false);
      setSidebarEventListLoaded(false);
      setTaskTypeSummaryLoaded(false);
      setEventSummaryLoaded(false);

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
      setTaskTypeSummaryLoaded(true);
    } catch (error) {
      console.error('Error fetching task type summary:', error);
      setTaskTypeSummary([]);
      setTaskTypeSummaryLoaded(true);
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
      setEventSummaryLoaded(true);
    } catch (error) {
      console.error('Error fetching event summary:', error);
      setEventSummary([]);
      setEventSummaryLoaded(true);
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
  const createReportDefinition = async (customHeaderImage, customFooterImage) => {
    const activeHeaderImage = customHeaderImage !== undefined ? customHeaderImage : headerImage;
    const activeFooterImage = customFooterImage !== undefined ? customFooterImage : footerImage;
    return new Promise(async (resolve) => {
      let content = [];

      let chedHeaderImage = null;
      try {
        const response = await fetch('/header/ched_header.png');
        if (response.ok) {
          const blob = await response.blob();
          chedHeaderImage = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }
      } catch (error) {
        // Ignore header image loading errors
      }

      // Build header content (custom or default)
      let headerContent = null;
      if (activeHeaderImage) {
        const hMargin = headerOnAllPages
          ? [pdfMargins.customHeader[0], 36, pdfMargins.customHeader[2], pdfMargins.customHeader[3]]
          : pdfMargins.customHeader;
        headerContent = {
          image: activeHeaderImage,
          width: 450,
          alignment: 'center',
          margin: hMargin
        };
      } else if (showDefaultHeader && chedHeaderImage) {
        const hMargin = headerOnAllPages
          ? [pdfMargins.customHeader[0], 36, pdfMargins.customHeader[2], pdfMargins.customHeader[3]]
          : pdfMargins.customHeader;
        headerContent = {
          image: chedHeaderImage,
          width: 468,
          alignment: 'center',
          margin: hMargin
        };
      }

      // If header on all pages, use pdfmake header function; otherwise add to first page content only
      if (headerOnAllPages && headerContent) {
        // Already computed margin with 36pt top above
      } else if (headerContent) {
        content.push(headerContent);
      }

      // Report title and date
      content.push(
        { text: reportTitleText, style: 'reportTitle' },
        { text: `For the period of ${formatPrintDateRange(dateRange.startDate, dateRange.endDate)}`, style: 'dateRange' }
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
                style: 'taskSectionTitle'
              },
              {
                ul: combinedItems.map(item => ({
                  text: item,
                  style: 'taskItem'
                })),
                style: 'taskList'
              }
            );
          }
        });
      } else if (printSections.taskList) {
        content.push(
          { text: 'TASKS/ACTIVITIES UNDERTAKEN', style: 'taskSectionTitle' },
          { text: 'No tasks found for the selected date range', style: 'noTasksText' }
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
            signatureSection.push({
              columns: [
                {
                  width: '50%',
                  stack: [
                    { text: leftSig.title || `Signatory ${i + 1}`, style: 'signatoryTitle' },
                    ...(leftSig.name ? [{ text: leftSig.name, style: 'signatoryName' }] : []),
                    ...(leftSig.position ? [{ text: leftSig.position, style: 'signatoryPosition' }] : [])
                  ]
                },
                {
                  width: '50%',
                  stack: [
                    { text: rightSig.title || `Signatory ${i + 2}`, style: 'signatoryTitle' },
                    ...(rightSig.name ? [{ text: rightSig.name, style: 'signatoryName' }] : []),
                    ...(rightSig.position ? [{ text: rightSig.position, style: 'signatoryPosition' }] : [])
                  ]
                }
              ],
              style: 'signatoryWrapper'
            });
          } else {
            signatureSection.push({
              columns: [
                {
                  width: '50%',
                  stack: [
                    { text: leftSig.title || `Signatory ${i + 1}`, style: 'signatoryTitle' },
                    ...(leftSig.name ? [{ text: leftSig.name, style: 'signatoryName' }] : []),
                    ...(leftSig.position ? [{ text: leftSig.position, style: 'signatoryPosition' }] : [])
                  ]
                },
                {
                  width: '50%',
                  stack: [] // Empty space to maintain layout
                }
              ],
              style: 'signatoryWrapper'
            });
          }
        }
      }

      if (signatureSection.length > 0) {
        content.push({ text: ' ', style: 'spacer' });
        content = content.concat(signatureSection);
      }

      if (activeFooterImage) {
        content.push({
          image: activeFooterImage,
          width: 450,
          alignment: 'center',
          style: 'footerImage'
        });
      }

      // Adjust top margin to accommodate header on all pages
      let topMargin = 36; // default 0.5in
      if (headerOnAllPages && headerContent) {
        topMargin = 130; // space for header + content
      }

      const pageMarginLeft = pdfMargins.page[0];
      const pageMarginRight = pdfMargins.page[2];
      const pageMarginBottom = pdfMargins.page[3];

      const marginStyles = {
        reportTitle: { margin: pdfMargins.reportTitle, fontSize: 12, bold: true, alignment: 'center' },
        dateRange: { margin: pdfMargins.dateRange, fontSize: 12, alignment: 'center' },
        taskSectionTitle: { margin: pdfMargins.taskSection, bold: true, fontSize: 12 },
        taskItem: { margin: pdfMargins.dateHeader, fontSize: 12 },
        taskList: { margin: pdfMargins.firstEventLine },
        noTasksText: { margin: pdfMargins.eachActivity, color: '#6b7280', alignment: 'center' },
        signatoryTitle: { margin: pdfMargins.signatoryTitle, fontSize: 12 },
        signatoryName: { margin: pdfMargins.signatoryName, fontSize: 12, bold: true },
        signatoryPosition: { margin: pdfMargins.signatoryPosition, fontSize: 12 },
        signatoryWrapper: { margin: pdfMargins.signatoryWrapper },
        spacer: { margin: pdfMargins.spacer },
        footerImage: { margin: pdfMargins.footerImage },
        footerLeft: { margin: pdfMargins.footerLeft, fontSize: 9, italics: true, color: '#6b7280' },
        footerRight: { margin: pdfMargins.footerRight, alignment: 'right', fontSize: 12 },
      };

      const docDefinition = {
        pageSize: pageSize.toLowerCase() === 'folio' ? { width: 612, height: 936 } : // 8.5in x 13in in points (72 points per inch)
                   pageSize.toLowerCase() === 'letter' ? 'LETTER' : 'A4',
        pageMargins: [pageMarginLeft, topMargin, pageMarginRight, pageMarginBottom],
        content: content,
        fonts: {
          Roboto: {
            normal: 'Roboto-Regular.ttf',
            bold: 'Roboto-Medium.ttf',
            italics: 'Roboto-Italic.ttf',
            bolditalics: 'Roboto-MediumItalic.ttf'
          }
        },
        ...(headerOnAllPages && headerContent ? { header: () => headerContent } : {}),
        footer: (currentPage, pageCount) => {
          return {
            columns: [
              { text: 'This report is system generated', style: 'footerLeft' },
              { text: `Page ${currentPage} of ${pageCount}`, style: 'footerRight' }
            ]
          };
        },
        defaultStyle: {
          font: 'Roboto',
          fontSize: 12
        },
        styles: {
          ...marginStyles,
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
      const pdfMakeInstance = await loadPdfMake();
      const docDefinition = await createReportDefinition();
      const pdf = pdfMakeInstance.createPdf(docDefinition);
      pdf.download('accomplishment_report.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF: ' + error.message);
    }
  };

  // Function to generate PDF blob for preview
  const generatePDFBlob = async (customHeaderImage, customFooterImage) => {
    try {
      const pdfMakeInstance = await loadPdfMake();
      const docDefinition = await createReportDefinition(customHeaderImage, customFooterImage);

      const pdf = pdfMakeInstance.createPdf(docDefinition);

      return new Promise((resolve, reject) => {
        pdf.getDataUrl().then((dataUrl) => {
          try {
            const blob = dataURLToBlob(dataUrl);
            resolve(blob);
          } catch (blobErr) {
            reject(new Error('Failed to convert dataUrl to blob: ' + blobErr.message));
          }
        }).catch(err => {
          reject(new Error('getDataUrl failed: ' + err.message));
        });
      });
    } catch (error) {
      console.error('Error generating PDF preview:', error);
      return Promise.reject(error);
    }
  };

  // Helper function to convert dataURL to Blob without using fetch
  const dataURLToBlob = (dataURL) => {
    const parts = dataURL.split(';base64,');
    const type = parts[0].split(':')[1];
    const raw = atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    
    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }
    
    return new Blob([uInt8Array], { type: type });
  };

  // Function to show PDF preview
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [showPdfPreviewModal, setShowPdfPreviewModal] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const showPdfPreview = async () => {
    setIsPreviewLoading(true);
    try {
      // Fetch fresh signatory data and header image from API first, then localStorage when opening preview
      // Use local variables to avoid React async state closure issues
      let freshHeaderImage = headerImage;
      let freshFooterImage = footerImage;

      if (user) {
        try {
          const userData = await api.get('/users/profile');

          if (userData.user?.signatories) {
            let freshSignatoryData = [];

            if (Array.isArray(userData.user.signatories)) {
              freshSignatoryData = userData.user.signatories;
            } else if (typeof userData.user.signatories === 'object') {
              const signatoryArray = [];

              let signatoryIndex = 1;
              while (userData.user.signatories[`signatory${signatoryIndex}`]) {
                const signatoryField = userData.user.signatories[`signatory${signatoryIndex}`];
                if (signatoryField && (signatoryField.name || signatoryField.position)) {
                  signatoryArray.push({
                    title: signatoryField.title || `Signatory ${signatoryArray.length + 1}`,
                    name: signatoryField.name || '',
                    position: signatoryField.position || ''
                  });
                }
                signatoryIndex++;
              }

              if (userData.user.signatories.preparedBy && (userData.user.signatories.preparedBy.name || userData.user.signatories.preparedBy.position)) {
                signatoryArray.push({
                  title: userData.user.signatories.preparedBy.title || `Signatory ${signatoryArray.length + 1}`,
                  name: userData.user.signatories.preparedBy.name || '',
                  position: userData.user.signatories.preparedBy.position || ''
                });
              }

              if (userData.user.signatories.reviewedBy && (userData.user.signatories.reviewedBy.name || userData.user.signatories.reviewedBy.position)) {
                signatoryArray.push({
                  title: userData.user.signatories.reviewedBy.title || `Signatory ${signatoryArray.length + 1}`,
                  name: userData.user.signatories.reviewedBy.name || '',
                  position: userData.user.signatories.reviewedBy.position || ''
                });
              }

              if (userData.user.signatories.notedBy && (userData.user.signatories.notedBy.name || userData.user.signatories.notedBy.position)) {
                signatoryArray.push({
                  title: userData.user.signatories.notedBy.title || `Signatory ${signatoryArray.length + 1}`,
                  name: userData.user.signatories.notedBy.name || '',
                  position: userData.user.signatories.notedBy.position || ''
                });
              }

              freshSignatoryData = signatoryArray;
            }

            if (JSON.stringify(freshSignatoryData) !== JSON.stringify(signatoryData)) {
              setSignatoryData(freshSignatoryData);
            }
          } else {
            const savedSignatories = localStorage.getItem(`signatories_${user?.id}`);
            if (savedSignatories) {
              const freshSignatoryData = JSON.parse(savedSignatories);
              if (JSON.stringify(freshSignatoryData) !== JSON.stringify(signatoryData)) {
                setSignatoryData(freshSignatoryData);
              }
            }
          }

          // Load header image from API (use local variable to avoid closure issue)
          if (userData.user?.header_image) {
            freshHeaderImage = userData.user.header_image;
            setHeaderImage(freshHeaderImage);
          } else {
            const savedHeaderImage = localStorage.getItem(`headerImage_${user?.id}`);
            if (savedHeaderImage) {
              freshHeaderImage = savedHeaderImage;
              setHeaderImage(freshHeaderImage);
            }
          }

          // Load footer image from API (use local variable to avoid closure issue)
          if (userData.user?.footer_image) {
            freshFooterImage = userData.user.footer_image;
            setFooterImage(freshFooterImage);
          } else {
            const savedFooterImage = localStorage.getItem(`footerImage_${user?.id}`);
            if (savedFooterImage) {
              freshFooterImage = savedFooterImage;
              setFooterImage(freshFooterImage);
            }
          }

          // Load show default header setting
          if (userData.user?.show_default_header !== undefined) {
            setShowDefaultHeader(!!userData.user.show_default_header);
          } else {
            const saved = localStorage.getItem(`showDefaultHeader_${user?.id}`);
            if (saved !== null) {
              setShowDefaultHeader(saved === 'true');
            }
          }

          // Load header on all pages setting
          if (userData.user?.header_on_all_pages !== undefined) {
            setHeaderOnAllPages(!!userData.user.header_on_all_pages);
          } else {
            const saved = localStorage.getItem(`headerOnAllPages_${user?.id}`);
            if (saved !== null) {
              setHeaderOnAllPages(saved === 'true');
            }
          }

          // Load report title
          if (userData.user?.report_title) {
            setReportTitleText(userData.user.report_title);
          } else {
            const saved = localStorage.getItem(`reportTitleText_${user?.id}`);
            if (saved) {
              setReportTitleText(saved);
            }
          }
        } catch (apiError) {
          const savedSignatories = localStorage.getItem(`signatories_${user?.id}`);
          if (savedSignatories) {
            try {
              const freshSignatoryData = JSON.parse(savedSignatories);
              if (JSON.stringify(freshSignatoryData) !== JSON.stringify(signatoryData)) {
                setSignatoryData(freshSignatoryData);
              }
            } catch (parseError) {
              // Ignore parse errors
            }
          }

          // Try loading header image from localStorage as fallback
          const savedHeaderImage = localStorage.getItem(`headerImage_${user?.id}`);
          if (savedHeaderImage) {
            freshHeaderImage = savedHeaderImage;
            setHeaderImage(freshHeaderImage);
          }

          // Try loading footer image from localStorage as fallback
          const savedFooterImage = localStorage.getItem(`footerImage_${user?.id}`);
          if (savedFooterImage) {
            freshFooterImage = savedFooterImage;
            setFooterImage(freshFooterImage);
          }

          // Try loading show default header from localStorage as fallback
          const savedDefaultHeader = localStorage.getItem(`showDefaultHeader_${user?.id}`);
          if (savedDefaultHeader !== null) {
            setShowDefaultHeader(savedDefaultHeader === 'true');
          }

          // Try loading header on all pages from localStorage as fallback
          const savedHeaderOnAllPages = localStorage.getItem(`headerOnAllPages_${user?.id}`);
          if (savedHeaderOnAllPages !== null) {
            setHeaderOnAllPages(savedHeaderOnAllPages === 'true');
          }
        }
      }

      // Pass local variables directly to avoid React async state closure issue
      const blob = await generatePDFBlob(freshHeaderImage, freshFooterImage);
      const url = URL.createObjectURL(blob);
      setPdfPreviewUrl(url);
      setShowPdfPreviewModal(true);
    } catch (error) {
      console.error('Error generating PDF preview:', error);
      alert('Failed to generate PDF preview: ' + error.message);
    } finally {
      setIsPreviewLoading(false);
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
  }, [pageSize, signatoryData, headerImage, footerImage, showDefaultHeader, headerOnAllPages, reportTitleText, showPdfPreviewModal, pdfMargins]);

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
      const pdfMakeInstance = await loadPdfMake();
      const docDefinition = await createReportDefinition();
      pdfMakeInstance.createPdf(docDefinition).download('accomplishment_report.pdf');
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
            disabled={isPreviewLoading}
          >
            {isPreviewLoading ? (
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined">visibility</span>
            )}
            <span>Preview Report</span>
          </Button>
                    <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
            <input
              className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-medium px-4 py-1.5 rounded-l-lg border-0 focus:outline-none focus:ring-2 focus:ring-primary-500 w-40 [color-scheme:light] dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:text-white dark:[&::-webkit-calendar-picker-indicator]:text-white"
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
              className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-medium px-4 py-1.5 rounded-r-lg border-0 focus:outline-none focus:ring-2 focus:ring-primary-500 w-40 [color-scheme:light] dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:text-white dark:[&::-webkit-calendar-picker-indicator]:text-white"
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
                  <div className="h-full flex flex-row items-center">
                    <div className="w-1/2 h-32 sm:h-40 flex items-center justify-center">
                      <Pie type="doughnut" data={activityBreakdownChartData} options={pieChartOptions} />
                    </div>
                    <div className="w-1/2 flex flex-col justify-center pl-2 sm:pl-4">
                      {activityBreakdownChartData.labels.map((label, index) => (
                        <div key={label} className="flex items-center my-0.5 sm:my-1">
                          <div
                            className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1.5 sm:mr-2 rounded-full"
                            style={{ backgroundColor: activityBreakdownChartData.datasets[0].backgroundColor[index] }}
                          ></div>
                          <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">{label}</span>
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
              {sidebarTaskListLoading || !sidebarTaskListLoaded ? (
                <div className="p-4 space-y-3">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="flex gap-3 items-center">
                      <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              ) : sidebarTaskList.length > 0 ? (
                <>
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                      <tr>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Title</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {sidebarTaskList.map((task, index) => (
                        <tr
                          key={task.id || index}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 cursor-pointer"
                          onMouseEnter={(e) => {
                            if (sidebarTaskPopupTimeoutRef.current) clearTimeout(sidebarTaskPopupTimeoutRef.current);
                            const rect = e.currentTarget.getBoundingClientRect();
                            const popupWidth = 280;
                            const estimatedHeight = 300;
                            const gap = 4;
                            const spaceRight = window.innerWidth - e.clientX;
                            const spaceBelow = window.innerHeight - e.clientY;
                            const x = spaceRight >= popupWidth + 12
                              ? e.clientX + 12
                              : e.clientX - popupWidth - 12;
                            const showAbove = spaceBelow < estimatedHeight + gap;
                            setSidebarTaskPopup({
                              task,
                              x,
                              showAbove,
                              cursorY: e.clientY
                            });
                          }}
                          onMouseLeave={() => {
                            sidebarTaskPopupTimeoutRef.current = setTimeout(() => setSidebarTaskPopup(null), 250);
                          }}
                        >
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {task.task_date ? formatToLocalDateTime(task.task_date).split(',')[0] : (task.created_date ? formatToLocalDateTime(task.created_date).split(',')[0] : 'N/A')}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white max-w-xs truncate" title={task.title}>
                            {task.title || 'No title'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {sidebarTaskListLoadingMore && sidebarTaskListHasMore && sidebarTaskList.length > 0 && (
                    <div className="p-4 space-y-3 border-t border-gray-200 dark:border-gray-700">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex gap-3 items-center">
                          <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                          <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  No tasks found
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
              {sidebarEventListLoading || !sidebarEventListLoaded ? (
                <div className="p-4 space-y-3">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="flex gap-3 items-center">
                      <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              ) : sidebarEventList.length > 0 ? (
                <>
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                      <tr>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Title</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {sidebarEventList.map((event, index) => (
                        <tr
                          key={event.id || index}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 cursor-pointer"
                          onMouseEnter={(e) => {
                            if (sidebarEventPopupTimeoutRef.current) clearTimeout(sidebarEventPopupTimeoutRef.current);
                            const rect = e.currentTarget.getBoundingClientRect();
                            const popupWidth = 280;
                            const estimatedHeight = 300;
                            const gap = 4;
                            const spaceRight = window.innerWidth - e.clientX;
                            const spaceBelow = window.innerHeight - e.clientY;
                            const x = spaceRight >= popupWidth + 12
                              ? e.clientX + 12
                              : e.clientX - popupWidth - 12;
                            const showAbove = spaceBelow < estimatedHeight + gap;
                            setSidebarEventPopup({
                              event,
                              x,
                              showAbove,
                              cursorY: e.clientY
                            });
                          }}
                          onMouseLeave={() => {
                            sidebarEventPopupTimeoutRef.current = setTimeout(() => setSidebarEventPopup(null), 250);
                          }}
                        >
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {event.start_date ? formatToLocalDateTime(event.start_date).split(',')[0] : (event.created_at ? formatToLocalDateTime(event.created_at).split(',')[0] : 'N/A')}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white max-w-xs truncate" title={event.title}>
                            {event.title || 'No title'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {sidebarEventListLoadingMore && sidebarEventListHasMore && sidebarEventList.length > 0 && (
                    <div className="p-4 space-y-3 border-t border-gray-200 dark:border-gray-700">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex gap-3 items-center">
                          <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                          <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  No events found
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

          {(taskTypeSummaryLoading || !taskTypeSummaryLoaded) ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3 animate-pulse"></div>
                  <div className="space-y-2">
                    {[...Array(3)].map((_, j) => (
                      <div key={j} className="flex justify-between">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-8 animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
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
                  // Consolidate quantities, record counts, and task details for the same sub type under each task type
                  const consolidatedSubTypes = {};
                  let totalQuantity = 0; // Track total quantity for this task type
                  subTypes.forEach(item => {
                    const subType = item.sub_type_name || 'N/A';
                    if (!consolidatedSubTypes[subType]) {
                      consolidatedSubTypes[subType] = { quantity: 0, record_count: 0, tasks: [] };
                    }
                    consolidatedSubTypes[subType].quantity += item.quantity || 0;
                    consolidatedSubTypes[subType].record_count += item.record_count || 0;
                    if (item.tasks && Array.isArray(item.tasks)) {
                      consolidatedSubTypes[subType].tasks.push(...item.tasks);
                    }
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
                          <div
                            key={idx}
                            className="flex justify-between text-xs cursor-pointer rounded px-1 -mx-1 hover:bg-gray-100 dark:hover:bg-gray-700"
                            onMouseEnter={(e) => {
                              if (taskPopupTimeoutRef.current) clearTimeout(taskPopupTimeoutRef.current);
                              const popupWidth = 280;
                              const estimatedHeight = 300;
                              const gap = 4;
                              const spaceRight = window.innerWidth - e.clientX;
                              const spaceBelow = window.innerHeight - e.clientY;
                              const x = spaceRight >= popupWidth + 12
                                ? e.clientX + 12
                                : e.clientX - popupWidth - 12;
                              const showAbove = spaceBelow < estimatedHeight + gap;
                              setTaskPopup({
                                subType,
                                tasks: data.tasks || [],
                                x,
                                showAbove,
                                cursorY: e.clientY
                              });
                            }}
                            onMouseLeave={() => {
                              taskPopupTimeoutRef.current = setTimeout(() => setTaskPopup(null), 250);
                            }}
                          >
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

        {/* Task hover popup */}
        {taskPopup && (
          <div
            className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-3 min-w-[240px] max-w-[320px]"
            style={{ left: taskPopup.x, ...(taskPopup.showAbove ? { bottom: window.innerHeight - taskPopup.cursorY + 4 } : { top: taskPopup.cursorY + 4 }) }}
            onMouseEnter={() => {
              if (taskPopupTimeoutRef.current) clearTimeout(taskPopupTimeoutRef.current);
            }}
            onMouseLeave={() => {
              taskPopupTimeoutRef.current = setTimeout(() => setTaskPopup(null), 250);
            }}
          >
            <div className="font-semibold text-sm text-gray-900 dark:text-white mb-2 border-b border-gray-200 dark:border-gray-700 pb-1.5">
              {taskPopup.subType} ({taskPopup.tasks.length})
            </div>
            <div className="max-h-48 overflow-y-auto scrollbar-hide space-y-1.5">
              {taskPopup.tasks.length > 0 ? (
                taskPopup.tasks.map((task) => (
                  <div key={task.id} className="text-xs text-gray-700 dark:text-gray-300">
                    <div className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-[14px] mt-0.5 text-gray-400">task_alt</span>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-gray-900 dark:text-white truncate">{task.title}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            {task.date ? formatToLocalDateTime(task.date).split(',')[0] : 'N/A'}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium capitalize ${
                            task.status === 'Completed' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                            task.status === 'In Progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                            task.status === 'Pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                            'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {task.status || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
                  No task details available
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sidebar task hover popup */}
        {sidebarTaskPopup && (
          <div
            className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-3 min-w-[240px] max-w-[300px]"
            style={{ left: sidebarTaskPopup.x, ...(sidebarTaskPopup.showAbove ? { bottom: window.innerHeight - sidebarTaskPopup.cursorY + 4 } : { top: sidebarTaskPopup.cursorY + 4 }) }}
            onMouseEnter={() => {
              if (sidebarTaskPopupTimeoutRef.current) clearTimeout(sidebarTaskPopupTimeoutRef.current);
            }}
            onMouseLeave={() => {
              sidebarTaskPopupTimeoutRef.current = setTimeout(() => setSidebarTaskPopup(null), 250);
            }}
          >
            <div className="font-semibold text-sm text-gray-900 dark:text-white mb-2 border-b border-gray-200 dark:border-gray-700 pb-1.5">
              {sidebarTaskPopup.task.title || 'Task Details'}
            </div>
            {sidebarTaskPopup.task.description && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">
                {sidebarTaskPopup.task.description}
              </div>
            )}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-gray-500 dark:text-gray-400 w-16 shrink-0">Status</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium capitalize ${
                  sidebarTaskPopup.task.status === 'Completed' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                  sidebarTaskPopup.task.status === 'In Progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                  sidebarTaskPopup.task.status === 'Pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                  sidebarTaskPopup.task.status === 'Overdue' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                  'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {sidebarTaskPopup.task.status || 'N/A'}
                </span>
              </div>
              {(sidebarTaskPopup.task.type_name || sidebarTaskPopup.task.sub_type_name) && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 dark:text-gray-400 w-16 shrink-0">Type</span>
                  <span className="text-gray-700 dark:text-gray-300 truncate">
                    {[sidebarTaskPopup.task.type_name, sidebarTaskPopup.task.sub_type_name].filter(Boolean).join(' / ')}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-gray-500 dark:text-gray-400 w-16 shrink-0">Priority</span>
                <span className={`font-medium ${
                  sidebarTaskPopup.task.priority === 'High' ? 'text-red-600 dark:text-red-400' :
                  sidebarTaskPopup.task.priority === 'Medium' ? 'text-yellow-600 dark:text-yellow-400' :
                  sidebarTaskPopup.task.priority === 'Low' ? 'text-green-600 dark:text-green-400' :
                  'text-gray-600 dark:text-gray-400'
                }`}>
                  {sidebarTaskPopup.task.priority || 'N/A'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 dark:text-gray-400 w-16 shrink-0">Category</span>
                <span className="text-gray-700 dark:text-gray-300">{sidebarTaskPopup.task.category_name || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 dark:text-gray-400 w-16 shrink-0">Date</span>
                <span className="text-gray-700 dark:text-gray-300">
                  {sidebarTaskPopup.task.task_date ? formatToLocalDateTime(sidebarTaskPopup.task.task_date).split(',')[0] : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Sidebar event hover popup */}
        {sidebarEventPopup && (
          <div
            className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-3 min-w-[240px] max-w-[300px]"
            style={{ left: sidebarEventPopup.x, ...(sidebarEventPopup.showAbove ? { bottom: window.innerHeight - sidebarEventPopup.cursorY + 4 } : { top: sidebarEventPopup.cursorY + 4 }) }}
            onMouseEnter={() => {
              if (sidebarEventPopupTimeoutRef.current) clearTimeout(sidebarEventPopupTimeoutRef.current);
            }}
            onMouseLeave={() => {
              sidebarEventPopupTimeoutRef.current = setTimeout(() => setSidebarEventPopup(null), 250);
            }}
          >
            <div className="font-semibold text-sm text-gray-900 dark:text-white mb-2 border-b border-gray-200 dark:border-gray-700 pb-1.5">
              {sidebarEventPopup.event.title || 'Event Details'}
            </div>
            {sidebarEventPopup.event.description && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">
                {sidebarEventPopup.event.description}
              </div>
            )}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-gray-500 dark:text-gray-400 w-16 shrink-0">Type</span>
                <span className="text-gray-700 dark:text-gray-300">{sidebarEventPopup.event.event_type || sidebarEventPopup.event.event_type_name || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 dark:text-gray-400 w-16 shrink-0">Category</span>
                <span className="text-gray-700 dark:text-gray-300">{sidebarEventPopup.event.category || sidebarEventPopup.event.category_name || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 dark:text-gray-400 w-16 shrink-0">Status</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium capitalize ${
                  sidebarEventPopup.event.status === 'Ongoing' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                  sidebarEventPopup.event.status === 'Completed' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                  sidebarEventPopup.event.status === 'Cancelled' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                  sidebarEventPopup.event.status === 'Upcoming' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                  'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {sidebarEventPopup.event.status || 'N/A'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 dark:text-gray-400 w-16 shrink-0">Start</span>
                <span className="text-gray-700 dark:text-gray-300">
                  {sidebarEventPopup.event.start_date ? formatToLocalDateTime(sidebarEventPopup.event.start_date) : 'N/A'}
                </span>
              </div>
              {sidebarEventPopup.event.end_date && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 dark:text-gray-400 w-16 shrink-0">End</span>
                  <span className="text-gray-700 dark:text-gray-300">
                    {formatToLocalDateTime(sidebarEventPopup.event.end_date)}
                  </span>
                </div>
              )}
              {sidebarEventPopup.event.location && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 dark:text-gray-400 w-16 shrink-0">Location</span>
                  <span className="text-gray-700 dark:text-gray-300">{sidebarEventPopup.event.location}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Consolidated event hover popup */}
        {consolidatedEventPopup && (
          <div
            className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-3 min-w-[240px] max-w-[320px]"
            style={{ left: consolidatedEventPopup.x, ...(consolidatedEventPopup.showAbove ? { bottom: window.innerHeight - consolidatedEventPopup.cursorY + 4 } : { top: consolidatedEventPopup.cursorY + 4 }) }}
            onMouseEnter={() => {
              if (consolidatedEventPopupTimeoutRef.current) clearTimeout(consolidatedEventPopupTimeoutRef.current);
            }}
            onMouseLeave={() => {
              consolidatedEventPopupTimeoutRef.current = setTimeout(() => setConsolidatedEventPopup(null), 250);
            }}
          >
            <div className="font-semibold text-sm text-gray-900 dark:text-white mb-2 border-b border-gray-200 dark:border-gray-700 pb-1.5">
              {consolidatedEventPopup.eventType} ({consolidatedEventPopup.events.length})
            </div>
            <div className="max-h-48 overflow-y-auto scrollbar-hide space-y-1.5">
              {consolidatedEventPopup.events.length > 0 ? (
                consolidatedEventPopup.events.map((event) => (
                  <div key={event.id} className="text-xs text-gray-700 dark:text-gray-300">
                    <div className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-[14px] mt-0.5 text-gray-400">event</span>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-gray-900 dark:text-white truncate">{event.title}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            {event.start_date ? formatToLocalDateTime(event.start_date).split(',')[0] : 'N/A'}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium capitalize ${
                            event.status === 'Completed' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                            event.status === 'In Progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                            event.status === 'Cancelled' ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' :
                            'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                          }`}>
                            {event.status || 'Scheduled'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
                  No event details available
                </div>
              )}
            </div>
          </div>
        )}

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

          {(eventSummaryLoading || !eventSummaryLoaded) ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3 animate-pulse"></div>
                  <div className="space-y-2">
                    {[...Array(3)].map((_, j) => (
                      <div key={j} className="flex justify-between">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-8 animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
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
                      consolidatedEventTypes[eventType] = { quantity: 0, record_count: 0, events: [] };
                    }
                    consolidatedEventTypes[eventType].quantity += item.quantity || 0;
                    consolidatedEventTypes[eventType].record_count += item.record_count || 0;
                    if (item.events && item.events.length > 0) {
                      consolidatedEventTypes[eventType].events.push(...item.events);
                    }
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
                          <div
                            key={idx}
                            className="flex justify-between text-xs cursor-pointer rounded px-1 -mx-1 hover:bg-gray-100 dark:hover:bg-gray-700"
                            onMouseEnter={(e) => {
                              if (consolidatedEventPopupTimeoutRef.current) clearTimeout(consolidatedEventPopupTimeoutRef.current);
                              const popupWidth = 280;
                              const estimatedHeight = 300;
                              const gap = 4;
                              const spaceRight = window.innerWidth - e.clientX;
                              const spaceBelow = window.innerHeight - e.clientY;
                              const x = spaceRight >= popupWidth + 12
                                ? e.clientX + 12
                                : e.clientX - popupWidth - 12;
                              const showAbove = spaceBelow < estimatedHeight + gap;
                              setConsolidatedEventPopup({
                                eventType,
                                events: data.events || [],
                                quantity: data.quantity,
                                x,
                                showAbove,
                                cursorY: e.clientY
                              });
                            }}
                            onMouseLeave={() => {
                              consolidatedEventPopupTimeoutRef.current = setTimeout(() => setConsolidatedEventPopup(null), 250);
                            }}>
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
        {/* Floating Controls */}
        <div className="absolute bottom-4 left-[10rem] right-[10rem] flex justify-between items-center px-4 py-3 z-50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg shadow-lg">
          <div className="flex items-center gap-2 text-sm">
            <label htmlFor="pdf-page-size-select" className="text-gray-700 dark:text-gray-300">Page Size:</label>
            <select
              id="pdf-page-size-select"
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <option value="A4">A4</option>
              <option value="Letter">Letter</option>
              <option value="Folio">Folio</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMarginModal(true)}
              className="ml-2"
            >
              <span className="material-symbols-outlined text-sm mr-1">margin</span>
              Set Margin
            </Button>
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
              ref={(el) => {
                if (el) {
                  el.addEventListener('load', () => {
                    try {
                      const style = el.contentDocument?.createElement('style');
                      if (style) {
                        style.textContent = '#title { display: none !important; }';
                        el.contentDocument?.head?.appendChild(style);
                      }
                    } catch (e) { /* cross-origin */ }
                  }, { once: true });
                }
              }}
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

      <MarginSettingsModal
        isOpen={showMarginModal}
        onClose={() => setShowMarginModal(false)}
        margins={pdfMargins}
        onMarginsChange={setPdfMargins}
        overlay={false}
        transparent={true}
        zIndex="z-[1002]"
        draggable={true}
      />
    </div>
  );
};

export default Reports;
