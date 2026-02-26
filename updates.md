# Tasker Application Updates

## Version 2.0.0 Release

### Version Update
- Updated application version from 1.0.0 to 2.0.0 across all package.json files
- Reflects significant improvements and feature additions since initial release

### About Modal Cleanup
- Removed "System Information" section from About modal
  - Removed display of: Platform, Language, Screen Resolution, Color Depth, Timezone, Online Status, Cookies Enabled, Browser
- Removed "User Agent" section from About modal
  - Removed display of browser user agent string
- Simplified modal to show only essential application information:
  - Application name, version, and description
  - Contact information for support

### Files Modified
- `package.json`: Updated version to 2.0.0
- `backend/package.json`: Updated version to 2.0.0
- `frontend/package.json`: Updated version to 2.0.0
- `frontend/src/components/modals/AboutModal.js`: Removed system info and user agent sections, updated displayed version to 2.0.0

---

## Tasks Page Actions Dropdown Fix

### Fixed Dropdown Clipping Issue
- Fixed issue where Actions dropdown (three dots menu) was being clipped by the `layout-content-container`
- Dropdown was not appearing on top of the table container due to overflow and z-index constraints

### Solution
- Changed ActionsDropdown z-index from `z-20` to `z-50` (highest Tailwind z-index level)
- Added explicit `position: 'absolute'` inline style to ensure proper stacking context
- Changed DataTable container from `overflow-hidden` to allow overflow visibility
- Changed inner wrapper from `overflow-x-auto` to `overflow-x-visible` to allow dropdown to extend beyond table boundaries

### Technical Details
- **ActionsDropdown component** (`frontend/src/pages/Tasks.js`):
  - Updated className from `z-20` to `z-50`
  - Added `style={{ position: 'absolute' }}` for explicit positioning

- **DataTable component** (`frontend/src/components/common/DataTable.js`):
  - Removed `overflow-hidden` from outer container div
  - Changed `overflow-x-auto` to `overflow-x-visible` on inner wrapper div
  - This allows dropdown menus to render above the table container without being clipped

### Files Modified
- `frontend/src/pages/Tasks.js`: Updated ActionsDropdown z-index and positioning (line 313)
- `frontend/src/components/common/DataTable.js`: Updated overflow settings to allow dropdown visibility (lines 47-49)

### Result
- Actions dropdown now appears on top of the layout-content-container
- Dropdown is fully visible and not clipped by parent container boundaries
- All action options (attachments, view, edit, archive) are now accessible

---

## Tasks Page Improvements

### Fixed Column Widths
- Set Title column width to 40% for better content display
- Set Status column width to 25% to accommodate status pill layout
- Table uses `table-fixed` layout for consistent column widths across screen sizes

### Date Picker Fixed Width
- Removed responsive width changes from date picker inputs
- Date pickers now maintain fixed width (`w-32` / 128px) on all screen sizes
- Removed `max-[957px]:w-10`, `max-[957px]:text-transparent`, and `max-[957px]:px-1` classes
- Prevents date picker from resizing or hiding text on smaller screens

### Checkbox Column Padding
- Updated checkbox column heading padding to `pl-4 pr-2` for better alignment
- Maintains 1rem (16px) padding-left on checkbox header

### Files Modified
- `frontend/src/pages/Tasks.js`: Updated column widths, date picker classes, and checkbox padding

## Admin Dashboard Improvements

### Live Refresh Without Flickering
- Removed flickering refresh in admin system stats page
- Implemented live data updates using React refs for direct DOM manipulation
- Static elements (labels, titles, chart configurations) are rendered only once on initial load
- Dynamic data (uptime, server time, counts, chart data) updates in-place without full re-renders
- Chart updates use `animation: false` and `update('none')` mode to prevent visual flickering
- Added `isUpdating` state to show refresh button status during updates
- Refresh interval remains at 30 seconds but now updates only the changing values

### Technical Implementation
- Added refs for all dynamic text elements: `uptimeRef`, `serverTimeRef`, `serverDateRef`, `activeSessionsRef`, `totalUsersRef`, `totalTasksRef`, `totalEventsRef`, `totalAttachmentsRef`, `recentUsersRef`, `activeUsersRef`, `overdueTasksRef`
- Added refs for chart components: `memoryChartRef`, `taskStatusChartRef`, `taskPriorityChartRef`
- Separated initial load (`fetchStats(true)`) from refresh updates (`fetchStats(false)`)
- Initial load performs full React state update and render
- Subsequent updates directly modify DOM textContent and chart data without triggering React re-renders
- `useCallback` used for `formatUptime` function to maintain stable reference

## Signatories Tab Focus Fix

