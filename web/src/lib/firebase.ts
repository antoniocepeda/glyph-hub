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
import { getAnalytics as _getAnalytics, isSupported as analyticsIsSupported, type Analytics } from 'firebase/analytics'

let cachedApp: FirebaseApp | null = null
let cachedAuth: Auth | null = null
let hasWarnedMissingEnv = false
let hasWarnedServerSideAuth = false
let hasWarnedOptionalEnv = false
let cachedAnalytics: Analytics | null = null
let hasWarnedAnalytics = false

// Snapshot env via static references so Next.js can inline values at build time
const REQUIRED_ENV = {
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}
const OPTIONAL_ENV = {
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

function missingKeys(obj: Record<string, unknown>): string[] {
  return Object.entries(obj).filter(([, v]) => !v).map(([k]) => k)
}

function hasEnv(): boolean {
  return missingKeys(REQUIRED_ENV).length === 0
}

export function getFirebaseApp(): FirebaseApp | null {
  if (cachedApp) return cachedApp
  if (!hasEnv()) {
    if (!hasWarnedMissingEnv) {
      hasWarnedMissingEnv = true
      const missingRequired = missingKeys(REQUIRED_ENV)
      const missingOptional = missingKeys(OPTIONAL_ENV)
      // Log once to help devs diagnose why auth/db/storage are null
      console.warn('[firebase] Missing required Firebase env vars. Add web/.env.local. Missing:', missingRequired)
      if (missingOptional.length) {
        console.warn('[firebase] Optional Firebase env vars not set (ok to ignore if unused):', missingOptional)
      }
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
  // Warn once about optional keys if missing, even when required are present
  if (!hasWarnedOptionalEnv) {
    hasWarnedOptionalEnv = true
    const missingOptional = missingKeys(OPTIONAL_ENV)
    if (missingOptional.length) {
      console.debug('[firebase] Optional env not set (storage/messaging/analytics may be disabled):', missingOptional)
    }
  }
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

// Analytics is optional and only available in supported browsers.
// Usage (client-only):
//   useEffect(() => { getAnalytics().then(a => a && logEvent(a, 'page_view')) }, [])
export async function getAnalytics(): Promise<Analytics | null> {
  const app = getFirebaseApp()
  if (!app) return null
  if (typeof window === 'undefined') return null
  try {
    const supported = await analyticsIsSupported()
    if (!supported) return null
  } catch {
    return null
  }
  const hasMeasurementId = Boolean(process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID)
  if (!hasMeasurementId) {
    if (!hasWarnedAnalytics) {
      hasWarnedAnalytics = true
      console.debug('[firebase] Analytics disabled: NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID not set')
    }
    return null
  }
  try {
    if (cachedAnalytics) return cachedAnalytics
    cachedAnalytics = _getAnalytics(app)
    return cachedAnalytics
  } catch {
    return null
  }
}
