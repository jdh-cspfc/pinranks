import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import TopBar from './TopBar';
import { db, auth } from '../firebase'
import { collection, addDoc, serverTimestamp, doc, getDoc, setDoc, runTransaction, updateDoc } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { getCachedData } from '../caching';
import { getImageUrl } from '../imageUtils.js';
import LoadingText from './LoadingText';



// Component to handle individual machine image display
function MachineImage({ machine, name, imageUrl, imageState }) {
  // Show loading spinner only if this specific image is loading
  if (imageState.loading) {
    return (
      <div className="mx-auto mb-2 flex items-center justify-center w-full h-[18vh] sm:h-64 lg:h-80 xl:h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 dark:border-blue-400"></div>
      </div>
    );
  }

  if (!imageUrl) {
    return null;
  }

  return (
    <img
      src={imageUrl}
      alt={name}
      className="mx-auto mb-2 object-contain max-h-[18vh] sm:max-h-64 lg:max-h-80 xl:h-96 w-auto"
      style={{ maxWidth: '100%' }}
    />
  );
}



// Skeleton loader component
function MatchupSkeleton() {
  return (
    <>
      {/* Cards skeleton */}
      <div className="flex flex-col sm:grid sm:grid-cols-2 gap-3 sm:gap-6" style={{ height: 'calc(87vh - 110px)' }}>
        {[1, 2].map((i) => (
          <div
            key={i}
            className="p-3 sm:p-4 rounded shadow bg-white dark:bg-gray-800 flex flex-col items-center flex-1 sm:h-[70vh]"
          >
            <div className="h-6 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-2 animate-pulse"></div>
            <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded mb-4 animate-pulse"></div>
            <div className="h-32 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
        ))}
      </div>
    </>
  );
}

