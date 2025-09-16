import { getFirebaseAuth, getDb } from './firebase'
import {
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  User,
} from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'

export async function ensureUserProfile(user: User): Promise<void> {
  const db = getDb()
  if (!db) return
  const ref = doc(db, 'users', user.uid)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    await setDoc(ref, {
      displayName: user.displayName || '',
      photoURL: user.photoURL || '',
      emailLower: (user.email || '').toLowerCase(),
      bio: '',
      createdAt: serverTimestamp(),
      promptCount: 0,
      likeCount: 0,
    })
  }
}

// Google login removed

export async function registerWithEmailPassword(email: string, password: string): Promise<User> {
  const auth = getFirebaseAuth()
  if (!auth) {
    console.warn('[auth] registerWithEmailPassword: no auth instance; possibly missing env')
    throw new Error('Firebase is not configured. Add .env.local')
  }
  const res = await createUserWithEmailAndPassword(auth, email, password)
  await ensureUserProfile(res.user)
  return res.user
}

export async function signInWithEmailPassword(email: string, password: string): Promise<User> {
  const auth = getFirebaseAuth()
  if (!auth) {
    console.warn('[auth] signInWithEmailPassword: no auth instance; possibly missing env')
    throw new Error('Firebase is not configured. Add .env.local')
  }
  const res = await signInWithEmailAndPassword(auth, email, password)
  await ensureUserProfile(res.user)
  return res.user
}

export async function signOut(): Promise<void> {
  const auth = getFirebaseAuth()
  if (!auth) {
    console.debug('[auth] signOut: no auth instance; ignoring')
    return
  }
  await firebaseSignOut(auth)
}

// Anonymous sign-in helper removed; client anonymous writes use ownerId 'anon' under rules


