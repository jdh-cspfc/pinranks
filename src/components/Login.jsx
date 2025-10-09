import React from 'react'
import Card from './Card'
import LoginForm from './LoginForm'
import RegisterForm from './RegisterForm'
import AuthErrorHandler from './AuthErrorHandler'
import { useAuthForm } from '../hooks/useAuthForm'

export default function Login() {
  const {
    formData,
    isLogin,
    user,
    formError,
    formSuccess,
    updateFormData,
    toggleMode,
    handleSubmit,
    handlePasswordReset,
    handleGoogleSignIn,
    handleFacebookSignIn,
    handleLogout
  } = useAuthForm()



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
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
      <div className="max-w-md w-full space-y-8 px-6">
        {/* Header Section */}
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">Log in to</p>
          <div className="flex items-center justify-center gap-2 mt-1">
            <img src="/favicon.svg" alt="pinranks logo" className="h-8 w-8" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">pinranks</h1>
          </div>
        </div>

        {/* Google Login Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center px-4 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Login with Google
        </button>

        {/* Facebook Login Button - Hidden until Facebook app is configured */}
        {/* 
        <button
          type="button"
          onClick={handleFacebookSignIn}
          className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          Login with Facebook
        </button>
        */}

        {/* Separator */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-600" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">or</span>
          </div>
        </div>

        {/* Form Section */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <AuthErrorHandler formError={formError} formSuccess={formSuccess} />

          {isLogin ? (
            <LoginForm 
              formData={formData} 
              updateFormData={updateFormData} 
              handlePasswordReset={handlePasswordReset}
            />
          ) : (
            <RegisterForm formData={formData} updateFormData={updateFormData} />
          )}

          <button className="w-full bg-gray-200 text-gray-900 py-3 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2" type="submit">
            {isLogin ? 'Log in' : 'Register'}
          </button>

          {/* Footer Links */}
          <div className="text-center space-y-4">
            {isLogin && (
              <p
                className="text-sm text-blue-500 cursor-pointer"
                onClick={handlePasswordReset}
              >
                Forgot password?
              </p>
            )}
            
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isLogin ? (
                <>
                  Don't have an account?{' '}
                  <span
                    className="text-blue-500 cursor-pointer hover:underline"
                    onClick={toggleMode}
                  >
                    Sign up
                  </span>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <span
                    className="text-blue-500 cursor-pointer hover:underline"
                    onClick={toggleMode}
                  >
                    Sign in
                  </span>
                </>
              )}
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
