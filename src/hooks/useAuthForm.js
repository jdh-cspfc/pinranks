import { useState, useEffect } from 'react';
import { auth, db, googleProvider, facebookProvider } from '../firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail,
  signInWithPopup
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { AUTH_ERRORS, VALIDATION_MESSAGES, SUCCESS_MESSAGES, USERNAME_REGEX } from '../constants/appConstants';
import { useErrorHandler } from './useErrorHandler';

/**
 * Custom hook for managing authentication form state and operations
 */
export const useAuthForm = () => {
  const [formData, setFormData] = useState({
    loginId: '',
    email: '',
    username: '',
    password: ''
  });
  const [isLogin, setIsLogin] = useState(true);
  const [user, setUser] = useState(null);
  
  // Use centralized error handling
  const { 
    handleError, 
    handleFirebaseError, 
    handleSuccess, 
    userError: formError, 
    userSuccess: formSuccess, 
    clearMessages 
  } = useErrorHandler('useAuthForm');

  // Handle user authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // Update form data
  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Clear form data
  const clearFormData = () => {
    setFormData({
      loginId: '',
      email: '',
      username: '',
      password: ''
    });
  };

  // Clear messages (now handled by useErrorHandler)

  // Toggle between login and register
  const toggleMode = () => {
    setIsLogin(!isLogin);
    clearMessages();
    clearFormData();
  };

  // Handle login
  const handleLogin = async () => {
    if (!formData.loginId) {
      handleError(VALIDATION_MESSAGES.LOGIN_ID_REQUIRED, { action: 'login_validation' });
      return;
    }

    let loginEmail = formData.loginId;

    // If loginId doesn't contain @, treat it as username
    if (!formData.loginId.includes('@')) {
      try {
        const usernameDoc = await getDoc(doc(db, 'usernames', formData.loginId));
        
        if (!usernameDoc.exists()) {
          handleError(AUTH_ERRORS.USERNAME_NOT_FOUND, { action: 'username_lookup' });
          return;
        }
        
        loginEmail = usernameDoc.data().email;
      } catch (err) {
        handleFirebaseError(err, { action: 'username_lookup' });
        return;
      }
    }

    try {
      await signInWithEmailAndPassword(auth, loginEmail, formData.password);
    } catch (loginErr) {
      handleFirebaseError(loginErr, { action: 'sign_in' });
    }
  };

  // Handle registration
  const handleRegister = async () => {
    // Validate username
    if (!formData.username) {
      handleError(VALIDATION_MESSAGES.USERNAME_REQUIRED, { action: 'register_validation' });
      return;
    }

    if (!USERNAME_REGEX.test(formData.username)) {
      handleError(VALIDATION_MESSAGES.USERNAME_INVALID, { action: 'register_validation' });
      return;
    }

    // Check if email and password are provided
    if (!formData.email || !formData.password) {
      handleError(VALIDATION_MESSAGES.EMAIL_PASSWORD_REQUIRED, { action: 'register_validation' });
      return;
    }

    // Check if username is available
    try {
      const usernameDoc = await getDoc(doc(db, 'usernames', formData.username));
      
      if (usernameDoc.exists()) {
        handleError(AUTH_ERRORS.USERNAME_ALREADY_TAKEN, { action: 'username_check' });
        return;
      }
    } catch (err) {
      handleFirebaseError(err, { action: 'username_check' });
      return;
    }

    // Create user account
    let userCredential;
    try {
      userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
    } catch (err) {
      handleFirebaseError(err, { action: 'create_account' });
      return;
    }

    // Save user data to Firestore
    const user = userCredential.user;
    try {
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        username: formData.username,
        createdAt: new Date().toISOString()
      });

      await setDoc(doc(db, 'usernames', formData.username), {
        uid: user.uid,
        email: user.email
      });

      handleSuccess(SUCCESS_MESSAGES.ACCOUNT_CREATED, { action: 'account_created' });
      setIsLogin(true);
      clearFormData();
    } catch (err) {
      handleFirebaseError(err, { action: 'save_user_data' });
    }
  };

  // Handle password reset
  const handlePasswordReset = async () => {
    if (!formData.loginId.includes('@')) {
      handleError(VALIDATION_MESSAGES.EMAIL_REQUIRED_FOR_RESET, { action: 'password_reset_validation' });
      return;
    }

    try {
      await sendPasswordResetEmail(auth, formData.loginId);
      handleSuccess(SUCCESS_MESSAGES.PASSWORD_RESET_SENT, { action: 'password_reset_sent' });
    } catch (err) {
      handleFirebaseError(err, { action: 'password_reset' });
    }
  };

  // Handle Google sign-in
  const handleGoogleSignIn = async () => {
    try {
      // Log auth domain for debugging
      if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
        console.log('Attempting Google sign-in from:', window.location.hostname);
      }
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Check if this is a new user
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        // New user - create user document
        const username = user.displayName?.replace(/\s+/g, '').toLowerCase() || `user${user.uid.slice(0, 8)}`;
        
        // Check if username is available, if not append numbers
        let finalUsername = username;
        let counter = 1;
        while (true) {
          const usernameDoc = await getDoc(doc(db, 'usernames', finalUsername));
          if (!usernameDoc.exists()) break;
          finalUsername = `${username}${counter}`;
          counter++;
        }
        
        // Save user data to Firestore
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          username: finalUsername,
          displayName: user.displayName,
          photoURL: user.photoURL,
          createdAt: new Date().toISOString(),
          provider: 'google'
        });

        await setDoc(doc(db, 'usernames', finalUsername), {
          uid: user.uid,
          email: user.email
        });

        handleSuccess(`Welcome! Your username is ${finalUsername}`, { action: 'google_signup' });
      } else {
        handleSuccess('Successfully signed in with Google!', { action: 'google_signin' });
      }
    } catch (err) {
      // Log full error for debugging
      console.error('Google sign-in error:', err);
      console.error('Error code:', err.code);
      console.error('Error message:', err.message);
      
      // Don't show error if user closed, cancelled, or denied permission
      if (err.code === 'auth/popup-closed-by-user' || 
          err.code === 'auth/cancelled-popup-request' || 
          err.code === 'auth/user-cancelled') {
        return;
      }
      handleFirebaseError(err, { action: 'google_signin' });
    }
  };

  // Handle Facebook sign-in
  const handleFacebookSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, facebookProvider);
      const user = result.user;
      
      // Check if this is a new user
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        // New user - create user document
        const username = user.displayName?.replace(/\s+/g, '').toLowerCase() || `user${user.uid.slice(0, 8)}`;
        
        // Check if username is available, if not append numbers
        let finalUsername = username;
        let counter = 1;
        while (true) {
          const usernameDoc = await getDoc(doc(db, 'usernames', finalUsername));
          if (!usernameDoc.exists()) break;
          finalUsername = `${username}${counter}`;
          counter++;
        }
        
        // Create user document
        await setDoc(doc(db, 'users', user.uid), {
          username: finalUsername,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          createdAt: new Date(),
          preferences: {
            blockedMachines: [],
            darkMode: false
          }
        });
        
        // Reserve username
        await setDoc(doc(db, 'usernames', finalUsername), {
          uid: user.uid
        });

        handleSuccess(`Welcome! Your username is ${finalUsername}`, { action: 'facebook_signup' });
      } else {
        handleSuccess('Successfully signed in with Facebook!', { action: 'facebook_signin' });
      }
    } catch (err) {
      // Don't show error if user closed, cancelled, or denied permission
      if (err.code === 'auth/popup-closed-by-user' || 
          err.code === 'auth/cancelled-popup-request' || 
          err.code === 'auth/user-cancelled') {
        return;
      }
      handleFirebaseError(err, { action: 'facebook_signin' });
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      handleFirebaseError(err, { action: 'logout' });
    }
  };

  // Main form submission handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    clearMessages();

    try {
      if (isLogin) {
        await handleLogin();
      } else {
        await handleRegister();
      }
    } catch (err) {
      handleError('Something unexpected went wrong. Please try again.', { action: 'form_submission' });
    }
  };

  return {
    formData,
    isLogin,
    user,
    formError,
    formSuccess,
    updateFormData,
    clearFormData,
    clearMessages,
    toggleMode,
    handleSubmit,
    handlePasswordReset,
    handleGoogleSignIn,
    handleFacebookSignIn,
    handleLogout
  };
};