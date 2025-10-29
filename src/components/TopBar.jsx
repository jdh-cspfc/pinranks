import React from 'react';
import { useDarkMode } from '../DarkModeContext';

export default function TopBar({ user, onProfileClick, onMenuClick, onNavigate, onLogout, hasCheckedAuth }) {
  const { darkMode } = useDarkMode();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef(null);
  const buttonRef = React.useRef(null);
  const justClosedMenuRef = React.useRef(false);

  function handleMenuButtonClick() {
    setMenuOpen((open) => !open);
    if (onMenuClick) onMenuClick();
  }

  function handleMenuItemClick(view) {
    setMenuOpen(false);
    if (onNavigate) onNavigate(view);
  }

  function handleLogoutClick() {
    setMenuOpen(false);
    if (onLogout) onLogout();
  }

  React.useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(event) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setMenuOpen(false);
        justClosedMenuRef.current = true;
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  // Export for use in other components
  TopBar.justClosedMenuRef = justClosedMenuRef;

  // Determine what to show in the profile button
  const showSignInButton = hasCheckedAuth && !user;

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-gray-50 dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 h-14 flex items-center px-2 shadow-sm">
      {/* Hamburger - Hidden on desktop */}
      <div className="relative lg:hidden">
        <button
          ref={buttonRef}
          className="flex items-center justify-center w-10 h-10 text-gray-700 dark:text-gray-200"
          onClick={handleMenuButtonClick}
          aria-label="Open menu"
        >
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
        </button>
        {menuOpen && (
          <div
            ref={menuRef}
            className="fixed left-0 top-14 w-full max-w-full sm:w-80 md:w-96 bg-white dark:bg-gray-800 border-t border-b border-r border-gray-200 dark:border-gray-700 shadow-lg z-40 flex flex-col items-start gap-0 transition-all duration-200"
          >
            <button
              className="px-6 py-3 text-lg text-gray-700 dark:text-gray-200 hover:bg-blue-100 dark:hover:bg-gray-700 w-full font-medium flex items-center justify-center gap-2"
              onClick={() => handleMenuItemClick('matchups')}
            >
              <span className="flex items-center gap-2">
                <span>Matchups</span>
                {/* Crossed Swords Icon */}
                <img src="/swords.png" alt="Matchups" className="h-5 w-5 object-contain dark:invert" />
              </span>
            </button>
            <div className="flex justify-center w-full">
              <div className="w-11/12 border-b border-gray-200 dark:border-gray-700" />
            </div>
            {/* Rankings menu item */}
            <button
              className="px-6 py-3 text-lg text-gray-700 dark:text-gray-200 hover:bg-blue-100 dark:hover:bg-gray-700 w-full font-medium flex items-center justify-center gap-1"
              onClick={() => handleMenuItemClick('rankings')}
            >
              <span className="flex items-center gap-2">
                <span>Rankings</span>
                {/* Rankings Icon */}
                <img src="/bar-chart.png" alt="Rankings" className="h-5 w-5 object-contain dark:invert" />
              </span>
            </button>
            {user && (
              <div className="flex justify-center w-full">
                <div className="w-11/12 border-b border-gray-200 dark:border-gray-700" />
              </div>
            )}
            {user && (
              <button
                className="px-6 py-3 text-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900 w-full font-medium flex items-center justify-center gap-2"
                onClick={handleLogoutClick}
              >
                <span className="flex items-center gap-2">
                  <span>Logout</span>
                  {/* Logout Icon */}
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                </span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Desktop Navigation - Hidden on mobile */}
      <div className="hidden lg:flex items-center gap-6">
        <button
          className="flex items-center gap-2 px-3 py-2 text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-800 rounded-md transition-colors duration-200 font-medium"
          onClick={() => onNavigate && onNavigate('matchups')}
        >
          <img src="/swords.png" alt="Matchups" className="h-5 w-5 object-contain dark:invert" />
          <span>Matchups</span>
        </button>
        <button
          className="flex items-center gap-2 px-3 py-2 text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-800 rounded-md transition-colors duration-200 font-medium"
          onClick={() => onNavigate && onNavigate('rankings')}
        >
          <img src="/bar-chart.png" alt="Rankings" className="h-5 w-5 object-contain dark:invert" />
          <span>Rankings</span>
        </button>
      </div>

      {/* Centered logo and text */}
      <button
        type="button"
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 select-none focus:outline-none sm:-ml-1"
        onClick={() => onNavigate && onNavigate('matchups')}
        aria-label="Go to Matchups"
        tabIndex={0}
      >
        <img src="/favicon.svg" alt="pinranks logo" className="h-5 w-5 sm:h-6 sm:w-6" />
        <span className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">pinranks</span>
      </button>

      {/* Profile/Sign In */}
      <button
        className="ml-auto flex items-center justify-center w-10 h-10 text-gray-700 dark:text-gray-200"
        onClick={onProfileClick}
        aria-label="Profile"
      >
        {showSignInButton ? (
          <span className="text-xs font-medium mr-2">Sign In</span>
        ) : (
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 20v-1a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v1" /></svg>
        )}
      </button>
    </header>
  );
} 