# Logging Migration Guide

## Overview
This guide shows how to replace `console.log` statements with the centralized logger system.

## Quick Migration Pattern

### Before (console.log):
```javascript
console.log('🔄 Starting operation');
console.log('✅ Operation completed');
console.log('❌ Operation failed:', error.message);
```

### After (centralized logger):
```javascript
import logger from '../utils/logger';

logger.debug('data', 'Starting operation');
logger.info('data', 'Operation completed');
logger.error('data', `Operation failed: ${error.message}`);
```

## Log Levels
- `logger.error(category, message)` - Errors that need attention
- `logger.warn(category, message)` - Warnings about potential issues
- `logger.info(category, message)` - General information
- `logger.debug(category, message)` - Detailed debugging info
- `logger.trace(category, message)` - Very detailed tracing

## Log Categories
- `'auth'` - Authentication related logs
- `'cache'` - Cache operations (hits, misses, etc.)
- `'firebase'` - Firebase database operations
- `'voting'` - Voting and queue operations
- `'data'` - Data loading and processing
- `'error'` - Error handling and recovery
- `'performance'` - Performance monitoring
- `'ui'` - UI interactions and updates

## Files to Update

### High Priority (Core functionality):
1. `src/services/votingService.js` - Replace voting queue logs
2. `src/services/dataService.js` - Replace Firebase operation logs
3. `src/hooks/useAppData.js` - Replace auth and data loading logs
4. `src/caching.js` - Replace cache operation logs
5. `src/services/errorService.js` - Replace retry mechanism logs

### Medium Priority:
6. `src/hooks/useMatchupActions.js` - Replace machine replacement logs
7. `src/hooks/useVoting.js` - Replace vote processing logs
8. `src/utils/matchupApi.js` - Replace API operation logs

### Low Priority (Optional):
9. `functions/index.js` - Replace Firebase Functions logs
10. Any other files with console.log statements

## Migration Steps

1. **Add import**: `import logger from '../utils/logger';`
2. **Replace console.log**: Use appropriate log level and category
3. **Test**: Verify logs appear in console with proper formatting
4. **Configure**: Use the logging controls UI to enable/disable categories

## Example Migrations

### Voting Service:
```javascript
// Before
console.log(`📝 Vote request queued for user ${userId}`);

// After
logger.info('voting', `Vote request queued for user ${userId}`);
```

### Cache Operations:
```javascript
// Before
console.log(`💾 Cache HIT (memory): ${key}`);

// After
logger.debug('cache', `Cache HIT (memory): ${key}`);
```

### Firebase Operations:
```javascript
// Before
console.log(`🔍 getUserPreferences: Fetching preferences for user ${userId}`);

// After
logger.debug('firebase', `Fetching preferences for user ${userId}`);
```

## Benefits

1. **Centralized Control**: Turn logging on/off from one place
2. **Categorized Logs**: Filter by category (auth, cache, firebase, etc.)
3. **Log Levels**: Control verbosity (error, warn, info, debug, trace)
4. **Persistent Settings**: Configuration saved in localStorage
5. **UI Controls**: Easy-to-use interface for adjusting settings
6. **Performance**: Disabled logs have zero overhead
7. **Consistency**: Uniform log formatting across the app

## Usage

1. **Development**: Use the floating "🔧 Logging" button in bottom-right corner
2. **Production**: Logging can be completely disabled
3. **Debugging**: Enable specific categories to focus on issues
4. **Performance**: Disable verbose logs when not needed