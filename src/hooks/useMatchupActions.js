/**
 * Hook for matchup-specific actions like "haven't played"
 * Handles the complex business logic for machine replacement and user preferences
 */

import { useBlockedMachines } from './useBlockedMachines';
import { useConfirmationMessage } from './useConfirmationMessage';
import { useMachineReplacement } from './useMachineReplacement';
import { UI_CONSTANTS } from '../constants/appConstants';
import { useErrorHandler } from './useErrorHandler';
import logger from '../utils/logger';

export const useMatchupActions = (appData, matchup, setMatchup, filter, fetchMatchup) => {
  const { handleError, handleAsyncOperation } = useErrorHandler('useMatchupActions');
  const { addBlockedMachine, blockedMachines } = useBlockedMachines(appData);
  const { message: confirmationMessage, showMessage, clearMessage, cleanup } = useConfirmationMessage();
  
  // Use the new machine replacement hook
  const { replaceMachine } = useMachineReplacement(matchup, setMatchup, filter, appData.user, appData.userPreferences);

  // Create a function that handles the "haven't played" logic
  const createHandleHaventPlayed = () => {
    return async (machineIndex, matchup) => {
      // Define variables outside try block so they're available in catch
      let machine, groupId, isMobile;
      
      try {
        machine = matchup.machines[machineIndex];
        groupId = machine.opdb_id.split('-')[0];
        isMobile = window.innerWidth < UI_CONSTANTS.MOBILE_BREAKPOINT;
        
        // OPTIMISTIC APPROACH: Update local state immediately for better UX
        // Create the updated blocked machines list locally
        const currentBlockedMachines = blockedMachines || [];
        
        // Check if machine is already blocked to prevent duplicates
        if (currentBlockedMachines.includes(groupId)) {
          // Machine is already blocked, just replace it without updating preferences
          const result = await replaceMachine(machineIndex, currentBlockedMachines);
          if (result.success) {
            showMessage(`${machine.name} has been replaced with a new machine`);
            return { success: true, machineName: machine.name };
          } else if (result.needsRefresh) {
            // Replacement failed, need full refresh
            fetchMatchup(false, true);
            return { success: false, needsRefresh: true };
          } else {
            throw new Error(result.error || 'Failed to replace machine. Please try again.');
          }
        }
        
        const updatedBlockedMachines = [...currentBlockedMachines, groupId];
        
        // Replace the machine immediately using the optimistic blocked machines list
        const result = await replaceMachine(machineIndex, updatedBlockedMachines);
        
        // Handle the result
        if (result.success) {
          // Machine replaced successfully
          showMessage(`${machine.name} has been added to your "Haven't Played" list`);
          
          // Update Firebase in the background (don't await this for better UX)
          logger.info('data', `Starting Firebase update for ${machine.name} (${groupId})`);
          addBlockedMachine(groupId)
            .then(() => {
              // Firebase update succeeded - no action needed
              logger.info('data', `Successfully saved ${machine.name} to blocked list in Firebase`);
            })
            .catch(err => {
              // Firebase update failed - log the error and show a subtle notification
              logger.error('data', `Failed to save ${machine.name} to blocked list: ${err.message}`);
              console.error('Firebase update failed:', err); // Additional console logging
              
              // Show a warning notification to the user
              setTimeout(() => {
                showMessage(`Warning: ${machine.name} may not be saved to your "Haven't Played" list. Please try again.`);
              }, 2000); // Show after 2 seconds to not interfere with success message
              
              // Log the error for debugging
              handleError(err, { 
                action: 'addBlockedMachine_background_failed', 
                metadata: { groupId, machineName: machine.name }
              });
            });
          
          return { success: true, machineName: machine.name };
        } else if (result.needsRefresh) {
          // Replacement failed, need full refresh
          fetchMatchup(false, true);
          return { success: false, needsRefresh: true };
        } else {
          // Other failure
          handleError(result.error || 'Failed to find a replacement machine', { 
            action: 'machine_replacement_failed', 
            metadata: { machineIndex, groupId, isMobile }
          });
          throw new Error(result.error || 'Failed to replace machine. Please try refreshing the page or try again later.');
        }
        
      } catch (err) {
        handleError(err, { 
          action: 'handleHaventPlayed', 
          metadata: { machineIndex, groupId, isMobile }
        });
        
        // Provide more specific error messages
        let errorMessage = 'Failed to update preferences. ';
        if (err.code === 'permission-denied') {
          errorMessage += 'Permission denied. Please check if you are logged in.';
        } else if (err.code === 'unavailable') {
          errorMessage += 'Database is unavailable. Please check your internet connection.';
        } else if (err.code === 'unauthenticated') {
          errorMessage += 'Authentication failed. Please log out and log back in.';
        } else {
          errorMessage += err.message;
        }
        
        throw new Error(errorMessage);
      }
    };
  };

  return {
    confirmationMessage,
    createHandleHaventPlayed,
    clearConfirmationMessage: clearMessage,
    cleanup
  };
};