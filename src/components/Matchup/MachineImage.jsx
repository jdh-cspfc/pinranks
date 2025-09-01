import React from 'react';

// Component to handle individual machine image display with responsive layout
export default function MachineImage({ machine, name, imageUrl, imageState }) {
  // Show loading spinner only if this specific image is loading
  if (imageState.loading) {
    return (
      <>
        {/* Mobile layout */}
        <div className="flex-1 flex items-center justify-center sm:hidden">
          <div className="mx-auto mb-2 flex items-center justify-center w-full h-[18vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 dark:border-blue-400"></div>
          </div>
        </div>
        {/* Desktop layout */}
        <div className="hidden sm:absolute sm:inset-0 sm:flex sm:items-center sm:justify-center">
          <div className="mx-auto mb-2 flex items-center justify-center w-full h-64 lg:h-80 xl:h-96">
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
      <div className="flex-1 flex items-center justify-center sm:hidden">
        <img
          src={imageUrl}
          alt={name}
          className="mx-auto mb-2 object-contain max-h-[18vh] w-auto"
          style={{ maxWidth: '100%' }}
        />
      </div>
      {/* Desktop layout */}
      <div className="hidden sm:absolute sm:inset-0 sm:flex sm:items-center sm:justify-center">
        <img
          src={imageUrl}
          alt={name}
          className="mx-auto mb-2 object-contain max-h-64 lg:h-80 xl:h-96 w-auto"
          style={{ maxWidth: '100%' }}
        />
      </div>
    </>
  );
}