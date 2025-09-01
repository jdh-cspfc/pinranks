import { useAppData } from './useAppData';

/**
 * Custom hook for managing rankings data
 * Now uses centralized data from useAppData hook
 */
export const useRankingsData = () => {
  const {
    user,
    userRankings: rankings,
    machines,
    groups,
    isLoading: loading,
    isUserDataLoading: rankingsLoading
  } = useAppData();

  return {
    user,
    rankings,
    machines,
    groups,
    loading,
    rankingsLoading
  };
};