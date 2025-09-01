/**
 * Centralized data service for all Firebase operations
 * Provides a single source of truth for data fetching and caching
 */

import { db, auth } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { getCachedData } from '../caching';
import { CACHE_DURATION } from '../constants/appConstants';

/**
 * Static data service for machines and groups
 */
export class StaticDataService {
  static async getMachines() {
    return getCachedData(
      'machines', 
      () => fetch('/machines.json').then(res => res.json()), 
      CACHE_DURATION.SEVEN_DAYS
    );
  }

  static async getGroups() {
    return getCachedData(
      'groups', 
      () => fetch('/groups.json').then(res => res.json()), 
      CACHE_DURATION.SEVEN_DAYS
    );
  }

  static async getMachinesAndGroups() {
    const [machines, groups] = await Promise.all([
      this.getMachines(),
      this.getGroups()
    ]);
    return { machines, groups };
  }
}

/**
 * User data service for Firebase operations
 */
export class UserDataService {
  static async getUserPreferences(userId) {
    if (!userId) return null;
    
    try {
      const userPrefsRef = doc(db, 'userPreferences', userId);
      const userPrefsSnap = await getDoc(userPrefsRef);
      
      if (userPrefsSnap.exists()) {
        return userPrefsSnap.data();
      }
      return { blockedMachines: [] };
    } catch (error) {
      console.error('Failed to fetch user preferences:', error);
      return { blockedMachines: [] };
    }
  }

  static async getUserRankings(userId) {
    if (!userId) return null;
    
    try {
      const rankingsRef = doc(db, 'userRankings', userId);
      const rankingsSnap = await getDoc(rankingsRef);
      
      if (rankingsSnap.exists()) {
        const data = rankingsSnap.data().rankings || {};
        // Process rankings data into sorted array
        return Object.entries(data)
          .map(([machineId, eloObj]) => ({
            machineId,
            eloObj: eloObj && typeof eloObj === 'object' ? eloObj : { all: eloObj ?? 1200 }
          }))
          .sort((a, b) => (b.eloObj.all ?? 1200) - (a.eloObj.all ?? 1200));
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch user rankings:', error);
      return [];
    }
  }

  static async updateUserPreferences(userId, preferences) {
    if (!userId) throw new Error('User ID is required');
    
    try {
      const userPrefsRef = doc(db, 'userPreferences', userId);
      await setDoc(userPrefsRef, {
        ...preferences,
        lastUpdated: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (error) {
      console.error('Failed to update user preferences:', error);
      throw error;
    }
  }

  static async addBlockedMachine(userId, groupId, currentBlockedMachines) {
    const newBlockedMachines = [...currentBlockedMachines, groupId];
    await this.updateUserPreferences(userId, { blockedMachines: newBlockedMachines });
    return newBlockedMachines;
  }
}

/**
 * Authentication service
 */
export class AuthService {
  static onAuthStateChanged(callback) {
    return onAuthStateChanged(auth, callback);
  }

  static getCurrentUser() {
    return auth.currentUser;
  }
}