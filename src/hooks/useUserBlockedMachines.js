import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useErrorHandler } from './useErrorHandler';

export const useUserBlockedMachines = (user) => {
  const { handleError } = useErrorHandler('useUserBlockedMachines');
  const [blockedMachines, setBlockedMachines] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load blocked machines when user changes
  useEffect(() => {
    if (!user) {
      setBlockedMachines([]);
      setIsLoaded(true);
      return;
    }

    const loadBlockedMachines = async () => {
      try {
        const userPrefsRef = doc(db, 'userPreferences', user.uid);
        const userPrefsSnap = await getDoc(userPrefsRef);
        
        if (userPrefsSnap.exists()) {
          const data = userPrefsSnap.data();
          setBlockedMachines(data.blockedMachines || []);
        } else {
          setBlockedMachines([]);
        }
        setIsLoaded(true);
      } catch (err) {
        handleError(err, { action: 'load_blocked_machines', metadata: { userId: user.uid } });
        setBlockedMachines([]);
        setIsLoaded(true);
      }
    };

    loadBlockedMachines();
  }, [user]);

  // Add machine to blocked list
  const addBlockedMachine = async (groupId) => {
    if (!user) {
      throw new Error('You must be logged in to use this feature.');
    }

    const newBlockedMachines = [...blockedMachines, groupId];
    
    try {
      const userPrefsRef = doc(db, 'userPreferences', user.uid);
      await setDoc(userPrefsRef, {
        blockedMachines: newBlockedMachines,
        lastUpdated: new Date().toISOString()
      }, { merge: true });
      
      setBlockedMachines(newBlockedMachines);
      return true;
    } catch (err) {
      handleError(err, { action: 'update_blocked_machines', metadata: { groupId, userId: user.uid } });
      throw err;
    }
  };

  // Check if a machine group is blocked
  const isMachineBlocked = (groupId) => {
    return blockedMachines.some(blockedId => groupId.startsWith(blockedId));
  };

  return {
    blockedMachines,
    isLoaded,
    addBlockedMachine,
    isMachineBlocked
  };
}; 