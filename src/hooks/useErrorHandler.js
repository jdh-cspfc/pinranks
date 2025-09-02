import { useCallback, useState } from 'react';
import errorService from '../services/errorService';

/**
 * Enhanced error handling hook with consistent patterns for user feedback
 * Provides both logging and user-facing error management
 */
export const useErrorHandler = (componentName = 'Unknown') => {
  const [userError, setUserError] = useState(null);
  const [userSuccess, setUserSuccess] = useState(null);

  const handleError = useCallback((error, context = {}) => {
    // Log the error for debugging
    const errorEntry = errorService.logError(error, {
      component: componentName,
      ...context
    });

    // Set user-facing error message
    const userMessage = context.userMessage || errorService.getUserFriendlyMessage(error, context);
    setUserError(userMessage);
    
    // Clear success message if there was one
    setUserSuccess(null);

    return errorEntry;
  }, [componentName]);

  const handleFirebaseError = useCallback((error, context = {}) => {
    const userMessage = errorService.handleFirebaseError(error, {
      component: componentName,
      ...context
    });
    
    setUserError(userMessage);
    setUserSuccess(null);
    
    return userMessage;
  }, [componentName]);

  const handleSuccess = useCallback((message, context = {}) => {
    errorService.logInfo(message, {
      component: componentName,
      ...context
    });
    
    setUserSuccess(message);
    setUserError(null);
  }, [componentName]);

  const withRetry = useCallback((operation, options = {}) => {
    return errorService.withRetry(operation, {
      context: { component: componentName },
      ...options
    });
  }, [componentName]);

  const clearMessages = useCallback(() => {
    setUserError(null);
    setUserSuccess(null);
  }, []);

  const handleAsyncOperation = useCallback(async (operation, options = {}) => {
    const {
      successMessage,
      errorContext = {},
      showSuccess = true,
      showError = true
    } = options;

    try {
      clearMessages();
      const result = await operation();
      
      if (successMessage && showSuccess) {
        handleSuccess(successMessage);
      }
      
      return result;
    } catch (error) {
      if (showError) {
        handleError(error, errorContext);
      } else {
        // Still log the error even if not showing to user
        errorService.logError(error, {
          component: componentName,
          ...errorContext
        });
      }
      throw error;
    }
  }, [componentName, handleError, handleSuccess, clearMessages]);

  return {
    // Error handling functions
    handleError,
    handleFirebaseError,
    handleSuccess,
    handleAsyncOperation,
    withRetry,
    
    // User feedback state
    userError,
    userSuccess,
    clearMessages,
    
    // Legacy compatibility
    setError: setUserError,
    setSuccess: setUserSuccess
  };
};