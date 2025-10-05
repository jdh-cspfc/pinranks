import React, { useState, useEffect } from 'react';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import RankingsFilters from './Rankings/RankingsFilters';
import RankingsList from './Rankings/RankingsList';
import Card from './Card';

/**
 * Main Rankings component - now much simpler and focused
 * Uses custom hooks for data management and infinite scroll
 */
export default function Rankings({ appData }) {
  const [activeTab, setActiveTab] = useState('All');
  
  // Extract data from appData prop instead of calling useRankingsData
  const { 
    user, 
    userRankings: rankings, 
    machines, 
    groups, 
    isLoading: loading, 
    isUserDataLoading: rankingsLoading 
  } = appData;
  const { 
    displayedCount, 
    hasMore, 
    isLoadingMore, 
    newItemsLoaded, 
    loadingRef, 
    resetDisplayCount 
  } = useInfiniteScroll(rankings?.length);

  // Reset displayed count when filter changes
  useEffect(() => {
    resetDisplayCount();
  }, [activeTab, resetDisplayCount]);

  // Early returns for loading and error states
  if (loading || !machines || !groups) return null;
  if (!user) return <div className="text-center mt-10 text-gray-500">Please log in to see your rankings.</div>;
  if (rankingsLoading) return null;
  if (!rankings || rankings.length === 0) return <div className="text-center mt-10 text-gray-500">No rankings yet. Vote on some machines!</div>;

  return (
    <Card maxWidth="max-w-xl">
      <RankingsFilters activeTab={activeTab} onTabChange={setActiveTab} />
      <RankingsList
        rankings={rankings}
        machines={machines}
        groups={groups}
        activeTab={activeTab}
        displayedCount={displayedCount}
        newItemsLoaded={newItemsLoaded}
        hasMoreItems={hasMore}
        isLoadingMore={isLoadingMore}
        loadingRef={loadingRef}
      />
    </Card>
  );
} 