/**
 * Hook for matchup-specific actions like "haven't played"
 * Handles the complex business logic for machine replacement and user preferences
 */

import { useRef } from 'react';
import { useBlockedMachines } from './useBlockedMachines';
import { useConfirmationMessage } from './useConfirmationMessage';
import { useMachineReplacement } from './useMachineReplacement';
import { UI_CONSTANTS } from '../constants/appConstants';
import { useErrorHandler } from './useErrorHandler';
import logger from '../utils/logger';

export const useMatchupActions = (appData, matchup, setMatchup, filter, fetchMatchup) => {
  const { handleError, handleAsyncOperation } = useErrorHandler('useMatchupActions');
  const { addBlockedMachine, removeBlockedMachine, blockedMachines } = useBlockedMachines(appData);
  const { message: confirmationMessage, showMessage, clearMessage, cleanup } = useConfirmationMessage();
  
  // Use the new machine replacement hook
  const { replaceMachine } = useMachineReplacement(matchup, setMatchup, filter, appData.user, appData.userPreferences);
  
  // Store pending undo actions
  const pendingUndoRef = useRef(null);

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
            showMessage({ text: `${machine.name} has been replaced with a new machine` });
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
        
        // Store the original machine and matchup state for undo
        const originalMachine = { ...machine };
        const originalMatchup = { ...matchup, machines: [...matchup.machines] };
        
        // Replace the machine immediately using the optimistic blocked machines list
        const result = await replaceMachine(machineIndex, updatedBlockedMachines);
        
        // Handle the result
        if (result.success) {
          // Machine replaced successfully
          const newMachine = result.newMachine;
          
          // Cancel any existing pending undo
          if (pendingUndoRef.current) {
            clearTimeout(pendingUndoRef.current.firebaseTimeout);
            pendingUndoRef.current = null;
          }
          
          // Create undo function
          const handleUndo = async () => {
            try {
              logger.info('undo', `Undoing block of ${originalMachine.name} (${groupId})`);
              
              // Cancel the pending Firebase write
              if (pendingUndoRef.current) {
                clearTimeout(pendingUndoRef.current.firebaseTimeout);
                pendingUndoRef.current = null;
              }
              
              // Restore the original matchup state
              setMatchup(originalMatchup);
              
              // Clear the confirmation message
              clearMessage();
              
              // Show a brief confirmation
              showMessage({ text: `Restored ${originalMachine.name}` });
              
              logger.info('undo', `Successfully restored ${originalMachine.name}`);
            } catch (err) {
              logger.error('undo', `Failed to undo block of ${originalMachine.name}: ${err.message}`);
              console.error('Undo failed:', err);
              showMessage({ text: `Failed to undo. Please try again.` });
            }
          };
          
          // Show message with undo button
          showMessage({
            text: `${originalMachine.name} added to "Haven't Played" list`,
            onUndo: handleUndo
          });
          
          // Schedule Firebase update after undo window expires
          const firebaseTimeout = setTimeout(() => {
            logger.info('data', `Undo window expired, saving ${originalMachine.name} (${groupId}) to Firebase`);
            addBlockedMachine(groupId)
              .then(() => {
                logger.info('data', `Successfully saved ${originalMachine.name} to blocked list in Firebase`);
                pendingUndoRef.current = null;
              })
              .catch(err => {
                logger.error('data', `Failed to save ${originalMachine.name} to blocked list: ${err.message}`);
                console.error('Firebase update failed:', err);
                
                // Show a warning notification to the user
                showMessage({ text: `Warning: ${originalMachine.name} may not be saved. Please try again.` });
                
                handleError(err, { 
                  action: 'addBlockedMachine_background_failed', 
                  metadata: { groupId, machineName: originalMachine.name }
                });
                
                pendingUndoRef.current = null;
              });
          }, 5000); // Wait 5 seconds before saving to Firebase
          
          // Store the pending action for potential cancellation
          pendingUndoRef.current = {
            groupId,
            machineName: originalMachine.name,
            firebaseTimeout
          };
          
          return { success: true, machineName: originalMachine.name };
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