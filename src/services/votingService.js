/**
 * Voting service for handling user votes and Elo rating updates
 * Manages Firestore operations for saving votes and updating rankings
 */

import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, runTransaction } from 'firebase/firestore';
import { calculateElo, ELO_CONFIG } from './eloService';

// Request queue to prevent concurrent writes to the same user's rankings
const requestQueues = new Map();

/**
 * Save a user vote to Firestore
 * @param {string} userId - The user's UID
 * @param {string} winnerId - OPDB ID of the winning machine
 * @param {string} loserId - OPDB ID of the losing machine
 * @throws {Error} If the vote cannot be saved
 */
export const saveVoteToFirestore = async (userId, winnerId, loserId) => {
  try {
    await addDoc(collection(db, 'userVotes'), {
      userId,
      winnerId,
      loserId,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.error('Failed to save vote:', {
      userId,
      winnerId,
      loserId,
      error: err.message
    });
    throw err;
  }
};

/**
 * Update Elo rankings for both machines using a Firestore transaction
 * @param {string} userId - The user's UID
 * @param {string} winnerId - OPDB ID of the winning machine
 * @param {string} loserId - OPDB ID of the losing machine
 * @param {string} winnerGroup - Filter group of the winning machine (e.g., 'EM', 'DMD')
 * @param {string} loserGroup - Filter group of the losing machine
 * @throws {Error} If the rankings cannot be updated
 */
export const updateEloRankings = async (userId, winnerId, loserId, winnerGroup, loserGroup) => {
  const rankingsRef = doc(db, 'userRankings', userId);
  const { BASE_SCORE } = ELO_CONFIG;

  try {
    await runTransaction(db, async (transaction) => {
      const rankingsSnap = await transaction.get(rankingsRef);
      let rankings = rankingsSnap.exists() ? rankingsSnap.data().rankings : {};
      
      // Helper to get or initialize Elo object
      const getEloObj = (obj) => obj && typeof obj === 'object' ? { ...obj } : { all: obj ?? BASE_SCORE };
      const winnerElo = getEloObj(rankings[winnerId]);
      const loserElo = getEloObj(rankings[loserId]);
      
      // Always update 'all' Elo
      const [newWinnerAll, newLoserAll] = calculateElo(winnerElo.all ?? BASE_SCORE, loserElo.all ?? BASE_SCORE);
      winnerElo.all = newWinnerAll;
      loserElo.all = newLoserAll;
      
      // Update filter-specific Elo if both are in the same group
      if (winnerGroup && winnerGroup === loserGroup) {
        const [newWinnerF, newLoserF] = calculateElo(
          winnerElo[winnerGroup] ?? BASE_SCORE,
          loserElo[winnerGroup] ?? BASE_SCORE
        );
        winnerElo[winnerGroup] = newWinnerF;
        loserElo[winnerGroup] = newLoserF;
      }
      
      rankings = {
        ...rankings,
        [winnerId]: winnerElo,
        [loserId]: loserElo,
      };
      
      transaction.set(rankingsRef, { rankings }, { merge: true });
    });
  } catch (err) {
    console.error('Failed to update Elo rankings:', {
      userId,
      winnerId,
      loserId,
      error: err.message
    });
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
    
    console.log(`Added vote request to queue for user ${userId}, queue length: ${userQueue.length}`);
    
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
  
  console.log(`Processing queue for user ${userId}, ${userQueue.length} requests pending`);
  
  while (userQueue.length > 0) {
    const request = userQueue[0];
    
    try {
      console.log(`Processing vote request for user ${userId}`);
      const result = await request.voteFunction();
      request.resolve(result);
      console.log(`Vote request completed for user ${userId}`);
    } catch (error) {
      console.error(`Vote request failed for user ${userId}:`, error);
      request.reject(error);
    }
    
    // Remove the completed request from the queue
    userQueue.shift();
  }
  
  // Clean up empty queue
  if (userQueue.length === 0) {
    requestQueues.delete(userId);
    console.log(`Queue cleared for user ${userId}`);
  }
};

/**
 * Process a complete vote: save to Firestore and update Elo rankings
 * Uses queuing to prevent concurrent writes to the same user's rankings
 * @param {string} userId - The user's UID
 * @param {string} winnerId - OPDB ID of the winning machine
 * @param {string} loserId - OPDB ID of the losing machine
 * @param {string} winnerGroup - Filter group of the winning machine
 * @param {string} loserGroup - Filter group of the losing machine
 * @throws {Error} If any part of the voting process fails
 */
export const processVote = async (userId, winnerId, loserId, winnerGroup, loserGroup) => {
  return queueVoteRequest(userId, async () => {
    await saveVoteToFirestore(userId, winnerId, loserId);
    await updateEloRankings(userId, winnerId, loserId, winnerGroup, loserGroup);
  });
};