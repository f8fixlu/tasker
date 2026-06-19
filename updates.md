# Tasker Application Updates

## PDF Preview Font Loading Fix

### Fixed Intermittent "roboto-regular.ttf not found" Error
- Fixed race condition and API mismatch in pdfmake font loading that caused PDF preview to fail intermittently
- Error occurred when CDN scripts loaded slowly and the npm fallback path was used
- Root cause 1: CDN loads pdfmake v0.2.7 but npm package is v0.3.7 — two different APIs
- Root cause 2: npm fallback used `pdfMake.vfs = ...` (v0.2.x API) but v0.3.7 reads fonts from `virtualfs.storage`, not `vfs`
- Root cause 3: `Promise.all` loaded module and fonts in parallel, causing a race condition where font auto-registration failed

### Changes Made
- **Removed CDN scripts** from `index.html` (pdfmake 0.2.7 CDN scripts removed)
- **Fixed `loadPdfMake()`** in `Reports.js`:
  - Sequential loading: fonts module now loads after pdfmake module is ready
  - Uses `pdfMake.addVirtualFileSystem(vfs)` (correct v0.3.x API) instead of `pdfMake.vfs = ...`
  - Removed `isCdnVersion` flag and CDN check logic
- **Simplified `generatePDFBlob()`**: Always uses promise API (no more CDN callback branch)
- **Fixed `downloadPdf()`**: Now calls `loadPdfMake()` to ensure pdfmake is initialized

### Files Modified
- `frontend/public/index.html`: Removed pdfmake 0.2.7 CDN `<script>` tags (lines 48-49)
- `frontend/src/pages/Reports.js`: Rewrote `loadPdfMake()` function, simplified `generatePDFBlob()`, fixed `downloadPdf()` to await initialization

---

# Tasker Application Updates

## Google Calendar API - Philippine Holidays Integration

### Added Philippine Holiday Auto-Population
- Integrated Google Calendar API to fetch and display Philippine public holidays on the Calendar page
- Uses the public Google Calendar `en.philippines#holiday@group.v.calendar.google.com`
- Holidays are fetched on page load and auto-refresh when the viewed year changes
- Displays holidays alongside user events in month, week, and day views with distinct red styling and "Holiday" badge
- Hover popup shows holiday name, description, and date

### Save as Event Feature
- Added "Save as Event" button on holiday hover popup to convert an API holiday into a real editable event
- Saved events can be edited, categorized, and managed like any user-created event
- Tracks saved holidays via `savedHolidayKeys` state to prevent duplicates

### Auto-Deduplication
- API holidays are automatically hidden when a user event already exists on the same date
- Prevents duplicate entries (e.g., "Independence Day" showing twice on June 12)
- Deduplication is date-based: any user event on a holiday date hides the API version

### Configuration Required
- Added `GOOGLE_API_KEY` environment variable to `.env` (both root and `backend/.env`)
- Requires a free Google API key with the Google Calendar API enabled
- Env var must be set before the backend server starts

### Files Modified
- `frontend/src/pages/Calendar.js`: Added holiday fetching, deduplication logic, "Save as Event" popup button, and date-based duplicate filtering across all views
- `frontend/src/services/holidayService.js`: API service for `/holidays/philippines` endpoint
- `backend/routes/holidays.js`: Backend route that proxies Google Calendar API for Philippine holidays
- `backend/server.js`: Registered `/api/holidays` route (line 228)
- `.env` (root): Added `GOOGLE_API_KEY` variable

---

# Tasker Application Updates

## Tasks Page Column Visibility Dropdown Positioning Fix

### Fixed Dropdown Position at Screen Edge
- Fixed issue where the show/hide column dropdown was positioned at the edge of the screen
- Dropdown now appears directly below the filter_list icon in the Actions column header
- Changed from fixed positioning with calculated coordinates to absolute positioning within the table header

### Implementation Changes
- **DataTable.js**: 
  - Added `columnVisibilityDropdown` prop to accept dropdown content as a render prop
  - Added `columnVisibilityDropdownRef` prop for outside click detection
  - Wrapped filter_list button in a `relative inline-block` container
  - Dropdown positioned with `absolute right-0 top-full mt-1` classes
  - Dropdown renders inside the table header, directly below the toggle button
