import React from 'react';

/**
 * Unified error and success display components for consistent UI
 */

// Base message component with consistent styling
const BaseMessage = ({ 
  type = 'error',
  title, 
  message, 
  onRetry, 
  showRetry = true,
  className = "",
  onDismiss
}) => {
  const isError = type === 'error';
  const isSuccess = type === 'success';
  const isWarning = type === 'warning';
  
  const bgColor = isError 
    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
    : isSuccess 
    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
    : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
    
  const textColor = isError
    ? 'text-red-800 dark:text-red-200'
    : isSuccess
    ? 'text-green-800 dark:text-green-200'
    : 'text-yellow-800 dark:text-yellow-200';
    
  const detailColor = isError
    ? 'text-red-700 dark:text-red-300'
    : isSuccess
    ? 'text-green-700 dark:text-green-300'
    : 'text-yellow-700 dark:text-yellow-300';
    
  const iconColor = isError
    ? 'text-red-400'
    : isSuccess
    ? 'text-green-400'
    : 'text-yellow-400';

  const icon = isError ? (
    <svg className={`h-5 w-5 ${iconColor}`} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </svg>
  ) : isSuccess ? (
    <svg className={`h-5 w-5 ${iconColor}`} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  ) : (
    <svg className={`h-5 w-5 ${iconColor}`} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  );

  return (
    <div className={`${bgColor} border rounded-lg p-4 ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {icon}
        </div>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className={`text-sm font-medium ${textColor}`}>
              {title}
            </h3>
          )}
          {message && (
            <div className={`mt-2 text-sm ${detailColor}`}>
              {message}
            </div>
          )}
          {(showRetry && onRetry) && (
            <div className="mt-4">
              <button
                onClick={onRetry}
                className={`${
                  isError 
                    ? 'bg-red-100 dark:bg-red-800 hover:bg-red-200 dark:hover:bg-red-700 text-red-800 dark:text-red-200'
                    : isSuccess
                    ? 'bg-green-100 dark:bg-green-800 hover:bg-green-200 dark:hover:bg-green-700 text-green-800 dark:text-green-200'
                    : 'bg-yellow-100 dark:bg-yellow-800 hover:bg-yellow-200 dark:hover:bg-yellow-700 text-yellow-800 dark:text-yellow-200'
                } px-3 py-2 rounded-md text-sm font-medium transition-colors`}
              >
                Try Again
              </button>
            </div>
          )}
        </div>
        {onDismiss && (
          <div className="ml-3 flex-shrink-0">
            <button
              onClick={onDismiss}
              className={`${iconColor} hover:opacity-75 transition-opacity`}
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Unified message component that can handle both errors and success
export const Message = ({ 
  error, 
  success, 
  onRetry, 
  onDismiss,
  className = "" 
}) => {
  if (error) {
    return (
      <BaseMessage
        type="error"
        title="Error"
        message={error}
        onRetry={onRetry}
        onDismiss={onDismiss}
        className={className}
      />
    );
  }

  if (success) {
    return (
      <BaseMessage
        type="success"
        title="Success"
        message={success}
        onDismiss={onDismiss}
        className={className}
      />
    );
  }

  return null;
};

// Legacy components for backward compatibility
export const ErrorMessage = ({ 
  title = "Something went wrong", 
  message, 
  onRetry, 
  showRetry = true,
  className = "" 
}) => (
  <BaseMessage
    type="error"
    title={title}
    message={message}
    onRetry={onRetry}
    showRetry={showRetry}
    className={className}
  />
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