import React, { useState, useEffect } from 'react';
import { useMatchupData } from '../../hooks/useMatchupData';
import { useImageLoading } from '../../hooks/useImageLoading';
import { useVoting } from '../../hooks/useVoting';
import { useAppData } from '../../hooks/useAppData';

import { LoadingError, Message } from '../ErrorDisplay';
import FilterButtons from './FilterButtons';
import MatchupDisplay from './MatchupDisplay';

export default function MatchupManager({ createHandleHaventPlayed }) {
  const { user, userPreferences, isUserDataLoading, machines, groups, isStaticDataLoading } = useAppData();
  const userPreferencesLoaded = !isUserDataLoading;
  const staticDataLoaded = !isStaticDataLoading && machines && groups;
  const [filter, setFilter] = useState(['All']);
  
  // Then, get matchup data using the centralized data
  const { matchup, error, isLoading, isFiltering, isVoting, fetchMatchup, replaceMachine } = useMatchupData(filter);
  
  // Create the handleHaventPlayed function with the replaceMachine dependency
  const handleHaventPlayed = createHandleHaventPlayed(replaceMachine);
  
  const { imageStates, bothImagesReady } = useImageLoading(matchup);
  const { clickedCard, handleVote, voteError, voteSuccess, clearVoteMessages } = useVoting(user, matchup, fetchMatchup);

  // ✅ Run on first load - but only after user preferences AND static data are loaded
  useEffect(() => {
    if (user && userPreferencesLoaded && staticDataLoaded) {
      fetchMatchup();
    }
  }, [user, userPreferencesLoaded, staticDataLoaded]);

  // Refetch when filter changes - but only if we have existing data
  useEffect(() => {
    if (matchup && !isLoading && userPreferences !== undefined) {
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
    return null; // Removed loading box for testing
  }

  // Filter out null machines (only when matchup exists)
  const validMachines = matchup?.machines?.filter(Boolean) || [];

  return (
    <>
      {/* Filter Buttons */}
      <FilterButtons filter={filter} onFilterChange={setFilter} />
      
      {/* Voting Error/Success Messages */}
      <Message 
        error={voteError}
        success={voteSuccess}
        onDismiss={clearVoteMessages}
        className="mb-4"
      />
      
      <MatchupDisplay
        matchup={matchup}
        validMachines={validMachines}
        isVoting={isVoting}
        imageStates={imageStates}
        clickedCard={clickedCard}
        userPreferences={userPreferences}
        handleVote={handleVote}
        handleHaventPlayed={handleHaventPlayed}
        replaceMachine={replaceMachine}
        fetchMatchup={fetchMatchup}
        isMachineBlocked={userPreferences.isMachineBlocked}
      />
    </>
  );
}