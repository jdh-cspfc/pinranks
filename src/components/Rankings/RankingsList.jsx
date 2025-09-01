import React from 'react';
import { getFilterGroup } from '../../utils/filterUtils';

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
  hasMoreItems, 
  isLoadingMore, 
  loadingRef 
}) {
  // Helper function to get machine information
  const getMachineInfo = (machineId) => {
    if (!machines || !groups) return null;
    
    const machine = machines.find(m => m.opdb_id === machineId);
    if (!machine) return null;
    
    const groupId = machine.opdb_id.split('-')[0];
    const group = groups.find(g => g.opdb_id === groupId);
    const name = group?.name || machine.name;
    const year = machine.manufacture_date ? machine.manufacture_date.slice(0, 4) : 'Unknown';
    const manufacturer = machine.manufacturer?.name || 'Unknown';
    
    return { name, year, manufacturer, display: machine.display };
  };

  // Filter and sort rankings based on active tab
  const getFilteredRankings = () => {
    if (!rankings || !machines) return [];

    return rankings
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
  };

  const filteredRankings = getFilteredRankings();
  const displayedRankings = filteredRankings.slice(0, displayedCount);

  return (
    <>
      <h2 className="text-lg md:text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
        Your Rankings
      </h2>
      
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
    </>
  );
}