export default function Matchup() {
  const [matchup, setMatchup] = useState(null)
  const [error, setError] = useState(null)
  const [user, setUser] = useState(null)
  const [filter, setFilter] = useState(['All'])
  const [clickedCard, setClickedCard] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFiltering, setIsFiltering] = useState(false)
  const [isVoting, setIsVoting] = useState(false)
  const [userPreferences, setUserPreferences] = useState({ blockedMachines: [] })
  const [userPreferencesLoaded, setUserPreferencesLoaded] = useState(false)
  const [confirmationMessage, setConfirmationMessage] = useState(null)
  const confirmationTimeoutRef = useRef(null)
  const [imageStates, setImageStates] = useState({
    left: { url: null, loading: true, hasImage: false, machineId: null },
    right: { url: null, loading: true, hasImage: false, machineId: null }
  })
  const [bothImagesReady, setBothImagesReady] = useState(false)

  const FILTERS = [
    { label: 'All', value: 'All' },
    { label: 'EM', value: 'EM' },
    { label: 'Solid State', value: 'Solid State' },
    { label: 'DMD', value: 'DMD' },
    { label: 'LCD', value: 'LCD' },
  ];

  function getFilterGroup(display) {
    if (display === 'reels' || display === 'lights') return 'EM';
    if (display === 'alphanumeric') return 'Solid State';
    if (display === 'dmd') return 'DMD';
    if (display === 'lcd') return 'LCD';
    return null;
  }

  const handleFilterClick = useCallback((value) => {
    if (value === 'All') {
      setFilter(['All']);
    } else {
      setFilter(prev => {
        let next;
        if (prev.includes(value)) {
          next = prev.filter(f => f !== value);
        } else {
          next = [...prev.filter(f => f !== 'All'), value];
        }
        if (next.length === 0) return ['All'];
        return next;
      });
    }
  }, []); // No dependencies since we only use setFilter

  // Memoized filter buttons to prevent flickering
  const FilterButtons = useMemo(() => (
    <div className="flex justify-center mt-3 mb-4">
      <button
        key="All"
        className={`px-2 py-1 sm:px-4 sm:py-2 border text-xs sm:text-sm font-medium transition-colors whitespace-nowrap mr-2 rounded
          ${filter.includes('All')
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-700 hover:bg-blue-100 dark:hover:bg-gray-700'}`}
        onClick={() => handleFilterClick('All')}
      >
        All
      </button>
      <div className="inline-flex shadow-sm gap-0">
        {FILTERS.filter(f => f.value !== 'All').map((f, idx, arr) => (
          <button
            key={f.value}
            className={`px-2 py-1 sm:px-4 sm:py-2 border text-sm sm:text-sm font-medium transition-colors whitespace-nowrap
              ${filter.includes(f.value)
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-700 sm:hover:bg-blue-100 dark:sm:hover:bg-gray-700 sm:active:bg-blue-200'}
              ${idx === 0 ? 'rounded-l' : ''}
              ${idx === arr.length - 1 ? 'rounded-r' : ''}
              ${idx > 0 ? '-ml-px' : ''}
            `}
            onClick={() => handleFilterClick(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  ), [filter, handleFilterClick]); // Only re-render when filter or click handler changes

function selectBestMachineForGroup(groupId, machinesData, groupName) {
  const variants = machinesData.filter(machine =>
    machine.opdb_id.startsWith(groupId)
  )

  if (variants.length === 0) return null

  // Step 1: Prefer variant whose name matches the group name
  const normalize = str => str.toLowerCase().replace(/[^a-z0-9]/g, '')
  const groupKey = normalize(groupName)

  const bestNameMatch = variants
    .slice()
    .sort((a, b) => {
      const score = machine => {
        const name = normalize(machine.name)
        if (name === groupKey) return 2
        if (name.includes(groupKey)) return 1
        return 0
      }
      return score(b) - score(a)
    })[0]

  const canonicalManufacturer = bestNameMatch?.manufacturer?.name

  const filtered = variants.filter(
    m => m.manufacturer?.name === canonicalManufacturer
  )

  const prioritized = filtered.sort((a, b) => {
    const score = (machine) => {
      let baseScore = 0

      const name = normalize(machine.name)
      if (name === groupKey) baseScore += 5
      else if (name.includes(groupKey)) baseScore += 3

      if (machine.features?.includes('Premium edition')) baseScore += 2
      else if (machine.features?.includes('Pro edition')) baseScore += 1

      const hasImage =
        machine.images?.find(img => img.type === 'backglass')?.urls?.large ||
        machine.images?.find(img => img.type === 'backglass')?.urls?.medium
      if (hasImage) baseScore += 1

      return baseScore
    }

    return score(b) - score(a)
  })

  const chosen = prioritized.find(machine =>
    machine.images?.find(img => img.type === 'backglass')?.urls?.large ||
    machine.images?.find(img => img.type === 'backglass')?.urls?.medium
  ) || prioritized[0]

  return chosen
}

  // Elo rating calculation
  function calculateElo(winnerScore, loserScore, k = 32) {
    const expectedWin = 1 / (1 + Math.pow(10, (loserScore - winnerScore) / 400));
    const expectedLose = 1 / (1 + Math.pow(10, (winnerScore - loserScore) / 400));
    const newWinner = winnerScore + k * (1 - expectedWin);
    const newLoser = loserScore + k * (0 - expectedLose);
    return [Math.round(newWinner), Math.round(newLoser)];
  }


  // ✅ Fetches both machines and groups, used by initial load and after votes
const fetchMatchup = async (isFilterChange = false, isVoteChange = false) => {
  try {
    if (isFilterChange) {
      setIsFiltering(true);
    } else if (isVoteChange) {
      setIsVoting(true);
    } else {
      setIsLoading(true);
    }
    
    // Helper function to fetch with retry
    const fetchWithRetry = async (url, retries = 3) => {
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
    
    // Try to fetch both files directly without caching
    const machinesData = await fetchWithRetry('/machines.json');
    const groupsData = await fetchWithRetry('/groups.json');

    const blockedManufacturers = [
      "Mac Pinball",
      "Maguinas",
      "Maguinas / Mac Pinball",
      "I.D.I."
    ];

    let filteredMachines = machinesData.filter(m =>
      !blockedManufacturers.includes(m.manufacturer?.name)
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

    // Find all group IDs that have at least one machine in the filtered pool
    const groupIdsWithMachines = new Set(filteredMachines.map(m => m.opdb_id.split('-')[0]));
    const validGroups = groupsData.filter(g => groupIdsWithMachines.has(g.opdb_id));

    // Pick two random, distinct valid groups
    const shuffledGroups = validGroups.sort(() => 0.5 - Math.random()).slice(0, 2);

    const selectedMachines = shuffledGroups.map(group =>
      selectBestMachineForGroup(group.opdb_id, filteredMachines, group.name)
    );

    setMatchup({
      machines: selectedMachines,
      groups: groupsData,
    });
    setIsLoading(false);
    setIsFiltering(false);
    setIsVoting(false);
  } catch (err) {
    console.error('Failed to fetch OPDB data:', err);
    console.error('Error details:', {
      message: err.message,
      stack: err.stack,
      name: err.name
    });
    setError(`Failed to load pinball machines: ${err.message}`);
    setIsLoading(false);
    setIsFiltering(false);
    setIsVoting(false);
  }
};

  // ✅ Run on first load - but only after user preferences are loaded
  useEffect(() => {
    if (user && userPreferencesLoaded) {
      fetchMatchup()
    }
  }, [user, userPreferencesLoaded])

  // Reset image states and load images when matchup changes
  useEffect(() => {
    if (matchup && matchup.machines) {
      const validMachines = matchup.machines.filter(Boolean);
      
      // Check which machines have actually changed
      const leftMachineId = validMachines[0]?.opdb_id;
      const rightMachineId = validMachines[1]?.opdb_id;
      const leftChanged = leftMachineId !== imageStates.left.machineId;
      const rightChanged = rightMachineId !== imageStates.right.machineId;
      
      console.log('Image state check:', {
        leftMachineId,
        rightMachineId,
        leftChanged,
        rightChanged,
        currentLeftId: imageStates.left.machineId,
        currentRightId: imageStates.right.machineId
      });
      
      // If no machines have changed, do nothing
      if (!leftChanged && !rightChanged) {
        console.log('No machines changed, skipping image update');
        return;
      }
      
      // Load both images simultaneously
      const loadBothImages = async () => {
        if (validMachines.length < 2) {
          // Reset state when we don't have enough machines
          setImageStates(prev => ({
            ...prev,
            left: { url: null, loading: false, hasImage: false, machineId: validMachines[0]?.opdb_id },
            right: { url: null, loading: false, hasImage: false, machineId: validMachines[1]?.opdb_id }
          }));
          setBothImagesReady(true);
          return;
        }

        try {
          // Check if both machines have potential images first
          const leftHasImage = validMachines[0]?.images?.find(img => img.type === 'backglass')?.urls?.large;
          const rightHasImage = validMachines[1]?.images?.find(img => img.type === 'backglass')?.urls?.large;
          
          // Update state, preserving unchanged machines' images
          setImageStates(prev => ({
            left: {
              url: leftChanged ? null : prev.left.url,
              loading: leftChanged ? !!leftHasImage : false,
              hasImage: leftChanged ? !!leftHasImage : prev.left.hasImage,
              machineId: leftMachineId
            },
            right: {
              url: rightChanged ? null : prev.right.url,
              loading: rightChanged ? !!rightHasImage : false,
              hasImage: rightChanged ? !!rightHasImage : prev.right.hasImage,
              machineId: rightMachineId
            }
          }));

          // Only load images for machines that have changed
          const promises = [];
          
          if (leftChanged && leftHasImage) {
            promises.push(
              getImageUrl(validMachines[0], 'large')
                .then(url => ({ side: 'left', url, success: true }))
                .catch(() => ({ side: 'left', url: null, success: false }))
            );
          }
          
          if (rightChanged && rightHasImage) {
            promises.push(
              getImageUrl(validMachines[1], 'large')
                .then(url => ({ side: 'right', url, success: true }))
                .catch(() => ({ side: 'right', url: null, success: false }))
            );
          }

          // If no new images to load, mark as ready immediately
          if (promises.length === 0) {
            // No new images to load, so we're ready immediately
            setBothImagesReady(true);
            return;
          }
          
          // Only reset ready state if we actually have new images to load
          // This prevents showing loading spinners for unchanged machines
          if (promises.length > 0) {
            setBothImagesReady(false);
          }

          // Wait for new images to load
          const results = await Promise.all(promises);
          
          setImageStates(prevState => {
            const newState = { ...prevState };
            
            results.forEach(({ side, url, success }) => {
              newState[side] = {
                url: success ? url : null,
                loading: false,
                hasImage: newState[side].hasImage,
                machineId: newState[side].machineId
              };
            });
            
            // Check if both images are ready (either loaded or don't have images)
            const leftReady = !newState.left.loading;
            const rightReady = !newState.right.loading;
            const bothReady = leftReady && rightReady;
            
            if (bothReady) {
              setBothImagesReady(true);
            }
            
            return newState;
          });
        } catch (err) {
          // On error, mark both as ready to prevent infinite loading
          setImageStates(prev => ({
            ...prev,
            left: { url: null, loading: false, hasImage: false, machineId: validMachines[0]?.opdb_id },
            right: { url: null, loading: false, hasImage: false, machineId: validMachines[1]?.opdb_id }
          }));
          setBothImagesReady(true);
        }
      };

      loadBothImages();
    }
  }, [matchup?.machines?.map(m => m.opdb_id).join(','), imageStates.left.machineId, imageStates.right.machineId])

  // Refetch when filter changes - but only if we have existing data
  useEffect(() => {
    if (matchup && !isLoading && userPreferences !== undefined) {
      fetchMatchup(true) // Pass true to indicate this is a filter change
    }
  }, [filter]) // Only depend on filter changes, not userPreferences

    useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        // Test Firestore connectivity first
        try {
          const userPrefsRef = doc(db, 'userPreferences', firebaseUser.uid);
          const userPrefsSnap = await getDoc(userPrefsRef);
          if (userPrefsSnap.exists()) {
            const data = userPrefsSnap.data();
            setUserPreferences(data);
          } else {
            setUserPreferences({ blockedMachines: [] });
          }
          setUserPreferencesLoaded(true);
        } catch (err) {
          console.error('Failed to load user preferences:', err);
          // Even on error, mark as loaded so we don't get stuck in loading state
          setUserPreferencesLoaded(true);
        }
      } else {
        // User is not logged in, mark preferences as loaded with empty defaults
        setUserPreferences({ blockedMachines: [] });
        setUserPreferencesLoaded(true);
      }
    })
    return () => {
      unsubscribe()
      // Clean up any pending confirmation timeout
      if (confirmationTimeoutRef.current) {
        clearTimeout(confirmationTimeoutRef.current)
      }
    }
  }, [])

  // Mobile-specific state validation: check for inconsistent states
  useEffect(() => {
    if (window.innerWidth < 640 && matchup?.machines && userPreferences?.blockedMachines) {
      const inconsistentMachines = matchup.machines.filter(machine => {
        if (!machine) return false;
        const groupId = machine.opdb_id.split('-')[0];
        return userPreferences.blockedMachines.some(blockedId => groupId.startsWith(blockedId));
      });
      
      if (inconsistentMachines.length > 0) {
        console.warn('Found inconsistent state on mobile:', {
          inconsistentMachines: inconsistentMachines.map(m => ({ name: m.name, opdb_id: m.opdb_id })),
          blockedMachines: userPreferences.blockedMachines,
          currentTime: new Date().toISOString()
        });
        
        // Force a refresh to resolve the inconsistency
        setTimeout(() => {
          console.log('Forcing refresh to resolve mobile state inconsistency');
          fetchMatchup(false, true);
        }, 1000);
      }
    }
  }, [matchup?.machines, userPreferences?.blockedMachines]);

  // ✅ Helper to extract display data using group name
async function getDisplayInfo(machine, groups) {
  const groupId = machine.opdb_id.split('-')[0]
  const group = groups.find(g => g.opdb_id === groupId)

  // Use the new image utility to get the best available image URL
  const imageUrl = await getImageUrl(machine, 'large')

  return {
    id: groupId,
    name: group?.name || machine.name,
    image: imageUrl,
    year: machine.manufacture_date?.slice(0, 4) || 'Unknown',
    manufacturer: machine.manufacturer?.name || 'Unknown',
  }
}

  // ✅ Handle user vote
  const handleVote = async (winnerIndex) => {
    if (!user) {
      setError('You must be logged in to vote.');
      return;
    }
    
    // Set clicked card for animation feedback
    setClickedCard(winnerIndex);
    
    // Reset animation after a short delay
    setTimeout(() => {
      setClickedCard(null);
    }, 150);
    
    const { machines, groups } = matchup;
    // Note: We don't actually use winner/loser display info in the vote handler
    // so we can skip the async calls for performance
    // Optimistically fetch next matchup
    fetchMatchup(false, true);
    // Firestore work in background - fail silently for user
    (async () => {
      try {
        await addDoc(collection(db, 'userVotes'), {
          userId: user.uid,
          winnerId: machines[winnerIndex].opdb_id,
          loserId: machines[1 - winnerIndex].opdb_id,
          timestamp: serverTimestamp(),
        });
        // --- Elo ranking update with transaction ---
        const rankingsRef = doc(db, 'userRankings', user.uid);
        const winnerId = machines[winnerIndex].opdb_id;
        const loserId = machines[1 - winnerIndex].opdb_id;
        const baseScore = 1200;
        const winnerGroup = getFilterGroup(machines[winnerIndex].display);
        const loserGroup = getFilterGroup(machines[1 - winnerIndex].display);
        await runTransaction(db, async (transaction) => {
          const rankingsSnap = await transaction.get(rankingsRef);
          let rankings = rankingsSnap.exists() ? rankingsSnap.data().rankings : {};
          // Helper to get or initialize Elo object
          const getEloObj = (obj) => obj && typeof obj === 'object' ? { ...obj } : { all: obj ?? baseScore };
          const winnerElo = getEloObj(rankings[winnerId]);
          const loserElo = getEloObj(rankings[loserId]);
          // Always update 'all' Elo
          const [newWinnerAll, newLoserAll] = calculateElo(winnerElo.all ?? baseScore, loserElo.all ?? baseScore);
          winnerElo.all = newWinnerAll;
          loserElo.all = newLoserAll;
          // Update filter-specific Elo if both are in the same group
          if (winnerGroup && winnerGroup === loserGroup) {
            const [newWinnerF, newLoserF] = calculateElo(
              winnerElo[winnerGroup] ?? baseScore,
              loserElo[loserGroup] ?? baseScore
            );
            winnerElo[winnerGroup] = newWinnerF;
            loserElo[loserGroup] = newLoserF;
          }
          rankings = {
            ...rankings,
            [winnerId]: winnerElo,
            [loserId]: loserElo,
          };
          transaction.set(rankingsRef, { rankings }, { merge: true });
        });
        // --- End Elo ranking update ---
      } catch (err) {
        // Fail silently for user, but log for debugging
        console.error('Vote failed to save:', {
          userId: user.uid,
          winnerId: machines[winnerIndex].opdb_id,
          loserId: machines[1 - winnerIndex].opdb_id,
          error: err.message
        });
      }
    })();
  };

  // Replace a specific machine with a new one
  const replaceMachine = async (machineIndex) => {
    try {
      console.log('Replacing machine at index:', machineIndex);
      
      // Get current machines and groups data
      const [machinesData, groupsData] = await Promise.all([
        getCachedData('machines', () => fetch('/machines.json').then(res => {
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          }
          return res.json();
        }), 3600_000),
        getCachedData('groups', () => fetch('/groups.json').then(res => {
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          }
          return res.json();
        }), 3600_000),
      ]);

      const blockedManufacturers = [
        "Mac Pinball",
        "Maguinas",
        "Maguinas / Mac Pinball",
        "I.D.I."
      ];

      let filteredMachines = machinesData.filter(m =>
        !blockedManufacturers.includes(m.manufacturer?.name)
      );

      // Apply current filter
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

      // Exclude the other machine in the current matchup
      const otherMachine = matchup.machines[1 - machineIndex];
      const otherGroupId = otherMachine.opdb_id.split('-')[0];
      filteredMachines = filteredMachines.filter(m => 
        !m.opdb_id.startsWith(otherGroupId)
      );

      // Find all group IDs that have at least one machine in the filtered pool
      const groupIdsWithMachines = new Set(filteredMachines.map(m => m.opdb_id.split('-')[0]));
      const validGroups = groupsData.filter(g => groupIdsWithMachines.has(g.opdb_id));

      if (validGroups.length === 0) {
        console.warn('No valid groups available for replacement, trying broader search');
        
        // Fallback: try to find any valid machine that's not blocked, even if it doesn't match current filters
        const fallbackMachines = machinesData.filter(m => {
          // Still exclude blocked manufacturers
          if (blockedManufacturers.includes(m.manufacturer?.name)) return false;
          
          // Still exclude machines the user has marked as "haven't played"
          if (user && userPreferences && userPreferences.blockedMachines && userPreferences.blockedMachines.length > 0) {
            if (userPreferences.blockedMachines.some(blockedId => m.opdb_id.startsWith(blockedId))) {
              return false;
            }
          }
          
          // Still exclude the other machine in the current matchup
          if (m.opdb_id.startsWith(otherGroupId)) return false;
          
          return true;
        });
        
        if (fallbackMachines.length === 0) {
          console.error('No machines available even with fallback search');
          // Force a complete refresh to get new options
          fetchMatchup(false, true);
          return;
        }
        
        // Pick a random fallback machine
        const randomFallbackMachine = fallbackMachines[Math.floor(Math.random() * fallbackMachines.length)];
        const fallbackGroupId = randomFallbackMachine.opdb_id.split('-')[0];
        const fallbackGroup = groupsData.find(g => g.opdb_id === fallbackGroupId);
        
        if (fallbackGroup) {
          const newMachine = selectBestMachineForGroup(fallbackGroupId, fallbackMachines, fallbackGroup.name);
          if (newMachine) {
            // Update the matchup with the fallback machine
            const newMachines = [...matchup.machines];
            newMachines[machineIndex] = newMachine;
            
            console.log('Using fallback machine:', newMachine.name);
            setMatchup({
              machines: newMachines,
              groups: matchup.groups,
            });
            return true;
          }
        }
        
        // If all else fails, force a complete refresh
        console.error('All replacement strategies failed, forcing refresh');
        fetchMatchup(false, true);
        return false;
      }

      // Pick a random valid group
      const randomGroup = validGroups[Math.floor(Math.random() * validGroups.length)];
      const newMachine = selectBestMachineForGroup(randomGroup.opdb_id, filteredMachines, randomGroup.name);

      if (!newMachine) {
        console.warn('Could not select a new machine, trying fallback');
        
        // Try to find any machine from the valid groups
        for (const group of validGroups) {
          const fallbackMachine = selectBestMachineForGroup(group.opdb_id, filteredMachines, group.name);
          if (fallbackMachine) {
            // Update the matchup with the fallback machine
            const newMachines = [...matchup.machines];
            newMachines[machineIndex] = fallbackMachine;
            
            console.log('Using fallback machine from valid group:', fallbackMachine.name);
            setMatchup({
              machines: newMachines,
              groups: matchup.groups,
            });
            return true;
          }
        }
        
        // If still no machine found, force a complete refresh
        console.error('Could not find replacement machine, forcing refresh');
        fetchMatchup(false, true);
        return false;
      }

      // Update the matchup with the new machine
      const newMachines = [...matchup.machines];
      newMachines[machineIndex] = newMachine;
      
      console.log('Replacing machine at index', machineIndex, 'with new machine:', newMachine.name);
      console.log('Old machine was:', matchup.machines[machineIndex].name);
      
      setMatchup({
        machines: newMachines,
        groups: matchup.groups,
      });
      
      return true; // Success

    } catch (err) {
      console.error('Failed to replace machine:', err);
      // Don't redraw the entire matchup on error, just log the error
      // The user can still interact with the current matchup
      return false;
    }
  };

  // Handle marking machine as "haven't played"
  const handleHaventPlayed = async (machineIndex) => {
    if (!user) {
      setError('You must be logged in to use this feature.');
      return;
    }

    if (!user.uid) {
      setError('User authentication error. Please log out and log back in.');
      return;
    }

    const machine = matchup.machines[machineIndex];
    const groupId = machine.opdb_id.split('-')[0];
    
    // Add mobile-specific debugging
    const isMobile = window.innerWidth < 640; // sm breakpoint
    console.log('handleHaventPlayed called:', {
      machineIndex,
      machineName: machine.name,
      groupId,
      isMobile,
      currentTime: new Date().toISOString()
    });
    
    try {
      const userPrefsRef = doc(db, 'userPreferences', user.uid);
      
      // Ensure blockedMachines is initialized
      const currentBlockedMachines = userPreferences?.blockedMachines || [];
      
      // Add the machine group to blocked list
      const newBlockedMachines = [...currentBlockedMachines, groupId];
      console.log('Updating user preferences, blocked machines:', newBlockedMachines);
      setUserPreferences(prev => ({ 
        ...prev, 
        blockedMachines: newBlockedMachines 
      }));
      
      // Always use merge: true to prevent overwriting other data
      await setDoc(userPrefsRef, {
        blockedMachines: newBlockedMachines,
        lastUpdated: new Date().toISOString()
      }, { merge: true });
      
      // Clear any existing timeout
      if (confirmationTimeoutRef.current) {
        clearTimeout(confirmationTimeoutRef.current);
      }
      
      // Show confirmation message
      setConfirmationMessage(`${machine.name} has been added to your "Haven't Played" list`);
      
      // Clear confirmation message after 3 seconds
      confirmationTimeoutRef.current = setTimeout(() => {
        setConfirmationMessage(null);
      }, 3000);
      
      console.log('Marking machine as haven\'t played, about to replace it');
      
      // Add a small delay on mobile to ensure state updates are processed
      if (isMobile) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Replace just the blocked machine with a new one
      const replacementSuccess = await replaceMachine(machineIndex);
      
      // If replacement failed, show an error message
      if (!replacementSuccess) {
        console.error('Machine replacement failed on mobile:', { machineIndex, groupId, isMobile });
        setError('Failed to replace machine. Please try refreshing the page or try again later.');
        // Revert the user preferences since replacement failed
        setUserPreferences(prev => ({ 
          ...prev, 
          blockedMachines: currentBlockedMachines 
        }));
      } else {
        console.log('Machine replacement successful:', { machineIndex, groupId, isMobile });
      }
      
    } catch (err) {
      console.error('Failed to update preferences:', err);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to update preferences. ';
      if (err.code === 'permission-denied') {
        errorMessage += 'Permission denied. Please check if you are logged in.';
      } else if (err.code === 'unavailable') {
        errorMessage += 'Database is unavailable. Please check your internet connection.';
      } else if (err.code === 'unauthenticated') {
        errorMessage += 'Authentication failed. Please log out and log back in.';
      } else {
        errorMessage += err.message;
      }
      
      setError(errorMessage);
      // Revert local state on error
      setUserPreferences(prev => ({ 
        ...prev, 
        blockedMachines: currentBlockedMachines 
      }));
    }
  };

  if (error) {
    return <div className="text-red-600">{error}</div>
  }

  // Show loading if user preferences haven't been loaded yet
  // Use a more robust check to avoid flashing during state updates
  if (!userPreferencesLoaded) {
    return <LoadingText text="Loading..." />;
  }

  // Filter out null machines (only when matchup exists)
  const validMachines = matchup?.machines?.filter(Boolean) || [];



  // Always render filter buttons since they're static content
  const content = (
    <>
      {/* Memoized Filter Buttons */}
      {FilterButtons}
      
      {isLoading && !isVoting && !isFiltering ? (
        <MatchupSkeleton />
      ) : !matchup || !matchup.machines || matchup.machines.length < 2 ? (
        <LoadingText text="Loading matchups" />
      ) : validMachines.length < 2 ? (
        <div className="text-center mt-10 text-gray-500">No matchups available for this filter.</div>
      ) : (
        <>
          <div className={`flex flex-col sm:grid sm:grid-cols-2 gap-3 sm:gap-6 ${isVoting ? 'opacity-75 pointer-events-none' : ''}`} style={{ height: 'calc(87vh - 110px)' }}>
          {validMachines.map((machine, i) => {
            const isClicked = clickedCard === i;
            const groupId = machine.opdb_id.split('-')[0];
            const group = matchup.groups.find(g => g.opdb_id === groupId);
            const name = group?.name || machine.name;
            const year = machine.manufacture_date?.slice(0, 4) || 'Unknown';
            const manufacturer = machine.manufacturer?.name || 'Unknown';
            
            // Check if this machine group is already marked as "haven't played"
            const isAlreadyMarked = userPreferences?.blockedMachines?.some(blockedId => 
              groupId.startsWith(blockedId)
            );
            
            // Add mobile-specific debugging for state consistency
            if (window.innerWidth < 640) {
              console.log('Machine card state check:', {
                machineIndex: i,
                machineName: name,
                groupId,
                isAlreadyMarked,
                blockedMachines: userPreferences?.blockedMachines,
                currentTime: new Date().toISOString()
              });
            }
            
            return (
              <div
                key={`${groupId}-${i}-${machine.opdb_id}`}
                className={`border p-3 sm:p-4 rounded shadow bg-white dark:bg-gray-800 text-center border-gray-200 dark:border-gray-700 flex flex-col items-center flex-1 sm:h-[70vh] overflow-auto cursor-pointer sm:hover:shadow-lg sm:hover:bg-blue-50 dark:sm:hover:bg-gray-700 transition-all duration-100 ease-out relative ${
                  isClicked 
                    ? 'scale-[0.98] sm:bg-blue-50 dark:sm:hover:bg-gray-600' 
                    : 'scale-100'
                }`}
                style={{ minHeight: 0 }}
                onClick={() => {
                  if (TopBar.justClosedMenuRef && TopBar.justClosedMenuRef.current) {
                    TopBar.justClosedMenuRef.current = false;
                    return;
                  }
                  handleVote(i);
                }}
              >
                {/* Haven't Played Button - Top Right Corner */}
                <div className="absolute top-0 right-0 w-11 h-11 sm:w-[75px] sm:h-[65px] flex items-center justify-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isAlreadyMarked) {
                        handleHaventPlayed(i);
                      } else {
                        // If machine is already marked but still visible, force a refresh
                        console.warn('Attempting to interact with already-marked machine, forcing refresh');
                        fetchMatchup(false, true);
                      }
                    }}
                    className={`haven-played-btn w-5 h-5 sm:w-[70px] sm:h-[60px] flex items-center justify-center rounded-full transition-colors z-10 ${
                      isAlreadyMarked
                        ? 'text-gray-400 dark:text-gray-500 cursor-pointer hover:text-red-600 dark:hover:text-red-400'
                        : 'text-red-600 dark:text-red-400 cursor-pointer'
                    }`}
                    title={isAlreadyMarked ? "Already marked - click to refresh" : "Mark as haven't played"}
                    disabled={false}
                    style={{
                      backgroundColor: 'transparent',
                      background: 'transparent',
                      WebkitTapHighlightColor: 'transparent'
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M20 12H4" />
                    </svg>
                  </button>
                </div>
                
                <div className="w-full flex justify-center">
                  <h2 className="text-lg sm:text-xl font-bold mb-1 sm:mb-2 text-gray-900 dark:text-gray-100 break-words leading-tight text-center" style={{ maxWidth: 'calc(100% - 4rem)' }}>
                    {name}
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-1 sm:mb-2 w-full">
                  <span>{year}</span>
                  <span className="mx-1">·</span>
                  <span>{manufacturer}</span>
                </p>
                <div className="flex-1 flex items-center justify-center sm:hidden">
                  <MachineImage 
                    machine={machine} 
                    name={name} 
                    imageUrl={i === 0 ? imageStates.left.url : imageStates.right.url}
                    imageState={i === 0 ? imageStates.left : imageStates.right}
                  />
                </div>
                <div className="hidden sm:absolute sm:inset-0 sm:flex sm:items-center sm:justify-center">
                  <MachineImage 
                    machine={machine} 
                    name={name} 
                    imageUrl={i === 0 ? imageStates.left.url : imageStates.right.url}
                    imageState={i === 0 ? imageStates.left : imageStates.right}
                  />
                </div>
              </div>
            );
          })}
        </div>
        </>
      )}
    </>
  );

  return (
    <>
      {/* Minimal Toast Notification */}
      {confirmationMessage && (
        <div className="fixed bottom-2 left-1/2 transform -translate-x-1/2 sm:left-auto sm:transform-none sm:right-4 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-lg shadow-lg max-w-xs">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0"></div>
            <span className="text-xs">{confirmationMessage}</span>
          </div>
        </div>
      )}
      
      {content}
    </>
  )
}
