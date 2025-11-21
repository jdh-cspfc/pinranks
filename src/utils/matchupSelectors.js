// Import and re-export getFilterGroup from shared utilities
import { getFilterGroup, getMachineFilterGroup } from './filterUtils.js';
export { getFilterGroup };

// Blocked manufacturers list
export const BLOCKED_MANUFACTURERS = [
  "Mac Pinball",
  "Maguinas",
  "Maguinas / Mac Pinball",
  "I.D.I."
];

// Helper to determine if a machine is a conversion kit
// We never want to show images for these machines in matchups
const isConversionKit = (machine) => {
  if (!machine) return false;

  // OPDB-style data typically stores descriptors in arrays like `features`
  // but we defensively check a few common fields.
  const candidateLists = [
    Array.isArray(machine.features) ? machine.features : null,
    Array.isArray(machine.tags) ? machine.tags : null,
    Array.isArray(machine.attributes) ? machine.attributes : null,
    Array.isArray(machine.keywords) ? machine.keywords : null,
  ].filter(Boolean);

  if (candidateLists.length === 0) return false;

  const combined = candidateLists
    .flat()
    .join(' ')
    .toLowerCase();

  return combined.includes('conversion kit');
};

// Helper to select best machine for a group
export function selectBestMachineForGroup(groupId, machinesData, groupName) {
  // Exclude conversion kits entirely so their images are never used
  const variants = machinesData.filter(machine =>
    machine.opdb_id.startsWith(groupId) && !isConversionKit(machine)
  );

  if (variants.length === 0) return null;

  // Step 1: Prefer variant whose name matches the group name
  const normalize = str => str.toLowerCase().replace(/[^a-z0-9]/g, '');
  const groupKey = normalize(groupName);

  const bestNameMatch = variants
    .slice()
    .sort((a, b) => {
      const score = machine => {
        const name = normalize(machine.name);
        if (name === groupKey) return 2;
        if (name.includes(groupKey)) return 1;
        return 0;
      };
      return score(b) - score(a);
    })[0];

  const canonicalManufacturer = bestNameMatch?.manufacturer?.name;

  const filtered = variants.filter(
    m => m.manufacturer?.name === canonicalManufacturer
  );

  const prioritized = filtered.sort((a, b) => {
    const score = (machine) => {
      let baseScore = 0;

      const name = normalize(machine.name);
      if (name === groupKey) baseScore += 5;
      else if (name.includes(groupKey)) baseScore += 3;

      if (machine.features?.includes('Premium edition')) baseScore += 2;
      else if (machine.features?.includes('Pro edition')) baseScore += 1;

      const hasImage =
        machine.images?.find(img => img.type === 'backglass')?.urls?.large ||
        machine.images?.find(img => img.type === 'backglass')?.urls?.medium;
      if (hasImage) baseScore += 1;

      return baseScore;
    };

    return score(b) - score(a);
  });

  const chosen = prioritized.find(machine =>
    machine.images?.find(img => img.type === 'backglass')?.urls?.large ||
    machine.images?.find(img => img.type === 'backglass')?.urls?.medium
  ) || prioritized[0];

  return chosen;
}

// Helper to filter machines based on blocked manufacturers and user preferences
export const filterMachinesByPreferences = (machinesData, filter, user, userPreferences) => {
  let filteredMachines = machinesData.filter(m =>
    !BLOCKED_MANUFACTURERS.includes(m.manufacturer?.name) &&
    // Globally exclude conversion kits so they never appear in matchups/images
    !isConversionKit(m)
  );

  // Apply filter
  if (!(filter.length === 1 && filter[0] === 'All')) {
    const cache = new Map();
    filteredMachines = filteredMachines.filter(m => 
      filter.includes(getMachineFilterGroup(m, machinesData, cache))
    );
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

const shuffleValidGroups = (validGroups) => {
  const groups = validGroups.slice();
  for (let i = groups.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [groups[i], groups[j]] = [groups[j], groups[i]];
  }
  return groups;
};

// Helper to select random matchup from filtered machines and groups
export const selectRandomMatchup = (filteredMachines, groupsData) => {
  // Find all group IDs that have at least one machine in the filtered pool
  const groupIdsWithMachines = new Set(filteredMachines.map(m => m.opdb_id.split('-')[0]));
  const validGroups = groupsData.filter(g => groupIdsWithMachines.has(g.opdb_id));

  // Pick two random, distinct valid groups
  const shuffledGroups = shuffleValidGroups(validGroups).slice(0, 2);

  const selectedMachines = shuffledGroups.map(group =>
    selectBestMachineForGroup(group.opdb_id, filteredMachines, group.name)
  );

  return selectedMachines;
};