# GlyphHub — Developer Setup Guide

A step-by-step guide to set up the GlyphHub web app and Firebase backend locally.

---

## 1) Prerequisites

- Node.js 20+
- npm 9+ (or pnpm/yarn if preferred)
- Firebase account with project access
- Git

Optional:
- Volta/NVM to pin Node version

---

## 2) Clone the repository

```bash
git clone <your-repo-url> glyphhub
cd glyphhub
```

---

## 3) Project layout and install dependencies

This repository already includes the Next.js app under `web/` targeting Next.js 15 + React 19 with Tailwind 4 and shadcn/ui.

```bash
cd web
npm install
```

Notes:
- Node 20 is required (see `web/package.json` → `engines.node`).
- UI icons use `lucide-react`. Tailwind CSS is v4.
- shadcn/ui is preconfigured (see `web/components.json`).

---

## 4) Firebase project setup

1. Create a Firebase project in the console and enable:
   - Authentication: Email/Password
   - Firestore: Production mode
2. Copy the Web SDK config from Project Settings → General.

Create `.env.local` in `web/` with these keys:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
# Optional (used if provided):
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=...
```

We already ship a robust Firebase client in `web/src/lib/firebase.ts` (with persistence and SSR guards). The following is a simplified reference-only example:

```ts
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
```

---

## 5) Firestore rules (MVP)

Enforce visibility and ownership. Start with a minimal set and harden later.

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() {
      return request.auth != null;
    }

    function isOwner(ownerId) {
      return isSignedIn() && request.auth.uid == ownerId;
    }

    match /prompts/{id} {
      allow read: if resource.data.visibility == 'public' ||
                   (resource.data.visibility == 'unlisted' && request.time != null) ||
                   isOwner(resource.data.ownerId);

      allow create: if isSignedIn() && request.resource.data.ownerId == request.auth.uid;
      allow update, delete: if isOwner(resource.data.ownerId);
    }

    match /users/{uid} {
      allow read: if true;
      allow create, update: if isOwner(uid);
    }

    match /collections/{id} {
      allow read: if resource.data.visibility == 'public' || isOwner(resource.data.ownerId);
      allow create: if isSignedIn() && request.resource.data.ownerId == request.auth.uid;
      allow update, delete: if isOwner(resource.data.ownerId);
    }
  }
}
```

Project-specific rule additions (see `web/firebase.rules`):
- Unauthenticated users can create only `public` or `unlisted` prompts with `ownerId == 'anon'` (validated fields required).
- Signed-in users may perform stats-only updates with constraints (views/copies non-decreasing; likes can change by ±1).
- Deletes are allowed by the owner or a designated superuser email.
- Collections support collaborators with `viewer`/`editor` roles.

---

## 6) Recommended directory structure

```
web/
  src/
    app/              # Next.js App Router pages (/, /p/[id], /new, /profile/[uid])
    components/       # UI components (shadcn/ui + custom)
    lib/              # firebase.ts, share-code.ts, validators.ts
    styles/           # globals.css, tokens
```

---

## 7) Install and run

```bash
cd web
npm install
npm run dev
```

Visit http://localhost:3000.

Optional: A simple Express static server exists at the repo root (`index.js`) and serves `public/index.html` when run from the root. It is not required for the Next.js app.

---

## 8) Initial features to scaffold

- Auth provider buttons (Google, Email/Password)
- New Prompt page with `zod` validation
- Prompt Detail page `/p/[id]` with copy buttons and share code
- Basic search by title/tags

---

## 9) Optional: Cloud Functions

For server-side tasks (e.g., rate limiting), initialize functions:

```bash
npm i -g firebase-tools
firebase login
firebase init functions
```

Use TypeScript runtime; deploy with `firebase deploy --only functions`.

---

## 10) Naming & domain

- Product name: GlyphHub
- Domain: glyphhub.com (alt: glyphub.com — TBD)

Keep the name consistent across UI, docs, and code.

