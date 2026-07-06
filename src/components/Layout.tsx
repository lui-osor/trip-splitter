import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { IS_DEV } from '../lib/supabase'

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-[var(--color-border-soft)]">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 no-underline text-inherit">
            <div className="w-7 h-7 rounded-lg bg-[var(--color-accent)] flex items-center justify-center text-white font-serif text-sm">
              ts
            </div>
            <span className="font-serif text-lg">Trip Splitter</span>
            {IS_DEV && (
              <span className="ml-2 text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)] border border-[var(--color-accent)]/20">
                Dev
              </span>
            )}
          </Link>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-[var(--color-border-soft)] mt-16">
        <div className="max-w-3xl mx-auto px-6 py-4 text-xs text-[var(--color-ink-muted)] text-center">
          Built for a trip to Europe · Made with care
        </div>
      </footer>
    </div>
  )
}
