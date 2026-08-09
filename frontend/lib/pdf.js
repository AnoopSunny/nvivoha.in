import {
  Document, Page, Text, View, Image, StyleSheet, pdf,
} from '@react-pdf/renderer'
import React from 'react'
import QRCode from 'qrcode'

// Per-template palette. `dark` controls QR + footer treatment so QR codes never
// render dark-on-dark (which was killing readability on Sapphire / Eternal / Jannah).
const PALETTES = {
  'Moonveil':        { bg: '#FDFBF7', ink: '#3A3226', accent: '#8B7355', soft: '#C9B896', surface: '#F5EFE4', dark: false },
  'Royal Heritage':  { bg: '#FFF8DC', ink: '#3D0000', accent: '#8B0000', soft: '#D4AF37', surface: '#F5E9C4', dark: false },
  'Eternal Edit':    { bg: '#0A0A0A', ink: '#F5F5F5', accent: '#D4B074', soft: '#3A3A3A', surface: '#1C1C1C', dark: true },
  'Crimson Lotus':   { bg: '#FDF5F7', ink: '#3A2424', accent: '#B8456C', soft: '#D4A0AC', surface: '#F5E6E8', dark: false },
  'Sapphire Saga':   { bg: '#0A1628', ink: '#E8E4D8', accent: '#C0C0C0', soft: '#3A4868', surface: '#152340', dark: true },
  'Sanctum Veil':    { bg: '#FAF8F4', ink: '#2B3A52', accent: '#C9A961', soft: '#D4C9A8', surface: '#EDE8DC', dark: false },
  'Marigold Bloom':  { bg: '#FFF8E7', ink: '#2D5016', accent: '#F2A93B', soft: '#F2C977', surface: '#FFEBC5', dark: false },
  'Pearl & Velvet':  { bg: '#1F3A2E', ink: '#F4E4BC', accent: '#D4AF37', soft: '#5A7868', surface: '#2A4D3E', dark: true },
  'Banyan & Brass':  { bg: '#FBF4E6', ink: '#3D1414', accent: '#B8860B', soft: '#C2A059', surface: '#F0E4C9', dark: false },
  'Pichwai Bloom':   { bg: '#1E3A5F', ink: '#FBF6E9', accent: '#E0B649', soft: '#5A78A0', surface: '#2A4A75', dark: true },
  'Albion Vow':      { bg: '#EEDDD8', ink: '#4A3C36', accent: '#B59070', soft: '#C2A89D', surface: '#E0CFC9', dark: false },
  'Jannah Vow':      { bg: '#0F5132', ink: '#F5EFE3', accent: '#D4AF37', soft: '#8FB89E', surface: '#1A6F47', dark: true },
}

