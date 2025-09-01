import React from 'react';

// Component to handle individual machine image display
export default function MachineImage({ machine, name, imageUrl, imageState }) {
  // Show loading spinner only if this specific image is loading
  if (imageState.loading) {
    return (
      <div className="mx-auto mb-2 flex items-center justify-center w-full h-[18vh] sm:h-64 lg:h-80 xl:h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 dark:border-blue-400"></div>
      </div>
    );
  }

  if (!imageUrl) {
    return null;
  }

  return (
    <img
      src={imageUrl}
      alt={name}
      className="mx-auto mb-2 object-contain max-h-[18vh] sm:max-h-64 lg:max-h-80 xl:h-96 w-auto"
      style={{ maxWidth: '100%' }}
    />
  );
}