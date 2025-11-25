import React, { useState } from 'react';

/**
 * FanfareCard component that displays ranking information with a subtle animation
 * Shows the new ranking position and how many spots the machine moved
 */
export default function FanfareCard({ 
  ranking, 
  isVisible,
  onSkip
}) {
  const [isClicked, setIsClicked] = useState(false);
  
  if (!isVisible || !ranking) return null;
  
  const { newPosition, change } = ranking;
  
  // Determine the change display
  let changeDisplay = null;
  let changeColor = '';
  
  if (change === null) {
    // Machine wasn't ranked before, now it is
    changeDisplay = 'NEW';
    changeColor = 'text-green-600 dark:text-green-400';
  } else if (change > 0) {
    // Moved up in rankings
    changeDisplay = `+${change}`;
    changeColor = 'text-green-600 dark:text-green-400';
  } else if (change < 0) {
    // Moved down in rankings
    changeDisplay = `${change}`; // Already includes the minus sign
    changeColor = 'text-red-600 dark:text-red-400';
  } else {
    // No change
    changeDisplay = '—';
    changeColor = 'text-gray-500 dark:text-gray-400';
  }
  
  const handleClick = (e) => {
    e.stopPropagation(); // Prevent event from bubbling to parent
    if (onSkip) {
      // Visual feedback
      setIsClicked(true);
      setTimeout(() => {
        setIsClicked(false);
      }, 150); // Match the delay in skipFanfare
      onSkip();
    }
  };

  return (
    <div 
      className={`fanfare-card ${isVisible ? 'fanfare-visible' : ''} ${isClicked ? 'fanfare-clicked' : ''}`}
      onClick={handleClick}
    >
      <div className="fanfare-card-inner">
        {/* Front of card - shows ranking info */}
        <div className="fanfare-card-front">
          <div className="fanfare-content">
            <div className="fanfare-ranking">
              <span className="fanfare-label">Rank</span>
              <span className="fanfare-position">{newPosition || '—'}</span>
            </div>
            <div className={`fanfare-change ${changeColor}`}>
              <span className="fanfare-change-label">Change</span>
              <span className="fanfare-change-value">{changeDisplay}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

