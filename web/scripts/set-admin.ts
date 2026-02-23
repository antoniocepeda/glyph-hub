import { getApps, initializeApp, applicationDefault } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

async function main() {
  const EMAIL = process.argv[2]
  if (!EMAIL) {
    console.error('Usage: npx tsx scripts/set-admin.ts <email>')
    process.exit(1)
  }

  if (!getApps().length) {
    initializeApp({
      credential: applicationDefault(),
      projectId:
        process.env.FIREBASE_ADMIN_PROJECT_ID ||
        process.env.FIREBASE_PROJECT_ID ||
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    })
  }

  const auth = getAuth()
  const user = await auth.getUserByEmail(EMAIL)
  await auth.setCustomUserClaims(user.uid, { role: 'admin', admin: true })
  console.log(`Set admin claims on ${EMAIL} (uid: ${user.uid})`)

  const updated = await auth.getUser(user.uid)
  console.log('Custom claims:', updated.customClaims)
}

main().catch((err) => {
  console.error('Failed:', err)
  process.exit(1)
})
