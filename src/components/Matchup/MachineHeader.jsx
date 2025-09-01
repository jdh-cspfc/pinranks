import React from 'react';

// Component to display machine header information
export default function MachineHeader({ name, year, manufacturer }) {
  return (
    <>
      <div className="w-full flex justify-center">
        <h2 className="text-lg sm:text-xl font-bold mb-1 sm:mb-2 text-gray-900 dark:text-gray-100 break-words leading-tight text-center" style={{ maxWidth: 'calc(100% - 4rem)' }}>
          {name}
        </h2>
      </div>
      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-1 sm:mb-2 w-full">
        <span>{year}</span>
        <span className="mx-1">·</span>
        <span>{manufacturer}</span>
      </p>
    </>
  );
}