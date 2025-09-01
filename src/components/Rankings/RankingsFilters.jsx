import React from 'react';
import { FILTER_OPTIONS } from '../../constants/filters';

/**
 * Component for rendering filter tabs in the rankings view
 * Handles tab selection and styling
 */
export default function RankingsFilters({ activeTab, onTabChange }) {
  return (
    <div className="flex justify-center mt-3 mb-6">
      <div className="inline-flex shadow-sm gap-0">
        {FILTER_OPTIONS.map((filter, idx, arr) => (
          <button
            key={filter.value}
            className={`px-2 py-1 md:px-4 md:py-2 border text-sm md:text-sm font-medium transition-colors whitespace-nowrap
              ${activeTab === filter.value
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-700 md:hover:bg-blue-100 dark:md:hover:bg-gray-700'}
              ${idx === 0 ? 'rounded-l' : ''}
              ${idx === arr.length - 1 ? 'rounded-r' : ''}
              ${idx > 0 ? '-ml-px' : ''}
            `}
            onClick={() => onTabChange(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>
    </div>
  );
}