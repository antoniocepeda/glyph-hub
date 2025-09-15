# GlyphHub — Architecture Overview

High-level architecture, data model, and flows aligned with the PRD.

---

## 1) System overview

- Frontend: Next.js 15 (App Router), React 18, Tailwind, shadcn/ui
- Backend: Firebase Auth, Firestore, (optional) Cloud Functions
- IDs: `nanoid` for short URLs (`/p/<id>`)
- Share Codes: `PB1.<compressed JSON>.<crc>` using `pako`
- Validation: `zod`

---

## 2) Routes (App Router)

- `/` — feed/search (public + mine)
- `/new` — create prompt
- `/p/[id]` — prompt view
- `/profile/[uid]` — public profile
- `/collections/[id]` — collection view

---

## 3) Data model (Firestore)

### 3.1 Collections

- `users/{uid}`
  - displayName, photoURL, bio, createdAt
  - metrics: promptCount, likeCount

- `prompts/{id}`
  - ownerId (uid)
  - title, body, tags[], sourceUrl?
  - visibility: `public | unlisted | private`
  - checksum (string)
  - stats: { views, copies, likes }
  - forkOf? (promptId)
  - createdAt, updatedAt

- `collections/{id}`
  - ownerId (uid)
  - title, description?
  - visibility
  - createdAt, updatedAt

- `collections/{id}/items/{promptId}`
  - promptId, addedAt

### 3.2 Versioning

- `prompts/{id}/versions/{versionId}`
  - title, body, tags, createdAt
- On edit, create a new version; `prompts/{id}` holds the latest fields.

### 3.3 Indexes

- Composite: prompts by `visibility` + `createdAt desc`
- Array contains: `tags`

---

## 4) Security model

- Public visibility: anyone can read
- Unlisted: readable when direct link/share code is used (no listing)
- Private: only owner
- Writes: only owner can create/update/delete their prompts/collections
- Profiles readable by all

See `developer-setup.md` for a starting set of Firestore rules.

---

## 5) Core flows

### 5.1 Create Prompt

1. User authenticates
2. Client validates input (zod)
3. Compute checksum of body
4. Create `prompts/{id}` (id from `nanoid`)
5. Navigate to `/p/{id}`

### 5.2 View/Share Prompt

- Short URL: `/p/{id}`
- Share Code: Encode prompt JSON → deflate → base64url → `PB1.<payload>.<crc>`
- Copy buttons increment counters

### 5.3 Search & Tags

- Filter public prompts by tags and title prefix
- Phase 1: Firestore queries + client filtering
- Phase 2+: external index (Algolia/Typesense) if needed

### 5.4 Forking

- “Fork” duplicates a prompt with `forkOf` attribution

### 5.5 Collections

- Collections contain `items` subcollection referencing prompts
- Shareable collection URL

---

## 6) Client architecture

- UI: shadcn/ui components + custom design tokens (see `design.md`)
- State: React state/hooks; keep client logic thin
- Data: Firestore SDK; hooks for reads/writes
- Utils: `share-code.ts`, `validators.ts`, `format.ts`

---

## 7) Telemetry & metrics

- Track: views, copies, likes
- Optionally use Cloud Functions to aggregate daily summaries

---

## 8) Performance

- Cache prompt reads (CDN/Next edge where possible)
- Prefetch detail pages from listings
- Keep share code generation offline-capable

---

## 9) Extensibility

- Browser extension (MV3) posts to Firestore with auth
- Embeds render compact card with copy actions
- “Run” buttons (ChatGPT/Claude) composed via URL templates

