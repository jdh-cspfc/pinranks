/**
 * Hook for matchup-specific actions like "haven't played"
 * Handles the complex business logic for machine replacement and user preferences
 */

import { useBlockedMachines } from './useBlockedMachines';
import { useConfirmationMessage } from './useConfirmationMessage';
import { UI_CONSTANTS } from '../constants/appConstants';
import { useErrorHandler } from './useErrorHandler';

export const useMatchupActions = () => {
  const { handleError, handleAsyncOperation } = useErrorHandler('useMatchupActions');
  const { addBlockedMachine, blockedMachines } = useBlockedMachines();
  const { message: confirmationMessage, showMessage, clearMessage, cleanup } = useConfirmationMessage();

  // Create a function that can be enhanced with replaceMachine later
  const createHandleHaventPlayed = (replaceMachine) => {
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
          const replacementSuccess = await replaceMachine(machineIndex, currentBlockedMachines);
          if (replacementSuccess) {
            showMessage(`${machine.name} has been replaced with a new machine`);
            return { success: true, machineName: machine.name };
          } else {
            throw new Error('Failed to replace machine. Please try again.');
          }
        }
        
        const updatedBlockedMachines = [...currentBlockedMachines, groupId];
        
        // Replace the machine immediately using the optimistic blocked machines list
        const replacementSuccess = await replaceMachine(machineIndex, updatedBlockedMachines);
        
        // If replacement failed, show an error message
        if (!replacementSuccess) {
          handleError('Failed to find a replacement machine', { 
            action: 'machine_replacement_failed', 
            metadata: { machineIndex, groupId, isMobile }
          });
          throw new Error('Failed to replace machine. Please try refreshing the page or try again later.');
        }
        
        // Show confirmation message immediately
        showMessage(`${machine.name} has been added to your "Haven't Played" list`);
        
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
        
        return { success: true, machineName: machine.name };
        
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