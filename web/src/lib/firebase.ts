import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'
import {
  getAuth as _getAuth,
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  type Auth,
} from 'firebase/auth'
import { getFirestore as _getFirestore, type Firestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'
import { getStorage as _getStorage, type FirebaseStorage } from 'firebase/storage'

let cachedApp: FirebaseApp | null = null
let cachedAuth: Auth | null = null
let hasWarnedMissingEnv = false
let hasWarnedServerSideAuth = false

// Snapshot env via static references so Next.js can inline values at build time
const ENV_SNAPSHOT = {
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

function getMissingEnvKeys(): string[] {
  return Object.entries(ENV_SNAPSHOT)
    .filter(([, value]) => !value)
    .map(([key]) => key)
}

function hasEnv(): boolean {
  return getMissingEnvKeys().length === 0
}

export function getFirebaseApp(): FirebaseApp | null {
  if (cachedApp) return cachedApp
  if (!hasEnv()) {
    if (!hasWarnedMissingEnv) {
      hasWarnedMissingEnv = true
      const missing = getMissingEnvKeys()
      // Log once to help devs diagnose why auth/db/storage are null
      console.warn(
        '[firebase] Missing Firebase env vars. Add web/.env.local with NEXT_PUBLIC_ keys. Missing:',
        missing
      )
    }
    return null
  }
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  }
  cachedApp = getApps().length ? getApp() : initializeApp(firebaseConfig)
  return cachedApp
}

export function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp()
  if (!app) return null
  if (cachedAuth) return cachedAuth
  if (typeof window === 'undefined') {
    if (!hasWarnedServerSideAuth) {
      hasWarnedServerSideAuth = true
      // Next.js may import this on the server during rendering; return null in SSR
      console.debug('[firebase] getFirebaseAuth called on the server; returning null')
    }
    return null
  }
  try {
    cachedAuth = _getAuth(app)
  } catch {
    cachedAuth = initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence],
    })
  }
  return cachedAuth
}

export function getDb(): Firestore | null {
  const app = getFirebaseApp()
  if (!app) return null
  try {
    // Try to initialize with persistence once
    // If already initialized, fall back to getFirestore
    return initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    })
  } catch {
    return _getFirestore(app)
  }
}

export function getCurrentUser() {
  const auth = getFirebaseAuth()
  return auth?.currentUser ?? null
}

export function getStorage(): FirebaseStorage | null {
  const app = getFirebaseApp()
  return app ? _getStorage(app) : null
}


