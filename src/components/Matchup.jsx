import React, { useState, useEffect, useRef } from 'react';
import { useMatchupData } from '../hooks/useMatchupData';
import { useImageLoading } from '../hooks/useImageLoading';
import { useVoting } from '../hooks/useVoting';
import { useMatchupActions } from '../hooks/useMatchupActions';

import { LoadingError, Message } from './ErrorDisplay';
import FilterButtons from './Matchup/FilterButtons';
import MachineCard from './Matchup/MachineCard';
import ToastNotification from './ToastNotification';
import LoadingState from './LoadingState';

export default function Matchup({ appData }) {
  const { user, userPreferences, userRankings, isUserDataLoading, machines, groups, isStaticDataLoading } = appData;
  const userPreferencesLoaded = !isUserDataLoading;
  const staticDataLoaded = !isStaticDataLoading && machines && groups;
  const [filter, setFilter] = useState(['All']);
  const hasInitialized = useRef(false);
  const isFetching = useRef(false);
  const previousFilter = useRef(['All']);
  
  // Get matchup data using the centralized data
  const { matchup, setMatchup, error, isLoading, isFiltering, isVoting, fetchMatchup } = useMatchupData(filter, appData);
  
  // Store the latest fetchMatchup function in a ref to avoid dependency issues
  const fetchMatchupRef = useRef(fetchMatchup);
  fetchMatchupRef.current = fetchMatchup;
  
  // Get matchup actions for handling "haven't played" functionality
  const { confirmationMessage, createHandleHaventPlayed } = useMatchupActions(
    appData, 
    matchup, 
    setMatchup, 
    filter, 
    fetchMatchup
  );
  
  // Create the handleHaventPlayed function
  const handleHaventPlayed = createHandleHaventPlayed();
  
  const { imageStates, bothImagesReady } = useImageLoading(matchup);
  const { clickedCard, handleVote, fanfareData, skipFanfare, voteError, voteSuccess, clearVoteMessages, updateFilterForNextMatchup } = useVoting(user, matchup, fetchMatchup, userRankings, appData, filter, setMatchup);

  // Run on first load - but only after user preferences AND static data are loaded
  useEffect(() => {
    if (user && userPreferencesLoaded && staticDataLoaded && !hasInitialized.current) {
      hasInitialized.current = true;
      fetchMatchupRef.current();
    }
  }, [user, userPreferencesLoaded, staticDataLoaded]);

  // Refetch when filter changes - but only if we have existing data and it's a real filter change
  useEffect(() => {
    // Only run if we have initialized, we're not currently fetching, and the filter actually changed
    const filterChanged = JSON.stringify(filter) !== JSON.stringify(previousFilter.current);
    if (hasInitialized.current && !isFetching.current && filterChanged) {
      previousFilter.current = [...filter];
      
      // If fanfare is active, update the next matchup to use the new filter instead of fetching immediately
      if (fanfareData) {
        if (updateFilterForNextMatchup) {
          updateFilterForNextMatchup(filter);
        }
      } else {
        // No fanfare active, fetch immediately
        isFetching.current = true;
        fetchMatchupRef.current(true).finally(() => {
          isFetching.current = false;
        }); // Pass true to indicate this is a filter change
      }
    }
  }, [filter, fanfareData, updateFilterForNextMatchup]); // Include fanfareData and updateFilterForNextMatchup

  if (error) {
    return (
      <LoadingError 
        onRetry={() => fetchMatchupRef.current()} 
        message={error}
      />
    );
  }

  // Show loading if user preferences or static data haven't been loaded yet
  if (!userPreferencesLoaded || !staticDataLoaded) {
    return <LoadingState />;
  }

  // Show loading if we haven't initialized yet (waiting for first fetch)
  if (!hasInitialized.current) {
    return <LoadingState message="Loading matchups..." />;
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
            fetchMatchup={fetchMatchup}
            isMachineBlocked={userPreferences.isMachineBlocked}
            fanfareData={fanfareData}
            skipFanfare={skipFanfare}
          />
        ))}
      </div>
    );
  };

  return (
    <>
      {/* Toast Notification with Undo */}
      <ToastNotification message={confirmationMessage} />

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