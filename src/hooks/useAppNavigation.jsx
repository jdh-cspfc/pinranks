import React, { useState } from 'react'
import Login from '../components/Login'
import Matchup from '../components/Matchup'
import Profile from '../components/Profile'
import Rankings from '../components/Rankings'
// import Splash from '../components/Splash' // Splash page - ready to re-enable

export const useAppNavigation = () => {
  const [activeView, setActiveView] = useState('matchups')
  // Splash page logic - commented out but ready to re-enable
  // const [hasSeenSplash, setHasSeenSplash] = useState(() => {
  //   if (typeof window === 'undefined') return false
  //   try {
  //     return window.localStorage.getItem('pinranks_has_seen_splash') === 'true'
  //   } catch {
  //     return false
  //   }
  // })

  // const handleSplashContinue = () => {
  //   setHasSeenSplash(true)
  //   try {
  //     if (typeof window !== 'undefined') {
  //       window.localStorage.setItem('pinranks_has_seen_splash', 'true')
  //     }
  //   } catch {
  //     // non-fatal if localStorage is unavailable
  //   }
  // }

  const getMainContent = (user, hasCheckedAuth, appData) => {
    if (!hasCheckedAuth) {
      // Before auth check, show loading state
      return <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    }
    if (!user) {
      // After auth check, user is definitely not logged in
      // Splash page logic - commented out but ready to re-enable
      // if (!hasSeenSplash) {
      //   return <Splash onContinue={handleSplashContinue} />
      // }
      return <Login />
    }
  
    // User is authenticated, show appropriate content
    // Only render components if appData is available
    if (!appData) {
      return <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    }
    
    switch (activeView) {
      case 'rankings':
        return <Rankings appData={appData} />
      case 'profile':
        return <Profile appData={appData} />
      case 'matchups':
      default:
        return <Matchup appData={appData} />
    }
  }

  return {
    activeView,
    setActiveView,
    getMainContent
  }
}