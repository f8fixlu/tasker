import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Select from '../common/Select';
import Button from '../common/Button';
import { taskTypeService } from '../../services/taskTypeService';
import { subTypeService } from '../../services/subTypeService';

const NewSubTypeModal = ({ isOpen, onClose, onSave, taskTypes: propTaskTypes = [], currentTypeId = null, selectedCategoryId = null }) => {
  const [formData, setFormData] = useState({
    name: '',
    type_id: currentTypeId || ''  // Pre-populate with current type if provided
  });
  const [taskTypes, setTaskTypes] = useState([]);
  const [filteredTaskTypes, setFilteredTaskTypes] = useState([]); // Task types filtered by selected category
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && propTaskTypes && propTaskTypes.length > 0) {
      setTaskTypes(propTaskTypes);
      let filtered = propTaskTypes;
      if (selectedCategoryId) {
        // Filter task types based on selected category
        filtered = propTaskTypes.filter(type => type.category_id == selectedCategoryId);
      }
      setFilteredTaskTypes(filtered);

      // Pre-select the task type if provided and it exists in the filtered list
      if (currentTypeId) {
        const typeExists = filtered.some(type => type.id.toString() === currentTypeId.toString());
        if (typeExists) {
          setFormData(prev => ({
            ...prev,
            type_id: currentTypeId.toString()
          }));
        }
      }
    } else if (isOpen) {
      loadTaskTypes();
    }
  }, [isOpen, selectedCategoryId, currentTypeId]);

  const loadTaskTypes = async () => {
    try {
      setLoading(true);
      let response;
      if (selectedCategoryId) {
        // Load task types filtered by selected category
        response = await taskTypeService.getAllTaskTypes({ category_id: selectedCategoryId });
        setFilteredTaskTypes(response.types || response.data || []);
      } else {
        // Load all task types
        response = await taskTypeService.getAllTaskTypes();
        setTaskTypes(response.types || response.data || []);
        setFilteredTaskTypes(response.types || response.data || []);
      }
    } catch (err) {
      console.error('Error loading task types:', err);
      setError(err.message || 'Failed to load task types');
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      // Call API to save the sub type
      const response = await subTypeService.createSubType({
        name: formData.name,
        type_id: parseInt(formData.type_id)
      });
      
      if (onSave) {
        onSave(response.subType || response.subtype || response.data);
      }
      
      onClose();
    } catch (err) {
      console.error('Error creating sub type:', err);
      // Check if it's a 409 conflict (duplicate name) error
      if (err.status === 409) {
        setError(err.data?.error || 'A sub type with this name already exists for this task type. Please choose a different name.');
      } else {
        setError(err.message || 'Failed to create sub type');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading && isOpen) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Add New Sub Type" size="md">
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <span className="ml-3">Loading task types...</span>
        </div>
      </Modal>
    );
  }

  if (error && isOpen) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Add New Sub Type" size="md">
        <div className="p-4 text-center">
          <p className="text-red-500 mb-4">Error: {error}</p>
          <Button onClick={loadTaskTypes} className="mb-4">Retry</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Sub Type" size="md">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input
          label="Sub Type Name*"
          id="sub-type-name"
          name="name"
          type="text"
          placeholder="e.g., UI/UX, Frontend"
          value={formData.name}
          onChange={handleChange}
          required
        />
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Task Type*</label>
          <div className="flex items-center gap-2">
            <Select
              id="type-id"
              name="type_id"
              options={filteredTaskTypes.map(type => ({ value: type.id, label: type.name }))}
              value={formData.type_id}
              onChange={handleChange}
              required
            />
            <Button 
              size="sm" 
              variant="outline"
              type="button"
            >
              <span className="material-symbols-outlined text-lg">add</span>
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
              "Save Sub Type"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default NewSubTypeModal;