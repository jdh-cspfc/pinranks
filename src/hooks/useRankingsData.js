import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { getCachedData } from '../caching';
import { CACHE_DURATION } from '../constants/appConstants';

/**
 * Custom hook for managing rankings data fetching and state
 * Handles user authentication, data loading, and rankings processing
 */
export const useRankingsData = () => {
  const [user, setUser] = useState(null);
  const [rankings, setRankings] = useState(null);
  const [machines, setMachines] = useState(null);
  const [groups, setGroups] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rankingsLoading, setRankingsLoading] = useState(false);

  // Handle user authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // Fetch machines and groups data with caching
  useEffect(() => {
    getCachedData('machines', () => fetch('/machines.json').then(res => res.json()), CACHE_DURATION.SEVEN_DAYS)
      .then(setMachines)
      .catch(() => setMachines([]));
      
    getCachedData('groups', () => fetch('/groups.json').then(res => res.json()), CACHE_DURATION.SEVEN_DAYS)
      .then(setGroups)
      .catch(() => setGroups([]));
  }, []);

  // Fetch user rankings when user changes
  useEffect(() => {
    if (!user) {
      setRankings(null);
      setRankingsLoading(false);
      return;
    }

    setRankingsLoading(true);
    const fetchRankings = async () => {
      try {
        const rankingsRef = doc(db, 'userRankings', user.uid);
        const rankingsSnap = await getDoc(rankingsRef);
        
        if (rankingsSnap.exists()) {
          const data = rankingsSnap.data().rankings || {};
          // Process rankings data into sorted array
          const processedRankings = Object.entries(data)
            .map(([machineId, eloObj]) => ({
              machineId,
              eloObj: eloObj && typeof eloObj === 'object' ? eloObj : { all: eloObj ?? 1200 }
            }))
            .sort((a, b) => (b.eloObj.all ?? 1200) - (a.eloObj.all ?? 1200));
          
          setRankings(processedRankings);
        } else {
          setRankings([]);
        }
      } catch (error) {
        console.error('Failed to fetch rankings:', error);
        setRankings([]);
      } finally {
        setRankingsLoading(false);
      }
    };

    fetchRankings();
  }, [user]);

  // Set initial loading to false when machines and groups are loaded
  useEffect(() => {
    if (machines !== null && groups !== null) {
      setLoading(false);
    }
  }, [machines, groups]);

  return {
    user,
    rankings,
    machines,
    groups,
    loading,
    rankingsLoading
  };
};