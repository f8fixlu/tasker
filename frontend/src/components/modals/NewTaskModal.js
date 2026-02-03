import React, { useState, useEffect, useRef } from 'react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Select from '../common/Select';
import Button from '../common/Button';
import NewCategoryModal from './NewCategoryModal';
import NewTaskTypeModal from './NewTaskTypeModal';
import NewSubTypeModal from './NewSubTypeModal';
import WarningModal from './WarningModal';
import { categoryService } from '../../services/categoryService';
import { taskTypeService } from '../../services/taskTypeService';
import { subTypeService } from '../../services/subTypeService';
import { attachmentService } from '../../services/attachmentService';
import { taskService } from '../../services/taskService';
import { useTaskUpdate } from '../../context/TaskUpdateContext';

const NewTaskModal = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    title: '',
    dueDate: '', // Will be set by useEffect when modal opens
    taskDate: '', // Will be set by useEffect when modal opens
    category: '',
    type: '',
    subType: '',
    priority: 'medium', // Default to medium
    quantity: '1',  // Initialize as string
    description: ''
  });


  const [attachments, setAttachments] = useState([]);
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [showNewTaskTypeModal, setShowNewTaskTypeModal] = useState(false);
  const [showNewSubTypeModal, setShowNewSubTypeModal] = useState(false);
  const [hasUserModifiedTitle, setHasUserModifiedTitle] = useState(false);
  const [hasUserModifiedDescription, setHasUserModifiedDescription] = useState(false);
  const descriptionModifiedRef = useRef(false);
  const [savingDescription, setSavingDescription] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [originalDescription, setOriginalDescription] = useState('');
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');

  const [categories, setCategories] = useState([]);
  const [allTypes, setAllTypes] = useState([]); // All types for reference
  const [filteredTypes, setFilteredTypes] = useState([]); // Types filtered by selected category
  const [allSubTypes, setAllSubTypes] = useState([]); // All subtypes for reference
  const [filteredSubTypes, setFilteredSubTypes] = useState([]); // Subtypes filtered by selected type
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get the dropdown refresh trigger from the context
  const { triggerTaskUpdate, triggerDropdownUpdate } = useTaskUpdate();

  // Initialize dates when modal opens
  useEffect(() => {
    if (isOpen) {
      // Set initial dates to current time + 8 hours
      const initialDate = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 16);

      setFormData(prev => ({
        ...prev,
        taskDate: initialDate,
        dueDate: initialDate
      }));

      loadOptions();
      // Reset the user modification flag when modal opens
      setHasUserModifiedTitle(false);
    }
  }, [isOpen]);

  // State to track if user has manually changed the dates
  const [userChangedTaskDate, setUserChangedTaskDate] = useState(false);
  const [userChangedDueDate, setUserChangedDueDate] = useState(false);

  // Update dates every minute while modal is open (only if user hasn't changed them)
  useEffect(() => {
    let interval = null;

    if (isOpen) {
      interval = setInterval(() => {
        // Only update if the user hasn't manually changed the dates
        setFormData(prev => {
          const currentTimeFormatted = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 16);

          // Update only if user hasn't changed the respective date
          const updatedData = { ...prev };

          if (!userChangedTaskDate) {
            updatedData.taskDate = currentTimeFormatted;
          }

          if (!userChangedDueDate) {
            updatedData.dueDate = currentTimeFormatted;
          }

          return updatedData;
        });
      }, 60000); // Update every minute
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOpen, userChangedTaskDate, userChangedDueDate]);

  // Handle date changes to track if user has modified them
  const handleDateChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Track if user has changed the dates
    if (name === 'taskDate') {
      setUserChangedTaskDate(true);
    } else if (name === 'dueDate') {
      setUserChangedDueDate(true);
    }
  };


  // Effect to reset attachments, user title modification flag and form data when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Clear any pending timeouts when modal closes
      if (window.descriptionCheckTimeout) {
        clearTimeout(window.descriptionCheckTimeout);
      }

      setAttachments([]);
      setHasUserModifiedTitle(false); // Reset the flag when modal closes
      setUserChangedTaskDate(false); // Reset date change tracking when modal closes
      setUserChangedDueDate(false); // Reset date change tracking when modal closes
      // Reset form data to default values when modal closes
      setFormData({
        title: '',
        dueDate: '', // Will be set when modal opens again
        taskDate: '', // Will be set when modal opens again
        category: '',
        type: '',
        subType: '',
        priority: 'medium', // Default to medium
        quantity: '1',  // Initialize as string
        description: ''
      });
      setSavingDescription(false);
      setOriginalDescription('');
      setShowWarningModal(false); // Reset warning modal when main modal closes
      setWarningMessage(''); // Clear warning message
    }
  }, [isOpen]); // Run when isOpen changes

  // Effect to load the description when subType changes
  useEffect(() => {
    if (formData.subType && isOpen) {
      const fetchSubTypeDescription = async () => {
        try {
          const subTypeData = allSubTypes.find(subType => subType.id.toString() === formData.subType);
          if (subTypeData && subTypeData.description) {
            // Check if the current description in the form matches the sub type's description
            // If they match, it means the user hasn't modified it, so we can update it
            // If they don't match, it means the user has modified it, so we preserve the modification
            const currentDescriptionMatchesSubType = formData.description === subTypeData.description ||
                                                     formData.description === (subTypeData.description + ' - Batch 1') ||
                                                     formData.description === originalDescription;

            if (currentDescriptionMatchesSubType || !hasUserModifiedDescription) {
              let updatedDescription = subTypeData.description;
              // Only apply batch number if the description doesn't already have one
              if (!/ - Batch \d+$/.test(subTypeData.description.trim())) {
                updatedDescription = await checkAndAppendBatchNumber(subTypeData.description);
              }

              setFormData(prev => ({
                ...prev,
                description: updatedDescription
              }));
              setOriginalDescription(updatedDescription);
              // Reset the user modification flag since we're setting the description based on sub type
              setHasUserModifiedDescription(false);
              descriptionModifiedRef.current = false;
            }
            // If the user HAS modified the description and it doesn't match the sub type's description,
            // we don't update it when subType changes to preserve manual edits including batch numbers
          } else {
            // Set default description to "- Batch 1" when sub type description is empty
            // But only if the user hasn't modified the description
            const currentDescriptionMatchesDefault = !hasUserModifiedDescription ||
                                                   formData.description === '- Batch 1' ||
                                                   formData.description === originalDescription;

            if (currentDescriptionMatchesDefault) {
              setFormData(prev => ({
                ...prev,
                description: '- Batch 1'
              }));
              setOriginalDescription('- Batch 1');
              // Reset the user modification flag since we're setting the description automatically
              setHasUserModifiedDescription(false);
              descriptionModifiedRef.current = false;
            }
          }
        } catch (error) {
          console.error('Error fetching sub type description:', error);
        }
      };

      fetchSubTypeDescription();
    } else if (isOpen) {
      // Reset description when no subType is selected
      // Only if the user hasn't modified the description
      if (!hasUserModifiedDescription) {
        setFormData(prev => ({
          ...prev,
          description: ''
        }));
        setOriginalDescription('');
        // Reset the user modification flag when subType is deselected
        setHasUserModifiedDescription(false);
        descriptionModifiedRef.current = false;
      }
    }
  }, [formData.subType, isOpen, allSubTypes, hasUserModifiedDescription, formData.description, originalDescription]);

  // Effect to automatically format the task title when type, subType, or quantity changes
  useEffect(() => {
    if (!isOpen) return; // Only run when modal is open

    // Only auto-populate if user hasn't manually modified the title, or if title is empty
    if (hasUserModifiedTitle && formData.title) return;

    const updateTitle = async () => {
      let newTitle = '';
      
      // Get the task type name
      let taskTypeName = '';
      if (formData.type) {
        const selectedType = allTypes.find(type => type.id.toString() === formData.type);
        if (selectedType) {
          taskTypeName = selectedType.name;
        }
      }
      
      // Get the sub type name
      let subTypeName = '';
      if (formData.subType) {
        const selectedSubType = allSubTypes.find(subType => subType.id.toString() === formData.subType);
        if (selectedSubType) {
          subTypeName = selectedSubType.name;
        }
      }
      
      // Format the title as "Task Type + Quantity + Sub Type"
      if (taskTypeName && formData.quantity && subTypeName) {
        newTitle = `${taskTypeName} ${formData.quantity} ${subTypeName}`;
      } else if (taskTypeName && formData.quantity && !subTypeName) {
        newTitle = `${taskTypeName} ${formData.quantity}`;
      } else if (taskTypeName && !formData.quantity && subTypeName) {
        newTitle = `${taskTypeName} ${subTypeName}`;
      } else if (taskTypeName) {
        newTitle = taskTypeName;
      }
      
      setFormData(prev => ({
        ...prev,
        title: newTitle
      }));
    };
    
    updateTitle();
  }, [formData.type, formData.subType, formData.quantity, allTypes, allSubTypes, isOpen, hasUserModifiedTitle, formData.title]);

  // Load initial options
  const loadOptions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch categories, types, and sub types from the API
      const [categoriesRes, typesRes, subTypesRes] = await Promise.allSettled([
        categoryService.getAllCategories(),
        taskTypeService.getAllTaskTypes(),
        subTypeService.getAllSubTypes()
      ]);

      if (categoriesRes.status === 'fulfilled') {
        // Handle different possible response formats for categories
        let categoriesData = [];
        const response = categoriesRes.value;
        if (response && response.categories) {
          categoriesData = response.categories; // new format
        } else if (response && response.data) {
          categoriesData = response.data; // alternative format
        } else if (Array.isArray(response)) {
          categoriesData = response; // direct array response
        }
        setCategories(categoriesData || []);
      } else {
        console.error('Error fetching categories:', categoriesRes.reason);
        setCategories([]);
      }

      if (typesRes.status === 'fulfilled') {
        // Handle different possible response formats for task types
        let typesData = [];
        const response = typesRes.value;
        if (response && response.types) {
          typesData = response.types; // new format
        } else if (response && response.data) {
          typesData = response.data; // alternative format
        } else if (Array.isArray(response)) {
          typesData = response; // direct array response
        }
        setAllTypes(typesData || []);
        setFilteredTypes(typesData || []); // Initially show all types as filtered types too
      } else {
        console.error('Error fetching task types:', typesRes.reason);
        setAllTypes([]);
        setFilteredTypes([]);
      }

      if (subTypesRes.status === 'fulfilled') {
        // Handle different possible response formats for sub types
        let subTypesData = [];
        const response = subTypesRes.value;
        if (response && response.subTypes) {
          subTypesData = response.subTypes; // new format
        } else if (response && response.subtypes) {
          subTypesData = response.subtypes; // old format
        } else if (response && response.data) {
          subTypesData = response.data; // alternative format
        } else if (Array.isArray(response)) {
          subTypesData = response; // direct array response
        }
        setAllSubTypes(subTypesData || []);
        setFilteredSubTypes(subTypesData || []); // Show all subtypes by default
      } else {
        console.error('Error fetching sub types:', subTypesRes.reason);
        setAllSubTypes([]);
        setFilteredSubTypes([]);
      }
    } catch (err) {
      setError(err.message);
      console.error('Error loading options:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load task types filtered by selected category
  const loadFilteredTypes = async (categoryId) => {
    try {
      const typesRes = await taskTypeService.getAllTaskTypes({ category_id: categoryId });
      
      // Handle different possible response formats
      let typesData = [];
      if (typesRes && typesRes.types) {
        typesData = typesRes.types; // new format
      } else if (typesRes && typesRes.data) {
        typesData = typesRes.data; // alternative format
      } else if (Array.isArray(typesRes)) {
        typesData = typesRes; // direct array response
      }
      
      setFilteredTypes(typesData || []);
    } catch (err) {
      console.error('Error loading filtered task types:', err);
      setFilteredTypes([]);
    }
  };

  // Load sub types filtered by selected type
  const loadFilteredSubTypes = async (typeId) => {
    try {
      const subTypesRes = await subTypeService.getAllSubTypes({ type_id: typeId });

      // Handle different possible response formats
      let subTypesData = [];
      if (subTypesRes && subTypesRes.subTypes) {
        subTypesData = subTypesRes.subTypes; // new format
      } else if (subTypesRes && subTypesRes.subtypes) {
        subTypesData = subTypesRes.subtypes; // old format
      } else if (subTypesRes && subTypesRes.data) {
        subTypesData = subTypesRes.data; // alternative format
      } else if (Array.isArray(subTypesRes)) {
        subTypesData = subTypesRes; // direct array response
      }

      setFilteredSubTypes(subTypesData || []);
    } catch (err) {
      console.error('Error loading filtered sub types:', err);
      setFilteredSubTypes([]);
    }
  };

  const priorities = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' }
  ];

  // Function to check if the sub type is the first entry based on date and task type, and append "Batch 1" if needed
  const checkAndAppendBatchNumber = async (description) => {
    try {
      // Get all tasks to check for duplicate sub types based on task type and date
      const allTasks = await taskService.getAllTasks();

      // Get the current form data to compare with existing tasks
      const currentType = formData.type;
      const currentSubType = formData.subType;
      const currentDate = formData.taskDate ? new Date(formData.taskDate).toDateString() : null;

      // Convert allTasks to an array if it's in different formats
      const tasksArray = (allTasks.tasks || allTasks.data || allTasks);

      // Count how many tasks exist with the same type, subType, and date
      // Note: We're checking only type, subType and date, not category as per requirements
      const sameSubTypeCount = tasksArray.filter(task => {
        // Compare type, subType, and date
        const taskDate = task.task_date || task.taskDate;
        const taskDateString = taskDate ? new Date(taskDate).toDateString() : null;

        return (
          task.type_id?.toString() === currentType &&
          task.sub_type_id?.toString() === currentSubType &&
          taskDateString === currentDate
        );
      }).length;

      // Determine if this is the first occurrence of this sub type for this date and task type
      if (sameSubTypeCount === 0) {
        // This is the first entry for this sub type on this date and task type
        // Add "- Batch 1" to the description if it's not already there
        if (!description.trim().endsWith('- Batch 1')) {
          return `${description.trim()} - Batch 1`;
        }
        return description.trim();
      } else {
        // This is not the first occurrence, so determine the appropriate batch number
        const batchNumber = sameSubTypeCount + 1; // +1 because the current task will be the next occurrence

        // Check if the description already ends with a batch number
        if (/ - Batch \d+$/.test(description.trim())) {
          // If it already has a batch number, return as is (user may have modified it)
          return description.trim();
        }

        // Otherwise, append the appropriate batch number
        return `${description.trim()} - Batch ${batchNumber}`;
      }
    } catch (error) {
      console.error('Error checking for duplicate sub types:', error);
      // If there's an error, return the original description
      return description;
    }
  };

  const handleChange = async (e) => {
    const { name, value, type } = e.target;

    // For number inputs, ensure the value remains a string to satisfy Input component's PropTypes
    const processedValue = type === 'number' ? String(value) : value;

    // Handle date changes separately to track user modifications
    if (name === 'taskDate' || name === 'dueDate') {
      handleDateChange(name, processedValue);
      return;
    }

    // Track if user manually changes the title
    if (name === 'title') {
      setFormData(prev => ({
        ...prev,
        [name]: processedValue
      }));
      setHasUserModifiedTitle(true);
      return;
    }

    // Special handling for description field to check for duplicates
    if (name === 'description') {
      // Track if user manually changes the description
      setFormData(prev => ({
        ...prev,
        [name]: processedValue
      }));

      // Mark that the user has modified the description
      setHasUserModifiedDescription(true);
      descriptionModifiedRef.current = true;

      // Don't apply batch number check if the user has manually modified the description
      // This means if the user removes the batch number, we won't add it back
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));

    // Handle cascading dropdowns
    if (name === 'category') {
      // When category changes, reset type and subType selections
      setFormData(prev => ({
        ...prev,
        type: '',
        subType: ''
      }));
      // Load task types for the selected category
      if (processedValue) {
        loadFilteredTypes(processedValue);
        setFilteredSubTypes([]); // Clear sub types since type has changed
      } else {
        setFilteredTypes([]);
        setFilteredSubTypes(allSubTypes); // Show all sub types when no category is selected
      }
    } else if (name === 'type') {
      // When type changes, reset subType selection
      setFormData(prev => ({
        ...prev,
        subType: ''
      }));
      // Load sub types for the selected type
      if (processedValue) {
        loadFilteredSubTypes(processedValue);
      } else {
        setFilteredSubTypes(allSubTypes); // Show all sub types when no type is selected
      }
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const newAttachments = files.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: file.size,
      type: file.type,
      file: file  // Store the actual file object for upload
    }));
    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const removeAttachment = (id) => {
    setAttachments(prev => prev.filter(attachment => attachment.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Reset validation errors
    setValidationErrors({});

    // Set saving state to true
    setSavingTask(true);

    // Validation
    const errors = {};
    if (!formData.title || formData.title.trim() === '') {
      errors.title = 'Title is required';
    }

    if (!formData.taskDate) {
      errors.taskDate = 'Task date is required';
    }

    if (!formData.dueDate) {
      errors.dueDate = 'Due date is required';
    }

    if (!formData.category) {
      errors.category = 'Category is required';
    }

    if (!formData.type) {
      errors.type = 'Task type is required';
    }

    if (!formData.subType) {
      errors.subType = 'Sub type is required';
    }

    if (!formData.quantity || parseInt(formData.quantity) <= 0) {
      errors.quantity = 'Quantity must be a positive number';
    }

    if (!formData.description || formData.description.trim() === '') {
      errors.description = 'Description is required';
    }

    // Client-side validation to ensure due date is not before task date
    if (formData.taskDate && formData.dueDate) {
      const taskDateObj = new Date(formData.taskDate);
      const dueDateObj = new Date(formData.dueDate);

      if (dueDateObj < taskDateObj) {
        errors.dueDate = 'Due date cannot be before task date';
      }
    }

    // If there are validation errors, set them and return
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setSavingTask(false); // Reset saving state
      return;
    }

    try {
      // If the user has modified the description, don't apply batch number logic
      // Otherwise, check for duplicates and append batch number if needed
      let finalDescription = formData.description;
      if (!hasUserModifiedDescription) {
        // Check for duplicate description and append batch number if needed before submission
        // This handles cases where the user has not manually edited the description
        finalDescription = await checkAndAppendBatchNumber(formData.description);
      } else {
        // If the user has modified the description, preserve any existing batch number
        // Only remove batch number if it was automatically added and user wants to remove it
        // But if the user has edited the description and kept the batch number, preserve it
        finalDescription = formData.description;
      }

      // Transform form data to match backend expectations
      // Map frontend field names to backend field names
      const now = new Date();
      const taskData = {
        title: formData.title,
        description: finalDescription, // Apply batch number if needed before submission
        category_id: formData.category ? parseInt(formData.category) : null,  // Use actual category ID from database
        type_id: formData.type ? parseInt(formData.type) : null,              // Use actual type ID from database
        sub_type_id: formData.subType ? parseInt(formData.subType) : null,    // Use actual sub type ID from database
        quantity: parseInt(formData.quantity) || 1,
        priority: capitalizeFirstLetter(formData.priority),  // Capitalize priority for backend validation
        task_date: formData.taskDate ? new Date(formData.taskDate).toISOString() : null,  // Format date properly for backend
        due_date: formData.dueDate ? new Date(formData.dueDate).toISOString() : null,  // Format date properly for backend - preserves user's time selection
        attachments: attachments.filter(attachment => !attachment.file)  // Only include pre-uploaded attachments
      };

      // Call onSave callback if provided
      if (onSave) {
        const result = await onSave(taskData);

        // Extract task ID from the result - it could be in different formats
        let taskId = null;
        if (result && typeof result === 'object') {
          // Handle different possible response formats
          taskId = result.id ||
                   (result.task && result.task.id) ||
                   (result.data && result.data.id) ||
                   (result.task && result.task.Task && result.task.Task.id) ||
                   null;
        }

        // If we have a task ID and there are file attachments to upload, upload them after the task is created
        if (taskId && attachments.length > 0) {
          const uploadPromises = attachments
            .filter(attachment => attachment.file) // Only upload if it's a new file (not yet uploaded)
            .map(attachment =>
              attachmentService.uploadAttachment(attachment.file, taskId, null)
            );

          if (uploadPromises.length > 0) {
            try {
              await Promise.all(uploadPromises);
            } catch (uploadError) {
              console.error('Error uploading attachments:', uploadError);
              // We'll continue even if attachment upload fails, just log the error
            }
          }
        }

        // Trigger a refresh to update the task list with the new attachments
        // Wait a bit to ensure attachments are processed on the server before refreshing
        await new Promise(resolve => setTimeout(resolve, 500));
        triggerTaskUpdate();
      }

      // Reset form fields after successful submission
      setFormData({
        title: '',
        dueDate: '', // Will be set when modal opens again
        taskDate: '', // Will be set when modal opens again
        category: '',
        type: '',
        subType: '',
        priority: 'medium', // Default to medium
        quantity: 1,
        description: ''
      });
      setAttachments([]);
      setHasUserModifiedTitle(false); // Reset the flag for new task
      setUserChangedTaskDate(false); // Reset date change tracking after submission
      setUserChangedDueDate(false); // Reset date change tracking after submission
      setFilteredTypes(allTypes); // Reset filtered types
      setFilteredSubTypes(allSubTypes); // Reset filtered sub types

      // Close the modal after submission
      onClose();
    } catch (error) {
      console.error('Error submitting task:', error);
    } finally {
      // Reset saving state
      setSavingTask(false);
    }
  };

  // Helper function to capitalize first letter of priority
  const capitalizeFirstLetter = (string) => {
    if (!string) return string;
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
  };

  const handleAddCategory = () => {
    setShowNewCategoryModal(true);
  };

  const handleAddTaskType = () => {
    setShowNewTaskTypeModal(true);
  };

  const handleAddSubType = () => {
    setShowNewSubTypeModal(true);
  };

  const handleSaveCategory = async (newCategory) => {
    try {
      // Refresh all dropdown lists after adding a new one
      const [catRes, typeRes, subRes] = await Promise.allSettled([
        categoryService.getAllCategories(),
        taskTypeService.getAllTaskTypes(),
        subTypeService.getAllSubTypes()
      ]);

      // Update categories
      if (catRes.status === 'fulfilled') {
        setCategories(catRes.value.categories || catRes.value.data || []);
      } else {
        console.error('Error fetching categories:', catRes.reason);
      }

      // Update all task types
      if (typeRes.status === 'fulfilled') {
        let allTypesData = [];
        const response = typeRes.value;
        if (response && response.types) {
          allTypesData = response.types;
        } else if (response && response.data) {
          allTypesData = response.data;
        } else if (Array.isArray(response)) {
          allTypesData = response;
        }
        setAllTypes(allTypesData || []);
      } else {
        console.error('Error fetching task types:', typeRes.reason);
      }

      // Update all sub types
      if (subRes.status === 'fulfilled') {
        let allSubTypesData = [];
        const response = subRes.value;
        if (response && response.subTypes) {
          allSubTypesData = response.subTypes;
        } else if (response && response.subtypes) {
          allSubTypesData = response.subtypes;
        } else if (response && response.data) {
          allSubTypesData = response.data;
        } else if (Array.isArray(response)) {
          allSubTypesData = response;
        }
        setAllSubTypes(allSubTypesData || []);
      } else {
        console.error('Error fetching sub types:', subRes.reason);
      }

      // Update the form to use the new category if it was created with the same name
      if (newCategory && newCategory.id) {
        const newCategoryId = newCategory.id.toString();
        setFormData(prev => ({
          ...prev,
          category: newCategoryId,
          type: '',  // Reset type when category changes
          subType: ''  // Reset subType when category changes
        }));

        // Load task types for the selected category (cascading dropdown effect)
        if (newCategoryId) {
          await loadFilteredTypes(newCategoryId);
          setFilteredSubTypes([]); // Clear sub types since type has been reset
        } else {
          setFilteredTypes([]);
          setFilteredSubTypes(allSubTypes); // Show all sub types when no category is selected
        }
      }

      // Trigger dropdown refresh in parent components
      triggerDropdownUpdate();
    } catch (err) {
      console.error('Error refreshing categories:', err);
    }
    // Close the modal after saving
    setShowNewCategoryModal(false);
  };

  const handleSaveTaskType = async (newTaskType) => {
    try {
      // Refresh all dropdown lists after adding a new one
      const [catRes, typeRes, subRes] = await Promise.allSettled([
        categoryService.getAllCategories(),
        taskTypeService.getAllTaskTypes(),
        subTypeService.getAllSubTypes()
      ]);

      // Update categories
      if (catRes.status === 'fulfilled') {
        setCategories(catRes.value.categories || catRes.value.data || []);
      } else {
        console.error('Error fetching categories:', catRes.reason);
      }

      // Update all task types
      if (typeRes.status === 'fulfilled') {
        let allTypesData = [];
        const response = typeRes.value;
        if (response && response.types) {
          allTypesData = response.types;
        } else if (response && response.data) {
          allTypesData = response.data;
        } else if (Array.isArray(response)) {
          allTypesData = response;
        }
        setAllTypes(allTypesData || []);
      } else {
        console.error('Error fetching task types:', typeRes.reason);
      }

      // Update all sub types
      if (subRes.status === 'fulfilled') {
        let allSubTypesData = [];
        const response = subRes.value;
        if (response && response.subTypes) {
          allSubTypesData = response.subTypes;
        } else if (response && response.subtypes) {
          allSubTypesData = response.subtypes;
        } else if (response && response.data) {
          allSubTypesData = response.data;
        } else if (Array.isArray(response)) {
          allSubTypesData = response;
        }
        setAllSubTypes(allSubTypesData || []);
      } else {
        console.error('Error fetching sub types:', subRes.reason);
      }

      // Update the form to use the new task type if it was created with the same name
      if (newTaskType && newTaskType.id) {
        const newTaskTypeId = newTaskType.id.toString();

        // Reload task types for the currently selected category to include the new task type
        if (formData.category) {
          await loadFilteredTypes(formData.category);
        } else {
          // If no category is selected, update filteredTypes to include all types
          setFilteredTypes(allTypes);
        }

        setFormData(prev => ({
          ...prev,
          type: newTaskTypeId,
          subType: ''  // Reset subType when type changes
        }));

        // Load sub types for the selected type (cascading dropdown effect)
        if (newTaskTypeId) {
          await loadFilteredSubTypes(newTaskTypeId);
        } else {
          setFilteredSubTypes(allSubTypes); // Show all sub types when no type is selected
        }
      }

      // Trigger dropdown refresh in parent components
      triggerDropdownUpdate();
    } catch (err) {
      console.error('Error refreshing task types:', err);
    }
    // Close the modal after saving
    setShowNewTaskTypeModal(false);
  };

  const handleSaveSubType = async (newSubType) => {
    try {
      // Refresh all dropdown lists after adding a new one
      const [catRes, typeRes, subRes] = await Promise.allSettled([
        categoryService.getAllCategories(),
        taskTypeService.getAllTaskTypes(),
        subTypeService.getAllSubTypes()
      ]);

      // Update categories
      if (catRes.status === 'fulfilled') {
        setCategories(catRes.value.categories || catRes.value.data || []);
      } else {
        console.error('Error fetching categories:', catRes.reason);
      }

      // Update all task types
      if (typeRes.status === 'fulfilled') {
        let allTypesData = [];
        const response = typeRes.value;
        if (response && response.types) {
          allTypesData = response.types;
        } else if (response && response.data) {
          allTypesData = response.data;
        } else if (Array.isArray(response)) {
          allTypesData = response;
        }
        setAllTypes(allTypesData || []);
      } else {
        console.error('Error fetching task types:', typeRes.reason);
      }

      // Update all sub types
      if (subRes.status === 'fulfilled') {
        let allSubTypesData = [];
        const response = subRes.value;
        if (response && response.subTypes) {
          allSubTypesData = response.subTypes;
        } else if (response && response.subtypes) {
          allSubTypesData = response.subtypes;
        } else if (response && response.data) {
          allSubTypesData = response.data;
        } else if (Array.isArray(response)) {
          allSubTypesData = response;
        }
        setAllSubTypes(allSubTypesData || []);
      } else {
        console.error('Error fetching sub types:', subRes.reason);
      }

      // Update the form to use the new sub type if it was created with the same name
      if (newSubType && newSubType.id) {
        const newSubTypeId = newSubType.id.toString();

        // Reload sub types for the currently selected task type to include the new sub type
        if (formData.type) {
          await loadFilteredSubTypes(formData.type);

          // Force a small delay to ensure state updates propagate
          await new Promise(resolve => setTimeout(resolve, 0));
        } else {
          // If no type is selected, update filteredSubTypes to include all sub types
          // Use the freshly fetched data instead of the potentially stale allSubTypes state
          let allSubTypesData = [];
          if (subRes.status === 'fulfilled') {
            const response = subRes.value;
            if (response && response.subTypes) {
              allSubTypesData = response.subTypes;
            } else if (response && response.subtypes) {
              allSubTypesData = response.subtypes;
            } else if (response && response.data) {
              allSubTypesData = response.data;
            } else if (Array.isArray(response)) {
              allSubTypesData = response;
            }
          }
          setFilteredSubTypes(allSubTypesData || []);
        }

        setFormData(prev => ({
          ...prev,
          subType: newSubTypeId
        }));

        // Trigger a refresh to ensure UI updates
        triggerDropdownUpdate();
      }

      // If the current subType matches the one we just updated/added, refresh its description
      // This ensures the updated description appears without needing to reselect the sub type
      if (newSubType && newSubType.id && formData.subType === newSubType.id.toString()) {
        // Fetch the updated sub type description
        const updatedSubType = allSubTypes.find(st => st.id.toString() === newSubType.id.toString());
        if (updatedSubType && updatedSubType.description) {
          setFormData(prev => ({
            ...prev,
            description: updatedSubType.description
          }));
          setOriginalDescription(updatedSubType.description);
        }
      }

      // Trigger dropdown refresh in parent components
      triggerDropdownUpdate();
    } catch (err) {
      console.error('Error refreshing sub types:', err);
    }
    // Close the modal after saving
    setShowNewSubTypeModal(false);
  };

  // Function to save the current description to the selected sub type
  const handleSaveDescription = async () => {
    if (!formData.subType) {
      setWarningMessage('Please select a sub type first');
      setShowWarningModal(true);
      return;
    }

    if (!formData.description.trim()) {
      setWarningMessage('Description cannot be empty');
      setShowWarningModal(true);
      return;
    }

    try {
      setSavingDescription(true);
      await subTypeService.updateSubTypeDescription(formData.subType, formData.description);

      // Update the allSubTypes array with the new description
      setAllSubTypes(prev => prev.map(subType =>
        subType.id.toString() === formData.subType
          ? { ...subType, description: formData.description }
          : subType
      ));

      // Update the filteredSubTypes array with the new description
      setFilteredSubTypes(prev => prev.map(subType =>
        subType.id.toString() === formData.subType
          ? { ...subType, description: formData.description }
          : subType
      ));

      setOriginalDescription(formData.description);
      setWarningMessage('Description saved successfully');
      setShowWarningModal(true);
    } catch (error) {
      console.error('Error saving description:', error);
      setWarningMessage('Error saving description: ' + error.message);
      setShowWarningModal(true);
    } finally {
      setSavingDescription(false);
    }
  };

  // Function to clear the current description
  const handleClearDescription = () => {
    setFormData(prev => ({
      ...prev,
      description: ''
    }));
  };

  if (loading && isOpen) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="New Task" size="lg">
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <span className="ml-3">Loading options...</span>
        </div>
      </Modal>
    );
  }

  if (error && isOpen) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="New Task" size="lg">
        <div className="p-4 text-center">
          <p className="text-red-500 mb-4">Error loading options: {error}</p>
          <Button onClick={loadOptions} className="mb-4">Retry</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Task" size="lg">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input
          label="Task Title"
          id="task-title"
          name="title"
          type="text"
          placeholder="Will be auto-populated based on task type, quantity, and sub type"
          value={formData.title}
          onChange={handleChange}
          error={validationErrors.title}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Task Date"
            id="task-date"
            name="taskDate"
            type="datetime-local"
            value={formData.taskDate}
            onChange={handleChange}
            error={validationErrors.taskDate}
          />

          <Input
            label="Due Date"
            id="due-date"
            name="dueDate"
            type="datetime-local"
            value={formData.dueDate}
            onChange={handleChange}
            error={validationErrors.dueDate}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
            <div className="flex items-center gap-2">
              <Select
                id="category"
                name="category"
                options={categories.map(cat => ({ value: cat.id, label: cat.name }))}
                value={formData.category}
                onChange={handleChange}
                error={validationErrors.category}
              />
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={handleAddCategory}
              >
                <span className="material-symbols-outlined text-lg">add</span>
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Task Type</label>
            <div className="flex items-center gap-2">
              <Select
                id="task-type"
                name="type"
                options={filteredTypes.map(type => ({ value: type.id, label: type.name }))}
                value={formData.type}
                onChange={handleChange}
                error={validationErrors.type}
                disabled={!formData.category}  // Disable if no category is selected
              />
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={handleAddTaskType}
              >
                <span className="material-symbols-outlined text-lg">add</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sub Type</label>
            <div className="flex items-center gap-2">
              <Select
                id="sub-type"
                name="subType"
                options={filteredSubTypes.map(subType => ({ value: subType.id, label: subType.name }))}
                value={formData.subType}
                onChange={handleChange}
                error={validationErrors.subType}
                disabled={!formData.type}  // Disable if no type is selected
              />
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={handleAddSubType}
              >
                <span className="material-symbols-outlined text-lg">add</span>
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
            <Select
              id="priority"
              name="priority"
              options={priorities}
              value={formData.priority}
              onChange={handleChange}
              required
            />
          </div>
        </div>
        
        
        <div className="flex flex-col gap-4">
          <div className="flex items-end gap-4">
            <div className="flex-grow">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                placeholder="e.g., 5"
                value={formData.quantity}
                onChange={handleChange}
                error={validationErrors.quantity}
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              type="button"
              onClick={() => document.getElementById('file-upload').click()}
            >
              <span className="material-symbols-outlined">attach_file</span>
            </Button>
            <input
              id="file-upload"
              type="file"
              className="hidden"
              multiple
              onChange={handleFileChange}
            />
          </div>
          
          {/* File attachments display */}
          {attachments.length > 0 && (
            <div className="mt-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Attachments</label>
              <div className="grid grid-cols-1 gap-2">
                {attachments.map(attachment => (
                  <div key={attachment.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-md">
                    <div className="flex items-center gap-2 min-w-0"> {/* Added min-w-0 to enable text truncation */}
                      <span className="material-symbols-outlined text-gray-500 flex-shrink-0">description</span>
                      <div className="min-w-0"> {/* Added min-w-0 to enable text truncation */}
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate" title={attachment.name}>{attachment.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{(attachment.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(attachment.id)}
                      className="text-gray-500 hover:text-red-500 flex-shrink-0 ml-2" // Added flex-shrink-0 and ml-2 for spacing
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={handleSaveDescription}
                disabled={savingDescription || !formData.subType}
                className={`${!formData.subType ? 'text-gray-400 cursor-not-allowed' : 'text-green-600 hover:text-green-800'} ${savingDescription ? 'opacity-50' : ''}`}
                title="Save description for this sub type"
              >
                <span className="material-symbols-outlined">check</span>
              </button>
              <button
                type="button"
                onClick={handleClearDescription}
                disabled={!formData.subType}
                className={`${!formData.subType ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:text-red-800'}`}
                title="Clear description"
              >
                <span className="material-symbols-outlined">delete</span>
              </button>
            </div>
          </div>
          <textarea
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary ${
              validationErrors.description
                ? 'border-danger-500 focus:ring-danger-500 focus:border-danger-500 dark:bg-red-900/20 dark:text-white'
                : 'dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white focus:border-primary focus:ring-primary'
            }`}
            id="description"
            name="description"
            placeholder="Add a brief description..."
            value={formData.description}
            onChange={handleChange}
            rows="3"
          ></textarea>
          {validationErrors.description && (
            <p className="mt-1 text-sm text-danger-600">{validationErrors.description}</p>
          )}
        </div>
        
        <div className="flex justify-end gap-3 pt-2">
          <Button 
            variant="outline" 
            type="button"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={savingTask}
          >
            {savingTask ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </div>
            ) : (
              "Save Task"
            )}
          </Button>
        </div>
      </form>
      
      {/* Category Modal */}
      <NewCategoryModal 
        isOpen={showNewCategoryModal} 
        onClose={() => setShowNewCategoryModal(false)} 
        onSave={handleSaveCategory}
      />
      
      {/* Task Type Modal */}
      <NewTaskTypeModal
        isOpen={showNewTaskTypeModal}
        onClose={() => setShowNewTaskTypeModal(false)}
        onSave={handleSaveTaskType}
        categories={categories}
        selectedCategoryId={formData.category}  // Pass selected category for pre-selection
      />
      
      {/* Sub Type Modal */}
      <NewSubTypeModal
        isOpen={showNewSubTypeModal}
        onClose={() => setShowNewSubTypeModal(false)}
        onSave={handleSaveSubType}
        taskTypes={allTypes}
        currentTypeId={formData.type}
        selectedCategoryId={formData.category}  // Pass selected category for filtering
      />

      {/* Warning Modal */}
      <WarningModal
        open={showWarningModal}
        onClose={() => setShowWarningModal(false)}
        message={warningMessage}
      />
    </Modal>
  );
};

export default NewTaskModal;