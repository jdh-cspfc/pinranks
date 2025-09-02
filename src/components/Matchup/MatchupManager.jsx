import React, { useState, useEffect } from 'react';
import { useMatchupData } from '../../hooks/useMatchupData';
import { useImageLoading } from '../../hooks/useImageLoading';
import { useUserPreferences } from '../../hooks/useUserPreferences';
import { useVoting } from '../../hooks/useVoting';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { LoadingError, Message } from '../ErrorDisplay';
import FilterButtons from './FilterButtons';
import MatchupDisplay from './MatchupDisplay';

export default function MatchupManager() {
  const { handleError } = useErrorHandler('MatchupManager');
  
  try {
    const [filter, setFilter] = useState(['All']);
    
    // First, get user preferences (which includes user auth)
    const { user, userPreferences, userPreferencesLoaded, confirmationMessage, createHandleHaventPlayed } = useUserPreferences();
    
    // Then, get matchup data using the centralized data
    const { matchup, error, isLoading, isFiltering, isVoting, fetchMatchup, replaceMachine } = useMatchupData(filter);
    
    // Create the handleHaventPlayed function with the replaceMachine dependency
    const handleHaventPlayed = createHandleHaventPlayed(replaceMachine);
    
    const { imageStates, bothImagesReady } = useImageLoading(matchup);
    const { clickedCard, handleVote, voteError, voteSuccess, clearVoteMessages } = useVoting(user, matchup, fetchMatchup);

    // ✅ Run on first load - but only after user preferences are loaded
    useEffect(() => {
      if (user && userPreferencesLoaded) {
        fetchMatchup();
      }
    }, [user, userPreferencesLoaded]);

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

    // Show loading if user preferences haven't been loaded yet
    if (!userPreferencesLoaded) {
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
  } catch (err) {
    handleError(err, { action: 'component_render' });
    return (
      <LoadingError 
        onRetry={() => window.location.reload()} 
        message="An unexpected error occurred in the matchup component"
      />
    );
  }
}