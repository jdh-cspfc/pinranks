/**
 * Centralized data hook that manages all shared application data
 * Replaces multiple individual hooks with a single source of truth
 */

import { useState, useEffect, useCallback } from 'react';
import { StaticDataService, UserDataService, AuthService } from '../services/dataService';

/**
 * Centralized hook for all application data
 * Provides user, machines, groups, user preferences, and rankings
 */
export const useAppData = () => {
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
        console.error('Failed to load static data:', error);
        setMachines([]);
        setGroups([]);
        setIsStaticDataLoading(false);
      }
    };

    loadStaticData();
  }, []);

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
        console.error('Failed to load user data:', error);
        setUserPreferences({ blockedMachines: [] });
        setUserRankings([]);
      } finally {
        setIsUserDataLoading(false);
      }
    };

    loadUserData();
  }, [user]);

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
      return true;
    } catch (error) {
      console.error('Failed to add blocked machine:', error);
      throw error;
    }
  }, [user, userPreferences.blockedMachines]);

  const isMachineBlocked = useCallback((groupId) => {
    return userPreferences.blockedMachines.some(blockedId => groupId.startsWith(blockedId));
  }, [userPreferences.blockedMachines]);

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
      console.error('Failed to refresh user data:', error);
    } finally {
      setIsUserDataLoading(false);
    }
  }, [user]);

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
    isMachineBlocked,
    refreshUserData,
    
    // Legacy compatibility (for gradual migration)
    blockedMachines: userPreferences.blockedMachines,
    rankings: userRankings
  };
};