import React from 'react'
import TopBar from './components/TopBar'
import { DarkModeProvider } from './DarkModeContext'
import { useAuthState } from './hooks/useAuthState'
import { useAppNavigation } from './hooks/useAppNavigation.jsx'

export default function App() {
  const { user, isLoading, hasCheckedAuth, handleLogout } = useAuthState()
  const { activeView, setActiveView, mainContent } = useAppNavigation(user, hasCheckedAuth)

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
        onProfileClick={() => setActiveView('profile')} 
        onMenuClick={() => {}} 
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
