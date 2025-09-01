/**
 * Elo rating calculation service
 * Handles all Elo rating calculations for the pinball ranking system
 */

/**
 * Calculate new Elo ratings for winner and loser
 * @param {number} winnerScore - Current Elo rating of the winner
 * @param {number} loserScore - Current Elo rating of the loser
 * @param {number} k - K-factor for rating adjustments (default: 32)
 * @returns {[number, number]} - [newWinnerRating, newLoserRating]
 */
export const calculateElo = (winnerScore, loserScore, k = 32) => {
  const expectedWin = 1 / (1 + Math.pow(10, (loserScore - winnerScore) / 400));
  const expectedLose = 1 / (1 + Math.pow(10, (winnerScore - loserScore) / 400));
  const newWinner = winnerScore + k * (1 - expectedWin);
  const newLoser = loserScore + k * (0 - expectedLose);
  return [Math.round(newWinner), Math.round(newLoser)];
};

/**
 * Configuration constants for Elo calculations
 */
export const ELO_CONFIG = {
  K_FACTOR: 32,
  BASE_SCORE: 1200
};