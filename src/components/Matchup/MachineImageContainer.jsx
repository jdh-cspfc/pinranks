import React from 'react';
import MachineImage from './MachineImage';

// Component to handle machine image display with responsive layout
export default function MachineImageContainer({ machine, name, imageUrl, imageState }) {
  return (
    <>
      <div className="flex-1 flex items-center justify-center sm:hidden">
        <MachineImage 
          machine={machine} 
          name={name} 
          imageUrl={imageUrl}
          imageState={imageState}
        />
      </div>
      <div className="hidden sm:absolute sm:inset-0 sm:flex sm:items-center sm:justify-center">
        <MachineImage 
          machine={machine} 
          name={name} 
          imageUrl={imageUrl}
          imageState={imageState}
        />
      </div>
    </>
  );
}