/**
 * Centralized data service for all Firebase operations
 * Provides a single source of truth for data fetching and caching
 */

import { db, auth } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import errorService from './errorService';
import logger from '../utils/logger';

/**
 * Static data service for machines and groups
 */
export class StaticDataService {
  static async getMachines() {
    const response = await fetch('/machines.json');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  static async getGroups() {
    const response = await fetch('/groups.json');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
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
        const processedRankings = Object.entries(data)
          .map(([machineId, eloObj]) => ({
            machineId,
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
    
    const newBlockedMachines = [...currentBlockedMachines, groupId];
    await this.updateUserPreferences(userId, { blockedMachines: newBlockedMachines });
    logger.info('firebase', `Successfully added ${groupId} to blocked machines for user ${userId}`);
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