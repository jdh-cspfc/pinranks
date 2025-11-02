/**
 * Centralized data service for all Firebase operations
 * Provides a single source of truth for data fetching and caching
 */

import { db, auth, storage } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, getDownloadURL } from 'firebase/storage';
import errorService from './errorService';
import logger from '../utils/logger';

/**
 * Static data service for machines and groups
 */
export class StaticDataService {
  /**
   * Helper to fetch JSON from Firebase Storage
   * @param {string} fileName - Name of the JSON file in Storage
   * @return {Promise<Object>} The JSON data
   */
  static async fetchJSONFromStorage(fileName) {
    try {
      logger.debug('firebase', `Fetching ${fileName} from Firebase Storage`);
      
      // Get download URL from Storage
      const storageRef = ref(storage, fileName);
      const downloadURL = await getDownloadURL(storageRef);
      
      // Fetch the JSON data
      const response = await fetch(downloadURL);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      logger.debug('firebase', `Successfully fetched ${fileName} from Storage`);
      return data;
    } catch (error) {
      logger.error('firebase', `Failed to fetch ${fileName} from Storage: ${error.message}`);
      errorService.logError(error, {
        component: 'StaticDataService',
        action: 'fetchJSONFromStorage',
        metadata: { fileName }
      });
      throw error;
    }
  }

  static async getMachines() {
    return this.fetchJSONFromStorage('machines.json');
  }

  static async getGroups() {
    return this.fetchJSONFromStorage('groups.json');
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
      logger.error('firebase', 'getUserPreferences: No userId provided');
      return null;
    }
    
    try {
      logger.debug('firebase', `Fetching preferences for user ${userId}`);
      const userPrefsRef = doc(db, 'userPreferences', userId);
      const userPrefsSnap = await getDoc(userPrefsRef);
      
      if (userPrefsSnap.exists()) {
        logger.debug('firebase', `Found preferences for user ${userId}`);
        return userPrefsSnap.data();
      }
      logger.info('firebase', `No preferences found for user ${userId}, returning defaults`);
      return { blockedMachines: [] };
    } catch (error) {
      logger.error('firebase', `Error fetching preferences for user ${userId}: ${error.message}`);
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
      logger.error('firebase', 'getUserRankings: No userId provided');
      return null;
    }
    
    try {
      logger.debug('firebase', `Fetching rankings for user ${userId}`);
      const rankingsRef = doc(db, 'userRankings', userId);
      const rankingsSnap = await getDoc(rankingsRef);
      
      if (rankingsSnap.exists()) {
        const data = rankingsSnap.data().rankings || {};
        logger.debug('firebase', `Found ${Object.keys(data).length} rankings for user ${userId}`);
        // Process rankings data into sorted array
        // Rankings are now stored at the group level (groupId), not individual machine variant level
        const processedRankings = Object.entries(data)
          .map(([groupId, eloObj]) => ({
            groupId,
            eloObj: eloObj && typeof eloObj === 'object' ? eloObj : { all: eloObj ?? 1200 }
          }))
          .sort((a, b) => (b.eloObj.all ?? 1200) - (a.eloObj.all ?? 1200));
        logger.debug('firebase', `Processed ${processedRankings.length} rankings for user ${userId}`);
        return processedRankings;
      }
      logger.info('firebase', `No rankings found for user ${userId}`);
      return [];
    } catch (error) {
      logger.error('firebase', `Error fetching rankings for user ${userId}: ${error.message}`);
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
      logger.debug('firebase', `Updating preferences for user ${userId}`, Object.keys(preferences));
      const userPrefsRef = doc(db, 'userPreferences', userId);
      await setDoc(userPrefsRef, {
        ...preferences,
        lastUpdated: new Date().toISOString()
      }, { merge: true });
      logger.info('firebase', `Successfully updated preferences for user ${userId}`);
      return true;
    } catch (error) {
      logger.error('firebase', `Error updating preferences for user ${userId}: ${error.message}`);
      errorService.logError(error, {
        component: 'UserDataService',
        action: 'updateUserPreferences',
        metadata: { userId, preferencesKeys: Object.keys(preferences) }
      });
      throw error;
    }
  }

  static async addBlockedMachine(userId, groupId, currentBlockedMachines) {
    logger.info('firebase', `Adding ${groupId} to blocked machines for user ${userId}`);
    
    // Check if the machine is already blocked to prevent duplicates
    if (currentBlockedMachines.includes(groupId)) {
      logger.info('firebase', `Machine ${groupId} is already blocked for user ${userId}`);
      return currentBlockedMachines; // Return the existing array unchanged
    }
    
    // Use arrayUnion to atomically add to the array, preventing race conditions
    try {
      const userPrefsRef = doc(db, 'userPreferences', userId);
      await updateDoc(userPrefsRef, {
        blockedMachines: arrayUnion(groupId),
        lastUpdated: new Date().toISOString()
      });
      
      // Fetch the updated value from Firebase to get the actual state
      // This ensures we return the true value even if other concurrent writes happened
      const updatedPrefsSnap = await getDoc(userPrefsRef);
      const updatedBlockedMachines = updatedPrefsSnap.exists() && updatedPrefsSnap.data().blockedMachines
        ? updatedPrefsSnap.data().blockedMachines
        : [...currentBlockedMachines, groupId];
      
      logger.info('firebase', `Successfully added ${groupId} to blocked machines for user ${userId}`);
      return updatedBlockedMachines;
    } catch (error) {
      logger.error('firebase', `Error adding blocked machine ${groupId} for user ${userId}: ${error.message}`);
      errorService.logError(error, {
        component: 'UserDataService',
        action: 'addBlockedMachine',
        metadata: { userId, groupId }
      });
      throw error;
    }
  }

  static async clearAllBlockedMachines(userId) {
    if (!userId) throw new Error('User ID is required');
    
    try {
      logger.info('firebase', `Clearing all blocked machines for user ${userId}`);
      const userPrefsRef = doc(db, 'userPreferences', userId);
      await setDoc(userPrefsRef, {
        blockedMachines: [],
        lastUpdated: new Date().toISOString()
      }, { merge: true });
      logger.info('firebase', `Successfully cleared all blocked machines for user ${userId}`);
      return true;
    } catch (error) {
      logger.error('firebase', `Error clearing blocked machines for user ${userId}: ${error.message}`);
      errorService.logError(error, {
        component: 'UserDataService',
        action: 'clearAllBlockedMachines',
        metadata: { userId }
      });
      throw error;
    }
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