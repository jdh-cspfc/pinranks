import React, { useMemo, useCallback } from 'react';
import { FILTER_OPTIONS } from '../../constants/filters';

export default function FilterButtons({ filter, onFilterChange }) {
  const handleFilterClick = useCallback((value) => {
    if (value === 'All') {
      onFilterChange(['All']);
    } else {
      onFilterChange(prev => {
        let next;
        if (prev.includes(value)) {
          next = prev.filter(f => f !== value);
        } else {
          next = [...prev.filter(f => f !== 'All'), value];
        }
        if (next.length === 0) return ['All'];
        return next;
      });
    }
  }, [onFilterChange]);

  // Memoized filter buttons to prevent flickering
  const FilterButtons = useMemo(() => (
    <div className="flex justify-center mt-3 mb-4">
      <button
        key="All"
        className={`px-2 py-1 sm:px-4 sm:py-2 border text-xs sm:text-sm font-medium transition-colors whitespace-nowrap mr-2 rounded
          ${filter.includes('All')
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-700 hover:bg-blue-100 dark:hover:bg-gray-700'}`}
        onClick={() => handleFilterClick('All')}
      >
        All
      </button>
      <div className="inline-flex shadow-sm gap-0">
        {FILTER_OPTIONS.filter(f => f.value !== 'All').map((f, idx, arr) => (
          <button
            key={f.value}
            className={`px-2 py-1 sm:px-4 sm:py-2 border text-sm sm:text-sm font-medium transition-colors whitespace-nowrap
              ${filter.includes(f.value)
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-700 sm:hover:bg-blue-100 dark:sm:hover:bg-gray-700 sm:active:bg-blue-200'}
              ${idx === 0 ? 'rounded-l' : ''}
              ${idx === arr.length - 1 ? 'rounded-r' : ''}
              ${idx > 0 ? '-ml-px' : ''}
            `}
            onClick={() => handleFilterClick(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  ), [filter, handleFilterClick]);

  return FilterButtons;
}