- **Tasks.js**:
  - Removed `columnDropdownPosition` state (no longer needed for fixed positioning)
  - Removed `columnVisibilityDropdownRef` from `useOutsideClick` cleanup, then re-added it properly
  - Simplified `handleColumnToggleClick` to only toggle visibility state
  - Passed `ColumnVisibilityDropdown` component as `columnVisibilityDropdown` prop to DataTable
  - Passed `columnVisibilityDropdownRef` to DataTable for proper outside click handling

### User Experience
- Dropdown stays open when clicking checkboxes to toggle columns
- Dropdown closes only when clicking outside of it
- No more dropdown appearing at screen edge or being cut off
- Consistent positioning relative to the filter_list icon

### Files Modified
- `frontend/src/components/common/DataTable.js`: Added columnVisibilityDropdown and columnVisibilityDropdownRef props, restructured filter_list button with relative positioning, added absolute positioned dropdown container
- `frontend/src/pages/Tasks.js`: Removed fixed positioning logic, simplified toggle handler, passed dropdown as prop to DataTable

---

## Column Visibility Toggle Feature

### Added Column Show/Hide Functionality
- Added column visibility toggle feature to Tasks page
- Users can now show/hide individual table columns via:
  - **view_column icon** in the Actions column header - Click to open dropdown with checkboxes for each column
- Dropdown shows all available columns:
  - Title, Category, Task Type, Sub Type, Status, Priority, Task Date, Due Date, Created Date
- Default visible columns: Title, Category, Status, Task Date, Due Date
- Default hidden columns: Task Type, Sub Type, Priority, Created Date
- Added new `ColumnVisibilityDropdown` component with checkbox list for all columns
- Added `visibleColumns` state to track which columns are shown/hidden
- Columns can be toggled individually without affecting other columns
- Actions column is always visible and cannot be hidden
- Dropdown position is dynamically calculated based on the button position
- Checkbox click behavior improved - only checkbox toggles, text is not clickable

### Table Header Styling
- Changed table header text from uppercase to capitalize (only first letter capitalized)
- Replaced `uppercase` class with `capitalize` class in DataTable component
- Headers now display as: "Title", "Category", "Task Type" instead of "TITLE", "CATEGORY", "TASK TYPE"

### Column Visibility Icon Updates
- Changed icon from `view_column` to `filter_list` for better visual clarity
- Icon placed ONLY in Actions column header (th), centered with header text
- Icon and header text centered together using `justify-center gap-2`
- Icon sized to `text-base` for visual consistency
- Dropdown positions directly below the filter_list icon in header
- Position calculated dynamically using `getBoundingClientRect()` on button ref
- On screens <=1024px, dropdown hides advanced columns:
  - Task Type, Sub Type, Priority, and Created Date options are hidden
  - Only basic columns (Title, Category, Status, Task Date, Due Date) shown in dropdown
  - Uses Tailwind `hidden lg:flex` responsive classes

### Column Visibility Dropdown Features
- Title column is read-only (cannot be hidden)
  - Checkbox is disabled with `disabled` attribute
  - Visual styling: gray background, reduced opacity, `cursor-not-allowed`
  - Text appears in gray with medium font weight
  - Checkbox and text are not interactive
- Other columns can be toggled on/off freely
- Dropdown aligned directly below filter_list icon in Actions column header

### Technical Implementation
- **Tasks.js changes**:
  - Created `allColumnsDefinition` constant with all 9 data columns (excluding actions)
  - Added `visibleColumns` state object tracking visibility for each column key
  - Added `handleToggleColumn` function to toggle individual column visibility
  - Added `handleColumnToggleClick` function to open/close dropdown with position calculation
  - Added `showColumnVisibilityDropdown` state for dropdown visibility
  - Added `columnDropdownPosition` state for dynamic positioning
  - Added `columnTogglebuttonRef` for button position reference
  - Added `columnVisibilityDropdownRef` for outside click detection
  - Modified `columns` useMemo to filter from `allColumnsDefinition` based on `visibleColumns` state
  - Added Actions column separately to filtered columns
  - Added Columns dropdown positioned using fixed positioning with calculated coordinates
  - Updated `ColumnVisibilityDropdown` to use `allColumnsDefinition` prop
  - Checkbox onClick handler prevents event propagation to avoid toggling via label

- **DataTable.js changes**:
  - Added `onColumnToggle`, `visibleColumns`, and `columnTogglebuttonRef` props
  - Added `view_column` icon button in Actions column header only
  - Button ref attached for position calculation
  - Updated PropTypes to include new props

### Files Modified
- `frontend/src/pages/Tasks.js`: Added column visibility state, handlers, dropdown component, dynamic positioning, and all columns definition
- `frontend/src/components/common/DataTable.js`: Added visibility toggle icon in Actions header, new props

