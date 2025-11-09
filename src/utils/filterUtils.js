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
 * Determine the best-fit filter group for a machine.
 * Falls back to other variants in the same machine group when display data is missing.
 * @param {Object} machine - Machine object with opdb_id/display
 * @param {Array} machines - Full machines dataset for fallback lookups
 * @param {Map} cache - Cache keyed by groupId to avoid repeated scans
 * @returns {string|null} - Effective filter group or null if unknown
 */
export const getMachineFilterGroup = (machine, machines, cache = new Map()) => {
  if (!machine) return null;

  const directGroup = getFilterGroup(machine.display);
  if (directGroup) {
    return directGroup;
  }

  const groupId = machine.opdb_id?.split?.('-')?.[0];
  if (!groupId) return null;

  if (cache.has(groupId)) {
    return cache.get(groupId);
  }

  const fallbackVariant = machines?.find?.((candidate) => {
    if (!candidate?.opdb_id?.startsWith?.(groupId)) return false;
    return !!getFilterGroup(candidate.display);
  }) || null;

  const fallbackGroup = fallbackVariant ? getFilterGroup(fallbackVariant.display) : null;
  cache.set(groupId, fallbackGroup);
  return fallbackGroup;
};

/**
 * Filter machines by their filter groups
 * @param {Array} machines - Array of machine objects
 * @param {Array} filterGroups - Array of filter group values to include
 * @returns {Array} - Filtered array of machines
 */
export const filterMachinesByGroup = (machines, filterGroups) => {
  if (filterGroups.includes('All')) return machines;
  const cache = new Map();
  return machines.filter(machine => 
    filterGroups.includes(getMachineFilterGroup(machine, machines, cache))
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
  
  const cache = new Map();
  return machines.filter(machine => {
    const group = getMachineFilterGroup(machine, machines, cache);
    if (priority === 'modern') {
      return MODERN_FILTERS.includes(group);
    }
    return group === priority;
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