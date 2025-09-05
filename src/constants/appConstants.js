// Application-wide constants

// Authentication error messages
export const AUTH_ERRORS = {
  USER_NOT_FOUND: 'Email not found.',
  WRONG_PASSWORD: 'Incorrect password.',
  INVALID_EMAIL: 'Invalid email format.',
  TOO_MANY_REQUESTS: 'Too many attempts. Please try again later.',
  EMAIL_ALREADY_IN_USE: 'That email is already registered.',
  WEAK_PASSWORD: 'Password should be at least 6 characters.',
  USERNAME_NOT_FOUND: 'Username not found.',
  USERNAME_ALREADY_TAKEN: 'Username already taken.',
  PERMISSION_DENIED: 'Permission error checking username. Try again later.',
  UNEXPECTED_ERROR: 'Unexpected error while checking username availability.',
  LOGIN_FAILED: 'Login failed. Please check your info and try again.',
  REGISTRATION_FAILED: 'Registration failed. Please check your info and try again.',
  SAVE_USER_DATA_ERROR: 'Error saving user data. Please try again later.',
  LOGOUT_ERROR: 'Error logging out. Please try again.',
  PASSWORD_RESET_ERROR: 'Could not send reset email. Try again later.',
  NO_ACCOUNT_FOUND: 'No account found with that email.'
};

// Form validation messages
export const VALIDATION_MESSAGES = {
  USERNAME_REQUIRED: 'Username is required.',
  EMAIL_PASSWORD_REQUIRED: 'Email and password are required.',
  LOGIN_ID_REQUIRED: 'Please enter your username or email.',
  EMAIL_REQUIRED_FOR_RESET: 'Please enter your email address to reset your password.',
  USERNAME_INVALID: 'Username must be 1–16 characters (letters, numbers, underscores only).'
};

// Success messages
export const SUCCESS_MESSAGES = {
  ACCOUNT_CREATED: 'Account created successfully! You can now log in.',
  PASSWORD_RESET_SENT: 'Password reset email sent. Check your inbox.'
};

// Username validation regex
export const USERNAME_REGEX = /^[a-zA-Z0-9_]{1,16}$/;

// UI constants
export const UI_CONSTANTS = {
  VOTE_CLICK_DURATION: 150, // milliseconds
  MOBILE_BREAKPOINT: 640, // pixels (sm breakpoint)
  MOBILE_DELAY: 100 // milliseconds
};