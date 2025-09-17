export type KbArticle = {
  slug: string
  title: string
  category: 'Getting Started' | 'Sharing' | 'Collections' | 'Profiles' | 'Advanced' | 'Safety'
  body: string
}

export const KB: KbArticle[] = [
  {
    slug: 'getting-started',
    title: 'Getting Started with GlyphHub',
    category: 'Getting Started',
    body: `
Sign in with email, then visit /new to create a prompt. Fill title, body, tags, and optional source URL.

Visibility:
- Public: listed and visible to all
- Unlisted: access via link only
- Private: only you (+ collaborators via collections)
    `.trim(),
  },
  {
    slug: 'share-codes',
    title: 'Share Codes (PB1 format)',
    category: 'Sharing',
    body: `
Share codes encode the prompt JSON using PB1.<payload>.<crc> (deflate + base64url + CRC). Copy from the prompt page and paste to recreate the prompt.
    `.trim(),
  },
  {
    slug: 'copy-options',
    title: 'Copy & Export Options',
    category: 'Sharing',
    body: `
On each prompt page you can copy or export in several ways:

- Copy Prompt — Copies the plain text body of the prompt. If the prompt contains {{variables}}, any values you filled in the inputs will be substituted before copying. Formatting and newlines are preserved.
- Copy JSON — Copies a canonical JSON snapshot with fields: title, body, tags, sourceUrl, visibility. Useful for backups or integrations.
- Copy Share Code — Copies a compact PB1 code (deflate + base64url + CRC). Anyone can paste this code into GlyphHub to reconstruct the prompt offline. Best for sharing in chats where links are inconvenient.
- Copy URL — Copies the short URL like /p/abc123 for sharing a direct link.
- Copy Embed — Copies an iframe snippet to embed the prompt card in blogs or tools like Notion.

Tips:
- Use variables (e.g., {{topic}}) to quickly tailor copies. Fill inputs before using Copy Prompt/JSON/Code.
- Share codes stay reasonably short for typical prompts; very long bodies may be better shared as a link.
    `.trim(),
  },
  {
    slug: 'variables',
    title: 'Using Variables',
    category: 'Advanced',
    body: `
Use {{variable}} placeholders in the body. The prompt page renders inputs to fill values; copies and share code apply substitutions.
Examples: {{topic}}, {{style}}, {{audience}}
    `.trim(),
  },
  {
    slug: 'collections',
    title: 'Collections & Collaboration',
    category: 'Collections',
    body: `
Create collections at /collections. Add prompts from prompt pages. Public collections are shareable at /collections/[id]. Invite collaborators (viewer/editor) by email on the collection edit page.
    `.trim(),
  },
  {
    slug: 'profiles',
    title: 'Profiles',
    category: 'Profiles',
    body: `
Your profile at /profile/[uid] lists your public prompts and collections.
    `.trim(),
  },
  {
    slug: 'safety',
    title: 'Limits & Safety',
    category: 'Safety',
    body: `
We throttle prompt creation to reduce abuse. Basic word filters block disallowed content. Firestore rules enforce ownership and visibility.
    `.trim(),
  },
]

export function searchKb(q: string): KbArticle[] {
  const s = q.trim().toLowerCase()
  if (!s) return KB
  return KB.filter(a => a.title.toLowerCase().includes(s) || a.body.toLowerCase().includes(s) || a.category.toLowerCase().includes(s))
}

export function getKb(slug: string): KbArticle | undefined {
  return KB.find(a => a.slug === slug)
}


