/**
 * Centralized data hook that manages all shared application data
 * Replaces multiple individual hooks with a single source of truth
 */

import { useState, useEffect, useCallback } from 'react';
import { StaticDataService, UserDataService, AuthService } from '../services/dataService';
import { useErrorHandler } from './useErrorHandler';

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

  // Initialize authentication listener
  useEffect(() => {
    const unsubscribe = AuthService.onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
      setIsAuthLoading(false);
    });

    return unsubscribe;
  }, []);

  // Load static data (machines and groups) once
  useEffect(() => {
    const loadStaticData = async () => {
      try {
        const { machines: machinesData, groups: groupsData } = await StaticDataService.getMachinesAndGroups();
        setMachines(machinesData);
        setGroups(groupsData);
        setIsStaticDataLoading(false);
      } catch (error) {
        handleError(error, { action: 'loadStaticData' });
        setMachines([]);
        setGroups([]);
        setIsStaticDataLoading(false);
      }
    };

    loadStaticData();
  }, [handleError]);

  // Load user-specific data when user changes
  useEffect(() => {
    const loadUserData = async () => {
      if (!user) {
        setUserPreferences({ blockedMachines: [] });
        setUserRankings(null);
        setIsUserDataLoading(false);
        return;
      }

      setIsUserDataLoading(true);
      try {
        const [preferences, rankings] = await Promise.all([
          UserDataService.getUserPreferences(user.uid),
          UserDataService.getUserRankings(user.uid)
        ]);
        
        setUserPreferences(preferences);
        setUserRankings(rankings);
      } catch (error) {
        handleError(error, { action: 'loadUserData', metadata: { userId: user.uid } });
        setUserPreferences({ blockedMachines: [] });
        setUserRankings([]);
      } finally {
        setIsUserDataLoading(false);
      }
    };

    loadUserData();
  }, [user, handleError]);

  // Update overall loading state
  useEffect(() => {
    setIsLoading(isAuthLoading || isStaticDataLoading);
  }, [isAuthLoading, isStaticDataLoading]);

  // Helper functions for user preferences
  const addBlockedMachine = useCallback(async (groupId) => {
    if (!user) {
      throw new Error('You must be logged in to use this feature.');
    }

    try {
      const newBlockedMachines = await UserDataService.addBlockedMachine(
        user.uid, 
        groupId, 
        userPreferences.blockedMachines
      );
      setUserPreferences(prev => ({ ...prev, blockedMachines: newBlockedMachines }));
      return newBlockedMachines; // Return the updated blocked machines list
    } catch (error) {
      handleError(error, { action: 'addBlockedMachine', metadata: { groupId, userId: user.uid } });
      throw error;
    }
  }, [user, userPreferences.blockedMachines, handleError]);

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
      
      setUserPreferences(preferences);
      setUserRankings(rankings);
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