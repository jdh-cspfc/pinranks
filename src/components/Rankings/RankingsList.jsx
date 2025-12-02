import React from 'react';
import { useRankingFilter } from '../../hooks/useRankingFilter';

/**
 * Loading spinner component with configurable size
 */
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

/**
 * Component for rendering the list of rankings
 * Handles filtering, sorting, and display of ranking items
 */
export default function RankingsList({ 
  rankings, 
  machines, 
  groups, 
  activeTab, 
  displayedCount, 
  newItemsLoaded, 
  isLoadingMore, 
  loadingRef 
}) {
  // Use centralized ranking filter hook
  const { filteredRankings } = useRankingFilter(rankings, machines, groups, activeTab);
  
  const displayedRankings = filteredRankings.slice(0, displayedCount);
  
  // Calculate hasMoreItems based on the filtered list, not the total rankings
  // This prevents showing the loading spinner when all filtered items are already displayed
  const hasMoreFilteredItems = displayedCount < filteredRankings.length;

  return (
    <>
      <h2 className="text-lg md:text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
        Your Rankings
      </h2>
      
      <ol className="list-decimal pl-6">
        {displayedRankings.map((item, idx) => {
          if (!item || !item.info) return null;
          
          return (
            <li 
              key={item.groupId || item.machineId} 
              className="mb-2 text-xs md:text-sm text-gray-800 dark:text-gray-200"
            >
              <span className="font-semibold">{item.info.name}</span>
              <span className="text-gray-500 dark:text-gray-400 ml-2">{item.info.year}</span>
              <span className="mx-1 text-gray-400">·</span>
              <span className="text-gray-600 dark:text-gray-400">{item.info.manufacturer}</span>
            </li>
          );
        })}
        
        {hasMoreFilteredItems && (
          <div 
            ref={loadingRef}
            className={`transition-opacity duration-300 ${isLoadingMore ? 'opacity-100' : 'opacity-50'}`}
          >
            <LoadingSpinner size="md" className="mt-6 mb-4" />
          </div>
        )}
      </ol>
    </>
  );
}