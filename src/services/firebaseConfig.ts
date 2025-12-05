// Firebase configuration and initialization
import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
}

// Validate required config
const requiredKeys = ['projectId', 'databaseURL', 'apiKey', 'authDomain', 'appId'] as const
const missingKeys = requiredKeys.filter(key => !firebaseConfig[key])

if (missingKeys.length > 0) {
  console.error('❌ Missing Firebase environment variables:', missingKeys)
  console.error('Firebase config:', firebaseConfig)
  throw new Error(`Missing required Firebase config: ${missingKeys.join(', ')}. Check your .env file for VITE_FIREBASE_* variables.`)
}

// Initialize Firebase
export const app = initializeApp(firebaseConfig)
export const database = getDatabase(app)
export const auth = getAuth(app)
