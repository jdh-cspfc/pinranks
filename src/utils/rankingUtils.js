/**
 * Utility functions for calculating ranking positions and changes
 */

import { calculateElo, ELO_CONFIG } from '../services/eloService';

/**
 * Calculate the ranking position of a machine in a sorted rankings array
 * @param {string} groupId - The group ID to find
 * @param {Array} rankings - Sorted array of rankings (highest Elo first)
 * @returns {number|null} - The 1-based ranking position, or null if not found
 */
export const getRankingPosition = (groupId, rankings) => {
  if (!rankings || !groupId) return null;
  const index = rankings.findIndex(r => r.groupId === groupId);
  return index === -1 ? null : index + 1;
};

/**
 * Calculate new rankings after a vote
 * This optimistically calculates what the rankings will be after the vote
 * @param {Array} currentRankings - Current rankings array
 * @param {string} winnerGroupId - Group ID of the winner
 * @param {string} loserGroupId - Group ID of the loser
 * @param {string} winnerFilterGroup - Filter group of the winner (optional)
 * @param {string} loserFilterGroup - Filter group of the loser (optional)
 * @returns {Array} - New rankings array sorted by Elo
 */
export const calculateNewRankings = (
  currentRankings,
  winnerGroupId,
  loserGroupId,
  winnerFilterGroup,
  loserFilterGroup
) => {
  const { BASE_SCORE } = ELO_CONFIG;
  
  // Create a map for quick lookup
  const rankingsMap = new Map();
  currentRankings.forEach(ranking => {
    rankingsMap.set(ranking.groupId, {
      ...ranking,
      eloObj: { ...ranking.eloObj }
    });
  });
  
  // Get or create winner ranking
  const winnerRanking = rankingsMap.get(winnerGroupId) || {
    groupId: winnerGroupId,
    eloObj: { all: BASE_SCORE }
  };
  
  // Get or create loser ranking
  const loserRanking = rankingsMap.get(loserGroupId) || {
    groupId: loserGroupId,
    eloObj: { all: BASE_SCORE }
  };
  
  // Calculate new Elo scores
  const winnerElo = winnerRanking.eloObj.all ?? BASE_SCORE;
  const loserElo = loserRanking.eloObj.all ?? BASE_SCORE;
  const [newWinnerElo, newLoserElo] = calculateElo(winnerElo, loserElo);
  
  // Update winner
  winnerRanking.eloObj.all = newWinnerElo;
  if (winnerFilterGroup && winnerFilterGroup === loserFilterGroup) {
    const winnerFilterElo = winnerRanking.eloObj[winnerFilterGroup] ?? BASE_SCORE;
    const loserFilterElo = loserRanking.eloObj[loserFilterGroup] ?? BASE_SCORE;
    const [newWinnerFilterElo] = calculateElo(winnerFilterElo, loserFilterElo);
    winnerRanking.eloObj[winnerFilterGroup] = newWinnerFilterElo;
  }
  
  // Update loser
  loserRanking.eloObj.all = newLoserElo;
  if (winnerFilterGroup && winnerFilterGroup === loserFilterGroup) {
    const winnerFilterElo = winnerRanking.eloObj[winnerFilterGroup] ?? BASE_SCORE;
    const loserFilterElo = loserRanking.eloObj[loserFilterGroup] ?? BASE_SCORE;
    const [, newLoserFilterElo] = calculateElo(winnerFilterElo, loserFilterElo);
    loserRanking.eloObj[loserFilterGroup] = newLoserFilterElo;
  }
  
  // Update the map
  rankingsMap.set(winnerGroupId, winnerRanking);
  rankingsMap.set(loserGroupId, loserRanking);
  
  // Convert back to array and sort by 'all' Elo (highest first)
  return Array.from(rankingsMap.values()).sort(
    (a, b) => (b.eloObj.all ?? BASE_SCORE) - (a.eloObj.all ?? BASE_SCORE)
  );
};

/**
 * Calculate ranking change for a machine after a vote
 * @param {string} groupId - The group ID to check
 * @param {Array} oldRankings - Rankings before the vote
 * @param {Array} newRankings - Rankings after the vote
 * @returns {Object} - { oldPosition, newPosition, change }
 */
export const calculateRankingChange = (groupId, oldRankings, newRankings) => {
  const oldPosition = getRankingPosition(groupId, oldRankings);
  const newPosition = getRankingPosition(groupId, newRankings);
  
  if (oldPosition === null && newPosition === null) {
    return { oldPosition: null, newPosition: null, change: 0 };
  }
  
  if (oldPosition === null) {
    // Machine wasn't ranked before, now it is
    return { oldPosition: null, newPosition, change: null };
  }
  
  if (newPosition === null) {
    // Machine was ranked before, now it's not (shouldn't happen)
    return { oldPosition, newPosition: null, change: null };
  }
  
  const change = oldPosition - newPosition; // Positive means moved up, negative means moved down
  
  return { oldPosition, newPosition, change };
};

