'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Clock, Calendar, Check, ChevronLeft, ChevronRight, X, Gift, Instagram } from 'lucide-react'
import { toast } from 'sonner'

// ===== PALETTE =====
// emerald  #0F5132   deep Islamic green
// gold     #C5A572   antique Mughal gold
// ivory    #F5EFE3   warm ivory parchment
// rose     #D4A574   rose-gold accent
// teal     #1F4D4A   alternate dark
// inkgreen #0A2F1E   deepest emerald

// ===== UTILS =====
function useCountdown(target) {
  const [now, setNow] = useState(0)
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true); setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const ms = mounted ? Math.max(0, new Date(target).getTime() - now) : 0
  return {
    days: Math.floor(ms / 86400000),
    hours: Math.floor((ms % 86400000) / 3600000),
    minutes: Math.floor((ms % 3600000) / 60000),
    seconds: Math.floor((ms % 60000) / 1000),
    done: mounted && ms === 0,
  }
}
const IST = 'Asia/Kolkata'
const fmtDate = (d) => { try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: IST }) } catch { return d } }
const fmtTime = (d) => {
  try {
    const dt = new Date(d)
    if (isNaN(dt.getTime())) return ''
    return dt.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: IST })
  } catch { return '' }
}
const hasTime = (d) => {
  try {
    const dt = new Date(d)
    if (isNaN(dt.getTime())) return false
    return dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: IST }) !== '00:00'
  } catch { return false }
}
const fmtMonth = (d) => { try { return new Date(d).toLocaleDateString('en-GB', { month: 'short', timeZone: IST }).toUpperCase() } catch { return '' } }
const fmtDay = (d) => { try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', timeZone: IST }) } catch { return '' } }
const fmtDayName = (d) => { try { return new Date(d).toLocaleDateString('en-GB', { weekday: 'long', timeZone: IST }) } catch { return '' } }

// ===== SVG MOTIFS =====
const EightStar = ({ className = '' }) => (
  // Rub el Hizb — the eight-pointed Islamic star
  <svg viewBox="0 0 100 100" className={className} fill="currentColor" aria-hidden>
    <path d="M50 4 L62 30 L88 18 L76 44 L96 50 L76 56 L88 82 L62 70 L50 96 L38 70 L12 82 L24 56 L4 50 L24 44 L12 18 L38 30 Z" opacity="0.95" />
    <path d="M50 14 L60 32 L80 24 L72 44 L86 50 L72 56 L80 76 L60 68 L50 86 L40 68 L20 76 L28 56 L14 50 L28 44 L20 24 L40 32 Z" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.7" />
  </svg>
)

const MashrabiyaTile = ({ className = '' }) => (
  // Single mashrabiya / girih tile — interlocking 8-point pattern
  <svg viewBox="0 0 120 120" className={className} fill="none" stroke="currentColor" strokeWidth="0.8" aria-hidden>
    {/* outer 8-point star */}
    <path d="M60 6 L70 36 L100 26 L90 56 L114 60 L90 64 L100 94 L70 84 L60 114 L50 84 L20 94 L30 64 L6 60 L30 56 L20 26 L50 36 Z" />
    {/* inner octagon */}
    <path d="M60 36 L78 42 L84 60 L78 78 L60 84 L42 78 L36 60 L42 42 Z" />
    {/* central diamond */}
    <path d="M60 50 L70 60 L60 70 L50 60 Z" />
    {/* corner accents */}
    <circle cx="60" cy="6" r="1" fill="currentColor" />
    <circle cx="60" cy="114" r="1" fill="currentColor" />
    <circle cx="6" cy="60" r="1" fill="currentColor" />
    <circle cx="114" cy="60" r="1" fill="currentColor" />
  </svg>
)

const MosqueDome = ({ className = '', flip = false }) => (
  // Mosque silhouette: central dome flanked by minarets
  <svg viewBox="0 0 200 120" className={className} style={{ transform: flip ? 'scaleX(-1)' : 'none' }} fill="currentColor" aria-hidden>
    {/* base */}
    <rect x="10" y="100" width="180" height="20" />
    {/* main dome */}
    <path d="M70 100 Q70 50 100 38 Q130 50 130 100 Z" />
    {/* dome neck */}
    <rect x="84" y="36" width="32" height="6" />
    {/* finial */}
    <rect x="98" y="22" width="4" height="14" />
    {/* crescent on top */}
    <path d="M100 12 Q108 12 108 18 Q108 24 100 24 Q104 18 100 12 Z" />
    {/* left minaret */}
    <rect x="20" y="60" width="14" height="40" />
    <path d="M16 60 L20 60 L20 56 L34 56 L34 60 L38 60 Z" />
    <path d="M19 56 Q27 38 27 50 Q27 54 35 56 Z" />
    <circle cx="27" cy="36" r="3" />
    <rect x="26" y="32" width="2" height="6" />
    {/* right minaret */}
    <rect x="166" y="60" width="14" height="40" />
    <path d="M162 60 L166 60 L166 56 L180 56 L180 60 L184 60 Z" />
    <path d="M165 56 Q173 38 173 50 Q173 54 181 56 Z" />
    <circle cx="173" cy="36" r="3" />
    <rect x="172" y="32" width="2" height="6" />
    {/* small arches in base */}
    <path d="M50 100 Q56 88 62 100" fill="#F5EFE3" />
    <path d="M70 100 Q76 88 82 100" fill="#F5EFE3" />
    <path d="M118 100 Q124 88 130 100" fill="#F5EFE3" />
    <path d="M138 100 Q144 88 150 100" fill="#F5EFE3" />
  </svg>
)

const Crescent = ({ className = '' }) => (
  <svg viewBox="0 0 60 60" className={className} fill="currentColor" aria-hidden>
    <path d="M22 8 A22 22 0 1 0 22 52 A18 18 0 1 1 22 8 Z" />
    <path d="M44 24 L48 32 L56 32 L50 38 L52 46 L44 42 L36 46 L38 38 L32 32 L40 32 Z" />
  </svg>
)

const Arabesque = ({ className = '', flip = false }) => (
  // Flowing arabesque vine with stylized leaves
  <svg viewBox="0 0 240 60" className={className} style={{ transform: flip ? 'scaleX(-1)' : 'none' }} fill="none" stroke="currentColor" strokeWidth="1" aria-hidden>
    <path d="M0 30 Q30 8 60 30 Q90 52 120 30 Q150 8 180 30 Q210 52 240 30" />
    {/* leaves alternating */}
    {[[30, 14], [60, 30], [90, 46], [120, 30], [150, 14], [180, 30], [210, 46]].map(([cx, cy], i) => {
      const up = i % 2 === 0
      return (
        <g key={i}>
          <path d={`M${cx} ${cy} Q${cx - 8} ${up ? cy - 12 : cy + 12} ${cx} ${up ? cy - 16 : cy + 16} Q${cx + 8} ${up ? cy - 12 : cy + 12} ${cx} ${cy}`} fill="currentColor" opacity="0.4" />
          <circle cx={cx} cy={up ? cy - 8 : cy + 8} r="1.2" fill="currentColor" />
        </g>
      )
    })}
    {/* central rosette */}
    <circle cx="120" cy="30" r="4" fill="currentColor" />
    <circle cx="120" cy="30" r="2" fill="#F5EFE3" />
  </svg>
)

const Mehrab = ({ className = '', children, rounded = true }) => (
  // Mehrab arch frame — pointed Islamic arch shape via clip-path + border
  <div className={className} style={{ position: 'relative' }}>
    <div style={{
      width: '100%', height: '100%',
      clipPath: 'polygon(0 100%, 0 30%, 50% 0, 100% 30%, 100% 100%)',
    }}>
      {children}
    </div>
  </div>
)

const Tulip = ({ className = '' }) => (
  // Ottoman tulip motif
  <svg viewBox="0 0 40 60" className={className} fill="currentColor" aria-hidden>
    <path d="M20 4 Q10 16 12 30 Q14 42 20 44 Q26 42 28 30 Q30 16 20 4 Z" />
    <path d="M20 4 Q22 18 20 28 Q18 18 20 4" fill="#F5EFE3" opacity="0.5" />
    <path d="M20 44 L20 56" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <path d="M20 50 Q14 52 12 56" stroke="currentColor" strokeWidth="1" fill="none" />
    <path d="M20 50 Q26 52 28 56" stroke="currentColor" strokeWidth="1" fill="none" />
  </svg>
)

const Calligraphy = ({ children, className = '', size = 'lg' }) => (
  <div className={className} style={{
    fontFamily: '"Amiri", "Scheherazade New", "Traditional Arabic", serif',
    fontSize: size === 'xl' ? 'clamp(1.4rem, 6vw, 2.5rem)' : size === 'lg' ? 'clamp(1.1rem, 4.5vw, 1.75rem)' : 'clamp(0.85rem, 3.5vw, 1.2rem)',
    direction: 'rtl',
    lineHeight: 1.3,
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
  }}>{children}</div>
)

// ===== GOOGLE FONTS LOADER =====
function FontLoader() {
  useEffect(() => {
    if (document.getElementById('jannah-fonts')) return
    const link = document.createElement('link')
    link.id = 'jannah-fonts'
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&display=swap'
    document.head.appendChild(link)
  }, [])
  return null
}

// ===== TEMPLATE =====
export default function JannahVowTemplate({ wedding }) {
  const [lightbox, setLightbox] = useState(null)
  const cd = useCountdown(wedding.weddingDate)
  const gallery = wedding.gallery || []
  const events = wedding.events || []

  return (
    <main
      className="min-h-screen bg-[#F5EFE3] text-[#0A2F1E] selection:bg-[#C5A572] selection:text-[#0A2F1E]"
      style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}
    >
      <FontLoader />

      {/* ===== HERO ===== */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {wedding.heroImage?.url ? (
          <>
            <motion.img initial={{ scale: 1.12 }} animate={{ scale: 1 }} transition={{ duration: 2.6, ease: 'easeOut' }} src={wedding.heroImage.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: 'rgba(15, 81, 50, 0.78)' }} />
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 0%, rgba(10, 47, 30, 0.4) 70%, rgba(10, 47, 30, 0.8) 100%)' }} />
          </>
        ) : (
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at top, #1F4D4A 0%, #0F5132 50%, #0A2F1E 100%)' }} />
        )}

        {/* Mashrabiya lattice pattern (very subtle) — top corners */}
        <MashrabiyaTile className="absolute top-0 left-0 w-48 md:w-64 text-[#C5A572]/15 -translate-x-1/4 -translate-y-1/4" />
        <MashrabiyaTile className="absolute top-0 right-0 w-48 md:w-64 text-[#C5A572]/15 translate-x-1/4 -translate-y-1/4" />

        {/* Mosque silhouettes at bottom */}
        <MosqueDome className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[420px] md:w-[600px] text-[#C5A572]/25" />

        {/* Gold double border frame */}
        <div className="absolute inset-6 md:inset-10 border border-[#C5A572]/60 pointer-events-none" />
        <div className="absolute inset-10 md:inset-14 border border-[#C5A572]/25 pointer-events-none" />

        {/* Corner stars */}
        <EightStar className="absolute top-6 left-6 md:top-10 md:left-10 w-7 md:w-10 text-[#C5A572]" />
        <EightStar className="absolute top-6 right-6 md:top-10 md:right-10 w-7 md:w-10 text-[#C5A572]" />
        <EightStar className="absolute bottom-6 left-6 md:bottom-10 md:left-10 w-7 md:w-10 text-[#C5A572]" />
        <EightStar className="absolute bottom-6 right-6 md:bottom-10 md:right-10 w-7 md:w-10 text-[#C5A572]" />

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.4, delay: 0.4 }} className="relative z-10 text-center px-6 sm:px-10 max-w-4xl w-full">
          {/* Bismillah */}
          <Calligraphy size="xl" className="text-[#C5A572] mb-3 max-w-full overflow-hidden">
            بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
          </Calligraphy>
          <div className="text-[#F5EFE3]/55 tracking-[0.2em] sm:tracking-[0.4em] text-[9px] sm:text-[10px] italic mb-2 px-2">
            In the name of Allah, the Most Gracious, the Most Merciful
          </div>

          <div className="my-6 flex items-center justify-center gap-4">
            <div className="h-px w-12 md:w-20 bg-[#C5A572]" />
            <EightStar className="w-5 md:w-7 text-[#C5A572]" />
            <div className="h-px w-12 md:w-20 bg-[#C5A572]" />
          </div>

          <div className="text-[#C5A572] tracking-[0.25em] sm:tracking-[0.5em] text-[10px] sm:text-xs md:text-sm uppercase mb-6 px-2">
            With the blessings of Allah ﷻ
          </div>

          <h1 className="text-[#F5EFE3] font-light leading-[0.95]">
            <span className="block font-serif italic text-4xl sm:text-5xl md:text-7xl lg:text-8xl break-words">{wedding.brideName}</span>
            <span className="inline-flex items-center gap-3 sm:gap-5 my-5 md:my-6">
              <Arabesque className="w-12 sm:w-20 md:w-28 text-[#C5A572]" />
              <span className="font-serif italic text-[#C5A572] text-2xl sm:text-3xl md:text-4xl">&amp;</span>
              <Arabesque flip className="w-12 sm:w-20 md:w-28 text-[#C5A572]" />
            </span>
            <span className="block font-serif italic text-4xl sm:text-5xl md:text-7xl lg:text-8xl break-words">{wedding.groomName}</span>
          </h1>

          {wedding.tagline && (
            <p className="mt-8 text-[#F5EFE3]/90 italic text-base sm:text-lg md:text-xl max-w-2xl mx-auto px-2">&ldquo;{wedding.tagline}&rdquo;</p>
          )}

          {/* Date strip with mehrab arch */}
          <div className="mt-10 inline-flex flex-col items-center">
            <div className="inline-flex items-center gap-4 border-2 border-[#C5A572] px-8 md:px-10 py-4 bg-[#0A2F1E]/40 backdrop-blur-sm">
              <Calendar size={14} className="text-[#C5A572]" />
              <div className="text-center">
                <div className="text-[#C5A572] tracking-[0.4em] text-[10px] uppercase">{fmtDayName(wedding.weddingDate)}</div>
                <div className="text-[#F5EFE3] font-light italic text-2xl md:text-3xl mt-1">{fmtDate(wedding.weddingDate)}</div>
                {hasTime(wedding.weddingDate) && (
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <span className="text-[10px] tracking-[0.3em] uppercase text-[#C5A572]">Nikah at</span>
                    <span className="text-[#F5EFE3] italic">{fmtTime(wedding.weddingDate)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }} className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[#C5A572] text-[10px] tracking-[0.5em] uppercase">
          ↓ Scroll
        </motion.div>
      </section>

      {/* ===== STAR DIVIDER ===== */}
      <SectionDivider />

      {/* ===== COUNTDOWN ===== */}
      {!cd.done && (
        <section className="relative py-20 md:py-28 px-4 bg-[#F5EFE3] overflow-hidden">
          <MashrabiyaTile className="absolute -top-10 -left-10 w-40 text-[#0F5132]/8" />
          <MashrabiyaTile className="absolute -bottom-10 -right-10 w-40 text-[#0F5132]/8" />
          <div className="container mx-auto max-w-4xl text-center relative">
            <SectionHeader eyebrow="Until our Nikah" title="Counting blessings" arabicLine="إنَّ مَعَ ٱلْعُسْرِ يُسْرًا" />
            <div className="grid grid-cols-4 gap-3 md:gap-6 mt-14">
              {[
                { v: cd.days, l: 'Days' }, { v: cd.hours, l: 'Hours' },
                { v: cd.minutes, l: 'Minutes' }, { v: cd.seconds, l: 'Seconds' },
              ].map((u) => (
                <div key={u.l} className="relative bg-[#0F5132] text-[#F5EFE3] aspect-square flex flex-col items-center justify-center">
                  <EightStar className="absolute top-2 left-2 w-4 md:w-5 text-[#C5A572]" />
                  <EightStar className="absolute top-2 right-2 w-4 md:w-5 text-[#C5A572]" />
                  <EightStar className="absolute bottom-2 left-2 w-4 md:w-5 text-[#C5A572]" />
                  <EightStar className="absolute bottom-2 right-2 w-4 md:w-5 text-[#C5A572]" />
                  <div className="font-serif italic text-5xl md:text-7xl font-light text-[#C5A572]">{String(u.v).padStart(2, '0')}</div>
                  <div className="text-[9px] md:text-[10px] tracking-[0.4em] uppercase mt-2 text-[#F5EFE3]/80">{u.l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== STORY ===== */}
      {wedding.story && (
        <section className="relative py-20 md:py-32 px-4 bg-[#F5EFE3] overflow-hidden">
          <Arabesque className="absolute top-10 left-1/2 -translate-x-1/2 w-72 md:w-96 text-[#C5A572]/30" />
          <div className="container mx-auto max-w-3xl relative">
            <div className="text-center">
              <EightStar className="w-14 h-14 text-[#C5A572] mx-auto mb-6" />
              <SectionHeader eyebrow="Our Story" title="Two souls, one ummah" arabicLine="وَمِنْ آيَاتِهِ أَنْ خَلَقَ لَكُم" />
            </div>

            <div className="relative mt-14 bg-white border-2 border-[#C5A572] p-8 md:p-14" style={{ boxShadow: '0 24px 60px -30px rgba(15, 81, 50, 0.4)' }}>
              {/* corner stars */}
              <EightStar className="absolute -top-4 -left-4 w-8 text-[#C5A572] bg-[#F5EFE3] p-1" />
              <EightStar className="absolute -top-4 -right-4 w-8 text-[#C5A572] bg-[#F5EFE3] p-1" />
              <EightStar className="absolute -bottom-4 -left-4 w-8 text-[#C5A572] bg-[#F5EFE3] p-1" />
              <EightStar className="absolute -bottom-4 -right-4 w-8 text-[#C5A572] bg-[#F5EFE3] p-1" />

              <Calligraphy size="md" className="text-[#0F5132] text-center mb-2">
                وَمِنْ آيَاتِهِ
              </Calligraphy>
              <p className="text-center text-[#0F5132]/70 italic text-sm mb-8">
                "And among His signs is this, that He created for you mates from among yourselves…" — Qur'an 30:21
              </p>

              <div className="text-base md:text-lg text-[#0A2F1E]/90 leading-[1.85] whitespace-pre-line italic text-left">
                <span className="float-left text-7xl leading-none mr-3 mt-1 text-[#C5A572] not-italic font-light">
                  {wedding.story.charAt(0)}
                </span>
                {wedding.story.slice(1)}
              </div>

              <div className="mt-10 flex items-center justify-center gap-3">
                <div className="h-px w-12 bg-[#C5A572]/50" />
                <EightStar className="w-5 text-[#C5A572]" />
                <div className="h-px w-12 bg-[#C5A572]/50" />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ===== GALLERY (mehrab arches) ===== */}
      {gallery.length > 0 && (
        <section className="relative py-20 md:py-32 px-4 bg-[#0F5132] text-[#F5EFE3] overflow-hidden">
          <MashrabiyaTile className="absolute top-10 left-10 w-32 text-[#C5A572]/20" />
          <MashrabiyaTile className="absolute bottom-10 right-10 w-32 text-[#C5A572]/20" />
          <div className="container mx-auto relative">
            <SectionHeader eyebrow="Cherished Moments" title="Our journey together" tone="dark" arabicLine="ٱلْحَمْدُ لِلَّٰهِ" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 md:gap-7 mt-14">
              {gallery.map((g, i) => (
                <motion.button
                  key={g.publicId || i}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: (i % 8) * 0.04 }}
                  onClick={() => setLightbox(i)}
                  className={`relative overflow-hidden group ${i % 5 === 0 ? 'md:row-span-2 aspect-[4/5] md:aspect-[3/4]' : 'aspect-[4/5]'}`}
                  style={{
                    clipPath: 'polygon(0 100%, 0 25%, 50% 0%, 100% 25%, 100% 100%)',
                    background: '#C5A572',
                    padding: '3px',
                  }}
                >
                  <div style={{
                    width: '100%', height: '100%',
                    clipPath: 'polygon(0 100%, 0 25%, 50% 0%, 100% 25%, 100% 100%)',
                  }}>
                    <img src={g.url} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
          <AnimatePresence>
            {lightbox !== null && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setLightbox(null)} className="fixed inset-0 z-50 bg-[#0A2F1E]/97 flex items-center justify-center p-4">
                <button className="absolute top-6 right-6 text-[#C5A572]" onClick={() => setLightbox(null)}><X /></button>
                <button className="absolute left-4 md:left-12 text-[#C5A572] p-2" onClick={(e) => { e.stopPropagation(); setLightbox((lightbox - 1 + gallery.length) % gallery.length) }}><ChevronLeft size={32} /></button>
                <button className="absolute right-4 md:right-12 text-[#C5A572] p-2" onClick={(e) => { e.stopPropagation(); setLightbox((lightbox + 1) % gallery.length) }}><ChevronRight size={32} /></button>
                <motion.img key={lightbox} initial={{ opacity: 0 }} animate={{ opacity: 1 }} src={gallery[lightbox].url} alt="" onClick={(e) => e.stopPropagation()} className="max-w-[90vw] max-h-[85vh] object-contain border-2 border-[#C5A572]" />
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}

      {/* ===== EVENTS ===== */}
      {events.length > 0 && (
        <section className="relative py-20 md:py-32 px-4 bg-[#F5EFE3] overflow-hidden">
          <MosqueDome className="absolute top-6 left-1/2 -translate-x-1/2 w-72 text-[#C5A572]/15" />
          <div className="container mx-auto max-w-5xl relative">
            <div className="text-center pt-8">
              <Tulip className="w-8 h-12 text-[#C5A572] mx-auto mb-4" />
              <SectionHeader eyebrow="Our Celebrations" title="Join us for the joy" arabicLine="مَبْرُوكٌ" />
            </div>
            <div className="space-y-8 mt-14">
              {events.map((ev, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 22 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className="relative bg-white border border-[#C5A572] grid md:grid-cols-[180px_1fr] overflow-hidden"
                  style={{ boxShadow: '0 8px 32px -12px rgba(15, 81, 50, 0.2)' }}
                >
                  <EightStar className="absolute -top-2 -right-2 w-6 text-[#C5A572] bg-[#F5EFE3] p-0.5" />

                  {/* Date band with mashrabiya backdrop */}
                  <div className="relative bg-[#0F5132] text-[#F5EFE3] flex flex-col items-center justify-center p-5 overflow-hidden">
                    <MashrabiyaTile className="absolute inset-0 m-auto w-full h-full text-[#C5A572]/10" />
                    <div className="relative text-center">
                      <div className="text-[10px] tracking-[0.4em] text-[#C5A572] uppercase">{fmtMonth(ev.date)}</div>
                      <div className="font-serif italic text-6xl font-light text-[#C5A572] my-1">{fmtDay(ev.date)}</div>
                      <div className="text-[10px] tracking-[0.4em] text-[#C5A572] uppercase">{new Date(ev.date).toLocaleDateString('en-GB', { year: 'numeric', timeZone: IST })}</div>
                    </div>
                  </div>

                  <div className="p-6 md:p-8">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="font-serif italic text-3xl md:text-4xl text-[#0F5132]">{ev.name}</h3>
                      <Tulip className="w-5 h-7 text-[#C5A572]" />
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-[#0F5132] mb-3">
                      {ev.startTime && <span className="flex items-center gap-2"><Clock size={14} /> {ev.startTime}{ev.endTime ? ` – ${ev.endTime}` : ''}</span>}
                      {ev.venue && <span className="flex items-center gap-2"><MapPin size={14} /> {ev.venue}</span>}
                    </div>
                    {ev.address && <p className="text-[#0A2F1E]/75 mb-3">{ev.address}</p>}
                    {ev.description && <p className="text-[#0A2F1E]/75 leading-relaxed italic mb-4">{ev.description}</p>}
                    {ev.mapsLink && (
                      <a href={ev.mapsLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs tracking-[0.3em] uppercase bg-[#0F5132] text-[#F5EFE3] px-5 py-2 hover:bg-[#C5A572] hover:text-[#0A2F1E] transition">
                        Directions <MapPin size={12} />
                      </a>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== RSVP ===== */}
      {wedding.rsvpSettings?.enabled !== false && <RSVPSection wedding={wedding} />}

      {/* ===== GIFT REGISTRY ===== */}
      {wedding.advancedSettings?.giftRegistryLink && (
        <section className="py-20 px-4 bg-[#F5EFE3] border-t border-[#C5A572]/30 text-center">
          <Gift className="w-8 h-8 text-[#C5A572] mx-auto mb-4" />
          <h2 className="font-serif italic text-3xl md:text-4xl text-[#0F5132] mb-3">Your duas are our greatest gift</h2>
          <p className="text-[#0A2F1E]/70 max-w-xl mx-auto mb-8 italic">Your presence and prayers are blessings beyond measure. Should you wish to honour us further, our registry awaits.</p>
          <a href={wedding.advancedSettings.giftRegistryLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-[#0F5132] text-[#C5A572] border-2 border-[#C5A572] px-10 py-4 text-xs tracking-[0.3em] uppercase hover:bg-[#C5A572] hover:text-[#0A2F1E] transition">
            View Registry
          </a>
        </section>
      )}

      {/* ===== FOOTER ===== */}
      <footer className="relative py-16 px-4 text-center bg-[#0A2F1E] text-[#F5EFE3] overflow-hidden">
        <MosqueDome className="absolute bottom-0 left-1/2 -translate-x-1/2 w-72 md:w-96 text-[#C5A572]/20" />
        <Crescent className="w-10 h-10 text-[#C5A572] mx-auto mb-4" />
        <Calligraphy size="md" className="text-[#C5A572] mb-3">
          بَارَكَ ٱللَّٰهُ لَكُمَا
        </Calligraphy>
        <div className="text-[#F5EFE3]/60 italic text-sm mb-4">May Allah bless you both</div>
        <div className="font-serif italic text-3xl text-[#F5EFE3] mb-2">
          {wedding.brideName} <span className="text-[#C5A572] not-italic">&amp;</span> {wedding.groomName}
        </div>
        <div className="text-xs tracking-[0.4em] text-[#C5A572] uppercase mb-6">{fmtDate(wedding.weddingDate)}</div>
        {wedding.advancedSettings?.socialMedia?.instagram && (
          <a href={wedding.advancedSettings.socialMedia.instagram} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-[#C5A572] mb-6 hover:text-[#F5EFE3]"><Instagram size={18} /></a>
        )}
        <div className="text-[10px] text-[#F5EFE3]/50 tracking-[0.3em] uppercase relative">
          Lovingly crafted · <a href="/" className="underline hover:text-[#C5A572]">Vivoha</a>
        </div>
      </footer>
    </main>
  )
}

function SectionHeader({ eyebrow, title, tone = 'light', arabicLine }) {
  const eyeColor = 'text-[#C5A572]'
  const titleColor = tone === 'dark' ? 'text-[#F5EFE3]' : 'text-[#0F5132]'
  return (
    <>
      {arabicLine && (
        <Calligraphy size="md" className={`${eyeColor} mb-3`}>{arabicLine}</Calligraphy>
      )}
      <div className={`tracking-[0.5em] text-[10px] md:text-xs uppercase mb-3 ${eyeColor}`}>· {eyebrow} ·</div>
      <h2 className={`font-serif font-light italic text-4xl md:text-6xl ${titleColor}`}>{title}</h2>
    </>
  )
}

function SectionDivider() {
  return (
    <div className="py-10 px-4 bg-[#F5EFE3] flex items-center justify-center gap-6">
      <div className="h-px bg-[#C5A572]/40 flex-1 max-w-xs" />
      <EightStar className="w-8 text-[#C5A572]" />
      <div className="h-px bg-[#C5A572]/40 flex-1 max-w-xs" />
    </div>
  )
}

function RSVPSection({ wedding }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [attending, setAttending] = useState('')
  const [guests, setGuests] = useState(1)
  const [meal, setMeal] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const mealOptions = wedding.rsvpSettings?.mealOptions || []

  async function submit(e) {
    e.preventDefault()
    if (!attending) { toast.error('Please let us know'); return }
    if (!phone.trim()) { toast.error('WhatsApp number is required'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/rsvp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weddingSlug: wedding.slug, name, email, phone, attending,
          guests: Number(guests), mealPreferences: meal ? [meal] : [], message,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setSuccess(true)
    } catch (err) { toast.error(err.message) } finally { setSubmitting(false) }
  }

  return (
    <section id="rsvp" className="relative py-20 md:py-32 px-4 bg-[#0F5132] text-[#F5EFE3] overflow-hidden">
      <MashrabiyaTile className="absolute -top-10 -left-10 w-40 text-[#C5A572]/15" />
      <MashrabiyaTile className="absolute -bottom-10 -right-10 w-40 text-[#C5A572]/15" />
      <div className="container mx-auto max-w-2xl relative">
        <div className="text-center mb-12">
          <EightStar className="w-12 text-[#C5A572] mx-auto mb-4" />
          <SectionHeader eyebrow="RSVP" title="Honour us with your reply" tone="dark" arabicLine="نِكَاحٌ مُبَارَكٌ" />
          {wedding.rsvpSettings?.deadline && (
            <p className="mt-4 text-[#C5A572] text-sm italic">Kindly reply by {fmtDate(wedding.rsvpSettings.deadline)}</p>
          )}
        </div>

        {success ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative bg-[#F5EFE3] text-[#0A2F1E] p-12 text-center border-2 border-[#C5A572]">
            <EightStar className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 text-[#C5A572] bg-[#0F5132] p-1" />
            <Calligraphy size="lg" className="text-[#0F5132] mb-3 mt-4">جَزَاكَ ٱللَّٰهُ خَيْرًا</Calligraphy>
            <p className="text-[#0F5132]/80 italic mb-2">May Allah reward you with goodness</p>
            <h3 className="font-serif italic text-3xl text-[#0F5132] mt-4 mb-3">Thank you</h3>
            <p className="text-[#0A2F1E]/85">Your reply has been received with joy. We can't wait to celebrate with you, Insha'Allah.</p>
          </motion.div>
        ) : (
          <form onSubmit={submit} className="relative bg-[#F5EFE3] text-[#0A2F1E] p-8 md:p-12 space-y-6 border-2 border-[#C5A572]">
            <EightStar className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 text-[#C5A572] bg-[#0F5132] p-1" />
            <div className="text-center mt-2 mb-2">
              <Calligraphy size="md" className="text-[#0F5132]">جَوَابٌ كَرِيمٌ</Calligraphy>
              <p className="text-[#0F5132]/65 italic text-xs">a gracious reply</p>
            </div>
            <div>
              <label className="text-[10px] tracking-[0.4em] uppercase text-[#C5A572] block mb-2">Your full name *</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-transparent border-b-2 border-[#C5A572]/50 py-3 focus:outline-none focus:border-[#0F5132] text-[#0A2F1E] italic" />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] tracking-[0.4em] uppercase text-[#C5A572] block mb-2">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-transparent border-b-2 border-[#C5A572]/50 py-3 focus:outline-none focus:border-[#0F5132] text-[#0A2F1E] italic" />
              </div>
              <div>
                <label className="text-[10px] tracking-[0.4em] uppercase text-[#C5A572] block mb-2">WhatsApp Number *</label>
                <input required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-transparent border-b-2 border-[#C5A572]/50 py-3 focus:outline-none focus:border-[#0F5132] text-[#0A2F1E] italic" />
              </div>
            </div>
            <div>
              <label className="text-[10px] tracking-[0.4em] uppercase text-[#C5A572] block mb-3">Will you join us, Insha'Allah? *</label>
              <div className="grid grid-cols-3 gap-3">
                {[{ v: 'yes', l: "Insha'Allah" }, { v: 'maybe', l: 'Perhaps' }, { v: 'no', l: 'With regret' }].map((o) => (
                  <button type="button" key={o.v} onClick={() => setAttending(o.v)}
                    className={`py-3 sm:py-4 px-1 text-[10px] leading-tight tracking-[0.18em] sm:tracking-[0.3em] uppercase border-2 transition break-words ${attending === o.v ? 'bg-[#0F5132] text-[#C5A572] border-[#0F5132]' : 'border-[#C5A572]/40 hover:border-[#0F5132] text-[#0A2F1E]'}`}>
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
            {attending === 'yes' && (
              <>
                <div>
                  <label className="text-[10px] tracking-[0.4em] uppercase text-[#C5A572] block mb-2">Guests (including yourself)</label>
                  <input type="number" min={1} max={10} value={guests} onChange={(e) => setGuests(e.target.value)} className="w-full bg-transparent border-b-2 border-[#C5A572]/50 py-3 focus:outline-none focus:border-[#0F5132] text-[#0A2F1E] italic" />
                </div>
                {mealOptions.length > 0 && (
                  <div>
                    <label className="text-[10px] tracking-[0.4em] uppercase text-[#C5A572] block mb-3">Meal preference (all halal)</label>
                    <div className="flex flex-wrap gap-2">
                      {mealOptions.map((m) => (
                        <button type="button" key={m} onClick={() => setMeal(m)}
                          className={`px-5 py-2 text-[10px] tracking-[0.3em] uppercase border-2 transition ${meal === m ? 'bg-[#C5A572] text-[#0A2F1E] border-[#C5A572]' : 'border-[#C5A572]/40 hover:border-[#0F5132] text-[#0A2F1E]'}`}>
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
            <div>
              <label className="text-[10px] tracking-[0.4em] uppercase text-[#C5A572] block mb-2">A dua for the couple</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} className="w-full bg-transparent border-b-2 border-[#C5A572]/50 py-3 focus:outline-none focus:border-[#0F5132] resize-none text-[#0A2F1E] italic" />
            </div>
            <button type="submit" disabled={submitting} className="w-full bg-[#0F5132] hover:bg-[#C5A572] hover:text-[#0A2F1E] text-[#C5A572] py-5 tracking-[0.5em] text-xs uppercase transition">
              {submitting ? 'Sending…' : "Send · Insha'Allah"}
            </button>
          </form>
        )}
      </div>
    </section>
  )
}
