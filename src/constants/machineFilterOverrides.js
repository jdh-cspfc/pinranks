/**
 * Machine filter group overrides
 * Maps machine identifiers (opdb_id or groupId) to their correct filter groups
 * Used when machines have incorrect or missing display types
 * 
 * Supports both:
 * - Full opdb_id (e.g., '12345-abc') - overrides specific machine variant
 * - groupId (e.g., '12345') - overrides all machines in a group
 * 
 * Note: Full opdb_id takes precedence over groupId if both exist
 * 
 * Filter groups:
 * - EM: Electromechanical
 * - DMD: Digital Matrix Display
 * - Modern: Modern machines
 * - Solid State: Solid State machines
 */
export const MACHINE_FILTER_OVERRIDES = {
    'G50Wr-MLeZP': 'DMD',           //Revenge from Mars
    'GRL9r-MD34z': 'DMD',           //Star Wars Episode 1
    'GR6qB-MQZxk': 'Solid State',   //Harem Cat
    'GR02j-MLy1Z': 'Solid State',   //Dakar
    'GRb2y-MZezV': 'Solid State',   //Motor Show
    'G56Y8-MDlqK': 'Solid State',   //World Cup '90
    'G5Kvx-MQdpl': 'Solid State',   //Baby Pac-Man
    'G4OKd-Mb51r': 'Solid State',   //Granny and the Gators
    'GrJ07-MjB7X': 'Solid State',   //Mac Attack
};

