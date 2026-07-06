import type { ReactNode } from 'react'

type Props = {
  open: boolean
  title?: string
  onClose: () => void
  onBack?: () => void
  children: ReactNode
  /** Max height as a percentage of the frame (e.g. "92%"). Defaults to "92%". */
  maxHeight?: string
}

/**
 * Bottom-sheet modal that slides up from the base of the phone frame.
 * Scrim covers everything above it; tapping the scrim closes.
 * Must be rendered inside a container with `position: relative`
 * (the PhoneFrame is set up as such).
 */
export function Sheet({
  open,
  title,
  onClose,
  onBack,
  children,
  maxHeight = '92%',
}: Props) {
  if (!open) return null

  return (
    <>
      <div
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(30,0,47,0.45)] z-40 animate-scrim-in"
      />
      <div
        className="absolute left-0 right-0 bottom-0 bg-white rounded-t-[28px] z-40 flex flex-col animate-sheet-up"
        style={{ maxHeight, zIndex: 41 }}
      >
        {(title || onBack) && (
          <div className="flex-shrink-0 px-6 pt-4 pb-3 border-b border-[var(--color-divider)] flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="no-ring w-[34px] h-[34px] rounded-full bg-[var(--color-grey-100)] border-none cursor-pointer flex items-center justify-center"
                aria-label="Back"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(30,0,47,0.6)"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 6l-6 6 6 6" />
                </svg>
              </button>
            )}
            <div className="flex-1 font-semibold text-[18px] tracking-tight">
              {title}
            </div>
            <button
              onClick={onClose}
              className="no-ring w-[34px] h-[34px] rounded-full bg-[var(--color-grey-100)] border-none cursor-pointer flex items-center justify-center"
              aria-label="Close"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(30,0,47,0.6)"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto app-scroll px-6 py-5">
          {children}
        </div>
      </div>
    </>
  )
}
