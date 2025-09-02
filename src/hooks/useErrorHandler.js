import { useCallback } from 'react';
import errorService from '../services/errorService';

/**
 * Custom hook for consistent error handling across components
 */
export const useErrorHandler = (componentName = 'Unknown') => {
  const handleError = useCallback((error, context = {}) => {
    return errorService.logError(error, {
      component: componentName,
      ...context
    });
  }, [componentName]);

  const handleFirebaseError = useCallback((error, context = {}) => {
    return errorService.handleFirebaseError(error, {
      component: componentName,
      ...context
    });
  }, [componentName]);

  const withRetry = useCallback((operation, options = {}) => {
    return errorService.withRetry(operation, {
      context: { component: componentName },
      ...options
    });
  }, [componentName]);

  return {
    handleError,
    handleFirebaseError,
    withRetry
  };
};