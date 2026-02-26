import React, { useCallback, forwardRef } from 'react';
import PropTypes from 'prop-types';

const DataTable = forwardRef(({
  columns,
  data,
  onRowClick,
  selectedRows = [],
  onRowSelect,
  onSelectAll,
  showSelectAll = false,
  isLoading = false,
  emptyMessage = 'No records found',
  onColumnToggle,
  visibleColumns = {},
  columnTogglebuttonRef,
  columnVisibilityDropdown,
  columnVisibilityDropdownRef
}, ref) => {
  const handleRowClick = useCallback((item, index) => {
    if (onRowClick) {
      onRowClick(item, index);
    }
  }, [onRowClick]);

  const handleCheckboxChange = useCallback((itemId, e) => {
    if (onRowSelect) {
      onRowSelect(itemId, e.target.checked);
    }
  }, [onRowSelect]);

  const handleSelectAll = useCallback((e) => {
    if (onSelectAll) {
      onSelectAll(e.target.checked);
    }
  }, [onSelectAll]);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        <div className="animate-pulse">
          <div className="h-12 bg-gray-200 dark:bg-gray-700 mb-4"></div>
          <div className="h-16 bg-gray-200 dark:bg-gray-700 mb-4"></div>
          <div className="h-16 bg-gray-200 dark:bg-gray-700 mb-4"></div>
          <div className="h-16 bg-gray-200 dark:bg-gray-700"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
      <div className="overflow-x-visible scrollbar-hide">
        <table ref={ref} className="w-full text-left table-fixed">
          <thead className="bg-gray-50 dark:bg-gray-900/50 w-full">
            <tr className="w-full">
              {showSelectAll && (
                <th className="px-4 py-3 w-10 max-[768px]:w-auto max-[768px]:px-2 flex-shrink-0">
                  <input
                    type="checkbox"
                    className="rounded text-primary focus:ring-primary"
                    onChange={handleSelectAll}
                  />
                </th>
              )}
              {columns.map((column, index) => (
                <th
                  key={index}
                  className={`px-4 py-3 font-medium text-[#617589] dark:text-gray-400 capitalize ${column.key === 'actions' ? '' : 'text-left'} ${column.className || 'px-4 py-3'}`}
                  style={{ width: column.width || 'auto' }}
                >
                  <div className={`flex items-center ${column.key === 'actions' ? 'justify-center' : 'justify-start'}`}>
                    <span>{column.header}</span>
                    {column.key === 'actions' && onColumnToggle && (
                      <div className="relative inline-block">
                        <button
                          ref={columnTogglebuttonRef}
                          onClick={(e) => {
                            e.stopPropagation();
                            onColumnToggle(e);
                          }}
                          className="flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
                          title="Show/Hide Columns"
                        >
                          <span className="material-symbols-outlined text-base">filter_list</span>
                        </button>
                        {columnVisibilityDropdown && (
                          <div
                            ref={columnVisibilityDropdownRef}
                            className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg z-50 p-3 border border-gray-200 dark:border-gray-700"
                          >
                            {columnVisibilityDropdown}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {data.length > 0 ? (
              data.map((item, index) => (
                <tr
                  key={item.id || index}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-900/20 transition-colors duration-200 ${
                    onRowClick ? 'cursor-pointer' : ''
                  } ${selectedRows.includes(item.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                  onClick={() => handleRowClick(item, index)}
                >
                  {showSelectAll && (
                    <td className="px-4 py-4 w-10 max-[768px]:w-auto max-[768px]:px-2 flex-shrink-0">
                      <input
                        type="checkbox"
                        className="rounded text-primary focus:ring-primary"
                        checked={selectedRows.includes(item.id)}
                        onChange={(e) => handleCheckboxChange(item.id, e)}
                      />
                    </td>
                  )}
                  {columns.map((column, colIndex) => (
                    <td
                      key={colIndex}
                      className={`px-4 py-4 text-[#333333] dark:text-gray-200 align-middle ${column.className || 'px-4 py-4'}`}
                      style={{ width: column.width || 'auto' }}
                    >
                      {column.render
                        ? column.render(item[column.key], item, index)
                        : item[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length + (showSelectAll ? 1 : 0)}
                  className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
});

DataTable.propTypes = {
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      header: PropTypes.string.isRequired,
      key: PropTypes.string.isRequired,
      render: PropTypes.func,
      className: PropTypes.string
    })
  ).isRequired,
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
  onRowClick: PropTypes.func,
  selectedRows: PropTypes.array,
  onRowSelect: PropTypes.func,
  onSelectAll: PropTypes.func,
  showSelectAll: PropTypes.bool,
  isLoading: PropTypes.bool,
  emptyMessage: PropTypes.string,
  onColumnToggle: PropTypes.func,
  visibleColumns: PropTypes.object,
  columnTogglebuttonRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({ current: PropTypes.object })
  ]),
  columnVisibilityDropdown: PropTypes.node,
  columnVisibilityDropdownRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({ current: PropTypes.object })
  ])
};

DataTable.displayName = 'DataTable';

export default React.memo(DataTable);
