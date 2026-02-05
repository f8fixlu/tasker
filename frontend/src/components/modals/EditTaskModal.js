import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Select from '../common/Select';
import Button from '../common/Button';
import NewCategoryModal from './NewCategoryModal';
import NewTaskTypeModal from './NewTaskTypeModal';
import NewSubTypeModal from './NewSubTypeModal';
import { categoryService } from '../../services/categoryService';
import { taskTypeService } from '../../services/taskTypeService';
import { subTypeService } from '../../services/subTypeService';
import { taskService } from '../../services/taskService';
import { attachmentService } from '../../services/attachmentService';
import { formatToLocalDateTime } from '../../utils/date';
import { useTaskUpdate } from '../../context/TaskUpdateContext';

const EditTaskModal = ({ isOpen, onClose, task, onSave }) => {
  const { triggerTaskUpdate, triggerDropdownUpdate } = useTaskUpdate(); // Get task update trigger from new system
  // Initialize with empty data, will be populated when the modal opens
  const [formData, setFormData] = useState({
    id: null,
    title: '',
    taskDate: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 16), // Current date + 8 hours in datetime-local format (YYYY-MM-DDTHH:mm)
    dueDate: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 16), // Current date + 8 hours in datetime-local format (YYYY-MM-DDTHH:mm)
    category: '',
    type: '',
    subType: '',
    priority: 'medium', // Default to medium
    quantity: '1',
    description: '',
    status: 'Pending'  // Default to 'Pending' if no status exists
  });

  console.log('EditTaskModal mounted with task:', task);
  const [attachments, setAttachments] = useState(task?.attachments || []);
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [showNewTaskTypeModal, setShowNewTaskTypeModal] = useState(false);
  const [showNewSubTypeModal, setShowNewSubTypeModal] = useState(false);
  const [hasUserModifiedTitle, setHasUserModifiedTitle] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const [categories, setCategories] = useState([]);
  const [allTypes, setAllTypes] = useState([]); // All types for reference
  const [filteredTypes, setFilteredTypes] = useState([]); // Types filtered by selected category
  const [allSubTypes, setAllSubTypes] = useState([]); // All subtypes for reference
  const [filteredSubTypes, setFilteredSubTypes] = useState([]); // Subtypes filtered by selected type
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false); // Track if task data has been loaded
  const [error, setError] = useState(null);
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'info' }); // type: 'info', 'success', 'error'

  // Effect to handle loading options and task data when modal opens
  useEffect(() => {
    const loadData = async () => {
      if (isOpen && task && task.id) {
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
            setFilteredSubTypes(subTypesData || []);
          } else {
            console.error('Error fetching sub types:', subTypesRes.reason);
            setAllSubTypes([]);
            setFilteredSubTypes([]);
          }

          // Now that options are loaded, fetch the task data and attachments in parallel
          const [taskResponse, attachmentResponse] = await Promise.all([
            taskService.getTaskById(task.id),
            attachmentService.getAttachmentsByEntity(task.id, 'task')
          ]);
          
          // The API returns the task wrapped in a 'task' property
          const freshTask = taskResponse.task || taskResponse;
          
          // Process attachments
          let existingAttachments = [];
          try {
            existingAttachments = (attachmentResponse.attachments || []).map(att => ({
              id: att.id,
              name: att.filename,
              size: att.file_size,
              type: att.file_type,
              filepath: att.filepath  // Include filepath for reference
            }));
          } catch (attachmentError) {
            console.error('Error processing attachments:', attachmentError);
            // If there's an error loading attachments, continue with empty attachments
            existingAttachments = [];
          }
          
          // Set attachments first
          setAttachments(existingAttachments);
          
          // First, determine the category and type IDs to load dependent options
          let targetCategoryId = null;
          let targetType_id = null;

          if (freshTask.category_id) {
            targetCategoryId = freshTask.category_id;
          } else if (freshTask.category_name && categories.length > 0) {
            const categoryObj = categories.find(cat => cat.name === freshTask.category_name);
            if (categoryObj) targetCategoryId = categoryObj.id;
          }

          if (freshTask.type_id) {
            targetType_id = freshTask.type_id;
          } else if (freshTask.type_name && allTypes.length > 0) {
            const typeObj = allTypes.find(type => type.name === freshTask.type_name);
            if (typeObj) targetType_id = typeObj.id;
          }

          // Load dependent options first, but don't set subType yet as filtered subtypes aren't loaded
          setFormData(prev => ({
            ...prev,
            id: freshTask.id !== undefined ? freshTask.id : (freshTask.Id || null),
            title: freshTask.title || freshTask.Title || '',
            taskDate: formatDateTimeForInput(freshTask.task_date || freshTask.taskDate) || '',
            dueDate: formatDateTimeForInput(freshTask.due_date || freshTask.dueDate) || '',
            // getTaskById returns category_name, type_name, sub_type_name (the names),
            // but the form fields expect the IDs for the Select components
            category: targetCategoryId?.toString() ||
                      (freshTask.category_name && categories.length > 0 ?
                        categories.find(cat => cat.name === freshTask.category_name)?.id?.toString() : ""),
            type: targetType_id?.toString() ||
                 (freshTask.type_name && allTypes.length > 0 ?
                   allTypes.find(type => type.name === freshTask.type_name)?.id?.toString() : ""),
            // Don't set subType yet, as filtered subtypes aren't loaded yet
            priority: (freshTask.priority || 'high').toLowerCase(),
            quantity: String(freshTask.quantity || 1),
            description: freshTask.description || '',
            status: freshTask.status || 'Pending'  // Default to 'Pending' if no status exists
          }));
          
          // Load dependent options after setting basic form data
          if (targetCategoryId) {
            await loadFilteredTypes(targetCategoryId);
            if (targetType_id) {
              // Wait for the filtered types to be loaded before loading subtypes
              await loadFilteredSubTypes(targetType_id);
            }
          }
          
          // Set form data with initial subType value
          setFormData(prev => ({
            ...prev,
            subType: freshTask.sub_type_id ? freshTask.sub_type_id.toString() :
                    (freshTask.sub_type_name && allSubTypes.length > 0 ?
                      allSubTypes.find(subType => subType.name === freshTask.sub_type_name)?.id?.toString() : "")
          }));

          // Reset the user modification flag to allow auto-population on initial load
          setHasUserModifiedTitle(false);
          setDataLoaded(true);
        } catch (error) {
          console.error('Error in loadData:', error);
          setError(error.message);
          // Fallback to the original task data if the API call fails
          setFormData({
            id: task.id !== undefined ? task.id : (task.Id || null),
            title: task.title || task.Title || '',
            taskDate: task.task_date || task.taskDate || '',
            dueDate: task.due_date || task.dueDate || '',
            // Use the ID fields directly if available, as these are what the dropdowns expect as values
            // The original task from Tasks.js might have category_name, type_name, sub_type_name instead of IDs
            // So let's try to find the matching IDs from the loaded categories/types/subtypes
            category: task.category_id ? task.category_id.toString() :
                     (task.category_name && categories.length > 0 ?
                       categories.find(cat => cat.name === task.category_name)?.id?.toString() : ""),
            type: task.type_id ? task.type_id.toString() :
                 (task.type_name && allTypes.length > 0 ?
                   allTypes.find(type => type.name === task.type_name)?.id?.toString() : ""),
            subType: task.sub_type_id ? task.sub_type_id.toString() :
                    (task.sub_type_name && allSubTypes.length > 0 ?
                      allSubTypes.find(subType => subType.name === task.sub_type_name)?.id?.toString() : ""),
            priority: task.priority || 'high',
            quantity: String(task.quantity || 1),
            description: task.description || '',
            status: task.status || 'Pending'  // Default to 'Pending' if no status exists
          });
          
          // Reset the user modification flag to allow auto-population on initial load
          setHasUserModifiedTitle(false);
          
          // Load dependent options from the fallback data first
          let targetCategoryId = null;
          let targetType_id = null;
          
          if (task.category_id) {
            targetCategoryId = task.category_id;
          } else if (task.category_name && categories.length > 0) {
            const categoryObj = categories.find(cat => cat.name === task.category_name);
            if (categoryObj) targetCategoryId = categoryObj.id;
          }
          
          if (task.type_id) {
            targetType_id = task.type_id;
          } else if (task.type_name && allTypes.length > 0) {
            const typeObj = allTypes.find(type => type.name === task.type_name);
            if (typeObj) targetType_id = typeObj.id;
          }
          
          // Load dependent options first, before setting form data
          if (targetCategoryId) {
            await loadFilteredTypes(targetCategoryId);
            if (targetType_id) {
              // Wait for the filtered types to be loaded before loading subtypes
              await loadFilteredSubTypes(targetType_id);
            }
          }
          
          // After setting the form data, load the dependent options first
          if (targetCategoryId) {
            await loadFilteredTypes(targetCategoryId);
            if (targetType_id) {
              // Wait for the filtered types to be loaded before loading subtypes
              await loadFilteredSubTypes(targetType_id);
            }
          }

          // Re-set form data after dependencies are loaded to ensure correct subType association
          setFormData(prevFormData => ({
            ...prevFormData,
            category: targetCategoryId?.toString() || prevFormData.category,
            type: targetType_id?.toString() || prevFormData.type,
            subType: task.sub_type_id ? task.sub_type_id.toString() :
                    (task.sub_type_name && allSubTypes.length > 0 ?
                      allSubTypes.find(subType => subType.name === task.sub_type_name)?.id?.toString() : "")
          }));

          // Mark data as loaded even if there was an error
          setDataLoaded(true);
        } finally {
          setLoading(false);
        }
      } else if (isOpen) {
        // If modal is open but no task is provided, mark as loaded but with empty state
        // Reset the user modification flag when no task is provided
        setHasUserModifiedTitle(false);
        setDataLoaded(true);
        setLoading(false);
      } else {
        // When modal is closed, reset states
        setDataLoaded(false);
        setLoading(false);
      }
    };

    loadData();
  }, [isOpen, task]); // Depend on isOpen and task only

  // Effect to reset form data when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Reset form data to initial state when modal closes
      setFormData({
        id: null,
        title: '',
        taskDate: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 16), // Current date + 8 hours in datetime-local format (YYYY-MM-DDTHH:mm)
        dueDate: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 16), // Current date + 8 hours in datetime-local format (YYYY-MM-DDTHH:mm)
        category: '',
        type: '',
        subType: '',
        priority: 'medium', // Default to medium
        quantity: '1',
        description: '',
        status: 'Pending'
      });
      setAttachments([]); // Reset attachments
      setDataLoaded(false);
      setFilteredTypes([]);
      setFilteredSubTypes([]);
      setHasUserModifiedTitle(false); // Reset the flag when modal closes
    }
  }, [isOpen]); // Only run when isOpen changes

  // Effect to automatically format the task title when type, subType, or quantity changes
  useEffect(() => {
    if (!isOpen || !dataLoaded) return; // Only run when modal is open and data is loaded

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
  }, [formData.type, formData.subType, formData.quantity, allTypes, allSubTypes, isOpen, dataLoaded, hasUserModifiedTitle, formData.title]);
  
  // Effect to update subType selection when filteredSubTypes change and modal is open
  useEffect(() => {
    if (!isOpen || !dataLoaded || !task || filteredSubTypes.length === 0) return;

    // Check if current subType exists in the filtered list, if not try to find appropriate match
    if (formData.subType) {
      const subTypeInFiltered = filteredSubTypes.find(st => st.id?.toString() === formData.subType);
      if (!subTypeInFiltered && task) {
        // The current subType doesn't exist in filtered list, let's try to find the right one
        let newSubTypeValue = "";
        
        // Try to find the original task's sub type in the filtered list
        if (task.sub_type_id) {
          const originalSubTypeInFiltered = filteredSubTypes.find(st => st.id?.toString() === task.sub_type_id.toString());
          if (originalSubTypeInFiltered) {
            newSubTypeValue = originalSubTypeInFiltered.id.toString();
          } else if (task.sub_type_name) {
            // If original ID not in filtered list, try by name 
            const subTypeByName = filteredSubTypes.find(st => st.name === task.sub_type_name);
            if (subTypeByName) {
              newSubTypeValue = subTypeByName.id.toString();
            }
          }
        } else if (task.sub_type_name) {
          // If no ID, try to find by name from the filtered list
          const subTypeByName = filteredSubTypes.find(st => st.name === task.sub_type_name);
          if (subTypeByName) {
            newSubTypeValue = subTypeByName.id.toString();
          }
        }
        
        // Only update if we found a valid replacement
        if (newSubTypeValue && newSubTypeValue !== formData.subType) {
          setFormData(prev => ({
            ...prev,
            subType: newSubTypeValue
          }));
        }
      }
    } else if (task && (task.sub_type_id || task.sub_type_name)) {
      // If no subType is set but the original task has one, try to set it
      let newSubTypeValue = "";
      
      if (task.sub_type_id) {
        const originalSubTypeInFiltered = filteredSubTypes.find(st => st.id?.toString() === task.sub_type_id.toString());
        if (originalSubTypeInFiltered) {
          newSubTypeValue = originalSubTypeInFiltered.id.toString();
        } else if (task.sub_type_name) {
          // If original ID not in filtered list, try by name
          const subTypeByName = filteredSubTypes.find(st => st.name === task.sub_type_name);
          if (subTypeByName) {
            newSubTypeValue = subTypeByName.id.toString();
          }
        }
      } else if (task.sub_type_name) {
        // If no ID, try to find by name from the filtered list
        const subTypeByName = filteredSubTypes.find(st => st.name === task.sub_type_name);
        if (subTypeByName) {
          newSubTypeValue = subTypeByName.id.toString();
        }
      }
      
      if (newSubTypeValue) {
        setFormData(prev => ({
          ...prev,
          subType: newSubTypeValue
        }));
      }
    }
  }, [filteredSubTypes, isOpen, dataLoaded, task, formData.subType]);
  
  // Note: Cascading dropdowns are now handled in the main data loading useEffect to avoid race conditions

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

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    
    // For number inputs, ensure the value remains a string to satisfy Input component's PropTypes
    const processedValue = type === 'number' ? String(value) : value;
    
    // Track if user manually changes the title
    if (name === 'title') {
      setFormData(prev => ({
        ...prev,
        [name]: processedValue
      }));
      setHasUserModifiedTitle(true);
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

  // Function to delete an existing attachment from the server
  const deleteAttachment = async (attachmentId) => {
    try {
      await attachmentService.deleteAttachment(attachmentId);
      // Remove from the local state
      setAttachments(prev => prev.filter(attachment => attachment.id !== attachmentId));
      console.log('Attachment deleted successfully');
    } catch (error) {
      console.error('Error deleting attachment:', error);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Failed to delete attachment: ' + (error.message || 'Unknown error'),
        type: 'error'
      });
    }
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

    // Check if the task has a valid ID before trying to submit
    if (!formData.id) {
      errors.general = 'Cannot save task: Task ID is missing. Please try again.';
      setSavingTask(false); // Reset saving state
      setValidationErrors(errors);
      return;
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
      // Transform form data to match backend expectations
      // Map frontend field names to backend field names
      const now = new Date();
      const taskData = {
        id: formData.id,
        title: formData.title,
        description: formData.description,
        category_id: formData.category ? parseInt(formData.category) : null,  // Use actual category ID from database
        type_id: formData.type ? parseInt(formData.type) : null,              // Use actual type ID from database
        sub_type_id: formData.subType ? parseInt(formData.subType) : null,    // Use actual sub type ID from database
        quantity: parseInt(formData.quantity) || 1,
        priority: capitalizeFirstLetter(formData.priority),  // Capitalize priority for backend validation
        status: formData.status,  // Include the status in the task data
        task_date: formData.taskDate ? new Date(formData.taskDate).toISOString() : null,  // Format date properly for backend
        due_date: formData.dueDate ? new Date(formData.dueDate).toISOString() : null,  // Format date properly for backend - preserves user's time selection
        edited_date: now.toISOString(),  // Store the time when task was edited
        attachments
      };
      
      // In a real app, this would submit the form to an API to update the task
      if (onSave) {
        await onSave(taskData);
      }
      
      // If there are new attachments to upload, upload them separately
      if (formData.id && attachments.length > 0) {
        const uploadPromises = attachments
          .filter(attachment => attachment.file) // Only upload if it's a new file (not yet uploaded)
          .map(attachment => 
            attachmentService.uploadAttachment(attachment.file, formData.id, null)
          );
        
        if (uploadPromises.length > 0) {
          try {
            await Promise.all(uploadPromises);
            console.log('Attachments uploaded successfully');
          } catch (uploadError) {
            console.error('Error uploading attachments:', uploadError);
            // We'll continue even if attachment upload fails, just log the error
          }
        }
      }
      
      // Call onSave prop which handles API update and triggering refresh
      if (onSave) {
        try {
          await onSave(taskData);
        } catch (error) {
          console.error('Error in onSave:', error);
          // Only close the modal, don't trigger refresh if save failed
          onClose();
          return;
        }
      } else {
        // Fallback: if no onSave prop provided, trigger update directly
        triggerTaskUpdate();
      }

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

  // Helper function to format date for datetime-local input
  const formatDateTimeForInput = (dateString) => {
    if (!dateString) return '';
    
    // Parse the date string - it could be in various formats
    let date;
    
    // If it's already in ISO format (YYYY-MM-DDTHH:mm), we can use it directly
    if (dateString.includes('T') && dateString.length >= 16) {
      return dateString.substring(0, 16); // Return YYYY-MM-DDTHH:mm
    }
    
    // If it's in the display format like "Oct 27, 2025, 10:12:00 PM"
    date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      // If parsing failed, try other common formats
      date = new Date(dateString.replace(/(\w+ \d+, \d+), (\d+:\d+:\d+ \w+)/, '$1 $2'));
      if (isNaN(date.getTime())) {
        return '';
      }
    }
    
    // Format to YYYY-MM-DDTHH:mm (format expected by datetime-local input)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Helper function to convert display date format back to input format
  // Format: "Oct 27, 2025, 10:12:00 PM" -> "2025-10-27T22:12"
  const convertDisplayDateToInputFormat = (displayDate) => {
    if (!displayDate) return '';
    
    // Parse the display format: "Oct 27, 2025, 10:12:00 PM"
    // Create a date object from this string
    const date = new Date(displayDate);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      console.error('Invalid date string:', displayDate);
      return '';
    }
    
    // Format to YYYY-MM-DDTHH:mm (format expected by datetime-local input)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
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
        setFormData(prev => ({
          ...prev,
          subType: newSubType.id.toString()
        }));
      }

      // Trigger dropdown refresh in parent components
      triggerDropdownUpdate();
    } catch (err) {
      console.error('Error refreshing sub types:', err);
    }
    // Close the modal after saving
    setShowNewSubTypeModal(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Task" size="lg">
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
                error={validationErrors.category_id}
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
                error={validationErrors.type_id}
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
                error={validationErrors.sub_type_id}
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
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <Select
                id="status"
                name="status"
                options={[
                  { value: 'Pending', label: 'Pending' },
                  { value: 'In Progress', label: 'In Progress' },
                  { value: 'Completed', label: 'Completed' },
                  ...(formData.status === 'Archived' ? [{ value: 'Archived', label: 'Archived' }] : [])
                ]}
                value={formData.status}
                onChange={handleChange}
                required
                disabled={formData.status === 'Archived'}
              />
            </div>
            <div className="md:col-span-6 flex items-end gap-2">
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
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate" title={attachment.name || attachment.filename}>{attachment.name || attachment.filename}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{(attachment.size || attachment.file_size ? (attachment.size || attachment.file_size) / 1024 : 0).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        // If the attachment has an 'id' field from the DB, it's an existing attachment that needs to be deleted from the server
                        if (attachment.id && !attachment.file) {
                          deleteAttachment(attachment.id);
                        } else {
                          // If it's a new file (has 'file' property), just remove from state
                          removeAttachment(attachment.id);
                        }
                      }}
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
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
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
            disabled={!dataLoaded || !formData.id || savingTask}
          >
            {!dataLoaded ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                Loading...
              </div>
            ) : savingTask ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </div>
            ) : (
              'Save Task'
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
    </Modal>
  );
};

export default EditTaskModal;