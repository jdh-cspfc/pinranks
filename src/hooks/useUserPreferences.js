import { useAppData } from './useAppData';
import { useConfirmationMessage } from './useConfirmationMessage';
import { UI_CONSTANTS } from '../constants/appConstants';
import { useErrorHandler } from './useErrorHandler';

export const useUserPreferences = () => {
  const { handleError } = useErrorHandler('useUserPreferences');
  const { 
    user, 
    userPreferences, 
    isLoading: authLoading, 
    isUserDataLoading,
    addBlockedMachine, 
    isMachineBlocked 
  } = useAppData();
  const { message: confirmationMessage, showMessage, clearMessage, cleanup } = useConfirmationMessage();

  // Combined loading state
  const userPreferencesLoaded = !authLoading && !isUserDataLoading;

  // Create a function that can be enhanced with replaceMachine later
  const createHandleHaventPlayed = (replaceMachine) => {
    return async (machineIndex, matchup) => {
      try {
        const machine = matchup.machines[machineIndex];
        const groupId = machine.opdb_id.split('-')[0];
        
        // Check if mobile device
        const isMobile = window.innerWidth < UI_CONSTANTS.MOBILE_BREAKPOINT;
        
        // On mobile, delay updating user preferences until after machine replacement
        if (!isMobile) {
          await addBlockedMachine(groupId);
        }
        
        // Marking machine as haven't played, about to replace it
        
        // Add a small delay on mobile to ensure state updates are processed
        if (isMobile) {
          await new Promise(resolve => setTimeout(resolve, UI_CONSTANTS.MOBILE_DELAY));
        }
        
        // Replace just the blocked machine with a new one
        const replacementSuccess = await replaceMachine(machineIndex);
        
        // If replacement failed, show an error message
        if (!replacementSuccess) {
          handleError('Failed to find a replacement machine', { 
            action: 'machine_replacement_failed', 
            metadata: { machineIndex, groupId, isMobile }
          });
          
          // On mobile, still update preferences even if replacement failed
          if (isMobile) {
            await addBlockedMachine(groupId);
            // Mobile: User preferences updated even though replacement failed
          } else {
            throw new Error('Failed to replace machine. Please try refreshing the page or try again later.');
          }
        } else {
          // Machine replacement successful
          
          // On mobile, update user preferences after successful replacement
          if (isMobile) {
            await addBlockedMachine(groupId);
            // Mobile: User preferences updated after successful replacement
          }
        }
        
        // Show confirmation message
        showMessage(`${machine.name} has been added to your "Haven't Played" list`);
        
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
    user,
    userPreferences: { blockedMachines: userPreferences.blockedMachines, isMachineBlocked },
    userPreferencesLoaded,
    confirmationMessage,
    createHandleHaventPlayed,
    clearConfirmationMessage: clearMessage,
    cleanup
  };
}; 