import React, { useEffect, useState } from 'react'
import TopBar from './TopBar';
import { db, auth } from '../firebase'
import { collection, addDoc, serverTimestamp, doc, getDoc, setDoc, runTransaction } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { getCachedData } from '../caching';
import { getImageUrl } from '../imageUtils.js';

// Component to handle async image loading
function MachineImage({ machine, name }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    const loadImage = async () => {
      try {
        setIsLoading(true);
        setError(false);
        const url = await getImageUrl(machine, 'large');
        if (mounted) {
          setImageUrl(url);
          setIsLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(true);
          setIsLoading(false);
        }
      }
    };

    loadImage();
    
    return () => {
      mounted = false;
    };
  }, [machine]);

  if (isLoading) {
    return (
      <div className="mx-auto mb-2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" 
           style={{ width: '200px', height: '120px' }} />
    );
  }

  if (error || !imageUrl) {
    return null;
  }

  return (
    <img
      src={imageUrl}
      alt={name}
      className="mx-auto mb-2 object-contain max-h-[18vh] md:max-h-48 w-auto"
      style={{ maxWidth: '100%' }}
    />
  );
}

function LoadingText({ text }) {
  const [dots, setDots] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(d => (d + 1) % 4);
    }, 400);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="text-center mt-10 text-gray-500">
      {text}
      {'.'.repeat(dots)}
    </div>
  );
}

// Skeleton loader component
function MatchupSkeleton() {
  return (
    <>
      {/* Filter skeleton */}
      <div className="flex justify-center mt-3 mb-4">
        <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded mr-2 animate-pulse"></div>
        <div className="inline-flex shadow-sm gap-0">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`h-8 w-20 bg-gray-200 dark:bg-gray-700 animate-pulse ${
                i === 1 ? 'rounded-l' : ''
              } ${
                i === 4 ? 'rounded-r' : ''
              } ${
                i > 1 ? '-ml-px' : ''
              }`}
            ></div>
          ))}
        </div>
      </div>
      
      {/* Cards skeleton */}
      <div className="flex flex-col md:grid md:grid-cols-2 gap-3 md:gap-6" style={{ height: 'calc(87vh - 110px)' }}>
        {[1, 2].map((i) => (
          <div
            key={i}
            className="border p-3 md:p-4 rounded shadow bg-white dark:bg-gray-800 flex flex-col items-center flex-1 md:h-[70vh]"
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

  function handleFilterClick(value) {
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
  }

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
const fetchMatchup = async () => {
  try {
    setIsLoading(true);
    const [machinesData, groupsData] = await Promise.all([
      getCachedData('machines', () => fetch('/machines.json').then(res => res.json()), 3600_000),
      getCachedData('groups', () => fetch('/groups.json').then(res => res.json()), 3600_000),
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

    // Apply filter
    if (!(filter.length === 1 && filter[0] === 'All')) {
      filteredMachines = filteredMachines.filter(m => filter.includes(getFilterGroup(m.display)));
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
  } catch (err) {
    console.error('Failed to fetch OPDB data:', err);
    setError('Failed to load pinball machines.');
    setIsLoading(false);
  }
};

  // ✅ Run on first load
  useEffect(() => {
    fetchMatchup()
  }, [])

  // Refetch when filter changes
  useEffect(() => {
    fetchMatchup()
  }, [filter])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
    })
    return () => unsubscribe()
  }, [])

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
    fetchMatchup();
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

  if (isLoading) {
    return <MatchupSkeleton />;
  }

  if (!matchup || matchup.machines.length < 2) {
    return <LoadingText text="Loading matchups" />;
  }

  // Filter out null machines
  const validMachines = matchup.machines.filter(Boolean);
  if (validMachines.length < 2) {
    return <div className="text-center mt-10 text-gray-500">No matchups available for this filter.</div>;
  }

  return (
    <>
      {/* Filter Buttons */}
      <div className="flex justify-center mt-3 mb-4">
        <button
          key="All"
          className={`px-2 py-1 md:px-4 md:py-2 border text-xs md:text-sm font-medium transition-colors whitespace-nowrap mr-2 rounded
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
              className={`px-2 py-1 md:px-4 md:py-2 border text-sm md:text-sm font-medium transition-colors whitespace-nowrap
                ${filter.includes(f.value)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-700 md:hover:bg-blue-100 dark:md:hover:bg-gray-700 md:active:bg-blue-200'}
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
      <div className="flex flex-col md:grid md:grid-cols-2 gap-3 md:gap-6" style={{ height: 'calc(87vh - 110px)' }}>
      {validMachines.map((machine, i) => {
        const isClicked = clickedCard === i;
        const groupId = machine.opdb_id.split('-')[0];
        const group = matchup.groups.find(g => g.opdb_id === groupId);
        const name = group?.name || machine.name;
        const year = machine.manufacture_date?.slice(0, 4) || 'Unknown';
        const manufacturer = machine.manufacturer?.name || 'Unknown';
        
        return (
          <div
            key={groupId}
            className={`border p-3 md:p-4 rounded shadow bg-white dark:bg-gray-800 text-center border-gray-200 dark:border-gray-700 flex flex-col items-center flex-1 md:h-[70vh] overflow-auto cursor-pointer md:hover:shadow-lg md:hover:bg-blue-50 dark:md:hover:bg-gray-700 transition-all duration-100 ease-out ${
              isClicked 
                ? 'scale-[0.98] md:bg-blue-50 dark:md:hover:bg-gray-600' 
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
            <h2 className="text-lg md:text-xl font-bold mb-1 md:mb-2 text-gray-900 dark:text-gray-100 w-full">
              {name}
            </h2>
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 mb-1 md:mb-2 w-full">
              <span>{year}</span>
              <span className="mx-1">·</span>
              <span>{manufacturer}</span>
            </p>
            <MachineImage machine={machine} name={name} />
          </div>
        );
      })}
    </div>
    </>
  )
}