// A4 = 595 x 842 pt. The layout below is tuned to fill the page nicely with
// elegant breathing room — hero 300pt, couple card overlapping, then
// thank-you copy, wish + QR row, link strip, footer. No big empty void.
function s(p) {
  // QR card always has a light surface so the QR scans reliably even on dark
  // templates (Sapphire / Eternal / Pichwai / Pearl & Velvet / Jannah).
  const qrCardBg = p.dark ? '#FDFBF7' : p.bg
  const qrCardInk = p.dark ? '#3A3226' : p.ink

  return StyleSheet.create({
    page: { backgroundColor: p.bg, color: p.ink, fontFamily: 'Helvetica', padding: 0, position: 'relative' },
    ornamentTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 6, backgroundColor: p.accent },
    ornamentBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 6, backgroundColor: p.accent },

    // HERO band
    hero: { width: '100%', height: 300, objectFit: 'cover' },
    heroFallback: { width: '100%', height: 300, backgroundColor: p.surface },

    // Couple CARD overlapping hero
    card: {
      marginTop: -86,
      marginHorizontal: 50,
      paddingHorizontal: 34,
      paddingVertical: 28,
      backgroundColor: p.bg,
      borderColor: p.soft,
      borderWidth: 1,
      alignItems: 'center',
    },
    eyebrow: { fontSize: 8, letterSpacing: 5, color: p.accent, textTransform: 'uppercase', textAlign: 'center' },
    couple: { fontSize: 34, fontFamily: 'Times-Italic', color: p.ink, marginTop: 12, textAlign: 'center', lineHeight: 1.1 },
    date: { fontSize: 10, letterSpacing: 4, color: p.accent, textTransform: 'uppercase', marginTop: 12, textAlign: 'center' },
    tagline: { fontSize: 9.5, fontFamily: 'Times-Italic', color: p.ink, opacity: 0.72, marginTop: 12, textAlign: 'center', lineHeight: 1.5, paddingHorizontal: 14 },

    // Divider
    dividerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 28, marginHorizontal: 110 },
    dividerLine: { flex: 1, height: 1, backgroundColor: p.soft },
    dividerDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: p.accent, marginHorizontal: 12 },

    // Thank you copy
    body: { paddingHorizontal: 60, paddingTop: 24 },
    thanksTitle: { fontSize: 22, fontFamily: 'Times-Italic', color: p.ink, textAlign: 'center', marginBottom: 12 },
    thanksBody: {
      fontSize: 10, color: p.ink, opacity: 0.82, textAlign: 'center', lineHeight: 1.7,
      paddingHorizontal: 16,
    },

    // Wish + QR row (well-proportioned, no cramping)
    row: { flexDirection: 'row', marginTop: 22, alignItems: 'stretch', paddingHorizontal: 50 },
    wishCol: { flex: 1, paddingRight: 18, justifyContent: 'center' },
    qrCol: { width: 174, alignItems: 'center' },

    wishBox: {
      padding: 16, borderColor: p.accent, borderWidth: 0.6,
      backgroundColor: p.surface, alignItems: 'center',
    },
    wishText: { fontSize: 10, fontFamily: 'Times-Italic', color: p.ink, textAlign: 'center', lineHeight: 1.55 },
    wishSign: { fontSize: 8, letterSpacing: 3, color: p.accent, textTransform: 'uppercase', marginTop: 8 },

    // QR — always rendered on a light card so dark templates remain scannable
    qrCard: {
      width: 174, padding: 9, backgroundColor: qrCardBg,
      borderColor: p.soft, borderWidth: 1, alignItems: 'center',
    },
    qr: { width: 156, height: 156 },
    qrLabel: {
      fontSize: 7.5, letterSpacing: 2.5, color: p.accent,
      textTransform: 'uppercase', marginTop: 8, textAlign: 'center',
    },

    // Full-width link bar
    linkBox: {
      marginTop: 22, marginHorizontal: 50, paddingHorizontal: 18, paddingVertical: 12,
      borderColor: p.soft, borderWidth: 1, backgroundColor: p.surface, alignItems: 'center',
    },
    linkLabel: { fontSize: 7.5, letterSpacing: 3, color: p.accent, textTransform: 'uppercase' },
    linkText: { fontSize: 11.5, color: p.ink, marginTop: 4, textAlign: 'center' },

    // Footer band
    footerBand: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      paddingTop: 14, paddingBottom: 22, alignItems: 'center',
      backgroundColor: p.surface, borderTopColor: p.soft, borderTopWidth: 1,
    },
    brand: { fontSize: 10, fontFamily: 'Times-Italic', color: p.accent },
    brandSub: { fontSize: 7.5, letterSpacing: 3, color: p.ink, opacity: 0.6, textTransform: 'uppercase', marginTop: 3 },
  })
}

function fmtDate(d) {
  if (!d) return ''
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return ''
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(dt)
}

async function fetchToDataUri(url) {
  if (!url) return null
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    const mime = res.headers.get('content-type') || 'image/jpeg'
    return `data:${mime};base64,${buf.toString('base64')}`
  } catch (e) { return null }
}

