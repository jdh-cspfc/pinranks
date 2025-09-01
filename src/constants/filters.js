/**
 * Shared filter constants for the pinball ranking system
 * Centralizes filter definitions to avoid duplication across components
 */

export const FILTER_OPTIONS = [
  { label: 'All', value: 'All' },
  { label: 'EM', value: 'EM' },
  { label: 'Solid State', value: 'Solid State' },
  { label: 'DMD', value: 'DMD' },
  { label: 'LCD', value: 'LCD' },
];

/**
 * Maps display types to their corresponding filter groups
 */
export const DISPLAY_TO_FILTER_MAP = {
  'reels': 'EM',
  'lights': 'EM', 
  'alphanumeric': 'Solid State',
  'dmd': 'DMD',
  'lcd': 'LCD'
};

/**
 * Modern filter groups (LCD and DMD)
 */
export const MODERN_FILTERS = ['LCD', 'DMD'];

/**
 * Legacy filter groups (EM and Solid State)
 */
export const LEGACY_FILTERS = ['EM', 'Solid State'];