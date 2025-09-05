import React from 'react'
import AppLayout from './components/AppLayout'
import { DarkModeProvider } from './DarkModeContext'
import { useAppData } from './hooks/useAppData'
import { useAppNavigation } from './hooks/useAppNavigation.jsx'
import { signOut } from 'firebase/auth'
import { auth } from './firebase'
import ErrorBoundary from './components/ErrorBoundary'
import { useErrorHandler } from './hooks/useErrorHandler'
import LoggingControls from './components/LoggingControls'

export default function App() {
  const appData = useAppData()
  const { user, isLoading } = appData || {}
  const hasCheckedAuth = !isLoading
  const { activeView, setActiveView, getMainContent } = useAppNavigation()
  const { handleError } = useErrorHandler('App')
  
  const MainContentComponent = getMainContent(user, hasCheckedAuth, appData)
  
  const handleLogout = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      handleError(error, { action: 'logout' })
    }
  }

  // Don't render anything if appData is not available yet
  if (!appData) {
    return (
      <ErrorBoundary onError={(error, errorInfo) => handleError(error, { action: 'app_error', metadata: { errorInfo } })}>
        <DarkModeProvider>
          <div className="flex justify-center items-center h-screen">
            <div className="text-gray-500">Loading...</div>
          </div>
        </DarkModeProvider>
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary onError={(error, errorInfo) => handleError(error, { action: 'app_error', metadata: { errorInfo } })}>
      <DarkModeProvider>
        <AppLayout
          user={user}
          hasCheckedAuth={hasCheckedAuth}
          onProfileClick={() => setActiveView('profile')}
          onMenuClick={() => {}}
          onNavigate={setActiveView}
          onLogout={handleLogout}
        >
          <MainContentComponent />
        </AppLayout>
        <div className="hidden md:block">
          <LoggingControls />
        </div>
      </DarkModeProvider>
    </ErrorBoundary>
  )
}
