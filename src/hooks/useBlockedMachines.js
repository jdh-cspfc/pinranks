/**
 * Hook for managing blocked machines functionality
 * Provides a clean API for adding/removing blocked machines
 */

import { useErrorHandler } from './useErrorHandler';

export const useBlockedMachines = (appData) => {
  const { handleError } = useErrorHandler('useBlockedMachines');
  const { 
    user, 
    userPreferences, 
    isUserDataLoading,
    addBlockedMachine, 
    removeBlockedMachine, 
    isMachineBlocked 
  } = appData;

  return {
    // Data
    blockedMachines: userPreferences.blockedMachines,
    isLoading: isUserDataLoading,
    
    // Actions
    addBlockedMachine: async (groupId) => {
      if (!user) {
        throw new Error('You must be logged in to use this feature.');
      }
      return addBlockedMachine(groupId);
    },
    
    removeBlockedMachine: async (groupId) => {
      if (!user) {
        throw new Error('You must be logged in to use this feature.');
      }
      return removeBlockedMachine(groupId);
    },
    
    // Utilities
    isMachineBlocked,
    
    // Computed state
    hasBlockedMachines: userPreferences.blockedMachines.length > 0
  };
};