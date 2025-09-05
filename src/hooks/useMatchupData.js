import { useState, useEffect, useCallback } from 'react';
import { useAppData } from './useAppData';
import { useErrorHandler } from './useErrorHandler';
import { 
  filterMachinesByPreferences, 
  selectRandomMatchup 
} from '../utils/matchupSelectors';
import { replaceMachineInMatchup } from '../utils/matchupReplacement';
import logger from '../utils/logger';

export const useMatchupData = (filter) => {
  const { machines, groups, user, userPreferences } = useAppData();
  const { handleError, withRetry, userError, clearMessages } = useErrorHandler('useMatchupData');
  const [matchup, setMatchup] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
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
      logger.debug('data', 'Machines and groups data not yet available, skipping fetch');
      return;
    }

    try {
      logger.debug('data', `Starting ${isFilterChange ? 'filter change' : isVoteChange ? 'vote change' : 'initial'} fetch for filter: ${filter}`);
      setLoadingStates(isFilterChange, isVoteChange);
      clearMessages(); // Clear any previous error messages
      
      // Use retry mechanism for data fetching
      const result = await withRetry(async () => {
        logger.debug('data', `Filtering ${machines.length} machines with filter: ${filter}`);
        const filteredMachines = filterMachinesByPreferences(machines, filter, user, userPreferences);
        logger.debug('data', `${filteredMachines.length} machines after filtering`);
        
        const selectedMachines = selectRandomMatchup(filteredMachines, groups);
        logger.debug('data', `Selected ${selectedMachines.length} machines for matchup`);
        
        return {
          machines: selectedMachines,
          groups: groups,
        };
      }, {
        maxRetries: 2,
        delay: 500,
        context: { action: 'fetchMatchup', filter }
      });

      logger.info('data', 'Successfully fetched matchup data');
      setMatchup(result);
      clearLoadingStates();
    } catch (err) {
      logger.error('data', `Failed to fetch matchup data: ${err.message}`);
      handleError(err, { 
        action: 'fetchMatchup', 
        metadata: { filter, isFilterChange, isVoteChange },
        userMessage: 'Failed to load pinball machines. Please try again.'
      });
      clearLoadingStates();
    }
  }, [filter, user, userPreferences, machines, groups, handleError, withRetry, clearMessages]);

  // Replace a specific machine with a new one
  const replaceMachine = useCallback(async (machineIndex, updatedBlockedMachines = null) => {
    logger.debug('data', `Attempting to replace machine at index ${machineIndex}`);
    
    // Use the provided updated blocked machines list if available, otherwise fall back to current userPreferences
    const blockedMachinesToUse = updatedBlockedMachines || userPreferences.blockedMachines;
    const userPreferencesToUse = updatedBlockedMachines ? 
      { ...userPreferences, blockedMachines: updatedBlockedMachines } : 
      userPreferences;
    
    const result = await replaceMachineInMatchup(machineIndex, matchup, filter, user, userPreferencesToUse);
    
    if (result.needsRefresh) {
      logger.debug('data', 'Needs refresh, fetching new matchup');
      // Force a complete refresh to get new options
      fetchMatchup(false, true);
      return false;
    }
    
    if (result.success && result.newMachine) {
      logger.info('data', `Successfully replaced machine with ${result.newMachine.name}`);
      // Update the matchup with the new machine
      const newMachines = [...matchup.machines];
      newMachines[machineIndex] = result.newMachine;
      
      setMatchup({
        machines: newMachines,
        groups: matchup.groups,
      });
      
      return true; // Success
    }
    
    logger.warn('data', 'Failed to replace machine');
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