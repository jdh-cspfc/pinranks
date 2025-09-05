import React from 'react';
import MachineCard from './MachineCard';

export default function MatchupDisplay({ 
  matchup, 
  validMachines, 
  isVoting, 
  imageStates, 
  clickedCard, 
  userPreferences, 
  handleVote, 
  handleHaventPlayed, 
  replaceMachine, 
  fetchMatchup,
  isMachineBlocked
}) {
  if (!matchup || !matchup.machines || matchup.machines.length < 2) {
    return null; // Removed loading box for testing
  }
  
  if (validMachines.length < 2) {
    return (
      <div className="text-center mt-10 text-gray-500">
        No matchups available for this filter.
      </div>
    );
  }

  return (
    <div 
      className={`mobile-card-container sm:grid sm:grid-cols-2 gap-3 sm:gap-6 ${isVoting ? 'opacity-75 pointer-events-none' : ''}`} 
    >
      {validMachines.map((machine, i) => (
        <MachineCard
          key={`${machine.opdb_id.split('-')[0]}-${i}-${machine.opdb_id}`}
          machine={machine}
          index={i}
          matchup={matchup}
          imageStates={imageStates}
          clickedCard={clickedCard}
          userPreferences={userPreferences}
          handleVote={handleVote}
          handleHaventPlayed={handleHaventPlayed}
          replaceMachine={replaceMachine}
          fetchMatchup={fetchMatchup}
          isMachineBlocked={isMachineBlocked}
        />
      ))}
    </div>
  );
} 