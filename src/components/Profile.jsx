import React from 'react';
import { useDarkMode } from '../DarkModeContext';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import TopBar from './TopBar';

export default function Profile() {
  const { darkMode, setDarkMode } = useDarkMode();

  const handleLogout = async () => {
    if (TopBar.justClosedMenuRef && TopBar.justClosedMenuRef.current) {
      TopBar.justClosedMenuRef.current = false;
      return;
    }
    try {
      await signOut(auth);
    } catch (err) {
      alert('Error logging out. Please try again.');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-white dark:bg-gray-800 p-6 rounded shadow text-center">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Profile</h2>
      <div className="flex items-center justify-center gap-4 mt-6">
        {/* Sun Icon */}
        <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={darkMode}
            onChange={e => setDarkMode(e.target.checked)}
          />
          <div className="w-14 h-8 bg-gray-200 dark:bg-gray-700 rounded-full peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 transition-colors peer-checked:bg-blue-600 flex items-center">
            <div
              className={`w-7 h-7 bg-white dark:bg-gray-900 rounded-full shadow transform transition-transform duration-200 ${darkMode ? 'translate-x-6' : 'translate-x-1'}`}
            ></div>
          </div>
        </label>
        {/* Moon Icon */}
        <svg className="w-6 h-6 text-gray-500 dark:text-yellow-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" /></svg>
      </div>
      <div className="my-8 border-t border-gray-200 dark:border-gray-700 w-full max-w-xs mx-auto" />
      <button
        onClick={handleLogout}
        className="bg-red-500 text-white px-4 py-2 rounded w-full max-w-xs mx-auto"
      >
        Logout
      </button>
    </div>
  );
} 