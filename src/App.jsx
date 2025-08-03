import React, { useEffect, useState } from 'react'
import Login from './components/Login'
import Matchup from './components/Matchup'
import Profile from './components/Profile'
import Rankings from './components/Rankings'
import TopBar from './components/TopBar'
import { onAuthStateChanged, signOut, getAuth } from 'firebase/auth'
import { auth } from './firebase'
import { DarkModeProvider } from './DarkModeContext'

export default function App() {
  const [user, setUser] = useState(null)
  const [activeView, setActiveView] = useState('matchups')
  const [isLoading, setIsLoading] = useState(true)
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false)

  useEffect(() => {
    // Check current user immediately (from cache)
    const currentUser = auth.currentUser
    if (currentUser) {
      setUser(currentUser)
      setHasCheckedAuth(true)
      setIsLoading(false)
    }

    // Then listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setIsLoading(false)
      setHasCheckedAuth(true)
    })
    return () => unsubscribe()
  }, [])

  const handleLogout = async () => {
    await signOut(auth)
    setActiveView('matchups')
  }

  // Determine what content to show
  let mainContent
  let shouldShowLogin = false
  
  if (!hasCheckedAuth) {
    // Before auth check, show main content optimistically
    mainContent = <Matchup />
  } else if (!user) {
    // After auth check, user is definitely not logged in
    shouldShowLogin = true
    mainContent = <Login />
  } else {
    // User is authenticated, show appropriate content
    if (activeView === 'matchups') {
      mainContent = <Matchup />
    } else if (activeView === 'rankings') {
      mainContent = <Rankings />
    } else if (activeView === 'profile') {
      mainContent = <Profile />
    }
  }

  // Navigation handlers for TopBar
  function handleProfileClick() {
    if (!user && hasCheckedAuth) {
      setActiveView('profile')
    } else {
      setActiveView('profile')
    }
  }
  function handleMenuClick() {
    // No-op for now; menu handled in TopBar
  }

  return (
    <DarkModeProvider>
      {/* Ensure background color fills the viewport in both light and dark mode */}
      <style>{`
        html, body {
          background-color: #f3f4f6 !important;
        }
        html.dark, body.dark, .dark html, .dark body {
          background-color: #111827 !important;
        }
      `}</style>
      <TopBar 
        user={user} 
        onProfileClick={handleProfileClick} 
        onMenuClick={handleMenuClick} 
        onNavigate={setActiveView} 
        onLogout={handleLogout}
        hasCheckedAuth={hasCheckedAuth}
      />
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 pt-16 p-4">
        {mainContent}
      </div>
    </DarkModeProvider>
  )
}
