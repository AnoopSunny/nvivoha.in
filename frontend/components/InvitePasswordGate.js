'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Lock, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const THEMES = {
  'Moonveil':       { bg: '#FDFBF7', surface: '#F5EFE4', ink: '#3A3226', accent: '#8B7355', border: '#C9B896' },
  'Royal Heritage': { bg: '#FFF8DC', surface: '#F5E9C4', ink: '#3D0000', accent: '#8B0000', border: '#D4AF37' },
  'Eternal Edit':   { bg: '#0A0A0A', surface: '#141414', ink: '#F5F5F5', accent: '#D4B074', border: '#3A3A3A' },
  'Crimson Lotus':  { bg: '#FDF5F7', surface: '#F5E6E8', ink: '#3A2424', accent: '#B8456C', border: '#D4A0AC' },
  'Sapphire Saga':  { bg: '#0A1628', surface: '#152340', ink: '#E8E4D8', accent: '#C0C0C0', border: '#3A4868' },
  'Sanctum Veil':   { bg: '#FAF8F4', surface: '#EDE8DC', ink: '#2B3A52', accent: '#C9A961', border: '#D4C9A8' },
  'Marigold Bloom': { bg: '#FFF8E7', surface: '#FFEBC5', ink: '#2D5016', accent: '#F2A93B', border: '#F2C977' },
  'Pearl & Velvet': { bg: '#1F3A2E', surface: '#2A4D3E', ink: '#F4E4BC', accent: '#D4AF37', border: '#5A7868' },
  'Banyan & Brass': { bg: '#FBF4E6', surface: '#F0E4C9', ink: '#3D1414', accent: '#B8860B', border: '#C2A059' },
  'Pichwai Bloom':  { bg: '#1E3A5F', surface: '#2A4A75', ink: '#FBF6E9', accent: '#E0B649', border: '#5A78A0' },
  'Albion Vow':     { bg: '#EEDDD8', surface: '#E0CFC9', ink: '#4A3C36', accent: '#B59070', border: '#C2A89D' },
  'Jannah Vow':     { bg: '#0F5132', surface: '#1A6F47', ink: '#F5EFE3', accent: '#D4AF37', border: '#8FB89E' },
}

export default function InvitePasswordGate({ slug, brideName, groomName, prompt, template }) {
  const theme = THEMES[template] || THEMES['Moonveil']
  const [pw, setPw] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/invite/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, password: pw }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Incorrect password'); setLoading(false); return }
      // Cookie set by API — just reload to render the wedding
      window.location.reload()
    } catch (e) { setError('Could not verify. Try again.'); setLoading(false) }
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center px-6 py-16"
      style={{ background: `linear-gradient(180deg, ${theme.bg} 0%, ${theme.surface} 100%)`, color: theme.ink }}
      data-testid="invite-password-gate"
    >
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md text-center"
      >
        <div
          className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-8"
          style={{ background: theme.surface, border: `1px solid ${theme.border}` }}
        >
          <Lock size={22} style={{ color: theme.accent }} />
        </div>
        <div className="tracking-[0.4em] text-[10px] uppercase mb-4" style={{ color: theme.accent }}>
          A Private Invitation
        </div>
        <h1 className="font-serif font-light text-4xl md:text-5xl mb-3" style={{ color: theme.ink }}>
          {brideName} <em className="italic" style={{ color: theme.accent }}>&amp;</em> {groomName}
        </h1>
        <p className="mb-10 italic font-serif text-base leading-relaxed" style={{ color: theme.ink, opacity: 0.75 }}>
          {prompt || 'This invitation is private. Please enter the password shared with you.'}
        </p>

        <form onSubmit={submit} className="space-y-5" data-testid="invite-gate-form">
          <Input
            type="password"
            value={pw}
            onChange={e => setPw(e.target.value)}
            placeholder="Enter password"
            data-testid="invite-gate-password-input"
            autoFocus
            required
            className="rounded-none border focus-visible:ring-0 py-6 text-center tracking-[0.2em]"
            style={{ borderColor: theme.border, background: 'transparent', color: theme.ink }}
          />
          {error && (
            <div className="flex items-center justify-center gap-2 text-sm" style={{ color: '#b91c1c' }} data-testid="invite-gate-error">
              <AlertCircle size={14} /> {error}
            </div>
          )}
          <Button
            type="submit"
            disabled={loading || !pw}
            data-testid="invite-gate-submit"
            className="w-full rounded-none py-6 tracking-widest text-[11px] uppercase border-0"
            style={{ background: theme.ink, color: theme.bg }}
          >
            {loading ? <><Loader2 className="animate-spin mr-2" size={14} /> Opening…</> : 'Open Invitation'}
          </Button>
        </form>

        <p className="text-[10px] tracking-[0.3em] uppercase mt-10" style={{ color: theme.accent, opacity: 0.7 }}>
          Vivoha · Crafted with Love
        </p>
      </motion.div>
    </main>
  )
}
