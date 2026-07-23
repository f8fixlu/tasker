import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Select from '../common/Select';
import Button from '../common/Button';
import { categoryService } from '../../services/categoryService';
import { taskTypeService } from '../../services/taskTypeService';
import { Icon } from '../common/Icon';

const NewTaskTypeModal = ({ isOpen, onClose, onSave, categories: propCategories = [], selectedCategoryId = null }) => {
  const [formData, setFormData] = useState({
    name: '',
    category_id: selectedCategoryId || ''  // Pre-select the category if provided
  });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [loadingError, setLoadingError] = useState(null);

  useEffect(() => {
    if (isOpen && propCategories && propCategories.length > 0) {
      setCategories(propCategories);
      // Pre-select the category if provided and it exists in the list
      if (selectedCategoryId) {
        const categoryExists = propCategories.some(cat => cat.id.toString() === selectedCategoryId.toString());
        if (categoryExists) {
          setFormData(prev => ({
            ...prev,
            category_id: selectedCategoryId.toString()
          }));
        }
      }
    } else if (isOpen) {
      loadCategories();
    }
  }, [isOpen, selectedCategoryId]);

  // Separate effect to handle category selection after categories are loaded
  useEffect(() => {
    if (isOpen && categories.length > 0 && selectedCategoryId) {
      const categoryExists = categories.some(cat => cat.id.toString() === selectedCategoryId.toString());
      if (categoryExists && formData.category_id !== selectedCategoryId.toString()) {
        setFormData(prev => ({
          ...prev,
          category_id: selectedCategoryId.toString()
        }));
      }
    }
  }, [categories, isOpen, selectedCategoryId]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await categoryService.getAllCategories();
      setCategories(response.categories || response.data || []);
      setLoadingError(null); // Clear any previous loading error
    } catch (err) {
      console.error('Error loading categories:', err);
      setLoadingError(err.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

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
      newErrors.name = 'Task type name is required';
    } else if (formData.name.trim().length > 255) {
      newErrors.name = 'Task type name must be less than 255 characters';
    }

    if (!formData.category_id) {
      newErrors.category_id = 'Category is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setLoading(true);

      // Clear any previous errors
      setErrors({});

      // Call API to save the task type
      const response = await taskTypeService.createTaskType({
        name: formData.name,
        category_id: parseInt(formData.category_id)
      });

      if (onSave) {
        onSave(response.type || response.data);
      }

      // Reset form and close modal
      setFormData({
        name: '',
        category_id: ''
      });
      setErrors({});
      onClose();
    } catch (err) {
      console.error('Error creating task type:', err);
      if (err.data && err.data.error) {
        // Handle specific error from backend (like duplicate name)
        setErrors({ name: err.data.error });
      } else if (err.message) {
        setErrors({ name: err.message });
      } else {
        setErrors({ name: 'Failed to create task type. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading && isOpen && !categories.length) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Add New Task Type" size="md">
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <span className="ml-3">Loading categories...</span>
        </div>
      </Modal>
    );
  }

  if (loadingError && isOpen) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Add New Task Type" size="md">
        <div className="p-4 text-center">
          <p className="text-red-500 mb-4">Error: {loadingError}</p>
          <Button onClick={loadCategories} className="mb-4">Retry</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Task Type" size="md">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input
          label="Task Type Name*"
          id="task-type-name"
          name="name"
          type="text"
          placeholder="e.g., Design, Development"
          value={formData.name}
          onChange={handleChange}
          error={errors.name}
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category*</label>
          <div className="flex items-center gap-2">
            <Select
              id="category-id"
              name="category_id"
              options={categories.map(cat => ({ value: cat.id, label: cat.name }))}
              value={formData.category_id}
              onChange={handleChange}
              error={errors.category_id}
              required
            />
            <Button
              size="sm"
              variant="outline"
              type="button"
            >
              <Icon name="add" className="text-lg" />
            </Button>
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
              "Save Task Type"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default NewTaskTypeModal;