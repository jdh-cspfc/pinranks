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
    <Card maxWidth="max-w-xs w-full md:w-80" className="dark:text-gray-100 space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-xl font-bold">{isLogin ? 'Login' : 'Register'}</h2>

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

        <button className="bg-blue-500 text-white px-4 py-2 rounded w-full" type="submit">
          {isLogin ? 'Login' : 'Register'}
        </button>

        <p
          className="text-sm text-blue-500 cursor-pointer text-center"
          onClick={toggleMode}
        >
          {isLogin ? 'Create an account' : 'Have an account?'}
        </p>
      </form>
    </Card>
  )
}
