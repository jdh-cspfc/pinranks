/**
 * Hook for matchup-specific actions like "haven't played"
 * Handles the complex business logic for machine replacement and user preferences
 */

import { useRef, useEffect } from 'react';
import { useBlockedMachines } from './useBlockedMachines';
import { useConfirmationMessage } from './useConfirmationMessage';
import { useMachineReplacement } from './useMachineReplacement';
import { UI_CONSTANTS } from '../constants/appConstants';
import { useErrorHandler } from './useErrorHandler';
import logger from '../utils/logger';

export const useMatchupActions = (appData, matchup, setMatchup, filter, fetchMatchup) => {
  const { handleError } = useErrorHandler('useMatchupActions');
  const { addBlockedMachine, removeBlockedMachine, blockedMachines } = useBlockedMachines(appData);
  const { message: confirmationMessage, showMessage, clearMessage, cleanup } = useConfirmationMessage();
  
  // Use the new machine replacement hook
  const { replaceMachine } = useMachineReplacement(matchup, setMatchup, filter, appData.user, appData.userPreferences);
  
  // Store pending undo actions - use a Map to track multiple concurrent actions
  const pendingUndoActionsRef = useRef(new Map());
  
  // Store the addBlockedMachine function in a ref to avoid useEffect dependency issues
  const addBlockedMachineRef = useRef(addBlockedMachine);
  addBlockedMachineRef.current = addBlockedMachine;

  // Cleanup on unmount - finalize any pending Firebase writes since the user navigated away
  useEffect(() => {
    return () => {
      // When the component unmounts, save any pending actions to Firebase immediately
      if (pendingUndoActionsRef.current.size > 0) {
        logger.info('data', 'Component unmounting, finalizing pending Firebase writes');
        pendingUndoActionsRef.current.forEach((action, groupId) => {
          // Cancel the timeout
          clearTimeout(action.firebaseTimeout);
          // Immediately save to Firebase
          logger.info('data', `Finalizing save of ${action.machineName} (${groupId}) to Firebase`);
          addBlockedMachineRef.current(groupId)
            .then(() => {
              logger.info('data', `Successfully finalized save of ${action.machineName} to blocked list in Firebase`);
            })
            .catch(err => {
              logger.error('data', `Failed to finalize save of ${action.machineName} to blocked list: ${err.message}`);
              console.error('Final Firebase update failed:', err);
            });
        });
        pendingUndoActionsRef.current.clear();
      }
    };
  }, []); // Empty dependency array since we use refs for everything

  // Create a function that handles the "haven't played" logic
  const createHandleHaventPlayed = () => {
    return async (machineIndex, matchup) => {
      // Define variables outside try block so they're available in catch
      let machine, groupId, isMobile;
      
      try {
        machine = matchup.machines[machineIndex];
        groupId = machine.opdb_id.split('-')[0];
        isMobile = window.innerWidth < UI_CONSTANTS.MOBILE_BREAKPOINT;
        
        // If there are any pending undo actions, cancel them and immediately save to Firebase
        // because the user pressed another X, replacing the undo button
        if (pendingUndoActionsRef.current.size > 0) {
          logger.info('undo', 'Another machine marked, cancelling pending undo actions and saving immediately');
          pendingUndoActionsRef.current.forEach((action, existingGroupId) => {
            // Cancel the timeout
            clearTimeout(action.firebaseTimeout);
            // Immediately save to Firebase since undo is no longer possible
            logger.info('data', `Immediately saving ${action.machineName} (${existingGroupId}) to Firebase`);
            addBlockedMachine(existingGroupId)
              .then(() => {
                logger.info('data', `Successfully saved ${action.machineName} to blocked list in Firebase`);
              })
              .catch(err => {
                logger.error('data', `Failed to save ${action.machineName} to blocked list: ${err.message}`);
                console.error('Firebase update failed:', err);
                handleError(err, { 
                  action: 'addBlockedMachine_immediate_failed', 
                  metadata: { groupId: existingGroupId, machineName: action.machineName }
                });
              });
          });
          // Clear all pending actions
          pendingUndoActionsRef.current.clear();
        }
        
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
        const groupName =
          originalMatchup.groups?.find(g => g.opdb_id === groupId)?.name ||
          originalMachine.name;
        
        // Replace the machine immediately using the optimistic blocked machines list
        const result = await replaceMachine(machineIndex, updatedBlockedMachines);
        
        // Handle the result
        if (result.success) {
          // Machine replaced successfully
          const newMachine = result.newMachine;
          
          // Create undo function
          const handleUndo = async () => {
            try {
              logger.info('undo', `Undoing block of ${originalMachine.name} (${groupId})`);
              
              // Cancel the pending Firebase write
              const pendingAction = pendingUndoActionsRef.current.get(groupId);
              if (pendingAction) {
                clearTimeout(pendingAction.firebaseTimeout);
                pendingUndoActionsRef.current.delete(groupId);
              }
              
              // Remove the machine from the blocked list
              await removeBlockedMachine(groupId);
              
              // Clear the confirmation message
              clearMessage();
              
              // Show a brief confirmation
              showMessage({ text: `${groupName} removed from Haven't Played list` });
              
              logger.info('undo', `Successfully removed ${originalMachine.name} from blocked list`);
            } catch (err) {
              logger.error('undo', `Failed to undo block of ${originalMachine.name}: ${err.message}`);
              console.error('Undo failed:', err);
              showMessage({ text: `Failed to undo. Please try again.` });
            }
          };
          
          // Show message with undo button
          showMessage({
            text: `${groupName} added to Haven't Played list`,
            onUndo: handleUndo
          });
          
          // Schedule Firebase update after undo window expires
          const firebaseTimeout = setTimeout(() => {
            logger.info('data', `Undo window expired, saving ${originalMachine.name} (${groupId}) to Firebase`);
            addBlockedMachine(groupId)
              .then(() => {
                logger.info('data', `Successfully saved ${originalMachine.name} to blocked list in Firebase`);
                pendingUndoActionsRef.current.delete(groupId);
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
                
                pendingUndoActionsRef.current.delete(groupId);
              });
          }, 5000); // Wait 5 seconds before saving to Firebase
          
          // Store the pending action for potential cancellation
          pendingUndoActionsRef.current.set(groupId, {
            groupId,
            machineName: originalMachine.name,
            firebaseTimeout
          });
          
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