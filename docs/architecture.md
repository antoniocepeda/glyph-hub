# GlyphHub — Architecture Overview

High-level architecture, data model, and flows aligned with the PRD.

---

## 1) System overview

- Frontend: Next.js 15 (App Router), React 19, Tailwind, shadcn/ui
- Backend: Firebase Auth, Firestore, (optional) Cloud Functions
- IDs: `nanoid` for short URLs (`/p/<id>`)
- Share Codes: `PB1.<compressed JSON>.<crc>` using `pako`
- Validation: `zod`

---

## 2) Routes (App Router)

- `/` — feed/search (public)
- `/new` — create prompt
- `/p/[id]` — prompt view; `/p/[id]/edit`, `/p/[id]/versions`
- `/profile/[uid]` — public profile
- `/collections` — listing; `/collections/new`; `/collections/[id]`; `/collections/[id]/edit`
- `/help` — knowledge base; `/help/[slug]`
- `/public` — browse all public prompts
- `/trending` — engagement-sorted list
- `/embed/p/[id]` — minimal embed view (iframe-friendly)
- `(auth)/login` — email/password auth
- `api/extract` — naive import extractor (server route)

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
- Unlisted: conceptually meant to be "not listed" but accessible via direct link/share code. Current implementation treats `unlisted` as public-but-not-listed; token-gating TBD (see rules).
- Private: only owner
- Auth: Email/Password. Anonymous writes allowed only for creating public/unlisted prompts with `ownerId == 'anon'`.
- Stats updates: constrained increments (views/copies non-decreasing; likes ±1) for signed-in users.
- Deletes: owner or designated superuser email.
- Collections: collaborator roles (`viewer`/`editor`).

Full rules live in `web/firebase.rules`.

---

## 5) Core flows

### 5.1 Create Prompt

1. User authenticates (or proceeds unauthenticated with limited capabilities)
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
- Utils: `share-code.ts`, `validators.ts`, `checksum.ts`, `utils.ts`

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
