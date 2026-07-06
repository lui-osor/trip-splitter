import { useState } from 'react'

export default function App() {
  const [tripName, setTripName] = useState('')

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-[var(--color-border-soft)]">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--color-accent)] flex items-center justify-center text-white font-serif text-sm">
              ts
            </div>
            <span className="font-serif text-lg">Trip Splitter</span>
          </div>
          <a
            href="#"
            className="text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
          >
            How it works
          </a>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="max-w-xl w-full text-center">
          <h1 className="mb-4">
            Split expenses<br />
            <span className="italic text-[var(--color-accent)]">without the awkwardness.</span>
          </h1>
          <p className="text-[var(--color-ink-soft)] text-lg mb-10 leading-relaxed">
            A simple, shared ledger for your trip. Track who paid, who owes,
            and settle up in one tap when you get home.
          </p>

          <div className="card text-left">
            <label className="block text-sm font-medium mb-2 text-[var(--color-ink-soft)]">
              Trip name
            </label>
            <input
              className="input mb-4"
              placeholder="Europe 2026 ✨"
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
            />
            <div className="flex gap-3">
              <button className="btn-primary flex-1" disabled={!tripName.trim()}>
                Create trip
              </button>
              <button className="btn-secondary flex-1">
                Join with link
              </button>
            </div>
          </div>

          <p className="text-xs text-[var(--color-ink-muted)] mt-6">
            No account needed. Share the trip link with your travel buddies.
          </p>
        </div>
      </main>

      <footer className="border-t border-[var(--color-border-soft)]">
        <div className="max-w-5xl mx-auto px-6 py-4 text-xs text-[var(--color-ink-muted)] text-center">
          Built for a trip to Europe · Made with care
        </div>
      </footer>
    </div>
  )
}
