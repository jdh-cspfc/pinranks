import React from 'react';

/**
 * Reusable Loading State component for consistent loading UI
 * Replaces duplicated loading divs across components
 */
export default function LoadingState({ message = 'Loading...', className = '' }) {
  return (
    <div className={`flex justify-center items-center h-64 ${className}`}>
      <div className="text-gray-500">{message}</div>
    </div>
  );
}

