import { redirect } from 'next/navigation'

export default function SettingsPage() {
  // Client runtime may not know uid; always redirect to home, profile editor is on that page.
  // server-side fallback redirect
  redirect('/')
}


