import React from 'react';

/**
 * Component for displaying authentication error and success messages
 */
export default function AuthErrorHandler({ formError, formSuccess }) {
  if (formError) {
    return (
      <div className="bg-red-100 text-red-700 text-sm p-2 rounded">
        {formError}
      </div>
    );
  }

  if (formSuccess) {
    return (
      <div className="bg-green-100 text-green-700 text-sm p-2 rounded">
        {formSuccess}
      </div>
    );
  }

  return null;
}