// Simple API utilities for fetching data

import { StaticDataService } from '../services/dataService';

// Helper function to fetch with retry (for backward compatibility)
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

// Helper to fetch machines and groups data from Firebase Storage
export const fetchMachinesAndGroups = async () => {
  const { machines, groups } = await StaticDataService.getMachinesAndGroups();
  return { machinesData: machines, groupsData: groups };
};