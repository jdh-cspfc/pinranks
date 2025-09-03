import React from 'react';
import { MatchupManager } from './Matchup/index.js';
import { useAppData } from '../hooks/useAppData';
import { useMatchupActions } from '../hooks/useMatchupActions';

export default function Matchup() {
  const { user, userPreferences, isUserDataLoading } = useAppData();
  const { confirmationMessage, createHandleHaventPlayed } = useMatchupActions();
  
  const userPreferencesLoaded = !isUserDataLoading;

  return (
    <>
      {/* Minimal Toast Notification */}
      {confirmationMessage && (
        <div className="fixed bottom-2 left-1/2 transform -translate-x-1/2 sm:left-auto sm:transform-none sm:right-4 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-lg shadow-lg max-w-xs">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0"></div>
            <span className="text-xs">{confirmationMessage}</span>
          </div>
        </div>
      )}
      
      <MatchupManager 
        createHandleHaventPlayed={createHandleHaventPlayed}
      />
    </>
  );
}