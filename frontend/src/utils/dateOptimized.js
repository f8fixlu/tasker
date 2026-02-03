// Optimized date utilities with memoization and efficient calculations

// Memoized date formatting to avoid repeated calculations
const createMemoizedFormatter = () => {
  const cache = new Map();

  return (dateString, format = 'full') => {
    const cacheKey = `${dateString}-${format}`;

    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }

    let result;
    if (!dateString) {
      result = 'N/A';
    } else {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        result = 'Invalid Date';
      } else {
        switch (format) {
          case 'dateOnly':
            result = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            break;
          case 'dateTime':
            result = date.toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
            break;
          case 'timeOnly':
            result = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            break;
          case 'fullDateWithDay': // New format: "February 02, 2026, Monday"
            const month = date.toLocaleString('en-US', { month: 'long' });
            const day = date.getDate().toString().padStart(2, '0');
            const year = date.getFullYear();
            const dayOfWeek = date.toLocaleString('en-US', { weekday: 'long' });
            result = `${month} ${day}, ${year}, ${dayOfWeek}`;
            break;
          case 'full':
          default:
            result = date.toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            });
        }
      }
    }

    cache.set(cacheKey, result);
    return result;
  };
};

// Create a shared formatter instance
const memoizedFormatter = createMemoizedFormatter();

// Memoized date comparison functions
const createTodayChecker = () => {
  let todayCache = null;
  let cacheTimestamp = 0;
  const CACHE_DURATION = 60000; // 1 minute cache
  
  return (dateString) => {
    const now = Date.now();
    if (!todayCache || (now - cacheTimestamp) > CACHE_DURATION) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      todayCache = today;
      cacheTimestamp = now;
    }
    
    if (!dateString) return false;
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return false;
    
    const dateWithoutTime = new Date(date);
    dateWithoutTime.setHours(0, 0, 0, 0);
    
    return dateWithoutTime.getTime() === todayCache.getTime();
  };
};

const createThisMonthChecker = () => {
  let currentMonthCache = null;
  let currentYearCache = null;
  let cacheTimestamp = 0;
  const CACHE_DURATION = 60000; // 1 minute cache
  
  return (dateString) => {
    const now = Date.now();
    if (!currentMonthCache || !currentYearCache || (now - cacheTimestamp) > CACHE_DURATION) {
      const today = new Date();
      currentMonthCache = today.getMonth();
      currentYearCache = today.getFullYear();
      cacheTimestamp = now;
    }
    
    if (!dateString) return false;
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return false;
    
    return date.getMonth() === currentMonthCache && date.getFullYear() === currentYearCache;
  };
};

// Export optimized utilities
export const optimizedDateUtils = {
  memoizedFormatDate: memoizedFormatter,
  isToday: createTodayChecker(),
  isThisMonth: createThisMonthChecker(),
  
  // Batch date processing for arrays
  processDateArray: (dates, format = 'full') => {
    return dates.map(date => memoizedFormatter(date, format));
  },
  
  // Efficient date range calculations
  calculateDateRanges: () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    return { today, sevenDaysAgo, nextMonth, startOfMonth };
  }
};

// Export the original functions as well for compatibility
export * from './date';