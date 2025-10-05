/**
 * Hook for matchup-specific actions like "haven't played"
 * Handles the complex business logic for machine replacement and user preferences
 */

import { useBlockedMachines } from './useBlockedMachines';
import { useConfirmationMessage } from './useConfirmationMessage';
import { useMachineReplacement } from './useMachineReplacement';
import { UI_CONSTANTS } from '../constants/appConstants';
import { useErrorHandler } from './useErrorHandler';

export const useMatchupActions = (appData, matchup, setMatchup, filter, fetchMatchup) => {
  const { handleError, handleAsyncOperation } = useErrorHandler('useMatchupActions');
  const { addBlockedMachine, blockedMachines } = useBlockedMachines(appData);
  const { message: confirmationMessage, showMessage, clearMessage, cleanup } = useConfirmationMessage();
  
  // Use the new machine replacement hook
  const { replaceMachine } = useMachineReplacement(matchup, setMatchup, filter, appData.user, appData.userPreferences);

  // Create a function that handles the "haven't played" logic
  const createHandleHaventPlayed = () => {
    return async (machineIndex, matchup) => {
      try {
        const machine = matchup.machines[machineIndex];
        const groupId = machine.opdb_id.split('-')[0];
        
        // Check if mobile device
        const isMobile = window.innerWidth < UI_CONSTANTS.MOBILE_BREAKPOINT;
        
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
        
        // Update Firebase in the background (don't await this for better UX)
        addBlockedMachine(groupId).catch(err => {
          // If Firebase update fails, log the error but don't disrupt the user experience
          // The local state is already updated and the machine is replaced
          // Use handleAsyncOperation with showError: false to log without showing to user
          handleAsyncOperation(() => Promise.reject(err), {
            errorContext: { 
              action: 'addBlockedMachine_background', 
              metadata: { groupId, machineName: machine.name }
            },
            showError: false // Don't show error to user since the action appeared to succeed
          }).catch(() => {
            // Error is already logged by handleAsyncOperation
          });
        });
        
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