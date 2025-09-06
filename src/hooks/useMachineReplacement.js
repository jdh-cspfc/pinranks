/**
 * Hook for handling individual machine replacement within a matchup
 * Separated from matchup fetching to follow single responsibility principle
 */

import { useCallback } from 'react';
import { replaceMachineInMatchup } from '../utils/matchupReplacement';
import logger from '../utils/logger';

/**
 * Hook for replacing individual machines in a matchup
 * @param {Object} matchup - Current matchup state
 * @param {Function} setMatchup - Function to update matchup state
 * @param {Array} filter - Current filter array
 * @param {Object} user - Current user object
 * @param {Object} userPreferences - Current user preferences
 * @returns {Object} - { replaceMachine }
 */
export const useMachineReplacement = (matchup, setMatchup, filter, user, userPreferences) => {
  
  /**
   * Replace a specific machine with a new one
   * @param {number} machineIndex - Index of machine to replace
   * @param {Array} updatedBlockedMachines - Updated blocked machines list (optional)
   * @returns {Promise<Object>} - { success: boolean, newMachine?: Object, needsRefresh?: boolean }
   */
  const replaceMachine = useCallback(async (machineIndex, updatedBlockedMachines = null) => {
    if (!matchup || !matchup.machines || !matchup.machines[machineIndex]) {
      logger.warn('replacement', 'Invalid matchup or machine index for replacement');
      return { success: false, error: 'Invalid matchup or machine index' };
    }

    logger.debug('replacement', `Attempting to replace machine at index ${machineIndex}`);
    
    // Use the provided updated blocked machines list if available, otherwise fall back to current userPreferences
    const blockedMachinesToUse = updatedBlockedMachines || userPreferences.blockedMachines;
    const userPreferencesToUse = updatedBlockedMachines ? 
      { ...userPreferences, blockedMachines: updatedBlockedMachines } : 
      userPreferences;
    
    try {
      const result = await replaceMachineInMatchup(machineIndex, matchup, filter, user, userPreferencesToUse);
      
      if (result.needsRefresh) {
        logger.debug('replacement', 'Replacement failed, needs full refresh');
        return { success: false, needsRefresh: true };
      }
      
      if (result.success && result.newMachine) {
        logger.info('replacement', `Successfully replaced machine with ${result.newMachine.name}`);
        
        // Update the matchup with the new machine
        const newMachines = [...matchup.machines];
        newMachines[machineIndex] = result.newMachine;
        
        setMatchup({
          machines: newMachines,
          groups: matchup.groups,
        });
        
        return { success: true, newMachine: result.newMachine };
      }
      
      logger.warn('replacement', 'Replacement failed for unknown reason');
      return { success: false, error: 'Replacement failed' };
      
    } catch (error) {
      logger.error('replacement', `Error during machine replacement: ${error.message}`);
      return { success: false, error: error.message };
    }
  }, [matchup, setMatchup, filter, user, userPreferences]);

  return {
    replaceMachine
  };
};
