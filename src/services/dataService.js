/**
 * Centralized data service for all Firebase operations
 * Provides a single source of truth for data fetching and caching
 */

import { db, auth } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { getCachedData } from '../caching';
import { CACHE_DURATION } from '../constants/appConstants';
import errorService from './errorService';

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
    if (!userId) {
      console.log('❌ getUserPreferences: No userId provided');
      return null;
    }
    
    try {
      console.log(`🔍 getUserPreferences: Fetching preferences for user ${userId}`);
      const userPrefsRef = doc(db, 'userPreferences', userId);
      const userPrefsSnap = await getDoc(userPrefsRef);
      
      if (userPrefsSnap.exists()) {
        console.log(`✅ getUserPreferences: Found preferences for user ${userId}`);
        return userPrefsSnap.data();
      }
      console.log(`ℹ️ getUserPreferences: No preferences found for user ${userId}, returning defaults`);
      return { blockedMachines: [] };
    } catch (error) {
      console.log(`❌ getUserPreferences: Error fetching preferences for user ${userId}:`, error.message);
      errorService.logError(error, {
        component: 'UserDataService',
        action: 'getUserPreferences',
        metadata: { userId }
      });
      return { blockedMachines: [] };
    }
  }

  static async getUserRankings(userId) {
    if (!userId) {
      console.log('❌ getUserRankings: No userId provided');
      return null;
    }
    
    try {
      console.log(`🔍 getUserRankings: Fetching rankings for user ${userId}`);
      const rankingsRef = doc(db, 'userRankings', userId);
      const rankingsSnap = await getDoc(rankingsRef);
      
      if (rankingsSnap.exists()) {
        const data = rankingsSnap.data().rankings || {};
        console.log(`📊 getUserRankings: Found ${Object.keys(data).length} rankings for user ${userId}`);
        // Process rankings data into sorted array
        const processedRankings = Object.entries(data)
          .map(([machineId, eloObj]) => ({
            machineId,
            eloObj: eloObj && typeof eloObj === 'object' ? eloObj : { all: eloObj ?? 1200 }
          }))
          .sort((a, b) => (b.eloObj.all ?? 1200) - (a.eloObj.all ?? 1200));
        console.log(`✅ getUserRankings: Processed ${processedRankings.length} rankings for user ${userId}`);
        return processedRankings;
      }
      console.log(`ℹ️ getUserRankings: No rankings found for user ${userId}`);
      return [];
    } catch (error) {
      console.log(`❌ getUserRankings: Error fetching rankings for user ${userId}:`, error.message);
      errorService.logError(error, {
        component: 'UserDataService',
        action: 'getUserRankings',
        metadata: { userId }
      });
      return [];
    }
  }

  static async updateUserPreferences(userId, preferences) {
    if (!userId) throw new Error('User ID is required');
    
    try {
      console.log(`💾 updateUserPreferences: Updating preferences for user ${userId}`, Object.keys(preferences));
      const userPrefsRef = doc(db, 'userPreferences', userId);
      await setDoc(userPrefsRef, {
        ...preferences,
        lastUpdated: new Date().toISOString()
      }, { merge: true });
      console.log(`✅ updateUserPreferences: Successfully updated preferences for user ${userId}`);
      return true;
    } catch (error) {
      console.log(`❌ updateUserPreferences: Error updating preferences for user ${userId}:`, error.message);
      errorService.logError(error, {
        component: 'UserDataService',
        action: 'updateUserPreferences',
        metadata: { userId, preferencesKeys: Object.keys(preferences) }
      });
      throw error;
    }
  }

  static async addBlockedMachine(userId, groupId, currentBlockedMachines) {
    console.log(`🚫 addBlockedMachine: Adding ${groupId} to blocked machines for user ${userId}`);
    const newBlockedMachines = [...currentBlockedMachines, groupId];
    await this.updateUserPreferences(userId, { blockedMachines: newBlockedMachines });
    console.log(`✅ addBlockedMachine: Successfully added ${groupId} to blocked machines for user ${userId}`);
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