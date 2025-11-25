import { useState, useCallback, useRef } from 'react';
import { processVote } from '../services/votingService';
import { getFilterGroup } from '../utils/filterUtils';
import { UI_CONSTANTS } from '../constants/appConstants';
import { useErrorHandler } from './useErrorHandler';
import { calculateNewRankings, calculateRankingChange } from '../utils/rankingUtils';
import { filterMachinesByPreferences, selectRandomMatchup } from '../utils/matchupSelectors';
import { getImageUrl } from '../imageUtils';

export const useVoting = (user, matchup, fetchMatchup, userRankings, appData, filter, setMatchup) => {
  const [clickedCard, setClickedCard] = useState(null);
  const [fanfareData, setFanfareData] = useState(null);
  const transitionRef = useRef(null);
  const timeoutRef = useRef(null);
  const nextMatchupRef = useRef(null); // Store the next matchup so it can be updated
  const { handleError, userError, userSuccess, clearMessages } = useErrorHandler('useVoting');
  
  // Helper to get next matchup data without setting state
  const getNextMatchupData = useCallback((currentFilter) => {
    const { machines, groups, userPreferences } = appData;
    if (!machines || !groups) return null;
    
    const filteredMachines = filterMachinesByPreferences(machines, currentFilter, user, userPreferences);
    const selectedMachines = selectRandomMatchup(filteredMachines, groups);
    
    return {
      machines: selectedMachines,
      groups: groups,
    };
  }, [appData, user]);
  
  // Helper to preload images for machines and wait for them to load
  const preloadMatchupImages = useCallback(async (nextMatchup) => {
    if (!nextMatchup?.machines) return;
    
    const validMachines = nextMatchup.machines.filter(Boolean);
    if (validMachines.length < 2) return;
    
    // Preload images and wait for them to actually load in the browser
    const preloadPromises = validMachines.map(async (machine) => {
      const hasImage = machine?.images?.find(img => img.type === 'backglass')?.urls?.large;
      if (!hasImage) return;
      
      try {
        const url = await getImageUrl(machine, 'large');
        if (!url) return;
        
        // Create an Image object and wait for it to load in browser cache
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = resolve;
          img.onerror = resolve; // Resolve even on error
          img.src = url;
        });
      } catch {
        // Silently fail - images will load normally when needed
      }
    });
    
    await Promise.all(preloadPromises);
  }, []);

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
    
    // Calculate ranking changes for fanfare
    // Always calculate fanfare, even if rankings are empty (will show "NEW")
    const currentRankings = userRankings || [];
    const newRankings = calculateNewRankings(
      currentRankings,
      winnerGroupId,
      loserGroupId,
      winnerFilterGroup,
      loserFilterGroup
    );
    
    const winnerChange = calculateRankingChange(winnerGroupId, currentRankings, newRankings);
    const loserChange = calculateRankingChange(loserGroupId, currentRankings, newRankings);
    
    // Set fanfare data to trigger the animation
    setFanfareData({
      winner: {
        groupId: winnerGroupId,
        ...winnerChange
      },
      loser: {
        groupId: loserGroupId,
        ...loserChange
      }
    });
    
    // Get next matchup data and preload images, but DON'T set it yet
    // We'll set it after the fanfare is done
    const fanfareStartTime = Date.now();
    const FANFARE_MIN_DURATION = 2500; // 2.5 seconds minimum
    
    const nextMatchup = getNextMatchupData(filter || ['All']);
    nextMatchupRef.current = nextMatchup; // Store in ref so it can be updated
    
    // Helper to transition to next matchup after fanfare
    const transitionToNextMatchup = () => {
      // Clear any pending timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setFanfareData(null);
      transitionRef.current = null; // Clear the ref
      const matchupToUse = nextMatchupRef.current; // Use the ref value (may have been updated)
      if (setMatchup && matchupToUse) {
        setMatchup(matchupToUse);
      } else {
        fetchMatchup(false, true);
      }
      nextMatchupRef.current = null; // Clear the ref
    };
    
    // Store transition function in ref so it can be called early
    transitionRef.current = transitionToNextMatchup;
    
    if (nextMatchup) {
      // Preload images for the next matchup while fanfare is showing
      preloadMatchupImages(nextMatchup).finally(() => {
        // Only transition if ref still exists (hasn't been called early)
        if (transitionRef.current) {
          // Calculate how long we've been showing fanfare
          const elapsed = Date.now() - fanfareStartTime;
          const remaining = Math.max(0, FANFARE_MIN_DURATION - elapsed);
          
          // Wait for remaining fanfare time, then set the new matchup
          timeoutRef.current = setTimeout(() => {
            if (transitionRef.current) {
              transitionRef.current();
            }
          }, remaining);
        }
      });
    } else {
      // No next matchup, just clear fanfare after delay
      timeoutRef.current = setTimeout(() => {
        if (transitionRef.current) {
          transitionRef.current();
        }
      }, FANFARE_MIN_DURATION);
    }
    
    // Save vote and update rankings in background (queued automatically)
    // Note: This happens in parallel with the fanfare display
    try {
      await processVote(user.uid, winnerGroupId, loserGroupId, winnerFilterGroup, loserFilterGroup);
      // Success is handled optimistically by the UI (showing next matchup)
      // No need to show success message for normal voting flow
      // Rankings will be refreshed when user navigates to Rankings page
    } catch (err) {
      // Clear fanfare on error
      setFanfareData(null);
      // Cancel the delayed matchup fetch on error
      // (The setTimeout will still run, but that's okay - it will just fetch a new matchup)
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
  }, [user, matchup, handleVoteClick, handleError, clearMessages, userRankings, filter, getNextMatchupData, preloadMatchupImages]);

  // Function to skip fanfare early and transition to next matchup
  // Adds a small delay to allow visual feedback to be seen
  const skipFanfare = useCallback(() => {
    if (transitionRef.current) {
      // Small delay to show visual feedback before transitioning
      setTimeout(() => {
        if (transitionRef.current) {
          transitionRef.current();
        }
      }, 150); // 150ms delay to see the click animation
    }
  }, []);
  
  // Function to update the next matchup when filter changes during fanfare
  const updateFilterForNextMatchup = useCallback((newFilter) => {
    if (fanfareData && transitionRef.current) {
      // Fanfare is active, update the next matchup with the new filter
      const newNextMatchup = getNextMatchupData(newFilter || ['All']);
      nextMatchupRef.current = newNextMatchup;
      
      // Preload images for the new matchup in the background
      if (newNextMatchup) {
        preloadMatchupImages(newNextMatchup).catch(() => {
          // Silently fail - images will load normally when needed
        });
      }
    }
  }, [fanfareData, getNextMatchupData, preloadMatchupImages]);

  return {
    clickedCard,
    handleVote,
    fanfareData,
    skipFanfare,
    updateFilterForNextMatchup,
    // Expose error/success state for components that want to show feedback
    voteError: userError,
    voteSuccess: userSuccess,
    clearVoteMessages: clearMessages
  };
}; 