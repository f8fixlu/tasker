import React, { useState } from 'react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import { eventCategoryService } from '../../services/eventCategoryService';

const NewEventCategoryModal = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    color: '#4A90E2' // Default blue color
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user types in the field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation before submission
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Category name is required';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Category name must be less than 100 characters';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setLoading(true);

      // Clear any previous errors
      setErrors({});

      // Call API to save the event category
      const response = await eventCategoryService.createEventCategory({
        name: formData.name,
        color: formData.color
      });

      if (onSave) {
        onSave(response.category || response);
      }

      // Reset form and close modal
      setFormData({
        name: '',
        color: '#4A90E2'
      });
      setErrors({});
      onClose();
    } catch (err) {
      console.error('Error creating event category:', err);
      if (err.data && err.data.error) {
        // Handle specific error from backend (like duplicate name)
        setErrors({ name: err.data.error });
      } else if (err.message) {
        setErrors({ name: err.message });
      } else {
        setErrors({ name: 'Failed to create event category. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Event Category" size="md">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input
          label="Event Category Name*"
          id="event-category-name"
          name="name"
          type="text"
          placeholder="e.g., Meeting, Workshop"
          value={formData.name}
          onChange={handleChange}
          error={errors.name}
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
          <div className="flex items-center gap-3">
            <input
              className="w-10 h-10 rounded-full border-0 cursor-pointer"
              id="event-category-color"
              name="color"
              type="color"
              value={formData.color}
              onChange={handleChange}
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">{formData.color}</span>
          </div>
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
            type={loading ? "button" : "submit"}
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </div>
            ) : (
              "Save Event Category"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default NewEventCategoryModal;