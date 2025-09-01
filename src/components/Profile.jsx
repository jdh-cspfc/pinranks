import React, { useState } from 'react';
import { useDarkMode } from '../DarkModeContext';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useAppData } from '../hooks/useAppData';
import Card from './Card';

export default function Profile() {
  const { darkMode, setDarkMode } = useDarkMode();
  const { 
    user, 
    machines, 
    groups, 
    userPreferences, 
    isLoading, 
    refreshUserData 
  } = useAppData();
  
  const [showAllMachines, setShowAllMachines] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      alert('Error logging out. Please try again.');
    }
  };

  const removeFromBlockedList = async (groupId) => {
    try {
      const newBlockedMachines = userPreferences.blockedMachines.filter(id => id !== groupId);
      
      // Update user preferences through the centralized service
      const { UserDataService } = await import('../services/dataService');
      await UserDataService.updateUserPreferences(user.uid, { 
        blockedMachines: newBlockedMachines 
      });
      
      // Refresh user data to get updated preferences
      await refreshUserData();
    } catch (err) {
      console.error('Failed to remove machine from blocked list:', err);
      alert('Failed to remove machine. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <Card maxWidth="max-w-4xl">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading profile...</p>
        </div>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card maxWidth="max-w-md">
        <div className="text-center py-8">
          <h2 className="text-xl font-bold mb-4">Please log in</h2>
          <p className="text-gray-600">You need to be logged in to view your profile.</p>
        </div>
      </Card>
    );
  }

  // Filter machines based on search term
  const filteredMachines = machines?.filter(machine => 
    machine.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Get blocked machine names for display
  const blockedMachineNames = userPreferences.blockedMachines.map(blockedId => {
    const machine = machines?.find(m => m.opdb_id.startsWith(blockedId));
    return machine ? machine.name : `Unknown (${blockedId})`;
  });

  return (
    <Card maxWidth="max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Profile</h1>
            <p className="text-gray-600">Manage your preferences and blocked machines</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
          >
            Logout
          </button>
        </div>

        {/* User Info */}
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Account Information</h2>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>User ID:</strong> {user.uid}</p>
        </div>

        {/* Dark Mode Toggle */}
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Appearance</h2>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={darkMode}
              onChange={(e) => setDarkMode(e.target.checked)}
              className="rounded"
            />
            <span>Dark Mode</span>
          </label>
        </div>

        {/* Blocked Machines */}
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Haven't Played List</h2>
          
          {blockedMachineNames.length === 0 ? (
            <p className="text-gray-600">No machines in your "Haven't Played" list.</p>
          ) : (
            <div className="space-y-2">
              {blockedMachineNames.map((machineName, index) => {
                const blockedId = userPreferences.blockedMachines[index];
                return (
                  <div key={blockedId} className="flex justify-between items-center bg-white dark:bg-gray-700 p-3 rounded border">
                    <span>{machineName}</span>
                    <button
                      onClick={() => removeFromBlockedList(blockedId)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Machine Search (for debugging) */}
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Machine Search</h2>
          <input
            type="text"
            placeholder="Search machines..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 border rounded mb-4"
          />
          
          <div className="max-h-60 overflow-y-auto">
            {filteredMachines.slice(0, showAllMachines ? filteredMachines.length : 10).map(machine => (
              <div key={machine.opdb_id} className="p-2 border-b last:border-b-0">
                <div className="font-medium">{machine.name}</div>
                <div className="text-sm text-gray-600">ID: {machine.opdb_id}</div>
              </div>
            ))}
            
            {filteredMachines.length > 10 && !showAllMachines && (
              <button
                onClick={() => setShowAllMachines(true)}
                className="mt-2 text-blue-500 hover:text-blue-700"
              >
                Show all {filteredMachines.length} machines
              </button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}