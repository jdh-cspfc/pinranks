import React, { useState } from 'react'
import Login from '../components/Login'
import Matchup from '../components/Matchup'
import Profile from '../components/Profile'
import Rankings from '../components/Rankings'

export const useAppNavigation = (user, hasCheckedAuth) => {
  const [activeView, setActiveView] = useState('matchups')

  const getMainContent = () => {
    if (!hasCheckedAuth) {
      // Before auth check, show main content optimistically
      return Matchup
    }
    
    if (!user) {
      // After auth check, user is definitely not logged in
      return Login
    }
    
    // User is authenticated, show appropriate content
    switch (activeView) {
      case 'rankings':
        return Rankings
      case 'profile':
        return Profile
      case 'matchups':
      default:
        return Matchup
    }
  }

  const MainContentComponent = getMainContent()

  return {
    activeView,
    setActiveView,
    mainContent: <MainContentComponent />
  }
}