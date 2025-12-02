import React from 'react';

/**
 * Reusable Toast Notification component with optional undo functionality
 * Replaces duplicated toast code across Matchup and Profile components
 */
export default function ToastNotification({ message, onDismiss }) {
  if (!message) return null;

  const messageText = typeof message === 'string' ? message : message.text;
  const onUndo = typeof message === 'object' ? message.onUndo : null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-3 rounded-lg shadow-lg">
      <div className={`flex items-center ${onUndo ? 'justify-between gap-4' : ''}`}>
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
          <div 
            className="text-sm break-words" 
            style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
          >
            {messageText}
          </div>
        </div>
        {onUndo && (
          <button 
            onClick={onUndo}
            className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 whitespace-nowrap flex-shrink-0 transition-colors"
          >
            Undo
          </button>
        )}
      </div>
    </div>
  );
}

