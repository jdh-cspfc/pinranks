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
      // For now, we'll just log to console
      // In production, you might want to send to Firebase Functions, Sentry, etc.
      console.log('Error reported:', errorEntry);
      
      // Example Firebase integration:
      // await firebase.functions().httpsCallable('logError')(errorEntry);
      
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
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
}

// Create singleton instance
const errorService = new ErrorService();

export default errorService;