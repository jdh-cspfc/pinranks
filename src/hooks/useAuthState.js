import { useState, useEffect } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '../firebase'

export const useAuthState = () => {
  const [user, setUser] = useState(null)
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
  }

  return {
    user,
    isLoading,
    hasCheckedAuth,
    handleLogout
  }
}