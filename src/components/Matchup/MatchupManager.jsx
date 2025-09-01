import React, { useState, useEffect } from 'react';
import { useMatchupData } from '../../hooks/useMatchupData';
import { useImageLoading } from '../../hooks/useImageLoading';
import { useUserPreferences } from '../../hooks/useUserPreferences';
import { useVoting } from '../../hooks/useVoting';
import FilterButtons from './FilterButtons';
import MatchupDisplay from './MatchupDisplay';

export default function MatchupManager() {
  try {
    const [filter, setFilter] = useState(['All']);
    
    // First, get user preferences (which includes user auth)
    const { user, userPreferences, userPreferencesLoaded, confirmationMessage, createHandleHaventPlayed } = useUserPreferences();
    
    // Then, get matchup data using the user info
    const { matchup, error, isLoading, isFiltering, isVoting, fetchMatchup, replaceMachine, setError } = useMatchupData(filter, user, userPreferences);
    
    // Create the handleHaventPlayed function with the replaceMachine dependency
    const handleHaventPlayed = createHandleHaventPlayed(replaceMachine);
    
    const { imageStates, bothImagesReady } = useImageLoading(matchup);
    const { clickedCard, handleVote } = useVoting(user, matchup, fetchMatchup, setError);

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
      return <div className="text-red-600">{error}</div>;
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
    console.error('Error in MatchupManager:', err);
    return (
      <div className="p-4 text-red-600">
        <h2>Error in MatchupManager</h2>
        <p>{err.message}</p>
        <pre>{err.stack}</pre>
      </div>
    );
  }
}