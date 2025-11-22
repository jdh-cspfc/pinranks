import React from 'react'

export default function Splash({ onContinue }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 px-4">
      <div className="max-w-md w-full space-y-8 px-4">
        {/* Logo / branding (mirrors Login) */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mt-1">
            <img src="/favicon.svg" alt="" role="presentation" className="h-8 w-8" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
              pinranks
            </h1>
          </div>
        </div>

        <div className="space-y-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold">
            Rank your favorite pinball machines by comparing them head-to-head.
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            We&apos;ll show you random pairs of machines and you pick which one you&apos;d rather play.
            Based on your choices our Elo algorithm will generate your personal rankings.
          </p>
          <div className="pt-2 flex justify-center">
            <button
              type="button"
              onClick={onContinue}
              className="w-full max-w-xs bg-gray-200 text-gray-900 py-3 rounded-lg text-sm font-semibold hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Continue to login
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


