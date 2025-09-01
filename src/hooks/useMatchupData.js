import { useState, useEffect, useCallback } from 'react';
import { getCachedData } from '../caching';

// Helper function to fetch with retry
const fetchWithRetry = async (url, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      return data;
    } catch (err) {
      if (i === retries - 1) throw err;
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
};

// Helper to fetch machines and groups data with caching
const fetchMachinesAndGroups = async () => {
  const [machinesData, groupsData] = await Promise.all([
    getCachedData('machines', () => 
      fetchWithRetry('/machines.json'), 
      604800_000 // 7 day cache
    ),
    getCachedData('groups', () => 
      fetchWithRetry('/groups.json'), 
      604800_000 // 7 day cache
    ),
  ]);
  
  return { machinesData, groupsData };
};

// Helper to get filter group for a machine
const getFilterGroup = (display) => {
  if (display === 'reels' || display === 'lights') return 'EM';
  if (display === 'alphanumeric') return 'Solid State';
  if (display === 'dmd') return 'DMD';
  if (display === 'lcd') return 'LCD';
  return null;
};

// Helper to select best machine for a group
function selectBestMachineForGroup(groupId, machinesData, groupName) {
  const variants = machinesData.filter(machine =>
    machine.opdb_id.startsWith(groupId)
  )

  if (variants.length === 0) return null

  // Step 1: Prefer variant whose name matches the group name
  const normalize = str => str.toLowerCase().replace(/[^a-z0-9]/g, '')
  const groupKey = normalize(groupName)

  const bestNameMatch = variants
    .slice()
    .sort((a, b) => {
      const score = machine => {
        const name = normalize(machine.name)
        if (name === groupKey) return 2
        if (name.includes(groupKey)) return 1
        return 0
      }
      return score(b) - score(a)
    })[0]

  const canonicalManufacturer = bestNameMatch?.manufacturer?.name

  const filtered = variants.filter(
    m => m.manufacturer?.name === canonicalManufacturer
  )

  const prioritized = filtered.sort((a, b) => {
    const score = (machine) => {
      let baseScore = 0

      const name = normalize(machine.name)
      if (name === groupKey) baseScore += 5
      else if (name.includes(groupKey)) baseScore += 3

      if (machine.features?.includes('Premium edition')) baseScore += 2
      else if (machine.features?.includes('Pro edition')) baseScore += 1

      const hasImage =
        machine.images?.find(img => img.type === 'backglass')?.urls?.large ||
        machine.images?.find(img => img.type === 'backglass')?.urls?.medium
      if (hasImage) baseScore += 1

      return baseScore
    }

    return score(b) - score(a)
  })

  const chosen = prioritized.find(machine =>
    machine.images?.find(img => img.type === 'backglass')?.urls?.large ||
    machine.images?.find(img => img.type === 'backglass')?.urls?.medium
  ) || prioritized[0]

  return chosen
}

// Helper to filter machines based on blocked manufacturers and user preferences
const filterMachinesByPreferences = (machinesData, filter, user, userPreferences) => {
  const blockedManufacturers = [
    "Mac Pinball",
    "Maguinas",
    "Maguinas / Mac Pinball",
    "I.D.I."
  ];

  let filteredMachines = machinesData.filter(m =>
    !blockedManufacturers.includes(m.manufacturer?.name)
  );

  // Apply filter
  if (!(filter.length === 1 && filter[0] === 'All')) {
    filteredMachines = filteredMachines.filter(m => filter.includes(getFilterGroup(m.display)));
  }

  // Filter out machines the user has marked as "haven't played"
  if (user && userPreferences && userPreferences.blockedMachines && userPreferences.blockedMachines.length > 0) {
    filteredMachines = filteredMachines.filter(m => 
      !userPreferences.blockedMachines.some(blockedId => 
        m.opdb_id.startsWith(blockedId)
      )
    );
  }

  return filteredMachines;
};

