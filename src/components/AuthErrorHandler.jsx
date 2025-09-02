import React from 'react';
import { Message } from './ErrorDisplay';

/**
 * Component for displaying authentication error and success messages
 * Now uses the unified Message component for consistent styling
 */
export default function AuthErrorHandler({ formError, formSuccess }) {
  return (
    <Message 
      error={formError}
      success={formSuccess}
      className="mb-4"
    />
  );
}