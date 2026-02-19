import React, { useState, useEffect, useRef, useMemo } from 'react';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import Tooltip from '../components/common/Tooltip';
import ViewTaskModal from '../components/modals/ViewTaskModal';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../hooks/useModal';
import { useTaskUpdate } from '../context/TaskUpdateContext';
import { useDebounce } from '../hooks/useDebounce';
import { taskService } from '../services/taskService';
import { categoryService } from '../services/categoryService';
import { taskTypeService } from '../services/taskTypeService';
import { subTypeService } from '../services/subTypeService';
import { attachmentService } from '../services/attachmentService';
import { formatToLocalDateTime, formatDateOnly } from '../utils/date';
import Skeleton from '../components/common/Skeleton';

/**
 * Option 2 - Modularized/cleaned version
 * - Same behavior as Option 1, but split into small helper components and hooks for clarity.
 * - All UI features (search, filters, sort, dropdowns, DataTable, pagination, modals) preserved.
 */

const useOutsideClick = (refList = [], onOutside) => {
  useEffect(() => {
    const handle = (e) => {
      for (const r of refList) {
        if (r.current && r.current.contains(e.target)) {
          return;
        }
      }
      onOutside();
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [refList, onOutside]);
};

const StatusPill = ({ status }) => {
  const className = status === 'Completed'
    ? 'bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-400'
    : status === 'In Progress'
    ? 'bg-warning-100 text-warning-800 dark:bg-warning-900/30 dark:text-warning-400'
    : status === 'Overdue'
    ? 'bg-error-100 text-error-800 dark:bg-error-900/30 dark:text-error-400'
    : status === 'Archived'
    ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    : 'bg-danger-100 text-danger-800 dark:bg-danger-900/30 dark:text-danger-400';

  return <div className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>{status}</div>;
};

const LoadingTableSkeleton = ({ columns, tableDimensions }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
      <table className="w-full text-left table-fixed">
        <thead className="bg-gray-50 dark:bg-gray-900/50">
          <tr>
            <th className="px-4 py-3 w-10 max-[768px]:w-auto max-[768px]:px-2">
              <input
                type="checkbox"
                className="rounded text-primary focus:ring-primary"
                disabled
              />
            </th>
            {columns.map((col, i) => (
              <th
                key={i}
                className="px-4 py-3 font-medium text-[#617589] dark:text-gray-400"
                style={{ width: tableDimensions.columnWidths?.[i] || 'auto' }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {[...Array(10)].map((_, r) => (
            <tr 
              key={r} 
              className="hover:bg-gray-50 dark:hover:bg-gray-900/20 transition-colors duration-200"
              style={{ height: tableDimensions.rowHeights?.[r] || 52 }}
            >
              <td className="px-4 py-4 w-10 max-[768px]:w-auto max-[768px]:px-2">
                <input
                  type="checkbox"
                  className="rounded text-primary focus:ring-primary"
                  disabled
                />
              </td>
              {columns.map((col, c) => (
                <td key={c} className="px-4 py-4 text-[#333333] dark:text-gray-200">
                  {col.key === 'actions' ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded bg-gray-200 dark:bg-gray-700"></div>
                      <div className="w-5 h-5 rounded bg-gray-200 dark:bg-gray-700"></div>
                      <div className="w-5 h-5 rounded bg-gray-200 dark:bg-gray-700"></div>
                    </div>
                  ) : col.key === 'attachment_count' ? (
                    <div className="w-5 h-5 rounded bg-gray-200 dark:bg-gray-700"></div>
                  ) : (
                    <Skeleton type="text" className="w-full h-4" />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const FilterDropdown = ({
  filters,
  categories,
  taskTypes,
  subTypes,
  loadingDropdowns,
  onChange,
  onClear
}) => {
  return (
    <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 p-4 border border-gray-200 dark:border-gray-700">
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
          <select
            value={filters.status}
            onChange={(e) => onChange('status', e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Overdue">Overdue</option>
            <option value="Archived">Archived</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
          <select
            value={filters.priority}
            onChange={(e) => onChange('priority', e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
          >
            <option value="">All Priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
          <select
            value={filters.category_id}
            onChange={(e) => onChange('category_id', e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
          >
            <option value="">All Categories</option>
            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Task Type</label>
          <select
            value={filters.type_id}
            onChange={(e) => onChange('type_id', e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
            disabled={!filters.category_id}
          >
            <option value="">All Task Types</option>
            {taskTypes.map(tt => <option key={tt.id} value={tt.id}>{tt.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sub Type</label>
          <select
            value={filters.sub_type_id}
            onChange={(e) => onChange('sub_type_id', e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
            disabled={!filters.type_id}
          >
            <option value="">All Sub Types</option>
            {subTypes.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
          </select>
        </div>

        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.with_attachment}
              onChange={(e) => onChange('with_attachment', e.target.checked)}
              className="rounded text-primary focus:ring-primary"
            />
            With Attachment Only
          </label>
        </div>
        {/* The show archived checkbox is now in the main UI, so we don't need it here */}
        <Button variant="outline" size="sm" className="w-full" onClick={onClear}>Clear Filters</Button>
      </div>
    </div>
  );
};

const SearchOptionsDropdown = ({ filters, onChange }) => {
  return (
    <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 py-2 border border-gray-200 dark:border-gray-700">
      <div className="px-4 py-2 space-y-1">
        <div className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.search_task_date}
              onChange={(e) => onChange('search_task_date', e.target.checked)}
              className="rounded text-primary focus:ring-primary"
            />
            Task
          </label>
        </div>
        <div className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.search_created_date}
              onChange={(e) => onChange('search_created_date', e.target.checked)}
              className="rounded text-primary focus:ring-primary"
            />
            Created
          </label>
        </div>
        <div className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.search_edited_date}
              onChange={(e) => onChange('search_edited_date', e.target.checked)}
              className="rounded text-primary focus:ring-primary"
            />
            Modified
          </label>
        </div>
        <div className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.search_due_date}
              onChange={(e) => onChange('search_due_date', e.target.checked)}
              className="rounded text-primary focus:ring-primary"
            />
            Due
          </label>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
          <div className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.show_archived}
                onChange={(e) => onChange('show_archived', e.target.checked)}
                className="rounded text-primary focus:ring-primary"
              />
              Show Archived
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

const SortDropdown = ({ columns, onSort }) => (
  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 p-2 border border-gray-200 dark:border-gray-700">
    <div className="space-y-1">
      {columns.filter(c => c.key !== 'actions').map((col, idx) => (
        <button
          key={idx}
          className="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
          onClick={() => onSort(col.key)}
        >
          {col.header}
        </button>
      ))}
    </div>
  </div>
);

const ActionsDropdown = ({ 
  task, 
  loadingAttachmentTaskId, 
  onAttachmentClick, 
  onViewClick, 
  onEditClick, 
  onArchiveClick,
  isOpen,
  onClose,
  dropdownRef
}) => {
  if (!isOpen) return null;

  return (
    <div 
      ref={dropdownRef}
      className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-20 border border-gray-200 dark:border-gray-700 py-1"
    >
      <button
        className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
          task.attachment_count > 0
            ? 'text-gray-700 dark:text-gray-300'
            : 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
        }`}
        onClick={(e) => {
          e.stopPropagation();
          if (task.attachment_count > 0 && loadingAttachmentTaskId !== task.id) {
            onAttachmentClick(task.id, e);
          }
          onClose();
        }}
        disabled={task.attachment_count === 0 || loadingAttachmentTaskId === task.id}
      >
        <span className="material-symbols-outlined text-base">attach_file</span>
        <span>
          {loadingAttachmentTaskId === task.id 
            ? 'Loading...' 
            : `${task.attachment_count} attachment${task.attachment_count !== 1 ? 's' : ''}`
          }
        </span>
      </button>
      
      <button
        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          onViewClick(task);
          onClose();
        }}
      >
        <span className="material-symbols-outlined text-base">visibility</span>
        <span>View Task</span>
      </button>
      
      <button
        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          onEditClick(task);
          onClose();
        }}
      >
        <span className="material-symbols-outlined text-base">edit</span>
        <span>Edit Task</span>
      </button>
      
      <button
        className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
          task.status === 'Archived'
            ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
            : 'text-gray-700 dark:text-gray-300'
        }`}
        onClick={(e) => {
          e.stopPropagation();
          if (task.status !== 'Archived') {
            onArchiveClick(task.id);
          }
          onClose();
        }}
        disabled={task.status === 'Archived'}
      >
        <span className="material-symbols-outlined text-base">archive</span>
        <span>{task.status === 'Archived' ? 'Already Archived' : 'Archive Task'}</span>
      </button>
    </div>
  );
};

const Option2Tasks = () => {
  const { user } = useAuth();
  const { openNewTaskModal, openEditTaskModal, openViewTaskModal } = useModal();
  const { updateTrigger: taskUpdateTrigger, triggerTaskUpdate, dropdownUpdateTrigger } = useTaskUpdate();

  const [tasks, setTasks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Initialize filters from URL parameters if window is available
  const [filters, setFilters] = useState(() => {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      const getUrlParameter = (name) => {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
      };

      return {
        status: getUrlParameter('status') || '',
        priority: getUrlParameter('priority') || '',
        category_id: getUrlParameter('category_id') || '',
        type_id: getUrlParameter('type_id') || '',
        sub_type_id: getUrlParameter('sub_type_id') || '',
        date_from: getUrlParameter('date_from') || '',
        date_to: getUrlParameter('date_to') || '',
        show_archived: getUrlParameter('show_archived') === 'true', // Convert string to boolean
        with_attachment: getUrlParameter('with_attachment') === 'true', // Default to false
        search_task_date: getUrlParameter('search_task_date') !== 'false', // Default to true
        search_created_date: getUrlParameter('search_created_date') === 'true',
        search_edited_date: getUrlParameter('search_edited_date') === 'true',
        search_due_date: getUrlParameter('search_due_date') === 'true'
      };
    } else {
      // Server-side or non-browser environment - return default values
      return {
        status: '',
        priority: '',
        category_id: '',
        type_id: '',
        sub_type_id: '',
        date_from: '',
        date_to: '',
        show_archived: false,
        with_attachment: false,
        search_task_date: true,
        search_created_date: false,
        search_edited_date: false,
        search_due_date: false
      };
    }
  });

  const [loading, setLoading] = useState(true);
  const [loadingDropdowns, setLoadingDropdowns] = useState({ categories: false, taskTypes: false, subTypes: false });
  const [tableDimensions, setTableDimensions] = useState({ width: '100%', columnWidths: [], rowHeights: [] });
  const tableRef = useRef(null);

  // These state variables now need to be updated when new items are created in the modals
  const [categories, setCategories] = useState([]);
  const [taskTypes, setTaskTypes] = useState([]);
  const [subTypes, setSubTypes] = useState([]);

  // Function to refresh dropdown options
  const refreshCategories = async () => {
    try {
      setLoadingDropdowns(prev => ({ ...prev, categories: true }));
      const response = await categoryService.getAllCategories();
      setCategories(response.categories || response.data || []);
    } catch (err) {
      console.error('Error refreshing categories:', err);
    } finally {
      setLoadingDropdowns(prev => ({ ...prev, categories: false }));
    }
  };

  const refreshTaskTypes = async () => {
    try {
      setLoadingDropdowns(prev => ({ ...prev, taskTypes: true }));
      const response = await taskTypeService.getAllTaskTypes();
      setTaskTypes(response.types || response.data || []);
    } catch (err) {
      console.error('Error refreshing task types:', err);
    } finally {
      setLoadingDropdowns(prev => ({ ...prev, taskTypes: false }));
    }
  };

  const refreshSubTypes = async () => {
    try {
      setLoadingDropdowns(prev => ({ ...prev, subTypes: true }));
      const response = await subTypeService.getAllSubTypes();
      setSubTypes(response.subTypes || response.subtypes || response.data || []);
    } catch (err) {
      console.error('Error refreshing sub types:', err);
    } finally {
      setLoadingDropdowns(prev => ({ ...prev, subTypes: false }));
    }
  };

  // Effect to refresh dropdowns when dropdownUpdateTrigger changes
  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        // Reload all dropdown options
        setLoadingDropdowns({ categories: true, taskTypes: true, subTypes: true });

        const [catRes, typeRes, subRes] = await Promise.allSettled([
          categoryService.getAllCategories(),
          taskTypeService.getAllTaskTypes(),
          subTypeService.getAllSubTypes()
        ]);

        if (catRes.status === 'fulfilled') {
          setCategories(catRes.value.categories || catRes.value.data || []);
        } else {
          console.error('Error fetching categories:', catRes.reason);
        }

        if (typeRes.status === 'fulfilled') {
          setTaskTypes(typeRes.value.types || typeRes.value.data || []);
        } else {
          console.error('Error fetching task types:', typeRes.reason);
        }

        if (subRes.status === 'fulfilled') {
          setSubTypes(subRes.value.subTypes || subRes.value.subtypes || subRes.value.data || []);
        } else {
          console.error('Error fetching sub types:', subRes.reason);
        }
      } catch (err) {
        console.error('Error refreshing dropdowns:', err);
      } finally {
        setLoadingDropdowns({ categories: false, taskTypes: false, subTypes: false });
      }
    };

    if (dropdownUpdateTrigger > 0) {
      loadDropdowns();
    }
  }, [dropdownUpdateTrigger]);

  // Helper function to get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    // Ensure we're setting the date to the end of the day to avoid timezone issues
    today.setHours(23, 59, 59, 999);
    return today.toISOString().split('T')[0];
  };

  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const debouncedFilters = useDebounce(filters, 150);

  const [currentPage, setCurrentPage] = useState(1);
  const [tasksPerPage, setTasksPerPage] = useState(10);
  const [totalTasks, setTotalTasks] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [selectedTasks, setSelectedTasks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [actionType, setActionType] = useState('delete'); // 'delete' or 'archive'
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'info' }); // type: 'info', 'success', 'error'
  const [previewAttachment, setPreviewAttachment] = useState(null);
  const [taskAttachments, setTaskAttachments] = useState({ isOpen: false, taskId: null, attachments: [] });
  const [loadingAttachmentTaskId, setLoadingAttachmentTaskId] = useState(null); // Track which task's attachment is loading

  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showSearchOptionsDropdown, setShowSearchOptionsDropdown] = useState(false);
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const filterDropdownRef = useRef(null);
  const sortDropdownRef = useRef(null);
  const searchOptionsDropdownRef = useRef(null);
  const actionsDropdownRef = useRef(null);

  useOutsideClick([filterDropdownRef, sortDropdownRef, searchOptionsDropdownRef, actionsDropdownRef], () => {
    setShowFilterDropdown(false);
    setShowSortDropdown(false);
    setShowSearchOptionsDropdown(false);
    setShowActionsDropdown(false);
    setActiveTaskId(null);
  });

  // State to track hover for search options dropdown
  const [isSearchOptionsHovered, setIsSearchOptionsHovered] = useState(false);
  const [isFilterHovered, setIsFilterHovered] = useState(false);
  const [isSortHovered, setIsSortHovered] = useState(false);

  // Effect to handle hover functionality
  useEffect(() => {
    let timeout;
    if (isSearchOptionsHovered && !showSearchOptionsDropdown) {
      // Show dropdown on hover if not already open
      timeout = setTimeout(() => {
        setShowSearchOptionsDropdown(true);
      }, 300); // Delay to prevent accidental opening
    } else if (!isSearchOptionsHovered && showSearchOptionsDropdown) {
      // Hide dropdown after a delay when not hovered
      timeout = setTimeout(() => {
        setShowSearchOptionsDropdown(false);
      }, 500); // Delay to allow movement to dropdown
    }
    return () => clearTimeout(timeout);
  }, [isSearchOptionsHovered, showSearchOptionsDropdown]);

  // Effect to handle filter dropdown hover functionality
  useEffect(() => {
    let timeout;
    if (isFilterHovered && !showFilterDropdown) {
      // Show dropdown on hover if not already open
      timeout = setTimeout(() => {
        setShowFilterDropdown(true);
      }, 300); // Delay to prevent accidental opening
    } else if (!isFilterHovered && showFilterDropdown) {
      // Hide dropdown after a delay when not hovered
      timeout = setTimeout(() => {
        setShowFilterDropdown(false);
      }, 500); // Delay to allow movement to dropdown
    }
    return () => clearTimeout(timeout);
  }, [isFilterHovered, showFilterDropdown]);

  // Effect to handle sort dropdown hover functionality
  useEffect(() => {
    let timeout;
    if (isSortHovered && !showSortDropdown) {
      // Show dropdown on hover if not already open
      timeout = setTimeout(() => {
        setShowSortDropdown(true);
      }, 300); // Delay to prevent accidental opening
    } else if (!isSortHovered && showSortDropdown) {
      // Hide dropdown after a delay when not hovered
      timeout = setTimeout(() => {
        setShowSortDropdown(false);
      }, 500); // Delay to allow movement to dropdown
    }
    return () => clearTimeout(timeout);
  }, [isSortHovered, showSortDropdown]);

  // Helper mapping for sort fields
  const mapSortField = (frontendField) => {
    const fieldMap = {
      'title': 'title',
      'category_name': 'category_id',
      'type_name': 'type_id',
      'sub_type_name': 'sub_type_id',
      'quantity': 'quantity',
      'status': 'status',
      'task_date': 'task_date',
      'due_date': 'due_date',
      'priority': 'priority',
      'created_date': 'created_date'  // Still need this for the date search filters
    };
    return fieldMap[frontendField] || frontendField;
  };

  // Function to handle attachment icon click
  const handleAttachmentClick = async (taskId, e) => {
    e.stopPropagation(); // Prevent row click from triggering

    if (!taskId) return;

    try {
      // Set loading state for this specific task
      setLoadingAttachmentTaskId(taskId);

      // Fetch attachments for the task
      const response = await attachmentService.getAttachmentsByEntity(taskId, 'task');
      const attachments = response.attachments || [];

      if (attachments.length > 0) {
        // Set the first attachment as the preview attachment
        const firstAttachment = attachments[0];

        // Download the attachment to create a preview
        const blob = await attachmentService.downloadAttachment(firstAttachment.id);

        // Create a temporary URL for the file for preview
        const url = window.URL.createObjectURL(blob);

        // Set the attachment and URL for preview
        setPreviewAttachment({
          ...firstAttachment,
          previewUrl: url
        });
      } else {
        setAlertModal({
          isOpen: true,
          title: 'No Attachments',
          message: 'This task has no attachments.',
          type: 'info'
        });
      }
    } catch (error) {
      console.error('Error fetching attachments:', error);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Failed to load attachments: ' + (error.message || 'Unknown error'),
        type: 'error'
      });
    } finally {
      // Reset loading state for this task
      setLoadingAttachmentTaskId(null);
    }
  };

  // Columns memoized
  const columns = useMemo(() => ([
    {
      header: 'Title',
      key: 'title',
      className: 'px-1 sm:px-2 py-3 min-w-[120px] max-[768px]:min-w-[100px] max-[781px]:px-0',
      width: '40%',
      render: (v, task) => (
        <Tooltip content={task.description || 'No description provided'} position="top">
          <div className="flex items-center gap-2">
            <span
              className="cursor-default truncate max-[768px]:truncate-none max-[768px]:whitespace-normal max-[768px]:break-words"
              title={task.title || 'N/A'}
            >
              {task.title || 'N/A'}
            </span>
          </div>
        </Tooltip>
      )
    },
    {
      header: 'Category',
      key: 'category_name',
      className: 'px-4 py-3 max-[781px]:hidden',
      width: '20%'
    },
    {
      header: 'Status',
      key: 'status',
      className: 'px-2 sm:px-4 py-3 min-w-[90px] max-[768px]:min-w-[85px] max-[768px]:px-3 max-[425px]:min-w-[80px] max-[425px]:px-4',
      width: '15%',
      render: (v) => <StatusPill status={v} />
    },
    {
      header: 'Task Date',
      key: 'task_date',
      className: 'px-2 sm:px-4 py-3 min-w-[115px] max-[768px]:min-w-[110px] max-[768px]:px-3 max-[425px]:min-w-[105px] max-[425px]:px-4',
      width: '15%',
      render: (v) => v ? formatDateOnly(v) : 'N/A'
    },
    {
      header: 'Due Date',
      key: 'due_date',
      className: 'px-4 py-3 max-[957px]:hidden',
      width: '15%',
      render: (v) => v ? formatDateOnly(v) : 'N/A'
    },
    {
      header: '',
      key: 'actions',
      className: 'px-2 py-3 text-center',
      width: '10%',
      render: (v, task) => (
        <div className="relative flex justify-center">
          <button
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Actions"
            onClick={(e) => {
              e.stopPropagation();
              if (showActionsDropdown && activeTaskId === task.id) {
                setShowActionsDropdown(false);
                setActiveTaskId(null);
              } else {
                setShowActionsDropdown(true);
                setActiveTaskId(task.id);
              }
            }}
          >
            <span className="material-symbols-outlined text-gray-500 dark:text-gray-400">more_vert</span>
          </button>

          {showActionsDropdown && activeTaskId === task.id && (
            <ActionsDropdown
              task={task}
              loadingAttachmentTaskId={loadingAttachmentTaskId}
              onAttachmentClick={handleAttachmentClick}
              onViewClick={(task) => {
                const transformedTask = {
                  ...task,
                  taskDate: task.task_date ? formatToLocalDateTime(task.task_date) : 'N/A',
                  dueDate: task.due_date ? formatToLocalDateTime(task.due_date) : 'N/A',
                  createdDate: task.created_date ? formatToLocalDateTime(task.created_date) : 'N/A',
                  editedDate: task.edited_date ? formatToLocalDateTime(task.edited_date) : 'N/A',
                  category: task.category_name,
                  type: task.type_name,
                  subType: task.sub_type_name
                };
                openViewTaskModal(transformedTask);
              }}
              onEditClick={openEditTaskModal}
              onArchiveClick={(taskId) => {
                setTaskToDelete(taskId);
                setActionType('archive');
                setIsModalOpen(true);
              }}
              isOpen={showActionsDropdown && activeTaskId === task.id}
              onClose={() => {
                setShowActionsDropdown(false);
                setActiveTaskId(null);
              }}
              dropdownRef={actionsDropdownRef}
            />
          )}
        </div>
      )
    }
  ]), [openEditTaskModal, openViewTaskModal, showActionsDropdown, activeTaskId, loadingAttachmentTaskId]);

  // Load dropdowns on mount
  useEffect(() => {
    const load = async () => {
      try {
        setLoadingDropdowns(prev => ({ ...prev, categories: true }));
        const catRes = await categoryService.getAllCategories();
        setCategories(catRes.categories || catRes.data || []);
        setLoadingDropdowns(prev => ({ ...prev, taskTypes: true }));
        const tRes = await taskTypeService.getAllTaskTypes();
        setTaskTypes(tRes.types || tRes.data || []);
        setLoadingDropdowns(prev => ({ ...prev, subTypes: true }));

        // Check if a type_id is already selected in the filters, load sub types for that type
        if (filters.type_id) {
          const sRes = await subTypeService.getSubTypesByTypeId(filters.type_id);
          setSubTypes(sRes.subTypes || sRes.subtypes || sRes.data || []);
        } else {
          const sRes = await subTypeService.getAllSubTypes();
          setSubTypes(sRes.subTypes || sRes.subtypes || sRes.data || []);
        }
      } catch (err) {
        console.error('Failed to load dropdowns', err);
      } finally {
        setLoadingDropdowns({ categories: false, taskTypes: false, subTypes: false });
      }
    };
    load();
  }, []);

  // Effect to load sub types when type_id filter changes (using raw filters to ensure immediate response)
  useEffect(() => {
    if (filters.type_id) {
      loadSubTypesByType(filters.type_id);
    } else {
      // If no type_id is selected, clear sub types
      setSubTypes([]);
    }
  }, [filters.type_id]);

  // Effect: fetch tasks when filters/pagination/sort change
  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const params = {};
        if (debouncedSearchTerm) params.search = debouncedSearchTerm;
        if (debouncedFilters.status) params.status = debouncedFilters.status;
        if (debouncedFilters.priority) params.priority = debouncedFilters.priority;
        if (debouncedFilters.category_id) params.category_id = parseInt(debouncedFilters.category_id);
        if (debouncedFilters.type_id) params.type_id = parseInt(debouncedFilters.type_id);
        if (debouncedFilters.sub_type_id) params.sub_type_id = parseInt(debouncedFilters.sub_type_id);
        if (debouncedFilters.date_from && debouncedFilters.date_to) {
          // Add date range parameters only for the selected date fields
          if (debouncedFilters.search_task_date) {
            params.task_date_from = debouncedFilters.date_from;
            params.task_date_to = debouncedFilters.date_to;
          }
          if (debouncedFilters.search_created_date) {
            params.created_date_from = debouncedFilters.date_from;
            params.created_date_to = debouncedFilters.date_to;
          }
          if (debouncedFilters.search_edited_date) {
            params.edited_date_from = debouncedFilters.date_from;
            params.edited_date_to = debouncedFilters.date_to;
          }
          if (debouncedFilters.search_due_date) {
            params.due_date_from = debouncedFilters.date_from;
            params.due_date_to = debouncedFilters.date_to;
          }
        }

        // Only exclude archived tasks if show_archived is false
        if (!debouncedFilters.show_archived) {
          params.exclude_archived = true;
        }

        // Include with_attachment filter if enabled
        if (debouncedFilters.with_attachment) {
          params.with_attachment = true;
        }

        // Add sort parameters if provided
        if (sortConfig.key && sortConfig.direction) {
          params.sort = sortConfig.key;
          params.order = sortConfig.direction;
        }

        const res = await taskService.getPaginatedTasks(currentPage, tasksPerPage, params, sortConfig);
        setTasks(res.tasks || []);
        setTotalTasks(res.total || 0);
        setTotalPages(res.totalPages || 1);
      } catch (err) {
        console.error('Error fetching tasks', err);
        setTasks([]);
        setTotalTasks(0);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [currentPage, tasksPerPage, debouncedSearchTerm, debouncedFilters, sortConfig, taskUpdateTrigger]);

  // Measure table dimensions after data loads
  useEffect(() => {
    if (!loading && tableRef.current && tasks.length > 0) {
      const table = tableRef.current;
      const headerRow = table.querySelector('thead tr');
      const bodyRows = table.querySelectorAll('tbody tr');
      
      const headerCells = headerRow?.querySelectorAll('th') || [];
      const firstBodyRow = bodyRows[0];

      // Get column widths from actual table
      const columnWidths = Array.from(headerCells).map(cell => cell.offsetWidth);
      
      // Get row heights from first 10 rows (or fewer if less data)
      const rowHeights = Array.from(bodyRows).slice(0, 10).map(row => row.offsetHeight);

      setTableDimensions({
        width: table.offsetWidth,
        columnWidths,
        rowHeights: rowHeights.length >= 10 ? rowHeights : [...rowHeights, ...Array(10 - rowHeights.length).fill(52)]
      });
    }
  }, [tasks, loading]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const loadTaskTypesByCategory = async (categoryId) => {
    try {
      setLoadingDropdowns(prev => ({ ...prev, taskTypes: true }));
      const res = await taskTypeService.getTaskTypesByCategoryId(categoryId);
      setTaskTypes(res.types || res.data || []);
      setSubTypes([]);
    } catch (err) {
      console.error('Error loading task types by category:', err);
      setTaskTypes([]);
    } finally {
      setLoadingDropdowns(prev => ({ ...prev, taskTypes: false }));
    }
  };

  const loadSubTypesByType = async (typeId) => {
    try {
      setLoadingDropdowns(prev => ({ ...prev, subTypes: true }));
      const res = await subTypeService.getSubTypesByTypeId(typeId);
      setSubTypes(res.subTypes || res.subtypes || res.data || []);
    } catch (err) {
      console.error('Error loading sub types by type:', err);
      setSubTypes([]);
    } finally {
      setLoadingDropdowns(prev => ({ ...prev, subTypes: false }));
    }
  };

  const handleFilterChange = (name, value) => {
    setFilters(prev => {
      let next = { ...prev, [name]: value };
      if (name === 'category_id') {
        next.type_id = '';
        next.sub_type_id = '';
        if (value) loadTaskTypesByCategory(value);
        else {
          // reload all task types
          taskTypeService.getAllTaskTypes().then(res => setTaskTypes(res.types || res.data || [])).catch(() => setTaskTypes([]));
          setSubTypes([]);
        }
      } else if (name === 'type_id') {
        next.sub_type_id = '';
        if (value) loadSubTypesByType(value);
        else setSubTypes([]);
      } else if (name === 'show_archived') {
        // When toggling show_archived, we may want to refresh the task list immediately
      }
      return next;
    });
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      priority: '',
      category_id: '',
      type_id: '',
      sub_type_id: '',
      date_from: '',
      date_to: '',
      show_archived: false,
      with_attachment: false,
      search_task_date: true,
      search_created_date: false,
      search_edited_date: false,
      search_due_date: false
    });
    // reload all types/subtypes
    loadAllTaskTypesHelper();
    subTypeService.getAllSubTypes().then(res => setSubTypes(res.subtypes || res.data || [])).catch(() => setSubTypes([]));
  };

  const loadAllTaskTypesHelper = async () => {
    try {
      setLoadingDropdowns(prev => ({ ...prev, taskTypes: true }));
      const res = await taskTypeService.getAllTaskTypes();
      setTaskTypes(res.types || res.data || []);
    } catch (err) {
      setTaskTypes([]);
    } finally {
      setLoadingDropdowns(prev => ({ ...prev, taskTypes: false }));
    }
  };

  const handleSort = (frontendKey) => {
    let dir = 'asc';
    if (sortConfig.key === frontendKey && sortConfig.direction === 'asc') dir = 'desc';
    const backendField = mapSortField(frontendKey);
    setSortConfig({ key: backendField, direction: dir });
    setShowSortDropdown(false);
  };

  const handleTaskSelect = (id, checked) => {
    setSelectedTasks(prev => checked ? [...prev, id] : prev.filter(x => x !== id));
  };

  const handleSelectAll = (checked) => {
    setSelectedTasks(checked ? tasks.map(t => t.id) : []);
  };

  const handleBulkDelete = async () => {
    try {
      await taskService.bulkDeleteTasks(selectedTasks);
      setSelectedTasks([]);
      setIsModalOpen(false);
      // refresh
      setCurrentPage(1);
    } catch (err) {
      console.error(err);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Failed to delete selected tasks',
        type: 'error'
      });
    }
  };

  const handleConfirmAction = async () => {
    if (taskToDelete) {
      // Single task operation (delete)
      try {
        await taskService.deleteTask(taskToDelete);
        setTaskToDelete(null);
        setIsModalOpen(false);
      } catch (err) {
        console.error(err);
        setAlertModal({
          isOpen: true,
          title: 'Error',
          message: 'Failed to delete task',
          type: 'error'
        });
        // Don't proceed with refresh if deletion failed
        return;
      }
    } else if (selectedTasks.length > 0) {
      // Bulk operation (delete or archive)
      try {
        if (actionType === 'delete') {
          await taskService.bulkDeleteTasks(selectedTasks);
        } else if (actionType === 'archive') {
          await taskService.bulkUpdateTasks(selectedTasks, { status: 'Archived' });
        }
        setSelectedTasks([]);
        setIsModalOpen(false);
      } catch (err) {
        console.error(err);
        setAlertModal({
          isOpen: true,
          title: 'Error',
          message: `Failed to ${actionType} tasks`,
          type: 'error'
        });
        // Don't proceed with refresh if deletion failed
        return;
      }
    }

    // Reset page and trigger refresh after successful deletion
    setCurrentPage(1);
    // Trigger a refresh to update the task list in all components
    triggerTaskUpdate();
  };

  // Function to get file icon based on type
  const getFileIcon = (type) => {
    if (type.includes('image')) return 'image';
    if (type.includes('pdf')) return 'picture_as_pdf';
    if (type.includes('word')) return 'description';
    if (type.includes('excel') || type.includes('sheet')) return 'grid_on';
    if (type.includes('powerpoint') || type.includes('presentation')) return 'slideshow';
    if (type.includes('zip') || type.includes('compressed')) return 'archive';
    return 'description';
  };

  // State for image zoom and drag functionality
  const [zoomLevel, setZoomLevel] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Function to handle zoom in
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.2, 3)); // Max zoom level 3x
  };

  // Function to handle zoom out
  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.2, 0.5)); // Min zoom level 0.5x
  };

  // Function to reset zoom
  const handleResetZoom = () => {
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });
  };

  // Function to handle drag start
  const handleDragStart = (e) => {
    if (zoomLevel > 1) { // Only allow dragging when zoomed in
      setIsDragging(true);
      const clientX = e.type === 'mousedown' ? e.clientX : e.touches[0].clientX;
      const clientY = e.type === 'mousedown' ? e.clientY : e.touches[0].clientY;
      setDragStart({
        x: clientX - position.x,
        y: clientY - position.y
      });
      e.preventDefault();
    }
  };

  // Function to handle drag move
  const handleDragMove = (e) => {
    if (isDragging && zoomLevel > 1) {
      const clientX = e.type === 'mousemove' ? e.clientX : e.touches[0].clientX;
      const clientY = e.type === 'mousemove' ? e.clientY : e.touches[0].clientY;
      setPosition({
        x: clientX - dragStart.x,
        y: clientY - dragStart.y
      });
    }
  };

  // Function to handle drag end
  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Function to handle wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomIntensity = 0.1;
    const newZoom = e.deltaY < 0 ? zoomLevel + zoomIntensity : zoomLevel - zoomIntensity;
    setZoomLevel(Math.min(Math.max(newZoom, 0.5), 3)); // Clamp between 0.5 and 3
  };

  // Function to render the preview content based on file type
  const renderPreviewContent = (attachment) => {
    const { file_type: fileType } = attachment;

    if (fileType.includes('image')) {
      // Render zoomable image
      return (
        <div className="w-full h-full relative overflow-hidden">
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <button
              onClick={handleZoomOut}
              className="p-2 bg-gray-700 text-white rounded hover:bg-gray-600"
              aria-label="Zoom out"
            >
              <span className="material-symbols-outlined">zoom_out</span>
            </button>
            <button
              onClick={handleResetZoom}
              className="p-2 bg-gray-700 text-white rounded hover:bg-gray-600"
              aria-label="Reset zoom"
            >
              <span className="text-sm">{Math.round(zoomLevel * 100)}%</span>
            </button>
            <button
              onClick={handleZoomIn}
              className="p-2 bg-gray-700 text-white rounded hover:bg-gray-600"
              aria-label="Zoom in"
            >
              <span className="material-symbols-outlined">zoom_in</span>
            </button>
          </div>

          <div
            className="w-full h-full flex items-center justify-center cursor-move"
            onMouseDown={handleDragStart}
            onMouseUp={handleDragEnd}
          >
            <img
              src={attachment.previewUrl}
              alt={attachment.filename}
              className="max-w-none"
              style={{
                transform: `scale(${zoomLevel}) translate(${position.x}px, ${position.y}px)`,
                transition: isDragging ? 'none' : 'transform 0.1s ease',
                cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                maxWidth: '100%',
                maxHeight: '100%'
              }}
              onError={(e) => {
                console.error('Error loading image preview');
                e.target.src = '/placeholder-image.png'; // fallback image
              }}
            />
          </div>
        </div>
      );
    } else if (fileType.includes('pdf')) {
      // Render PDF using object tag
      return (
        <div className="w-full h-full">
          <object
            data={attachment.previewUrl}
            type="application/pdf"
            className="w-full h-full"
            width="100%"
            height="100%"
          >
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <p className="text-lg font-medium text-gray-800 dark:text-white mb-2">Unable to display PDF</p>
              <p className="text-gray-600 dark:text-gray-300 mb-4">This PDF cannot be displayed in your browser.</p>
              <a
                href={attachment.previewUrl}
                download={attachment.filename}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
              >
                Download PDF
              </a>
            </div>
          </object>
        </div>
      );
    } else if (fileType.includes('text/plain') || attachment.filename.toLowerCase().endsWith('.txt')) {
      // For text files, render content using iframe to prevent XSS
      return (
        <div className="w-full h-full bg-white dark:bg-gray-900 p-4 overflow-auto">
          <iframe
            src={attachment.previewUrl}
            className="w-full h-full border-0 text-gray-800 dark:text-gray-200"
            title="Text file preview"
            onLoad={(e) => {
              // Style the text content inside iframe
              try {
                const iframeDoc = e.target.contentDocument || e.target.contentWindow.document;
                if (iframeDoc) {
                  iframeDoc.body.style.fontFamily = 'monospace, sans-serif';
                  iframeDoc.body.style.fontSize = '14px';
                  iframeDoc.body.style.whiteSpace = 'pre-wrap';
                  iframeDoc.body.style.wordWrap = 'break-word';
                }
              } catch (err) {
                // If there's an error accessing iframe content (due to security policies),
                // the text might be in a different format, so use a fallback
              }
            }}
          />
        </div>
      );
    } else if (fileType.includes('audio/')) {
      // For audio files, render audio player
      return (
        <div className="w-full h-full flex flex-col">
          <div className="flex-1 flex items-center justify-center p-4">
            <audio
              src={attachment.previewUrl}
              controls
              className="w-full max-w-2xl h-16"
              onLoadedMetadata={(e) => {
                e.target.style.display = 'block';
              }}
            >
              Your browser does not support the audio element.
            </audio>
          </div>
        </div>
      );
    } else if (fileType.includes('video/')) {
      // For video files, render video player
      return (
        <div className="w-full h-full flex flex-col">
          <div className="flex-1 flex items-center justify-center p-4">
            <video
              src={attachment.previewUrl}
              controls
              className="max-h-full max-w-full"
              onError={(e) => {
                console.error('Error loading video preview');
                // Fallback to providing download option
                e.target.style.display = 'none';
                const fallbackDiv = document.createElement('div');
                fallbackDiv.className = 'flex flex-col items-center justify-center h-full p-8 text-center';
                fallbackDiv.innerHTML = `
                  <span class="material-symbols-outlined text-6xl text-gray-400 mb-4">movie</span>
                  <p class="text-lg font-medium text-gray-800 dark:text-white mb-2">Unable to play video</p>
                  <p class="text-gray-600 dark:text-gray-300 mb-4">This video cannot be played in your browser.</p>
                `;
                e.target.parentNode.appendChild(fallbackDiv);
              }}
            >
              Your browser does not support the video element.
            </video>
          </div>
        </div>
      );
    } else {
      // For other file types, provide download button
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <span className="material-symbols-outlined text-6xl text-gray-400 mb-4">
            {getFileIcon(fileType)}
          </span>
          <p className="text-lg font-medium text-gray-800 dark:text-white mb-2">Preview not available</p>
          <p className="text-gray-600 dark:text-gray-300 mb-4">This file type cannot be previewed directly in the browser.</p>
          <button
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
            onClick={async () => {
              try {
                // Download the attachment to create a preview
                const blob = await attachmentService.downloadAttachment(attachment.id);

                // Create a temporary URL for the file for preview
                const url = window.URL.createObjectURL(blob);

                // Create a temporary link to trigger download
                const link = document.createElement('a');
                link.href = url;
                link.download = attachment.filename; // Use the original filename
                document.body.appendChild(link);
                link.click();

                // Clean up
                document.body.removeChild(link);

                // Clean up the URL after a delay
                setTimeout(() => {
                  window.URL.revokeObjectURL(url);
                }, 1000);
              } catch (error) {
                console.error('Error downloading attachment:', error);
                alert('Failed to download attachment: ' + (error.message || 'Unknown error'));
              }
            }}
          >
            <span className="material-symbols-outlined mr-1">download</span>
            Download File
          </button>
        </div>
      );
    }
  };



  // Truncate helper used in a few places
  const truncateText = (t, len = 50) => (!t ? 'N/A' : t.length > len ? `${t.slice(0, len)}...` : t);

  // Render
  return (
    <div className="layout-content-container flex flex-col w-full gap-8">
      <div className="flex justify-between items-center">
        <h1 className="text-[#111418] dark:text-white text-3xl font-bold leading-tight tracking-[-0.015em]">Tasks</h1>
        <Button onClick={openNewTaskModal} className="flex items-center gap-2 h-[34px]">
          <span className="material-symbols-outlined">add</span>
          Add Task
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative w-full min-[768px]:w-auto">
            <Input
              id="search-tasks"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="pl-10 pr-10 h-[34px] w-full min-[768px]:w-80"
            />
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 material-symbols-outlined text-sm">search</span>
            {searchTerm && searchTerm.length > 0 && (
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 focus:outline-none"
                onClick={() => {
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                aria-label="Clear search"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full min-[768px]:w-auto min-[768px]:flex-nowrap">
            <div className="relative flex-shrink-0"
                 onMouseEnter={() => setIsSearchOptionsHovered(true)}
                 onMouseLeave={() => setIsSearchOptionsHovered(false)}>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 h-[34px] whitespace-nowrap"
                onClick={() => setShowSearchOptionsDropdown(s => !s)}
                onMouseEnter={() => setIsSearchOptionsHovered(true)}
              >
                <span className="material-symbols-outlined text-sm">tune</span>
                <span className="text-sm max-[1231px]:hidden">View</span>
              </Button>
              {showSearchOptionsDropdown && (
                <div
                  ref={searchOptionsDropdownRef}
                  onMouseEnter={() => setIsSearchOptionsHovered(true)}
                  onMouseLeave={() => setIsSearchOptionsHovered(false)}
                >
                  <SearchOptionsDropdown
                    filters={filters}
                    onChange={handleFilterChange}
                  />
                </div>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="text-xs h-[34px] text-gray-500 dark:text-gray-400 whitespace-nowrap flex-shrink-0"
              onClick={() => {
                const today = getTodayDate();
                handleFilterChange('date_from', today);
                handleFilterChange('date_to', today);
              }}
              title="Today"
            >
              <span className="material-symbols-outlined text-sm">today</span>
              <span className="text-sm max-[1231px]:hidden">Today</span>
            </Button>

            <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 overflow-hidden flex-shrink-0">
              <input
                type="date"
                value={filters.date_from}
                onChange={(e) => handleFilterChange('date_from', e.target.value)}
                max={getTodayDate()}
                className="w-32 max-[957px]:w-10 rounded-l-lg border-0 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:text-white text-sm font-medium px-4 py-1.5 [color-scheme:light] dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:text-white dark:[&::-webkit-calendar-picker-indicator]:text-white max-[957px]:text-transparent max-[957px]:px-1"
              />
              <span className="px-2 text-gray-500 dark:text-gray-400 max-[1231px]:hidden">-</span>
              <input
                type="date"
                value={filters.date_to}
                onChange={(e) => handleFilterChange('date_to', e.target.value)}
                max={getTodayDate()}
                className="w-32 max-[957px]:w-10 rounded-r-lg border-0 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:text-white text-sm font-medium px-4 py-1.5 [color-scheme:light] dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:text-white dark:[&::-webkit-calendar-picker-indicator]:text-white max-[957px]:text-transparent max-[957px]:px-1"
              />
            </div>

            <div className="relative flex-shrink-0"
                 onMouseEnter={() => setIsFilterHovered(true)}
                 onMouseLeave={() => setIsFilterHovered(false)}>
              <Button
                variant="outline"
                size="md"
                className="flex items-center gap-1 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 h-[34px] whitespace-nowrap"
                onClick={() => setShowFilterDropdown(s => !s)}
                onMouseEnter={() => setIsFilterHovered(true)}
              >
                <span className="material-symbols-outlined text-sm">filter_list</span>
                <span className="text-sm max-[1231px]:hidden">Filter</span>
              </Button>
              {showFilterDropdown && (
                <div
                  ref={filterDropdownRef}
                  onMouseEnter={() => setIsFilterHovered(true)}
                  onMouseLeave={() => setIsFilterHovered(false)}
                >
                  <FilterDropdown
                    filters={filters}
                    categories={categories}
                    taskTypes={taskTypes}
                    subTypes={subTypes}
                    loadingDropdowns={loadingDropdowns}
                    onChange={handleFilterChange}
                    onClear={clearFilters}
                  />
                </div>
              )}
            </div>

            <div className="relative flex-shrink-0"
                 onMouseEnter={() => setIsSortHovered(true)}
                 onMouseLeave={() => setIsSortHovered(false)}>
              <Button
                variant="outline"
                size="md"
                className="flex items-center gap-1 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 h-[34px] whitespace-nowrap"
                onClick={() => setShowSortDropdown(s => !s)}
                onMouseEnter={() => setIsSortHovered(true)}
              >
                <span className="material-symbols-outlined text-sm">sort</span>
                <span className="text-sm max-[1231px]:hidden">Sort</span>
              </Button>
              {showSortDropdown && (
                <div
                  ref={sortDropdownRef}
                  onMouseEnter={() => setIsSortHovered(true)}
                  onMouseLeave={() => setIsSortHovered(false)}
                >
                  <SortDropdown columns={columns} onSort={handleSort} />
                </div>
              )}
            </div>

            <Button
              variant="primary"
              size="md"
              className="bg-red-500 hover:bg-red-600 h-[34px] whitespace-nowrap flex-shrink-0"
              onClick={() => {
                if (selectedTasks.length > 0) {
                  setActionType('delete');
                  setIsModalOpen(true);
                }
              }}
              disabled={selectedTasks.length === 0}
              title="Delete"
            >
              <span className="material-symbols-outlined text-sm">delete</span>
              <span className="text-sm font-medium max-[1231px]:hidden">
                Delete{selectedTasks.length > 0 ? ` (${selectedTasks.length})` : ''}
              </span>
            </Button>

            <Button
              variant="primary"
              size="md"
              className="bg-gray-500 hover:bg-gray-600 h-[34px] whitespace-nowrap flex-shrink-0"
              onClick={() => {
                if (selectedTasks.length > 0) {
                  setActionType('archive');
                  setIsModalOpen(true);
                }
              }}
              disabled={selectedTasks.length === 0 || selectedTasks.every(taskId => {
                const task = tasks.find(t => t.id === taskId);
                return task && task.status === 'Archived';
              })}
              title="Archive"
            >
              <span className="material-symbols-outlined text-sm">archive</span>
              <span className="text-sm font-medium max-[1231px]:hidden">
                Archive{selectedTasks.length > 0 ?
                  ` (${selectedTasks.filter(taskId => {
                    const task = tasks.find(t => t.id === taskId);
                    return task && task.status !== 'Archived';
                  }).length})`.replace(' (0)', '') : ''}
              </span>
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingTableSkeleton columns={columns} tableDimensions={tableDimensions} />
      ) : (
        <>
          <DataTable
            ref={tableRef}
            columns={columns}
            data={tasks}
            showSelectAll
            onSelectAll={handleSelectAll}
            onRowSelect={handleTaskSelect}
            selectedRows={selectedTasks}
          />

          {totalTasks > 0 && (
            <div className="flex justify-between items-center p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 text-sm text-[#617589] dark:text-gray-400">
                <span>Rows per page:</span>
                <select
                  className="form-select rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-primary focus:border-primary text-sm"
                  value={tasksPerPage}
                  onChange={(e) => { setTasksPerPage(parseInt(e.target.value)); setCurrentPage(1); }}
                >
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>

                <span className="ml-4">Showing {Math.min((currentPage - 1) * tasksPerPage + 1, totalTasks)} to {Math.min(currentPage * tasksPerPage, totalTasks)} of {totalTasks} results</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-[#617589] dark:text-gray-400">Page {currentPage} of {totalPages}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setTaskToDelete(null); }}
        title="Confirm Action"
      >
        <div className="py-4">
          {taskToDelete ? (
            <p className="text-gray-700 dark:text-gray-300">
              Are you sure you want to {actionType} this task? This action cannot be undone.
            </p>
          ) : (
            <p className="text-gray-700 dark:text-gray-300">
              {actionType === 'archive' ? (
                selectedTasks.filter(taskId => {
                  const task = tasks.find(t => t.id === taskId);
                  return task && task.status !== 'Archived';
                }).length > 0 ? (
                  <span>Are you sure you want to {actionType} <span className="font-bold">
                    {selectedTasks.filter(taskId => {
                      const task = tasks.find(t => t.id === taskId);
                      return task && task.status !== 'Archived';
                    }).length}
                  </span> task(s)? This action cannot be undone.</span>
                ) : (
                  <span>Are you sure you want to {actionType} this task? This action cannot be undone.</span>
                )
              ) : (
                <span>Are you sure you want to {actionType} <span className="font-bold">{selectedTasks.length}</span> task(s)? This action cannot be undone.</span>
              )}
            </p>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={() => { setIsModalOpen(false); setTaskToDelete(null); }}>Cancel</Button>
            <Button className={actionType === 'archive' ? 'bg-gray-500 hover:bg-gray-600' : 'bg-red-500 hover:bg-red-600'} 
                    onClick={handleConfirmAction}>
              {taskToDelete ? 
                `${actionType.charAt(0).toUpperCase() + actionType.slice(1)} Task` : 
                `${actionType.charAt(0).toUpperCase() + actionType.slice(1)} Selected (${
                  actionType === 'archive'
                    ? selectedTasks.filter(taskId => {
                        const task = tasks.find(t => t.id === taskId);
                        return task && task.status !== 'Archived';
                      }).length
                    : selectedTasks.length
                })`.replace(' (0)', '')
              }
            </Button>
          </div>
        </div>
      </Modal>

      {/* Alert Modal */}
      <Modal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ isOpen: false, title: '', message: '', type: 'info' })}
        title={alertModal.title}
      >
        <div className="py-4">
          <p className={
            alertModal.type === 'error' ? "text-red-600 dark:text-red-400" :
            "text-gray-700 dark:text-gray-300"
          }>
            {alertModal.message}
          </p>

          <div className="mt-6 flex justify-end">
            <Button
              variant="primary"
              onClick={() => setAlertModal({ isOpen: false, title: '', message: '', type: 'info' })}
            >
              OK
            </Button>
          </div>
        </div>
      </Modal>

      {/* Attachment Preview using React Portal */}
      {previewAttachment && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-[99999] flex flex-col">
          <div className="flex justify-between items-center p-4 bg-gray-900 text-white">
            <p className="truncate max-w-xs">{previewAttachment.filename}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  try {
                    // Download the attachment to create a preview
                    const blob = await attachmentService.downloadAttachment(previewAttachment.id);

                    // Create a temporary URL for the file for preview
                    const url = window.URL.createObjectURL(blob);

                    // Create a temporary link to trigger download
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = previewAttachment.filename; // Use the original filename
                    document.body.appendChild(link);
                    link.click();

                    // Clean up
                    document.body.removeChild(link);

                    // Clean up the URL after a delay
                    setTimeout(() => {
                      window.URL.revokeObjectURL(url);
                    }, 1000);
                  } catch (error) {
                    console.error('Error downloading attachment:', error);
                    alert('Failed to download attachment: ' + (error.message || 'Unknown error'));
                  }
                }}
                className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 text-white"
                aria-label="Save"
              >
                <span className="material-symbols-outlined">download</span>
              </button>
              {!previewAttachment.file_type.includes('pdf') &&
               (previewAttachment.file_type.includes('image') ||
                previewAttachment.file_type.includes('text/plain') ||
                previewAttachment.filename.toLowerCase().endsWith('.txt')) && (
                <button
                  onClick={() => {
                    if (previewAttachment.file_type.includes('image')) {
                      // Create a new window with the image for proper printing
                      const printWindow = window.open('', '_blank');
                      printWindow.document.write(`
                        <!DOCTYPE html>
                        <html>
                          <head>
                            <title>Print Image</title>
                            <style>
                              body {
                                margin: 0;
                                padding: 20px;
                                display: flex;
                                justify-content: center;
                                align-items: center;
                                min-height: 100vh;
                                background: white;
                              }
                              img {
                                max-width: 100%;
                                max-height: 100vh;
                                object-fit: contain;
                              }
                            </style>
                          </head>
                          <body>
                            <img src="${previewAttachment.previewUrl}" alt="Print Preview" />
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                      printWindow.focus();
                      printWindow.print();
                    } else if (previewAttachment.file_type.includes('text/plain') ||
                               previewAttachment.filename.toLowerCase().endsWith('.txt')) {
                      // Create a new window with the text for proper printing
                      const printWindow = window.open('', '_blank');
                      printWindow.document.write(`
                        <!DOCTYPE html>
                        <html>
                          <head>
                            <title>Print Text</title>
                            <style>
                              body {
                                margin: 20px;
                                font-family: monospace;
                                font-size: 14px;
                                white-space: pre-wrap;
                                word-wrap: break-word;
                                background: white;
                                color: black;
                              }
                            </style>
                          </head>
                          <body>
                            <pre style="margin: 0;">${previewAttachment.previewUrl}</pre>
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                      printWindow.focus();
                      printWindow.print();
                    } else {
                      // For other non-PDF files, we can't really print effectively
                      alert('Printing is only available for image and text files');
                    }
                  }}
                  className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 text-white"
                  aria-label="Print"
                >
                  <span className="material-symbols-outlined">print</span>
                </button>
              )}
              <button
                onClick={() => {
                  // Revoke the preview URL to free memory
                  if (previewAttachment && previewAttachment.previewUrl) {
                    window.URL.revokeObjectURL(previewAttachment.previewUrl);
                  }
                  setPreviewAttachment(null);
                }}
                className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 text-white"
                aria-label="Close preview"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto bg-gray-800 text-white">
            {renderPreviewContent(previewAttachment)}
          </div>
        </div>
      )}
    </div>
  );
};

export default Option2Tasks;