function InviteDoc({ wedding, palette, heroData, qrDataUri, shortUrl }) {
  const st = s(palette)
  const couple = `${wedding.brideName}  &  ${wedding.groomName}`
  const displayLink = (shortUrl || '').replace(/^https?:\/\//, '')

  return React.createElement(Document, {},
    React.createElement(Page, { size: 'A4', style: st.page },
      React.createElement(View, { style: st.ornamentTop }),

      // HERO
      heroData
        ? React.createElement(Image, { src: heroData, style: st.hero })
        : React.createElement(View, { style: st.heroFallback }),

      // COUPLE CARD overlapping hero
      React.createElement(View, { style: st.card },
        React.createElement(Text, { style: st.eyebrow }, 'A Vivoha Wedding Invitation'),
        React.createElement(Text, { style: st.couple }, couple),
        React.createElement(Text, { style: st.date }, fmtDate(wedding.weddingDate)),
        wedding.tagline
          ? React.createElement(Text, { style: st.tagline }, '" ' + String(wedding.tagline).slice(0, 160) + ' "')
          : null
      ),

      // Divider
      React.createElement(View, { style: st.dividerRow },
        React.createElement(View, { style: st.dividerLine }),
        React.createElement(View, { style: st.dividerDot }),
        React.createElement(View, { style: st.dividerLine })
      ),

      // Thank you copy
      React.createElement(View, { style: st.body },
        React.createElement(Text, { style: st.thanksTitle }, 'Thank you'),
        React.createElement(Text, { style: st.thanksBody },
          'Thank you for choosing Vivoha to craft your wedding website. Your cinematic invitation is ready and waiting. May your day be exactly as you have always pictured it — and may every moment after it be even more beautiful.'
        )
      ),

      // Wish (left) + QR (right) row
      React.createElement(View, { style: st.row },
        React.createElement(View, { style: st.wishCol },
          React.createElement(View, { style: st.wishBox },
            React.createElement(Text, { style: st.wishText },
              'With every star above and every heart that loves you,\nwe wish you a lifetime of love, laughter and gentle mornings together.'
            ),
            React.createElement(Text, { style: st.wishSign }, '— The Vivoha Studio')
          )
        ),
        React.createElement(View, { style: st.qrCol },
          React.createElement(View, { style: st.qrCard },
            qrDataUri ? React.createElement(Image, { src: qrDataUri, style: st.qr }) : null,
            React.createElement(Text, { style: st.qrLabel }, 'Scan to open')
          )
        )
      ),

      // Full-width link bar
      displayLink
        ? React.createElement(View, { style: st.linkBox },
            React.createElement(Text, { style: st.linkLabel }, 'Or visit'),
            React.createElement(Text, { style: st.linkText }, displayLink)
          )
        : null,

      // Footer band (anchored to bottom — fills the page)
      React.createElement(View, { style: st.footerBand },
        React.createElement(Text, { style: st.brand }, 'Vivoha'),
        React.createElement(Text, { style: st.brandSub }, 'Cinematic Wedding Studio · Made with love in India')
      ),

      React.createElement(View, { style: st.ornamentBottom })
    )
  )
}

export async function buildInvitePdf(wedding, { publicUrl, shortUrl }) {
  const palette = PALETTES[wedding.template] || PALETTES['Moonveil']
  const heroData = wedding.heroImage?.url ? await fetchToDataUri(wedding.heroImage.url) : null
  const qrTarget = shortUrl || publicUrl
  // Always render QR with dark squares on light background for maximum scannability.
  const qrDataUri = await QRCode.toDataURL(qrTarget, {
    width: 420, margin: 1,
    color: { dark: '#1A1A1A', light: '#FFFFFF' },
  })
  const doc = InviteDoc({ wedding, palette, heroData, qrDataUri, shortUrl: qrTarget })
  const buf = await pdf(doc).toBuffer()
  if (Buffer.isBuffer(buf)) return buf
  return await streamToBuffer(buf)
}

async function streamToBuffer(stream) {
  const chunks = []
  return new Promise((resolve, reject) => {
    stream.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
}
