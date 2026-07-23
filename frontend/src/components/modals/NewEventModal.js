import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Select from '../common/Select';
import Button from '../common/Button';
import NewEventCategoryModal from './NewEventCategoryModal';
import NewEventTypeModal from './NewEventTypeModal';
import { eventCategoryService } from '../../services/eventCategoryService';
import { eventTypeService } from '../../services/eventTypeService';
import { attachmentService } from '../../services/attachmentService';
import { eventService } from '../../services/eventService';
import { Icon } from '../common/Icon';

const NewEventModal = ({ isOpen, onClose, prefillData = {}, onSave }) => {
  const [formData, setFormData] = useState({
    title: '',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    wholeDay: false,
    category_id: '',
    event_type_id: '',
    description: '',
    location: '',
    status: 'Scheduled' // Default status
  });

  // Update form data when prefillData changes and modal opens
  useEffect(() => {
    if (isOpen && prefillData) {
      setFormData(prev => ({
        ...prev,
        ...prefillData
      }));
    }
  }, [isOpen, prefillData]);

  const [attachments, setAttachments] = useState([]);
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [showNewEventTypeModal, setShowNewEventTypeModal] = useState(false);
  const [categories, setCategories] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);
  const [isCategorySaving, setIsCategorySaving] = useState(false); // Prevent duplicate saving
  const [isEventTypeSaving, setIsEventTypeSaving] = useState(false); // Prevent duplicate saving for event types
  const [savingEvent, setSavingEvent] = useState(false); // Track saving state for event
  const [validationErrors, setValidationErrors] = useState({}); // Track validation errors

  // Fetch event categories from database
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        let response;
        try {
          response = await eventCategoryService.getAllEventCategories();
        } catch (apiError) {
          console.error('API error fetching event categories:', apiError);
          // Provide default categories in case of API error
          setCategories([
            { value: 'meeting', label: 'Meeting' },
            { value: 'workshop', label: 'Workshop' },
            { value: 'deadline', label: 'Deadline' },
            { value: 'personal', label: 'Personal' }
          ]);
          return; // Exit early on API error
        }

        // The response might be in different formats depending on the API
        let categoriesData = [];
        if (response && typeof response === 'object') {
          if (Array.isArray(response)) {
            // Response is directly an array
            categoriesData = response;
          } else if (response.categories && Array.isArray(response.categories)) {
            // Response has a categories property
            categoriesData = response.categories;
          } else if (response.data && Array.isArray(response.data)) {
            // Response has a data property containing the categories
            categoriesData = response.data;
          }
        } else if (Array.isArray(response)) {
          // Additional check for if response itself is an array
          categoriesData = response;
        }

        if (Array.isArray(categoriesData)) {
          setCategories(categoriesData.map(cat => ({
            value: cat.id,
            label: cat.name
          })));
        } else {
          // If categoriesData is not an array, set to empty array
          setCategories([]);
        }
      } catch (error) {
        console.error('Unexpected error in fetchCategories:', error);
        // Provide default categories in case of unexpected error
        setCategories([
          { value: 'meeting', label: 'Meeting' },
          { value: 'workshop', label: 'Workshop' },
          { value: 'deadline', label: 'Deadline' },
          { value: 'personal', label: 'Personal' }
        ]);
      }
    };

    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]); // Added proper dependency array

  // Fetch event types based on selected category
  useEffect(() => {
    const fetchEventTypes = async () => {
      if (formData.category_id) {
        try {
          let response;
          try {
            response = await eventTypeService.getEventTypesByCategoryId(formData.category_id);
          } catch (apiError) {
            console.error('API error fetching event types:', apiError);
            // Set to empty array in case of API error
            setEventTypes([]);
            return; // Exit early on API error
          }

          // The response might be in different formats depending on the API
          let eventTypesData = [];
          if (response && typeof response === 'object') {
            if (Array.isArray(response)) {
              // Response is directly an array
              eventTypesData = response;
            } else if (response.event_types && Array.isArray(response.event_types)) {
              // Response has an event_types property
              eventTypesData = response.event_types;
            } else if (response.data && Array.isArray(response.data)) {
              // Response has a data property containing the event types
              eventTypesData = response.data;
            }
          }

          if (Array.isArray(eventTypesData)) {
            setEventTypes(eventTypesData.map(type => ({
              value: type.id,
              label: type.name
            })));
          } else {
            // If eventTypesData is not an array, set to empty array
            setEventTypes([]);
          }
        } catch (error) {
          console.error('Unexpected error in fetchEventTypes:', error);
          // Set to empty array in case of unexpected error
          setEventTypes([]);
        }
      } else {
        // If no category is selected, clear the event types
        setEventTypes([]);
      }
    };

    if (isOpen) {
      fetchEventTypes();
    }
  }, [formData.category_id, isOpen]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
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

  const handleAddCategory = () => {
    setShowNewCategoryModal(true);
  };

  const handleAddEventType = () => {
    setShowNewEventTypeModal(true);
  };

  const handleSaveCategory = async (newCategory) => {
    // Prevent duplicate saving
    if (isCategorySaving) return;

    setIsCategorySaving(true);

    try {
      // The category was already created in NewEventCategoryModal,
      // so we just need to refresh the list of categories
      let response;
      try {
        response = await eventCategoryService.getAllEventCategories();
      } catch (apiError) {
        console.error('API error fetching event categories after creation:', apiError);
        return; // Exit early on API error
      }

      // Handle different response formats
      let categoriesData = [];
      if (response && typeof response === 'object') {
        if (Array.isArray(response)) {
          categoriesData = response;
        } else if (response.categories && Array.isArray(response.categories)) {
          categoriesData = response.categories;
        } else if (response.data && Array.isArray(response.data)) {
          categoriesData = response.data;
        }
      } else if (Array.isArray(response)) {
        categoriesData = response;
      }

      if (Array.isArray(categoriesData)) {
        setCategories(categoriesData.map(cat => ({
          value: cat.id,
          label: cat.name
        })));

        // Set the newly created category as the selected category
        // The newCategory parameter should contain the created category info
        const selectedCategoryId = newCategory?.id || categoriesData[categoriesData.length - 1]?.id;

        if (selectedCategoryId) {
          setFormData(prev => ({
            ...prev,
            category_id: selectedCategoryId.toString()
          }));
        }
      }

      console.log('Event categories refreshed after creation:', newCategory);
    } catch (error) {
      console.error('Unexpected error in handleSaveCategory:', error);
    } finally {
      setIsCategorySaving(false);
    }
    // Close the modal after saving
    setShowNewCategoryModal(false);
  };

  const handleSaveEventType = async (newEventType) => {
    // Prevent duplicate saving
    if (isEventTypeSaving) return;

    setIsEventTypeSaving(true);

    try {
      // Refresh the list of event types for the current category
      if (formData.category_id) {
        let response;
        try {
          response = await eventTypeService.getEventTypesByCategoryId(formData.category_id);
        } catch (apiError) {
          console.error('API error fetching event types after creation:', apiError);
          return; // Exit early on API error
        }

        // Handle different response formats
        let eventTypesData = [];
        if (response && typeof response === 'object') {
          if (Array.isArray(response)) {
            eventTypesData = response;
          } else if (response.event_types && Array.isArray(response.event_types)) {
            eventTypesData = response.event_types;
          } else if (response.data && Array.isArray(response.data)) {
            eventTypesData = response.data;
          }
        } else if (Array.isArray(response)) {
          eventTypesData = response;
        }

        if (Array.isArray(eventTypesData)) {
          setEventTypes(eventTypesData.map(type => ({
            value: type.id,
            label: type.name
          })));

          // Set the newly created event type as the selected event type
          // The newEventType parameter should contain the created event type info
          const selectedEventTypeId = newEventType?.id || eventTypesData[eventTypesData.length - 1]?.id;

          if (selectedEventTypeId) {
            setFormData(prev => ({
              ...prev,
              event_type_id: selectedEventTypeId.toString()
            }));
          }
        }

        console.log('Event types refreshed after creation:', newEventType);
      }
    } catch (error) {
      console.error('Unexpected error in handleSaveEventType:', error);
    } finally {
      setIsEventTypeSaving(false);
    }
    // Close the modal after saving
    setShowNewEventTypeModal(false);
  };

  // Function to generate a random color from a predefined palette
  const getRandomColor = () => {
    const colors = [
      'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
      'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
      'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
      'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200',
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200',
      'bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-200',
      'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200',
      'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200',
      'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200',
      'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-200',
      'bg-lime-100 text-lime-800 dark:bg-lime-900/50 dark:text-lime-200',
      'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Reset validation errors
    setValidationErrors({});

    // Set saving state to true
    setSavingEvent(true);

    // Define variables in outer scope to be accessible later
    let startDateTime = null;
    let endDateTime = null;

    // Validation
    const errors = {};
    if (!formData.title || formData.title.trim() === '') {
      errors.title = 'Title is required';
    }

    if (!formData.startDate) {
      errors.startDate = 'Start date is required';
    }

    if (!formData.endDate) {
      errors.endDate = 'End date is required';
    }

    // Validate that end date is not before start date
    if (formData.startDate && formData.endDate) {
      if (formData.wholeDay) {
        // For whole day events, preserve the date part
        if (formData.startDate) {
          const [year, month, day] = formData.startDate.split('-').map(Number);
          const localDate = new Date(year, month - 1, day, 0, 0, 0);
          startDateTime = localDate.toISOString();
        }
        if (formData.endDate) {
          const [year, month, day] = formData.endDate.split('-').map(Number);
          const localDate = new Date(year, month - 1, day, 23, 59, 59);
          endDateTime = localDate.toISOString();
        } else if (formData.startDate) {
          // If no end date specified for whole day event, use same date
          const [year, month, day] = formData.startDate.split('-').map(Number);
          const localDate = new Date(year, month - 1, day, 23, 59, 59);
          endDateTime = localDate.toISOString();
        }
      } else {
        // Format dates for timed events without timezone adjustments
        if (formData.startDate) {
          if (formData.startTime) {
            // Combine date and time
            const [year, month, day] = formData.startDate.split('-').map(Number);
            const [hours, minutes] = formData.startTime.split(':').map(Number);
            const localDate = new Date(year, month - 1, day, hours, minutes, 0);
            startDateTime = localDate.toISOString();
          } else {
            // Use date with start of day time (00:00:00)
            const [year, month, day] = formData.startDate.split('-').map(Number);
            const localDate = new Date(year, month - 1, day, 0, 0, 0);
            startDateTime = localDate.toISOString();
          }
        }

        if (formData.endDate) {
          if (formData.endTime) {
            // Combine date and time
            const [year, month, day] = formData.endDate.split('-').map(Number);
            const [hours, minutes] = formData.endTime.split(':').map(Number);
            const localDate = new Date(year, month - 1, day, hours, minutes, 0);
            endDateTime = localDate.toISOString();
          } else {
            // Use date with end of day time (23:59:59)
            const [year, month, day] = formData.endDate.split('-').map(Number);
            const localDate = new Date(year, month - 1, day, 23, 59, 59);
            endDateTime = localDate.toISOString();
          }
        }
      }

      // Validate that end date is not before start date
      if (startDateTime && endDateTime) {
        const startDateObj = new Date(startDateTime);
        const endDateObj = new Date(endDateTime);

        if (endDateObj < startDateObj) {
          errors.endDate = 'End date cannot be before start date';
        }
      }
    }

    // If there are validation errors, set them and return
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setSavingEvent(false);
      return;
    }

    try {
      // Prepare event data for submission (without attachments initially)
      const submissionData = {
        ...formData,
        start_date: startDateTime,
        end_date: endDateTime,
        is_whole_day: formData.wholeDay,
        // Ensure category_id is properly formatted as an integer or null
        category_id: formData.category_id ? parseInt(formData.category_id, 10) : null,
        // Ensure event_type_id is properly formatted as an integer or null
        event_type_id: formData.event_type_id ? parseInt(formData.event_type_id, 10) : null,
        // Don't send the original date/time fields to avoid confusion with backend
        startDate: undefined,
        startTime: undefined,
        endDate: undefined,
        endTime: undefined,
        // Don't send the original event type field if it exists
        event_type: undefined,
        // Add a random color class for the event display
        color_class: getRandomColor()
      };

      // Call the onSave function passed from the parent component with properly formatted dates
      if (onSave) {
        const result = await onSave(submissionData);

        // Extract event ID from the result - it could be in different formats
        let eventId = null;
        if (result && typeof result === 'object') {
          // Handle different possible response formats
          eventId = result.id ||
                   (result.event && result.event.id) ||
                   (result.data && result.data.id) ||
                   (result.event && result.event.Event && result.event.Event.id) ||
                   null;
        }

        // If we have an event ID and there are file attachments to upload, upload them after the event is created
        if (eventId && attachments.length > 0) {
          const uploadPromises = attachments
            .filter(attachment => attachment.file) // Only upload if it's a new file (not yet uploaded)
            .map(attachment =>
              attachmentService.uploadAttachment(attachment.file, null, eventId)
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
      }
      onClose(); // Close the modal after submission
    } catch (error) {
      console.error('Error saving event:', error);
      // You might want to show an error message to the user here
    } finally {
      // Reset saving state
      setSavingEvent(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Event" size="lg">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input
          label="Title"
          id="event-title"
          name="title"
          type="text"
          placeholder="e.g., Team Sync"
          value={formData.title}
          onChange={handleInputChange}
          error={validationErrors.title}
        />
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
            <Input
              id="start-date"
              name="startDate"
              type="date"
              value={formData.startDate}
              onChange={handleInputChange}
              error={validationErrors.startDate}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Time</label>
            <Input
              id="start-time"
              name="startTime"
              type="time"
              value={formData.startTime}
              onChange={handleInputChange}
              disabled={formData.wholeDay}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
            <Input
              id="end-date"
              name="endDate"
              type="date"
              value={formData.endDate}
              onChange={handleInputChange}
              error={validationErrors.endDate}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Time</label>
            <Input
              id="end-time"
              name="endTime"
              type="time"
              value={formData.endTime}
              onChange={handleInputChange}
              disabled={formData.wholeDay}
            />
          </div>
        </div>
        
        <div className="flex items-center">
          <input
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
            id="whole-day"
            name="wholeDay"
            type="checkbox"
            checked={formData.wholeDay}
            onChange={handleInputChange}
          />
          <label className="ml-2 block text-sm text-gray-900 dark:text-gray-300" htmlFor="whole-day">Whole Day</label>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
          <div className="mt-1 flex items-center space-x-2">
            <Select
              id="event-category"
              name="category_id"
              options={categories}
              value={formData.category_id}
              onChange={handleInputChange}
            />
            <Button
              size="sm"
              variant="outline"
              type="button"
              onClick={handleAddCategory}
            >
              <Icon name="add" className="" />
            </Button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Event Type</label>
          <div className="mt-1 flex items-center space-x-2">
            <Select
              id="event-type"
              name="event_type_id"
              options={eventTypes}
              value={formData.event_type_id}
              onChange={handleInputChange}
              disabled={!formData.category_id} // Disable if no category is selected
            />
            <Button
              size="sm"
              variant="outline"
              type="button"
              onClick={handleAddEventType}
              disabled={!formData.category_id} // Disable if no category is selected
            >
              <Icon name="add" className="" />
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
              onChange={handleInputChange}
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
              onChange={handleInputChange}
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
              <Icon name="attach_file" className="" />
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
                    <Icon name="description" className="text-gray-500 flex-shrink-0" />
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
                    <Icon name="close" className="" />
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
            onChange={handleInputChange}
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
            disabled={savingEvent}
          >
            {savingEvent ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </div>
            ) : (
              "Save Event"
            )}
          </Button>
        </div>
      </form>
      
      {/* Event Category Modal */}
      <NewEventCategoryModal
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

export default NewEventModal;