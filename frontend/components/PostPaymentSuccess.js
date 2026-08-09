'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, ChevronRight } from 'lucide-react'

/**
 * PostPaymentSuccess — full-screen "You're live." celebration.
 * Shown for 3 seconds before auto-redirecting to the Wedding Hub.
 * Includes a manual CTA in case the couple wants to skip.
 */
export default function PostPaymentSuccess({ brideName, groomName, publicUrl, hubUrl }) {
  const particles = useMemo(
    () => Array.from({ length: 28 }).map((_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 1.2,
      duration: 2.4 + Math.random() * 2,
      size: 4 + Math.random() * 6,
      hue: i % 3 === 0 ? '#C9B896' : i % 3 === 1 ? '#E8D8B7' : '#FDFBF7',
    })),
    [],
  )

  const [now, setNow] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setNow((n) => n + 1), 100)
    return () => clearInterval(t)
  }, [])

  const couple = [brideName, groomName].filter(Boolean).join(' & ')

  return (
    <main
      className="fixed inset-0 z-[200] bg-[#0E0B07] text-[#FDFBF7] flex items-center justify-center px-6 overflow-hidden"
      data-testid="post-payment-success"
    >
      {/* Confetti / soft particle layer */}
      <div className="absolute inset-0 pointer-events-none">
        {particles.map((p, idx) => (
          <motion.span
            key={idx}
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: '110vh', opacity: [0, 1, 1, 0] }}
            transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeIn' }}
            className="absolute block rounded-full"
            style={{
              left: `${p.left}%`,
              width: p.size,
              height: p.size,
              background: p.hue,
              boxShadow: `0 0 12px ${p.hue}55`,
            }}
          />
        ))}
      </div>

      {/* Radial vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(circle at 50% 40%, transparent 0%, rgba(0,0,0,0.55) 80%)' }}
      />

      <div className="relative z-10 text-center max-w-2xl">
        <motion.div
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 180, damping: 14, delay: 0.05 }}
          className="text-[64px] md:text-[88px] leading-none mb-6"
          aria-hidden
        >
          🎊
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="text-[#C9B896] tracking-[0.4em] text-[10px] uppercase mb-3 flex items-center justify-center gap-2"
        >
          <Sparkles size={12} /> Vivoha · Live
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="font-serif font-light text-5xl md:text-7xl leading-[1.05]"
          data-testid="success-headline"
        >
          You&apos;re <em className="italic text-[#C9B896]">live</em>.
        </motion.h1>

        {couple && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.92 }}
            transition={{ duration: 0.7, delay: 0.6 }}
            className="mt-5 font-serif text-xl md:text-2xl text-[#FDFBF7]/90"
            data-testid="success-couple"
          >
            {couple}&apos;s wedding website is now live.
          </motion.p>
        )}

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ duration: 0.7, delay: 0.8 }}
          className="mt-4 text-sm md:text-base text-[#FDFBF7]/70 leading-relaxed max-w-md mx-auto"
        >
          We&apos;ve sent your website link to WhatsApp.
          <br />Share it with your guests.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.0 }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          {publicUrl && (
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              data-testid="success-view-website"
              className="group bg-[#C9B896] hover:bg-[#FDFBF7] text-[#1F1A14] px-7 py-4 tracking-[0.2em] text-[11px] uppercase transition inline-flex items-center gap-2 font-medium"
            >
              View My Wedding Page <ChevronRight size={14} className="group-hover:translate-x-1 transition" />
            </a>
          )}
          {hubUrl && (
            <a
              href={hubUrl}
              data-testid="success-go-hub"
              className="text-[#C9B896]/85 hover:text-[#FDFBF7] tracking-[0.25em] text-[10px] uppercase border-b border-transparent hover:border-[#C9B896]/40 transition"
            >
              Or open my Wedding Hub
            </a>
          )}
        </motion.div>

        {/* Auto-redirect progress hint */}
        <div className="mt-10 mx-auto w-44 h-px bg-[#C9B896]/25 overflow-hidden" aria-hidden>
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 3, ease: 'linear' }}
            style={{ transformOrigin: 'left' }}
            className="h-px bg-[#C9B896]"
          />
        </div>
        <div className="mt-3 text-[9px] tracking-[0.4em] uppercase text-[#FDFBF7]/40">
          Opening your hub in a moment…
        </div>
      </div>
    </main>
  )
}
