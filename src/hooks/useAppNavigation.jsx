import React, { useState } from 'react'
import Login from '../components/Login'
import Matchup from '../components/Matchup'
import Profile from '../components/Profile'
import Rankings from '../components/Rankings'

export const useAppNavigation = () => {
  const [activeView, setActiveView] = useState('matchups')

  const getMainContent = (user, hasCheckedAuth, appData) => {
    if (!hasCheckedAuth) {
      // Before auth check, show loading state
      return () => <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    }
    
    if (!user) {
      // After auth check, user is definitely not logged in
      return () => <Login />
    }
    
    // User is authenticated, show appropriate content
    // Only render components if appData is available
    if (!appData) {
      return () => <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    }
    
    switch (activeView) {
      case 'rankings':
        return () => <Rankings appData={appData} />
      case 'profile':
        return () => <Profile appData={appData} />
      case 'matchups':
      default:
        return () => <Matchup appData={appData} />
    }
  }

  return {
    activeView,
    setActiveView,
    getMainContent
  }
}