# Tasks Page - Responsive Breakpoints & Modifications

This document outlines all responsive modifications for the Tasks page in the Tasker application.

---

## Complete Screen Size Breakpoints & Modifications

| Element | **≥1231px** (Large Desktop) | **≤1231px** (Desktop) | **≤957px** (Tablet) | **≤781px** (Small Tablet) | **≤768px** (Mobile) | **≤425px** (Very Small Mobile) |
|---------|----------------------------|----------------------|---------------------|--------------------------|---------------------|-------------------------------|
| **Page Header** |
| Title | `text-3xl` | `text-3xl` | `text-3xl` | `text-3xl` | `text-3xl` | `text-3xl` |
| Add Task Button | Full (icon + text) | Full (icon + text) | Full (icon + text) | Full (icon + text) | Full (icon + text) | Full (icon + text) |
| **Search Box** |
| Width | `w-80` (320px) | `w-80` (320px) | `w-full` | `w-full` | `w-full` | `w-full` |
| **View Button** |
| Text Label | Visible | **Hidden** (icon only) | **Hidden** (icon only) | **Hidden** (icon only) | **Hidden** (icon only) | **Hidden** (icon only) |
| **Today Button** |
| Text Label | Visible | **Hidden** (icon only) | **Hidden** (icon only) | **Hidden** (icon only) | **Hidden** (icon only) | **Hidden** (icon only) |
| **Date Range Picker** |
| Input Width | `w-32` (128px) | `w-32` (128px) | `w-10` (icon only) | `w-10` (icon only) | `w-10` (icon only) | `w-10` (icon only) |
| Icon | Visible | Visible | Visible | Visible | Visible | Visible |
| Separator (-) | Visible | **Hidden** | **Hidden** | **Hidden** | **Hidden** | **Hidden** |
| **Filter Button** |
| Text Label | Visible | **Hidden** (icon only) | **Hidden** (icon only) | **Hidden** (icon only) | **Hidden** (icon only) | **Hidden** (icon only) |
| **Sort Button** |
| Text Label | Visible | **Hidden** (icon only) | **Hidden** (icon only) | **Hidden** (icon only) | **Hidden** (icon only) | **Hidden** (icon only) |
| **Delete Button** |
| Text Label | Visible | **Hidden** (icon only) | **Hidden** (icon only) | **Hidden** (icon only) | **Hidden** (icon only) | **Hidden** (icon only) |
| **Archive Button** |
| Text Label | Visible | **Hidden** (icon only) | **Hidden** (icon only) | **Hidden** (icon only) | **Hidden** (icon only) | **Hidden** (icon only) |
| **Table Columns** |
| Checkbox | `w-10 px-4` | `w-10 px-4` | `w-10 px-4` | `w-10 px-4` | `w-auto px-2` | `w-auto px-2` |
| Title | `40%, px-1, min-w-[120px]` | `40%, px-1, min-w-[120px]` | `40%, px-1, min-w-[120px]` | `40%, px-0` | `40%, px-0, wrap text` | `40%, px-0, wrap text` |
| Category | `20%, px-4` **(visible)** | `20%, px-4` **(visible)** | `20%, px-4` **(visible)** | **HIDDEN** | **HIDDEN** | **HIDDEN** |
| Status | `15%, px-2, min-w-[90px]` | `15%, px-2, min-w-[90px]` | `15%, px-2, min-w-[90px]` | `15%, px-2, min-w-[90px]` | `15%, px-3, min-w-[85px]` | `15%, px-4, min-w-[80px]` |
| Task Date | `15%, px-2, min-w-[115px]` | `15%, px-2, min-w-[115px]` | `15%, px-2, min-w-[115px]` | `15%, px-2, min-w-[115px]` | `15%, px-3, min-w-[110px]` | `15%, px-4, min-w-[105px]` |
| Due Date | `15%, px-4` **(visible)** | `15%, px-4` **(visible)** | **HIDDEN** | **HIDDEN** | **HIDDEN** | **HIDDEN** |
| Actions | `10%, px-2` | `10%, px-2` | `10%, px-2` | `10%, px-2` | `10%, px-2` | `10%, px-2` |

---

## Summary by Breakpoint

### ≥1231px (Large Desktop)
- All button text labels visible
- Search box: 320px width (`min-[768px]:w-80`)
- Date inputs: 128px width with separator
- All table columns visible with full padding

### ≤1231px (Desktop)
- **All button text labels hidden** (`max-[1231px]:hidden`)
- Search box: 320px width
- Date inputs: 128px width, separator hidden

