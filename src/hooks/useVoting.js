import { useState, useCallback } from 'react';
import { processVote } from '../services/votingService';
import { getFilterGroup } from '../utils/filterUtils';
import { UI_CONSTANTS } from '../constants/appConstants';

export const useVoting = (user, matchup, fetchMatchup, setError) => {
  const [clickedCard, setClickedCard] = useState(null);

  // Handle UI feedback for vote click
  const handleVoteClick = useCallback((winnerIndex) => {
    setClickedCard(winnerIndex);
    setTimeout(() => {
      setClickedCard(null);
    }, UI_CONSTANTS.VOTE_CLICK_DURATION);
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
  }, [user, matchup, handleVoteClick, fetchMatchup, setError]);

  return {
    clickedCard,
    handleVote,
  };
}; 