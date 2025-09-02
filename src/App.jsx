import React from 'react'
import TopBar from './components/TopBar'
import { DarkModeProvider } from './DarkModeContext'
import { useAppData } from './hooks/useAppData'
import { useAppNavigation } from './hooks/useAppNavigation.jsx'
import { signOut } from 'firebase/auth'
import { auth } from './firebase'
import ErrorBoundary from './components/ErrorBoundary'
import { useErrorHandler } from './hooks/useErrorHandler'

export default function App() {
  const { user, isLoading } = useAppData()
  const hasCheckedAuth = !isLoading
  const { activeView, setActiveView, mainContent } = useAppNavigation(user, hasCheckedAuth)
  const { handleError } = useErrorHandler('App')
  
  const handleLogout = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      handleError(error, { action: 'logout' })
    }
  }

  return (
    <ErrorBoundary onError={(error, errorInfo) => handleError(error, { action: 'app_error', metadata: { errorInfo } })}>
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
    </ErrorBoundary>
  )
}
