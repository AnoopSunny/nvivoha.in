'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import Lenis from 'lenis'
import { HEADING_FONTS, BODY_FONTS, buildGoogleFontsHref } from '@/lib/theme-fonts'

/**
 * Wraps wedding template pages with:
 *  - Lenis smooth-scroll (buttery momentum scrolling)
 *  - An IntersectionObserver that adds `[data-revealed]` to every <section>
 *  - Optional "Back to Vivoha" floating pill (only shown on demo preview pages)
 *  - Optional admin-picked theme overrides (font + accent CSS variable)
 *
 * Keep template files untouched — the wrapper handles the dynamic feel.
 */
export default function WeddingPageWrapper({ children, isDemo = false, theme = null, showBackPill = true }) {
  const rootRef = useRef(null)

  // Lazy-load Google Fonts ONCE when a theme font is chosen.
  useEffect(() => {
    if (!theme) return
    const ids = [theme.headingFont, theme.bodyFont].filter(Boolean)
    if (ids.length === 0) return
    const href = buildGoogleFontsHref(ids)
    if (!href) return
    const id = `vivoha-theme-fonts-${ids.join('-')}`
    if (document.getElementById(id)) return
    const link = document.createElement('link')
    link.id = id; link.rel = 'stylesheet'; link.href = href
    document.head.appendChild(link)
  }, [theme])

  // Resolve font stacks
  const headingStack = theme?.headingFont
    ? (HEADING_FONTS.find(f => f.id === theme.headingFont)?.stack || null)
    : null
  const bodyStack = theme?.bodyFont
    ? (BODY_FONTS.find(f => f.id === theme.bodyFont)?.stack || null)
    : null
  const accent = theme?.accent || null

  useEffect(() => {
    // ----- Lenis smooth scroll -----
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      smoothTouch: false, // keep native feel on mobile
    })
    let rafId
    function raf(time) {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)

    // ----- IntersectionObserver section reveals -----
    const root = rootRef.current
    if (!root) return () => { cancelAnimationFrame(rafId); lenis.destroy() }

    // ----- Position LivePhotoWall right before the template's footer -----
    // Each template ends with `<footer>...name & name · date · Crafted with reverence · Vivoha</footer>`
    // We want the photo wall to sit immediately above that footer so it's the
    // last full-bleed cinematic section of the page (still inside the
    // template's visual frame). Falls back to "after #rsvp" if no footer is found.
    try {
      const photoWall = root.querySelector('#photo-wall')
      if (photoWall) {
        const footer = root.querySelector('footer')
        if (footer && footer.parentNode) {
          footer.parentNode.insertBefore(photoWall, footer)
        } else {
          const rsvp = root.querySelector('#rsvp')
          if (rsvp && rsvp.parentNode) {
            rsvp.parentNode.insertBefore(photoWall, rsvp.nextSibling)
          }
        }
      }
    } catch (_) {}

    const sections = root.querySelectorAll('section')
    sections.forEach((s, i) => {
      s.setAttribute('data-reveal', '')
      s.style.setProperty('--reveal-delay', `${(i % 3) * 80}ms`)
    })

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.setAttribute('data-revealed', '')
            // Only animate once
            obs.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    )
    sections.forEach((s) => obs.observe(s))

    // ----- Hero parallax -----
    const hero = root.querySelector('section:first-of-type')
    let heroImg = null
    if (hero) {
      heroImg = hero.querySelector('img')
      if (heroImg) {
        heroImg.style.willChange = 'transform'
      }
    }
    function onScroll() {
      if (!heroImg) return
      const y = window.scrollY
      // Limit parallax to first viewport-and-a-half
      if (y < window.innerHeight * 1.4) {
        heroImg.style.transform = `translate3d(0, ${y * 0.3}px, 0) scale(${1 + y * 0.0003})`
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
      obs.disconnect()
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return (
    <div ref={rootRef} className="vivoha-wedding-root" data-vivoha-theme={theme ? 'on' : 'off'}>
      {(headingStack || bodyStack || accent) && (
        <style>{`
          .vivoha-wedding-root {${bodyStack ? ` font-family: ${bodyStack};` : ''}${accent ? ` --vivoha-accent: ${accent};` : ''} }
          ${headingStack ? `.vivoha-wedding-root .font-serif, .vivoha-wedding-root h1, .vivoha-wedding-root h2, .vivoha-wedding-root h3 { font-family: ${headingStack} !important; }` : ''}
        `}</style>
      )}
      {isDemo && showBackPill && (
        <Link
          href="/"
          data-testid="back-to-vivoha-pill"
          aria-label="Back to Vivoha home"
          className="fixed top-14 sm:top-16 left-3 sm:left-4 z-[85] inline-flex items-center gap-1.5 rounded-full bg-black/65 hover:bg-black/85 backdrop-blur-md text-white px-3.5 py-1.5 text-[10px] tracking-[0.25em] uppercase transition-colors border border-white/25 shadow-md"
        >
          <span aria-hidden>←</span> Vivoha
        </Link>
      )}
      {children}
    </div>
  )
}
