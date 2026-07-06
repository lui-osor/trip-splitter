import { useState } from 'react'

type Props = {
  code: string
  /** Style: "pill" for a small chip in a list; "prominent" for a big share block. */
  variant?: 'pill' | 'prominent'
}

/**
 * Displays a trip invite code with a one-tap copy-to-clipboard action.
 * Shows a brief "Copied!" confirmation after a successful copy.
 */
export function CopyableCode({ code, variant = 'pill' }: Props) {
  const [copied, setCopied] = useState(false)

  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation() // don't trigger parent row click
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // Clipboard API can fail on http:// or in some browsers; fallback.
      const ta = document.createElement('textarea')
      ta.value = code
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand('copy')
        setCopied(true)
        setTimeout(() => setCopied(false), 1600)
      } finally {
        document.body.removeChild(ta)
      }
    }
  }

  if (variant === 'prominent') {
    return (
      <button
        onClick={handleCopy}
        className="no-ring w-full flex items-center gap-3 px-5 py-4 rounded-2xl bg-[var(--color-purple-100)] border-none cursor-pointer"
      >
        <div className="flex-1 text-left">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-[var(--color-core-purple)]/70">
            Trip code
          </div>
          <div className="font-semibold text-[22px] tracking-[0.14em] text-[var(--color-core-purple)] mt-0.5">
            {code}
          </div>
        </div>
        <span className="text-[13px] font-semibold text-[var(--color-core-purple)] flex items-center gap-1.5">
          {copied ? (
            <>
              <CheckIcon />
              Copied
            </>
          ) : (
            <>
              <CopyIcon />
              Copy
            </>
          )}
        </span>
      </button>
    )
  }

  return (
    <button
      onClick={handleCopy}
      className="no-ring inline-flex items-center gap-1.5 bg-[var(--color-grey-100)] border-none rounded-full px-2.5 py-1 cursor-pointer text-[12px] font-semibold text-[var(--color-fg-2)] tracking-[0.08em]"
      title="Copy code"
    >
      <span>{code}</span>
      {copied ? (
        <CheckIcon size={13} color="var(--color-success)" />
      ) : (
        <CopyIcon size={13} color="var(--color-fg-3)" />
      )}
    </button>
  )
}

function CopyIcon({ size = 15, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="12" height="12" rx="2.4" />
      <path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3" />
    </svg>
  )
}

function CheckIcon({ size = 15, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12l4 4L19 6" />
    </svg>
  )
}
