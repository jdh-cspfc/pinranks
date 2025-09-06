import React from 'react';
import TopBar from '../TopBar';
import MachineImage from './MachineImage';
import HaventPlayedButton from './HaventPlayedButton';

// Component to handle individual machine card display
export default function MachineCard({ 
  machine, 
  index, 
  matchup, 
  imageStates, 
  clickedCard, 
  userPreferences, 
  handleVote, 
  handleHaventPlayed, 
  fetchMatchup,
  isMachineBlocked
}) {
  const isClicked = clickedCard === index;
  const groupId = machine.opdb_id.split('-')[0];
  const group = matchup.groups.find(g => g.opdb_id === groupId);
  const name = group?.name || machine.name;
  const year = machine.manufacture_date?.slice(0, 4) || 'Unknown';
  const manufacturer = machine.manufacturer?.name || 'Unknown';
  
  // Check if this machine group is already marked as "haven't played"
  const isAlreadyMarked = isMachineBlocked?.(groupId) || false;
  
  const imageUrl = index === 0 ? imageStates.left.url : imageStates.right.url;
  const imageState = index === 0 ? imageStates.left : imageStates.right;

  return (
    <div
      key={`${groupId}-${index}-${machine.opdb_id}`}
      className={`mobile-card sm:h-[70vh] border p-3 sm:p-4 rounded shadow bg-white dark:bg-gray-800 text-center border-gray-200 dark:border-gray-700 items-center overflow-auto cursor-pointer sm:hover:shadow-lg sm:hover:bg-blue-50 dark:sm:hover:bg-gray-700 transition-all duration-100 ease-out relative ${
        isClicked 
          ? 'scale-[0.98] sm:bg-blue-50 dark:sm:hover:bg-gray-600' 
          : 'scale-100'
      }`}
      onClick={() => {
        if (TopBar.justClosedMenuRef && TopBar.justClosedMenuRef.current) {
          TopBar.justClosedMenuRef.current = false;
          return;
        }
        handleVote(index);
      }}
    >
      {/* Haven't Played Button */}
      <HaventPlayedButton
        index={index}
        isAlreadyMarked={isAlreadyMarked}
        groupId={groupId}
        userPreferences={userPreferences}
        handleHaventPlayed={handleHaventPlayed}
        matchup={matchup}
        fetchMatchup={fetchMatchup}
      />
      
      {/* Machine Header - merged from MachineHeader component */}
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
      
      {/* Machine Image */}
      <MachineImage
        machine={machine}
        name={name}
        imageUrl={imageUrl}
        imageState={imageState}
      />
    </div>
  );
}