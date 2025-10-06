import React, { useState } from 'react';
import { useDarkMode } from '../DarkModeContext';
import { signOut, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { useBlockedMachines } from '../hooks/useBlockedMachines';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { useConfirmationMessage } from '../hooks/useConfirmationMessage';
import Card from './Card';
import { Message } from './ErrorDisplay';

export default function Profile({ appData }) {
  const { darkMode, setDarkMode } = useDarkMode();
  const { handleError, handleFirebaseError, userError, userSuccess, clearMessages } = useErrorHandler('Profile');
  const { message: confirmationMessage, showMessage } = useConfirmationMessage();
  const { 
    user, 
    machines, 
    groups, 
    isLoading, 
    isStaticDataLoading,
    hasStaticData
  } = appData;
  const { 
    blockedMachines, 
    removeBlockedMachine, 
    isLoading: isUserDataLoading 
  } = useBlockedMachines(appData);
  
  const [showAllMachines, setShowAllMachines] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      handleFirebaseError(err, { action: 'logout' });
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) {
      handleError('No email address found for this account.', { action: 'password_reset_validation' });
      return;
    }

    try {
      await sendPasswordResetEmail(auth, user.email);
      showMessage('Password reset email sent! Check your inbox.');
    } catch (err) {
      handleFirebaseError(err, { action: 'password_reset' });
    }
  };

  const removeFromBlockedList = async (groupId) => {
    try {
      // Find the machine name for the success message
      const group = groups?.find(g => g.opdb_id === groupId);
      const machineName = group?.name || `Machine ${groupId}`;
      
      // Use the optimistic removeBlockedMachine function from useAppData
      await removeBlockedMachine(groupId);
      
      // Show success message
      showMessage(`${machineName} has been removed from your "Haven't Played" list`);
    } catch (err) {
      handleError(err, { 
        action: 'removeFromBlockedList', 
        metadata: { groupId },
        userMessage: 'Failed to remove machine. Please try again.'
      });
    }
  };

  if (isLoading) {
    return null; // Removed loading box for testing
  }

  if (!user) {
    return null; // Removed loading box for testing
  }

  return (
    <Card>
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
        {user?.displayName || user?.email?.split('@')[0] || 'User'}'s Profile
      </h2>
      
      {/* Error/Success Messages */}
      <Message 
        error={userError}
        success={userSuccess}
        onDismiss={clearMessages}
        className="mb-4"
      />
      
      {/* Toast Notification */}
      {confirmationMessage && (
        <div className="fixed bottom-2 left-1/2 transform -translate-x-1/2 sm:left-auto sm:transform-none sm:right-4 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-lg shadow-lg max-w-xs mb-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0"></div>
            <span className="text-xs">{confirmationMessage}</span>
          </div>
        </div>
      )}
      
      {/* Dark Mode Toggle */}
      <div className="flex items-center justify-center gap-4 mb-6">
        {/* Sun Icon */}
        <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="5" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
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
        <svg className="w-6 h-6 text-gray-500 dark:text-yellow-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
        </svg>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 w-full mb-6" />

      {/* Haven't Played Section */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
          Machines You Haven't Played
        </h3>
        
        {/* Show loading state while static data or user data is loading */}
        {isStaticDataLoading || isUserDataLoading ? (
          <div className="space-y-2 transition-opacity duration-300">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 animate-pulse">
                <div className="flex-1">
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                </div>
                <div className="w-16 h-6 bg-gray-300 dark:bg-gray-600 rounded ml-3"></div>
              </div>
            ))}
          </div>
        ) : blockedMachines?.length === 0 ? (
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
              // Don't render machines if we don't have static data yet
              if (!hasStaticData) {
                return (
                  <div className="space-y-2 transition-opacity duration-300">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 animate-pulse">
                        <div className="flex-1">
                          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                        </div>
                        <div className="w-16 h-6 bg-gray-300 dark:bg-gray-600 rounded ml-3"></div>
                      </div>
                    ))}
                  </div>
                );
              }

              const filteredMachines = blockedMachines.filter(groupId => {
                const group = groups?.find(g => g.opdb_id === groupId);
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
                  <div className="space-y-2 mb-3 transition-opacity duration-300">
                    {machinesToShow.map((groupId) => {
                      const group = groups?.find(g => g.opdb_id === groupId);
                      const displayName = group?.name || `Machine ${groupId}`;
                      
                      // Find a machine that starts with this group ID to get manufacturer and year
                      const machineData = machines?.find(m => m.opdb_id.startsWith(groupId));
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
      
      <div className="space-y-3">
        <button
          onClick={handlePasswordReset}
          className="bg-blue-500 text-white px-4 py-2 rounded w-full max-w-xs mx-auto block hover:bg-blue-600 transition-colors"
        >
          Reset Password
        </button>
        
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded w-full max-w-xs mx-auto block hover:bg-red-600 transition-colors"
        >
          Logout
        </button>
      </div>
    </Card>
  );
}