'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Upload, X, Loader2, Sparkles, Image as ImageIcon, CheckCircle2, Lock, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

const POLL_MS = 8000
const STORAGE_KEY = 'kal_photo_wall_name'
// Max tiles visible in the main grid before collapsing the rest behind a
// "+N more" tile that opens a full-album modal. Keeps the wedding page short.
const MAX_VISIBLE = 8
// Hardcoded social-proof baseline shown under the demo / preview wall. Grows
// over time as Vivoha sees more real-wedding traffic.
const SOCIAL_PROOF_COUNT = 312

const THEMES = {
  'Moonveil':       { bg: '#FDFBF7', surface: '#F5EFE4', ink: '#3A3226', accent: '#8B7355', border: '#C9B896', dark: false },
  'Royal Heritage': { bg: '#FFF8DC', surface: '#F5E9C4', ink: '#3D0000', accent: '#8B0000', border: '#D4AF37', dark: false },
  'Eternal Edit':   { bg: '#0A0A0A', surface: '#141414', ink: '#F5F5F5', accent: '#D4B074', border: '#3A3A3A', dark: true },
  'Crimson Lotus':  { bg: '#FDF5F7', surface: '#F5E6E8', ink: '#3A2424', accent: '#B8456C', border: '#D4A0AC', dark: false },
  'Sapphire Saga':  { bg: '#0A1628', surface: '#152340', ink: '#E8E4D8', accent: '#C0C0C0', border: '#3A4868', dark: true },
  'Sanctum Veil':   { bg: '#FAF8F4', surface: '#EDE8DC', ink: '#2B3A52', accent: '#C9A961', border: '#D4C9A8', dark: false },
  'Marigold Bloom': { bg: '#FFF8E7', surface: '#FFEBC5', ink: '#2D5016', accent: '#F2A93B', border: '#F2C977', dark: false },
  'Pearl & Velvet': { bg: '#1F3A2E', surface: '#2A4D3E', ink: '#F4E4BC', accent: '#D4AF37', border: '#5A7868', dark: true },
  'Banyan & Brass': { bg: '#FBF4E6', surface: '#F0E4C9', ink: '#3D1414', accent: '#B8860B', border: '#C2A059', dark: false },
  'Pichwai Bloom':  { bg: '#1E3A5F', surface: '#2A4A75', ink: '#FBF6E9', accent: '#E0B649', border: '#5A78A0', dark: true },
  'Albion Vow':     { bg: '#EEDDD8', surface: '#E0CFC9', ink: '#4A3C36', accent: '#B59070', border: '#C2A89D', dark: false },
  'Jannah Vow':     { bg: '#0F5132', surface: '#1A6F47', ink: '#F5EFE3', accent: '#D4AF37', border: '#8FB89E', dark: true },
}

function fileToDataUri(file) {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result)
    r.onerror = rej
    r.readAsDataURL(file)
  })
}

function fmtDateTime(iso) {
  if (!iso) return ''
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(iso))
}

function useCountdown(targetIso) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!targetIso) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [targetIso])
  if (!targetIso) return null
  const ms = new Date(targetIso).getTime() - now
  if (ms <= 0) return null
  const s = Math.floor(ms / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return { d, h, m, s: sec }
}