### Fixed Input Focus Loss Issue
- Fixed issue where input fields in signatories tab would lose focus after typing each character
- Root cause: `SignatoryItem` component was defined inside `SettingsModal` component body, causing it to be re-created on every parent render
- Solution: Moved `SignatoryItem` component definition outside of `SettingsModal` to module level
- Used `React.memo` to prevent unnecessary re-renders when other signatories change
- Removed unused `index` prop from component interface

### Technical Details
- Component moved to module scope (line 9) to maintain stable identity across renders
- Added `displayName` for better debugging in React DevTools
- Handlers memoized with `useCallback` to maintain referential stability
- Only re-renders when its specific signatory's data changes

## Signatory System Improvements

### Dynamic Signatory Implementation
- Replaced hardcoded "preparedBy", "reviewedBy", and "notedBy" with a dynamic signatory system
- Implemented "Signatory(X)" format where X is the position number
- Updated both Reports.js and PrintReport.js to use the new dynamic system
- Ensured compatibility with database format: `[{"id":2,"name":"JHONY N. VERGANIO","position":"Administrative Support Staff VI","title":"Prepared by:"},...]`

### Preview Report Fixes
- Fixed issue where signatures were not showing in the PDF preview modal
- Updated PDF generation to properly include signature sections
- Improved signature section building logic for both HTML and PDF formats

### State Management Optimization
- Removed complex polling and event listener systems that were causing input focus issues
- Implemented direct localStorage access when opening preview reports
- Added smart state updates that only occur when data has actually changed
- Resolved "ResizeObserver loop completed with undelivered notifications" error by removing artificial delays

### Auto-Update Mechanism
- Implemented automatic signatory data refresh when preview report is opened
- Ensured preview always shows the most current signatory data from localStorage
- Maintained smooth editing experience without focus loss during signatory field editing

### Code Improvements
- Updated initial state to use empty array instead of hardcoded object
- Enhanced data loading to handle both legacy and new formats
- Improved signature rendering logic for both HTML and PDF outputs
- Optimized component re-renders to prevent unnecessary updates

## Tasks Page Skeleton Loading Improvements

### Seamless Table Loading Without Resize
- Modified skeleton loading to prevent table resize when switching between loading and loaded states
- Removed skeleton animation from table headers (Title, Category, Task Type, etc.) - now displays actual header text
- Removed skeleton animation from action icons and checkbox columns - replaced with static placeholder shapes
- Applied skeleton animation only to data cells to maintain layout stability

### Responsive Table Layout
- Changed table from `table-auto` to `table-fixed` layout to prevent horizontal scrolling
- Removed `overflow-x-auto` wrapper as it's no longer needed
- Removed `whitespace-nowrap` to allow text wrapping within cells on smaller screens
- Table columns now automatically distribute available width evenly
- Content wraps naturally within cells when screen width is reduced

### Dynamic Dimension Matching
- Implemented `useRef` to capture actual table DOM element after data loads
- Added `useEffect` to measure column widths and row heights from rendered table
- Stored dimensions in `tableDimensions` state for reuse during subsequent loads
- Skeleton now applies exact same dimensions as the actual data table via inline styles
- First load may resize once to capture dimensions, but subsequent loads maintain consistent layout

### Technical Implementation
- Updated `LoadingTableSkeleton` component to accept `tableDimensions` prop
- Modified `DataTable` component to use `forwardRef` for parent component access
- Added measurement logic that captures:
  - Total table width
  - Individual column widths from header cells
  - Row heights from first 10 body rows (with fallback for fewer rows)
- Skeleton applies dimensions via inline `style` attributes on table, th, and tr elements
- Both skeleton and DataTable now use identical structure and styling classes

### Files Modified
- `frontend/src/pages/Tasks.js`: Updated `LoadingTableSkeleton` component, added dimension tracking state and ref
- `frontend/src/components/common/DataTable.js`: Converted to `forwardRef`, changed to `table-fixed` layout, removed overflow wrapper

## Reports Page Skeleton Loading Improvements

### Replaced Spinners with Skeleton Loading
- Replaced loading spinners with skeleton loading in Task List and Event List sections
- Applied skeleton loading to sidebar task list (initial load state)
- Applied skeleton loading to sidebar event list (initial load state)
- Applied skeleton loading to Consolidated Tasks summary cards
- Applied skeleton loading to Consolidated Events summary cards
- Kept spinner for "load more" functionality during infinite scroll

### Implementation Details
- **Sidebar Task List**: Shows 8 skeleton rows with date and title placeholders when `sidebarTaskListLoading` is true and list is empty
- **Sidebar Event List**: Shows 8 skeleton rows with date and title placeholders when `sidebarEventListLoading` is true and list is empty
- **Consolidated Tasks**: Shows 8 skeleton cards matching the card grid layout, each with title and 3 data rows
- **Consolidated Events**: Shows 8 skeleton cards matching the card grid layout, each with title and 3 data rows
- Skeleton uses `animate-pulse` animation with gray backgrounds that adapt to dark mode

