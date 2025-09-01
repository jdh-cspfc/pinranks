import React from 'react';
import TopBar from '../TopBar';
import MachineHeader from './MachineHeader';
import MachineImageContainer from './MachineImageContainer';
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
  replaceMachine, 
  fetchMatchup 
}) {
  const isClicked = clickedCard === index;
  const groupId = machine.opdb_id.split('-')[0];
  const group = matchup.groups.find(g => g.opdb_id === groupId);
  const name = group?.name || machine.name;
  const year = machine.manufacture_date?.slice(0, 4) || 'Unknown';
  const manufacturer = machine.manufacturer?.name || 'Unknown';
  
  // Check if this machine group is already marked as "haven't played"
  const isAlreadyMarked = userPreferences?.blockedMachines?.some(blockedId => 
    groupId.startsWith(blockedId)
  );
  
  const imageUrl = index === 0 ? imageStates.left.url : imageStates.right.url;
  const imageState = index === 0 ? imageStates.left : imageStates.right;

  return (
    <div
      key={`${groupId}-${index}-${machine.opdb_id}`}
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
        replaceMachine={replaceMachine}
        fetchMatchup={fetchMatchup}
      />
      
      {/* Machine Header */}
      <MachineHeader 
        name={name}
        year={year}
        manufacturer={manufacturer}
      />
      
      {/* Machine Image */}
      <MachineImageContainer
        machine={machine}
        name={name}
        imageUrl={imageUrl}
        imageState={imageState}
      />
    </div>
  );
}