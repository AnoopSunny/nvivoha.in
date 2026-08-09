'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Eye, Heart } from 'lucide-react'
import { buildGoogleFontsHref } from '@/lib/theme-fonts'
import { DEMO_HERO_IMAGES } from '@/lib/templates'

/**
 * TemplateCoverCard — Cinematic, interactive cover preview for landing-page tiles.
 *
 * Layered preview that simulates an actual template "section":
 *   1. Bottom: real wedding photo (per template, from DEMO_HERO_IMAGES)
 *   2. Middle: theme-tinted overlay so the template's mood comes through
 *   3. Top:    typographic poster (couple names, eyebrow, ornament)
 *
 * Hover behaviour:
 *   - The poster recedes / lifts so the user "sees through" to the real photo,
 *     simulating a transition to the live template section.
 *   - A "Try Free Demo" pill appears with the word "Free" emphasised.
 *
 * No editable "Your names" widget — couples now use the full demo flow.
 */
export default function TemplateCoverCard({ template }) {
  const heroPhoto = template.coverPhoto || DEMO_HERO_IMAGES[template.slugId] || DEMO_HERO_IMAGES[template.slug]
  const [bride] = useState('Anaya')
  const [groom] = useState('Vihaan')

  useEffect(() => {
    if (!template.coverFontId) return
    const href = buildGoogleFontsHref([template.coverFontId])
    if (!href) return
    const id = `vivoha-cover-font-${template.coverFontId}`
    if (document.getElementById(id)) return
    const link = document.createElement('link')
    link.id = id; link.rel = 'stylesheet'; link.href = href
    document.head.appendChild(link)
  }, [template.coverFontId])

  return (
    <motion.div
      className="relative aspect-[3/4] overflow-hidden mb-6 group cursor-pointer"
      data-testid={`template-cover-${template.slugId}`}
      style={{ background: template.coverBg }}
      whileHover={{ scale: 1.015 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {/* ===== Layer 1: real photo (the "live template" peeking through) ===== */}
      {heroPhoto && (
        <motion.img
          src={heroPhoto}
          alt=""
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover"
          initial={{ scale: 1.05, opacity: 0.55 }}
          whileHover={{ scale: 1.12, opacity: 0.95 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        />
      )}

      {/* ===== Layer 2: theme-tinted veil ===== */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ background: template.coverBg }}
        initial={{ opacity: 0.78 }}
        whileHover={{ opacity: 0.35 }}
        transition={{ duration: 0.6 }}
      />
      {/* Bottom darkening for text legibility */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, transparent 0%, rgba(15,12,8,0.65) 100%)',
        }} />

      {/* Top ornament — fades slightly on hover so the photo dominates */}
      <motion.div initial={{ opacity: 1 }} whileHover={{ opacity: 0.55 }} transition={{ duration: 0.5 }}>
        <Ornament style={template.ornament} accent={template.coverAccent} />
      </motion.div>

      {/* ===== Layer 3: typographic poster ===== */}
      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 z-10"
        initial={{ y: 0, opacity: 1 }}
        whileHover={{ y: -8, opacity: 0.92 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      >
        <div
          className="text-[9px] tracking-[0.45em] uppercase mb-3"
          style={{
            color: template.coverEyebrow || template.coverAccent,
            textShadow: heroPhoto ? '0 1px 6px rgba(0,0,0,0.5)' : 'none',
          }}
        >
          {template.coverEyebrow_text || template.coverEyebrow || 'We invite you'}
        </div>
        <div
          className="leading-none"
          style={{
            fontFamily: template.coverFontStack,
            color: template.coverInk,
            fontSize: 'clamp(1.7rem, 5.5vw, 2.7rem)',
            fontStyle: template.coverItalic ? 'italic' : 'normal',
            wordBreak: 'break-word',
            maxWidth: '95%',
            textShadow: heroPhoto ? '0 2px 14px rgba(0,0,0,0.55)' : 'none',
          }}
        >
          {bride}
        </div>
        <div className="my-2 italic text-base" style={{ color: template.coverAccent, fontFamily: template.coverFontStack }}>&amp;</div>
        <div
          className="leading-none"
          style={{
            fontFamily: template.coverFontStack,
            color: template.coverInk,
            fontSize: 'clamp(1.7rem, 5.5vw, 2.7rem)',
            fontStyle: template.coverItalic ? 'italic' : 'normal',
            wordBreak: 'break-word',
            maxWidth: '95%',
            textShadow: heroPhoto ? '0 2px 14px rgba(0,0,0,0.55)' : 'none',
          }}
        >
          {groom}
        </div>
        <div className="mt-5 flex items-center gap-3">
          <div className="h-px w-7" style={{ background: template.coverAccent }} />
          <span className="text-[10px] tracking-[0.35em] uppercase" style={{ color: template.coverAccent, textShadow: heroPhoto ? '0 1px 6px rgba(0,0,0,0.55)' : 'none' }}>
            Save the date · 2026
          </span>
          <div className="h-px w-7" style={{ background: template.coverAccent }} />
        </div>
      </motion.div>

      {/* ===== Hover CTA: "Try Free Demo" pill (slides up from bottom) ===== */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 z-20 flex justify-center pb-5 pointer-events-none"
        initial={{ y: 48, opacity: 0 }}
        whileHover={{ y: 0, opacity: 1 }}
        animate={{ y: 48, opacity: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* group-hover variant via Tailwind for non-Framer fallback */}
      </motion.div>
      <div
        className="absolute bottom-0 left-0 right-0 z-20 flex justify-center pb-5 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 pointer-events-none"
        data-testid={`template-hover-cta-${template.slugId}`}
      >
        <div className="bg-[#FDFBF7] text-[#1F1A14] px-4 py-2.5 shadow-2xl flex items-center gap-2 border border-[#C9B896]">
          <Sparkles size={12} className="text-[#8B7355]" />
          <span className="text-[10px] tracking-[0.3em] uppercase">Try</span>
          <span className="text-[11px] tracking-[0.18em] uppercase font-bold text-[#0F5132]">Free</span>
          <span className="text-[10px] tracking-[0.3em] uppercase">Demo</span>
          <Heart size={11} className="text-[#B8456C] ml-0.5" />
        </div>
      </div>

      {/* Live demo badge (top-left, only when a real preview is wired) */}
      {template.liveSlug && (
        <div className="absolute top-3 left-3 z-20 bg-[#FDFBF7] text-[#3A3226] text-[9px] tracking-[0.3em] uppercase px-2.5 py-1 flex items-center gap-1">
          <Eye size={10} /> Live
        </div>
      )}

      {/* Subtle "Free demo · No signup" corner ribbon (top-right) — encourages click on idle */}
      <div className="absolute top-3 right-3 z-20 bg-[#0F5132]/95 text-[#FDFBF7] text-[9px] tracking-[0.3em] uppercase px-2 py-1 shadow-md flex items-center gap-1">
        <Sparkles size={10} /> Free demo
      </div>
    </motion.div>
  )
}

function Ornament({ style, accent }) {
  if (style === 'arch') {
    return (
      <svg className="absolute inset-x-0 top-0 w-full" viewBox="0 0 200 60" fill="none" preserveAspectRatio="none" aria-hidden style={{ height: 60 }}>
        <path d="M0 60 Q100 -10 200 60" stroke={accent} strokeWidth="1.5" fill="none" />
        <path d="M0 55 Q100 -2 200 55" stroke={accent} strokeWidth="0.5" fill="none" opacity="0.6" />
      </svg>
    )
  }
  if (style === 'eight-star') {
    return (
      <svg className="absolute top-4 left-1/2 -translate-x-1/2" width="32" height="32" viewBox="0 0 32 32" aria-hidden>
        <g stroke={accent} strokeWidth="1" fill="none">
          <rect x="6" y="6" width="20" height="20" transform="rotate(45 16 16)" />
          <rect x="6" y="6" width="20" height="20" />
        </g>
      </svg>
    )
  }
  if (style === 'wreath') {
    return (
      <svg className="absolute top-4 left-1/2 -translate-x-1/2" width="48" height="20" viewBox="0 0 48 20" aria-hidden>
        <g stroke={accent} strokeWidth="0.8" fill="none">
          <path d="M2 10 Q12 0 24 10 Q36 20 46 10" />
          <circle cx="24" cy="10" r="2" fill={accent} stroke="none" />
        </g>
      </svg>
    )
  }
  if (style === 'cross') {
    return (
      <svg className="absolute top-5 left-1/2 -translate-x-1/2" width="14" height="22" viewBox="0 0 14 22" aria-hidden>
        <g stroke={accent} strokeWidth="1.5" fill={accent}>
          <rect x="5" y="0" width="4" height="22" />
          <rect x="0" y="6" width="14" height="4" />
        </g>
      </svg>
    )
  }
  if (style === 'kalasham') {
    return (
      <svg className="absolute top-3 left-1/2 -translate-x-1/2" width="22" height="30" viewBox="0 0 22 30" aria-hidden>
        <g stroke={accent} strokeWidth="0.8" fill="none">
          <path d="M11 2 L13 7 L11 10 L9 7 Z" fill={accent} />
          <ellipse cx="11" cy="20" rx="9" ry="6" />
          <path d="M11 14 L11 10" />
        </g>
      </svg>
    )
  }
  return (
    <svg className="absolute inset-x-6 top-4 w-[calc(100%-3rem)]" height="6" viewBox="0 0 200 6" preserveAspectRatio="none" aria-hidden>
      <line x1="0" y1="1" x2="200" y2="1" stroke={accent} strokeWidth="0.5" />
      <line x1="0" y1="5" x2="200" y2="5" stroke={accent} strokeWidth="0.5" />
    </svg>
  )
}
