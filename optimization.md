# Tasker Application Performance Optimizations

## Overview
Comprehensive performance optimization targeting Dashboard page loading time and overall frontend bundle size. The optimizations reduce SQL queries from ~34 to ~4-8, eliminate dead code, improve caching, and enable better code splitting.

---

## Phase 1: Backend Optimizations

### 1.1 Fixed N+1 Queries in Event Listing
**File:** `backend/models/Event.js`

**Problem:** `getEventsByUserId()` executed a separate attachment query for each event (N+1 pattern). For 5 events, this meant 6 total queries.

**Solution:** Added `skipAttachments` option to `getEventsByUserId()`. When `skipAttachments: true`, attachment fetching is skipped entirely and an empty array is returned for consistency.

**Impact:** Eliminates 5 unnecessary queries for dashboard calls.

### 1.2 Removed Correlated Subquery in Task Listing
**File:** `backend/models/Task.js`

**Problem:** `getTasksByUserId()` included a correlated subquery `(SELECT COUNT(*) FROM attachments a WHERE a.task_id = t.id)` that executed once per row (20 times for dashboard's limit of 20).

**Solution:** Added `skipAttachmentCount` option. When `skipAttachmentCount: true`, the correlated subquery is excluded from the SELECT clause.

**Impact:** Eliminates 20 subqueries per dashboard load.

### 1.3 Made Event Stats Queries Parallel
**File:** `backend/models/Event.js`

**Problem:** `getEventStats()` executed 4 queries sequentially using individual `await` calls, making it 4x slower than necessary.

**Solution:** Wrapped all 4 queries in `Promise.all()` to execute them concurrently, matching the pattern already used in `getTaskStats()`.

**Impact:** Event stats load 4x faster.

### 1.4 Fixed Function-on-Column Anti-Patterns
**Files:** `backend/models/Task.js`, `backend/models/Event.js`

**Problem:** SQL queries used `DATE(column)` and `strftime('%Y-%m', column)` which prevent SQLite from using indexes.

**Solution:** Replaced with range comparisons:
- `DATE(task_date) = DATE('now')` → `task_date >= datetime('now', 'start of day') AND task_date < datetime('now', '+1 day', 'start of day')`
- `strftime('%Y-%m', task_date) = strftime('%Y-%m', 'now')` → `task_date >= date('now', 'start of month') AND task_date < date('now', '+1 month', 'start of month')`

**Impact:** Enables index usage for faster queries.

### 1.5 Added Missing Composite Index
**File:** `backend/config/database.js`

**Added:** `idx_tasks_user_task_date ON tasks(user_id, task_date)` composite index.

**Impact:** Speeds up task date range queries used by dashboard stats.

### 1.6 Created Dedicated Dashboard Stats Endpoint
**Files:** `backend/routes/dashboard.js`, `backend/server.js`

**Problem:** Frontend made 4 separate API calls for dashboard data. Backend `dashboard.js` was dead code (never mounted in routing).

**Solution:** 
- Rewrote `dashboard.js` to serve `GET /api/dashboard/stats`
- Mounted the route in `server.js` before other API routes
- Returns aggregated stats, tasks, and events in a single response
- Uses `skipAttachments: true` and `skipAttachmentCount: true` options

**Impact:** Single API call instead of 4, reducing HTTP overhead.

---

## Phase 2: Frontend Dashboard Optimizations

### 2.1 Fixed Double Data Fetch
**File:** `frontend/src/pages/Dashboard.js`

**Problem:** Two useEffects both triggered on `updateTrigger` change:
1. Direct call to `fetchDashboardData()` 
2. Debounced call via `debouncedRefresh()`

This caused 8 API calls instead of 4 on every task update.

**Solution:** Removed `updateTrigger` dependency from the initial useEffect, keeping only the debounced refresh for updates.

**Impact:** Eliminates duplicate API calls on task updates.

### 2.2 Removed Dead Code and Unused Imports
**File:** `frontend/src/pages/Dashboard.js`

**Removed imports:**
- `useDebounce` (unused - debouncing done manually)
- `Tooltip` (never rendered)
- `ViewTaskModal` (opened via context, not rendered directly)
- `Skeleton`, `TaskStatsSkeleton`, `EventStatsSkeleton`, `RecentTasksSkeleton`, `TaskOverviewSkeleton` (all imported but never used)

**Removed dead code:**
- ~300 lines of skeleton loading block (lines 546-842) that was never rendered because `loading` started as `false` and `initialLoadComplete` started as `true`.

**Impact:** Smaller bundle size, cleaner code, faster initial parse.

### 2.3 Context Over-Subscription (Noted)
**File:** `frontend/src/pages/Dashboard.js`

**Issue:** `useModal()` and `useTaskUpdate()` subscribe to full context values, causing unnecessary re-renders.

**Note:** This requires deeper refactoring of context providers to split values. The current fix removes the most impactful issue (double fetch). Full context optimization deferred to avoid breaking changes.

---

## Phase 3: Global Frontend Optimizations

### 3.1 Lazy-Loaded ModalRenderer
**File:** `frontend/src/App.js`

**Problem:** `ModalRenderer` was eagerly imported, pulling all 10 modal components into the main bundle regardless of which page was visited.

**Solution:** 
- Converted `ModalRenderer` to `React.lazy(() => import('./components/modals/ModalRenderer'))`
- Wrapped in `<Suspense fallback={null}>` (modals are overlay-only, no fallback needed)

**Impact:** Removes 10 modal components from main bundle, reduces initial load.

### 3.2 Added Webpack splitChunks Configuration
**File:** `frontend/config-overrides.js`

**Added configuration:**
```javascript
splitChunks: {
  chunks: 'all',
  maxInitialRequests: 25,
  minSize: 20000,
  cacheGroups: {
    react: { test: /react|react-dom|react-router-dom/, name: 'vendor-react' },
    chartjs: { test: /chart\.js|react-chartjs-2/, name: 'vendor-chartjs' },
    defaultVendors: { test: /node_modules/, priority: -10, reuseExistingChunk: true },
    common: { minChunks: 2, priority: -20, reuseExistingChunk: true }
  }
}
```

**Impact:** Better caching - React and Chart.js libraries are split into separate cacheable chunks.

### 3.3 Dynamic Import for pdfjs-dist
**File:** `frontend/src/pages/Reports.js`

**Problem:** `pdfjs-dist` (~1.5MB) was statically imported, loaded into Reports page chunk even if user never uses PDF viewing.

**Solution:** Converted to lazy dynamic import via `loadPdfjs()` function. Only loaded when PDF features are actually used.

**Impact:** Reduces Reports page initial chunk size by ~1.5MB.

---

## Phase 4: Tasks Page Optimizations

### 4.1 Parallelized Dropdown Fetches
**File:** `frontend/src/pages/Tasks.js`

**Problem:** The mount effect fetched categories, task types, and subtypes sequentially using 3 `await` calls. Each call blocked the next, taking 3x longer than necessary.

**Solution:** Replaced sequential `await` calls with `Promise.all()` to fetch all 3 dropdowns concurrently.

**Impact:** Dropdowns load 3x faster on initial mount.

### 4.2 Removed Unused useAuth() Subscription
**File:** `frontend/src/pages/Tasks.js`

**Problem:** `useAuth()` was imported and destructured to get `user`, but `user` was never used anywhere in the 2080-line file. This caused the entire Tasks component to re-render every time `AuthContext` state changed (e.g., background token refresh, user profile updates).

**Solution:** Removed the `useAuth` import and the destructuring of `user`.

**Impact:** Eliminates unnecessary re-renders from AuthContext changes.

### 4.3 Wrapped Handlers in useCallback
**File:** `frontend/src/pages/Tasks.js`

**Problem:** Key handlers (`handleAttachmentClick`, `handleSearchChange`, `handleColumnToggleClick`, `handleToggleColumn`, `loadTaskTypesByCategory`, `loadSubTypesByType`, `handleFilterChange`, `loadAllTaskTypesHelper`, `clearFilters`, `handleSort`, `handleTaskSelect`, `handleSelectAll`, `handleBulkDelete`, `handleConfirmAction`) were plain functions that created new references on every render. This caused the `columns` useMemo to invalidate on every render, making memoization useless.

**Solution:** Wrapped all key handlers in `useCallback` with appropriate dependency arrays. Moved `loadAllTaskTypesHelper` before `clearFilters` to fix the dependency order.

**Impact:** `columns` useMemo now correctly memoizes, reducing unnecessary re-renders of the DataTable component.

### 4.4 Added AbortController for Fetch Requests
**File:** `frontend/src/pages/Tasks.js`

**Problem:** The task fetch `useEffect` had no `AbortController`. When filters changed rapidly, multiple overlapping requests fired simultaneously, and the last to resolve "won" regardless of order, potentially causing stale data display.

**Solution:** Added `AbortController` with cleanup function in the `useEffect`. The controller aborts previous requests when dependencies change, and state updates are skipped for aborted requests.

**Impact:** Prevents race conditions and stale data on rapid filter changes.

### 4.5 Refactored Bulk Update/Delete to Batch SQL
**File:** `backend/routes/tasks.js`

**Problem:** 
- `handleBulkUpdate` looped through task IDs, calling `getTaskById()` + `updateTask()` for each. For N tasks, this was 2N-3N database queries.
- `handleBulkDelete` looped through task IDs, calling `getTaskById()` + notification check + notification insert + `deleteTask()` for each. For N tasks, this was 3N-4N queries.

**Solution:**
- **Bulk Update:** Single `UPDATE tasks SET ... WHERE id IN (...) AND user_id = ?` query. Added logic to exclude Archived tasks when setting status to Overdue via SQL `AND status != 'Archived'`.
- **Bulk Delete:** 
  1. Single SELECT to fetch all task titles (for notifications)
  2. Batch notification insert (with duplicate check)
  3. Batch attachment delete
  4. Single `DELETE FROM tasks WHERE id IN (...)` query

**Impact:** Reduces database queries from 2N-4N to ~3-4 for bulk operations (e.g., 100 tasks: from ~300 queries to 4).

### 4.6 Extracted Attachment Preview Component
**Files:** `frontend/src/components/common/AttachmentPreview.js` (new), `frontend/src/pages/Tasks.js`

**Problem:** The attachment preview overlay (~200 lines of JSX) with zoom/drag/print logic was inline in the 2080-line Tasks.js component. This included state for zoom/drag, event listeners, and preview content rendering.

**Solution:** Extracted into a standalone `AttachmentPreview` component with:
- Self-contained zoom/drag state and handlers (wrapped in `useCallback`)
- Global mouse/touch event listeners for drag
- File type-specific preview rendering (image, PDF, text, audio, video, fallback)
- Download and print functionality
- Proper cleanup of object URLs on unmount

**Impact:** Reduces Tasks.js by ~200 lines. The attachment preview is now lazy-ready and testable in isolation.

### 4.7 Removed Dead Code
**File:** `frontend/src/pages/Tasks.js`

**Removed:**
- `truncateText` function (defined but never called anywhere)

**Impact:** Minor cleanup, reduces file size.

---

## Files Modified Summary

| File | Changes |
|------|---------|
| `backend/models/Event.js` | Added `skipAttachments` option, parallelized `getEventStats`, fixed date anti-patterns |
| `backend/models/Task.js` | Added `skipAttachmentCount` option, fixed date anti-patterns in `getTaskStats` |
| `backend/config/database.js` | Added `idx_tasks_user_task_date` composite index |
| `backend/routes/dashboard.js` | Rewrote to serve `/api/dashboard/stats` endpoint |
| `backend/routes/tasks.js` | Batch SQL for bulk update/delete (Phase 4.5) |
| `backend/server.js` | Mounted dashboard routes before other API routes |
| `frontend/src/pages/Dashboard.js` | Fixed double fetch, removed ~300 lines dead code, removed 7 unused imports |
| `frontend/src/pages/Tasks.js` | Parallel dropdowns, useCallback handlers, AbortController, dead code removal (Phase 4) |
| `frontend/src/components/common/AttachmentPreview.js` | New component extracted from Tasks.js (Phase 4.6) |
| `frontend/src/App.js` | Lazy-loaded ModalRenderer |
| `frontend/config-overrides.js` | Added splitChunks configuration |
| `frontend/src/pages/Reports.js` | Converted pdfjs-dist to dynamic import |

---

## Expected Performance Impact

| Metric | Before | After |
|--------|--------|-------|
| SQL queries per dashboard load | ~34 | ~4-8 |
| API calls on task update | 8 (4 duplicate) | 4 |
| Dashboard.js line count | 1,177 | ~880 |
| Tasks.js line count | 2,080 | ~1,680 |
| Dead code lines | ~300 | 0 |
| ModalRenderer in main bundle | Yes (10 modals) | No (lazy) |
| pdfjs-dist in Reports chunk | Static (~1.5MB) | Dynamic (on-demand) |
| React/Chart.js caching | Shared chunks | Separate vendor chunks |
| Tasks dropdown load time | 3x sequential | 1x parallel |
| Tasks unnecessary re-renders | From useAuth + useCallback | Stable references |
| Bulk update/delete queries | 2N-4N per operation | ~3-4 total |
| Attachment preview code in Tasks.js | ~200 lines inline | Extracted component |
