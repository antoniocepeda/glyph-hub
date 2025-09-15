"use client"
export function KnowledgeBase() {
  return (
    <div className="prose prose-invert max-w-none">
      <h2>Welcome to GlyphHub</h2>
      <p>GlyphHub lets you create, share, and discover AI prompts with short URLs and compact share codes.</p>

      <h3>Quick Start</h3>
      <ol>
        <li>Sign in with email, then go to <code>/new</code> to create a prompt.</li>
        <li>Fill in title, body, optional tags and source URL, pick visibility.</li>
        <li>Click Save. You’ll get a short URL and can copy the share code.</li>
      </ol>

      <h3>Share Codes</h3>
      <p>Share codes encode the prompt JSON using the PB1 format (deflate + base64url + CRC). Anyone can paste a code back into GlyphHub to reconstruct the prompt.</p>

      <h3>Variables</h3>
      <p>Use <code>{'{{variable}}'}</code> placeholders in the body. On the prompt page, fill inputs to substitute values when copying the prompt or JSON.</p>

      <h3>Visibility</h3>
      <ul>
        <li><b>Public</b>: visible on home and trending; anyone can view.</li>
        <li><b>Unlisted</b>: only accessible via direct link/share code.</li>
        <li><b>Private</b>: only you (and collaborators on collections) can access.</li>
      </ul>

      <h3>Collections</h3>
      <ul>
        <li>Create collections at <code>/collections</code>, choose <i>public</i> or <i>private</i>.</li>
        <li>Add prompts to a collection from each prompt page.</li>
        <li>Share a collection via <code>/collections/[id]</code> if public.</li>
        <li>Invite collaborators (viewer/editor) by email from the collection edit page.</li>
      </ul>

      <h3>Profiles</h3>
      <p>Your public profile at <code>/profile/[uid]</code> lists your public prompts and collections.</p>

      <h3>Import from Link</h3>
      <p>Use <code>/import</code> to extract content from a page. We prefill a new prompt draft with the title and extracted text.</p>

      <h3>Embeds</h3>
      <p>Use the “Copy Embed” button on a prompt to get an iframe snippet for blogs or Notion.</p>

      <h3>Forking & Versioning</h3>
      <ul>
        <li><b>Fork</b> creates a private copy with attribution to the source prompt.</li>
        <li>Use <code>/p/[id]/edit</code> to update a prompt; we save prior versions under <code>versions</code>.</li>
        <li>See and restore versions at <code>/p/[id]/versions</code>.</li>
      </ul>

      <h3>Likes & Trending</h3>
      <ul>
        <li>Click Like on a prompt; favorites are stored under your profile.</li>
        <li>Trending ranks prompts by likes, copies, and views.</li>
      </ul>

      <h3>Limits & Safety</h3>
      <ul>
        <li>We throttle new prompt creation (per-user) to reduce abuse.</li>
        <li>Simple word filters block disallowed content.</li>
        <li>Firestore rules enforce ownership and visibility.</li>
      </ul>

      <h3>Tips</h3>
      <ul>
        <li>Use descriptive titles; add 2–5 tags.</li>
        <li>Use variables for reusable prompts: <code>{'{{topic}}'}</code>, <code>{'{{style}}'}</code>, etc.</li>
        <li>Keep bodies concise; add references in <i>source URL</i>.</li>
      </ul>

      <h3>Keyboard Shortcuts</h3>
      <ul>
        <li>On a prompt page: Copy Prompt, Copy JSON, Copy Share Code buttons are tab-accessible and enter-activated.</li>
      </ul>

      <h3>FAQ</h3>
      <ul>
        <li><b>Do I need API keys?</b> No, GlyphHub doesn’t call model APIs for you.</li>
        <li><b>Can I import from any site?</b> We best-effort extract text; complex pages might need manual cleanup.</li>
        <li><b>Is my private data safe?</b> Private prompts are visible only to you (and collaborators where applicable).</li>
      </ul>
    </div>
  )
}


