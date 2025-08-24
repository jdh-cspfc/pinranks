import React from 'react'
import { useState, useEffect } from 'react'
import { auth, db } from '../firebase'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail
} from 'firebase/auth'
import {
  doc,
  setDoc,
  getDoc
} from 'firebase/firestore'
import Card from './Card'

export default function Login() {
  const [loginId, setLoginId] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [user, setUser] = useState(null)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
    })
    return () => unsubscribe()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    setFormSuccess('')

    try {
      if (isLogin) {
        if (!loginId) {
          setFormError('Please enter your username or email.')
          return
        }

        let loginEmail = loginId

        if (!loginId.includes('@')) {
          let usernameDoc
          try {
            usernameDoc = await getDoc(doc(db, 'usernames', loginId))
          } catch (err) {
            if (err.code === 'permission-denied') {
              setFormError('Permission error checking username. Try again later.')
            } else {
              setFormError('Unexpected error while checking username.')
            }
            return
          }

          if (!usernameDoc.exists()) {
            setFormError('Username not found.')
            return
          }

          loginEmail = usernameDoc.data().email
        }

        try {
          await signInWithEmailAndPassword(auth, loginEmail, password)
        } catch (loginErr) {
          const code = loginErr.code
          if (code === 'auth/user-not-found') {
            setFormError('Email not found.')
          } else if (code === 'auth/wrong-password') {
            setFormError('Incorrect password.')
          } else if (code === 'auth/invalid-email') {
            setFormError('Invalid email format.')
          } else if (code === 'auth/too-many-requests') {
            setFormError('Too many attempts. Please try again later.')
          } else {
            setFormError('Login failed. Please check your info and try again.')
            console.error('Unhandled auth error:', loginErr)
          }
          return
        }

      } else {
        const isValidUsername = /^[a-zA-Z0-9_]{1,16}$/.test(username)

        if (!username) {
          setFormError('Username is required.')
          return
        }
        if (!isValidUsername) {
          setFormError('Username must be 1–16 characters (letters, numbers, underscores only).')
          return
        }

        let usernameDoc
        try {
          usernameDoc = await getDoc(doc(db, 'usernames', username))
        } catch (err) {
          if (err.code === 'permission-denied') {
            setFormError('Permission error checking username. Try again later.')
          } else {
            setFormError('Unexpected error while checking username availability.')
          }
          return
        }

        if (usernameDoc.exists()) {
          setFormError('Username already taken.')
          return
        }

        if (!email || !password) {
          setFormError('Email and password are required.')
          return
        }

        let userCredential
        try {
          userCredential = await createUserWithEmailAndPassword(auth, email, password)
        } catch (err) {
          const code = err.code
          if (code === 'auth/email-already-in-use') {
            setFormError('That email is already registered.')
          } else if (code === 'auth/invalid-email') {
            setFormError('Invalid email format.')
          } else if (code === 'auth/weak-password') {
            setFormError('Password should be at least 6 characters.')
          } else {
            setFormError('Registration failed. Please check your info and try again.')
            console.error('Unhandled auth error:', err)
          }
          return
        }

        const user = userCredential.user

        try {
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: user.email,
            username: username,
            createdAt: new Date().toISOString()
          })

          await setDoc(doc(db, 'usernames', username), {
            uid: user.uid,
            email: user.email
          })

          setFormSuccess('Account created successfully! You can now log in.')
          setIsLogin(true)
          setLoginId('')
          setUsername('')
          setEmail('')
          setPassword('')
        } catch (err) {
          setFormError('Error saving user data. Please try again later.')
          console.error('Firestore write error:', err)
        }
      }
    } catch (err) {
      setFormError('Something unexpected went wrong. Please try again.')
      console.error('Unexpected error:', err)
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
    } catch (err) {
      setFormError('Error logging out. Please try again.')
    }
  }

  const handlePasswordReset = async () => {
    setFormError('')
    setFormSuccess('')

    if (!loginId.includes('@')) {
      setFormError('Please enter your email address to reset your password.')
      return
    }

    try {
      await sendPasswordResetEmail(auth, loginId)
      setFormSuccess('Password reset email sent. Check your inbox.')
    } catch (err) {
      const code = err.code
      if (code === 'auth/user-not-found') {
        setFormError('No account found with that email.')
      } else if (code === 'auth/invalid-email') {
        setFormError('Invalid email format.')
      } else {
        setFormError('Could not send reset email. Try again later.')
        console.error('Password reset error:', err)
      }
    }
  }

  if (user) {
    return (
      <Card maxWidth="max-w-xs w-full md:w-80" className="dark:text-gray-100 space-y-4">
        <h2 className="text-xl font-bold">Welcome</h2>
        <p className="text-gray-700">Logged in as: <strong>{user.email}</strong></p>
        <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded w-full">
          Logout
        </button>
      </Card>
    )
  }

  return (
    <Card maxWidth="max-w-xs w-full md:w-80" className="dark:text-gray-100 space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-xl font-bold">{isLogin ? 'Login' : 'Register'}</h2>

      {formError && (
        <div className="bg-red-100 text-red-700 text-sm p-2 rounded">
          {formError}
        </div>
      )}

      {formSuccess && (
        <div className="bg-green-100 text-green-700 text-sm p-2 rounded">
          {formSuccess}
        </div>
      )}

      {isLogin ? (
        <input
          type="text"
          className="border px-3 py-2 w-full dark:text-gray-100 dark:bg-gray-900 dark:placeholder-gray-400"
          placeholder="Username or Email"
          value={loginId}
          onChange={(e) => setLoginId(e.target.value)}
        />
      ) : (
        <>
          <input
            type="text"
            className="border px-3 py-2 w-full dark:text-gray-100 dark:bg-gray-900 dark:placeholder-gray-400"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="email"
            className="border px-3 py-2 w-full dark:text-gray-100 dark:bg-gray-900 dark:placeholder-gray-400"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </>
      )}

      <input
        type="password"
        className="border px-3 py-2 w-full dark:text-gray-100 dark:bg-gray-900 dark:placeholder-gray-400"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button className="bg-blue-500 text-white px-4 py-2 rounded w-full" type="submit">
        {isLogin ? 'Login' : 'Register'}
      </button>

      <p
        className="text-sm text-blue-500 cursor-pointer text-center"
        onClick={() => {
          setIsLogin(!isLogin)
          setFormError('')
          setFormSuccess('')
          setLoginId('')
          setUsername('')
          setEmail('')
          setPassword('')
        }}
      >
        {isLogin ? 'Create an account' : 'Have an account?'}
      </p>
       {isLogin && (
        <p
          className="text-sm text-blue-500 text-center cursor-pointer"
          onClick={handlePasswordReset}
        >
          Forgot password?
        </p>
      )}
      </form>
    </Card>
  )
}
