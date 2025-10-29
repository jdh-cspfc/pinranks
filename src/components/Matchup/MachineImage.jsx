import React from 'react';

// Component to handle individual machine image display with responsive layout
export default function MachineImage({ machine, name, imageUrl, imageState }) {
  // Show loading spinner only if this specific image is loading
  if (imageState.loading) {
    return (
      <>
        {/* Mobile layout */}
        <div className="mobile-card-image sm:hidden">
          <div className="mx-auto mb-2 flex items-center justify-center w-full h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 dark:border-blue-400"></div>
          </div>
        </div>
        {/* Desktop layout */}
        <div className="hidden sm:absolute sm:inset-0 sm:flex sm:items-center sm:justify-center sm:pt-16">
          <div className="mx-auto mb-2 flex items-center justify-center w-full h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 dark:border-blue-400"></div>
          </div>
        </div>
      </>
    );
  }

  if (!imageUrl) {
    return null;
  }

  return (
    <>
      {/* Mobile layout */}
      <div className="mobile-card-image sm:hidden">
        <img
          src={imageUrl}
          alt={name}
          className="mx-auto mb-2 object-contain w-auto"
          style={{ 
            maxHeight: '100%',
            maxWidth: '100%',
            height: 'auto',
            width: 'auto'
          }}
        />
      </div>
      {/* Desktop layout */}
      <div className="hidden sm:absolute sm:inset-0 sm:flex sm:items-center sm:justify-center sm:pt-16">
        <img
          src={imageUrl}
          alt={name}
          className="mx-auto mb-2 object-contain w-auto"
          style={{ 
            maxHeight: '70%',
            maxWidth: '100%',
            height: 'auto',
            width: 'auto'
          }}
        />
      </div>
    </>
  );
}