'use client'

import Link from 'next/link'

/**
 * Shared shell for the static legal pages (terms, privacy, refund policy).
 * Matches the warm landing palette and keeps content readable.
 */
export default function LegalShell({ eyebrow, title, lastUpdated, children }) {
  return (
    <main className="min-h-screen bg-[#FDFBF7] text-[#3A3226]">
      <nav className="border-b border-[#C9B896]/30 sticky top-0 z-50 bg-[#FDFBF7]/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-5 flex items-center justify-between">
          <Link href="/" className="font-serif text-2xl text-[#3A3226]">
            Vivoha<span className="text-[#8B7355]">·</span>
          </Link>
          <Link href="/" className="text-xs tracking-widest uppercase text-[#8B7355] hover:text-[#3A3226]">
            ← Back to home
          </Link>
        </div>
      </nav>
      <article className="container mx-auto px-4 py-16 md:py-24 max-w-3xl">
        <div className="text-[#8B7355] tracking-[0.4em] text-xs uppercase mb-4">{eyebrow}</div>
        <h1 className="font-serif font-light text-4xl md:text-6xl text-[#3A3226] leading-tight">{title}</h1>
        {lastUpdated && (
          <div className="text-sm text-[#8B7355] italic mt-4">Last updated · {lastUpdated}</div>
        )}
        <div className="prose-vivoha mt-12 space-y-6 text-[#3A3226]/85 leading-relaxed">
          {children}
        </div>
      </article>
      <footer className="border-t border-[#C9B896]/30 mt-16 py-10">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-[#3A3226]/70">
          <div className="font-serif text-xl text-[#3A3226]">Vivoha<span className="text-[#8B7355]">·</span></div>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <Link href="/terms" className="hover:text-[#8B7355]">Terms</Link>
            <Link href="/privacy" className="hover:text-[#8B7355]">Privacy</Link>
            <Link href="/refund-policy" className="hover:text-[#8B7355]">Refund Policy</Link>
            <Link href="/" className="hover:text-[#8B7355]">Home</Link>
          </div>
          <div className="text-xs text-[#8B7355] tracking-wider">© 2026 Vivoha</div>
        </div>
      </footer>
    </main>
  )
}

export function H2({ children }) {
  return <h2 className="font-serif text-2xl md:text-3xl text-[#3A3226] mt-12 mb-4 leading-tight">{children}</h2>
}
export function P({ children }) {
  return <p className="text-[#3A3226]/85 leading-relaxed">{children}</p>
}
export function UL({ children }) {
  return <ul className="list-disc pl-6 space-y-2 text-[#3A3226]/85">{children}</ul>
}
