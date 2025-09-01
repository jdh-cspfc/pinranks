import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp, doc, runTransaction } from 'firebase/firestore';
import { useMatchupData } from '../../hooks/useMatchupData';
import { useImageLoading } from '../../hooks/useImageLoading';
import { useUserPreferences } from '../../hooks/useUserPreferences';
import FilterButtons from './FilterButtons';
import MachineCard from './MachineCard';

import { getFilterGroup } from '../../utils/matchupSelectors';

// Elo rating calculation
function calculateElo(winnerScore, loserScore, k = 32) {
  const expectedWin = 1 / (1 + Math.pow(10, (loserScore - winnerScore) / 400));
  const expectedLose = 1 / (1 + Math.pow(10, (winnerScore - loserScore) / 400));
  const newWinner = winnerScore + k * (1 - expectedWin);
  const newLoser = loserScore + k * (0 - expectedLose);
  return [Math.round(newWinner), Math.round(newLoser)];
}

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

    // Save vote to Firestore
    const saveVoteToFirestore = useCallback(async (winnerId, loserId) => {
      try {
        await addDoc(collection(db, 'userVotes'), {
          userId: user.uid,
          winnerId,
          loserId,
          timestamp: serverTimestamp(),
        });
      } catch (err) {
        console.error('Failed to save vote:', {
          userId: user.uid,
          winnerId,
          loserId,
          error: err.message
        });
        throw err;
      }
    }, [user]);

    // Update Elo rankings with transaction
    const updateEloRankings = useCallback(async (winnerId, loserId, winnerGroup, loserGroup) => {
      const rankingsRef = doc(db, 'userRankings', user.uid);
      const baseScore = 1200;

      try {
        await runTransaction(db, async (transaction) => {
          const rankingsSnap = await transaction.get(rankingsRef);
          let rankings = rankingsSnap.exists() ? rankingsSnap.data().rankings : {};
          
          // Helper to get or initialize Elo object
          const getEloObj = (obj) => obj && typeof obj === 'object' ? { ...obj } : { all: obj ?? baseScore };
          const winnerElo = getEloObj(rankings[winnerId]);
          const loserElo = getEloObj(rankings[loserId]);
          
          // Always update 'all' Elo
          const [newWinnerAll, newLoserAll] = calculateElo(winnerElo.all ?? baseScore, loserElo.all ?? baseScore);
          winnerElo.all = newWinnerAll;
          loserElo.all = newLoserAll;
          
          // Update filter-specific Elo if both are in the same group
          if (winnerGroup && winnerGroup === loserGroup) {
            const [newWinnerF, newLoserF] = calculateElo(
              winnerElo[winnerGroup] ?? baseScore,
              loserElo[winnerGroup] ?? baseScore
            );
            winnerElo[winnerGroup] = newWinnerF;
            loserElo[winnerGroup] = newLoserF;
          }
          
          rankings = {
            ...rankings,
            [winnerId]: winnerElo,
            [loserId]: loserElo,
          };
          
          transaction.set(rankingsRef, { rankings }, { merge: true });
        });
      } catch (err) {
        console.error('Failed to update Elo rankings:', {
          userId: user.uid,
          winnerId,
          loserId,
          error: err.message
        });
        throw err;
      }
    }, [user]);

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
          await saveVoteToFirestore(winnerId, loserId);
          await updateEloRankings(winnerId, loserId, winnerGroup, loserGroup);
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
    }, [user, matchup, handleVoteClick, saveVoteToFirestore, updateEloRankings, fetchMatchup]);

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