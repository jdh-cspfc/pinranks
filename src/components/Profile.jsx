import React, { useState, useEffect } from 'react';
import { useDarkMode } from '../DarkModeContext';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import TopBar from './TopBar';

export default function Profile() {
  const { darkMode, setDarkMode } = useDarkMode();
  const [user, setUser] = useState(null);
  const [userPreferences, setUserPreferences] = useState({ blockedMachines: [] });
  const [machinesData, setMachinesData] = useState([]);
  const [groupsData, setGroupsData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAllMachines, setShowAllMachines] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          // Load user preferences
          const userPrefsRef = doc(db, 'userPreferences', firebaseUser.uid);
          const userPrefsSnap = await getDoc(userPrefsRef);
          if (userPrefsSnap.exists()) {
            setUserPreferences(userPrefsSnap.data());
          }

          // Load machines and groups data for display
          const [machinesResponse, groupsResponse] = await Promise.all([
            fetch('/machines.json'),
            fetch('/groups.json')
          ]);
          const machines = await machinesResponse.json();
          const groups = await groupsResponse.json();
          setMachinesData(machines);
          setGroupsData(groups);
        } catch (err) {
          console.error('Failed to load user data:', err);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

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

  const removeFromBlockedList = async (groupId) => {
    try {
      const newBlockedMachines = userPreferences.blockedMachines.filter(id => id !== groupId);
      setUserPreferences(prev => ({ ...prev, blockedMachines: newBlockedMachines }));
      
      const userPrefsRef = doc(db, 'userPreferences', user.uid);
      await setDoc(userPrefsRef, {
        blockedMachines: newBlockedMachines
      }, { merge: true });
    } catch (err) {
      console.error('Failed to remove machine from blocked list:', err);
      // Revert local state on error
      setUserPreferences(prev => ({ ...prev, blockedMachines: userPreferences.blockedMachines }));
    }
  };

  const getMachineDisplayName = (groupId) => {
    const group = groupsData.find(g => g.opdb_id === groupId);
    return group?.name || `Machine ${groupId}`;
  };

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto mt-10 bg-white dark:bg-gray-800 p-6 rounded shadow text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto mt-10 bg-white dark:bg-gray-800 p-6 rounded shadow text-center">
        <p className="text-gray-600 dark:text-gray-400">Please log in to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-10 bg-white dark:bg-gray-800 p-6 rounded shadow">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Profile</h2>
      
      {/* Dark Mode Toggle */}
      <div className="flex items-center justify-center gap-4 mb-6">
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

      <div className="border-t border-gray-200 dark:border-gray-700 w-full mb-6" />

      {/* Haven't Played Section */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
          Machines You Haven't Played
        </h3>
        
        {userPreferences.blockedMachines?.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            You haven't marked any machines as "haven't played" yet. Use the "Haven't Played" button on machine cards to add them to this list.
          </p>
        ) : (
          <div>
            {/* Search/Filter Field */}
            <div className="mb-3">
                              <input
                  type="text"
                  placeholder="Search machines..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    // Reset to collapsed view when searching
                    setShowAllMachines(false);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
            </div>

            {/* Filtered machines */}
            {(() => {
              const filteredMachines = userPreferences.blockedMachines.filter(groupId => {
                const group = groupsData.find(g => g.opdb_id === groupId);
                return group?.name?.toLowerCase().includes(searchTerm.toLowerCase());
              });

              if (filteredMachines.length === 0 && searchTerm) {
                return (
                  <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
                    No machines found matching "{searchTerm}"
                  </p>
                );
              }

              // Show first 3 machines as preview when not expanded
              const machinesToShow = showAllMachines ? filteredMachines : filteredMachines.slice(0, 3);
              
              return (
                <>
                  <div className="space-y-2 mb-3">
                    {machinesToShow.map((groupId) => {
                      const group = groupsData.find(g => g.opdb_id === groupId);
                      const displayName = group?.name || `Machine ${groupId}`;
                      
                      // Find a machine that starts with this group ID to get manufacturer and year
                      const machineData = machinesData.find(m => m.opdb_id.startsWith(groupId));
                      const manufacturer = machineData?.manufacturer?.name;
                      const year = machineData?.manufacture_date ? new Date(machineData.manufacture_date).getFullYear() : null;
                      
                      return (
                        <div key={groupId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                          <div className="flex-1">
                            <span className="text-gray-700 dark:text-gray-300">
                              {displayName}
                            </span>
                            {(manufacturer || year) && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {manufacturer && year ? `${manufacturer} • ${year}` : manufacturer || year}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => removeFromBlockedList(groupId)}
                            className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors ml-3"
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Show "View All" button if more than 3 and not already expanded */}
                  {!showAllMachines && filteredMachines.length > 3 && (
                    <button 
                      onClick={() => setShowAllMachines(true)}
                      className="text-blue-600 dark:text-blue-400 text-sm hover:underline"
                    >
                      View All {filteredMachines.length} Machines
                    </button>
                  )}
                  
                  {/* Show "Show Less" button when expanded */}
                  {showAllMachines && filteredMachines.length > 3 && (
                    <button 
                      onClick={() => setShowAllMachines(false)}
                      className="text-blue-600 dark:text-blue-400 text-sm hover:underline"
                    >
                      Show Less
                    </button>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 w-full mb-6" />
      
      <button
        onClick={handleLogout}
        className="bg-red-500 text-white px-4 py-2 rounded w-full max-w-xs mx-auto block"
      >
        Logout
      </button>
    </div>
  );
} 