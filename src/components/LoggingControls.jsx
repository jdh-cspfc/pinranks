/**
 * Logging Controls Component
 * Provides UI controls to enable/disable different logging categories and levels
 */

import React, { useState, useEffect } from 'react';
import logger, { LOG_LEVELS, LOG_CATEGORIES } from '../utils/logger';

export default function LoggingControls() {
  const [config, setConfig] = useState(logger.getConfig());
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setConfig(logger.getConfig());
  }, []);

  const handleCategoryToggle = (category) => {
    const newConfig = {
      ...config,
      categories: {
        ...config.categories,
        [category]: !config.categories[category]
      }
    };
    logger.setCategoryEnabled(category, newConfig.categories[category]);
    setConfig(newConfig);
  };

  const handleLevelChange = (level) => {
    logger.setLevel(parseInt(level));
    setConfig({ ...config, level: parseInt(level) });
  };

  const handleEnabledToggle = () => {
    logger.setEnabled(!config.enabled);
    setConfig({ ...config, enabled: !config.enabled });
  };

  const handleReset = () => {
    logger.reset();
    setConfig(logger.getConfig());
  };

  const levelOptions = Object.entries(LOG_LEVELS).map(([name, value]) => (
    <option key={name} value={value}>
      {name} ({value})
    </option>
  ));

  const categoryOptions = Object.entries(LOG_CATEGORIES).map(([name, value]) => (
    <div key={name} className="flex items-center space-x-2">
      <input
        type="checkbox"
        id={`category-${value}`}
        checked={config.categories[value]}
        onChange={() => handleCategoryToggle(value)}
        className="rounded"
      />
      <label htmlFor={`category-${value}`} className="text-sm">
        {name} ({value})
      </label>
    </div>
  ));

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-blue-500 text-white px-3 py-2 rounded-lg shadow-lg text-sm z-50"
        title="Open Logging Controls"
      >
        🔧 Logging
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-4 w-80 z-50">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Logging Controls</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          ✕
        </button>
      </div>

      <div className="space-y-4">
        {/* Master Enable/Disable */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="enabled"
            checked={config.enabled}
            onChange={handleEnabledToggle}
            className="rounded"
          />
          <label htmlFor="enabled" className="font-medium">
            Enable Logging
          </label>
        </div>

        {/* Log Level */}
        <div>
          <label htmlFor="level" className="block text-sm font-medium mb-1">
            Log Level
          </label>
          <select
            id="level"
            value={config.level}
            onChange={(e) => handleLevelChange(e.target.value)}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
            disabled={!config.enabled}
          >
            {levelOptions}
          </select>
        </div>

        {/* Categories */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Log Categories
          </label>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {categoryOptions}
          </div>
        </div>

        {/* Display Options */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="showTimestamp"
              checked={config.showTimestamp}
              onChange={(e) => logger.updateConfig({ showTimestamp: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="showTimestamp" className="text-sm">
              Show Timestamp
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="showCategory"
              checked={config.showCategory}
              onChange={(e) => logger.updateConfig({ showCategory: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="showCategory" className="text-sm">
              Show Category
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="useEmojis"
              checked={config.useEmojis}
              onChange={(e) => logger.updateConfig({ useEmojis: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="useEmojis" className="text-sm">
              Use Emojis
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-2 pt-2 border-t border-gray-200 dark:border-gray-600">
          <button
            onClick={handleReset}
            className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
          >
            Reset
          </button>
          <button
            onClick={() => {
              console.clear();
              logger.info('ui', 'Console cleared');
            }}
            className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600"
          >
            Clear Console
          </button>
        </div>
      </div>
    </div>
  );
}