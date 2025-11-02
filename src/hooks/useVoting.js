import { useState, useCallback } from 'react';
import { processVote } from '../services/votingService';
import { getFilterGroup } from '../utils/filterUtils';
import { UI_CONSTANTS } from '../constants/appConstants';
import { useErrorHandler } from './useErrorHandler';

export const useVoting = (user, matchup, fetchMatchup) => {
  const [clickedCard, setClickedCard] = useState(null);
  const { handleError, handleSuccess, userError, userSuccess, clearMessages } = useErrorHandler('useVoting');

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
      handleError('You must be logged in to vote.', { action: 'vote_authentication' });
      return;
    }
    
    const { machines } = matchup;
    // Extract group IDs (first part of opdb_id before '-')
    // Both votes and rankings use group IDs for consistency
    const winnerGroupId = machines[winnerIndex].opdb_id.split('-')[0];
    const loserGroupId = machines[1 - winnerIndex].opdb_id.split('-')[0];
    
    // Filter groups for category-specific rankings
    const winnerFilterGroup = getFilterGroup(machines[winnerIndex].display);
    const loserFilterGroup = getFilterGroup(machines[1 - winnerIndex].display);
    
    // Clear any previous messages
    clearMessages();
    
    // Handle UI feedback
    handleVoteClick(winnerIndex);
    
    // Optimistically fetch next matchup
    fetchMatchup(false, true);
    
    // Save vote and update rankings in background (queued automatically)
    try {
      await processVote(user.uid, winnerGroupId, loserGroupId, winnerFilterGroup, loserFilterGroup);
      // Success is handled optimistically by the UI (showing next matchup)
      // No need to show success message for normal voting flow
      // Rankings will be refreshed when user navigates to Rankings page
    } catch (err) {
      // Log the error and show user-friendly message
      handleError(err, { 
        action: 'process_vote', 
        metadata: { 
          userId: user.uid, 
          winnerGroupId,
          loserGroupId,
          winnerFilterGroup,
          loserFilterGroup
        },
        userMessage: 'Failed to save your vote. Your ranking may not be updated.'
      });
    }
  }, [user, matchup, handleVoteClick, handleError, clearMessages]);

  return {
    clickedCard,
    handleVote,
    // Expose error/success state for components that want to show feedback
    voteError: userError,
    voteSuccess: userSuccess,
    clearVoteMessages: clearMessages
  };
}; 