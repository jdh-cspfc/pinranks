import React from 'react';

/**
 * Reusable error display components for consistent error UI
 */

export const ErrorMessage = ({ 
  title = "Something went wrong", 
  message, 
  onRetry, 
  showRetry = true,
  className = "" 
}) => (
  <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 ${className}`}>
    <div className="flex items-start">
      <div className="flex-shrink-0">
        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      </div>
      <div className="ml-3 flex-1">
        <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
          {title}
        </h3>
        {message && (
          <div className="mt-2 text-sm text-red-700 dark:text-red-300">
            {message}
          </div>
        )}
        {showRetry && onRetry && (
          <div className="mt-4">
            <button
              onClick={onRetry}
              className="bg-red-100 dark:bg-red-800 hover:bg-red-200 dark:hover:bg-red-700 text-red-800 dark:text-red-200 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  </div>
);

export const LoadingError = ({ onRetry, message = "Failed to load data" }) => (
  <div className="text-center py-8">
    <div className="text-red-500 text-4xl mb-4">⚠️</div>
    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
      {message}
    </h3>
    <p className="text-gray-600 dark:text-gray-300 mb-4">
      There was a problem loading the data. Please try again.
    </p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
      >
        Retry
      </button>
    )}
  </div>
);

export const NetworkError = ({ onRetry }) => (
  <ErrorMessage
    title="Connection Error"
    message="Please check your internet connection and try again."
    onRetry={onRetry}
    className="my-4"
  />
);

export const AuthError = ({ message, onRetry }) => (
  <ErrorMessage
    title="Authentication Error"
    message={message || "There was a problem with your login. Please try again."}
    onRetry={onRetry}
    className="my-4"
  />
);

export const DataError = ({ message, onRetry }) => (
  <ErrorMessage
    title="Data Error"
    message={message || "There was a problem loading your data. Please try again."}
    onRetry={onRetry}
    className="my-4"
  />
);