---

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

---

## Task Completion Rate Chart End Date Bug Fix

### Issue
- Task Completion Rate chart in Performance Overview showed zero data for the end date
- Start date data displayed correctly
- Tasks completed on the last day of the selected date range were excluded

### Root Cause
- `handleGetTaskCompletionTrend` set the end date to midnight (start of day), e.g. `2026-06-03T00:00:00.000Z`
- SQL condition `task_date <= ?` excluded any task completed after midnight on the end date
- Other date-range handlers in the same file correctly extended the end date to `23:59:59.999`

### Fix
- Added `endDate.setHours(23, 59, 59, 999)` when a query end date is provided
- SQL boundary now becomes `task_date <= '2026-06-03T23:59:59.999Z'`, including all tasks on the end date
- Date range generation loop still works correctly since midnight start-of-day is still `<=` end-of-day

### Files Modified
- `backend/routes/reports.js`: Added end-of-day extension in `handleGetTaskCompletionTrend` (line 158-160)

---

## Consolidated Tasks Hover Popup

### Added Task Detail Popup on Hover
- Added hover popup to sub-type rows in the Consolidated Tasks section
- Hovering over a sub-type (e.g., "Phone Call (3)") now shows a popup with individual task details
- Popup displays each task's title, date, and status badge

### Implementation
- **Backend (`backend/routes/reports.js`)**:
  - Refactored `handleGetTaskTypeSummary` to build shareable WHERE conditions
  - Added a second query to fetch individual task details (id, title, date, status) per type/sub_type
  - Groups task details by type_name|sub_type_name key
  - Attaches `tasks` array to each summary item in the response

- **Frontend (`frontend/src/pages/Reports.js`)**:
  - Added `taskPopup` state and `taskPopupTimeoutRef` for hover management
  - Updated consolidation logic to merge `tasks` arrays from backend response
  - Added `onMouseEnter`/`onMouseLeave` handlers on sub-type rows with 250ms hide delay
  - Popup includes viewport boundary detection (positions above if not enough room below)
  - Shows task title (truncated), formatted date, and color-coded status badge
  - Popup scrolls with `max-h-48` when many tasks are present
  - Popup stays open when moving mouse from row to popup (timeout-based approach)

### User Experience
- Hover any sub-type row in a Consolidated Tasks card to see individual tasks
- Status badges color-coded: green for Completed, blue for In Progress, yellow for Pending
- Dates shown in compact format (e.g., "Jun 3")
- Popup automatically repositions if near bottom of viewport
- Smooth hide delay prevents popup flickering when moving between rows

### Files Modified
- `backend/routes/reports.js`: Refactored combined grouping query, added individual task details query, attached `tasks` to response
- `frontend/src/pages/Reports.js`: Added popup state/ref, updated consolidation logic, added hover handlers and popup rendering

---

## Calendar & Tasks UI Refinements

### Date Picker Width Adjustment
- Increased date input width from `w-32` (128px) to `w-40` (160px) on Tasks page to allow date text to fit beside the calendar icon
- Applied same width increase (`w-36` to `w-40`) to date pickers on Reports page for consistency

### Calendar Header Restructuring
- Moved Day/Week/Month view toggle buttons to the persistent top bar so they remain visible when switching between views
- Removed duplicate navigation buttons (chevron_left, Today, chevron_right) from the month view card header — navigation is now handled entirely from the top bar
- Changed New Event button from outline to primary variant for consistent styling with Add Task button

### Tasks Page Toolbar Consolidation
- Moved bulk Delete and Archive actions from standalone title bar buttons into a `more_vert` dropdown next to Add Task
- `more_vert` button has no border/background, with hover highlight and height matching Add Task button
- Dropdown disabled when no tasks are selected
- Added "Delete Task" option to the row-level `more_vert` ActionsDropdown (before Archive Task) with red styling
- Both Delete and Archive actions use the same confirmation modal flow

### Files Modified
- `frontend/src/pages/Calendar.js`: Moved view toggle to top bar, removed duplicate month header navigation, changed New Event to primary variant
- `frontend/src/pages/Tasks.js`: Adjusted date picker width, reorganized toolbar buttons, simplified Delete/Archive button labels, added Delete Task to row ActionsDropdown, moved bulk actions to title bar more_vert dropdown
- `frontend/src/pages/Reports.js`: Adjusted date picker width to match Tasks page