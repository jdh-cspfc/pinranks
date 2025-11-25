import React, { useState } from 'react';
import TopBar from '../TopBar';
import MachineImage from './MachineImage';
import HaventPlayedButton from './HaventPlayedButton';
import FanfareCard from './FanfareCard';

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
  isMachineBlocked,
  fanfareData,
  skipFanfare
}) {
  const [fanfareClicked, setFanfareClicked] = useState(false);
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
  
  // Determine if this card should show fanfare
  const isWinner = fanfareData?.winner?.groupId === groupId;
  const isLoser = fanfareData?.loser?.groupId === groupId;
  const showFanfare = fanfareData && (isWinner || isLoser);
  const rankingData = showFanfare 
    ? (isWinner ? fanfareData.winner : fanfareData.loser)
    : null;

  return (
    <div
      key={`${groupId}-${index}-${machine.opdb_id}`}
      className={`mobile-card sm:h-[70vh] border p-3 sm:p-4 rounded shadow bg-white dark:bg-gray-800 text-center border-gray-200 dark:border-gray-700 items-center overflow-auto relative ${
        isClicked || fanfareClicked
          ? 'sm:bg-blue-50 dark:sm:hover:bg-gray-600' 
          : ''
      } ${
        showFanfare 
          ? 'pointer-events-none' 
          : 'cursor-pointer sm:hover:shadow-lg sm:hover:bg-blue-50 dark:sm:hover:bg-gray-700'
      }`}
      style={{
        transformOrigin: 'center center',
        transform: isClicked || fanfareClicked ? 'scale(0.98)' : 'scale(1)',
        transition: 'transform 0.3s ease-out, background-color 0.1s ease-out'
      }}
      onClick={() => {
        // Prevent clicks during fanfare
        if (showFanfare) return;
        
        if (TopBar.justClosedMenuRef && TopBar.justClosedMenuRef.current) {
          TopBar.justClosedMenuRef.current = false;
          return;
        }
        handleVote(index);
      }}
    >
      {/* Fanfare Overlay */}
      {showFanfare && rankingData && (
        <FanfareCard 
          ranking={rankingData}
          isVisible={showFanfare}
          onSkip={() => {
            setFanfareClicked(true);
            setTimeout(() => {
              setFanfareClicked(false);
            }, 150);
            skipFanfare();
          }}
        />
      )}
      
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
      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-3 sm:mb-2 w-full">
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