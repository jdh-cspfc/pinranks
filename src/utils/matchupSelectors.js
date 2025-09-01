// Helper to get filter group for a machine
export const getFilterGroup = (display) => {
  if (display === 'reels' || display === 'lights') return 'EM';
  if (display === 'alphanumeric') return 'Solid State';
  if (display === 'dmd') return 'DMD';
  if (display === 'lcd') return 'LCD';
  return null;
};

// Blocked manufacturers list
export const BLOCKED_MANUFACTURERS = [
  "Mac Pinball",
  "Maguinas",
  "Maguinas / Mac Pinball",
  "I.D.I."
];

// Helper to select best machine for a group
export function selectBestMachineForGroup(groupId, machinesData, groupName) {
  const variants = machinesData.filter(machine =>
    machine.opdb_id.startsWith(groupId)
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
    !BLOCKED_MANUFACTURERS.includes(m.manufacturer?.name)
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
export const selectRandomMatchup = (filteredMachines, groupsData) => {
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