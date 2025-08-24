import React from 'react';

export default function Card({ 
  children, 
  className = "", 
  maxWidth = "max-w-2xl",
  marginTop = "mt-4",
  padding = "p-6"
}) {
  return (
    <div className={`${maxWidth} mx-auto ${marginTop} bg-white dark:bg-gray-800 ${padding} rounded shadow ${className}`}>
      {children}
    </div>
  );
} 