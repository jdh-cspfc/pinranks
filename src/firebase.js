import { initializeApp } from 'firebase/app'
import { getAuth, setPersistence, browserLocalPersistence, GoogleAuthProvider, FacebookAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import errorService from './services/errorService'

const firebaseConfig = {
  apiKey: "AIzaSyCWzLfjymwB9BOfbHH9iePqjOUD2l_KVPY",
  authDomain: "pinranks-efabb.firebaseapp.com",
  projectId: "pinranks-efabb",
  storageBucket: "pinranks-efabb.firebasestorage.app",
  messagingSenderId: "345340805592",
  appId: "1:345340805592:web:ce60cb2b340862a232f2ad",
  measurementId: "G-0C7CLYRMGW"
};

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)

// Initialize Google Auth Provider
export const googleProvider = new GoogleAuthProvider()

// Initialize Facebook Auth Provider
export const facebookProvider = new FacebookAuthProvider()

// Set persistence to LOCAL for faster auth checks
setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    errorService.logError(error, {
      component: 'firebase',
      action: 'setPersistence'
    })
  })

export const db = getFirestore(app)
export const storage = getStorage(app)