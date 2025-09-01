import React, { useState, useEffect, useCallback } from 'react';
import { useMatchupData } from '../../hooks/useMatchupData';
import { useImageLoading } from '../../hooks/useImageLoading';
import { useUserPreferences } from '../../hooks/useUserPreferences';
import { processVote } from '../../services/votingService';
import FilterButtons from './FilterButtons';
import MachineCard from './MachineCard';
import { getFilterGroup } from '../../utils/matchupSelectors';

export default function MatchupContainer() {
  try {
    const [filter, setFilter] = useState(['All']);
    const [clickedCard, setClickedCard] = useState(null);
    
    // Custom hooks for complex logic
    const { user, userPreferences, userPreferencesLoaded, confirmationMessage, handleHaventPlayed } = useUserPreferences();
    const { matchup, error, isLoading, isFiltering, isVoting, fetchMatchup, replaceMachine, setError } = useMatchupData(filter, user, userPreferences);
    const { imageStates, bothImagesReady } = useImageLoading(matchup);

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

    // Handle UI feedback for vote click
    const handleVoteClick = useCallback((winnerIndex) => {
      setClickedCard(winnerIndex);
      setTimeout(() => {
        setClickedCard(null);
      }, 150);
    }, []);



    // Main vote handler - orchestrates the voting process
    const handleVote = useCallback(async (winnerIndex) => {
      if (!user) {
        setError('You must be logged in to vote.');
        return;
      }
      
      const { machines } = matchup;
      const winnerId = machines[winnerIndex].opdb_id;
      const loserId = machines[1 - winnerIndex].opdb_id;
      const winnerGroup = getFilterGroup(machines[winnerIndex].display);
      const loserGroup = getFilterGroup(machines[1 - winnerIndex].display);
      
      // Handle UI feedback
      handleVoteClick(winnerIndex);
      
      // Optimistically fetch next matchup
      fetchMatchup(false, true);
      
      // Save vote and update rankings in background
      (async () => {
        try {
          await processVote(user.uid, winnerId, loserId, winnerGroup, loserGroup);
        } catch (err) {
          // Fail silently for user, but log for debugging
          console.error('Vote process failed:', {
            userId: user.uid,
            winnerId,
            loserId,
            error: err.message
          });
        }
      })();
    }, [user, matchup, handleVoteClick, fetchMatchup]);

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
        
        {!matchup || !matchup.machines || matchup.machines.length < 2 ? (
          null // Removed loading box for testing
        ) : validMachines.length < 2 ? (
          <div className="text-center mt-10 text-gray-500">No matchups available for this filter.</div>
        ) : (
          <>
            <div className={`flex flex-col sm:grid sm:grid-cols-2 gap-3 sm:gap-6 ${isVoting ? 'opacity-75 pointer-events-none' : ''}`} style={{ height: 'calc(87vh - 110px)' }}>
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
                />
              ))}
            </div>
          </>
        )}
      </>
    );
  } catch (err) {
    console.error('Error in MatchupContainer:', err);
    return (
      <div className="p-4 text-red-600">
        <h2>Error in MatchupContainer</h2>
        <p>{err.message}</p>
        <pre>{err.stack}</pre>
      </div>
    );
  }
}