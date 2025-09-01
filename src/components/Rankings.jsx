import React, { useEffect, useState, useRef, useCallback } from 'react';
import { db, auth } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { getCachedData } from '../caching';
import { getFilterGroup } from '../utils/filterUtils';
import { FILTER_OPTIONS } from '../constants/filters';
// import LoadingText from './LoadingText'; // Removed for testing
import Card from './Card';

function LoadingSpinner({ size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-6 h-6'
  };
  
  return (
    <div className={`flex justify-center items-center ${className}`}>
      <div className={`${sizeClasses[size]} animate-spin rounded-full border-2 border-gray-400 border-t-gray-600`}></div>
    </div>
  );
}



// Throttle function for scroll events
function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }
}

export default function Rankings() {
  const [user, setUser] = useState(null);
  const [rankings, setRankings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rankingsLoading, setRankingsLoading] = useState(false);
  const [machines, setMachines] = useState(null);
  const [groups, setGroups] = useState(null);
  const [activeTab, setActiveTab] = useState('All');
  const [displayedCount, setDisplayedCount] = useState(50);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [newItemsLoaded, setNewItemsLoaded] = useState(false);
  
  const loadingRef = useRef(null);
  const observerRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Fetch machines.json and groups.json with caching
            getCachedData('machines', () => fetch('/machines.json').then(res => res.json()), 604800_000)
      .then(setMachines)
      .catch(() => setMachines([]));
            getCachedData('groups', () => fetch('/groups.json').then(res => res.json()), 604800_000)
      .then(setGroups)
      .catch(() => setGroups([]));
  }, []);

  useEffect(() => {
    if (!user) {
      setRankings(null);
      setRankingsLoading(false);
      return;
    }
    setRankingsLoading(true);
    const fetchRankings = async () => {
      const rankingsRef = doc(db, 'userRankings', user.uid);
      const rankingsSnap = await getDoc(rankingsRef);
      if (rankingsSnap.exists()) {
        const data = rankingsSnap.data().rankings || {};
        // Get all rankings, filtering will be done client-side
        const arr = Object.entries(data)
          .map(([machineId, eloObj]) => ({
            machineId,
            eloObj: eloObj && typeof eloObj === 'object' ? eloObj : { all: eloObj ?? 1200 }
          }))
          .sort((a, b) => (b.eloObj.all ?? 1200) - (a.eloObj.all ?? 1200));
        setRankings(arr);
      } else {
        setRankings([]);
      }
      setRankingsLoading(false);
    };
    fetchRankings();
  }, [user]);

  // Reset displayed count when filter changes
  useEffect(() => {
    setDisplayedCount(50);
    setNewItemsLoaded(false);
  }, [activeTab]);

  // Set initial loading to false when machines and groups are loaded
  useEffect(() => {
    if (machines !== null && groups !== null) {
      setLoading(false);
    }
  }, [machines, groups]);

  // Smooth loading function
  const loadMoreItems = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    
    setIsLoadingMore(true);
    
    // Simulate a small delay for smoother feel
    setTimeout(() => {
      setDisplayedCount(prev => {
        const newCount = prev + 50;
        const hasMoreItems = filteredRankings && newCount < filteredRankings.length;
        setHasMore(hasMoreItems);
        setNewItemsLoaded(true);
        setIsLoadingMore(false);
        
        // Reset the new items flag after animation
        setTimeout(() => setNewItemsLoaded(false), 300);
        
        return newCount;
      });
    }, 150);
  }, [isLoadingMore, hasMore]);

  // Intersection Observer for smooth loading
  useEffect(() => {
    if (!loadingRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && hasMore && !isLoadingMore) {
            loadMoreItems();
          }
        });
      },
      {
        rootMargin: '200px', // Start loading 200px before reaching the element
        threshold: 0.1
      }
    );

    observer.observe(loadingRef.current);
    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, isLoadingMore, loadMoreItems]);

  // Cleanup observer when component unmounts
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  function getMachineInfo(machineId) {
    if (!machines || !groups) return null;
    const machine = machines.find(m => m.opdb_id === machineId);
    if (!machine) return null;
    const groupId = machine.opdb_id.split('-')[0];
    const group = groups.find(g => g.opdb_id === groupId);
    const name = group?.name || machine.name;
    const year = machine.manufacture_date ? machine.manufacture_date.slice(0, 4) : 'Unknown';
    const manufacturer = machine.manufacturer?.name || 'Unknown';
    return { name, year, manufacturer, display: machine.display };
  }

  let filteredRankings = rankings;
  if (rankings && machines) {
    filteredRankings = rankings
      .map(item => {
        const info = getMachineInfo(item.machineId);
        if (!info) return null;
        
        // Get the appropriate score based on activeTab
        const score = activeTab === 'All' 
          ? (item.eloObj.all ?? 1200)
          : (item.eloObj[activeTab] ?? item.eloObj.all ?? 1200);
        
        return {
          ...item,
          score,
          info
        };
      })
      .filter(item => {
        if (!item) return false;
        // Filter by display type if not "All"
        if (activeTab === 'All') return true;
        return getFilterGroup(item.info.display) === activeTab;
      })
      .sort((a, b) => b.score - a.score);
  }

  // Limit displayed rankings
  const displayedRankings = filteredRankings?.slice(0, displayedCount) || [];
  const hasMoreItems = filteredRankings && displayedCount < filteredRankings.length;

  // Update hasMore state
  useEffect(() => {
    setHasMore(hasMoreItems);
  }, [hasMoreItems]);

  if (loading || !machines || !groups) return null; // Removed loading box for testing
  if (!user) return <div className="text-center mt-10 text-gray-500">Please log in to see your rankings.</div>;
  if (rankingsLoading) return null; // Removed loading box for testing
  if (!filteredRankings || filteredRankings.length === 0) return <div className="text-center mt-10 text-gray-500">No rankings yet. Vote on some matchups!</div>;

  return (
    <Card maxWidth="max-w-xl">
      {/* Tabs */}
      <div className="flex justify-center mt-3 mb-6">
        <div className="inline-flex shadow-sm gap-0">
          {FILTER_OPTIONS.map((f, idx, arr) => (
            <button
              key={f.value}
              className={`px-2 py-1 md:px-4 md:py-2 border text-sm md:text-sm font-medium transition-colors whitespace-nowrap
                ${activeTab === f.value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-700 md:hover:bg-blue-100 dark:md:hover:bg-gray-700'}
                ${idx === 0 ? 'rounded-l' : ''}
                ${idx === arr.length - 1 ? 'rounded-r' : ''}
                ${idx > 0 ? '-ml-px' : ''}
              `}
              onClick={() => setActiveTab(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <h2 className="text-lg md:text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Your Rankings</h2>
      <ol className="list-decimal pl-6">
        {displayedRankings.map((item, idx) => {
          const isNewItem = idx >= displayedCount - 50 && newItemsLoaded;
          return (
            <li 
              key={item.machineId} 
              className={`mb-2 text-xs md:text-sm text-gray-800 dark:text-gray-200 transition-all duration-300 ease-out
                ${isNewItem ? 'animate-pulse opacity-75' : 'opacity-100'}
              `}
            >
              <span className="font-semibold">{item.info.name}</span>
              <span className="text-gray-500 dark:text-gray-400 ml-2">{item.info.year}</span>
              <span className="mx-1 text-gray-400">·</span>
              <span className="text-gray-600 dark:text-gray-400">{item.info.manufacturer}</span>
            </li>
          );
        })}
        {hasMoreItems && (
          <div 
            ref={loadingRef}
            className={`transition-opacity duration-300 ${isLoadingMore ? 'opacity-100' : 'opacity-50'}`}
          >
            <LoadingSpinner size="md" className="mt-6 mb-4" />
          </div>
        )}
      </ol>
    </Card>
  );
} 