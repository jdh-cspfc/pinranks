# Refactoring Summary: Breaking Down Complex Hooks

## What Was Refactored

The complex `useUserPreferences` hook (200+ lines) was broken down into 3 focused, single-responsibility hooks:

### Before: One Monolithic Hook
```javascript
// useUserPreferences.js - 206 lines
export const useUserPreferences = () => {
  // Handled authentication state
  // Handled blocked machines logic  
  // Handled confirmation messages
  // Handled machine replacement logic
  // Complex mobile-specific logic mixed throughout
  // Multiple useEffect hooks with different concerns
  // Complex error handling mixed with business logic
}
```

### After: Three Focused Hooks

#### 1. `useUserAuth` - Authentication State
```javascript
// useUserAuth.js - 25 lines
export const useUserAuth = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Single responsibility: track user authentication state
  return { user, isLoading, isAuthenticated: !!user };
};
```

#### 2. `useUserBlockedMachines` - Blocked Machines Logic
```javascript
// useUserBlockedMachines.js - 65 lines
export const useUserBlockedMachines = (user) => {
  // Single responsibility: manage blocked machines list
  // Load from Firestore, add new blocked machines, check if blocked
  return { blockedMachines, isLoaded, addBlockedMachine, isMachineBlocked };
};
```

#### 3. `useConfirmationMessage` - UI State Management
```javascript
// useConfirmationMessage.js - 35 lines
export const useConfirmationMessage = (timeoutMs = 3000) => {
  // Single responsibility: manage confirmation message display and timing
  return { message, showMessage, clearMessage, cleanup };
};
```

#### 4. Enhanced `useUserPreferences` - Coordinator Hook
```javascript
// useUserPreferences.js - 95 lines (down from 206)
export const useUserPreferences = () => {
  // Coordinates the other hooks and provides a factory function
  // for creating handleHaventPlayed with dependencies
  return { 
    user, 
    userPreferences, 
    userPreferencesLoaded, 
    confirmationMessage, 
    createHandleHaventPlayed,
    clearConfirmationMessage, 
    cleanup 
  };
};
```

## Key Design Decision: Factory Function Pattern

To avoid circular dependencies between hooks, we used a **factory function pattern**:

```javascript
// Instead of requiring replaceMachine upfront:
const { handleHaventPlayed } = useUserPreferences(replaceMachine);

// We provide a factory function:
const { createHandleHaventPlayed } = useUserPreferences();
const handleHaventPlayed = createHandleHaventPlayed(replaceMachine);
```

This allows:
- `useUserPreferences` to be called first (no dependencies)
- `useMatchupData` to be called second (with user info)
- The final function to be created with all dependencies

## Benefits of This Refactoring

### 1. **Single Responsibility Principle**
- Each hook now has one clear purpose
- Easier to understand what each hook does
- Easier to test individual pieces of functionality

### 2. **Improved Readability**
- `useUserPreferences` went from 206 lines to 95 lines
- Each hook can be understood in isolation
- Clear separation of concerns

### 3. **Better Maintainability**
- Changes to authentication logic don't affect blocked machines logic
- Confirmation message behavior can be modified independently
- Machine replacement logic is isolated and reusable

### 4. **Easier Testing**
- Each hook can be tested independently
- Mocking dependencies is simpler
- Test coverage can be more focused

### 5. **Reusability**
- `useUserAuth` can be used in other components that need auth state
- `useConfirmationMessage` can be used for any confirmation UI
- `useUserBlockedMachines` can be used in other preference-related features

### 6. **No Circular Dependencies**
- Clean dependency flow between hooks
- No "can't access lexical declaration before initialization" errors
- Predictable hook execution order

## Code Quality Improvements

### Before
- Complex state management mixed with business logic
- Multiple useEffect hooks with different concerns
- Hard to follow data flow
- Difficult to debug specific functionality
- Circular dependency issues

### After
- Clear data flow between hooks
- Each hook has a single, well-defined purpose
- Easier to trace where specific functionality lives
- Cleaner component code that focuses on UI concerns
- Factory function pattern eliminates circular dependencies

## Impact on Components

The main components (`MatchupManager`, `MachineCard`) now receive cleaner, more focused data and functions:

```javascript
// Before: Complex object with mixed concerns
const { user, userPreferences, userPreferencesLoaded, confirmationMessage, handleHaventPlayed } = useUserPreferences();

// After: Clear, focused functions and data
const { user, userPreferences, userPreferencesLoaded, confirmationMessage, createHandleHaventPlayed } = useUserPreferences();
const handleHaventPlayed = createHandleHaventPlayed(replaceMachine);
```

## Lessons Learned

1. **Hook Dependencies Matter**: The order and dependencies of hooks can create circular reference issues
2. **Factory Functions Help**: Using factory functions can break circular dependencies while maintaining clean separation
3. **Single Responsibility**: Breaking down complex hooks makes the code much more maintainable
4. **Dependency Injection**: The factory pattern allows for clean dependency injection without tight coupling

This refactoring makes the code much more readable for reviewers and easier to maintain for developers, while solving the circular dependency issue that was causing runtime errors. 