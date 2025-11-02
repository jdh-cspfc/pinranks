/**
 * Voting service for handling user votes and Elo rating updates
 * Manages Firestore operations for saving votes and updating rankings
 */

import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, runTransaction } from 'firebase/firestore';
import { calculateElo, ELO_CONFIG } from './eloService';
import logger from '../utils/logger';

// Request queue to prevent concurrent writes to the same user's rankings
const requestQueues = new Map();

/**
 * Save a user vote to Firestore
 * Votes are stored at the group level, consistent with rankings
 * @param {string} userId - The user's UID
 * @param {string} winnerGroupId - OPDB group ID of the winning machine
 * @param {string} loserGroupId - OPDB group ID of the losing machine
 * @throws {Error} If the vote cannot be saved
 */
export const saveVoteToFirestore = async (userId, winnerGroupId, loserGroupId) => {
  try {
    await addDoc(collection(db, 'userVotes'), {
      userId,
      winnerGroupId,
      loserGroupId,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    // Error will be handled by the calling component via useErrorHandler
    throw err;
  }
};

/**
 * Update Elo rankings for both machine groups using a Firestore transaction
 * Rankings are stored at the group level, not individual machine variant level
 * @param {string} userId - The user's UID
 * @param {string} winnerGroupId - OPDB group ID of the winning machine (first part of opdb_id)
 * @param {string} loserGroupId - OPDB group ID of the losing machine
 * @param {string} winnerFilterGroup - Filter group of the winning machine (e.g., 'EM', 'DMD')
 * @param {string} loserFilterGroup - Filter group of the losing machine
 * @throws {Error} If the rankings cannot be updated
 */
export const updateEloRankings = async (userId, winnerGroupId, loserGroupId, winnerFilterGroup, loserFilterGroup) => {
  const rankingsRef = doc(db, 'userRankings', userId);
  const { BASE_SCORE } = ELO_CONFIG;

  try {
    await runTransaction(db, async (transaction) => {
      const rankingsSnap = await transaction.get(rankingsRef);
      let rankings = rankingsSnap.exists() ? rankingsSnap.data().rankings : {};
      
      // Helper to get or initialize Elo object
      const getEloObj = (obj) => obj && typeof obj === 'object' ? { ...obj } : { all: obj ?? BASE_SCORE };
      const winnerElo = getEloObj(rankings[winnerGroupId]);
      const loserElo = getEloObj(rankings[loserGroupId]);
      
      // Always update 'all' Elo
      const [newWinnerAll, newLoserAll] = calculateElo(winnerElo.all ?? BASE_SCORE, loserElo.all ?? BASE_SCORE);
      winnerElo.all = newWinnerAll;
      loserElo.all = newLoserAll;
      
      // Update filter-specific Elo if both are in the same filter group
      if (winnerFilterGroup && winnerFilterGroup === loserFilterGroup) {
        const [newWinnerF, newLoserF] = calculateElo(
          winnerElo[winnerFilterGroup] ?? BASE_SCORE,
          loserElo[winnerFilterGroup] ?? BASE_SCORE
        );
        winnerElo[winnerFilterGroup] = newWinnerF;
        loserElo[winnerFilterGroup] = newLoserF;
      }
      
      rankings = {
        ...rankings,
        [winnerGroupId]: winnerElo,
        [loserGroupId]: loserElo,
      };
      
      transaction.set(rankingsRef, { rankings }, { merge: true });
    });
  } catch (err) {
    // Error will be handled by the calling component via useErrorHandler
    throw err;
  }
};

/**
 * Queue a vote request to prevent concurrent writes to the same user's rankings
 * @param {string} userId - The user's UID
 * @param {Function} voteFunction - The vote processing function
 * @returns {Promise} The result of the vote processing
 */
const queueVoteRequest = async (userId, voteFunction) => {
  // Get or create a queue for this user
  if (!requestQueues.has(userId)) {
    requestQueues.set(userId, []);
  }
  
  const userQueue = requestQueues.get(userId);
  
  // Create a promise that will be resolved when this request is processed
  return new Promise((resolve, reject) => {
    // Add this request to the queue
    userQueue.push({
      voteFunction,
      resolve,
      reject
    });
    
    // Queue management
    logger.info('voting', `Vote request queued for user ${userId} (queue length: ${userQueue.length})`);
    
    // If this is the only request in the queue, start processing
    if (userQueue.length === 1) {
      processQueue(userId);
    }
  });
};

/**
 * Process the queue for a specific user
 * @param {string} userId - The user's UID
 */
const processQueue = async (userId) => {
  const userQueue = requestQueues.get(userId);
  if (!userQueue || userQueue.length === 0) {
    return;
  }
  
  // Processing queue for user
  logger.debug('voting', `Processing queue for user ${userId} (${userQueue.length} requests pending)`);
  
  while (userQueue.length > 0) {
    const request = userQueue[0];
    
    try {
      // Processing vote request
      logger.debug('voting', `Processing vote request for user ${userId} (${userQueue.length} remaining)`);
      const result = await request.voteFunction();
      request.resolve(result);
      logger.info('voting', `Vote request completed successfully for user ${userId}`);
    } catch (error) {
      // Vote request failed - error will be handled by calling component
      logger.error('voting', `Vote request failed for user ${userId}: ${error.message}`);
      request.reject(error);
    }
    
    // Remove the completed request from the queue
    userQueue.shift();
  }
  
  // Clean up empty queue
  if (userQueue.length === 0) {
    requestQueues.delete(userId);
    logger.debug('voting', `Queue cleared for user ${userId} - all requests processed`);
  }
};

/**
 * Process a complete vote: save to Firestore and update Elo rankings
 * Uses queuing to prevent concurrent writes to the same user's rankings
 * Both votes and rankings are stored at the group level (groupId)
 * @param {string} userId - The user's UID
 * @param {string} winnerGroupId - OPDB group ID of the winning machine
 * @param {string} loserGroupId - OPDB group ID of the losing machine
 * @param {string} winnerFilterGroup - Filter group of the winning machine (e.g., 'EM', 'DMD')
 * @param {string} loserFilterGroup - Filter group of the losing machine
 * @throws {Error} If any part of the voting process fails
 */
export const processVote = async (userId, winnerGroupId, loserGroupId, winnerFilterGroup, loserFilterGroup) => {
  return queueVoteRequest(userId, async () => {
    await saveVoteToFirestore(userId, winnerGroupId, loserGroupId);
    await updateEloRankings(userId, winnerGroupId, loserGroupId, winnerFilterGroup, loserFilterGroup);
  });
};