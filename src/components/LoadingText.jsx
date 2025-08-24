import React from 'react';

export default function LoadingText({ text, className = "" }) {
  return (
    <div className={`max-w-md mx-auto mt-4 bg-white dark:bg-gray-800 p-6 rounded shadow text-center ${className}`}>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
      <p className="mt-2 text-gray-600 dark:text-gray-400">{text}</p>
    </div>
  );
} 