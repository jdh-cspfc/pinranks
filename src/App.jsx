import React from 'react'
import AppLayout from './components/AppLayout'
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
        <AppLayout
          user={user}
          hasCheckedAuth={hasCheckedAuth}
          onProfileClick={() => setActiveView('profile')}
          onMenuClick={() => {}}
          onNavigate={setActiveView}
          onLogout={handleLogout}
        >
          {mainContent}
        </AppLayout>
      </DarkModeProvider>
    </ErrorBoundary>
  )
}