### ≤957px (Tablet)
- Date inputs: icon only (`max-[957px]:w-10`)
- **Due Date column hidden** (`max-[957px]:hidden`)

### ≤781px (Small Tablet)
- **Category column hidden** (`max-[781px]:hidden`)
- Title: `px-0` (no padding to minimize gap with checkbox)

### ≤768px (Mobile)
- Search box: full width
- Checkbox: `w-auto px-2` (no fixed width, reduced padding)
- Title text **wraps** instead of truncating (`max-[768px]:truncate-none max-[768px]:whitespace-normal max-[768px]:break-words`)
- Status: `px-3, min-w-[85px]` (reduced padding and min-width)
- Task Date: `px-3, min-w-[110px]` (reduced padding and min-width)

### ≤425px (Very Small Mobile)
- Status: `px-4, min-w-[80px]` (increased padding for gap)
- Task Date: `px-4, min-w-[105px]` (increased padding for gap)
- Extra padding prevents column intersection

---

## Column Width Percentages

| Column | Width |
|--------|-------|
| Checkbox | Auto (fixed width `w-10` on desktop) |
| Title | 40% |
| Category | 20% |
| Status | 15% |
| Task Date | 15% |
| Due Date | 15% |
| Actions | 10% |

**Total:** 115% (Category hidden ≤781px, Due Date hidden ≤957px)

---

## Key CSS Classes Used

### Checkbox Column (DataTable.js)
```jsx
// Header (≥768px)
className="px-4 py-3 w-10 flex-shrink-0"

// Mobile (≤768px)
className="px-4 py-3 w-10 max-[768px]:w-auto max-[768px]:px-2 flex-shrink-0"
```

### Title Column
```jsx
// Default
className="px-1 sm:px-2 py-3 min-w-[120px] max-[768px]:min-w-[100px] max-[781px]:px-0"
width: '40%'

// Text wrapping (≤768px)
className="cursor-default truncate max-[768px]:truncate-none max-[768px]:whitespace-normal max-[768px]:break-words"
```

### Status Column
```jsx
// Default (≥768px)
className="px-2 sm:px-4 py-3 min-w-[90px]"

// Mobile (≤768px)
className="px-2 sm:px-4 py-3 min-w-[90px] max-[768px]:min-w-[85px] max-[768px]:px-3 max-[425px]:min-w-[80px] max-[425px]:px-4"
width: '15%'
```

### Task Date Column
```jsx
// Default (≥768px)
className="px-2 sm:px-4 py-3 min-w-[115px]"

// Mobile (≤768px)
className="px-2 sm:px-4 py-3 min-w-[115px] max-[768px]:min-w-[110px] max-[768px]:px-3 max-[425px]:min-w-[105px] max-[425px]:px-4"
width: '15%'
```

### Category Column
```jsx
// Visible on desktop
className="px-4 py-3 max-[781px]:hidden"
width: '20%'
```

### Due Date Column
```jsx
// Visible on desktop
className="px-4 py-3 max-[957px]:hidden"
width: '15%'
```

### Actions Column
```jsx
className="px-2 py-3 text-center"
width: '10%'
```

---

## Files Modified

1. **`frontend/src/pages/Tasks.js`**
   - Column definitions with responsive classes (lines ~696-750)
   - LoadingTableSkeleton component (lines ~57-90)
   - Button text labels with `max-[1231px]:hidden`
   - Search box with `w-full min-[768px]:w-80`
   - Date inputs with `w-32 max-[957px]:w-10`

2. **`frontend/src/components/common/DataTable.js`**
   - Checkbox column header responsive classes (line ~53)
   - Checkbox cell responsive classes (line ~82)

---

## Purpose of Modifications

1. **Prevent Column Intersection**: Minimum widths and padding adjustments ensure columns don't overlap on small screens
2. **Optimize Space**: Hide less critical columns (Category ≤781px, Due Date ≤957px) on smaller screens
3. **Improve Readability**: Title text wraps instead of truncating on mobile (≤768px)
4. **Icon-Only Buttons**: Reduce button width by hiding text labels on smaller screens (≤1231px)
5. **Responsive Search**: Full-width search box on mobile for better usability (≤768px)
6. **Checkbox Optimization**: Remove fixed width on mobile to save space (≤768px)
7. **Extra Padding on Very Small Screens**: Status and Task Date columns get extra padding at ≤425px to prevent intersection
