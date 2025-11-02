import { 
  getFilterGroup, 
  BLOCKED_MANUFACTURERS, 
  selectBestMachineForGroup,
  filterMachinesByPreferences 
} from './matchupSelectors';
import { StaticDataService } from '../services/dataService';

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
    // Replacing machine at index
    
    // Get current machines and groups data from Firebase Storage
    const { machines: machinesData, groups: groupsData } = await StaticDataService.getMachinesAndGroups();

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
      // No valid groups available for replacement, trying broader search
      
      // Try fallback approach
      const fallbackMachine = findFallbackMachine(machinesData, groupsData, otherGroupId, user, userPreferences);
      
      if (!fallbackMachine) {
        // No machines available even with fallback search
        return { success: false, needsRefresh: true };
      }
      
      // Using fallback machine
      return { 
        success: true, 
        newMachine: fallbackMachine 
      };
    }

    // Pick a random valid group
    const randomGroup = validGroups[Math.floor(Math.random() * validGroups.length)];
    const newMachine = selectBestMachineForGroup(randomGroup.opdb_id, filteredMachines, randomGroup.name);

    if (!newMachine) {
      // Could not select a new machine, trying fallback
      
      // Try to find any machine from the valid groups
      for (const group of validGroups) {
        const fallbackMachine = selectBestMachineForGroup(group.opdb_id, filteredMachines, group.name);
        if (fallbackMachine) {
          // Using fallback machine from valid group
          return { 
            success: true, 
            newMachine: fallbackMachine 
          };
        }
      }
      
      // If still no machine found, force a complete refresh
      // Could not find replacement machine, forcing refresh
      return { success: false, needsRefresh: true };
    }

    // Replacing machine with new one
    
    return { 
      success: true, 
      newMachine 
    };

  } catch (err) {
    // Failed to replace machine - error will be handled by calling component
    return { success: false, needsRefresh: false };
  }
};