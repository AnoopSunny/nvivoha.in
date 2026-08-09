'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

/**
 * PreviewBadge — Subtle floating badge shown ONLY on preview-mode pages.
 * Non-interactive (pointer-events:none) so it never blocks underlying UI.
 * Pair with <NoIndexMeta /> to fully protect preview URLs from search engines.
 */
export function PreviewBadge({ label = 'Preview Experience · Vivoha.in' }) {
  return (
    <motion.div
      initial={{ y: 14, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.6, duration: 0.5 }}
      className="fixed bottom-5 right-5 z-[90] bg-[#3A3226]/95 backdrop-blur-md border border-[#C9B896]/50 text-[#FDFBF7] px-4 py-2 shadow-2xl flex items-center gap-2 select-none"
      data-testid="preview-badge"
      style={{ pointerEvents: 'none' }}
    >
      <Sparkles size={11} className="text-[#C9B896]" />
      <span className="text-[10px] tracking-[0.28em] uppercase">{label}</span>
    </motion.div>
  )
}

/**
 * NoIndexMeta — Injects <meta name="robots" content="noindex,nofollow,noarchive,nosnippet">
 * on the fly for client-rendered preview/status routes.
 */
export function NoIndexMeta() {
  useEffect(() => {
    const tag = document.createElement('meta')
    tag.name = 'robots'
    tag.content = 'noindex,nofollow,noarchive,nosnippet'
    document.head.appendChild(tag)
    return () => { try { document.head.removeChild(tag) } catch {} }
  }, [])
  return null
}
