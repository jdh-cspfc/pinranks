import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { AUTH_ERRORS, VALIDATION_MESSAGES, SUCCESS_MESSAGES, USERNAME_REGEX } from '../constants/appConstants';

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
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

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

  // Clear messages
  const clearMessages = () => {
    setFormError('');
    setFormSuccess('');
  };

  // Toggle between login and register
  const toggleMode = () => {
    setIsLogin(!isLogin);
    clearMessages();
    clearFormData();
  };

  // Handle login
  const handleLogin = async () => {
    if (!formData.loginId) {
      setFormError(VALIDATION_MESSAGES.LOGIN_ID_REQUIRED);
      return;
    }

    let loginEmail = formData.loginId;

    // If loginId doesn't contain @, treat it as username
    if (!formData.loginId.includes('@')) {
      try {
        const usernameDoc = await getDoc(doc(db, 'usernames', formData.loginId));
        
        if (!usernameDoc.exists()) {
          setFormError(AUTH_ERRORS.USERNAME_NOT_FOUND);
          return;
        }
        
        loginEmail = usernameDoc.data().email;
      } catch (err) {
        if (err.code === 'permission-denied') {
          setFormError(AUTH_ERRORS.PERMISSION_DENIED);
        } else {
          setFormError(AUTH_ERRORS.UNEXPECTED_ERROR);
        }
        return;
      }
    }

    try {
      await signInWithEmailAndPassword(auth, loginEmail, formData.password);
    } catch (loginErr) {
      const code = loginErr.code;
      switch (code) {
        case 'auth/user-not-found':
          setFormError(AUTH_ERRORS.USER_NOT_FOUND);
          break;
        case 'auth/wrong-password':
          setFormError(AUTH_ERRORS.WRONG_PASSWORD);
          break;
        case 'auth/invalid-email':
          setFormError(AUTH_ERRORS.INVALID_EMAIL);
          break;
        case 'auth/too-many-requests':
          setFormError(AUTH_ERRORS.TOO_MANY_REQUESTS);
          break;
        default:
          setFormError(AUTH_ERRORS.LOGIN_FAILED);
          console.error('Unhandled auth error:', loginErr);
      }
    }
  };

  // Handle registration
  const handleRegister = async () => {
    // Validate username
    if (!formData.username) {
      setFormError(VALIDATION_MESSAGES.USERNAME_REQUIRED);
      return;
    }

    if (!USERNAME_REGEX.test(formData.username)) {
      setFormError(VALIDATION_MESSAGES.USERNAME_INVALID);
      return;
    }

    // Check if email and password are provided
    if (!formData.email || !formData.password) {
      setFormError(VALIDATION_MESSAGES.EMAIL_PASSWORD_REQUIRED);
      return;
    }

    // Check if username is available
    try {
      const usernameDoc = await getDoc(doc(db, 'usernames', formData.username));
      
      if (usernameDoc.exists()) {
        setFormError(AUTH_ERRORS.USERNAME_ALREADY_TAKEN);
        return;
      }
    } catch (err) {
      if (err.code === 'permission-denied') {
        setFormError(AUTH_ERRORS.PERMISSION_DENIED);
      } else {
        setFormError(AUTH_ERRORS.UNEXPECTED_ERROR);
      }
      return;
    }

    // Create user account
    let userCredential;
    try {
      userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
    } catch (err) {
      const code = err.code;
      switch (code) {
        case 'auth/email-already-in-use':
          setFormError(AUTH_ERRORS.EMAIL_ALREADY_IN_USE);
          break;
        case 'auth/invalid-email':
          setFormError(AUTH_ERRORS.INVALID_EMAIL);
          break;
        case 'auth/weak-password':
          setFormError(AUTH_ERRORS.WEAK_PASSWORD);
          break;
        default:
          setFormError(AUTH_ERRORS.REGISTRATION_FAILED);
          console.error('Unhandled auth error:', err);
      }
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

      setFormSuccess(SUCCESS_MESSAGES.ACCOUNT_CREATED);
      setIsLogin(true);
      clearFormData();
    } catch (err) {
      setFormError(AUTH_ERRORS.SAVE_USER_DATA_ERROR);
      console.error('Firestore write error:', err);
    }
  };

  // Handle password reset
  const handlePasswordReset = async () => {
    if (!formData.loginId.includes('@')) {
      setFormError(VALIDATION_MESSAGES.EMAIL_REQUIRED_FOR_RESET);
      return;
    }

    try {
      await sendPasswordResetEmail(auth, formData.loginId);
      setFormSuccess(SUCCESS_MESSAGES.PASSWORD_RESET_SENT);
    } catch (err) {
      const code = err.code;
      switch (code) {
        case 'auth/user-not-found':
          setFormError(AUTH_ERRORS.NO_ACCOUNT_FOUND);
          break;
        case 'auth/invalid-email':
          setFormError(AUTH_ERRORS.INVALID_EMAIL);
          break;
        default:
          setFormError(AUTH_ERRORS.PASSWORD_RESET_ERROR);
          console.error('Password reset error:', err);
      }
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      setFormError(AUTH_ERRORS.LOGOUT_ERROR);
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
      setFormError('Something unexpected went wrong. Please try again.');
      console.error('Unexpected error:', err);
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
    handleLogout
  };
};