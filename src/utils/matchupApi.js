// Simple API utilities for fetching data

// Helper function to fetch with retry
export const fetchWithRetry = async (url, retries = 3) => {
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

// Helper to fetch machines and groups data
export const fetchMachinesAndGroups = async () => {
  const [machinesData, groupsData] = await Promise.all([
    fetchWithRetry('/machines.json'),
    fetchWithRetry('/groups.json')
  ]);
  
  return { machinesData, groupsData };
};