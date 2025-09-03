/**
 * Centralized error logging and handling service
 * Provides consistent error handling across the application
 */

class ErrorService {
  constructor() {
    this.errorQueue = [];
    this.isOnline = navigator.onLine;
    this.setupOnlineListener();
  }

  setupOnlineListener() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushErrorQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  /**
   * Log an error with context information
   * @param {Error|string} error - The error object or error message
   * @param {Object} context - Additional context about where the error occurred
   * @param {string} context.component - Component name where error occurred
   * @param {string} context.action - Action being performed when error occurred
   * @param {Object} context.metadata - Additional metadata
   */
  logError(error, context = {}) {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      error: this.serializeError(error),
      context: {
        component: context.component || 'Unknown',
        action: context.action || 'Unknown',
        metadata: context.metadata || {},
        userAgent: navigator.userAgent,
        url: window.location.href,
        userId: context.userId || null
      },
      severity: context.severity || 'error'
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Error in ${errorEntry.context.component}`);
      console.error('Error:', error);
      console.log('Context:', errorEntry.context);
      console.groupEnd();
    }

    // Store error for potential reporting
    this.errorQueue.push(errorEntry);

    // Try to send immediately if online, otherwise queue for later
    if (this.isOnline) {
      this.sendErrorToService(errorEntry);
    }

    return errorEntry;
  }

  /**
   * Log a warning (non-critical error)
   */
  logWarning(message, context = {}) {
    return this.logError(message, { ...context, severity: 'warning' });
  }

  /**
   * Log an info message
   */
  logInfo(message, context = {}) {
    return this.logError(message, { ...context, severity: 'info' });
  }

  /**
   * Serialize error object for logging
   */
  serializeError(error) {
    if (typeof error === 'string') {
      return { message: error, type: 'string' };
    }

    if (error instanceof Error) {
      return {
        message: error.message,
        name: error.name,
        stack: error.stack,
        type: 'Error'
      };
    }

    return {
      message: String(error),
      type: typeof error
    };
  }

  /**
   * Send error to external service (Firebase, Sentry, etc.)
   * This is where you'd integrate with your preferred error reporting service
   */
  async sendErrorToService(errorEntry) {
    try {
      // In production, you might want to send to Firebase Functions, Sentry, etc.
      // Example Firebase integration:
      // await firebase.functions().httpsCallable('logError')(errorEntry);
      
      // For now, we'll just store the error for potential future reporting
      // In a real application, you would:
      // 1. Send to Firebase Functions for server-side logging
      // 2. Send to Sentry for error tracking
      // 3. Send to analytics service for user behavior tracking
      // 4. Store in local storage for offline error reporting
      
      // Store in localStorage for potential debugging (only in development)
      if (process.env.NODE_ENV === 'development') {
        const existingErrors = JSON.parse(localStorage.getItem('errorLog') || '[]');
        existingErrors.push(errorEntry);
        // Keep only last 50 errors to prevent localStorage bloat
        if (existingErrors.length > 50) {
          existingErrors.splice(0, existingErrors.length - 50);
        }
        localStorage.setItem('errorLog', JSON.stringify(existingErrors));
      }
      
    } catch (reportingError) {
      // Silently fail to avoid infinite error loops
      // In production, you might want to use a different logging mechanism
    }
  }

  /**
   * Flush queued errors when back online
   */
  async flushErrorQueue() {
    if (!this.isOnline || this.errorQueue.length === 0) return;

    const errorsToSend = [...this.errorQueue];
    this.errorQueue = [];

    for (const error of errorsToSend) {
      await this.sendErrorToService(error);
    }
  }

  /**
   * Create a retry mechanism for failed operations
   */
  async withRetry(operation, options = {}) {
    const {
      maxRetries = 3,
      delay = 1000,
      backoffMultiplier = 2,
      context = {}
    } = options;

    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        this.logError(error, {
          ...context,
          action: `${context.action || 'operation'} (attempt ${attempt}/${maxRetries})`
        });

        if (attempt === maxRetries) {
          throw error;
        }

        // Wait before retrying with exponential backoff
        const waitTime = delay * Math.pow(backoffMultiplier, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    throw lastError;
  }

  /**
   * Get user-friendly error message from any error
   */
  getUserFriendlyMessage(error, context = {}) {
    // If it's a Firebase error, use the Firebase handler
    if (error.code && error.code.startsWith('auth/')) {
      return this.handleFirebaseError(error, context);
    }

    // Handle common error patterns
    if (typeof error === 'string') {
      return error;
    }

    if (error instanceof Error) {
      // Check for common error messages and make them user-friendly
      const message = error.message.toLowerCase();
      
      if (message.includes('network') || message.includes('fetch')) {
        return 'Network error. Please check your connection and try again.';
      }
      
      if (message.includes('permission') || message.includes('unauthorized')) {
        return 'You do not have permission to perform this action.';
      }
      
      if (message.includes('not found') || message.includes('404')) {
        return 'The requested resource was not found.';
      }
      
      if (message.includes('timeout')) {
        return 'The request timed out. Please try again.';
      }
      
      // For other errors, provide a generic message
      return 'Something went wrong. Please try again.';
    }

    return 'An unexpected error occurred. Please try again.';
  }

  /**
   * Handle Firebase-specific errors
   */
  handleFirebaseError(error, context = {}) {
    let userMessage = 'An unexpected error occurred. Please try again.';
    
    if (error.code) {
      switch (error.code) {
        case 'auth/user-not-found':
          userMessage = 'No account found with this email address.';
          break;
        case 'auth/wrong-password':
          userMessage = 'Incorrect password. Please try again.';
          break;
        case 'auth/email-already-in-use':
          userMessage = 'An account with this email already exists.';
          break;
        case 'auth/weak-password':
          userMessage = 'Password should be at least 6 characters.';
          break;
        case 'auth/network-request-failed':
          userMessage = 'Network error. Please check your connection.';
          break;
        case 'permission-denied':
          userMessage = 'You do not have permission to perform this action.';
          break;
        default:
          userMessage = `Error: ${error.message}`;
      }
    }

    this.logError(error, {
      ...context,
      action: 'firebase_operation',
      metadata: { firebaseCode: error.code, userMessage }
    });

    return userMessage;
  }

  /**
   * Get stored error logs (development only)
   * Useful for debugging and error analysis
   */
  getErrorLogs() {
    if (process.env.NODE_ENV !== 'development') {
      return [];
    }
    
    try {
      return JSON.parse(localStorage.getItem('errorLog') || '[]');
    } catch (error) {
      return [];
    }
  }

  /**
   * Clear stored error logs (development only)
   */
  clearErrorLogs() {
    if (process.env.NODE_ENV === 'development') {
      localStorage.removeItem('errorLog');
    }
  }

  /**
   * Get error statistics for monitoring
   */
  getErrorStats() {
    const logs = this.getErrorLogs();
    const stats = {
      total: logs.length,
      byComponent: {},
      bySeverity: {},
      recent: logs.slice(-10) // Last 10 errors
    };

    logs.forEach(log => {
      // Count by component
      const component = log.context.component;
      stats.byComponent[component] = (stats.byComponent[component] || 0) + 1;
      
      // Count by severity
      const severity = log.severity;
      stats.bySeverity[severity] = (stats.bySeverity[severity] || 0) + 1;
    });

    return stats;
  }
}

// Create singleton instance
const errorService = new ErrorService();

export default errorService;