// Helper to select random matchup from filtered machines and groups
const selectRandomMatchup = (filteredMachines, groupsData) => {
  // Find all group IDs that have at least one machine in the filtered pool
  const groupIdsWithMachines = new Set(filteredMachines.map(m => m.opdb_id.split('-')[0]));
  const validGroups = groupsData.filter(g => groupIdsWithMachines.has(g.opdb_id));

  // Pick two random, distinct valid groups
  const shuffledGroups = validGroups.sort(() => 0.5 - Math.random()).slice(0, 2);

  const selectedMachines = shuffledGroups.map(group =>
    selectBestMachineForGroup(group.opdb_id, filteredMachines, group.name)
  );

  return selectedMachines;
};

export const useMatchupData = (filter, user, userPreferences) => {
  const [matchup, setMatchup] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const [isVoting, setIsVoting] = useState(false);

  // Helper to handle loading states
  const setLoadingStates = (isFilterChange, isVoteChange) => {
    if (isFilterChange) {
      setIsFiltering(true);
    } else if (isVoteChange) {
      setIsVoting(true);
    } else {
      setIsLoading(true);
    }
  };

  // Helper to clear loading states
  const clearLoadingStates = () => {
    setIsLoading(false);
    setIsFiltering(false);
    setIsVoting(false);
  };

  // Main function to fetch matchup data
  const fetchMatchup = useCallback(async (isFilterChange = false, isVoteChange = false) => {
    try {
      setLoadingStates(isFilterChange, isVoteChange);
      
      const { machinesData, groupsData } = await fetchMachinesAndGroups();
      const filteredMachines = filterMachinesByPreferences(machinesData, filter, user, userPreferences);
      const selectedMachines = selectRandomMatchup(filteredMachines, groupsData);

      setMatchup({
        machines: selectedMachines,
        groups: groupsData,
      });
      
      clearLoadingStates();
    } catch (err) {
      console.error('Failed to fetch OPDB data:', err);
      console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      setError(`Failed to load pinball machines: ${err.message}`);
      clearLoadingStates();
    }
  }, [filter, user, userPreferences]);

  // Replace a specific machine with a new one
  const replaceMachine = useCallback(async (machineIndex) => {
    try {
      console.log('Replacing machine at index:', machineIndex);
      
      // Get current machines and groups data
      const [machinesData, groupsData] = await Promise.all([
        getCachedData('machines', () => fetch('/machines.json').then(res => {
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          }
          return res.json();
        }), 604800_000),
        getCachedData('groups', () => fetch('/groups.json').then(res => {
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          }
          return res.json();
        }), 604800_000),
      ]);

      const blockedManufacturers = [
        "Mac Pinball",
        "Maguinas",
        "Maguinas / Mac Pinball",
        "I.D.I."
      ];

      let filteredMachines = machinesData.filter(m =>
        !blockedManufacturers.includes(m.manufacturer?.name)
      );

      // Apply current filter
      if (!(filter.length === 1 && filter[0] === 'All')) {
        filteredMachines = filteredMachines.filter(m => filter.includes(getFilterGroup(m.display)));
      }

      // Filter out machines the user has marked as "haven't played"
      if (user && userPreferences && userPreferences.blockedMachines && userPreferences.blockedMachines.length > 0) {
        filteredMachines = filteredMachines.filter(m => 
          !userPreferences.blockedMachines.some(blockedId => 
            m.opdb_id.startsWith(blockedId)
          )
        );
      }

      // Exclude the other machine in the current matchup
      const otherMachine = matchup.machines[1 - machineIndex];
      const otherGroupId = otherMachine.opdb_id.split('-')[0];
      filteredMachines = filteredMachines.filter(m => 
        !m.opdb_id.startsWith(otherGroupId)
      );

      // Find all group IDs that have at least one machine in the filtered pool
      const groupIdsWithMachines = new Set(filteredMachines.map(m => m.opdb_id.split('-')[0]));
      const validGroups = groupsData.filter(g => groupIdsWithMachines.has(g.opdb_id));

      if (validGroups.length === 0) {
        console.warn('No valid groups available for replacement, trying broader search');
        
        // Fallback: try to find any valid machine that's not blocked, even if it doesn't match current filters
        const fallbackMachines = machinesData.filter(m => {
          // Still exclude blocked manufacturers
          if (blockedManufacturers.includes(m.manufacturer?.name)) return false;
          
          // Still exclude machines the user has marked as "haven't played"
          if (user && userPreferences && userPreferences.blockedMachines && userPreferences.blockedMachines.length > 0) {
            if (userPreferences.blockedMachines.some(blockedId => m.opdb_id.startsWith(blockedId))) {
              return false;
            }
          }
          
          // Still exclude the other machine in the current matchup
          if (m.opdb_id.startsWith(otherGroupId)) return false;
          
          return true;
        });
        
        if (fallbackMachines.length === 0) {
          console.error('No machines available even with fallback search');
          // Force a complete refresh to get new options
          fetchMatchup(false, true);
          return;
        }
        
        // Pick a random fallback machine
        const randomFallbackMachine = fallbackMachines[Math.floor(Math.random() * fallbackMachines.length)];
        const fallbackGroupId = randomFallbackMachine.opdb_id.split('-')[0];
        const fallbackGroup = groupsData.find(g => g.opdb_id === fallbackGroupId);
        
        if (fallbackGroup) {
          const newMachine = selectBestMachineForGroup(fallbackGroupId, fallbackMachines, fallbackGroup.name);
          if (newMachine) {
            // Update the matchup with the fallback machine
            const newMachines = [...matchup.machines];
            newMachines[machineIndex] = newMachine;
            
            console.log('Using fallback machine:', newMachine.name);
            setMatchup({
              machines: newMachines,
              groups: matchup.groups,
            });
            return true;
          }
        }
        
        // If all else fails, force a complete refresh
        console.error('All replacement strategies failed, forcing refresh');
        fetchMatchup(false, true);
        return false;
      }

      // Pick a random valid group
      const randomGroup = validGroups[Math.floor(Math.random() * validGroups.length)];
      const newMachine = selectBestMachineForGroup(randomGroup.opdb_id, filteredMachines, randomGroup.name);

      if (!newMachine) {
        console.warn('Could not select a new machine, trying fallback');
        
        // Try to find any machine from the valid groups
        for (const group of validGroups) {
          const fallbackMachine = selectBestMachineForGroup(group.opdb_id, filteredMachines, group.name);
          if (fallbackMachine) {
            // Update the matchup with the fallback machine
            const newMachines = [...matchup.machines];
            newMachines[machineIndex] = fallbackMachine;
            
            console.log('Using fallback machine from valid group:', fallbackMachine.name);
            setMatchup({
              machines: newMachines,
              groups: matchup.groups,
            });
            return true;
          }
        }
        
        // If still no machine found, force a complete refresh
        console.error('Could not find replacement machine, forcing refresh');
        fetchMatchup(false, true);
        return false;
      }

      // Update the matchup with the new machine
      const newMachines = [...matchup.machines];
      newMachines[machineIndex] = newMachine;
      
      console.log('Replacing machine at index', machineIndex, 'with new machine:', newMachine.name);
      console.log('Old machine was:', matchup.machines[machineIndex].name);
      
      setMatchup({
        machines: newMachines,
        groups: matchup.groups,
      });
      
      return true; // Success

    } catch (err) {
      console.error('Failed to replace machine:', err);
      // Don't redraw the entire matchup on error, just log the error
      // The user can still interact with the current matchup
      return false;
    }
  }, [matchup, filter, user, userPreferences, fetchMatchup]);

  return {
    matchup,
    error,
    isLoading,
    isFiltering,
    isVoting,
    fetchMatchup,
    replaceMachine,
    clearError: () => setError(null)
  };
}; 