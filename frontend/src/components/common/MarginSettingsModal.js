import React from 'react';
import Modal from './Modal';
import Button from './Button';

const sections = [
  {
    title: 'Page Margins',
    key: 'page',
    fields: [
      { key: 'page', label: 'Page' },
    ],
  },
  {
    title: 'Header',
    key: 'header',
    fields: [
      { key: 'customHeader', label: 'Custom Header Image' },
      { key: 'defaultHeader', label: 'Default Header' },
    ],
  },
  {
    title: 'Content',
    key: 'content',
    fields: [
      { key: 'reportTitle', label: 'Report Title' },
      { key: 'dateRange', label: 'Date Range' },
      { key: 'taskSection', label: 'Task Section Wrapper' },
      { key: 'dateHeader', label: 'Date Header' },
      { key: 'firstEventLine', label: 'First Event Line' },
      { key: 'eachActivity', label: 'Each Activity' },
    ],
  },
  {
    title: 'Signatory',
    key: 'signatory',
    fields: [
      { key: 'signatoryTitle', label: 'Signatory Title' },
      { key: 'signatoryName', label: 'Signatory Name' },
      { key: 'signatoryPosition', label: 'Signatory Position' },
      { key: 'signatoryWrapper', label: 'Signatory Wrapper' },
      { key: 'spacer', label: 'Spacer Before Signatory' },
    ],
  },
  {
    title: 'Footer',
    key: 'footer',
    fields: [
      { key: 'footerLeft', label: 'Left Column' },
      { key: 'footerRight', label: 'Right Column' },
      { key: 'footerImage', label: 'Footer Image' },
    ],
  },
];

const MarginInput = ({ label, value, onChange }) => (
  <div className="flex items-center gap-2">
    <span className="text-xs text-gray-500 dark:text-gray-400 w-12">{label}</span>
    <div className="flex items-center gap-1">
      {['L', 'T', 'R', 'B'].map((pos, i) => (
        <div key={pos} className="flex items-center gap-0.5">
          <span className="text-[10px] text-gray-400 w-3">{pos}</span>
          <input
            type="number"
            value={value[i]}
            onChange={(e) => {
              const newVal = [...value];
              newVal[i] = Number(e.target.value);
              onChange(newVal);
            }}
            className="w-14 border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      ))}
    </div>
  </div>
);

const MarginSettingsModal = ({ isOpen, onClose, margins, onMarginsChange, overlay, transparent, zIndex, draggable }) => {
  const handleMarginChange = (key, newValue) => {
    onMarginsChange({ ...margins, [key]: newValue });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="PDF Margin Settings" size="2xl" {...{ overlay, transparent, zIndex, draggable }}>
      <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Customize margins for each element in the PDF. Values are in points (1pt = 1/72 inch).
        </p>
        {sections.map((section) => (
          <div key={section.key}>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 pb-1 border-b border-gray-200 dark:border-gray-700">
              {section.title}
            </h4>
            <div className="space-y-2">
              {section.fields.map((field) => (
                <MarginInput
                  key={field.key}
                  label={field.label}
                  value={margins[field.key] || [0, 0, 0, 0]}
                  onChange={(v) => handleMarginChange(field.key, v)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 flex justify-end gap-3 border-t border-gray-200 dark:border-gray-700 pt-4">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
};

export default MarginSettingsModal;
