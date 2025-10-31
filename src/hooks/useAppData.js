/**
 * Centralized data hook that manages all shared application data
 * Replaces multiple individual hooks with a single source of truth
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { StaticDataService, UserDataService, AuthService } from '../services/dataService';
import { useErrorHandler } from './useErrorHandler';
import logger from '../utils/logger';

/**
 * Centralized hook for all application data
 * Provides user, machines, groups, user preferences, and rankings
 */
export const useAppData = () => {
  const { handleError } = useErrorHandler('useAppData');
  
  // Core state
  const [user, setUser] = useState(null);
  const [machines, setMachines] = useState(null);
  const [groups, setGroups] = useState(null);
  const [userPreferences, setUserPreferences] = useState({ blockedMachines: [] });
  const [userRankings, setUserRankings] = useState(null);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isStaticDataLoading, setIsStaticDataLoading] = useState(true);
  const [isUserDataLoading, setIsUserDataLoading] = useState(false);
  
  // Refs to prevent duplicate calls in StrictMode
  const staticDataLoaded = useRef(false);
  const userDataLoading = useRef(false);

  // Initialize authentication listener
  useEffect(() => {
    logger.debug('auth', 'Setting up authentication listener');
    const unsubscribe = AuthService.onAuthStateChanged((firebaseUser) => {
      if (firebaseUser) {
        logger.info('auth', `User authenticated: ${firebaseUser.uid}`);
      } else {
        logger.info('auth', 'User signed out');
      }
      setUser(firebaseUser);
      setIsAuthLoading(false);
    });

    return unsubscribe;
  }, []);

  // Load static data (machines and groups) once
  useEffect(() => {
    // Prevent duplicate calls in StrictMode
    if (staticDataLoaded.current) return;
    staticDataLoaded.current = true;
    
    const loadStaticData = async () => {
      try {
        logger.debug('data', 'Loading static data (machines and groups)');
        const { machines: machinesData, groups: groupsData } = await StaticDataService.getMachinesAndGroups();
        logger.info('data', `Loaded ${machinesData.length} machines and ${groupsData.length} groups`);
        setMachines(machinesData);
        setGroups(groupsData);
        setIsStaticDataLoading(false);
      } catch (error) {
        logger.error('data', `Error loading static data: ${error.message}`);
        handleError(error, { action: 'loadStaticData' });
        setMachines([]);
        setGroups([]);
        setIsStaticDataLoading(false);
      }
    };

    loadStaticData();
  }, []); // Remove handleError dependency to prevent re-runs

  // Load user-specific data when user changes
  useEffect(() => {
    // Prevent duplicate calls for the same user
    const currentUserId = user?.uid || 'no-user';
    if (userDataLoading.current === currentUserId) return;
    userDataLoading.current = currentUserId;
    
    const loadUserData = async () => {
      if (!user) {
        logger.debug('data', 'No user, clearing user data');
        setUserPreferences({ blockedMachines: [] });
        setUserRankings(null);
        setIsUserDataLoading(false);
        return;
      }

      logger.debug('data', `Loading user data for ${user.uid}`);
      setIsUserDataLoading(true);
      try {
        const [preferences, rankings] = await Promise.all([
          UserDataService.getUserPreferences(user.uid),
          UserDataService.getUserRankings(user.uid)
        ]);
        
        // Filter rankings to exclude machines from blocked machine groups
        const filteredRankings = rankings.filter(ranking => {
          const groupId = ranking.machineId.split('-')[0];
          return !preferences.blockedMachines.some(blockedId => groupId.startsWith(blockedId));
        });
        
        logger.info('data', `Loaded user data for ${user.uid} - ${preferences.blockedMachines.length} blocked machines, ${rankings.length} rankings (${filteredRankings.length} after filtering)`);
        setUserPreferences(preferences);
        setUserRankings(filteredRankings);
      } catch (error) {
        logger.error('data', `Error loading user data for ${user.uid}: ${error.message}`);
        handleError(error, { action: 'loadUserData', metadata: { userId: user.uid } });
        setUserPreferences({ blockedMachines: [] });
        setUserRankings([]);
      } finally {
        setIsUserDataLoading(false);
      }
    };

    loadUserData();
  }, [user]); // Remove handleError dependency to prevent re-runs

  // Update overall loading state
  useEffect(() => {
    setIsLoading(isAuthLoading || isStaticDataLoading);
  }, [isAuthLoading, isStaticDataLoading]);

  // Helper functions for user preferences
  const addBlockedMachine = useCallback(async (groupId) => {
    if (!user) {
      logger.error('auth', 'addBlockedMachine: No user logged in');
      throw new Error('You must be logged in to use this feature.');
    }

    try {
      logger.info('data', `Adding ${groupId} to blocked machines for user ${user.uid}`);
      
      // Get current state for the service call
      const currentBlockedMachines = userPreferences.blockedMachines;
      
      const newBlockedMachines = await UserDataService.addBlockedMachine(
        user.uid, 
        groupId, 
        currentBlockedMachines
      );
      
      // Use the value from Firebase which includes all concurrent writes
      // We always use the Firebase result since it's the source of truth
      setUserPreferences(prev => ({ ...prev, blockedMachines: newBlockedMachines }));
      
      // Also filter out the blocked machine from current rankings
      if (userRankings) {
        const filteredRankings = userRankings.filter(ranking => {
          const rankingGroupId = ranking.machineId.split('-')[0];
          return !rankingGroupId.startsWith(groupId);
        });
        setUserRankings(filteredRankings);
        logger.info('data', `Filtered blocked machine ${groupId} from rankings`);
      }
      
      logger.info('data', `Successfully added ${groupId} to blocked machines`);
      return newBlockedMachines; // Return the updated blocked machines list
    } catch (error) {
      logger.error('data', `Error adding ${groupId} to blocked machines: ${error.message}`);
      console.error('addBlockedMachine error:', error);
      handleError(error, { action: 'addBlockedMachine', metadata: { groupId, userId: user.uid } });
      throw error;
    }
  }, [user, userPreferences.blockedMachines, userRankings, handleError]);

  const isMachineBlocked = useCallback((groupId) => {
    return userPreferences.blockedMachines.some(blockedId => groupId.startsWith(blockedId));
  }, [userPreferences.blockedMachines]);

  const removeBlockedMachine = useCallback(async (groupId) => {
    if (!user) {
      throw new Error('You must be logged in to use this feature.');
    }

    // Store original state for rollback
    const originalBlockedMachines = [...userPreferences.blockedMachines];
    const newBlockedMachines = originalBlockedMachines.filter(id => id !== groupId);

    try {
      // Optimistic update: immediately update local state
      setUserPreferences(prev => ({ ...prev, blockedMachines: newBlockedMachines }));

      // Update Firebase in the background
      await UserDataService.updateUserPreferences(user.uid, { 
        blockedMachines: newBlockedMachines 
      });
      
      // Refresh rankings to restore any rankings for the unblocked machine
      logger.debug('data', `Refreshing rankings after unblocking ${groupId}`);
      const rankings = await UserDataService.getUserRankings(user.uid);
      
      // Filter rankings with the updated blocked machines list
      const filteredRankings = rankings.filter(ranking => {
        const rankingGroupId = ranking.machineId.split('-')[0];
        return !newBlockedMachines.some(blockedId => rankingGroupId.startsWith(blockedId));
      });
      
      setUserRankings(filteredRankings);
      logger.info('data', `Refreshed rankings after unblocking ${groupId}`);
      
      return true;
    } catch (error) {
      // Rollback: restore original state if Firebase update failed
      setUserPreferences(prev => ({ ...prev, blockedMachines: originalBlockedMachines }));
      
      handleError(error, { action: 'removeBlockedMachine', metadata: { groupId, userId: user.uid } });
      throw error;
    }
  }, [user, userPreferences.blockedMachines, handleError]);

  // Refresh user data
  const refreshUserData = useCallback(async () => {
    if (!user) return;
    
    setIsUserDataLoading(true);
    try {
      const [preferences, rankings] = await Promise.all([
        UserDataService.getUserPreferences(user.uid),
        UserDataService.getUserRankings(user.uid)
      ]);
      
      // Filter rankings to exclude machines from blocked machine groups
      const filteredRankings = rankings.filter(ranking => {
        const groupId = ranking.machineId.split('-')[0];
        return !preferences.blockedMachines.some(blockedId => groupId.startsWith(blockedId));
      });
      
      setUserPreferences(preferences);
      setUserRankings(filteredRankings);
    } catch (error) {
      handleError(error, { action: 'refreshUserData', metadata: { userId: user.uid } });
    } finally {
      setIsUserDataLoading(false);
    }
  }, [user, handleError]);

  return {
    // Core data
    user,
    machines,
    groups,
    userPreferences,
    userRankings,
    
    // Loading states
    isLoading,
    isAuthLoading,
    isStaticDataLoading,
    isUserDataLoading,
    
    // Computed states
    isAuthenticated: !!user,
    hasStaticData: !!(machines && groups),
    hasUserData: !!(userPreferences && userRankings !== null),
    
    // Helper functions
    addBlockedMachine,
    removeBlockedMachine,
    isMachineBlocked,
    refreshUserData,
    
    // Legacy compatibility (for gradual migration)
    blockedMachines: userPreferences.blockedMachines,
    rankings: userRankings
  };
};