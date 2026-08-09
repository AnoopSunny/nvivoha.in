'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Clock, Calendar, Check, ChevronLeft, ChevronRight, X, Gift, Instagram } from 'lucide-react'
import { toast } from 'sonner'

// ===== PALETTE =====
// cream    #F5EFE0   antique parchment
// sage     #8B9B7E   refined botanical green
// rose     #D4B5B0   dusty vintage rose
// charcoal #3D4146   soft ink
// brass    #C9A961   champagne brass
// blush    #EEDDD8   pale linen
// ivory    #FAF7EE   pure ivory

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
const RoseStem = ({ className = '', flip = false }) => (
  <svg viewBox="0 0 140 200" className={className} style={{ transform: flip ? 'scaleX(-1)' : 'none' }} fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" aria-hidden>
    {/* main stem */}
    <path d="M70 200 Q66 150 72 110 Q78 70 70 30" />
    {/* leaves */}
    <path d="M70 170 Q40 158 38 142 Q60 150 70 170 Z" fill="currentColor" opacity="0.35" />
    <path d="M70 140 Q100 130 102 114 Q80 120 70 140 Z" fill="currentColor" opacity="0.35" />
    <path d="M70 100 Q44 94 42 78 Q62 84 70 100 Z" fill="currentColor" opacity="0.35" />
    {/* rose head */}
    <g transform="translate(70 24)">
      <circle r="22" fill="currentColor" opacity="0.18" />
      <path d="M-14 0 Q0 -18 14 0 Q12 14 0 18 Q-12 14 -14 0 Z" fill="currentColor" opacity="0.55" />
      <path d="M-9 -2 Q0 -10 9 -2 Q8 8 0 10 Q-8 8 -9 -2 Z" fill="currentColor" opacity="0.85" />
      <circle cx="0" cy="2" r="2.5" fill="currentColor" />
      {/* outer petals */}
      <path d="M-18 4 Q-22 -10 -8 -16" />
      <path d="M18 4 Q22 -10 8 -16" />
      <path d="M-12 14 Q-20 18 -16 6" />
      <path d="M12 14 Q20 18 16 6" />
    </g>
  </svg>
)

const EucalyptusBranch = ({ className = '', flip = false }) => (
  <svg viewBox="0 0 220 80" className={className} style={{ transform: flip ? 'scaleX(-1)' : 'none' }} fill="none" stroke="currentColor" strokeWidth="1" aria-hidden>
    {/* main stem */}
    <path d="M0 40 Q60 36 110 40 Q160 44 218 40" />
    {/* eucalyptus rounded leaves */}
    {[
      [20, 28], [40, 50], [62, 26], [82, 52], [104, 28], [124, 50], [146, 26], [166, 50], [186, 28], [202, 48],
    ].map(([cx, cy], i) => (
      <g key={i}>
        <line x1={cx} y1="40" x2={cx} y2={cy} />
        <ellipse cx={cx} cy={cy} rx="9" ry="14" fill="currentColor" opacity="0.35" />
        <ellipse cx={cx} cy={cy} rx="9" ry="14" />
      </g>
    ))}
  </svg>
)

const IvyVine = ({ className = '' }) => (
  <svg viewBox="0 0 320 80" className={className} fill="none" stroke="currentColor" strokeWidth="1" aria-hidden>
    <path d="M0 40 Q40 20 80 40 Q120 60 160 40 Q200 20 240 40 Q280 60 320 40" />
    {[40, 120, 200, 280].map((x, i) => (
      <g key={i}>
        <path d={`M${x} ${i % 2 ? 56 : 24} L${x} 40`} />
        <path d={`M${x - 8} ${i % 2 ? 58 : 22} Q${x - 14} ${i % 2 ? 70 : 10} ${x - 4} ${i % 2 ? 72 : 8} Q${x + 6} ${i % 2 ? 64 : 16} ${x} ${i % 2 ? 56 : 24}`} fill="currentColor" opacity="0.35" />
      </g>
    ))}
  </svg>
)

