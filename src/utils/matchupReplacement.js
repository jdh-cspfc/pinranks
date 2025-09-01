import { getCachedData } from '../caching';
import { 
  getFilterGroup, 
  BLOCKED_MANUFACTURERS, 
  selectBestMachineForGroup,
  filterMachinesByPreferences 
} from './matchupSelectors';

// Helper to find fallback machines when normal replacement fails
const findFallbackMachine = (machinesData, groupsData, otherGroupId, user, userPreferences) => {
  const fallbackMachines = machinesData.filter(m => {
    // Still exclude blocked manufacturers
    if (BLOCKED_MANUFACTURERS.includes(m.manufacturer?.name)) return false;
    
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
    return null;
  }
  
  // Pick a random fallback machine
  const randomFallbackMachine = fallbackMachines[Math.floor(Math.random() * fallbackMachines.length)];
  const fallbackGroupId = randomFallbackMachine.opdb_id.split('-')[0];
  const fallbackGroup = groupsData.find(g => g.opdb_id === fallbackGroupId);
  
  if (fallbackGroup) {
    return selectBestMachineForGroup(fallbackGroupId, fallbackMachines, fallbackGroup.name);
  }
  
  return null;
};

// Main machine replacement function
export const replaceMachineInMatchup = async (machineIndex, matchup, filter, user, userPreferences) => {
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

    // Filter machines based on preferences
    let filteredMachines = filterMachinesByPreferences(machinesData, filter, user, userPreferences);

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
      
      // Try fallback approach
      const fallbackMachine = findFallbackMachine(machinesData, groupsData, otherGroupId, user, userPreferences);
      
      if (!fallbackMachine) {
        console.error('No machines available even with fallback search');
        return { success: false, needsRefresh: true };
      }
      
      console.log('Using fallback machine:', fallbackMachine.name);
      return { 
        success: true, 
        newMachine: fallbackMachine 
      };
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
          console.log('Using fallback machine from valid group:', fallbackMachine.name);
          return { 
            success: true, 
            newMachine: fallbackMachine 
          };
        }
      }
      
      // If still no machine found, force a complete refresh
      console.error('Could not find replacement machine, forcing refresh');
      return { success: false, needsRefresh: true };
    }

    console.log('Replacing machine at index', machineIndex, 'with new machine:', newMachine.name);
    console.log('Old machine was:', matchup.machines[machineIndex].name);
    
    return { 
      success: true, 
      newMachine 
    };

  } catch (err) {
    console.error('Failed to replace machine:', err);
    return { success: false, needsRefresh: false };
  }
};