export default function LivePhotoWall({ slug, title = 'Guest Photo Wall', coupleNames = '', template = 'Moonveil', isDemo = false, previewMode = false, demoPhotos = null }) {
  const theme = useMemo(() => THEMES[template] || THEMES['Moonveil'], [template])
  // In demo mode we may receive a pre-seeded photo set so the customer can
  // actually see what a packed wall looks like with real-feeling captions.
  const initialPhotos = previewMode && Array.isArray(demoPhotos) ? demoPhotos : []
  const [photos, setPhotos] = useState(initialPhotos)
  const [enabled, setEnabled] = useState(true)
  const [opensAt, setOpensAt] = useState(null)
  const [isLocked, setIsLocked] = useState(false)
  const [open, setOpen] = useState(false)
  const [albumOpen, setAlbumOpen] = useState(false)
  const [lightbox, setLightbox] = useState(null)
  const cancelRef = useRef(false)
  const countdown = useCountdown(isLocked ? opensAt : null)

  const fetchPhotos = useCallback(async () => {
    // In previewMode the wedding doesn't exist on the server yet (it's a
    // /demo lead-only page or an unpaid /preview), so don't waste a roundtrip.
    if (previewMode) return
    try {
      const res = await fetch(`/api/photo-wall/public/${slug}`, { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      if (cancelRef.current) return
      setPhotos(data.photos || [])
      setEnabled(!!data.enabled)
      setOpensAt(data.opensAt || null)
      setIsLocked(!!data.isLocked)
    } catch (_) {}
  }, [slug, previewMode])

  useEffect(() => {
    cancelRef.current = false
    fetchPhotos()
    if (previewMode) return () => { cancelRef.current = true }
    const t = setInterval(fetchPhotos, POLL_MS)
    return () => { cancelRef.current = true; clearInterval(t) }
  }, [fetchPhotos, previewMode])

  if (!enabled) return null

  const heading = isLocked ? 'Photo wall opens soon' : title
  // In previewMode we treat the wall as a locked demo — uploads are disabled,
  // but the section still showcases what the live experience will look like.
  const uploadDisabled = isDemo || isLocked || previewMode

  // Per-theme styles
  const sectionStyle = {
    background: `linear-gradient(180deg, ${theme.bg} 0%, ${theme.surface} 50%, ${theme.bg} 100%)`,
    color: theme.ink,
  }
  const btnStyle = uploadDisabled
    ? { background: theme.border, color: theme.dark ? theme.bg : theme.ink, cursor: 'not-allowed', opacity: 0.7 }
    : { background: theme.ink, color: theme.bg }

  return (
    <section
      id="photo-wall"
      data-testid="live-photo-wall"
      data-template={template}
      className="relative py-20 md:py-28"
      style={sectionStyle}
    >
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-end justify-between flex-wrap gap-6 mb-12">
          <div>
            <div className="tracking-[0.3em] text-xs uppercase mb-3 flex items-center gap-2" style={{ color: theme.accent }}>
              {previewMode ? <Lock size={14} /> : isLocked ? <Lock size={14} /> : <Sparkles size={14} />}
              {previewMode
                ? 'Preview · Unlocks the moment your site goes live'
                : isLocked ? 'Locked · Opens at ceremony' : 'Live · Updates every few seconds'}
            </div>
            <h2 className="font-serif font-light text-4xl md:text-5xl" style={{ color: theme.ink }}>{heading}</h2>
            {previewMode && (
              <p className="mt-3 max-w-xl text-sm md:text-base" style={{ color: theme.ink, opacity: 0.75 }}>
                On your wedding day, guests scan a QR and instantly drop their photos here.
                {coupleNames && <> A live wall of memories from <em className="italic">{coupleNames}&apos;s</em> day, beautifully matched to this design.</>}
              </p>
            )}
            {!previewMode && !isLocked && coupleNames && (
              <p className="mt-3 max-w-xl text-sm md:text-base" style={{ color: theme.ink, opacity: 0.75 }}>
                Snap a moment from <em className="italic">{coupleNames}&apos;s</em> day and add it to the wall. Photos appear here after a quick review.
              </p>
            )}
            {!previewMode && isLocked && opensAt && (
              <p className="mt-3 text-sm" style={{ color: theme.ink, opacity: 0.75 }}>
                Uploads unlock when the ceremony begins — {fmtDateTime(opensAt)} (IST).
              </p>
            )}
            {isDemo && !isLocked && !previewMode && (
              <p className="mt-2 text-xs italic" style={{ color: theme.accent }}>
                You&apos;re viewing a demo · Guest uploads are disabled on demo pages.
              </p>
            )}
          </div>
          <Button
            onClick={() => !uploadDisabled && setOpen(true)}
            data-testid="photo-wall-upload-btn"
            disabled={uploadDisabled}
            className="rounded-none px-8 py-6 tracking-widest text-xs uppercase border-0"
            style={btnStyle}
          >
            {previewMode ? <><Lock size={14} className="mr-2" /> Unlocks on launch</>
              : isLocked ? <><Lock size={14} className="mr-2" /> Opens at ceremony</>
              : isDemo ? <><Eye size={14} className="mr-2" /> Demo only</>
              : <><Camera size={14} className="mr-2" /> Add your moment</>}
          </Button>
        </div>

        {isLocked && countdown && (
          <div
            data-testid="photo-wall-countdown"
            className="mb-12 grid grid-cols-4 gap-3 max-w-xl mx-auto"
          >
            {[['Days', countdown.d], ['Hours', countdown.h], ['Minutes', countdown.m], ['Seconds', countdown.s]].map(([l, v]) => (
              <div key={l} className="text-center p-4 border" style={{ borderColor: theme.border, background: theme.surface }}>
                <div className="font-serif text-3xl md:text-4xl" style={{ color: theme.ink }}>{String(v).padStart(2, '0')}</div>
                <div className="text-[10px] tracking-[0.25em] uppercase mt-1" style={{ color: theme.accent }}>{l}</div>
              </div>
            ))}
          </div>
        )}

        {photos.length === 0 ? (
          previewMode ? (
            // Preview/demo placeholder grid — 8 themed tiles so the customer
            // can imagine guest photos populating the wall after launch.
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4" data-testid="photo-wall-preview-grid">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="relative aspect-square overflow-hidden flex items-center justify-center"
                  style={{ background: theme.surface, border: `1px solid ${theme.border}` }}
                >
                  <ImageIcon size={22} style={{ color: theme.accent, opacity: 0.55 }} />
                  <div
                    className="absolute bottom-2 left-2 right-2 text-[9px] tracking-[0.25em] uppercase text-center opacity-70"
                    style={{ color: theme.accent }}
                  >
                    Guest moment
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              data-testid="photo-wall-empty"
              className="py-20 text-center"
              style={{ borderTop: `1px dashed ${theme.border}`, borderBottom: `1px dashed ${theme.border}`, color: theme.accent }}
            >
              <ImageIcon size={28} className="mx-auto mb-4 opacity-50" />
              <div className="font-serif text-lg" style={{ color: theme.ink }}>
                {isLocked ? 'The wall opens at the ceremony' : 'Be the first to share a moment'}
              </div>
              <div className="text-sm mt-1" style={{ color: theme.ink, opacity: 0.6 }}>
                {isLocked ? 'Photos will appear here once approved.' : 'Your photo will appear here once approved by the couple.'}
              </div>
            </div>
          )
        ) : (
          (() => {
            const overflow = photos.length > MAX_VISIBLE
            const visible = overflow ? photos.slice(0, MAX_VISIBLE - 1) : photos
            const hiddenCount = overflow ? photos.length - visible.length : 0
            const peekPhoto = overflow ? photos[MAX_VISIBLE - 1] : null
            return (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4" data-testid="photo-wall-grid">
                <AnimatePresence initial={false}>
                  {visible.map((p, i) => (
                    <motion.button
                      key={p.id}
                      layout
                      initial={{ opacity: 0, scale: 0.92 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.92 }}
                      transition={{ duration: 0.45, delay: Math.min(i * 0.02, 0.3) }}
                      onClick={() => setLightbox(p)}
                      data-testid={`photo-wall-item-${p.id}`}
                      className="group relative aspect-square overflow-hidden"
                      style={{ background: theme.surface }}
                    >
                      <img src={p.image.url} alt={p.caption || 'Guest moment'} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      {previewMode ? (
                        <>
                          {/* Demo overlay — always visible so the customer sees the name + caption */}
                          <div
                            className="absolute inset-0"
                            style={{ background: `linear-gradient(to top, ${theme.ink}d9 0%, ${theme.ink}66 38%, transparent 70%)` }}
                          />
                          <div className="absolute bottom-0 left-0 right-0 p-3 text-left" style={{ color: theme.bg }}>
                            <div className="text-[10px] tracking-[0.25em] uppercase" style={{ color: theme.accent }}>{p.uploaderName}</div>
                            {p.caption && <div className="text-[13px] mt-1 font-serif italic leading-snug line-clamp-2">{p.caption}</div>}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition" style={{ background: `linear-gradient(to top, ${theme.ink}cc, transparent 60%)` }} />
                          <div className="absolute bottom-0 left-0 right-0 p-3 text-left opacity-0 group-hover:opacity-100 transition" style={{ color: theme.bg }}>
                            <div className="text-xs tracking-widest uppercase" style={{ color: theme.accent }}>{p.uploaderName}</div>
                            {p.caption && <div className="text-sm mt-0.5 line-clamp-2">{p.caption}</div>}
                          </div>
                        </>
                      )}
                    </motion.button>
                  ))}
                  {overflow && (
                    <motion.button
                      key="more-tile"
                      layout
                      initial={{ opacity: 0, scale: 0.92 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.92 }}
                      transition={{ duration: 0.45, delay: Math.min(visible.length * 0.02, 0.3) }}
                      onClick={() => setAlbumOpen(true)}
                      data-testid="photo-wall-more-tile"
                      className="group relative aspect-square overflow-hidden"
                      style={{ background: theme.ink }}
                    >
                      {peekPhoto && (
                        <img
                          src={peekPhoto.image.url}
                          alt=""
                          aria-hidden
                          className="absolute inset-0 w-full h-full object-cover opacity-35 scale-110 blur-[2px] transition-transform duration-700 group-hover:scale-125"
                        />
                      )}
                      <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${theme.ink}b8 0%, ${theme.ink}f0 100%)` }} />
                      <div className="relative z-10 h-full w-full flex flex-col items-center justify-center text-center px-3">
                        <div className="font-serif text-4xl md:text-5xl leading-none mb-1" style={{ color: theme.bg }}>
                          +{hiddenCount}
                        </div>
                        <div className="tracking-[0.3em] text-[10px] uppercase mt-2" style={{ color: theme.accent }}>
                          more moments
                        </div>
                        <div className="mt-3 inline-flex items-center gap-1 text-[10px] tracking-widest uppercase" style={{ color: theme.bg, opacity: 0.85 }}>
                          <Eye size={11} /> View album
                        </div>
                      </div>
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            )
          })()
        )}

        {previewMode && photos.length > 0 && (
          <div
            data-testid="photo-wall-social-proof"
            className="mt-12 pt-8 flex flex-col sm:flex-row items-center justify-center gap-4 text-center"
            style={{ borderTop: `1px solid ${theme.border}80` }}
          >
            <div className="flex -space-x-2.5">
              {photos.slice(0, 4).map((p, i) => (
                <img
                  key={i}
                  src={p.image.url}
                  alt=""
                  aria-hidden
                  className="w-9 h-9 rounded-full object-cover border-2"
                  style={{ borderColor: theme.bg }}
                />
              ))}
            </div>
            <div className="text-sm md:text-base font-light" style={{ color: theme.ink, opacity: 0.85 }}>
              <span className="font-serif italic" style={{ color: theme.accent }}>+{SOCIAL_PROOF_COUNT} moments</span>{' '}
              already shared on real Vivoha weddings ·{' '}
              <em className="italic">your wall is next</em>
            </div>
          </div>
        )}
      </div>

      <UploadModal open={open} slug={slug} theme={theme} onClose={() => setOpen(false)} onUploaded={fetchPhotos} />
      <AlbumModal
        open={albumOpen}
        photos={photos}
        theme={theme}
        coupleNames={coupleNames}
        previewMode={previewMode}
        onPick={(p) => setLightbox(p)}
        onClose={() => setAlbumOpen(false)}
      />
      <Lightbox photo={lightbox} theme={theme} onClose={() => setLightbox(null)} />
    </section>
  )
}

function UploadModal({ open, slug, theme, onClose, onUploaded }) {
  const [name, setName] = useState('')
  const [caption, setCaption] = useState('')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (open && typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setName(saved)
      setDone(false)
    }
  }, [open])

  function reset() { setFile(null); setPreview(null); setCaption(''); setBusy(false); setDone(false) }

  function onPick(e) {
    const f = e.target.files?.[0]; if (!f) return
    if (f.size > 8 * 1024 * 1024) { toast.error('Image must be under 8MB'); return }
    setFile(f); setPreview(URL.createObjectURL(f))
  }

  async function submit() {
    if (!name.trim()) { toast.error('Please enter your name'); return }
    if (!file) { toast.error('Please pick a photo'); return }
    setBusy(true)
    try {
      const dataUri = await fileToDataUri(file)
      const res = await fetch('/api/photo-wall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weddingSlug: slug, dataUri, uploaderName: name.trim(), caption: caption.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, name.trim())
      setDone(true); onUploaded?.()
      setTimeout(() => { onClose(); reset() }, 1800)
    } catch (e) { toast.error(e.message || 'Upload failed') }
    finally { setBusy(false) }
  }

  const modalStyle = { background: theme.bg, color: theme.ink }
  const labelStyle = { color: theme.accent }
  const inputStyle = { background: theme.surface, borderColor: theme.border, color: theme.ink }
  const btnStyle = { background: theme.ink, color: theme.bg }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] backdrop-blur-sm flex items-center justify-center p-4"
          style={{ background: `${theme.ink}cc` }}
          onClick={onClose}
          data-testid="photo-wall-modal"
        >
          <motion.div
            initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg relative max-h-[92vh] overflow-y-auto"
            style={modalStyle}
          >
            <button onClick={onClose} className="absolute top-4 right-4 opacity-60 hover:opacity-100" style={{ color: theme.ink }} aria-label="Close">
              <X size={20} />
            </button>

            {done ? (
              <div className="p-12 text-center" data-testid="photo-wall-success">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: `${theme.accent}33` }}>
                  <CheckCircle2 size={32} style={{ color: theme.ink }} />
                </div>
                <h3 className="font-serif text-2xl" style={{ color: theme.ink }}>Thank you!</h3>
                <p className="mt-2" style={{ color: theme.ink, opacity: 0.7 }}>Your moment has been submitted for review. It will appear on the wall shortly.</p>
              </div>
            ) : (
              <div className="p-8 md:p-10">
                <div className="tracking-[0.3em] text-xs uppercase mb-3" style={labelStyle}>Share a moment</div>
                <h3 className="font-serif text-3xl mb-6" style={{ color: theme.ink }}>Add your photo</h3>

                <div className="space-y-4">
                  <div>
                    <Label className="text-xs tracking-widest uppercase" style={labelStyle}>Your name</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="How should we credit you?"
                      maxLength={80}
                      data-testid="photo-wall-name-input"
                      className="rounded-none py-5 mt-1.5 border"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <Label className="text-xs tracking-widest uppercase" style={labelStyle}>Caption (optional)</Label>
                    <Textarea
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="A little note about this moment…"
                      maxLength={240}
                      rows={2}
                      data-testid="photo-wall-caption-input"
                      className="rounded-none mt-1.5 border"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <Label className="text-xs tracking-widest uppercase" style={labelStyle}>Photo</Label>
                    {preview ? (
                      <div className="relative mt-1.5">
                        <img src={preview} alt="preview" className="w-full max-h-72 object-cover" />
                        <button
                          onClick={() => { setFile(null); setPreview(null) }}
                          className="absolute top-2 right-2 px-3 py-1 text-xs tracking-widest uppercase"
                          style={{ background: theme.bg, color: theme.ink, opacity: 0.95 }}
                        >Change</button>
                      </div>
                    ) : (
                      <label
                        htmlFor="pw-file"
                        className="mt-1.5 flex flex-col items-center justify-center py-10 cursor-pointer transition border border-dashed"
                        style={{ borderColor: theme.border, background: `${theme.surface}80` }}
                        data-testid="photo-wall-file-label"
                      >
                        <Upload size={22} className="mb-2" style={{ color: theme.accent }} />
                        <div className="text-sm" style={{ color: theme.ink }}>Tap to choose a photo</div>
                        <div className="text-xs mt-1" style={{ color: theme.accent }}>JPG or PNG · up to 8MB</div>
                        <input id="pw-file" type="file" accept="image/*" className="hidden" onChange={onPick} data-testid="photo-wall-file-input" />
                      </label>
                    )}
                  </div>
                </div>

                <Button
                  onClick={submit}
                  disabled={busy || !file || !name.trim()}
                  data-testid="photo-wall-submit-btn"
                  className="w-full mt-6 rounded-none py-6 tracking-widest text-xs uppercase border-0"
                  style={btnStyle}
                >
                  {busy ? <><Loader2 className="animate-spin mr-2" size={14} /> Uploading…</> : 'Submit for review'}
                </Button>
                <p className="text-xs mt-3 text-center" style={{ color: theme.ink, opacity: 0.55 }}>
                  Photos are reviewed by the couple before appearing on the wall.
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function AlbumModal({ open, photos, theme, coupleNames, previewMode, onPick, onClose }) {
  // Lock background scroll while the album is open
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[105] overflow-y-auto backdrop-blur-sm"
          style={{ background: `${theme.ink}f2` }}
          onClick={onClose}
          data-testid="photo-wall-album-modal"
        >
          <motion.div
            initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }}
            transition={{ duration: 0.35 }}
            onClick={(e) => e.stopPropagation()}
            className="container mx-auto max-w-6xl px-4 py-10 md:py-16"
          >
            <div className="flex items-end justify-between flex-wrap gap-4 mb-8 md:mb-10">
              <div>
                <div className="tracking-[0.3em] text-xs uppercase mb-2" style={{ color: theme.accent }}>
                  All guest moments · {photos.length} photos
                </div>
                <h3 className="font-serif font-light text-3xl md:text-5xl" style={{ color: theme.bg }}>
                  {coupleNames ? <>{coupleNames}<span style={{ color: theme.accent }}>&apos;s</span> wall</> : 'The full album'}
                </h3>
              </div>
              <button
                onClick={onClose}
                data-testid="photo-wall-album-close"
                className="flex items-center gap-2 px-5 py-3 tracking-widest text-[10px] uppercase border transition"
                style={{ borderColor: `${theme.accent}80`, color: theme.bg, background: 'transparent' }}
              >
                <X size={13} /> Close
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {photos.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onPick(p)}
                  data-testid={`photo-wall-album-item-${p.id}`}
                  className="group relative aspect-square overflow-hidden"
                  style={{ background: theme.surface }}
                >
                  <img
                    src={p.image.url}
                    alt={p.caption || 'Guest moment'}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {previewMode ? (
                    <>
                      <div
                        className="absolute inset-0"
                        style={{ background: `linear-gradient(to top, ${theme.ink}cc 0%, ${theme.ink}55 40%, transparent 75%)` }}
                      />
                      <div className="absolute bottom-0 left-0 right-0 p-2.5 text-left" style={{ color: theme.bg }}>
                        <div className="text-[9px] tracking-[0.25em] uppercase" style={{ color: theme.accent }}>{p.uploaderName}</div>
                        {p.caption && <div className="text-[11px] mt-0.5 font-serif italic leading-tight line-clamp-2">{p.caption}</div>}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition" style={{ background: `linear-gradient(to top, ${theme.ink}cc, transparent 60%)` }} />
                      <div className="absolute bottom-0 left-0 right-0 p-2.5 text-left opacity-0 group-hover:opacity-100 transition" style={{ color: theme.bg }}>
                        <div className="text-[10px] tracking-widest uppercase" style={{ color: theme.accent }}>{p.uploaderName}</div>
                        {p.caption && <div className="text-xs mt-0.5 line-clamp-2 italic">{p.caption}</div>}
                      </div>
                    </>
                  )}
                </button>
              ))}
            </div>

            <div className="mt-10 text-center text-[10px] tracking-[0.3em] uppercase" style={{ color: theme.accent, opacity: 0.85 }}>
              Tap a photo to view full size
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Lightbox({ photo, theme, onClose }) {
  return (
    <AnimatePresence>
      {photo && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center p-4"
          style={{ background: `${theme.ink}f0` }}
          onClick={onClose}
          data-testid="photo-wall-lightbox"
        >
          <button onClick={onClose} className="absolute top-6 right-6 opacity-80 hover:opacity-100" style={{ color: theme.bg }}>
            <X size={28} />
          </button>
          <motion.div
            initial={{ scale: 0.94 }} animate={{ scale: 1 }} exit={{ scale: 0.94 }}
            onClick={(e) => e.stopPropagation()}
            className="max-w-5xl w-full"
          >
            <img src={photo.image.url} alt={photo.caption || 'Guest moment'} className="w-full max-h-[78vh] object-contain" />
            <div className="mt-4 text-center" style={{ color: theme.bg }}>
              <div className="text-xs tracking-[0.3em] uppercase" style={{ color: theme.accent }}>{photo.uploaderName}</div>
              {photo.caption && <div className="font-serif italic mt-1">{photo.caption}</div>}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
