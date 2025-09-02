import { useState, useEffect, useCallback } from 'react';
import { useAppData } from './useAppData';
import { useErrorHandler } from './useErrorHandler';
import { 
  filterMachinesByPreferences, 
  selectRandomMatchup 
} from '../utils/matchupSelectors';
import { replaceMachineInMatchup } from '../utils/matchupReplacement';

export const useMatchupData = (filter) => {
  const { machines, groups, user, userPreferences } = useAppData();
  const { handleError, withRetry, userError, clearMessages } = useErrorHandler('useMatchupData');
  const [matchup, setMatchup] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const [isVoting, setIsVoting] = useState(false);

  // Helper to handle loading states
  const setLoadingStates = (isFilterChange, isVoteChange) => {
    if (isFilterChange) {
      setIsFiltering(true);
    } else if (isVoteChange) {
      setIsVoting(true);
    } else {
      setIsLoading(true);
    }
  };

  // Helper to clear loading states
  const clearLoadingStates = () => {
    setIsLoading(false);
    setIsFiltering(false);
    setIsVoting(false);
  };

  // Main function to fetch matchup data
  const fetchMatchup = useCallback(async (isFilterChange = false, isVoteChange = false) => {
    if (!machines || !groups) {
      handleError('Machines and groups data not available', { action: 'fetchMatchup_validation' });
      return;
    }

    try {
      setLoadingStates(isFilterChange, isVoteChange);
      clearMessages(); // Clear any previous error messages
      
      // Use retry mechanism for data fetching
      const result = await withRetry(async () => {
        const filteredMachines = filterMachinesByPreferences(machines, filter, user, userPreferences);
        const selectedMachines = selectRandomMatchup(filteredMachines, groups);
        
        return {
          machines: selectedMachines,
          groups: groups,
        };
      }, {
        maxRetries: 2,
        delay: 500,
        context: { action: 'fetchMatchup', filter }
      });

      setMatchup(result);
      clearLoadingStates();
    } catch (err) {
      handleError(err, { 
        action: 'fetchMatchup', 
        metadata: { filter, isFilterChange, isVoteChange },
        userMessage: 'Failed to load pinball machines. Please try again.'
      });
      clearLoadingStates();
    }
  }, [filter, user, userPreferences, machines, groups, handleError, withRetry, clearMessages]);

  // Replace a specific machine with a new one
  const replaceMachine = useCallback(async (machineIndex) => {
    const result = await replaceMachineInMatchup(machineIndex, matchup, filter, user, userPreferences);
    
    if (result.needsRefresh) {
      // Force a complete refresh to get new options
      fetchMatchup(false, true);
      return false;
    }
    
    if (result.success && result.newMachine) {
      // Update the matchup with the new machine
      const newMachines = [...matchup.machines];
      newMachines[machineIndex] = result.newMachine;
      
      setMatchup({
        machines: newMachines,
        groups: matchup.groups,
      });
      
      return true; // Success
    }
    
    return false; // Failed
  }, [matchup, filter, user, userPreferences, fetchMatchup]);

  return {
    matchup,
    error: userError, // Use centralized error state
    isLoading,
    isFiltering,
    isVoting,
    fetchMatchup,
    replaceMachine,
    clearError: clearMessages
  };
}; 