const Monogram = ({ initials = 'A & B', className = '' }) => (
  <svg viewBox="0 0 120 120" className={className} fill="none" stroke="currentColor" strokeWidth="1" aria-hidden>
    <circle cx="60" cy="60" r="54" />
    <circle cx="60" cy="60" r="50" />
    {/* laurel left */}
    <path d="M20 60 Q14 40 22 24" />
    {[28, 40, 52].map((y, i) => (
      <ellipse key={i} cx={16} cy={y} rx="3" ry="6" fill="currentColor" opacity="0.5" />
    ))}
    {/* laurel right */}
    <path d="M100 60 Q106 40 98 24" />
    {[28, 40, 52].map((y, i) => (
      <ellipse key={i} cx={104} cy={y} rx="3" ry="6" fill="currentColor" opacity="0.5" />
    ))}
    <text x="60" y="68" textAnchor="middle" fontFamily="Georgia, serif" fontStyle="italic" fontSize="26" fill="currentColor" stroke="none">
      {initials}
    </text>
    {/* tiny rosette */}
    <circle cx="60" cy="20" r="3" fill="currentColor" />
    <circle cx="60" cy="100" r="3" fill="currentColor" />
  </svg>
)

const WaxSeal = ({ className = '', children = 'V' }) => (
  <div className={`relative inline-flex items-center justify-center ${className}`} style={{
    width: '90px', height: '90px',
    background: 'radial-gradient(circle at 35% 30%, #E8A8A0, #C9706A 40%, #8B3A36 90%)',
    borderRadius: '50%',
    boxShadow: 'inset -4px -6px 12px rgba(0,0,0,0.35), 0 4px 10px rgba(0,0,0,0.18)',
  }}>
    <span className="text-[#F5EFE0]" style={{ fontFamily: '"Pinyon Script", "Snell Roundhand", cursive', fontSize: '52px', lineHeight: 1, textShadow: '0 1px 2px rgba(0,0,0,0.25)' }}>
      {children}
    </span>
  </div>
)

const FlourishDivider = ({ className = '' }) => (
  <svg viewBox="0 0 280 30" className={className} fill="none" stroke="currentColor" strokeWidth="1" aria-hidden>
    <path d="M10 15 Q70 4 130 15 Q190 26 270 15" />
    <circle cx="140" cy="15" r="3.5" fill="currentColor" />
    <circle cx="10" cy="15" r="2" fill="currentColor" />
    <circle cx="270" cy="15" r="2" fill="currentColor" />
    <path d="M120 15 Q126 8 134 12" />
    <path d="M160 15 Q154 22 146 18" />
  </svg>
)

const Corner = ({ className = '', rotate = 0 }) => (
  <svg viewBox="0 0 80 80" className={className} style={{ transform: `rotate(${rotate}deg)` }} fill="none" stroke="currentColor" strokeWidth="1" aria-hidden>
    <path d="M4 76 L4 30 Q4 4 30 4 L76 4" />
    <path d="M10 76 L10 34 Q10 10 34 10 L76 10" strokeWidth="0.6" />
    {/* corner rose */}
    <g transform="translate(20 20)">
      <circle r="6" fill="currentColor" opacity="0.2" />
      <circle r="3" fill="currentColor" />
    </g>
  </svg>
)

// ===== GOOGLE FONTS LOADER =====
function FontLoader() {
  useEffect(() => {
    if (document.getElementById('albion-fonts')) return
    const link = document.createElement('link')
    link.id = 'albion-fonts'
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Pinyon+Script&display=swap'
    document.head.appendChild(link)
  }, [])
  return null
}

