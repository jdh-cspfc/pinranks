import { useState, useEffect, useRef } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const useUserPreferences = () => {
  const [user, setUser] = useState(null);
  const [userPreferences, setUserPreferences] = useState({ blockedMachines: [] });
  const [userPreferencesLoaded, setUserPreferencesLoaded] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState(null);
  const confirmationTimeoutRef = useRef(null);

  // Load user preferences when auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Test Firestore connectivity first
        try {
          const userPrefsRef = doc(db, 'userPreferences', firebaseUser.uid);
          const userPrefsSnap = await getDoc(userPrefsRef);
          if (userPrefsSnap.exists()) {
            const data = userPrefsSnap.data();
            setUserPreferences(data);
          } else {
            setUserPreferences({ blockedMachines: [] });
          }
          setUserPreferencesLoaded(true);
        } catch (err) {
          console.error('Failed to load user preferences:', err);
          // Even on error, mark as loaded so we don't get stuck in loading state
          setUserPreferencesLoaded(true);
        }
      } else {
        // User is not logged in, mark preferences as loaded with empty defaults
        setUserPreferences({ blockedMachines: [] });
        setUserPreferencesLoaded(true);
      }
    });

    return () => {
      unsubscribe();
      // Clean up any pending confirmation timeout
      if (confirmationTimeoutRef.current) {
        clearTimeout(confirmationTimeoutRef.current);
      }
    };
  }, []);

  // Handle marking machine as "haven't played"
  const handleHaventPlayed = async (machineIndex, matchup, replaceMachine) => {
    if (!user) {
      throw new Error('You must be logged in to use this feature.');
    }

    if (!user.uid) {
      throw new Error('User authentication error. Please log out and log back in.');
    }

    const machine = matchup.machines[machineIndex];
    const groupId = machine.opdb_id.split('-')[0];
    
    // Add mobile-specific debugging
    const isMobile = window.innerWidth < 640; // sm breakpoint
    console.log('handleHaventPlayed called:', {
      machineIndex,
      machineName: machine.name,
      groupId,
      isMobile,
      currentTime: new Date().toISOString()
    });
    
    try {
      const userPrefsRef = doc(db, 'userPreferences', user.uid);
      
      // Ensure blockedMachines is initialized
      const currentBlockedMachines = userPreferences?.blockedMachines || [];
      
      // Add the machine group to blocked list
      const newBlockedMachines = [...currentBlockedMachines, groupId];
      console.log('Updating user preferences, blocked machines:', newBlockedMachines);
      
      // On mobile, delay updating user preferences until after machine replacement
      // This prevents the mobile state validation from running and causing a full refresh
      if (!isMobile) {
        setUserPreferences(prev => ({ 
          ...prev, 
          blockedMachines: newBlockedMachines 
        }));
        
        // Always use merge: true to prevent overwriting other data
        await setDoc(userPrefsRef, {
          blockedMachines: newBlockedMachines,
          lastUpdated: new Date().toISOString()
        }, { merge: true });
      }
      
      // Clear any existing timeout
      if (confirmationTimeoutRef.current) {
        clearTimeout(confirmationTimeoutRef.current);
      }
      
      // Show confirmation message
      setConfirmationMessage(`${machine.name} has been added to your "Haven't Played" list`);
      
      // Clear confirmation message after 3 seconds
      confirmationTimeoutRef.current = setTimeout(() => {
        setConfirmationMessage(null);
      }, 3000);
      
      console.log('Marking machine as haven\'t played, about to replace it');
      
      // Add a small delay on mobile to ensure state updates are processed
      if (isMobile) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Replace just the blocked machine with a new one
      const replacementSuccess = await replaceMachine(machineIndex);
      
      // If replacement failed, show an error message
      if (!replacementSuccess) {
        console.error('Machine replacement failed:', { machineIndex, groupId, isMobile });
        
        // On mobile, still update preferences even if replacement failed
        // This ensures the machine is marked as blocked regardless of replacement success
        if (isMobile) {
          setUserPreferences(prev => ({ 
            ...prev, 
            blockedMachines: newBlockedMachines 
          }));
          
          // Update Firestore with the new preferences
          await setDoc(userPrefsRef, {
            blockedMachines: newBlockedMachines,
            lastUpdated: new Date().toISOString()
          }, { merge: true });
          
          console.log('Mobile: User preferences updated even though replacement failed');
        
        // Log this as a potential stuck machine scenario
        console.error('Mobile: Machine replacement failed - this might lead to a stuck machine:', {
          machineName: machine.name,
          groupId,
          currentTime: new Date().toISOString()
        });
        } else {
          throw new Error('Failed to replace machine. Please try refreshing the page or try again later.');
        }
      } else {
        console.log('Machine replacement successful:', { machineIndex, groupId, isMobile });
        
        // On mobile, update user preferences after successful replacement
        // This prevents the mobile state validation from running before replacement
        if (isMobile) {
          setUserPreferences(prev => ({ 
            ...prev, 
            blockedMachines: newBlockedMachines 
          }));
          
          // Update Firestore with the new preferences
          await setDoc(userPrefsRef, {
            blockedMachines: newBlockedMachines,
            lastUpdated: new Date().toISOString()
          }, { merge: true });
          
          console.log('Mobile: User preferences updated after successful replacement');
        }
      }
      
    } catch (err) {
      console.error('Failed to update preferences:', err);
      
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

  // Clear confirmation message
  const clearConfirmationMessage = () => {
    setConfirmationMessage(null);
    if (confirmationTimeoutRef.current) {
      clearTimeout(confirmationTimeoutRef.current);
    }
  };

  return {
    user,
    userPreferences,
    userPreferencesLoaded,
    confirmationMessage,
    handleHaventPlayed,
    clearConfirmationMessage
  };
}; 