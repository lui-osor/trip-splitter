import type { ReactNode } from 'react'

/**
 * Responsive phone-frame wrapper.
 *
 * - On narrow viewports (< 480px): fills the screen, no frame (native mobile feel).
 * - On wider viewports: centers a 414 × 872 rounded phone frame on the tinted page.
 *
 * All app content lives inside this frame so the design stays consistent
 * with the prototype's mobile-first layout on desktop.
 */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center sm:p-6">
      <div
        className="
          relative flex flex-col overflow-hidden bg-[var(--color-sand)]
          w-full h-screen sm:h-[872px] sm:w-[414px]
          sm:rounded-[44px]
          sm:shadow-[0_24px_60px_rgba(30,0,47,0.24),0_2px_8px_rgba(0,0,0,0.06)]
        "
      >
        {children}
      </div>
    </div>
  )
}
