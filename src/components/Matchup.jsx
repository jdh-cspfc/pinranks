import React, { useState, useEffect, useRef } from 'react';
import { useMatchupData } from '../hooks/useMatchupData';
import { useImageLoading } from '../hooks/useImageLoading';
import { useVoting } from '../hooks/useVoting';
import { useMatchupActions } from '../hooks/useMatchupActions';

import { LoadingError, Message } from './ErrorDisplay';
import FilterButtons from './Matchup/FilterButtons';
import MachineCard from './Matchup/MachineCard';

export default function Matchup({ appData }) {
  const { user, userPreferences, isUserDataLoading, machines, groups, isStaticDataLoading } = appData;
  const userPreferencesLoaded = !isUserDataLoading;
  const staticDataLoaded = !isStaticDataLoading && machines && groups;
  const [filter, setFilter] = useState(['All']);
  const hasInitialized = useRef(false);
  
  // Get matchup data using the centralized data
  const { matchup, error, isLoading, isFiltering, isVoting, fetchMatchup, replaceMachine } = useMatchupData(filter, appData);
  
  // Get matchup actions for handling "haven't played" functionality
  const { confirmationMessage, createHandleHaventPlayed } = useMatchupActions(appData);
  
  // Create the handleHaventPlayed function with the replaceMachine dependency
  const handleHaventPlayed = createHandleHaventPlayed(replaceMachine);
  
  const { imageStates, bothImagesReady } = useImageLoading(matchup);
  const { clickedCard, handleVote, voteError, voteSuccess, clearVoteMessages } = useVoting(user, matchup, fetchMatchup);

  // Run on first load - but only after user preferences AND static data are loaded
  useEffect(() => {
    if (user && userPreferencesLoaded && staticDataLoaded && !hasInitialized.current) {
      hasInitialized.current = true;
      fetchMatchup();
    }
  }, [user, userPreferencesLoaded, staticDataLoaded]);

  // Refetch when filter changes - but only if we have existing data
  useEffect(() => {
    // Only run if we have a matchup and we're not loading, and this is not the initial load
    if (matchup && !isLoading && userPreferences !== undefined && hasInitialized.current) {
      fetchMatchup(true); // Pass true to indicate this is a filter change
    }
  }, [filter]);

  if (error) {
    return (
      <LoadingError 
        onRetry={() => fetchMatchup()} 
        message={error}
      />
    );
  }

  // Show loading if user preferences or static data haven't been loaded yet
  if (!userPreferencesLoaded || !staticDataLoaded) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  // Show loading if we haven't initialized yet (waiting for first fetch)
  if (!hasInitialized.current) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading matchups...</div>
      </div>
    );
  }

  // Filter out null machines (only when matchup exists)
  const validMachines = matchup?.machines?.filter(Boolean) || [];

  // Render matchup display logic
  const renderMatchupDisplay = () => {
    if (!matchup || !matchup.machines || matchup.machines.length < 2) {
      return null;
    }
    
    // Don't render if we're still loading or filtering
    if (isLoading || isFiltering) {
      return null;
    }
    
    if (validMachines.length < 2) {
      return (
        <div className="text-center mt-10 text-gray-500">
          No matchups available for this filter.
        </div>
      );
    }

    return (
      <div 
        className={`mobile-card-container sm:grid sm:grid-cols-2 gap-3 sm:gap-6 ${isVoting ? 'opacity-75 pointer-events-none' : ''}`} 
      >
        {validMachines.map((machine, i) => (
          <MachineCard
            key={`${machine.opdb_id.split('-')[0]}-${i}-${machine.opdb_id}`}
            machine={machine}
            index={i}
            matchup={matchup}
            imageStates={imageStates}
            clickedCard={clickedCard}
            userPreferences={userPreferences}
            handleVote={handleVote}
            handleHaventPlayed={handleHaventPlayed}
            replaceMachine={replaceMachine}
            fetchMatchup={fetchMatchup}
            isMachineBlocked={userPreferences.isMachineBlocked}
          />
        ))}
      </div>
    );
  };

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

      {/* Filter Buttons - only show when we have a matchup */}
      {matchup && (
        <FilterButtons filter={filter} onFilterChange={setFilter} />
      )}
      
      {/* Voting Error/Success Messages */}
      <Message 
        error={voteError}
        success={voteSuccess}
        onDismiss={clearVoteMessages}
        className="mb-4"
      />
      
      {/* Matchup Display */}
      {renderMatchupDisplay()}
    </>
  );
}