// ===== TEMPLATE =====
export default function AlbionVowTemplate({ wedding }) {
  const [lightbox, setLightbox] = useState(null)
  const cd = useCountdown(wedding.weddingDate)
  const gallery = wedding.gallery || []
  const events = wedding.events || []
  const initials = `${(wedding.brideName || '?').charAt(0)} & ${(wedding.groomName || '?').charAt(0)}`
  const sealLetter = `${(wedding.brideName || '?').charAt(0)}${(wedding.groomName || '?').charAt(0)}`

  return (
    <main
      className="min-h-screen bg-[#F5EFE0] text-[#3D4146] selection:bg-[#C9A961] selection:text-[#F5EFE0]"
      style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}
    >
      <FontLoader />

      {/* ===== HERO ===== */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {wedding.heroImage?.url ? (
          <>
            <motion.img initial={{ scale: 1.12 }} animate={{ scale: 1 }} transition={{ duration: 2.6, ease: 'easeOut' }} src={wedding.heroImage.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: 'rgba(245, 239, 224, 0.92)' }} />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(245,239,224,0.5) 0%, rgba(245,239,224,0) 35%, rgba(245,239,224,0) 65%, rgba(245,239,224,0.6) 100%)' }} />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#FAF7EE] via-[#F5EFE0] to-[#EEDDD8]" />
        )}

        {/* Rose stems at top corners */}
        <RoseStem className="absolute -top-6 left-2 md:left-8 w-24 md:w-32 text-[#D4B5B0]/85" />
        <RoseStem flip className="absolute -top-6 right-2 md:right-8 w-24 md:w-32 text-[#D4B5B0]/85" />

        {/* Eucalyptus branches at bottom corners */}
        <EucalyptusBranch className="absolute bottom-6 -left-12 md:left-0 w-52 md:w-72 text-[#8B9B7E]/80 rotate-12" />
        <EucalyptusBranch flip className="absolute bottom-6 -right-12 md:right-0 w-52 md:w-72 text-[#8B9B7E]/80 -rotate-12" />

        {/* Letterpress-style centre card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.4, delay: 0.3 }}
          className="relative z-10 text-center max-w-3xl px-6"
        >
          <div className="mb-4 inline-flex items-center gap-3 text-[#C9A961] tracking-[0.5em] text-[10px] md:text-xs uppercase">
            <span className="h-px w-8 bg-[#C9A961]" />
            Together with their families
            <span className="h-px w-8 bg-[#C9A961]" />
          </div>

          <p className="text-[#3D4146]/70 text-lg md:text-xl mb-2" style={{ fontFamily: '"Pinyon Script", "Snell Roundhand", cursive', fontSize: '2rem' }}>
            request the honour of your presence
          </p>
          <p className="text-[#3D4146]/65 text-base mb-8 italic">at the marriage of</p>

          <h1 className="text-[#3D4146] font-light leading-[0.95]">
            <span className="block text-5xl md:text-7xl lg:text-8xl italic">{wedding.brideName}</span>
            <span
              className="inline-block my-4 md:my-6 text-[#8B9B7E]"
              style={{ fontFamily: '"Pinyon Script", "Snell Roundhand", cursive', fontSize: '4rem', lineHeight: 1 }}
            >
              and
            </span>
            <span className="block text-5xl md:text-7xl lg:text-8xl italic">{wedding.groomName}</span>
          </h1>

          {wedding.tagline && (
            <p className="mt-8 text-[#3D4146]/75 italic text-lg md:text-xl max-w-2xl mx-auto">"{wedding.tagline}"</p>
          )}

          <FlourishDivider className="w-48 md:w-64 mx-auto mt-10 text-[#C9A961]" />

          <div className="mt-6 space-y-1 text-[#3D4146]">
            <p className="tracking-[0.4em] text-xs md:text-sm uppercase text-[#8B9B7E]">{fmtDayName(wedding.weddingDate)}</p>
            <p className="font-light text-3xl md:text-4xl">{fmtDate(wedding.weddingDate)}</p>
            {hasTime(wedding.weddingDate) && (
              <p className="text-[#3D4146]/70 text-lg italic mt-1">at {fmtTime(wedding.weddingDate)}</p>
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }} className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[#8B9B7E]/80 text-[10px] tracking-[0.5em] uppercase">
          ↓ Turn the page
        </motion.div>
      </section>

      {/* ===== IVY DIVIDER ===== */}
      <SectionDivider />

      {/* ===== COUNTDOWN ===== */}
      {!cd.done && (
        <section className="relative py-20 md:py-28 px-4 bg-[#F5EFE0] overflow-hidden">
          <EucalyptusBranch className="absolute top-12 -left-20 w-64 text-[#8B9B7E]/25" />
          <EucalyptusBranch flip className="absolute bottom-12 -right-20 w-64 text-[#8B9B7E]/25" />
          <div className="container mx-auto max-w-4xl text-center">
            <SectionHeader eyebrow="With Anticipation" title="Counting the days" />
            <div className="grid grid-cols-4 gap-4 md:gap-8 mt-14">
              {[
                { v: cd.days, l: 'Days' }, { v: cd.hours, l: 'Hours' },
                { v: cd.minutes, l: 'Minutes' }, { v: cd.seconds, l: 'Seconds' },
              ].map((u) => (
                <div key={u.l} className="relative">
                  <div className="bg-[#FAF7EE] border border-[#C9A961]/60 px-2 py-8 md:py-10" style={{ boxShadow: '0 4px 24px rgba(61, 65, 70, 0.06)' }}>
                    <div className="absolute top-0 left-0 right-0 h-1 bg-[#8B9B7E]/60" />
                    <div className="font-light text-5xl md:text-7xl text-[#3D4146]" style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}>
                      {String(u.v).padStart(2, '0')}
                    </div>
                    <div className="text-[10px] md:text-xs tracking-[0.4em] uppercase mt-2 text-[#8B9B7E]">{u.l}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== STORY ===== */}
      {wedding.story && (
        <section className="relative py-20 md:py-32 px-4 bg-[#F5EFE0] overflow-hidden">
          <RoseStem className="absolute top-10 right-4 w-20 md:w-28 text-[#D4B5B0]/60" />
          <RoseStem flip className="absolute bottom-10 left-4 w-20 md:w-28 text-[#D4B5B0]/60" />

          <div className="container mx-auto max-w-3xl">
            <div className="text-center">
              <Monogram initials={initials} className="w-20 h-20 mx-auto mb-6 text-[#C9A961]" />
              <SectionHeader eyebrow="A Love Story" title="How we came to be" />
            </div>

            {/* Letter-card with deckled / torn-paper feel */}
            <div className="relative mt-12 bg-[#FAF7EE] p-8 md:p-14 mx-auto" style={{
              boxShadow: '0 1px 0 rgba(61,65,70,0.05), 0 30px 60px -30px rgba(61,65,70,0.18)',
              maxWidth: '720px',
            }}>
              <Corner className="absolute top-3 left-3 w-10 text-[#8B9B7E]/70" />
              <Corner rotate={90} className="absolute top-3 right-3 w-10 text-[#8B9B7E]/70" />
              <Corner rotate={-90} className="absolute bottom-3 left-3 w-10 text-[#8B9B7E]/70" />
              <Corner rotate={180} className="absolute bottom-3 right-3 w-10 text-[#8B9B7E]/70" />

              <div className="text-center mb-6">
                <p className="text-[#8B9B7E]" style={{ fontFamily: '"Pinyon Script", "Snell Roundhand", cursive', fontSize: '2.4rem' }}>
                  Dearest reader,
                </p>
              </div>

              <div className="text-base md:text-lg text-[#3D4146]/90 leading-[1.85] whitespace-pre-line text-left italic" style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}>
                <span className="float-left text-7xl leading-none mr-3 mt-1 text-[#8B9B7E] not-italic font-light">
                  {wedding.story.charAt(0)}
                </span>
                {wedding.story.slice(1)}
              </div>

              <div className="mt-10 text-right">
                <p className="text-[#8B9B7E]" style={{ fontFamily: '"Pinyon Script", "Snell Roundhand", cursive', fontSize: '2rem' }}>
                  yours, forever &mdash;
                </p>
                <p className="text-[#3D4146] italic mt-1">{wedding.brideName} &amp; {wedding.groomName}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ===== GALLERY ===== */}
      {gallery.length > 0 && (
        <section className="relative py-20 md:py-32 px-4 bg-[#EEDDD8] overflow-hidden">
          <IvyVine className="absolute top-10 left-0 w-full max-w-2xl text-[#8B9B7E]/30" />
          <IvyVine className="absolute bottom-10 right-0 w-full max-w-2xl text-[#8B9B7E]/30 rotate-180" />
          <div className="container mx-auto relative max-w-6xl">
            <div className="text-center">
              <SectionHeader eyebrow="Captured Moments" title="Our album" />
              <p className="text-[#3D4146]/65 italic mt-4 max-w-md mx-auto">A few favourite frames from the journey here.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-10 mt-16">
              {gallery.map((g, i) => {
                const tilt = (i * 73) % 7 - 3 // -3..+3 degrees
                return (
                  <motion.button
                    key={g.publicId || i}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: (i % 6) * 0.06 }}
                    onClick={() => setLightbox(i)}
                    className="relative group"
                    style={{ transform: `rotate(${tilt}deg)` }}
                  >
                    <div className="bg-[#FAF7EE] p-3 pb-12" style={{ boxShadow: '0 18px 40px -20px rgba(61,65,70,0.35), 0 2px 0 rgba(61,65,70,0.05)' }}>
                      <div className={`overflow-hidden ${i % 4 === 0 ? 'aspect-[3/4]' : 'aspect-square'}`}>
                        <img src={g.url} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                      </div>
                      <p className="text-center mt-3 text-[#8B9B7E]" style={{ fontFamily: '"Pinyon Script", "Snell Roundhand", cursive', fontSize: '1.4rem' }}>
                        no. {String(i + 1).padStart(2, '0')}
                      </p>
                    </div>
                  </motion.button>
                )
              })}
            </div>
          </div>

          <AnimatePresence>
            {lightbox !== null && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setLightbox(null)} className="fixed inset-0 z-50 bg-[#3D4146]/95 flex items-center justify-center p-4">
                <button className="absolute top-6 right-6 text-[#F5EFE0]" onClick={() => setLightbox(null)}><X /></button>
                <button className="absolute left-4 md:left-12 text-[#F5EFE0] p-2" onClick={(e) => { e.stopPropagation(); setLightbox((lightbox - 1 + gallery.length) % gallery.length) }}><ChevronLeft size={32} /></button>
                <button className="absolute right-4 md:right-12 text-[#F5EFE0] p-2" onClick={(e) => { e.stopPropagation(); setLightbox((lightbox + 1) % gallery.length) }}><ChevronRight size={32} /></button>
                <motion.img key={lightbox} initial={{ opacity: 0 }} animate={{ opacity: 1 }} src={gallery[lightbox].url} alt="" onClick={(e) => e.stopPropagation()} className="max-w-[90vw] max-h-[85vh] object-contain bg-[#FAF7EE] p-3" style={{ boxShadow: '0 30px 80px -30px rgba(0,0,0,0.6)' }} />
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}

      {/* ===== EVENTS ===== */}
      {events.length > 0 && (
        <section className="relative py-20 md:py-32 px-4 bg-[#F5EFE0] overflow-hidden">
          <EucalyptusBranch className="absolute -top-4 -left-16 w-64 text-[#8B9B7E]/30 rotate-6" />
          <EucalyptusBranch flip className="absolute -bottom-4 -right-16 w-64 text-[#8B9B7E]/30 -rotate-6" />
          <div className="container mx-auto max-w-4xl relative">
            <div className="text-center">
              <SectionHeader eyebrow="The Order of Events" title="A day in the country" />
              <p className="text-[#3D4146]/65 italic mt-4 max-w-md mx-auto">We would be delighted by your company.</p>
            </div>

            <div className="space-y-8 mt-16">
              {events.map((ev, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className="relative bg-[#FAF7EE] grid md:grid-cols-[160px_1fr] gap-6 p-6 md:p-8"
                  style={{ boxShadow: '0 4px 24px -8px rgba(61,65,70,0.12)' }}
                >
                  {/* Vertical date band */}
                  <div className="md:border-r md:border-[#C9A961]/40 md:pr-6 flex md:flex-col items-center md:items-start gap-3 md:gap-1">
                    <div className="text-[10px] tracking-[0.35em] uppercase text-[#8B9B7E]">{fmtMonth(ev.date)}</div>
                    <div className="font-light text-6xl text-[#3D4146]" style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}>{fmtDay(ev.date)}</div>
                    <div className="text-[10px] tracking-[0.35em] uppercase text-[#8B9B7E]">{new Date(ev.date).toLocaleDateString('en-GB', { year: 'numeric', timeZone: IST })}</div>
                  </div>

                  <div className="md:pl-2">
                    <p className="text-[#8B9B7E] italic" style={{ fontFamily: '"Pinyon Script", "Snell Roundhand", cursive', fontSize: '1.7rem' }}>
                      no. {String(i + 1).padStart(2, '0')}
                    </p>
                    <h3 className="font-light italic text-3xl md:text-4xl text-[#3D4146] -mt-1 mb-2">{ev.name}</h3>
                    <div className="flex flex-wrap gap-4 text-sm text-[#8B9B7E] mb-3">
                      {ev.startTime && <span className="flex items-center gap-2"><Clock size={14} /> {ev.startTime}{ev.endTime ? ` – ${ev.endTime}` : ''}</span>}
                      {ev.venue && <span className="flex items-center gap-2"><MapPin size={14} /> {ev.venue}</span>}
                    </div>
                    {ev.address && <p className="text-[#3D4146]/75 mb-3">{ev.address}</p>}
                    {ev.description && <p className="text-[#3D4146]/75 leading-relaxed italic mb-4">{ev.description}</p>}
                    {ev.mapsLink && (
                      <a href={ev.mapsLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs tracking-[0.3em] uppercase border-b border-[#3D4146] text-[#3D4146] pb-1 hover:border-[#C9A961] hover:text-[#C9A961] transition">
                        Find your way <MapPin size={12} />
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
      {wedding.rsvpSettings?.enabled !== false && <RSVPSection wedding={wedding} sealLetter={sealLetter} />}

      {/* ===== GIFT REGISTRY ===== */}
      {wedding.advancedSettings?.giftRegistryLink && (
        <section className="py-20 px-4 bg-[#F5EFE0] border-t border-[#C9A961]/30 text-center">
          <Gift className="w-8 h-8 text-[#8B9B7E] mx-auto mb-4" />
          <h2 className="font-light italic text-3xl md:text-4xl text-[#3D4146] mb-3">A small token, if you wish</h2>
          <p className="text-[#3D4146]/70 max-w-xl mx-auto mb-8 italic">Your presence is gift enough. Should you wish to add to our new chapter, our registry awaits.</p>
          <a href={wedding.advancedSettings.giftRegistryLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 border border-[#3D4146] text-[#3D4146] px-10 py-4 text-xs tracking-[0.3em] uppercase hover:bg-[#3D4146] hover:text-[#F5EFE0] transition">
            Visit our registry
          </a>
        </section>
      )}

      {/* ===== FOOTER ===== */}
      <footer className="relative py-16 px-4 text-center bg-[#FAF7EE] border-t border-[#C9A961]/30 overflow-hidden">
        <EucalyptusBranch className="absolute -top-4 left-1/2 -translate-x-[180px] w-32 text-[#8B9B7E]/40" />
        <EucalyptusBranch flip className="absolute -top-4 left-1/2 translate-x-[50px] w-32 text-[#8B9B7E]/40" />
        <Monogram initials={initials} className="w-16 h-16 text-[#C9A961] mx-auto mb-4" />
        <div className="font-light italic text-3xl text-[#3D4146] mb-2">
          {wedding.brideName} <span className="text-[#8B9B7E]" style={{ fontFamily: '"Pinyon Script", "Snell Roundhand", cursive' }}>and</span> {wedding.groomName}
        </div>
        <div className="text-xs tracking-[0.3em] text-[#8B9B7E] uppercase mb-6">{fmtDate(wedding.weddingDate)}</div>
        {wedding.advancedSettings?.socialMedia?.instagram && (
          <a href={wedding.advancedSettings.socialMedia.instagram} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-[#8B9B7E] mb-6 hover:text-[#C9A961]"><Instagram size={18} /></a>
        )}
        <div className="text-[10px] text-[#3D4146]/50 tracking-[0.3em] uppercase">
          Lovingly set in print &middot; <a href="/" className="underline hover:text-[#8B9B7E]">Vivoha</a>
        </div>
      </footer>
    </main>
  )
}

function SectionHeader({ eyebrow, title }) {
  return (
    <>
      <div className="tracking-[0.5em] text-[10px] md:text-xs uppercase mb-4 text-[#8B9B7E]">&mdash; {eyebrow} &mdash;</div>
      <h2 className="font-light italic text-4xl md:text-6xl text-[#3D4146]">{title}</h2>
    </>
  )
}

function SectionDivider() {
  return (
    <div className="py-10 px-4 bg-[#F5EFE0] flex items-center justify-center gap-6">
      <div className="h-px bg-[#C9A961]/40 flex-1 max-w-xs" />
      <FlourishDivider className="w-32 md:w-44 text-[#C9A961]" />
      <div className="h-px bg-[#C9A961]/40 flex-1 max-w-xs" />
    </div>
  )
}

function RSVPSection({ wedding, sealLetter }) {
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
    <section id="rsvp" className="relative py-20 md:py-32 px-4 bg-[#EEDDD8] overflow-hidden">
      <RoseStem className="absolute -top-4 left-4 w-20 md:w-28 text-[#D4B5B0]/80" />
      <RoseStem flip className="absolute -top-4 right-4 w-20 md:w-28 text-[#D4B5B0]/80" />
      <EucalyptusBranch className="absolute bottom-0 -left-20 w-72 text-[#8B9B7E]/30" />
      <EucalyptusBranch flip className="absolute bottom-0 -right-20 w-72 text-[#8B9B7E]/30" />

      <div className="container mx-auto max-w-2xl relative">
        <div className="text-center mb-12">
          <FlourishDivider className="w-40 mx-auto text-[#C9A961] mb-4" />
          <SectionHeader eyebrow="The Honour of Your Reply" title="Will you join us?" />
          {wedding.rsvpSettings?.deadline && (
            <p className="mt-4 text-[#3D4146]/65 italic">Kindly respond by {fmtDate(wedding.rsvpSettings.deadline)}</p>
          )}
        </div>

        {success ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative bg-[#FAF7EE] p-12 text-center" style={{ boxShadow: '0 30px 60px -30px rgba(61,65,70,0.25)' }}>
            <div className="absolute -top-12 left-1/2 -translate-x-1/2">
              <WaxSeal>{sealLetter}</WaxSeal>
            </div>
            <div className="mt-8">
              <p className="text-[#8B9B7E]" style={{ fontFamily: '"Pinyon Script", "Snell Roundhand", cursive', fontSize: '3rem' }}>
                Thank you
              </p>
              <p className="text-[#3D4146]/85 italic mt-2">Your reply has reached us. We shall be most delighted to see you.</p>
            </div>
          </motion.div>
        ) : (
          <form onSubmit={submit} className="relative bg-[#FAF7EE] p-8 md:p-12 space-y-6" style={{ boxShadow: '0 30px 60px -30px rgba(61,65,70,0.25)' }}>
            <div className="absolute -top-12 left-1/2 -translate-x-1/2">
              <WaxSeal>{sealLetter}</WaxSeal>
            </div>
            <div className="text-center mb-6 mt-2">
              <p className="text-[#8B9B7E]" style={{ fontFamily: '"Pinyon Script", "Snell Roundhand", cursive', fontSize: '2rem' }}>
                R.S.V.P.
              </p>
            </div>
            <div>
              <label className="text-[10px] tracking-[0.4em] uppercase text-[#8B9B7E] block mb-2">Full name *</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-transparent border-b border-[#C9A961]/50 py-3 focus:outline-none focus:border-[#3D4146] text-[#3D4146] italic" />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] tracking-[0.4em] uppercase text-[#8B9B7E] block mb-2">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-transparent border-b border-[#C9A961]/50 py-3 focus:outline-none focus:border-[#3D4146] text-[#3D4146] italic" />
              </div>
              <div>
                <label className="text-[10px] tracking-[0.4em] uppercase text-[#8B9B7E] block mb-2">WhatsApp Number *</label>
                <input required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-transparent border-b border-[#C9A961]/50 py-3 focus:outline-none focus:border-[#3D4146] text-[#3D4146] italic" />
              </div>
            </div>
            <div>
              <label className="text-[10px] tracking-[0.4em] uppercase text-[#8B9B7E] block mb-3">Shall we have the pleasure? *</label>
              <div className="grid grid-cols-3 gap-3">
                {[{ v: 'yes', l: 'With joy' }, { v: 'maybe', l: 'Perhaps' }, { v: 'no', l: 'With regret' }].map((o) => (
                  <button type="button" key={o.v} onClick={() => setAttending(o.v)}
                    className={`py-3 sm:py-4 px-1 text-[10px] leading-tight tracking-[0.18em] sm:tracking-[0.3em] uppercase border transition break-words ${attending === o.v ? 'bg-[#8B9B7E] text-[#FAF7EE] border-[#8B9B7E]' : 'border-[#C9A961]/40 hover:border-[#8B9B7E] text-[#3D4146]'}`}>
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
            {attending === 'yes' && (
              <>
                <div>
                  <label className="text-[10px] tracking-[0.4em] uppercase text-[#8B9B7E] block mb-2">Party size (including yourself)</label>
                  <input type="number" min={1} max={10} value={guests} onChange={(e) => setGuests(e.target.value)} className="w-full bg-transparent border-b border-[#C9A961]/50 py-3 focus:outline-none focus:border-[#3D4146] text-[#3D4146] italic" />
                </div>
                {mealOptions.length > 0 && (
                  <div>
                    <label className="text-[10px] tracking-[0.4em] uppercase text-[#8B9B7E] block mb-3">Dinner preference</label>
                    <div className="flex flex-wrap gap-2">
                      {mealOptions.map((m) => (
                        <button type="button" key={m} onClick={() => setMeal(m)}
                          className={`px-5 py-2 text-[10px] tracking-[0.3em] uppercase border transition ${meal === m ? 'bg-[#D4B5B0] text-[#3D4146] border-[#D4B5B0]' : 'border-[#C9A961]/40 hover:border-[#8B9B7E] text-[#3D4146]'}`}>
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
            <div>
              <label className="text-[10px] tracking-[0.4em] uppercase text-[#8B9B7E] block mb-2">A note for the couple</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} className="w-full bg-transparent border-b border-[#C9A961]/50 py-3 focus:outline-none focus:border-[#3D4146] resize-none text-[#3D4146] italic" />
            </div>
            <button type="submit" disabled={submitting} className="w-full bg-[#3D4146] hover:bg-[#8B9B7E] text-[#FAF7EE] py-5 tracking-[0.5em] text-xs uppercase transition">
              {submitting ? 'Sending…' : 'Send my reply'}
            </button>
          </form>
        )}
      </div>
    </section>
  )
}
