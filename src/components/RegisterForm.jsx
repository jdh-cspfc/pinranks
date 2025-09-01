import React from 'react';

/**
 * Registration form component
 */
export default function RegisterForm({ formData, updateFormData }) {
  return (
    <>
      <input
        type="text"
        className="border px-3 py-2 w-full dark:text-gray-100 dark:bg-gray-900 dark:placeholder-gray-400"
        placeholder="Username"
        value={formData.username}
        onChange={(e) => updateFormData('username', e.target.value)}
      />
      
      <input
        type="email"
        className="border px-3 py-2 w-full dark:text-gray-100 dark:bg-gray-900 dark:placeholder-gray-400"
        placeholder="Email"
        value={formData.email}
        onChange={(e) => updateFormData('email', e.target.value)}
      />
      
      <input
        type="password"
        className="border px-3 py-2 w-full dark:text-gray-100 dark:bg-gray-900 dark:placeholder-gray-400"
        placeholder="Password"
        value={formData.password}
        onChange={(e) => updateFormData('password', e.target.value)}
      />
    </>
  );
}