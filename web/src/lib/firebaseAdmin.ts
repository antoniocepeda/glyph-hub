import type { Firestore } from 'firebase-admin/firestore'
import { getFirestore } from 'firebase-admin/firestore'
import { getApps, initializeApp, applicationDefault, type AppOptions, type App } from 'firebase-admin/app'

let cachedDb: Firestore | null = null
let cachedApp: App | null = null
let initAttempted = false

function resolveProjectId(): string | undefined {
  return (
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT
  )
}

function ensureAdminApp(): App | null {
  if (cachedApp) return cachedApp
  const existing = getApps()
  if (existing.length) {
    cachedApp = existing[0] ?? null
    return cachedApp
  }
  if (initAttempted) return cachedApp

  const projectId = resolveProjectId()

  try {
    const options: AppOptions = {
      credential: applicationDefault(),
    }
    if (projectId) options.projectId = projectId

    cachedApp = initializeApp(options)
    initAttempted = true
    console.debug('[firebase-admin] Initialized default app', { projectId: options.projectId ?? null })
  } catch (error) {
    initAttempted = false
    cachedApp = null
    console.error('[firebase-admin] Failed to initialize admin app', error)
  }
  return cachedApp
}

export function getAdminDb(): Firestore | null {
  if (cachedDb) return cachedDb
  const app = ensureAdminApp()
  if (!app) {
    console.error('[firebase-admin] No admin app available')
    return null
  }
  try {
    cachedDb = getFirestore(app)
    return cachedDb
  } catch (error) {
    initAttempted = false
    cachedDb = null
    console.error('[firebase-admin] Firestore unavailable', error)
    return null
  }
}
