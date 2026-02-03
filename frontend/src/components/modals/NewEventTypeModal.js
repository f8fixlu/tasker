import React, { useState } from 'react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import Select from '../common/Select';
import { eventTypeService } from '../../services/eventTypeService';
import { eventCategoryService } from '../../services/eventCategoryService';

const NewEventTypeModal = ({ isOpen, onClose, onSave, categoryId }) => {
  const [formData, setFormData] = useState({
    name: '',
    category_id: categoryId || ''  // Use provided category or empty string
  });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Fetch categories when the modal opens
  React.useEffect(() => {
    if (isOpen) {
      const fetchCategories = async () => {
        try {
          const response = await eventCategoryService.getAllEventCategories();
          if (response && Array.isArray(response)) {
            setCategories(response.map(cat => ({
              value: cat.id,
              label: cat.name
            })));
          } else if (response && response.categories && Array.isArray(response.categories)) {
            setCategories(response.categories.map(cat => ({
              value: cat.id,
              label: cat.name
            })));
          }
        } catch (error) {
          console.error('Error fetching categories:', error);
          // Default categories if API fails
          setCategories([
            { value: 'meeting', label: 'Meeting' },
            { value: 'workshop', label: 'Workshop' },
            { value: 'deadline', label: 'Deadline' },
            { value: 'personal', label: 'Personal' }
          ]);
        }
      };

      fetchCategories();

      // Set the category if provided
      if (categoryId) {
        setFormData(prev => ({ ...prev, category_id: categoryId }));
      } else {
        setFormData(prev => ({ ...prev, name: '', category_id: '' }));
      }
    }
  }, [isOpen, categoryId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Event type name is required';
    } else if (formData.name.trim().length > 255) {
      newErrors.name = 'Event type name must be less than 255 characters';
    }

    if (!formData.category_id) {
      newErrors.category_id = 'Category is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation before submission
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Event type name is required';
    } else if (formData.name.trim().length > 255) {
      newErrors.name = 'Event type name must be less than 255 characters';
    }

    if (!formData.category_id) {
      newErrors.category_id = 'Category is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      const result = await eventTypeService.createEventType({
        name: formData.name.trim(),
        category_id: parseInt(formData.category_id, 10),
      });

      // Pass the created event type back to the parent
      if (onSave && result && result.event_type) {
        onSave(result.event_type);
      }

      // Reset form and close modal
      setFormData({
        name: '',
        category_id: categoryId || ''
      });
      setErrors({});
      onClose();
    } catch (error) {
      console.error('Error creating event type:', error);
      if (error.data && error.data.error) {
        // Handle specific error from backend (like duplicate name)
        setErrors({ name: error.data.error });
      } else if (error.message) {
        setErrors({ name: error.message });
      } else {
        setErrors({ name: 'Failed to create event type. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Event Type">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="event-type-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Event Type Name
          </label>
          <Input
            id="event-type-name"
            name="name"
            type="text"
            placeholder="e.g., Conference, Meeting, Workshop"
            value={formData.name}
            onChange={handleInputChange}
            error={errors.name}
          />
        </div>

        <div>
          <label htmlFor="event-type-category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Category
          </label>
          <Select
            id="event-type-category"
            name="category_id"
            options={categories}
            value={formData.category_id}
            onChange={handleInputChange}
            error={errors.category_id}
            disabled={!!categoryId} // Disable if category is preselected
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={loading}>
            Create Event Type
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default NewEventTypeModal;