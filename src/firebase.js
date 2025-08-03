import { initializeApp } from 'firebase/app'
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

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

// Set persistence to LOCAL for faster auth checks
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log('Firebase Auth persistence set to LOCAL')
  })
  .catch((error) => {
    console.error('Error setting Firebase Auth persistence:', error)
  })

export const db = getFirestore(app)