/**
 * Centralized hook for ranking filtering logic
 * Replaces duplicated filtering logic across useAppData, Rankings, and RankingsList
 */

import { useMemo } from 'react';
import { getFilterGroup } from '../utils/filterUtils';

/**
 * Helper to get machine information from group ID
 * Rankings are stored at the group level, so we need to find a representative machine from the group
 */
const getMachineInfo = (groupId, machines, groups) => {
  if (!machines || !groups) return null;
  
  // Find the group
  const group = groups.find(g => g.opdb_id === groupId);
  if (!group) return null;
  
  // Find any machine in this group to get metadata (manufacturer, year, display type)
  const machine = machines.find(m => m.opdb_id.startsWith(groupId + '-'));
  
  const name = group?.name || machine?.name || 'Unknown';
  const year = machine?.manufacture_date ? machine.manufacture_date.slice(0, 4) : 'Unknown';
  const manufacturer = machine?.manufacturer?.name || 'Unknown';
  const display = machine?.display || null;
  
  return { name, year, manufacturer, display };
};

/**
 * Filter rankings to exclude machines from blocked machine groups
 * Rankings now use groupId directly (backward compatible with machineId during migration)
 */
export const filterRankingsByBlockedMachines = (rankings, blockedMachines) => {
  if (!rankings || !blockedMachines || blockedMachines.length === 0) {
    return rankings;
  }

  return rankings.filter(ranking => {
    const groupId = ranking.groupId || ranking.machineId?.split('-')[0];
    if (!groupId) return false; // Skip invalid rankings
    return !blockedMachines.some(blockedId => groupId.startsWith(blockedId));
  });
};

/**
 * Hook for filtering and processing rankings based on active tab/filter
 * @param {Array} rankings - Array of ranking objects
 * @param {Array} machines - Array of machine objects
 * @param {Array} groups - Array of group objects
 * @param {string} activeTab - Active filter tab ('All', 'EM', 'DMD', etc.)
 * @returns {Object} - { filteredRankings, filteredCount, getMachineInfo }
 */
export const useRankingFilter = (rankings, machines, groups, activeTab = 'All') => {
  const filteredRankings = useMemo(() => {
    if (!rankings || !machines || !groups) return [];

    return rankings
      .map(item => {
        // Rankings now use groupId instead of machineId
        const groupId = item.groupId || item.machineId;
        const info = getMachineInfo(groupId, machines, groups);
        if (!info) return null;
        
        // Get the appropriate score based on activeTab
        const score = activeTab === 'All' 
          ? (item.eloObj.all ?? 1200)
          : (item.eloObj[activeTab] ?? item.eloObj.all ?? 1200);
        
        return {
          ...item,
          score,
          info
        };
      })
      .filter(item => {
        if (!item) return false;
        // Filter by display type if not "All"
        if (activeTab === 'All') return true;
        return getFilterGroup(item.info.display) === activeTab;
      })
      .sort((a, b) => b.score - a.score);
  }, [rankings, machines, groups, activeTab]);

  const getMachineInfoForGroup = useMemo(() => {
    return (groupId) => getMachineInfo(groupId, machines, groups);
  }, [machines, groups]);

  return {
    filteredRankings,
    filteredCount: filteredRankings.length,
    getMachineInfo: getMachineInfoForGroup
  };
};

