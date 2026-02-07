import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Select from '../common/Select';
import Button from '../common/Button';
import NewCategoryModal from './NewCategoryModal';
import NewEventTypeModal from './NewEventTypeModal';
import { eventCategoryService } from '../../services/eventCategoryService';
import { eventTypeService } from '../../services/eventTypeService';
import { eventService } from '../../services/eventService';
import { attachmentService } from '../../services/attachmentService';
import { formatToLocalDateTime, parseFormattedDateTime } from '../../utils/date';

const EditEventModal = ({ isOpen, onClose, event, onSave, onEventUpdate }) => {
  // Initialize with empty data, will be populated when the modal opens
  const [formData, setFormData] = useState({
    id: null,
    title: '',
    start_date: '',
    start_time: '00:00',
    end_date: '',
    end_time: '23:59',
    description: '',
    location: '',
    category_id: '',
    event_type_id: '',
    is_whole_day: false,
    status: 'Scheduled'
  });

  const [attachments, setAttachments] = useState(event?.attachments || []);
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [showNewEventTypeModal, setShowNewEventTypeModal] = useState(false);
  const [hasUserModifiedTitle, setHasUserModifiedTitle] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const [categories, setCategories] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [error, setError] = useState(null);

  // Effect to handle loading options when modal opens
  useEffect(() => {
    const loadOptions = async () => {
      if (isOpen) {
        try {
          setLoading(true);
          setError(null);

          // Fetch categories from the API
          const categoriesRes = await eventCategoryService.getAllEventCategories();

          if (categoriesRes) {
            // Handle different possible response formats for categories
            let categoriesData = [];
            if (categoriesRes && categoriesRes.categories) {
              categoriesData = categoriesRes.categories; // new format
            } else if (categoriesRes && categoriesRes.data) {
              categoriesData = categoriesRes.data; // alternative format
            } else if (Array.isArray(categoriesRes)) {
              categoriesData = categoriesRes; // direct array response
            }
            setCategories(categoriesData || []);
          } else {
            console.error('Error fetching categories: No response');
            setCategories([]);
          }
        } catch (err) {
          setError(err.message);
          console.error('Error loading categories:', err);
        } finally {
          setLoading(false);
        }
      }
    };

    loadOptions();
  }, [isOpen]); // Only load options when modal opens/closes

  // Effect to handle loading event data when modal opens and options are loaded
  useEffect(() => {
    const loadEventData = async () => {
      if (isOpen && event && event.id && categories.length > 0) {
        try {
          // Fetch fresh event data and attachments in parallel
          const [eventResponse, attachmentResponse] = await Promise.all([
            eventService.getEventById(event.id),
            attachmentService.getAttachmentsByEntity(event.id, 'event')
          ]);

          // The API returns the event wrapped in an 'event' property
          const freshEvent = eventResponse.event || eventResponse;

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

          // Extract date and time components from the event data
          let startDate = '';
          let startTime = '00:00';
          let endDate = '';
          let endTime = '23:59';

          if (freshEvent.start_date) {
            // Check if it's an all-day event
            if (freshEvent.is_whole_day || freshEvent.wholeDay) {
              // For all-day events, we need to extract just the date part to avoid timezone shifts
              const dateObj = new Date(freshEvent.start_date);
              const year = dateObj.getFullYear();
              const month = String(dateObj.getMonth() + 1).padStart(2, '0');
              const day = String(dateObj.getDate()).padStart(2, '0');
              startDate = `${year}-${month}-${day}`;
              startTime = '00:00'; // Default for all-day events
            } else {
              const parsedDateTime = parseFormattedDateTime(freshEvent.start_date);
              const [datePart, timePart] = parsedDateTime ? parsedDateTime.split('T') : ['', ''];
              startDate = datePart || '';
              startTime = timePart || '00:00';
            }
          }

          if (freshEvent.end_date) {
            // Check if it's an all-day event
            if (freshEvent.is_whole_day || freshEvent.wholeDay) {
              // For all-day events, we need to extract just the date part to avoid timezone shifts
              const dateObj = new Date(freshEvent.end_date);
              const year = dateObj.getFullYear();
              const month = String(dateObj.getMonth() + 1).padStart(2, '0');
              const day = String(dateObj.getDate()).padStart(2, '0');
              endDate = `${year}-${month}-${day}`;
              endTime = '23:59'; // Default for all-day events
            } else {
              const parsedDateTime = parseFormattedDateTime(freshEvent.end_date);
              const [datePart, timePart] = parsedDateTime ? parsedDateTime.split('T') : ['', ''];
              endDate = datePart || '';
              endTime = timePart || '23:59';
            }
          }

          // Set basic form data first (without dependent values)
          setFormData(prev => ({
            ...prev,
            id: freshEvent.id,
            title: freshEvent.title || '',
            start_date: startDate,
            start_time: startTime,
            end_date: endDate,
            end_time: endTime,
            description: freshEvent.description || '',
            location: freshEvent.location || '',
            is_whole_day: freshEvent.is_whole_day || freshEvent.wholeDay || false,
            status: freshEvent.status || 'Scheduled'
          }));

          // Set the category and event type IDs after basic data is set
          const targetCategoryId = freshEvent.category_id ? freshEvent.category_id.toString() : '';
          const targetEventTypeId = freshEvent.event_type_id ? freshEvent.event_type_id.toString() : '';

          // Update form data with category first
          setFormData(prev => ({
            ...prev,
            category_id: targetCategoryId
          }));

          // If category is set, load event types and then set event type
          if (targetCategoryId) {
            // Wait for event types to load
            await new Promise(resolve => setTimeout(resolve, 0)); // Allow UI to update
            
            // Update form data with event type after event types are loaded
            setFormData(prev => ({
              ...prev,
              event_type_id: targetEventTypeId
            }));
          } else {
            // If no category, clear event type
            setFormData(prev => ({
              ...prev,
              event_type_id: ''
            }));
          }

          // Reset the user modification flag to allow auto-population on initial load
          setHasUserModifiedTitle(false);
          setDataLoaded(true);
        } catch (error) {
          console.error('Error in loadEventData:', error);
          setError('Failed to load event data');
        }
      } else if (isOpen) {
        // If modal is open but no event is provided, mark as loaded but with empty state
        setHasUserModifiedTitle(false);
        setDataLoaded(true);
      } else {
        // When modal is closed, reset states
        setDataLoaded(false);
      }
    };

    loadEventData();
  }, [isOpen, event, categories]); // Depend on isOpen, event, and categories

  // Effect to reset form data when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Reset form data to initial state when modal closes
      setFormData({
        id: null,
        title: '',
        start_date: '',
        start_time: '00:00',
        end_date: '',
        end_time: '23:59',
        description: '',
        location: '',
        category_id: ''
      });
      setAttachments([]); // Reset attachments
      setDataLoaded(false);
      setHasUserModifiedTitle(false); // Reset the flag when modal closes
    }
  }, [isOpen]); // Only run when isOpen changes

  // Effect to load event types based on the selected category
  useEffect(() => {
    const loadEventTypes = async () => {
      if (formData.category_id) {
        try {
          const response = await eventTypeService.getEventTypesByCategoryId(formData.category_id);

          if (response) {
            // Handle different possible response formats for event types
            let eventTypesData = [];
            if (response && response.event_types) {
              eventTypesData = response.event_types; // new format
            } else if (response && response.data) {
              eventTypesData = response.data; // alternative format
            } else if (Array.isArray(response)) {
              eventTypesData = response; // direct array response
            }
            setEventTypes(eventTypesData || []);
          } else {
            console.error('Error fetching event types: No response');
            setEventTypes([]);
          }
        } catch (err) {
          console.error('Error loading event types:', err);
          setEventTypes([]);
        }
      } else {
        // If no category is selected, clear event types
        setEventTypes([]);
      }
    };

    loadEventTypes();
  }, [formData.category_id]);

  // Effect to ensure form data is properly set after all dropdowns are loaded
  useEffect(() => {
    if (!isOpen || !dataLoaded || !event) return;
    
    // Only run this effect after all dropdowns are loaded and we have the event data
    if (categories.length > 0) {
      // Set the form data with the correct values after all dropdowns are loaded
      setFormData(prev => {
        // Determine the correct IDs based on the event data
        let targetCategoryId = null;
        let targetEventTypeId = null;

        if (event.category_id) {
          targetCategoryId = event.category_id.toString();
        } else if (event.category_name && categories.length > 0) {
          const categoryObj = categories.find(cat => cat.name === event.category_name);
          if (categoryObj) targetCategoryId = categoryObj.id.toString();
        }

        if (event.event_type_id) {
          targetEventTypeId = event.event_type_id.toString();
        } else if (event.event_type_name && eventTypes.length > 0) {
          const eventTypeObj = eventTypes.find(et => et.name === event.event_type_name);
          if (eventTypeObj) targetEventTypeId = eventTypeObj.id.toString();
        }

        return {
          ...prev,
          id: event.id !== undefined ? event.id : (event.Id || null),
          title: event.title || event.Title || '',
          start_date: prev.start_date,
          start_time: prev.start_time,
          end_date: prev.end_date,
          end_time: prev.end_time,
          description: event.description || '',
          location: event.location || '',
          category_id: targetCategoryId || prev.category_id,
          event_type_id: targetEventTypeId || prev.event_type_id,
          is_whole_day: event.is_whole_day || event.wholeDay || false,
          status: event.status || 'Scheduled'
        };
      });
    }
  }, [isOpen, dataLoaded, event, categories, eventTypes]);

  // Effect to ensure form data is updated when event types change
  useEffect(() => {
    if (!isOpen || !dataLoaded || !event || eventTypes.length === 0) return;

    // Check if current event_type_id exists in the loaded event types
    if (formData.event_type_id) {
      const eventTypeInLoaded = eventTypes.find(et => et.id?.toString() === formData.event_type_id);
      if (!eventTypeInLoaded && event) {
        // The current event type doesn't exist in loaded list, try to find the right one
        let newEventTypeId = "";

        // Try to find the original event's event type in the loaded list
        if (event.event_type_id) {
          const originalEventTypeInLoaded = eventTypes.find(et => et.id?.toString() === event.event_type_id.toString());
          if (originalEventTypeInLoaded) {
            newEventTypeId = originalEventTypeInLoaded.id.toString();
          } else if (event.event_type_name) {
            // If original ID not in loaded list, try by name
            const eventTypeByName = eventTypes.find(et => et.name === event.event_type_name);
            if (eventTypeByName) {
              newEventTypeId = eventTypeByName.id.toString();
            }
          }
        } else if (event.event_type_name) {
          // If no ID, try to find by name from the loaded list
          const eventTypeByName = eventTypes.find(et => et.name === event.event_type_name);
          if (eventTypeByName) {
            newEventTypeId = eventTypeByName.id.toString();
          }
        }

        // Only update if we found a valid replacement
        if (newEventTypeId && newEventTypeId !== formData.event_type_id) {
          setFormData(prev => ({
            ...prev,
            event_type_id: newEventTypeId
          }));
        }
      }
    } else if (event && (event.event_type_id || event.event_type_name)) {
      // If no event_type_id is set but the original event has one, try to set it
      let newEventTypeId = "";

      if (event.event_type_id) {
        const originalEventTypeInLoaded = eventTypes.find(et => et.id?.toString() === event.event_type_id.toString());
        if (originalEventTypeInLoaded) {
          newEventTypeId = originalEventTypeInLoaded.id.toString();
        } else if (event.event_type_name) {
          // If original ID not in loaded list, try by name
          const eventTypeByName = eventTypes.find(et => et.name === event.event_type_name);
          if (eventTypeByName) {
            newEventTypeId = eventTypeByName.id.toString();
          }
        }
      } else if (event.event_type_name) {
        // If no ID, try to find by name from the loaded list
        const eventTypeByName = eventTypes.find(et => et.name === event.event_type_name);
        if (eventTypeByName) {
          newEventTypeId = eventTypeByName.id.toString();
        }
      }

      if (newEventTypeId) {
        setFormData(prev => ({
          ...prev,
          event_type_id: newEventTypeId
        }));
      }
    }
  }, [eventTypes, isOpen, dataLoaded, event, formData.event_type_id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Handle checkbox input for is_whole_day
    if (name === 'is_whole_day') {
      setFormData(prev => ({
        ...prev,
        [name]: checked,
        // For all-day events, set default times (start: 00:00, end: 23:59)
        start_time: checked ? '00:00' : prev.start_time,
        end_time: checked ? '23:59' : prev.end_time
      }));
      return;
    }

    // Handle cascading dropdowns before updating form data
    if (name === 'category_id') {
      // When category changes, reset event_type_id selection
      setFormData(prev => ({
        ...prev,
        category_id: value,
        event_type_id: ''  // Reset event type when category changes
      }));
    } else if (name === 'start_date' || name === 'end_date') {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    } else if (name === 'start_time' || name === 'end_time') {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    } else if (name === 'title') {
      // Track if user manually changes the title
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
      setHasUserModifiedTitle(true);
    } else {
      // Handle other fields normally
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    
    // Validate file sizes before adding
    const maxSize = 20 * 1024 * 1024; // 20MB in bytes
    const oversizedFiles = files.filter(file => file.size > maxSize);
    
    if (oversizedFiles.length > 0) {
      const fileNames = oversizedFiles.map(file => file.name).join(', ');
      alert(`The following files exceed the 10MB size limit and cannot be uploaded: ${fileNames}`);
      return; // Don't add oversized files
    }
    
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
      alert('Failed to delete attachment: ' + (error.message || 'Unknown error'));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Reset validation errors
    setValidationErrors({});

    // Set saving state to true
    setSavingEvent(true);

    // Validation
    const errors = {};
    if (!formData.title || formData.title.trim() === '') {
      errors.title = 'Title is required';
    }

    if (!formData.start_date) {
      errors.start_date = 'Start date is required';
    }

    if (!formData.end_date) {
      errors.end_date = 'End date is required';
    }

    // Check if the event has a valid ID before trying to submit
    if (!formData.id) {
      errors.general = 'Cannot save event: Event ID is missing. Please try again.';
      setSavingEvent(false); // Reset saving state
      setValidationErrors(errors);
      return;
    }

    // Validate that end date is not before start date
    if (formData.start_date && formData.end_date) {
      const startDateTime = new Date(`${formData.start_date}T${formData.is_whole_day ? '00:00' : formData.start_time}`);
      const endDateTime = new Date(`${formData.end_date}T${formData.is_whole_day ? '23:59' : formData.end_time}`);
      if (endDateTime < startDateTime) {
        errors.end_date = 'End date cannot be before start date';
      }
    }

    // If there are validation errors, set them and return
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setSavingEvent(false); // Reset saving state
      return;
    }

    try {
      // Transform form data to match backend expectations
      let startDateToSave = null;
      let endDateToSave = null;

      if (formData.start_date) {
        if (formData.is_whole_day) {
          // For all-day events, use start of day time (00:00) regardless of time input
          const [year, month, day] = formData.start_date.split('-').map(Number);
          const localDate = new Date(year, month - 1, day, 0, 0, 0);
          startDateToSave = localDate.toISOString();
        } else {
          // For timed events, combine date and time
          const [year, month, day] = formData.start_date.split('-').map(Number);
          const [hours, minutes] = formData.start_time.split(':').map(Number);
          const localDate = new Date(year, month - 1, day, hours, minutes, 0);
          startDateToSave = localDate.toISOString();
        }
      }

      if (formData.end_date) {
        if (formData.is_whole_day) {
          // For all-day events, use end of day time (23:59) regardless of time input
          const [year, month, day] = formData.end_date.split('-').map(Number);
          const localDate = new Date(year, month - 1, day, 23, 59, 59);
          endDateToSave = localDate.toISOString();
        } else {
          // For timed events, combine date and time
          const [year, month, day] = formData.end_date.split('-').map(Number);
          const [hours, minutes] = formData.end_time.split(':').map(Number);
          const localDate = new Date(year, month - 1, day, hours, minutes, 0);
          endDateToSave = localDate.toISOString();
        }
      }

      const eventData = {
        id: formData.id,
        title: formData.title,
        description: formData.description,
        start_date: startDateToSave,
        end_date: endDateToSave,
        location: formData.location,
        category_id: formData.category_id ? parseInt(formData.category_id) : null,
        event_type_id: formData.event_type_id ? parseInt(formData.event_type_id) : null,
        is_whole_day: formData.is_whole_day,
        status: formData.status,
        attachments
      };

      // Update the event via the API
      await eventService.updateEvent(formData.id, eventData);

      // If there are new attachments to upload, upload them separately
      if (formData.id && attachments && attachments.length > 0) {
        const newAttachments = attachments.filter(attachment => attachment.file); // Only upload if it's a new file (not yet uploaded)
        
        if (newAttachments.length > 0) {
          const uploadPromises = newAttachments.map(attachment => {
            // Make sure the attachment.file has all required properties
            if (!attachment.file || !attachment.file.name || !attachment.file.size) {
              console.error('Invalid attachment file object:', attachment);
              return Promise.reject(new Error('Invalid attachment file'));
            }
            return attachmentService.uploadAttachment(attachment.file, null, formData.id); // Use event ID for event attachments
          });

          try {
            await Promise.all(uploadPromises);
            console.log('Attachments uploaded successfully');
          } catch (uploadError) {
            console.error('Error uploading attachments:', uploadError);
            // We'll continue even if attachment upload fails, just log the error
          }
        }
      }

      // Call the onSave callback if provided
      if (onSave) {
        onSave(eventData);
      }

      // Call the onEventUpdate callback to refresh calendar data if provided
      if (onEventUpdate) {
        onEventUpdate();
      }

      onClose();
    } catch (error) {
      console.error('Error submitting event:', error);
      // Set a general error message
      setValidationErrors({ general: 'Failed to save event: ' + (error.message || 'Unknown error') });
    } finally {
      // Reset saving state
      setSavingEvent(false);
    }
  };

  const handleAddCategory = () => {
    setShowNewCategoryModal(true);
  };

  const handleAddEventType = () => {
    setShowNewEventTypeModal(true);
  };

  const handleSaveCategory = async (newCategory) => {
    try {
      // Refresh the categories list after adding a new one
      const response = await eventCategoryService.getAllEventCategories();

      if (response) {
        let categoriesData = [];
        if (response && response.categories) {
          categoriesData = response.categories;
        } else if (response && response.data) {
          categoriesData = response.data;
        } else if (Array.isArray(response)) {
          categoriesData = response;
        }
        setCategories(categoriesData || []);

        // Set the newly created category as the selected category
        if (newCategory?.id) {
          setFormData(prev => ({
            ...prev,
            category_id: newCategory.id.toString()
          }));
        }
      }
    } catch (error) {
      console.error('Error saving category:', error);
    }
    setShowNewCategoryModal(false);
  };

  const handleSaveEventType = async (newEventType) => {
    try {
      // Refresh the event types list for the current category after adding a new one
      if (formData.category_id) {
        const response = await eventTypeService.getEventTypesByCategoryId(formData.category_id);

        if (response) {
          let eventTypesData = [];
          if (response && response.event_types) {
            eventTypesData = response.event_types;
          } else if (response && response.data) {
            eventTypesData = response.data;
          } else if (Array.isArray(response)) {
            eventTypesData = response;
          }
          setEventTypes(eventTypesData || []);

          // Set the newly created event type as the selected event type
          if (newEventType?.id) {
            setFormData(prev => ({
              ...prev,
              event_type_id: newEventType.id.toString()
            }));
          }
        }
      }
    } catch (error) {
      console.error('Error saving event type:', error);
    }
    setShowNewEventTypeModal(false);
  };


  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Event" size="lg">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input
          label="Title"
          id="event-title"
          name="title"
          type="text"
          placeholder="e.g., Team Sync"
          value={formData.title}
          onChange={handleChange}
          error={validationErrors.title}
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
            <Input
              id="start-date"
              name="start_date"
              type="date"
              value={formData.start_date}
              onChange={handleChange}
              error={validationErrors.start_date}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Time</label>
            <Input
              id="start-time"
              name="start_time"
              type="time"
              value={formData.start_time}
              onChange={handleChange}
              disabled={formData.is_whole_day}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
            <Input
              id="end-date"
              name="end_date"
              type="date"
              value={formData.end_date}
              onChange={handleChange}
              error={validationErrors.end_date}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Time</label>
            <Input
              id="end-time"
              name="end_time"
              type="time"
              value={formData.end_time}
              onChange={handleChange}
              disabled={formData.is_whole_day}
            />
          </div>
        </div>

        <div className="flex items-center">
          <input
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
            id="whole-day"
            name="is_whole_day"
            type="checkbox"
            checked={formData.is_whole_day}
            onChange={handleChange}
          />
          <label className="ml-2 block text-sm text-gray-900 dark:text-gray-300" htmlFor="whole-day">Whole Day</label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
          <div className="mt-1 flex items-center space-x-2">
            <Select
              id="event-category"
              name="category_id"
              options={categories.map(cat => ({ value: cat.id?.toString(), label: cat.name }))}
              value={formData.category_id}
              onChange={handleChange}
            />
            <Button
              size="sm"
              variant="outline"
              type="button"
              onClick={handleAddCategory}
            >
              <span className="material-symbols-outlined">add</span>
            </Button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Event Type</label>
          <div className="mt-1 flex items-center space-x-2">
            <Select
              id="event-type"
              name="event_type_id"
              options={eventTypes.map(type => ({ value: type.id?.toString(), label: type.name }))}
              value={formData.event_type_id}
              onChange={handleChange}
              disabled={!formData.category_id} // Disable if no category is selected
            />
            <Button
              size="sm"
              variant="outline"
              type="button"
              onClick={handleAddEventType}
              disabled={!formData.category_id} // Disable if no category is selected
            >
              <span className="material-symbols-outlined">add</span>
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
            <input
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
              id="event-location"
              name="location"
              placeholder="e.g., Conference Room A"
              value={formData.location || ''}
              onChange={handleChange}
              type="text"
            />
          </div>

          {/* Status field */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
            <select
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
              id="event-status"
              name="status"
              value={formData.status}
              onChange={handleChange}
            >
              <option value="Scheduled">Scheduled</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Attachment icon */}
          <div className="flex flex-col items-center justify-end mt-5">
            <button
              type="button"
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2"
              onClick={() => document.getElementById('event-file-upload').click()}
            >
              <span className="material-symbols-outlined">attach_file</span>
            </button>
            <input
              id="event-file-upload"
              type="file"
              className="hidden"
              multiple
              onChange={handleFileChange}
            />
          </div>
        </div>

        {/* File attachments display */}
        {attachments.length > 0 && (
          <div>
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

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
          <textarea
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
            id="event-description"
            name="description"
            placeholder="Add a brief description..."
            value={formData.description}
            onChange={handleChange}
            rows="3"
          ></textarea>
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
            disabled={!dataLoaded || !formData.id || savingEvent}
          >
            {savingEvent ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </div>
            ) : (
              dataLoaded && formData.id ? 'Save Event' : (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Loading...
                </div>
              )
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

      {/* Event Type Modal */}
      <NewEventTypeModal
        isOpen={showNewEventTypeModal}
        onClose={() => setShowNewEventTypeModal(false)}
        onSave={handleSaveEventType}
        categoryId={formData.category_id} // Pass the selected category ID
      />
    </Modal>
  );
};

export default EditEventModal;