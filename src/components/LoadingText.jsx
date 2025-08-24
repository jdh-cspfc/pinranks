import React from 'react';
import Card from './Card';

export default function LoadingText({ text, className = "" }) {
  return (
    <Card maxWidth="max-w-md" className={`text-center ${className}`}>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
      <p className="mt-2 text-gray-600 dark:text-gray-400">{text}</p>
    </Card>
  );
} 