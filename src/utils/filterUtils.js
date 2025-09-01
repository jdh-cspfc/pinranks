/**
 * Shared filter utility functions for the pinball ranking system
 * Centralizes filter logic to avoid duplication across components and scripts
 */

import { DISPLAY_TO_FILTER_MAP, MODERN_FILTERS } from '../constants/filters.js';

/**
 * Get the filter group for a given display type
 * @param {string} display - The display type (e.g., 'reels', 'dmd', 'lcd')
 * @returns {string|null} - The filter group or null if not found
 */
export const getFilterGroup = (display) => {
  return DISPLAY_TO_FILTER_MAP[display] || null;
};

/**
 * Filter machines by their filter groups
 * @param {Array} machines - Array of machine objects
 * @param {Array} filterGroups - Array of filter group values to include
 * @returns {Array} - Filtered array of machines
 */
export const filterMachinesByGroup = (machines, filterGroups) => {
  if (filterGroups.includes('All')) return machines;
  return machines.filter(machine => 
    filterGroups.includes(getFilterGroup(machine.display))
  );
};

/**
 * Filter machines by priority (used in scripts)
 * @param {Array} machines - Array of machine objects
 * @param {string} priority - Priority filter ('all', 'modern', or specific group)
 * @returns {Array} - Filtered array of machines
 */
export const filterMachinesByPriority = (machines, priority) => {
  if (priority === 'all') return machines;
  
  return machines.filter(machine => {
    const group = getFilterGroup(machine.display);
    if (priority === 'modern') {
      return MODERN_FILTERS.includes(group);
    }
    return group === priority.toUpperCase();
  });
};

/**
 * Check if a machine matches any of the given filter groups
 * @param {Object} machine - Machine object with display property
 * @param {Array} filterGroups - Array of filter group values
 * @returns {boolean} - True if machine matches any filter group
 */
export const machineMatchesFilter = (machine, filterGroups) => {
  if (filterGroups.includes('All')) return true;
  const machineGroup = getFilterGroup(machine.display);
  return filterGroups.includes(machineGroup);
};