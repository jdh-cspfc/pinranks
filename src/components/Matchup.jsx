import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import TopBar from './TopBar';
import { db } from '../firebase'
import { collection, addDoc, serverTimestamp, doc, runTransaction } from 'firebase/firestore'
import { useMatchupData } from '../hooks/useMatchupData';
import { useImageLoading } from '../hooks/useImageLoading';
import { useUserPreferences } from '../hooks/useUserPreferences';



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



// Skeleton loader component removed for testing

export default function Matchup() {
  const [filter, setFilter] = useState(['All'])
  const [clickedCard, setClickedCard] = useState(null)
  
  // Custom hooks for complex logic
  const { user, userPreferences, userPreferencesLoaded, confirmationMessage, handleHaventPlayed } = useUserPreferences();
  const { matchup, error, isLoading, isFiltering, isVoting, fetchMatchup, replaceMachine } = useMatchupData(filter, user, userPreferences);
  const { imageStates, bothImagesReady } = useImageLoading(matchup);

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


  // ✅ Helper to extract display data using group name
  function getDisplayInfo(machine, groups) {
    const groupId = machine.opdb_id.split('-')[0]
    const group = groups.find(g => g.opdb_id === groupId)

    return {
      id: groupId,
      name: group?.name || machine.name,
      year: machine.manufacture_date?.slice(0, 4) || 'Unknown',
      manufacturer: machine.manufacturer?.name || 'Unknown',
    }
  }



  // ✅ Run on first load - but only after user preferences are loaded
  useEffect(() => {
    if (user && userPreferencesLoaded) {
      fetchMatchup()
    }
  }, [user, userPreferencesLoaded])

  // Refetch when filter changes - but only if we have existing data
  useEffect(() => {
    if (matchup && !isLoading && userPreferences !== undefined) {
      fetchMatchup(true) // Pass true to indicate this is a filter change
    }
  }, [filter])



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





  if (error) {
    return <div className="text-red-600">{error}</div>
  }

  // Show loading if user preferences haven't been loaded yet
  // Use a more robust check to avoid flashing during state updates
  if (!userPreferencesLoaded) {
    return null; // Removed loading box for testing
  }

  // Filter out null machines (only when matchup exists)
  const validMachines = matchup?.machines?.filter(Boolean) || [];



  // Always render filter buttons since they're static content
  const content = (
    <>
      {/* Memoized Filter Buttons */}
      {FilterButtons}
      
      {!matchup || !matchup.machines || matchup.machines.length < 2 ? (
        null // Removed loading box for testing
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
        console.log('Mobile: Machine card state check:', {
          machineIndex: i,
          machineName: name,
          groupId,
          isAlreadyMarked,
          blockedMachines: userPreferences?.blockedMachines,
          currentTime: new Date().toISOString()
        });
        
        // Log potential stuck machine scenarios
        if (isAlreadyMarked) {
          console.warn('Mobile: Rendering already-marked machine - this might indicate a stuck state:', {
            machineName: name,
            groupId,
            blockedMachines: userPreferences?.blockedMachines
          });
        }
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
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!isAlreadyMarked) {
                        try {
                          await handleHaventPlayed(i, matchup, replaceMachine);
                        } catch (err) {
                          console.error('Failed to mark machine as haven\'t played:', err);
                          // You could add a toast notification here for user feedback
                        }
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
