import React from 'react';

/**
 * Login form component
 */
export default function LoginForm({ formData, updateFormData, handlePasswordReset }) {
  return (
    <>
      <input
        type="text"
        className="border px-3 py-2 w-full dark:text-gray-100 dark:bg-gray-900 dark:placeholder-gray-400"
        placeholder="Username or Email"
        value={formData.loginId}
        onChange={(e) => updateFormData('loginId', e.target.value)}
      />
      
      <input
        type="password"
        className="border px-3 py-2 w-full dark:text-gray-100 dark:bg-gray-900 dark:placeholder-gray-400"
        placeholder="Password"
        value={formData.password}
        onChange={(e) => updateFormData('password', e.target.value)}
      />
      
      <p
        className="text-sm text-blue-500 text-center cursor-pointer"
        onClick={handlePasswordReset}
      >
        Forgot password?
      </p>
    </>
  );
}