/**
 * Centralized logging system for PinRanks
 * Provides configurable logging with different levels and categories
 */

// Log levels (higher number = more verbose)
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  TRACE: 4
};

// Log categories for easy filtering
const LOG_CATEGORIES = {
  AUTH: 'auth',
  CACHE: 'cache',
  FIREBASE: 'firebase',
  VOTING: 'voting',
  DATA: 'data',
  ERROR: 'error',
  PERFORMANCE: 'performance',
  UI: 'ui'
};

// Default configuration
const DEFAULT_CONFIG = {
  enabled: true,
  level: LOG_LEVELS.DEBUG, // Show ERROR, WARN, INFO, DEBUG
  categories: {
    [LOG_CATEGORIES.AUTH]: true,
    [LOG_CATEGORIES.CACHE]: true,
    [LOG_CATEGORIES.FIREBASE]: true,
    [LOG_CATEGORIES.VOTING]: true,
    [LOG_CATEGORIES.DATA]: true,
    [LOG_CATEGORIES.ERROR]: true,
    [LOG_CATEGORIES.PERFORMANCE]: true,
    [LOG_CATEGORIES.UI]: false // UI logs disabled by default
  },
  showTimestamp: true,
  showCategory: true,
  showLevel: true,
  useEmojis: true
};

class Logger {
  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.loadConfig();
  }

  /**
   * Load configuration from localStorage or use defaults
   */
  loadConfig() {
    try {
      const saved = localStorage.getItem('pinranks-logger-config');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.config = { ...DEFAULT_CONFIG, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load logger config:', error);
    }
  }

  /**
   * Save current configuration to localStorage
   */
  saveConfig() {
    try {
      localStorage.setItem('pinranks-logger-config', JSON.stringify(this.config));
    } catch (error) {
      console.warn('Failed to save logger config:', error);
    }
  }

  /**
   * Update logger configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
  }

  /**
   * Enable/disable specific category
   */
  setCategoryEnabled(category, enabled) {
    if (this.config.categories.hasOwnProperty(category)) {
      this.config.categories[category] = enabled;
      this.saveConfig();
    }
  }

  /**
   * Set log level
   */
  setLevel(level) {
    this.config.level = level;
    this.saveConfig();
  }

  /**
   * Enable/disable all logging
   */
  setEnabled(enabled) {
    this.config.enabled = enabled;
    this.saveConfig();
  }

  /**
   * Check if a log should be output
   */
  shouldLog(level, category) {
    if (!this.config.enabled) return false;
    if (level > this.config.level) return false;
    if (!this.config.categories[category]) return false;
    return true;
  }

  /**
   * Format log message
   */
  formatMessage(level, category, message, ...args) {
    const parts = [];
    
    if (this.config.showTimestamp) {
      parts.push(`[${new Date().toLocaleTimeString()}]`);
    }
    
    if (this.config.showLevel) {
      const levelName = Object.keys(LOG_LEVELS)[level];
      parts.push(`[${levelName}]`);
    }
    
    if (this.config.showCategory) {
      parts.push(`[${category.toUpperCase()}]`);
    }
    
    if (this.config.useEmojis) {
      const emoji = this.getEmoji(level, category);
      parts.push(emoji);
    }
    
    parts.push(message);
    
    return [parts.join(' '), ...args];
  }

  /**
   * Get emoji for log level and category
   */
  getEmoji(level, category) {
    const emojiMap = {
      [LOG_LEVELS.ERROR]: '❌',
      [LOG_LEVELS.WARN]: '⚠️',
      [LOG_LEVELS.INFO]: 'ℹ️',
      [LOG_LEVELS.DEBUG]: '🔍',
      [LOG_LEVELS.TRACE]: '🔬'
    };
    
    const categoryEmojis = {
      [LOG_CATEGORIES.AUTH]: '🔐',
      [LOG_CATEGORIES.CACHE]: '💾',
      [LOG_CATEGORIES.FIREBASE]: '🔥',
      [LOG_CATEGORIES.VOTING]: '🗳️',
      [LOG_CATEGORIES.DATA]: '📊',
      [LOG_CATEGORIES.ERROR]: '💥',
      [LOG_CATEGORIES.PERFORMANCE]: '⚡',
      [LOG_CATEGORIES.UI]: '🎨'
    };
    
    return `${emojiMap[level] || '📝'}${categoryEmojis[category] || ''}`;
  }

  /**
   * Core logging method
   */
  log(level, category, message, ...args) {
    if (!this.shouldLog(level, category)) return;
    
    const [formattedMessage, ...formattedArgs] = this.formatMessage(level, category, message, ...args);
    
    switch (level) {
      case LOG_LEVELS.ERROR:
        console.error(formattedMessage, ...formattedArgs);
        break;
      case LOG_LEVELS.WARN:
        console.warn(formattedMessage, ...formattedArgs);
        break;
      case LOG_LEVELS.INFO:
        console.info(formattedMessage, ...formattedArgs);
        break;
      case LOG_LEVELS.DEBUG:
        console.log(formattedMessage, ...formattedArgs);
        break;
      case LOG_LEVELS.TRACE:
        console.trace(formattedMessage, ...formattedArgs);
        break;
      default:
        console.log(formattedMessage, ...formattedArgs);
    }
  }

  /**
   * Convenience methods for each log level
   */
  error(category, message, ...args) {
    this.log(LOG_LEVELS.ERROR, category, message, ...args);
  }

  warn(category, message, ...args) {
    this.log(LOG_LEVELS.WARN, category, message, ...args);
  }

  info(category, message, ...args) {
    this.log(LOG_LEVELS.INFO, category, message, ...args);
  }

  debug(category, message, ...args) {
    this.log(LOG_LEVELS.DEBUG, category, message, ...args);
  }

  trace(category, message, ...args) {
    this.log(LOG_LEVELS.TRACE, category, message, ...args);
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Reset to default configuration
   */
  reset() {
    this.config = { ...DEFAULT_CONFIG };
    this.saveConfig();
  }

  /**
   * Get available categories and levels
   */
  getCategories() {
    return { ...LOG_CATEGORIES };
  }

  getLevels() {
    return { ...LOG_LEVELS };
  }
}

// Create singleton instance
const logger = new Logger();

// Export both the instance and the class
export default logger;
export { Logger, LOG_LEVELS, LOG_CATEGORIES };