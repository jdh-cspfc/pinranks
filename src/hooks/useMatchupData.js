import { useState, useEffect, useCallback } from 'react';
import { fetchMachinesAndGroups } from '../utils/matchupApi';
import { 
  filterMachinesByPreferences, 
  selectRandomMatchup 
} from '../utils/matchupSelectors';
import { replaceMachineInMatchup } from '../utils/matchupReplacement';

export const useMatchupData = (filter, user, userPreferences) => {
  const [matchup, setMatchup] = useState(null);
  const [error, setError] = useState(null);
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
    try {
      setLoadingStates(isFilterChange, isVoteChange);
      
      const { machinesData, groupsData } = await fetchMachinesAndGroups();
      const filteredMachines = filterMachinesByPreferences(machinesData, filter, user, userPreferences);
      const selectedMachines = selectRandomMatchup(filteredMachines, groupsData);

      setMatchup({
        machines: selectedMachines,
        groups: groupsData,
      });
      
      clearLoadingStates();
    } catch (err) {
      console.error('Failed to fetch OPDB data:', err);
      console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      setError(`Failed to load pinball machines: ${err.message}`);
      clearLoadingStates();
    }
  }, [filter, user, userPreferences]);

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
    error,
    isLoading,
    isFiltering,
    isVoting,
    fetchMatchup,
    replaceMachine,
    setError,
    clearError: () => setError(null)
  };
}; 