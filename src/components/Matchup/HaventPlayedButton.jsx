import React from 'react';
import { useErrorHandler } from '../../hooks/useErrorHandler';

// Component to handle the "haven't played" button with all its complex logic
export default function HaventPlayedButton({ 
  index, 
  isAlreadyMarked, 
  groupId, 
  userPreferences, 
  handleHaventPlayed, 
  matchup, 
  fetchMatchup 
}) {
  const { handleError } = useErrorHandler('HaventPlayedButton');
  // Mobile-specific state consistency checks
  const isMobile = window.innerWidth < 640;

  return (
    <div className="absolute top-0 right-0 w-11 h-11 sm:w-[75px] sm:h-[65px] flex items-center justify-center">
      <button
        onClick={async (e) => {
          e.stopPropagation();
          if (!isAlreadyMarked) {
            try {
              await handleHaventPlayed(index, matchup);
            } catch (err) {
              console.error('handleHaventPlayed failed:', err);
              handleError(err, { 
                action: 'mark_havent_played', 
                metadata: { index, groupId, machineName: matchup?.machines?.[index]?.name }
              });
            }
          } else {
            // If machine is already marked but still visible, force a refresh
            fetchMatchup(false, true);
          }
        }}
        className={`haven-played-btn w-5 h-5 sm:w-[70px] sm:h-[60px] flex items-center justify-center rounded-full transition-colors z-10 ${
          isAlreadyMarked
            ? 'text-gray-400 dark:text-gray-500 cursor-pointer hover:text-red-600 dark:hover:text-red-400'
            : 'text-red-600 dark:text-red-400 cursor-pointer'
        }`}
        title={isAlreadyMarked ? "Already marked - click to refresh" : "Mark as haven't played"}
        disabled={false}
        style={{
          backgroundColor: 'transparent',
          background: 'transparent',
          WebkitTapHighlightColor: 'transparent'
        }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M20 12H4" />
        </svg>
      </button>
    </div>
  );
}