### Technical Changes
- Added conditional rendering to check `sidebarTaskListLoading || !sidebarTaskListLoaded` for initial load state
- Added conditional rendering to check `sidebarEventListLoading || !sidebarEventListLoaded` for initial load state
- Added `Loaded` state tracking for task/event summary to show skeleton on first load
- Replaced single spinner div with skeleton grid layouts for task/event summary cards
- Replaced "load more" spinner with skeleton rows in sidebar task list (3 skeleton rows at bottom when loading more)
- Replaced "load more" spinner with skeleton rows in sidebar event list (3 skeleton rows at bottom when loading more)
- Removed error text display ("Failed to load task/event summary") - shows skeleton instead
- Maintained consistent skeleton styling with `animate-pulse` and dark mode support
- Reset loaded states when filters change to show skeleton during refresh

### Files Modified
- `frontend/src/pages/Reports.js`: Replaced all spinners with skeleton loading in Task List, Event List, Consolidated Tasks, and Consolidated Events sections. Initial load shows 8 skeleton rows, "load more" shows 3 skeleton rows at bottom. Error messages replaced with skeleton loading.

## Activity Breakdown Chart Mobile Layout

### Responsive Legend Positioning
- Changed Activity Breakdown chart legend to display beside the chart on all screen sizes (not below on mobile)
- Chart and legend now use equal 50/50 width distribution (`w-1/2` each)
- Applied consistent `flex flex-row` layout for both mobile and desktop views

### Responsive Sizing Adjustments
- **Chart height**: `h-32` on mobile, `h-40` on desktop (sm and up)
- **Legend dot size**: `w-2.5 h-2.5` on mobile, `w-3 h-3` on desktop
- **Legend text size**: `text-xs` on mobile, `text-sm` on desktop
- **Spacing**: Smaller margins on mobile (`my-0.5`, `mr-1.5`) for compact display

### Applied to Both Views
- Updated main dashboard Performance Overview card
- Updated print preview modal charts section

### Files Modified
- `frontend/src/pages/Reports.js`: Modified Activity Breakdown chart layout to show legend beside chart on all screen sizes

## Backend Date Range Filtering Fix

### Dashboard Stats Date Range
- Fixed issue where activity breakdown chart was not filtering by selected date range
- Added missing `parsedUrl.query` parameter to `handleGetDashboardStats` function call in backend
- Frontend correctly passes `start_date` and `end_date` from date picker
- Backend now properly receives and applies date range filtering to task statistics

### Files Modified
- `backend/routes/reports.js`: Added `parsedUrl.query` parameter to `handleGetDashboardStats` call (line 15)

## Report Preview Signatories Fix

### Issue
- Signatories were missing in the report preview when using a new browser
- Users had to save changes in the Signatories tab (Settings modal) to make signatories appear
- Root cause: `Reports.js` only loaded signatory data from localStorage, not from the database API

### Solution
- Updated `Reports.js` to fetch signatory data from the API first (`/users/profile` endpoint)
- Added localStorage as a fallback when API data is unavailable or fails
- Applied the same fix to both `loadSignatoryData` (page load) and `showPdfPreview` (preview modal) functions
- Now matches the behavior already implemented in `PrintReport.js`

### Technical Implementation
- Added `api` service import to `Reports.js`
- Enhanced `loadSignatoryData` function to:
  - Fetch user profile from API on component mount
  - Parse signatories from API response (supports both array and object formats)
  - Fall back to localStorage if API doesn't have signatories
  - Fall back to localStorage if API request fails
  - Only update state when data has actually changed (prevents unnecessary re-renders)
- Enhanced `showPdfPreview` function to:
  - Fetch fresh signatory data from API when preview is opened
  - Parse and convert signatory data to array format if needed
  - Fall back to localStorage if API is unavailable
  - Ensure preview always displays the latest signatory data from the database

### Data Format Support
- Array format (new): `[{name, position, title}, ...]`
- Object format with numbered signatories: `{signatory1: {...}, signatory2: {...}}`
- Legacy format: `{preparedBy: {...}, reviewedBy: {...}, notedBy: {...}}`

### Files Modified
- `frontend/src/pages/Reports.js`: 
  - Added `import api from '../services/api'` (line 8)
  - Updated `loadSignatoryData` function (lines 241-399)
  - Updated `showPdfPreview` function (lines 2002-2101)

### Result
- Signatories now appear correctly in report preview on new browsers
- No need to save changes in Settings modal to display signatories
- Users always see the most current signatory data from the database