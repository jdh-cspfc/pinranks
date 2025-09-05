import React from 'react';
import TopBar from './TopBar';

/**
 * AppLayout component handles the overall application structure
 * Separates layout concerns from App component logic
 */
export default function AppLayout({ 
  user, 
  hasCheckedAuth, 
  onProfileClick, 
  onMenuClick, 
  onNavigate, 
  onLogout, 
  children 
}) {
  return (
    <>
      <TopBar 
        user={user} 
        onProfileClick={onProfileClick} 
        onMenuClick={onMenuClick} 
        onNavigate={onNavigate} 
        onLogout={onLogout}
        hasCheckedAuth={hasCheckedAuth}
      />
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 pt-16 p-4 overflow-auto" style={{ height: '100vh', height: '100dvh' }}>
        {children}
      </div>
    </>
  );
}