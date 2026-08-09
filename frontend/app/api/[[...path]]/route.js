import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { randomBytes, createHmac } from 'crypto'
import Razorpay from 'razorpay'
import {
  getDb,
  signToken,
  verifyToken,
  getAuthUser,
  hashPassword,
  comparePassword,
  uploadDataUri,
  uploadPreviewDataUri,
  destroyImage,
  slugify,
} from '@/lib/server'
import { PLAN_CONFIG, normalisePlan, getPlan, getPlanFor } from '@/lib/plans'

// ===== RAZORPAY =====
// Server-side SDK instance. Keys live in env (frontend/.env). Frontend never
// receives RAZORPAY_KEY_SECRET — only the public KEY_ID (returned alongside
// each order) is exposed to the browser.
let _razor
function getRazorpay() {
  if (!_razor) {
    _razor = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })
  }
  return _razor
}
// Mock-mode toggle: while the test placeholder keys are in use we can't talk
// to Razorpay's real /orders endpoint. We mint a deterministic dummy order +
// accept any signature so the full UI flow can be demoed end-to-end. The
// moment real keys land in .env this branch is skipped.
function isRazorpayMocked() {
  const k = process.env.RAZORPAY_KEY_ID || ''
  return !k || k === 'rzp_test_placeholder' || k.includes('placeholder')
}

// ===== STATUS TOKEN (short, customer-shareable) =====
// 8 chars from an unambiguous alphabet (no 0/O/1/I). Customer-typeable.
const STATUS_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
function generateStatusToken() {
  let s = ''
  const bytes = randomBytes(8)
  for (let i = 0; i < 8; i++) s += STATUS_ALPHABET[bytes[i] % STATUS_ALPHABET.length]
  return s
}

// ===== EMAIL LOG =====
// Pluggable email layer. For MVP, we record every notification to `email_log`
// so admin can inspect / retry. Hook a real provider (Resend / SendGrid) by
// implementing `sendEmail` here later — the rest of the codebase stays the same.
async function logEmail(db, payload) {
  try {
    await db.collection('email_log').insertOne({
      id: uuidv4(),
      type: String(payload.type || 'notification'),
      to: String(payload.to || '').toLowerCase().slice(0, 200),
      weddingId: payload.weddingId || null,
      statusToken: payload.statusToken || null,
      subject: String(payload.subject || '').slice(0, 240),
      body: String(payload.body || '').slice(0, 2000),
      sent: false,
      createdAt: new Date(),
    })
  } catch (_) { /* never block business logic on logging */ }
}

// ===== INVITE COOKIE HELPER =====
// Returns true if the wedding either has no invite password OR the request carries a valid invite cookie.
function isInviteUnlocked(request, wedding) {
  if (!wedding?.invitePassword?.passwordHash) return true
  const cookieHeader = request.headers.get('cookie') || ''
  const cookieMap = Object.fromEntries(
    cookieHeader.split(';').map(c => c.trim().split('=').map(s => s?.trim())).filter(p => p[0])
  )
  const tok = cookieMap[`vivoha_invite_${wedding.slug}`]
  if (!tok) return false
  const v = verifyToken(tok)
  return !!(v && v.role === 'invite' && v.slug === wedding.slug)
}

// 32-byte hex token (64 chars) — unguessable URL slug for couple dashboards.
function genDashboardToken() {
  return randomBytes(32).toString('hex')
}

// Preview expiry — couple-only previews are valid for 24 hours from first view.
// This prevents customers from using the preview URL as their actual invite without paying.
// Returns true if the wedding's preview has expired (only applies to non-approved drafts).
const PREVIEW_TTL_MS = 24 * 60 * 60 * 1000
const PREVIEW_REACTIVATE_TTL_MS = 60 * 60 * 1000          // 1 hour
const PREVIEW_HARD_DELETE_MS = 5 * 24 * 60 * 60 * 1000    // 5 days from createdAt
function isPreviewExpired(w) {
  if (!w) return false
  // If admin already approved/published, preview is "frozen as live site" but the
  // onboarding/preview/payment flow itself is closed — caller handles that case
  // separately via paymentStatus checks. Only judge expiry on still-draft previews.
  if (w.paymentStatus === 'approved' || w.status === 'published') return false
  if (!w.previewExpiresAt) return false
  const t = new Date(w.previewExpiresAt).getTime()
  return Number.isFinite(t) && Date.now() > t
}
// Touch previewFirstViewedAt on first preview load — idempotent.
async function markPreviewViewedOnce(db, w) {
  if (!w || w.previewFirstViewedAt) return w
  if (w.paymentStatus === 'approved' || w.status === 'published') return w
  const now = new Date()
  await db.collection('weddings').updateOne(
    { id: w.id, previewFirstViewedAt: { $exists: false } },
    { $set: { previewFirstViewedAt: now, previewExpiresAt: new Date(now.getTime() + PREVIEW_TTL_MS) } }
  )
  return { ...w, previewFirstViewedAt: now, previewExpiresAt: new Date(now.getTime() + PREVIEW_TTL_MS) }
}

// Permanent deletion — 5 days after createdAt, draft previews are soft-deleted
// (deletedAt is set so subsequent reads return 404 / "no longer available").
// Published / verification_pending / approved weddings are NEVER auto-deleted.
async function applyHardDeleteIfDue(db, w) {
  if (!w) return w
  if (w.deletedAt) return w
  if (w.status === 'published') return w
  if (w.paymentStatus === 'approved' || w.paymentStatus === 'verification_pending') return w
  const created = w.createdAt ? new Date(w.createdAt).getTime() : null
  if (!created || !Number.isFinite(created)) return w
  if (Date.now() - created <= PREVIEW_HARD_DELETE_MS) return w
  const now = new Date()
  await db.collection('weddings').updateOne(
    { id: w.id, deletedAt: { $exists: false } },
    { $set: { deletedAt: now, deletionReason: 'preview_5d_expired' } }
  )
  return { ...w, deletedAt: now }
}



// Sanitize theme — only accept a few-char hex colour and known font ids.
const ALLOWED_FONT_RX = /^[a-z0-9-]{1,40}$/
function sanitizeTheme(t) {
  if (!t || typeof t !== 'object') return { accent: '', headingFont: '', bodyFont: '' }
  const accent = typeof t.accent === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(t.accent.trim()) ? t.accent.trim() : ''
  const headingFont = typeof t.headingFont === 'string' && ALLOWED_FONT_RX.test(t.headingFont) ? t.headingFont : ''
  const bodyFont = typeof t.bodyFont === 'string' && ALLOWED_FONT_RX.test(t.bodyFont) ? t.bodyFont : ''
  return { accent, headingFont, bodyFont }
}

// Pricing — derived from central plan config (single source of truth lives in /lib/plans.js)
const PLAN_PRICES = Object.fromEntries(Object.values(PLAN_CONFIG).map(p => [p.id, p.price]))

// =====================================================================
// Optional add-ons. Each is a one-time top-up surfaced in the publish flow.
// Backend is authoritative on price — frontend reads from /payment-config.
// =====================================================================
// Add-ons removed entirely — Vivoha is a single flat ₹799 offer.
const ADDONS_CATALOG = []
const ADDONS_BY_ID = Object.fromEntries(ADDONS_CATALOG.map(a => [a.id, a]))

function computeAddonsTotal(addonIds) {
  if (!Array.isArray(addonIds)) return 0
  let sum = 0
  for (const id of addonIds) {
    const a = ADDONS_BY_ID[id]
    if (a) sum += a.price
  }
  return sum
}

/**
 * Enforce plan limits + feature gating on an incoming wedding payload.
 * Mutates `body` in-place to clip/strip disallowed fields (idempotent).
 * Returns null on success or { error, status } on hard rejection.
 */
function applyPlanGating(body, planId) {
  const plan = getPlan(planId)
  const limits = plan.limits
  const f = plan.features

  // Gallery cap — silently clip extra photos
  if (Array.isArray(body.gallery) && body.gallery.length > limits.maxGalleryPhotos) {
    body.gallery = body.gallery.slice(0, limits.maxGalleryPhotos)
  }

  // Photo Wall gate
  if (body.advancedSettings?.photoWall?.enabled && !f.photoWall) {
    body.advancedSettings = {
      ...body.advancedSettings,
      photoWall: { ...(body.advancedSettings.photoWall || {}), enabled: false },
    }
  }

  // Custom Domain gate
  if (body.advancedSettings?.customDomain && !f.customDomain) {
    body.advancedSettings = { ...body.advancedSettings, customDomain: '' }
  }

  // Music/Video embed gate (musicEmbed field doubles for both)
  if (body.advancedSettings?.musicEmbed && !f.videoEmbeds && !f.musicEmbed) {
    body.advancedSettings = { ...body.advancedSettings, musicEmbed: '' }
  }

  // Meal preferences (advanced RSVP) gate
  if (!f.mealPreferences && body.rsvpSettings?.mealOptions?.length) {
    body.rsvpSettings = { ...body.rsvpSettings, mealOptions: [] }
  }

  return null
}

/** Compute current usage for a wedding (gallery, rsvp, live wall). */
async function getWeddingUsage(db, wedding) {
  const plan = getPlanFor(wedding)
  const [rsvpCount, wallCount] = await Promise.all([
    db.collection('rsvps').countDocuments({ weddingId: wedding.id }),
    db.collection('photo_wall').countDocuments({ weddingId: wedding.id, status: { $in: ['pending', 'approved'] } }),
  ])
  return {
    plan: { id: plan.id, name: plan.name, limits: plan.limits, features: plan.features },
    used: {
      galleryPhotos: (wedding.gallery || []).length,
      rsvpResponses: rsvpCount,
      liveWallUploads: wallCount,
    },
    remaining: {
      galleryPhotos: Math.max(0, plan.limits.maxGalleryPhotos - (wedding.gallery || []).length),
      rsvpResponses: Math.max(0, plan.limits.maxRsvpResponses - rsvpCount),
      liveWallUploads: Math.max(0, plan.limits.maxLiveWallUploads - wallCount),
    },
  }
}

/**
 * Compute when the photo wall unlocks (first event's start datetime, or weddingDate as fallback).
 * Returns ISO string or null.
 */
function computePhotoWallOpensAt(wedding) {
  const events = Array.isArray(wedding.events) ? [...wedding.events] : []
  if (events.length > 0) {
    // Sort by date string then by startTime
    events.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')))
    const first = events[0]
    if (first?.date) {
      // Parse "5:00 PM" / "17:00" forms
      let h = 0, m = 0
      const t = String(first.startTime || '').trim()
      const ampm = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
      const hhmm = t.match(/^(\d{1,2}):(\d{2})$/)
      if (ampm) {
        h = parseInt(ampm[1], 10) % 12
        m = parseInt(ampm[2], 10)
        if (/PM/i.test(ampm[3])) h += 12
      } else if (hhmm) {
        h = parseInt(hhmm[1], 10); m = parseInt(hhmm[2], 10)
      }
      // first.date like "2026-12-12" → interpret as IST (+05:30)
      const iso = `${first.date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00+05:30`
      const dt = new Date(iso)
      if (!isNaN(dt.getTime())) return dt.toISOString()
    }
  }
  if (wedding.weddingDate) {
    const dt = new Date(wedding.weddingDate)
    if (!isNaN(dt.getTime())) return dt.toISOString()
  }
  return null
}

/** Should RSVP be closed? past deadline (end-of-day) OR past first event start */
function isRsvpClosed(wedding) {
  const now = Date.now()
  const opensAt = computePhotoWallOpensAt(wedding)
  if (opensAt && new Date(opensAt).getTime() <= now) return true
  const deadline = wedding.rsvpSettings?.deadline
  if (deadline) {
    // Treat deadline as end of that day in IST
    const dt = new Date(`${deadline.slice(0, 10)}T23:59:59+05:30`)
    if (!isNaN(dt.getTime()) && dt.getTime() < now) return true
  }
  return false
}

async function logRevenueIfNeeded(db, wedding) {
  // Skip demos, test runs, missing plan, or already-logged weddings.
  if (!wedding) return
  if (wedding.isDemo || wedding.isTest) return
  if (!wedding.plan || !(wedding.plan in PLAN_PRICES)) return
  if (wedding.revenueLogged) return
  const entry = {
    id: uuidv4(),
    weddingId: wedding.id,
    weddingSlug: wedding.slug,
    coupleName: `${wedding.brideName} & ${wedding.groomName}`,
    plan: wedding.plan,
    amount: PLAN_PRICES[wedding.plan],
    currency: 'INR',
    createdAt: new Date(),
  }
  await db.collection('revenues').insertOne(entry)
  await db.collection('weddings').updateOne(
    { id: wedding.id },
    { $set: { revenueLogged: true, revenueAmount: entry.amount, revenueAt: entry.createdAt } }
  )
}

function cors(res) {
  res.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*')
  res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH')
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return res
}

function ok(data, status = 200) {
  return cors(NextResponse.json(data, { status }))
}
function err(message, status = 400) {
  return cors(NextResponse.json({ error: message }, { status }))
}

export async function OPTIONS() {
  return cors(new NextResponse(null, { status: 200 }))
}

async function handler(request, { params }) {
  const path = (params?.path || []).join('/')
  const route = '/' + path
  const method = request.method
  const db = await getDb()

  try {
    // ===== AUTH =====
    if (route === '/auth/register' && method === 'POST') {
      // Public self-registration is disabled. Only seeded admins can sign in.
      return err('Registration is disabled. Please contact us to get started.', 403)
    }

    if (route === '/auth/login' && method === 'POST') {
      const { email, password } = await request.json()
      if (!email || !password) return err('Missing fields')
      const user = await db.collection('users').findOne({ email: String(email).toLowerCase() })
      if (!user) return err('Invalid credentials', 401)
      const matched = await comparePassword(password, user.password)
      if (!matched) return err('Invalid credentials', 401)
      const token = signToken({ id: user.id, email: user.email, role: user.role, name: user.name })
      return ok({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } })
    }

    if (route === '/auth/me' && method === 'GET') {
      const u = getAuthUser(request)
      if (!u) return err('Unauthorized', 401)
      return ok({ user: u })
    }

    // ===== REACTIVATE PREVIEW =====
    // Customer hits "Activate Again" on an inactive preview. We grant +1 hour
    // of life. We refuse if the wedding has been hard-deleted (>5 days) or if
    // it's already approved/published (in which case it never went dark).
    if (route === '/reactivate-preview' && method === 'POST') {
      const body = await request.json().catch(() => ({}))
      const slug = String(body?.slug || '').trim()
      const onboardToken = String(body?.onboardToken || '').trim()
      if (!slug || !onboardToken) return err('Missing slug or onboardToken', 400)
      let w = await db.collection('weddings').findOne({
        $or: [{ slug }, { websiteSlug: slug }],
        onboardToken,
        deletedAt: { $exists: false },
      })
      if (!w) return err('Preview not found or already deleted', 404)
      // 5-day hard-delete check
      w = await applyHardDeleteIfDue(db, w)
      if (w?.deletedAt) {
        return new NextResponse(JSON.stringify({
          error: 'This preview has been permanently deleted (5-day limit reached).',
          permanentlyExpired: true,
        }), { status: 410, headers: { 'content-type': 'application/json' } })
      }
      if (w.paymentStatus === 'approved' || w.status === 'published') {
        return ok({ ok: true, alreadyLive: true })
      }
      const now = new Date()
      const newExpiresAt = new Date(now.getTime() + PREVIEW_REACTIVATE_TTL_MS)
      await db.collection('weddings').updateOne(
        { id: w.id },
        {
          $set: { previewExpiresAt: newExpiresAt, lastReactivatedAt: now },
          $inc: { reactivationCount: 1 },
        }
      )
      return ok({
        ok: true,
        previewExpiresAt: newExpiresAt.toISOString(),
        ttlSeconds: PREVIEW_REACTIVATE_TTL_MS / 1000,
      })
    }

    // ===== AI STORY ENHANCE (proxied to Monica) =====
    // The browser only ever sees /api/ai-enhance-story. We forward the prompt
    // to Monica's rewrite endpoint with a freshly-randomised task_uid +
    // device_id, then stream the SSE response back to the client verbatim.
    if (route === '/ai-enhance-story' && method === 'POST') {
      const body = await request.json().catch(() => ({}))
      const content = String(body?.content || '').trim()
      if (!content) return err('Empty content', 400)
      if (content.length > 4000) return err('Content too long', 400)

      const rand = () => randomBytes(8).toString('hex')
      const taskUid = `rewriter:${rand()}-${rand().slice(0, 4)}-${rand().slice(0, 4)}-${rand().slice(0, 4)}-${rand()}${rand().slice(0, 4)}`
      const deviceId = `${rand()}${rand().slice(0, 4)}${rand().slice(0, 4)}`
      const upstreamPayload = {
        task_uid: taskUid,
        data: {
          content,
          mode: 'standard',
          use_model: 'gpt-4o-mini',
          intensity: 'medium',
          language: 'auto',
          device_id: deviceId,
        },
        language: 'auto',
        locale: 'en',
        task_type: 'seotool:ai_rewrite',
      }

      let upstream
      try {
        upstream = await fetch('https://api.monica.im/api/seotool/ai_rewrite', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          },
          body: JSON.stringify(upstreamPayload),
        })
      } catch (e) {
        return err('Could not reach enhancer', 502)
      }
      if (!upstream.ok || !upstream.body) {
        return err(`Enhancer error (${upstream.status})`, 502)
      }
      // Stream the SSE body straight back to the client.
      return new Response(upstream.body, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      })
    }

    // ===== WEDDINGS =====
    if (route === '/weddings' && method === 'GET') {
      const u = getAuthUser(request)
      if (!u) return err('Unauthorized', 401)
      const url = new URL(request.url)
      const q = url.searchParams.get('q') || ''
      const status = url.searchParams.get('status') || 'all'
      const isDemoParam = url.searchParams.get('isDemo') // 'true' | 'false' | null
      const filter = { userId: u.id, deletedAt: { $exists: false } }
      if (status !== 'all') filter.status = status
      if (isDemoParam === 'true') filter.isDemo = true
      else if (isDemoParam === 'false') filter.$or = [{ isDemo: { $ne: true } }, { isDemo: { $exists: false } }]
      if (q) {
        const qOr = [
          { brideName: { $regex: q, $options: 'i' } },
          { groomName: { $regex: q, $options: 'i' } },
          { slug: { $regex: q, $options: 'i' } },
        ]
        if (filter.$or) {
          // combine: must satisfy both isDemo filter AND search → use $and
          filter.$and = [{ $or: filter.$or }, { $or: qOr }]
          delete filter.$or
        } else {
          filter.$or = qOr
        }
      }
      const items = await db.collection('weddings').find(filter).sort({ createdAt: -1 }).limit(200).toArray()
      const cleaned = items.map(({ _id, ...rest }) => rest)
      // attach rsvpCount
      for (const w of cleaned) {
        w.rsvpCount = await db.collection('rsvps').countDocuments({ weddingId: w.id })
      }
      return ok({ weddings: cleaned })
    }

    if (route === '/weddings' && method === 'POST') {
      const u = getAuthUser(request)
      if (!u) return err('Unauthorized', 401)
      const body = await request.json()
      if (!body.brideName || !body.groomName || !body.weddingDate) return err('Missing required fields')
      // Enforce one preview per template
      if (body.isDemo === true) {
        const tpl = body.template || 'Moonveil'
        const existingPreview = await db.collection('weddings').findOne({
          isDemo: true,
          template: tpl,
          deletedAt: { $exists: false },
        })
        if (existingPreview) {
          return err(`A preview for "${tpl}" already exists. Edit or delete the existing one before creating a new preview for this template.`, 409)
        }
      }
      let slug = body.slug ? slugify(body.slug) : slugify(`${body.brideName}-${body.groomName}`)
      // ensure uniqueness
      let suffix = 0
      let candidate = slug
      while (await db.collection('weddings').findOne({ slug: candidate, deletedAt: { $exists: false } })) {
        suffix += 1
        candidate = `${slug}-${suffix}`
      }
      slug = candidate
      const plan = normalisePlan(body.plan) || 'vivoha'
      // Apply plan gating BEFORE building the doc (clips gallery, strips disallowed embed/domain/photoWall)
      applyPlanGating(body, plan)
      const wedding = {
        id: uuidv4(),
        userId: u.id,
        slug,
        brideName: body.brideName,
        groomName: body.groomName,
        tagline: body.tagline || '',
        weddingDate: body.weddingDate,
        story: body.story || '',
        heroImage: body.heroImage || null,
        gallery: body.gallery || [],
        template: body.template || 'Moonveil',
        status: body.status || 'draft',
        events: body.events || [],
        rsvpSettings: body.rsvpSettings || { enabled: true, mealOptions: ['Vegetarian', 'Non-Vegetarian'] },
        advancedSettings: body.advancedSettings || {},
        theme: sanitizeTheme(body.theme),
        isDemo: body.isDemo === true,
        isTest: body.isTest === true,
        plan,
        revenueLogged: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      await db.collection('weddings').insertOne(wedding)
      // Log revenue if eligible
      await logRevenueIfNeeded(db, wedding)
      const fresh = await db.collection('weddings').findOne({ id: wedding.id })
      const { _id, ...rest } = fresh
      return ok({ wedding: rest })
    }

    // /weddings/:id/usage — plan limits + current usage
    const wuRoute = route.match(/^\/weddings\/([^\/]+)\/usage$/)
    if (wuRoute && method === 'GET') {
      const u = getAuthUser(request)
      if (!u) return err('Unauthorized', 401)
      const w = await db.collection('weddings').findOne({ id: wuRoute[1], userId: u.id })
      if (!w) return err('Not found', 404)
      return ok(await getWeddingUsage(db, w))
    }

    // /weddings/:id
    const wm = route.match(/^\/weddings\/([^\/]+)$/)
    if (wm) {
      const id = wm[1]
      const u = getAuthUser(request)
      if (!u) return err('Unauthorized', 401)
      const w = await db.collection('weddings').findOne({ id, userId: u.id, deletedAt: { $exists: false } })
      if (!w) return err('Not found', 404)
      if (method === 'GET') {
        const { _id, ...rest } = w
        return ok({ wedding: rest })
      }
      if (method === 'PUT') {
        const body = await request.json()
        const update = { ...body, updatedAt: new Date() }
        delete update.id; delete update._id; delete update.userId; delete update.createdAt
        delete update.revenueLogged; delete update.revenueAmount; delete update.revenueAt
        delete update.clientAccess  // clientAccess is set via its own endpoint
        delete update.viewCount; delete update.viewsByDay
        // Sanitize plan + apply plan gating using EFFECTIVE plan (incoming or current)
        if ('plan' in body) {
          update.plan = normalisePlan(body.plan)
        }
        const effectivePlan = update.plan || w.plan || 'classic'
        applyPlanGating(update, effectivePlan)
        // Sanitize theme if supplied
        if ('theme' in body) {
          update.theme = sanitizeTheme(body.theme)
        }
        // Custom slug gate — if plan disallows custom slug, ignore slug changes
        const planObj = getPlan(effectivePlan)
        if (!planObj.features.customSlug && body.slug && body.slug !== w.slug) {
          delete update.slug
        }
        // Enforce one preview per template (only when this doc IS a preview and template is changing)
        const willBeDemo = ('isDemo' in body) ? (body.isDemo === true) : (w.isDemo === true)
        const newTemplate = ('template' in body) ? body.template : w.template
        if (willBeDemo && newTemplate && newTemplate !== w.template) {
          const clash = await db.collection('weddings').findOne({
            id: { $ne: id },
            isDemo: true,
            template: newTemplate,
            deletedAt: { $exists: false },
          })
          if (clash) return err(`A preview for "${newTemplate}" already exists.`, 409)
        }
        if (body.slug && body.slug !== w.slug) {
          let s = slugify(body.slug); let suffix = 0; let c = s
          while (await db.collection('weddings').findOne({ slug: c, id: { $ne: id }, deletedAt: { $exists: false } })) {
            suffix += 1; c = `${s}-${suffix}`
          }
          update.slug = c
        }
        // BUGFIX: Publishing a wedding (from admin Weddings section or edit form)
        // must also mark it PAID and ensure an ownerToken exists, otherwise the
        // couple's Wedding Hub stays stuck on "pending payment" even though the
        // site is live. Any publish = paid + hub unlocked.
        if (update.status === 'published' && w.paymentStatus !== 'approved') {
          update.paymentStatus = 'approved'
          update.paymentApprovedAt = new Date()
          update.paymentApprovedBy = u.id
          if (!w.ownerToken) update.ownerToken = randomBytes(24).toString('base64url')
        }
        await db.collection('weddings').updateOne({ id }, { $set: update })
        const updated = await db.collection('weddings').findOne({ id })
        // Log revenue if it just became eligible (plan set, not demo/test, not previously logged)
        await logRevenueIfNeeded(db, updated)
        const final = await db.collection('weddings').findOne({ id })
        const { _id, ...rest } = final
        return ok({ wedding: rest })
      }
      if (method === 'DELETE') {
        await db.collection('weddings').updateOne({ id }, { $set: { deletedAt: new Date() } })
        return ok({ ok: true })
      }
    }

    // ===== PUBLIC WEDDING =====
    const ps = route.match(/^\/public\/wedding\/([^\/]+)$/)
    if (ps && method === 'GET') {
      const slug = ps[1]
      const url = new URL(request.url)
      const onboardToken = url.searchParams.get('onboardToken')
      // Match by slug OR websiteSlug so the customer's chosen URL works.
      const matchSlug = { $or: [{ slug }, { websiteSlug: slug }] }
      let w
      if (onboardToken) {
        // Include soft-deleted records so we can return a proper "preview was deleted" message
        w = await db.collection('weddings').findOne({ ...matchSlug, onboardToken })
        if (w?.deletedAt) {
          return new NextResponse(JSON.stringify({
            error: 'This preview is no longer available. Drafts are kept for 5 days. Please contact our studio to start fresh.',
            expired: true,
            permanentlyExpired: true,
            canReactivate: false,
          }), { status: 410, headers: { 'content-type': 'application/json' } })
        }
      } else {
        // No token: published OR draft (any visitor can preview an unpublished
        // draft via the customer's chosen URL — slug is hard to guess + 24h expiry applies).
        w = await db.collection('weddings').findOne({ ...matchSlug, deletedAt: { $exists: false } })
      }
      if (!w) return err('Wedding not found or unpublished', 404)

      // For tokenless access to drafts, still enforce the lifecycle so the
      // partner/visitor doesn't see an expired or 5-day-old draft.
      const isDraftAccess = !onboardToken && w.status !== 'published' && w.paymentStatus !== 'approved'
      if (onboardToken || isDraftAccess) {
        // First, the hard 5-day deletion
        w = await applyHardDeleteIfDue(db, w)
        if (w?.deletedAt) {
          return new NextResponse(JSON.stringify({
            error: 'This preview is no longer available. Drafts are kept for 5 days. Please contact our studio to start fresh.',
            expired: true,
            permanentlyExpired: true,
            canReactivate: false,
          }), { status: 410, headers: { 'content-type': 'application/json' } })
        }
        // Only the owner (with token) extends the 24h timer when they peek.
        if (onboardToken) w = await markPreviewViewedOnce(db, w)
        if (isPreviewExpired(w)) {
          return new NextResponse(JSON.stringify({
            error: 'Your preview is currently inactive.',
            expired: true,
            canReactivate: !!onboardToken,
            statusToken: w.statusToken || null,
          }), { status: 410, headers: { 'content-type': 'application/json' } })
        }
      }

      // INVITE PASSWORD GATE — only enforced on PUBLISHED weddings (the public live
      // invite). On a preview (onboardToken) the password is intentionally bypassed
      // so the couple can see exactly what they configured before it goes live.
      if (!onboardToken && !isInviteUnlocked(request, w)) {
        return new NextResponse(JSON.stringify({
          requiresPassword: true,
          prompt: w.invitePassword.prompt || 'This invitation is private.',
          brideName: w.brideName,
          groomName: w.groomName,
          template: w.template,
          slug: w.slug,
        }), { status: 423, headers: { 'content-type': 'application/json' } })
      }

      const { _id, userId, publishCodeHash, ownerToken: _ot, ownerWhatsapp, ...rest } = w
      // Public preview must not leak the long-lived ownerToken or any
      // legacy PIN material. We expose only the last 4 digits of the
      // owner's WhatsApp for friendly UI strings.
      rest.ownerWhatsappLast4 = (ownerWhatsapp || '').slice(-4)
      // View tracking — increment total + today bucket (de-dup obvious bot calls with simple UA filter)
      try {
        const day = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
        await db.collection('weddings').updateOne(
          { id: w.id },
          { $inc: { viewCount: 1, [`viewsByDay.${day}`]: 1 } }
        )
      } catch (_) {}
      // Compute RSVP closed status — when true, also flip rsvpSettings.enabled = false so all 12 templates auto-hide RSVP
      const rsvpClosed = isRsvpClosed(rest)
      if (rsvpClosed) {
        rest.rsvpSettings = { ...(rest.rsvpSettings || {}), enabled: false }
      }
      rest.rsvpClosed = rsvpClosed
      rest.photoWallOpensAt = computePhotoWallOpensAt(rest)
      // Never leak server-side counters or client-access creds to the public endpoint
      delete rest.viewCount
      delete rest.viewsByDay
      delete rest.clientAccess
      delete rest.invitePassword
      // Strip sensitive payment artefacts — preview UI only needs paymentStatus + statusToken
      delete rest.paymentScreenshot
      delete rest.paymentTxnRef
      delete rest.paymentNote
      delete rest.paymentAttempts
      delete rest.paymentRejectionReason
      delete rest.onboardEmail
      return ok({ wedding: rest })
    }

    // Public: list available preview slugs per template (used by landing page)
    if (route === '/public/previews' && method === 'GET') {
      const items = await db.collection('weddings').find({
        isDemo: true,
        status: 'published',
        deletedAt: { $exists: false },
      }).project({ _id: 0, template: 1, slug: 1, heroImage: 1 }).toArray()
      // Map<templateName, { slug, heroImage }>
      const map = {}
      for (const w of items) {
        // First-write-wins (uniqueness enforced server-side anyway)
        if (!map[w.template]) map[w.template] = { slug: w.slug, heroImage: w.heroImage || null }
      }
      return ok({ previews: map })
    }

    // ===== RSVP =====
    if (route === '/rsvp' && method === 'POST') {
      const body = await request.json()
      if (!body.weddingSlug || !body.name || !body.attending) return err('Missing fields')
      const w = await db.collection('weddings').findOne({ slug: body.weddingSlug, status: 'published', deletedAt: { $exists: false } })
      if (!w) return err('Wedding not found', 404)
      if (!isInviteUnlocked(request, w)) return err('This invitation is private.', 423)
      // Enforce per-plan RSVP cap
      const plan = getPlanFor(w)
      const rsvpCount = await db.collection('rsvps').countDocuments({ weddingId: w.id })
      if (rsvpCount >= plan.limits.maxRsvpResponses) {
        return err('RSVPs are no longer being accepted for this wedding. Please reach out to the couple directly.', 423)
      }
      // Plan-based gating on advanced RSVP fields
      const mealPrefs = plan.features.mealPreferences ? (body.mealPreferences || []) : []
      const rsvp = {
        id: uuidv4(),
        weddingId: w.id,
        weddingSlug: w.slug,
        name: body.name,
        email: body.email || '',
        phone: body.phone || '',
        attending: body.attending,
        guests: Number(body.guests) || 1,
        mealPreferences: mealPrefs,
        message: body.message || '',
        status: 'new',
        createdAt: new Date(),
      }
      await db.collection('rsvps').insertOne(rsvp)
      const { _id, ...rest } = rsvp
      return ok({ rsvp: rest })
    }

    if (route === '/rsvp' && method === 'GET') {
      const u = getAuthUser(request)
      if (!u) return err('Unauthorized', 401)
      const url = new URL(request.url)
      const weddingId = url.searchParams.get('weddingId')
      if (!weddingId) return err('Missing weddingId')
      const w = await db.collection('weddings').findOne({ id: weddingId, userId: u.id })
      if (!w) return err('Not found', 404)
      const rsvps = await db.collection('rsvps').find({ weddingId }).sort({ createdAt: -1 }).toArray()
      return ok({ rsvps: rsvps.map(({ _id, ...r }) => r) })
    }

    if (route === '/rsvp/export' && method === 'GET') {
      const u = getAuthUser(request)
      if (!u) return err('Unauthorized', 401)
      const url = new URL(request.url)
      const weddingId = url.searchParams.get('weddingId')
      if (!weddingId) return err('Missing weddingId')
      const w = await db.collection('weddings').findOne({ id: weddingId, userId: u.id })
      if (!w) return err('Not found', 404)
      const rsvps = await db.collection('rsvps').find({ weddingId }).sort({ createdAt: -1 }).toArray()
      const headers = ['Name', 'Email', 'Phone', 'Attending', 'Guests', 'Meals', 'Message', 'Submitted']
      const rows = rsvps.map(r => [
        r.name, r.email || '', r.phone || '', r.attending, r.guests,
        (r.mealPreferences || []).join('; '), (r.message || '').replace(/\n/g, ' '),
        new Date(r.createdAt).toISOString()
      ])
      const csv = [headers, ...rows].map(row =>
        row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')
      ).join('\n')
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="rsvps-${w.slug}.csv"`,
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    // ===== PHOTO WALL =====
    // Public: list approved photos for a wedding (used by live gallery polling)
    const pwPublic = route.match(/^\/photo-wall\/public\/([^\/]+)$/)
    if (pwPublic && method === 'GET') {
      const slug = pwPublic[1]
      const w = await db.collection('weddings').findOne({ slug, status: 'published', deletedAt: { $exists: false } })
      if (!w) return err('Wedding not found', 404)
      // Gate behind invite password — don't leak photo wall data
      if (!isInviteUnlocked(request, w)) return err('This invitation is private.', 423)
      const photos = await db.collection('photo_wall').find({
        weddingId: w.id,
        status: 'approved',
      }).sort({ approvedAt: -1, createdAt: -1 }).limit(200).toArray()
      const opensAt = computePhotoWallOpensAt(w)
      const isLocked = opensAt ? Date.now() < new Date(opensAt).getTime() : false
      return ok({
        photos: photos.map(({ _id, ...p }) => p),
        enabled: !!w.advancedSettings?.photoWall?.enabled,
        title: w.advancedSettings?.photoWall?.title || 'Guest Photo Wall',
        opensAt,
        isLocked,
        isDemo: !!w.isDemo,
        template: w.template,
      })
    }

    // Public: guest uploads a photo
    if (route === '/photo-wall' && method === 'POST') {
      const body = await request.json()
      const { weddingSlug, dataUri, uploaderName, caption } = body || {}
      if (!weddingSlug || !dataUri || !uploaderName) return err('Missing fields')
      const name = String(uploaderName).trim().slice(0, 80)
      const cap = String(caption || '').trim().slice(0, 240)
      if (!name) return err('Name required')
      if (dataUri.length > 14 * 1024 * 1024) return err('Image too large (max ~10MB)')
      const w = await db.collection('weddings').findOne({ slug: weddingSlug, status: 'published', deletedAt: { $exists: false } })
      if (!w) return err('Wedding not found', 404)
      if (!isInviteUnlocked(request, w)) return err('This invitation is private.', 423)
      if (!w.advancedSettings?.photoWall?.enabled) return err('Photo wall is disabled for this wedding', 403)
      if (w.isDemo) return err('Uploads disabled on demo pages', 403)
      // Plan gate — photoWall feature flag + per-plan max uploads
      const plan = getPlanFor(w)
      if (!plan.features.photoWall) return err('Live Photo Wall is part of the Grand and Elegant experiences.', 403)
      const totalCount = await db.collection('photo_wall').countDocuments({
        weddingId: w.id, status: { $in: ['pending', 'approved'] },
      })
      if (totalCount >= plan.limits.maxLiveWallUploads) {
        return err('The photo wall has reached its capacity. Thank you for sharing!', 423)
      }
      // Lock until first event starts
      const opensAt = computePhotoWallOpensAt(w)
      if (opensAt && Date.now() < new Date(opensAt).getTime()) {
        return err('Photo wall is not yet open. Please wait until the ceremony starts.', 423)
      }
      const pendingCount = await db.collection('photo_wall').countDocuments({ weddingId: w.id, status: 'pending' })
      if (pendingCount >= 60) return err('Moderation queue full — please try again later', 429)
      const folder = `vivoha/photo-wall/${w.slug}`
      const uploaded = await uploadDataUri(dataUri, folder)
      const photo = {
        id: uuidv4(),
        weddingId: w.id,
        weddingSlug: w.slug,
        uploaderName: name,
        caption: cap,
        image: uploaded,
        status: 'pending',
        createdAt: new Date(),
      }
      await db.collection('photo_wall').insertOne(photo)
      const { _id, ...rest } = photo
      return ok({ photo: rest }, 201)
    }

    // Admin: directly add a photo (used for previews — auto-approved, no moderation)
    if (route === '/photo-wall/admin-add' && method === 'POST') {
      const u = getAuthUser(request)
      if (!u) return err('Unauthorized', 401)
      const body = await request.json()
      const { weddingId, dataUri, uploaderName, caption } = body || {}
      if (!weddingId || !dataUri || !uploaderName) return err('Missing fields')
      if (typeof dataUri !== 'string' || !dataUri.startsWith('data:image/')) return err('Invalid image data')
      if (dataUri.length > 14 * 1024 * 1024) return err('Image too large (max ~10MB)')
      const w = await db.collection('weddings').findOne({ id: weddingId, userId: u.id })
      if (!w) return err('Not found', 404)
      // Real weddings — gate by plan; demos are unrestricted (used for showcasing)
      if (!w.isDemo) {
        const plan = getPlanFor(w)
        if (!plan.features.photoWall) return err('Live Photo Wall is part of the Grand and Elegant experiences.', 403)
        const total = await db.collection('photo_wall').countDocuments({
          weddingId: w.id, status: { $in: ['pending', 'approved'] },
        })
        if (total >= plan.limits.maxLiveWallUploads) {
          return err('Photo wall capacity reached for this plan.', 423)
        }
      }
      const folder = `vivoha/photo-wall/${w.slug}`
      const uploaded = await uploadDataUri(dataUri, folder)
      const photo = {
        id: uuidv4(),
        weddingId: w.id,
        weddingSlug: w.slug,
        uploaderName: String(uploaderName).trim().slice(0, 80),
        caption: String(caption || '').trim().slice(0, 240),
        image: uploaded,
        status: 'approved',
        approvedAt: new Date(),
        createdAt: new Date(),
        addedByAdmin: true,
      }
      await db.collection('photo_wall').insertOne(photo)
      const { _id, ...rest } = photo
      return ok({ photo: rest }, 201)
    }

    // Admin: ZIP download of approved photos
    const pwZip = route.match(/^\/photo-wall\/zip\/([^\/]+)$/)
    if (pwZip && method === 'GET') {
      const u = getAuthUser(request)
      if (!u) {
        // Allow token via query param for direct browser downloads
        const url = new URL(request.url)
        const t = url.searchParams.get('token')
        if (!t) return err('Unauthorized', 401)
        const { verifyToken } = await import('@/lib/server')
        const v = verifyToken(t)
        if (!v) return err('Unauthorized', 401)
      }
      const wid = pwZip[1]
      const w = await db.collection('weddings').findOne({ id: wid })
      if (!w) return err('Not found', 404)
      const photos = await db.collection('photo_wall').find({ weddingId: wid, status: 'approved' }).sort({ approvedAt: -1 }).toArray()
      if (photos.length === 0) return err('No approved photos to download', 404)
      const { buildPhotoZip } = await import('@/lib/zip')
      const buffer = await buildPhotoZip(photos, w.slug)
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${w.slug}-photo-wall.zip"`,
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    // Admin: list all photos for a wedding (with optional status filter)
    if (route === '/photo-wall' && method === 'GET') {
      const u = getAuthUser(request)
      if (!u) return err('Unauthorized', 401)
      const url = new URL(request.url)
      const weddingId = url.searchParams.get('weddingId')
      const status = url.searchParams.get('status') // pending | approved | rejected | all
      const filter = {}
      if (weddingId) {
        const w = await db.collection('weddings').findOne({ id: weddingId, userId: u.id })
        if (!w) return err('Not found', 404)
        filter.weddingId = weddingId
      } else {
        // List across all of this user's weddings
        const wids = await db.collection('weddings').find({ userId: u.id, deletedAt: { $exists: false } }).project({ id: 1, _id: 0 }).toArray()
        filter.weddingId = { $in: wids.map(w => w.id) }
      }
      if (status && status !== 'all') filter.status = status
      const photos = await db.collection('photo_wall').find(filter).sort({ createdAt: -1 }).limit(500).toArray()
      return ok({ photos: photos.map(({ _id, ...p }) => p) })
    }

    // Admin: photo wall stats — pending count per wedding
    if (route === '/photo-wall/stats' && method === 'GET') {
      const u = getAuthUser(request)
      if (!u) return err('Unauthorized', 401)
      const weddings = await db.collection('weddings').find({ userId: u.id, deletedAt: { $exists: false } }).toArray()
      const wids = weddings.map(w => w.id)
      const counts = await db.collection('photo_wall').aggregate([
        { $match: { weddingId: { $in: wids } } },
        { $group: { _id: { weddingId: '$weddingId', status: '$status' }, n: { $sum: 1 } } },
      ]).toArray()
      const map = {}
      for (const c of counts) {
        const wid = c._id.weddingId
        if (!map[wid]) map[wid] = { pending: 0, approved: 0, rejected: 0 }
        map[wid][c._id.status] = c.n
      }
      const items = weddings
        .filter(w => w.advancedSettings?.photoWall?.enabled)
        .map(w => ({
          weddingId: w.id,
          slug: w.slug,
          brideName: w.brideName,
          groomName: w.groomName,
          template: w.template,
          status: w.status,
          isDemo: !!w.isDemo,
          counts: map[w.id] || { pending: 0, approved: 0, rejected: 0 },
        }))
      return ok({ weddings: items })
    }

    // Admin: moderate / delete a photo
    const pwm = route.match(/^\/photo-wall\/([^\/]+)$/)
    if (pwm && !['public', 'stats'].includes(pwm[1])) {
      const u = getAuthUser(request)
      if (!u) return err('Unauthorized', 401)
      const id = pwm[1]
      const photo = await db.collection('photo_wall').findOne({ id })
      if (!photo) return err('Photo not found', 404)
      const w = await db.collection('weddings').findOne({ id: photo.weddingId, userId: u.id })
      if (!w) return err('Forbidden', 403)
      if (method === 'PUT') {
        const body = await request.json()
        const newStatus = body.status
        if (!['approved', 'rejected', 'pending'].includes(newStatus)) return err('Invalid status')
        const update = { status: newStatus, updatedAt: new Date() }
        if (newStatus === 'approved') update.approvedAt = new Date()
        await db.collection('photo_wall').updateOne({ id }, { $set: update })
        const fresh = await db.collection('photo_wall').findOne({ id })
        const { _id, ...rest } = fresh
        return ok({ photo: rest })
      }
      if (method === 'DELETE') {
        try { if (photo.image?.publicId) await destroyImage(photo.image.publicId) } catch (_) {}
        await db.collection('photo_wall').deleteOne({ id })
        return ok({ ok: true })
      }
    }

    // ===== UPLOAD =====
    if (route === '/upload' && method === 'POST') {
      const u = getAuthUser(request)
      if (!u) return err('Unauthorized', 401)
      const body = await request.json()
      if (!body.dataUri) return err('Missing dataUri')
      const folder = body.folder || `vivoha/${u.id}`
      const result = await uploadDataUri(body.dataUri, folder)
      return ok(result)
    }

    if (route === '/upload' && method === 'DELETE') {
      const u = getAuthUser(request)
      if (!u) return err('Unauthorized', 401)
      const body = await request.json()
      if (!body.publicId) return err('Missing publicId')
      const r = await destroyImage(body.publicId)
      return ok(r)
    }

    // ===== LEADS (Contact form) =====
    if (route === '/leads' && method === 'POST') {
      const body = await request.json()
      const name = (body.name || '').trim()
      const phone = (body.phone || '').trim()
      const email = (body.email || '').trim().toLowerCase()
      // Phone is optional. Need at least name + (phone or email) to be useful.
      if (!name) return err('Name is required')
      if (!phone && !email) return err('Phone or email is required')
      if (name.length > 120 || phone.length > 40 || (email && email.length > 160)) return err('Field too long')

      // Dedupe by email — if a lead with this email already exists, just merge
      // any new/non-empty fields onto the existing record instead of polluting
      // the table with repeats (e.g. user trying multiple demos).
      if (email) {
        const existing = await db.collection('leads').findOne({ email })
        if (existing) {
          const merge = { updatedAt: new Date() }
          if (phone && !existing.phone) merge.phone = phone
          if (body.partnerName && !existing.partnerName) merge.partnerName = String(body.partnerName).trim().slice(0, 120)
          if (body.weddingDate && !existing.weddingDate) merge.weddingDate = String(body.weddingDate).slice(0, 32)
          if (body.city && !existing.city) merge.city = String(body.city).trim().slice(0, 80)
          if (body.budget && !existing.budget) merge.budget = String(body.budget).trim().slice(0, 40)
          if (body.templateInterest) merge.templateInterest = String(body.templateInterest).trim().slice(0, 80)
          if (body.message) merge.lastMessage = String(body.message).trim().slice(0, 2000)
          if (body.source) merge.lastSource = String(body.source).slice(0, 40)
          await db.collection('leads').updateOne(
            { id: existing.id },
            { $set: merge, $inc: { touchCount: 1 } }
          )
          const { _id, ...existingRest } = existing
          return ok({ lead: { ...existingRest, ...merge }, deduped: true })
        }
      }

      const lead = {
        id: uuidv4(),
        name,
        phone,
        email,
        partnerName: (body.partnerName || '').trim().slice(0, 120),
        weddingDate: (body.weddingDate || '').slice(0, 32),
        city: (body.city || '').trim().slice(0, 80),
        budget: (body.budget || '').trim().slice(0, 40),
        templateInterest: (body.templateInterest || '').trim().slice(0, 80),
        message: (body.message || '').trim().slice(0, 2000),
        source: (body.source || 'landing').slice(0, 40),
        status: 'new',
        touchCount: 1,
        createdAt: new Date(),
      }
      await db.collection('leads').insertOne(lead)
      const { _id, ...rest } = lead
      return ok({ lead: rest }, 201)
    }

    if (route === '/leads' && method === 'GET') {
      const u = getAuthUser(request)
      if (!u) return err('Unauthorized', 401)
      const url = new URL(request.url)
      const status = url.searchParams.get('status') || 'all'
      const filter = {}
      if (status !== 'all') filter.status = status
      const items = await db.collection('leads').find(filter).sort({ createdAt: -1 }).limit(500).toArray()
      return ok({ leads: items.map(({ _id, ...r }) => r) })
    }

    const lm = route.match(/^\/leads\/([^\/]+)$/)
    if (lm) {
      const u = getAuthUser(request)
      if (!u) return err('Unauthorized', 401)
      const id = lm[1]
      if (method === 'PUT') {
        const body = await request.json()
        const update = {}
        if (body.status) update.status = body.status
        if (body.notes !== undefined) update.notes = String(body.notes).slice(0, 4000)
        update.updatedAt = new Date()
        await db.collection('leads').updateOne({ id }, { $set: update })
        const updated = await db.collection('leads').findOne({ id })
        if (!updated) return err('Not found', 404)
        const { _id, ...rest } = updated
        return ok({ lead: rest })
      }
      if (method === 'DELETE') {
        await db.collection('leads').deleteOne({ id })
        return ok({ ok: true })
      }
    }

    if (route === '/leads/export' && method === 'GET') {
      const u = getAuthUser(request)
      if (!u) return err('Unauthorized', 401)
      const items = await db.collection('leads').find({}).sort({ createdAt: -1 }).toArray()
      const headers = ['Name', 'Phone', 'Email', 'Partner', 'Wedding Date', 'City', 'Budget', 'Template Interest', 'Message', 'Status', 'Source', 'Submitted']
      const rows = items.map(r => [
        r.name, r.phone || '', r.email || '', r.partnerName || '', r.weddingDate || '',
        r.city || '', r.budget || '', r.templateInterest || '', (r.message || '').replace(/\n/g, ' '),
        r.status || 'new', r.source || '', new Date(r.createdAt).toISOString(),
      ])
      const csv = [headers, ...rows].map(row =>
        row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')
      ).join('\n')
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="vivoha-leads.csv"`,
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    // ===== REVENUE =====
    if (route === '/revenue' && method === 'GET') {
      const u = getAuthUser(request)
      if (!u) return err('Unauthorized', 401)
      const url = new URL(request.url)
      const plan = url.searchParams.get('plan') // optional filter
      const filter = {}
      if (plan && plan !== 'all') {
        const np = normalisePlan(plan)
        if (np) filter.plan = np
      }
      const items = await db.collection('revenues').find(filter).sort({ createdAt: -1 }).limit(500).toArray()
      return ok({ revenues: items.map(({ _id, ...r }) => r), planPrices: PLAN_PRICES })
    }

    if (route === '/revenue/stats' && method === 'GET') {
      const u = getAuthUser(request)
      if (!u) return err('Unauthorized', 401)
      const items = await db.collection('revenues').find({}).toArray()
      const byPlan = { classic: 0, grand: 0, eternal: 0 }
      const countByPlan = { classic: 0, grand: 0, eternal: 0 }
      let total = 0
      for (const r of items) {
        total += r.amount || 0
        if (r.plan in byPlan) {
          byPlan[r.plan] += r.amount || 0
          countByPlan[r.plan] += 1
        }
      }
      // Last 30 days
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const last30 = items.filter(r => new Date(r.createdAt) >= cutoff)
        .reduce((s, r) => s + (r.amount || 0), 0)
      return ok({
        total,
        last30,
        count: items.length,
        byPlan,
        countByPlan,
        planPrices: PLAN_PRICES,
      })
    }

    if (route === '/revenue/export' && method === 'GET') {
      const u = getAuthUser(request)
      if (!u) return err('Unauthorized', 401)
      const items = await db.collection('revenues').find({}).sort({ createdAt: -1 }).toArray()
      const headers = ['Date', 'Couple', 'Plan', 'Amount (INR)', 'Wedding Slug', 'Wedding ID']
      const rows = items.map(r => [
        new Date(r.createdAt).toISOString(),
        r.coupleName || '', r.plan || '', r.amount || 0, r.weddingSlug || '', r.weddingId || '',
      ])
      const csv = [headers, ...rows].map(row =>
        row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')
      ).join('\n')
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="vivoha-revenue.csv"`,
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    // ===== FORMS (one-time client submission system) =====
    if (route === '/forms' && method === 'POST') {
      const u = getAuthUser(request)
      if (!u) return err('Unauthorized', 401)
      const body = await request.json()
      const clientName = String(body.clientName || '').trim().slice(0, 120)
      if (!clientName) return err('Client name required')
      const formId = uuidv4()
      const formToken = uuidv4().replace(/-/g, '').slice(0, 24)
      // Auto-create a shortlink (uses request host as base)
      const proto = request.headers.get('x-forwarded-proto') || 'https'
      const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || ''
      const externalBase = `${proto}://${host}`
      const targetUrl = `${externalBase}/form/${formToken}`
      function gen() { return Math.random().toString(36).slice(2, 8) }
      let sid = gen()
      while (await db.collection('shortlinks').findOne({ id: sid })) sid = gen()
      const sl = { id: sid, target: targetUrl, userId: u.id, label: `form-${clientName}`.slice(0, 60), hits: 0, createdAt: new Date() }
      await db.collection('shortlinks').insertOne(sl)
      const form = {
        id: formId,
        token: formToken,
        userId: u.id,
        clientName,
        status: 'pending', // pending | submitted | converted | expired
        notes: '',
        submission: null,
        weddingId: null,
        shortlinkId: sid,
        createdAt: new Date(),
        submittedAt: null,
        convertedAt: null,
      }
      await db.collection('forms').insertOne(form)
      const { _id, ...rest } = form
      return ok({ form: rest, shortUrl: `${externalBase}/s/${sid}` }, 201)
    }

    if (route === '/forms' && method === 'GET') {
      const u = getAuthUser(request)
      if (!u) return err('Unauthorized', 401)
      const items = await db.collection('forms').find({ userId: u.id }).sort({ createdAt: -1 }).limit(500).toArray()
      return ok({ forms: items.map(({ _id, ...f }) => f) })
    }

    // Public form access (client side) — by token
    const fmPublic = route.match(/^\/forms\/public\/([^\/]+)$/)
    if (fmPublic) {
      const token = fmPublic[1]
      const form = await db.collection('forms').findOne({ token })
      if (!form) return err('Form not found', 404)
      if (method === 'GET') {
        // PRIVACY: do NOT leak submission contents over the public endpoint, ever.
        return ok({
          form: {
            id: form.id,
            clientName: form.clientName,
            status: form.status,
            submittedAt: form.submittedAt,
          },
        })
      }
      if (method === 'POST') {
        if (form.status !== 'pending') return err('This form has already been submitted.', 409)
        const body = await request.json()
        // Validate basic fields
        if (!body.brideName || !body.groomName || !body.weddingDate) return err('Bride, groom and wedding date are required')
        const submission = {
          brideName: String(body.brideName).trim().slice(0, 120),
          groomName: String(body.groomName).trim().slice(0, 120),
          tagline: String(body.tagline || '').trim().slice(0, 240),
          weddingDate: String(body.weddingDate).slice(0, 64),
          mapsLink: String(body.mapsLink || '').slice(0, 500),
          story: String(body.story || '').slice(0, 5000),
          template: String(body.template || 'Moonveil').slice(0, 80),
          heroImage: body.heroImage || null,
          gallery: Array.isArray(body.gallery) ? body.gallery.slice(0, 30) : [],
          events: Array.isArray(body.events) ? body.events.slice(0, 12) : [],
          contactPhone: String(body.contactPhone || '').slice(0, 40),
          contactEmail: String(body.contactEmail || '').slice(0, 160),
          notes: String(body.notes || '').slice(0, 2000),
          passwordProtect: !!body.passwordProtect,
          invitePassword: body.passwordProtect ? String(body.invitePassword || '').slice(0, 80) : '',
          invitePrompt: body.passwordProtect ? String(body.invitePrompt || '').slice(0, 200) : '',
        }
        await db.collection('forms').updateOne(
          { token },
          { $set: { status: 'submitted', submittedAt: new Date(), submission } }
        )
        return ok({ ok: true })
      }
    }

    // Public form image upload (uses token as auth)
    const fmUpload = route.match(/^\/forms\/public\/([^\/]+)\/upload$/)
    if (fmUpload && method === 'POST') {
      const token = fmUpload[1]
      const form = await db.collection('forms').findOne({ token })
      if (!form) return err('Form not found', 404)
      if (form.status !== 'pending') return err('This form has already been submitted.', 409)
      const body = await request.json()
      if (!body.dataUri) return err('Missing dataUri')
      if (body.dataUri.length > 14 * 1024 * 1024) return err('Image too large (max ~10MB)')
      if (typeof body.dataUri !== 'string' || !body.dataUri.startsWith('data:image/')) return err('Invalid image data')
      const folder = `vivoha/forms/${form.id}`
      const result = await uploadDataUri(body.dataUri, folder)
      return ok(result)
    }

    // Admin: form CRUD
    const fmAdmin = route.match(/^\/forms\/([^\/]+)$/)
    if (fmAdmin && !['public'].includes(fmAdmin[1])) {
      const u = getAuthUser(request)
      if (!u) return err('Unauthorized', 401)
      const id = fmAdmin[1]
      const form = await db.collection('forms').findOne({ id, userId: u.id })
      if (!form) return err('Form not found', 404)
      if (method === 'GET') { const { _id, ...rest } = form; return ok({ form: rest }) }
      if (method === 'DELETE') {
        await db.collection('forms').deleteOne({ id })
        return ok({ ok: true })
      }
      if (method === 'PUT') {
        const body = await request.json()
        const update = { updatedAt: new Date() }
        if (typeof body.notes === 'string') update.notes = body.notes.slice(0, 4000)
        if (typeof body.clientName === 'string') update.clientName = body.clientName.trim().slice(0, 120)
        await db.collection('forms').updateOne({ id }, { $set: update })
        const fresh = await db.collection('forms').findOne({ id })
        const { _id, ...rest } = fresh
        return ok({ form: rest })
      }
    }

    // Admin: convert form submission to a wedding
    const fmConvert = route.match(/^\/forms\/([^\/]+)\/convert$/)
    if (fmConvert && method === 'POST') {
      const u = getAuthUser(request)
      if (!u) return err('Unauthorized', 401)
      const id = fmConvert[1]
      const form = await db.collection('forms').findOne({ id, userId: u.id })
      if (!form) return err('Form not found', 404)
      if (form.status !== 'submitted') return err('Form has not been submitted yet', 400)
      if (form.status === 'converted' && form.weddingId) {
        const w = await db.collection('weddings').findOne({ id: form.weddingId })
        if (w) { const { _id, ...rest } = w; return ok({ wedding: rest, alreadyConverted: true }) }
      }
      const s = form.submission || {}
      let slug = slugify(`${s.brideName}-${s.groomName}`)
      let suffix = 0; let candidate = slug
      while (await db.collection('weddings').findOne({ slug: candidate, deletedAt: { $exists: false } })) {
        suffix += 1; candidate = `${slug}-${suffix}`
      }
      slug = candidate
      const wedding = {
        id: uuidv4(),
        userId: u.id,
        slug,
        brideName: s.brideName,
        groomName: s.groomName,
        tagline: s.tagline || '',
        weddingDate: s.weddingDate,
        mapsLink: s.mapsLink || '',
        story: s.story || '',
        heroImage: s.heroImage || null,
        gallery: s.gallery || [],
        template: s.template || 'Moonveil',
        status: 'draft',
        events: s.events || [],
        rsvpSettings: { enabled: true, mealOptions: ['Vegetarian', 'Non-Vegetarian'] },
        advancedSettings: { socialMedia: { instagram: '', facebook: '' }, musicEmbed: '', giftRegistryLink: '', customDomain: '', photoWall: { enabled: false, title: 'Guest Photo Wall' } },
        isDemo: false,
        isTest: false,
        plan: 'grand',
        revenueLogged: false,
        sourceFormId: form.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      // Apply password protection if client requested it
      if (s.passwordProtect && s.invitePassword) {
        wedding.invitePassword = {
          passwordHash: await hashPassword(s.invitePassword),
          prompt: s.invitePrompt || 'This invitation is private. Enter the password to view.',
          updatedAt: new Date(),
        }
      }
      await db.collection('weddings').insertOne(wedding)
      await db.collection('forms').updateOne(
        { id },
        { $set: { status: 'converted', convertedAt: new Date(), weddingId: wedding.id } }
      )
      // Log revenue if eligible (converted forms with a plan count as paying weddings)
      await logRevenueIfNeeded(db, wedding)
      const fresh = await db.collection('weddings').findOne({ id: wedding.id })
      const { _id, ...rest } = fresh
      return ok({ wedding: rest }, 201)
    }

    // ===== SHORTLINKS =====
    if (route === '/shortlinks' && method === 'POST') {
      const u = getAuthUser(request)
      if (!u) return err('Unauthorized', 401)
      const body = await request.json()
      const target = String(body.url || '').trim()
      if (!target || !/^https?:\/\//.test(target)) return err('Valid URL required')
      // Reuse existing shortlink if same URL+user
      const existing = await db.collection('shortlinks').findOne({ userId: u.id, target })
      if (existing) {
        const { _id, ...rest } = existing
        return ok({ shortlink: rest })
      }
      // Generate 6-char id, retry on collision
      function gen() {
        return Math.random().toString(36).slice(2, 8)
      }
      let sid = gen()
      while (await db.collection('shortlinks').findOne({ id: sid })) sid = gen()
      const sl = {
        id: sid,
        target,
        userId: u.id,
        label: String(body.label || '').slice(0, 120),
        hits: 0,
        createdAt: new Date(),
      }
      await db.collection('shortlinks').insertOne(sl)
      const { _id, ...rest } = sl
      return ok({ shortlink: rest })
    }

    if (route === '/shortlinks' && method === 'GET') {
      const u = getAuthUser(request)
      if (!u) return err('Unauthorized', 401)
      const items = await db.collection('shortlinks').find({ userId: u.id }).sort({ createdAt: -1 }).limit(200).toArray()
      return ok({ shortlinks: items.map(({ _id, ...s }) => s) })
    }

    // Public resolver (also used by /s/[id]/route.js)
    const slr = route.match(/^\/shortlinks\/resolve\/([^\/]+)$/)
    if (slr && method === 'GET') {
      const sid = slr[1]
      const sl = await db.collection('shortlinks').findOne({ id: sid })
      if (!sl) return err('Not found', 404)
      await db.collection('shortlinks').updateOne({ id: sid }, { $inc: { hits: 1 } })
      return ok({ target: sl.target })
    }

    // ===== ADMIN BADGES =====
    if (route === '/admin/badges' && method === 'GET') {
      const u = getAuthUser(request)
      if (!u) return err('Unauthorized', 401)
      const userWeddings = await db.collection('weddings').find({ userId: u.id, deletedAt: { $exists: false } }).project({ id: 1, _id: 0 }).toArray()
      const wids = userWeddings.map(w => w.id)
      const [photoWallPending, leadsNew, formsSubmitted, paymentsPending] = await Promise.all([
        db.collection('photo_wall').countDocuments({ weddingId: { $in: wids }, status: 'pending' }),
        db.collection('leads').countDocuments({ status: 'new' }),
        db.collection('forms').countDocuments({ userId: u.id, status: 'submitted' }),
        db.collection('weddings').countDocuments({ paymentStatus: 'verification_pending', deletedAt: { $exists: false } }),
      ])
      return ok({ photoWallPending, leadsNew, formsSubmitted, paymentsPending })
    }

    // ===== INVITE PDF =====
    const pdfm = route.match(/^\/weddings\/([^\/]+)\/invite-pdf$/)
    if (pdfm && method === 'GET') {
      const u = getAuthUser(request)
      if (!u) {
        const url = new URL(request.url)
        const t = url.searchParams.get('token')
        if (!t) return err('Unauthorized', 401)
        const { verifyToken } = await import('@/lib/server')
        const v = verifyToken(t)
        if (!v) return err('Unauthorized', 401)
      }
      const id = pdfm[1]
      const w = await db.collection('weddings').findOne({ id })
      if (!w) return err('Not found', 404)
      // Determine public link — use request host (never trust client-supplied `base` for security)
      const proto = request.headers.get('x-forwarded-proto') || 'https'
      const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || ''
      const externalBase = `${proto}://${host}`
      const publicUrl = `${externalBase}/wedding/${w.slug}`
      // Ensure shortlink exists for QR
      let sl = await db.collection('shortlinks').findOne({ userId: w.userId, target: publicUrl })
      if (!sl) {
        function gen() { return Math.random().toString(36).slice(2, 8) }
        let sid = gen()
        while (await db.collection('shortlinks').findOne({ id: sid })) sid = gen()
        sl = { id: sid, target: publicUrl, userId: w.userId, label: `${w.brideName}-${w.groomName}`, hits: 0, createdAt: new Date() }
        await db.collection('shortlinks').insertOne(sl)
      }
      const shortUrl = `${externalBase}/s/${sl.id}`
      const { buildInvitePdf } = await import('@/lib/pdf')
      const buffer = await buildInvitePdf(w, { publicUrl, shortUrl })
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${w.slug}-invite.pdf"`,
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    // ===== CLIENT DASHBOARD =====
    // Admin: create/update/remove client access for a wedding
    const ccm = route.match(/^\/weddings\/([^\/]+)\/client-access$/)
    if (ccm) {
      const u = getAuthUser(request)
      if (!u) return err('Unauthorized', 401)
      const wid = ccm[1]
      const w = await db.collection('weddings').findOne({ id: wid, userId: u.id })
      if (!w) return err('Not found', 404)
      if (method === 'GET') {
        return ok({
          enabled: !!w.clientAccess?.passwordHash,
          createdAt: w.clientAccess?.createdAt || null,
          dashboardToken: w.clientAccess?.dashboardToken || null,
        })
      }
      if (method === 'POST') {
        const body = await request.json()
        const pw = String(body.password || '')
        if (pw.length < 6) return err('Password must be at least 6 characters')
        const passwordHash = await hashPassword(pw)
        // Preserve existing dashboardToken on password rotation; generate a new one if missing.
        const dashboardToken = w.clientAccess?.dashboardToken || genDashboardToken()
        await db.collection('weddings').updateOne(
          { id: wid },
          { $set: { clientAccess: { passwordHash, dashboardToken, createdAt: w.clientAccess?.createdAt || new Date(), updatedAt: new Date() } } }
        )
        return ok({ ok: true, dashboardToken })
      }
      if (method === 'DELETE') {
        await db.collection('weddings').updateOne({ id: wid }, { $unset: { clientAccess: '' } })
        return ok({ ok: true })
      }
    }

    // Admin: rotate the couple-dashboard token (invalidates the old URL)
    const ccrm = route.match(/^\/weddings\/([^\/]+)\/client-access\/rotate$/)
    if (ccrm && method === 'POST') {
      const u = getAuthUser(request)
      if (!u) return err('Unauthorized', 401)
      const w = await db.collection('weddings').findOne({ id: ccrm[1], userId: u.id })
      if (!w || !w.clientAccess?.passwordHash) return err('Client access not enabled', 404)
      const dashboardToken = genDashboardToken()
      await db.collection('weddings').updateOne(
        { id: w.id },
        { $set: { 'clientAccess.dashboardToken': dashboardToken, 'clientAccess.updatedAt': new Date() } }
      )
      return ok({ dashboardToken })
    }

    // Public couple-dashboard login — token (in URL) + password
    if (route === '/client/login' && method === 'POST') {
      const body = await request.json()
      const dashboardToken = String(body.dashboardToken || '').trim()
      const password = String(body.password || '')
      if (!dashboardToken || !password) return err('Missing fields')
      if (!/^[a-f0-9]{16,128}$/i.test(dashboardToken)) return err('Invalid dashboard link', 404)
      const w = await db.collection('weddings').findOne({ 'clientAccess.dashboardToken': dashboardToken, deletedAt: { $exists: false } })
      if (!w || !w.clientAccess?.passwordHash) return err('Dashboard not available', 404)
      const matched = await comparePassword(password, w.clientAccess.passwordHash)
      if (!matched) return err('Invalid password', 401)
      const token = signToken({ clientFor: w.id, dashboardToken, role: 'client' })
      return ok({ token, wedding: { id: w.id, slug: w.slug, brideName: w.brideName, groomName: w.groomName, status: w.status, photoWallEnabled: !!w.advancedSettings?.photoWall?.enabled } })
    }

    // Client dashboard data — requires client JWT bound to this dashboardToken
    const cdm = route.match(/^\/client\/dashboard\/([a-f0-9]{16,128})$/i)
    if (cdm && method === 'GET') {
      const dashboardToken = cdm[1]
      const auth = request.headers.get('authorization') || ''
      const tok = auth.startsWith('Bearer ') ? auth.slice(7) : null
      const v = tok ? verifyToken(tok) : null
      if (!v || v.role !== 'client' || v.dashboardToken !== dashboardToken) return err('Unauthorized', 401)
      const w = await db.collection('weddings').findOne({ 'clientAccess.dashboardToken': dashboardToken, deletedAt: { $exists: false } })
      if (!w) return err('Not found', 404)
      const rsvps = await db.collection('rsvps').find({ weddingId: w.id }).sort({ createdAt: -1 }).toArray()
      const photoCounts = await db.collection('photo_wall').aggregate([
        { $match: { weddingId: w.id } },
        { $group: { _id: '$status', n: { $sum: 1 } } },
      ]).toArray()
      const counts = { pending: 0, approved: 0, rejected: 0 }
      for (const c of photoCounts) counts[c._id] = c.n
      // Compute 14-day view trend
      const viewsByDay = w.viewsByDay || {}
      const days = []
      for (let i = 13; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400 * 1000).toISOString().slice(0, 10)
        days.push({ day: d, views: viewsByDay[d] || 0 })
      }
      return ok({
        wedding: {
          id: w.id, slug: w.slug, brideName: w.brideName, groomName: w.groomName,
          weddingDate: w.weddingDate, status: w.status, template: w.template,
          photoWallEnabled: !!w.advancedSettings?.photoWall?.enabled,
        },
        stats: {
          totalViews: w.viewCount || 0,
          viewsByDay: days,
          totalRsvps: rsvps.length,
          attendingCount: rsvps.filter(r => r.attending === 'yes').length,
          photoCounts: counts,
        },
        rsvps: rsvps.map(({ _id, ...r }) => r),
      })
    }

    // Client RSVP CSV export
    const crm = route.match(/^\/client\/rsvp\/([a-f0-9]{16,128})\/export$/i)
    if (crm && method === 'GET') {
      const dashboardToken = crm[1]
      const url = new URL(request.url)
      const tok = url.searchParams.get('token') || ''
      const v = tok ? verifyToken(tok) : null
      if (!v || v.role !== 'client' || v.dashboardToken !== dashboardToken) return err('Unauthorized', 401)
      const w = await db.collection('weddings').findOne({ 'clientAccess.dashboardToken': dashboardToken })
      if (!w) return err('Not found', 404)
      const rsvps = await db.collection('rsvps').find({ weddingId: w.id }).sort({ createdAt: -1 }).toArray()
      const headers = ['Name', 'Email', 'Phone', 'Attending', 'Guests', 'Meals', 'Message', 'Submitted']
      const rows = rsvps.map(r => [
        r.name, r.email || '', r.phone || '', r.attending, r.guests,
        (r.mealPreferences || []).join('; '), (r.message || '').replace(/\n/g, ' '),
        new Date(r.createdAt).toISOString(),
      ])
      const csv = [headers, ...rows].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="rsvps-${w.slug}.csv"`,
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    // Client photo wall ZIP — token-only auth
    const czm = route.match(/^\/client\/photo-wall\/zip\/([a-f0-9]{16,128})$/i)
    if (czm && method === 'GET') {
      const dashboardToken = czm[1]
      const url = new URL(request.url)
      const tok = url.searchParams.get('token') || ''
      const v = tok ? verifyToken(tok) : null
      if (!v || v.role !== 'client' || v.dashboardToken !== dashboardToken) return err('Unauthorized', 401)
      const w = await db.collection('weddings').findOne({ 'clientAccess.dashboardToken': dashboardToken })
      if (!w) return err('Not found', 404)
      const photos = await db.collection('photo_wall').find({ weddingId: w.id, status: 'approved' }).sort({ approvedAt: -1 }).toArray()
      if (photos.length === 0) return err('No approved photos to download', 404)
      const { buildPhotoZip } = await import('@/lib/zip')
      const buffer = await buildPhotoZip(photos, w.slug)
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${w.slug}-photo-wall.zip"`,
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    // Client photo wall LIST — token-only auth (replaces public photo-wall endpoint inside couple dashboard)
    const cpm = route.match(/^\/client\/photo-wall\/list\/([a-f0-9]{16,128})$/i)
    if (cpm && method === 'GET') {
      const dashboardToken = cpm[1]
      const auth = request.headers.get('authorization') || ''
      const tok = auth.startsWith('Bearer ') ? auth.slice(7) : null
      const v = tok ? verifyToken(tok) : null
      if (!v || v.role !== 'client' || v.dashboardToken !== dashboardToken) return err('Unauthorized', 401)
      const w = await db.collection('weddings').findOne({ 'clientAccess.dashboardToken': dashboardToken })
      if (!w) return err('Not found', 404)
      const photos = await db.collection('photo_wall').find({
        weddingId: w.id, status: 'approved',
      }).sort({ approvedAt: -1, createdAt: -1 }).limit(500).toArray()
      return ok({ photos: photos.map(({ _id, ...p }) => p) })
    }

    // ===== INVITE PASSWORD (couple-facing site password) =====
    // Admin: set/get/remove the invite password
    const ipm = route.match(/^\/weddings\/([^\/]+)\/invite-password$/)
    if (ipm) {
      const u = getAuthUser(request)
      if (!u) return err('Unauthorized', 401)
      const wid = ipm[1]
      const w = await db.collection('weddings').findOne({ id: wid, userId: u.id })
      if (!w) return err('Not found', 404)
      if (method === 'GET') {
        return ok({ enabled: !!w.invitePassword?.passwordHash, prompt: w.invitePassword?.prompt || '' })
      }
      if (method === 'POST') {
        const body = await request.json()
        const pw = String(body.password || '')
        if (pw.length < 4) return err('Use at least 4 characters')
        const passwordHash = await hashPassword(pw)
        const prompt = String(body.prompt || '').slice(0, 200) || 'This invitation is private. Enter the password to view.'
        await db.collection('weddings').updateOne(
          { id: wid },
          { $set: { invitePassword: { passwordHash, prompt, updatedAt: new Date() } } }
        )
        return ok({ ok: true })
      }
      if (method === 'DELETE') {
        await db.collection('weddings').updateOne({ id: wid }, { $unset: { invitePassword: '' } })
        return ok({ ok: true })
      }
    }

    // Public: guest unlocks an invite — sets HttpOnly cookie + returns success.
    // NOTE: no rate-limiting here — guests may fumble the password and we don't want to lock
    // out the entire invite for everyone behind the same NAT.
    if (route === '/invite/auth' && method === 'POST') {
      const body = await request.json()
      const slug = String(body.slug || '').trim()
      const password = String(body.password || '')
      if (!slug || !password) return err('Missing fields')
      const w = await db.collection('weddings').findOne({ slug, deletedAt: { $exists: false } })
      if (!w || !w.invitePassword?.passwordHash) return err('No password set for this invite', 404)
      const matched = await comparePassword(password, w.invitePassword.passwordHash)
      if (!matched) return err('Incorrect password', 401)
      const token = signToken({ invite: w.id, slug, role: 'invite' }, '30d')
      const res = NextResponse.json({ ok: true, token }, { status: 200 })
      // 30-day cookie (HttpOnly, SameSite=Lax). Cookie name is per-slug so different invites don't collide.
      res.cookies.set(`vivoha_invite_${slug}`, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: true,
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      })
      return res
    }

    // ===== PLANS (public catalog) =====
    if (route === '/plans' && method === 'GET') {
      return ok({ plans: PLAN_CONFIG, order: Object.values(PLAN_CONFIG).sort((a, b) => a.order - b.order).map(p => p.id) })
    }

    // =====================================================================
    // ===== SELF-SERVE ONBOARDING & PAYMENT FLOW (Jan 2026 restructure) =====
    // =====================================================================

    // Public: get payment config (QR per plan + UPI + WhatsApp)
    // =====================================================================
    // RAZORPAY — Order create + signature verify. All sensitive ops are
    // server-side. The frontend never sees RAZORPAY_KEY_SECRET.
    // =====================================================================

    // POST /api/create-order  { amount, currency, receipt, notes }
    // Returns { orderId, amount, currency, keyId }
    if (route === '/create-order' && method === 'POST') {
      const body = await request.json().catch(() => ({}))
      const amountRupees = Number(body.amount)
      if (!Number.isFinite(amountRupees) || amountRupees < 1) return err('Invalid amount', 400)
      const currency = String(body.currency || 'INR').toUpperCase().slice(0, 8)
      const receipt = String(body.receipt || `viv-${Date.now()}`).slice(0, 40)
      const notes = (body.notes && typeof body.notes === 'object') ? body.notes : {}
      const amountPaise = Math.round(amountRupees * 100)

      let order
      if (isRazorpayMocked()) {
        // Test/demo mode — mint a placeholder order id so the frontend can
        // still open Razorpay's checkout (which will fall through to a test
        // success that our /verify-payment endpoint also accepts in mock).
        order = {
          id: `order_mock_${randomBytes(10).toString('hex')}`,
          amount: amountPaise,
          currency,
          receipt,
          status: 'created',
        }
      } else {
        try {
          order = await getRazorpay().orders.create({
            amount: amountPaise,
            currency,
            receipt,
            notes,
            payment_capture: 1,
          })
        } catch (e) {
          console.error('Razorpay order create failed:', e?.error || e)
          return err(e?.error?.description || "Couldn't create your order", 502)
        }
      }
      // Persist the order so we can match it on verify and back-link to the wedding.
      await db.collection('rzp_orders').insertOne({
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt,
        notes,
        status: 'created',
        createdAt: new Date(),
      })
      return ok({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
      })
    }

    // POST /api/verify-payment
    //   { razorpay_order_id, razorpay_payment_id, razorpay_signature, onboardToken }
    // Verifies HMAC SHA256 signature, marks the wedding live, sends WhatsApp.
    if (route === '/verify-payment' && method === 'POST') {
      const body = await request.json().catch(() => ({}))
      const order_id = String(body.razorpay_order_id || '')
      const payment_id = String(body.razorpay_payment_id || '')
      const sig = String(body.razorpay_signature || '')
      const onboardToken = String(body.onboardToken || body.coupleId || '')
      if (!order_id || !payment_id || !onboardToken) {
        return err('Missing payment fields', 400)
      }

      // 1. Signature verify
      const secret = process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret'
      const expected = createHmac('sha256', secret).update(`${order_id}|${payment_id}`).digest('hex')
      const sigOk = sig && expected === sig
      // In mock mode (test placeholder keys) we accept any signature so the
      // demo flow remains exercisable end-to-end. Production (real keys) is
      // strict — mismatched signatures are rejected with 400 and the wedding
      // is NOT published.
      if (!sigOk && !isRazorpayMocked()) {
        await db.collection('rzp_orders').updateOne(
          { id: order_id },
          { $set: { status: 'signature_failed', paymentId: payment_id, updatedAt: new Date() } },
        )
        return err('Payment verification failed', 400)
      }

      // 2. Resolve wedding
      const w = await db.collection('weddings').findOne({ onboardToken, deletedAt: { $exists: false } })
      if (!w) return err('Onboarding session not found', 404)

      const now = new Date()
      const statusToken = w.statusToken || generateStatusToken()
      // Mint ownerToken now if it doesn't exist (legacy path)
      const ownerToken = w.ownerToken || randomBytes(24).toString('base64url')

      // 3. Mark wedding live (auto-publish, no admin review)
      await db.collection('weddings').updateOne(
        { id: w.id },
        {
          $set: {
            paymentStatus: 'approved',
            paymentApprovedAt: now,
            paymentApprovedBy: 'razorpay',
            paymentProvider: 'razorpay',
            paymentOrderId: order_id,
            paymentId: payment_id,
            status: 'published',
            slugStatus: 'published',
            slugLockedAt: now,
            statusToken,
            ownerToken,
            updatedAt: now,
          },
          $push: {
            paymentAttempts: {
              id: uuidv4(),
              provider: 'razorpay',
              orderId: order_id,
              paymentId: payment_id,
              amount: w.paymentAmount || 0,
              status: 'approved',
              createdAt: now,
              resolvedAt: now,
            },
          },
        },
      )

      // 4. Update orders table
      await db.collection('rzp_orders').updateOne(
        { id: order_id },
        { $set: { status: 'paid', weddingId: w.id, paymentId: payment_id, signatureOk: sigOk, updatedAt: now } },
        { upsert: true },
      )

      // 5. Revenue log
      const fresh = await db.collection('weddings').findOne({ id: w.id })
      await logRevenueIfNeeded(db, fresh)

      // 6. Build URLs (absolute) for WhatsApp + redirect
      const proto = request.headers.get('x-forwarded-proto') || 'https'
      const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || ''
      const base = `${proto}://${host}`
      const websiteUrl = `${base}/wedding/${fresh.slug}`
      const hubUrl = `${base}/hub/manage/${ownerToken}`

      // 7. WhatsApp notify (mock — logged to whatsapp_log so admin can replay).
      // To wire a real provider (Twilio / Gupshup / Meta Cloud API), implement
      // sendWhatsapp() and call it here instead of just logging.
      const waBody = `🎊 Your Vivoha website is live!\nShare this with your guests: ${websiteUrl}\nWelcome to your Wedding Hub: ${hubUrl}\n— Team Vivoha`
      try {
        await db.collection('whatsapp_log').insertOne({
          id: uuidv4(),
          to: fresh.ownerWhatsapp || fresh.onboardPhone || '',
          weddingId: fresh.id,
          type: 'website_live',
          body: waBody,
          sent: false,
          createdAt: now,
        })
      } catch (_) {}

      // 8. Email log (kept for parity with existing logEmail flow)
      await logEmail(db, {
        type: 'website_published',
        to: fresh.onboardEmail,
        weddingId: fresh.id,
        statusToken: fresh.statusToken,
        subject: 'Your Vivoha invitation is live ✨',
        body: `Congratulations ${fresh.brideName} & ${fresh.groomName}! Your wedding website is live: ${websiteUrl}`,
      })

      return ok({ success: true, websiteUrl, hubUrl, ownerToken })
    }

    // =====================================================================
    // /api/check-url  — slug availability for couples picking a wedding URL
    // =====================================================================
    if (route === '/check-url' && method === 'GET') {
      const url = new URL(request.url)
      const raw = String(url.searchParams.get('slug') || '').toLowerCase().trim()
      const exclude = String(url.searchParams.get('exclude') || '').trim()
      const slugOk = /^[a-z0-9]([a-z0-9-]{1,28})[a-z0-9]$/.test(raw)
      if (!slugOk) {
        return ok({ available: false, reason: 'invalid', suggestions: [] })
      }
      // Reserved words — never allow these as wedding URLs.
      const RESERVED = new Set([
        'admin', 'api', 'www', 'vivoha', 'help', 'support', 'blog', 'app',
        'preview', 'hub', 'login', 'logout', 'demo', 'wedding', 'onboard',
        'publish', 'payment', 'status', 'static', 'public', 'dashboard',
        'about', 'contact', 'privacy', 'terms',
      ])
      if (RESERVED.has(raw)) {
        return ok({ available: false, reason: 'reserved', suggestions: [`${raw}-2026`, `${raw}-wedding`, `our-${raw}`] })
      }
      const filter = { slug: raw, deletedAt: { $exists: false } }
      const exists = await db.collection('weddings').findOne(filter, { projection: { id: 1, onboardToken: 1 } })
      // If the existing record is the SAME couple (their own slug, identified
      // via the exclude= onboardToken query) treat it as available so they
      // can keep their own URL on re-visits.
      const takenByOther = !!exists && exists.onboardToken !== exclude
      if (takenByOther) {
        const stems = [raw, `${raw}-2026`, `${raw}-wedding`, `our-${raw}`, `${raw}-weds`]
        return ok({ available: false, reason: 'taken', suggestions: stems.slice(1, 4) })
      }
      return ok({ available: true })
    }

    // =====================================================================
    // /api/send-preview-nudge — fires the 3-min inactivity WhatsApp reminder.
    // Idempotent — sets preview_nudge_sent=true after firing.
    // =====================================================================
    if (route === '/send-preview-nudge' && method === 'POST') {
      const body = await request.json().catch(() => ({}))
      const onboardToken = String(body.onboardToken || body.coupleId || '').trim()
      if (!onboardToken) return err('Missing session', 400)
      const w = await db.collection('weddings').findOne({ onboardToken, deletedAt: { $exists: false } })
      if (!w) return err('Onboarding session not found', 404)
      // Don't nudge if they've already published.
      if (w.status === 'published' || w.paymentStatus === 'approved') {
        return ok({ skipped: true, reason: 'already_published' })
      }
      if (w.previewNudgeSent) {
        return ok({ skipped: true, reason: 'already_sent' })
      }
      const proto = request.headers.get('x-forwarded-proto') || 'https'
      const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || ''
      const previewUrl = `${proto}://${host}/preview/${w.slug}?onboardToken=${onboardToken}`
      const text = `✦ ${w.brideName || 'There'}, your Vivoha website is ready!\n\n${previewUrl}\n\nYour wedding website looks beautiful — publish it before your preview expires and share the link with your guests. 🎊\n\n— Team Vivoha`
      // Same mock channel used elsewhere: insert into whatsapp_log; a real
      // provider (Twilio/Gupshup/Meta Cloud) can subscribe here.
      try {
        await db.collection('whatsapp_log').insertOne({
          id: uuidv4(),
          to: w.ownerWhatsapp || w.onboardPhone || '',
          weddingId: w.id,
          type: 'preview_nudge',
          body: text,
          sent: false,
          createdAt: new Date(),
        })
      } catch (_) {}
      await db.collection('weddings').updateOne(
        { id: w.id },
        { $set: { previewNudgeSent: true, previewNudgeSentAt: new Date(), updatedAt: new Date() } },
      )
      return ok({ sent: true })
    }

    // Generate a UPI payment QR (server-side, robust) for the manual payment page.
    if (route === '/upi-qr' && method === 'GET') {
      const url = new URL(request.url)
      const amount = Math.max(1, Math.round(Number(url.searchParams.get('amount')) || 799))
      const tn = String(url.searchParams.get('note') || 'Vivoha Wedding Website').slice(0, 60)
      const cfg = await db.collection('settings').findOne({ id: 'payment-config' })
      const upiId = (cfg?.plans?.vivoha?.upiId) || 'anoopsunny04@ybl'
      const upiName = cfg?.upiName || 'Vivoha'
      const params = new URLSearchParams({ pa: upiId, pn: upiName, am: String(amount), cu: 'INR', tn })
      const upiLink = `upi://pay?${params.toString()}`
      const format = String(url.searchParams.get('format') || 'json')
      const QRCode = (await import('qrcode')).default
      if (format === 'png') {
        try {
          const buf = await QRCode.toBuffer(upiLink, { width: 480, margin: 1, type: 'png', color: { dark: '#1F1A14', light: '#FFFFFF' } })
          return new NextResponse(buf, {
            status: 200,
            headers: {
              'Content-Type': 'image/png',
              'Cache-Control': 'public, max-age=3600',
              'Access-Control-Allow-Origin': '*',
            },
          })
        } catch (e) {
          return err('QR generation failed', 500)
        }
      }
      let qr = null
      try {
        qr = await QRCode.toDataURL(upiLink, { width: 480, margin: 1, color: { dark: '#1F1A14', light: '#FFFFFF' } })
      } catch (_) { qr = null }
      return ok({ qr, upiLink, upiId, upiName, amount })
    }

    if (route === '/payment-config' && method === 'GET') {
      const cfg = await db.collection('settings').findOne({ id: 'payment-config' })
      const safe = cfg ? { ...cfg } : {}
      delete safe._id
      // Defaults — Vivoha is the canonical tier (₹799). Legacy plans kept for
      // any historical paymentAttempts that admin may still need to inspect.
      const defaults = {
        whatsappNumber: '917339557802',
        instagram: 'vivoha.in',
        upiName: 'Vivoha',
        whatsappGreeting: "Hi Vivoha! I just completed my wedding website setup — can you help me with payment?",
        plans: {
          vivoha: { upiId: 'anoopsunny04@ybl', qrUrl: '', notes: 'Pay ₹799 to publish your Vivoha Wedding Experience.' },
          classic: { upiId: 'anoopsunny04@ybl', qrUrl: '', notes: 'Legacy.' },
          grand: { upiId: 'anoopsunny04@ybl', qrUrl: '', notes: 'Legacy.' },
          elegant: { upiId: 'anoopsunny04@ybl', qrUrl: '', notes: 'Legacy.' },
        },
        // Add-ons removed — flat single price.
        addons: ADDONS_CATALOG,
      }
      return ok({ config: { ...defaults, ...safe, plans: { ...defaults.plans, ...(safe.plans || {}) } } })
    }

    // Admin: read/update payment config
    if (route === '/admin/payment-config' && (method === 'GET' || method === 'POST')) {
      const u = getAuthUser(request)
      if (!u) return err('Unauthorized', 401)
      if (method === 'GET') {
        const cfg = await db.collection('settings').findOne({ id: 'payment-config' })
        const safe = cfg ? { ...cfg } : {}
        delete safe._id
        return ok({ config: safe })
      }
      // POST = upsert
      const body = await request.json()
      const update = {}
      if (typeof body.whatsappNumber === 'string') update.whatsappNumber = body.whatsappNumber.replace(/\D/g, '').slice(0, 20)
      if (typeof body.whatsappGreeting === 'string') update.whatsappGreeting = body.whatsappGreeting.slice(0, 500)
      if (body.plans && typeof body.plans === 'object') {
        update.plans = {}
        for (const pid of ['classic', 'grand', 'elegant']) {
          const p = body.plans[pid] || {}
          update.plans[pid] = {
            upiId: String(p.upiId || '').trim().slice(0, 120),
            qrUrl: String(p.qrUrl || '').trim().slice(0, 600),
            qrPublicId: String(p.qrPublicId || '').trim().slice(0, 200),
            notes: String(p.notes || '').slice(0, 400),
          }
        }
      }
      update.updatedAt = new Date()
      await db.collection('settings').updateOne(
        { id: 'payment-config' },
        { $set: { id: 'payment-config', ...update } },
        { upsert: true }
      )
      const fresh = await db.collection('settings').findOne({ id: 'payment-config' })
      const { _id, ...rest } = fresh
      return ok({ config: rest })
    }

    // Public: kick off self-serve onboarding — creates a draft wedding tied to an unguessable token.
    if (route === '/onboard/start' && method === 'POST') {
      const body = await request.json()
      const brideName = String(body.brideName || '').trim().slice(0, 120)
      const groomName = String(body.groomName || '').trim().slice(0, 120)
      const email = String(body.email || '').trim().toLowerCase().slice(0, 160)
      const phone = String(body.whatsapp || body.phone || '').replace(/\D+/g, '').slice(0, 15)
      const weddingDate = String(body.weddingDate || '').slice(0, 64)
      const template = String(body.template || 'Moonveil').slice(0, 80)
      if (!brideName || !groomName) return err('Bride name and groom name are required')
      if (!email && !phone) return err('A WhatsApp number is required')
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err('Please enter a valid email')
      if (phone && phone.length < 10) return err('Please enter a valid WhatsApp number')

      // Find a system-admin to attribute this draft wedding to (so admin sees it).
      const adminUser = await db.collection('users').findOne({ role: 'admin' })
      if (!adminUser) return err('Service not initialised. Try again in a moment.', 503)

      const onboardToken = randomBytes(24).toString('hex') // 48-char
      // Slugify; ensure uniqueness
      let slug = slugify(`${brideName}-${groomName}`)
      let suffix = 0
      let candidate = slug
      while (await db.collection('weddings').findOne({ slug: candidate, deletedAt: { $exists: false } })) {
        suffix += 1
        candidate = `${slug}-${suffix}`
      }
      slug = candidate

      const dateISO = weddingDate
        ? (weddingDate.length === 10 ? `${weddingDate}T18:00:00+05:30` : weddingDate)
        : ''

      const wedding = {
        id: uuidv4(),
        userId: adminUser.id,
        slug,
        brideName,
        groomName,
        tagline: '',
        weddingDate: dateISO,
        story: '',
        heroImage: null,
        gallery: [],
        template,
        status: 'draft',
        events: [],
        rsvpSettings: { enabled: true, mealOptions: ['Vegetarian', 'Non-Vegetarian'] },
        advancedSettings: { photoWall: { enabled: false, title: 'Guest Photo Wall' } },
        theme: { accent: '', headingFont: '', bodyFont: '' },
        isDemo: false,
        isTest: false,
        plan: null,
        paymentStatus: 'not_started', // not_started | verification_pending | approved | rejected
        onboardToken,
        onboardEmail: email,
        onboardPhone: phone,
        revenueLogged: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      await db.collection('weddings').insertOne(wedding)

      // Also log a lead for marketing/analytics — DEDUPE by email (if present),
      // else by phone, so users trying multiple demos don't pollute the pipeline.
      const dedupeQuery = email ? { email } : (phone ? { phone } : null)
      const existingLead = dedupeQuery ? await db.collection('leads').findOne(dedupeQuery) : null
      if (existingLead) {
        await db.collection('leads').updateOne(
          { id: existingLead.id },
          {
            $set: {
              templateInterest: template,
              lastMessage: 'Started self-serve onboarding',
              lastSource: 'self-serve-onboard',
              ...(phone && !existingLead.phone ? { phone } : {}),
              updatedAt: new Date(),
            },
            $inc: { touchCount: 1 },
          }
        )
      } else {
        await db.collection('leads').insertOne({
          id: uuidv4(),
          name: `${brideName} & ${groomName}`,
          phone: phone || '',
          email,
          partnerName: '',
          weddingDate: dateISO,
          templateInterest: template,
          message: 'Started self-serve onboarding',
          source: 'self-serve-onboard',
          status: 'new',
          touchCount: 1,
          createdAt: new Date(),
        })
      }

      return ok({ token: onboardToken, slug, weddingId: wedding.id }, 201)
    }

    // Public: read/update draft via onboard token
    const onbW = route.match(/^\/onboard\/wedding\/([a-f0-9]{16,96})$/i)
    if (onbW) {
      const tok = onbW[1]
      const w = await db.collection('weddings').findOne({ onboardToken: tok, deletedAt: { $exists: false } })
      if (!w) return err('Onboarding session not found', 404)
      if (method === 'GET') {
        const { _id, userId, invitePassword, publishCodeHash, ownerWhatsapp, ...rest } = w
        return ok({
          wedding: {
            ...rest,
            passwordProtected: !!invitePassword?.passwordHash,
            previewExpired: isPreviewExpired(w),
            ownerWhatsappLast4: (w.ownerWhatsapp || '').slice(-4),
          },
        })
      }
      if (method === 'PUT') {
        // Lock once payment has been SUBMITTED for verification or APPROVED.
        // Per business rule: customer may view but cannot edit the preview once
        // they submit payment. They must reach our studio on WhatsApp to suggest edits.
        if (w.paymentStatus === 'approved') {
          return err('This invitation is published. Contact us via your status page to edit.', 423)
        }
        if (w.paymentStatus === 'verification_pending') {
          return err('Edits are locked once payment is submitted. Please WhatsApp our studio to suggest changes from your status page.', 423)
        }
        if (isPreviewExpired(w)) {
          return err('Your preview has expired. Please publish your website to keep it live.', 410)
        }
        const body = await request.json()
        const allowed = ['brideName', 'groomName', 'tagline', 'weddingDate', 'story', 'heroImage', 'gallery', 'events', 'template', 'rsvpSettings', 'advancedSettings', 'websiteSlug']
        const update = { updatedAt: new Date() }
        for (const k of allowed) {
          if (k in body) update[k] = body[k]
        }
        // websiteSlug validation + uniqueness reservation
        if ('websiteSlug' in update) {
          const raw = String(update.websiteSlug || '').toLowerCase().trim()
          if (raw === '') {
            delete update.websiteSlug
          } else if (!/^[a-z0-9]([a-z0-9-]{1,28})[a-z0-9]$/.test(raw)) {
            return err('That URL contains invalid characters. Use lowercase letters, numbers and hyphens only.', 400)
          } else {
            const RESERVED = new Set(['admin','api','www','vivoha','help','support','blog','app','preview','hub','login','logout','demo','wedding','onboard','publish','payment','status','static','public','dashboard','about','contact','privacy','terms'])
            if (RESERVED.has(raw)) return err('That URL is reserved — please pick another.', 409)
            const other = await db.collection('weddings').findOne({
              $or: [{ slug: raw }, { websiteSlug: raw }],
              deletedAt: { $exists: false },
              onboardToken: { $ne: w.onboardToken },
            })
            if (other) return err('This URL is taken. Try a different one.', 409)
            update.websiteSlug = raw
            update.slugStatus = 'reserved'
            update.slugReservedAt = new Date()
          }
        }
        // Field clipping
        if (typeof update.brideName === 'string') update.brideName = update.brideName.trim().slice(0, 120)
        if (typeof update.groomName === 'string') update.groomName = update.groomName.trim().slice(0, 120)
        if (typeof update.tagline === 'string') update.tagline = update.tagline.slice(0, 240)
        if (typeof update.story === 'string') update.story = update.story.slice(0, 5000)
        if (Array.isArray(update.gallery)) update.gallery = update.gallery.slice(0, 30)
        if (Array.isArray(update.events)) update.events = update.events.slice(0, 12)

        // Invite password (hashed) — set / unset by passwordProtect flag
        if ('passwordProtect' in body) {
          if (body.passwordProtect && body.invitePassword) {
            const pw = String(body.invitePassword).slice(0, 80)
            if (pw.length >= 4) {
              update.invitePassword = {
                passwordHash: await hashPassword(pw),
                prompt: String(body.invitePasswordPrompt || 'This invitation is private.').slice(0, 200),
                updatedAt: new Date(),
              }
            }
          } else if (body.passwordProtect === false) {
            await db.collection('weddings').updateOne({ id: w.id }, { $unset: { invitePassword: '' } })
          }
        }

        await db.collection('weddings').updateOne({ id: w.id }, { $set: update })
        const fresh = await db.collection('weddings').findOne({ id: w.id })
        const { _id, userId, invitePassword, publishCodeHash, ownerWhatsapp, ...rest } = fresh
        // Never expose the hashed password or owner whatsapp.
        return ok({ wedding: { ...rest, passwordProtected: !!invitePassword?.passwordHash, ownerWhatsappLast4: (fresh.ownerWhatsapp || '').slice(-4) } })
      }
    }

    // Public: upload image via onboard token — PRE-PAYMENT GUARD:
    //  - max 5 preview uploads (hero counts) before payment
    //  - all images go through Cloudinary low-quality transform
    //  - tagged as preview-upload
    const onbU = route.match(/^\/onboard\/upload\/([a-f0-9]{16,96})$/i)
    if (onbU && method === 'POST') {
      const tok = onbU[1]
      const w = await db.collection('weddings').findOne({ onboardToken: tok, deletedAt: { $exists: false } })
      if (!w) return err('Onboarding session not found', 404)
      if (w.paymentStatus === 'approved') return err('Onboarding locked', 423)
      const body = await request.json()
      if (!body.dataUri || typeof body.dataUri !== 'string' || !body.dataUri.startsWith('data:image/')) return err('Invalid image data')
      if (body.dataUri.length > 14 * 1024 * 1024) return err('Image too large (max ~10MB)')

      // Pre-payment upload limit. Counts hero (1) + gallery images already attached.
      // Skip the limit once paymentStatus is approved (admin-approved customers get full uploads).
      const isApproved = w.paymentStatus === 'approved'
      if (!isApproved) {
        const heroCount = w.heroImage ? 1 : 0
        const galleryCount = Array.isArray(w.gallery) ? w.gallery.length : 0
        const used = heroCount + galleryCount
        if (used >= 5) {
          return err('Preview upload limit reached (5 images). Your full upload limit unlocks after payment approval.', 429)
        }
      }
      const folder = `vivoha/onboard/${w.id}`
      const result = isApproved
        ? await uploadDataUri(body.dataUri, folder)
        : await uploadPreviewDataUri(body.dataUri, folder)
      return ok(result)
    }

    // Public: select a plan (writes plan + paymentPlan + amount on draft)
    const onbP = route.match(/^\/onboard\/select-plan\/([a-f0-9]{16,96})$/i)
    if (onbP && method === 'POST') {
      const tok = onbP[1]
      const w = await db.collection('weddings').findOne({ onboardToken: tok, deletedAt: { $exists: false } })
      if (!w) return err('Onboarding session not found', 404)
      if (['verification_pending', 'approved'].includes(w.paymentStatus)) return err('Plan locked — payment already submitted', 423)
      const body = await request.json()
      const planId = normalisePlan(body.plan)
      if (!planId) return err('Invalid plan')
      // Sanitize add-ons against the server-side catalogue (never trust client price)
      const requestedAddons = Array.isArray(body.addons) ? body.addons.filter(id => id in ADDONS_BY_ID) : []
      const addonsAmount = computeAddonsTotal(requestedAddons)
      const baseAmount = PLAN_PRICES[planId]
      const amount = baseAmount + addonsAmount
      await db.collection('weddings').updateOne(
        { id: w.id },
        {
          $set: {
            plan: planId,
            paymentPlan: planId,
            paymentAmount: amount,
            paymentBase: baseAmount,
            paymentAddons: requestedAddons,
            paymentAddonsAmount: addonsAmount,
            paymentCurrency: 'INR',
            updatedAt: new Date(),
          },
        }
      )
      return ok({
        plan: planId,
        amount,
        baseAmount,
        addonsAmount,
        addons: requestedAddons.map(id => ({ id, ...ADDONS_BY_ID[id] })),
      })
    }

    // Public: submit payment screenshot for verification — also captures attempt
    // history, generates a permanent statusToken, and logs an email event.
    const onbPay = route.match(/^\/onboard\/submit-payment\/([a-f0-9]{16,96})$/i)
    if (onbPay && method === 'POST') {
      const tok = onbPay[1]
      const w = await db.collection('weddings').findOne({ onboardToken: tok, deletedAt: { $exists: false } })
      if (!w) return err('Onboarding session not found', 404)
      if (w.paymentStatus === 'approved') return err('This wedding is already published.', 409)
      if (w.paymentStatus === 'verification_pending') return err('Your payment is already being verified. Please check your status page.', 409)
      if (isPreviewExpired(w)) return err('Your preview has expired. Please contact our studio to restart.', 410)
      if (!w.plan || !PLAN_PRICES[w.plan]) return err('Please select a plan first', 400)
      const body = await request.json()
      if (!body.dataUri || typeof body.dataUri !== 'string' || !body.dataUri.startsWith('data:image/')) return err('Please attach a payment screenshot')
      if (body.dataUri.length > 14 * 1024 * 1024) return err('Screenshot too large (max ~10MB)')
      const folder = `vivoha/payments/${w.id}`
      const uploaded = await uploadDataUri(body.dataUri, folder)
      const now = new Date()
      const statusToken = w.statusToken || generateStatusToken()
      const attempt = {
        id: uuidv4(),
        screenshot: uploaded,
        txnRef: String(body.txnRef || '').slice(0, 80),
        note: String(body.note || '').slice(0, 400),
        status: 'verification_pending',
        createdAt: now,
      }
      await db.collection('weddings').updateOne(
        { id: w.id },
        {
          $set: {
            paymentStatus: 'verification_pending',
            paymentScreenshot: uploaded,
            paymentSubmittedAt: now,
            paymentTxnRef: attempt.txnRef,
            paymentNote: attempt.note,
            statusToken,
            paymentRejectionReason: '',
            updatedAt: now,
          },
          $push: { paymentAttempts: attempt },
        }
      )
      await logEmail(db, {
        type: 'payment_submitted',
        to: w.onboardEmail,
        weddingId: w.id,
        statusToken,
        subject: 'We received your payment — verification under way',
        body: `Hi ${w.brideName} & ${w.groomName}, we have received your payment for the ${w.plan} plan. Our studio will verify and publish within a few hours. Track status: /status/${statusToken}`,
      })
      return ok({ ok: true, status: 'verification_pending', statusToken, ownerToken: w.ownerToken || null })
    }

    // ===== ADMIN PAYMENTS =====
    // List weddings filtered by paymentStatus
    if (route === '/admin/payments' && method === 'GET') {
      const u = getAuthUser(request)
      if (!u) return err('Unauthorized', 401)
      const url = new URL(request.url)
      const status = url.searchParams.get('status') || 'verification_pending'
      const filter = { deletedAt: { $exists: false } }
      if (status !== 'all') filter.paymentStatus = status
      const items = await db.collection('weddings').find(filter).sort({ paymentSubmittedAt: -1, createdAt: -1 }).limit(200).toArray()
      return ok({ weddings: items.map(({ _id, invitePassword, ...w }) => ({ ...w, passwordProtected: !!invitePassword?.passwordHash })) })
    }

    // ===== ADMIN: OWNER HUBS LIST =====
    // Returns weddings that have an ownerToken (i.e. a couple set their 4-digit publish
    // code during onboarding). Lets admin see hub activity, copy the deep link to assist
    // a couple over WhatsApp, or reset a forgotten publish code.
    if (route === '/admin/hubs' && method === 'GET') {
      const u = getAuthUser(request)
      if (!u) return err('Unauthorized', 401)
      const url = new URL(request.url)
      const q = (url.searchParams.get('q') || '').trim().toLowerCase()
      const filter = { ownerToken: { $exists: true, $ne: null }, deletedAt: { $exists: false } }
      const items = await db.collection('weddings').find(filter).sort({ updatedAt: -1, createdAt: -1 }).limit(200).toArray()
      // Lightweight projection — no payment screenshots etc.
      const rows = items
        .map(w => ({
          id: w.id,
          slug: w.slug,
          brideName: w.brideName,
          groomName: w.groomName,
          weddingDate: w.weddingDate,
          template: w.template,
          plan: w.plan,
          paymentStatus: w.paymentStatus || 'not_started',
          publishedStatus: w.status,
          paymentAmount: w.paymentAmount || 0,
          paymentAddons: w.paymentAddons || [],
          paymentAddonsAmount: w.paymentAddonsAmount || 0,
          ownerToken: w.ownerToken,
          ownerWhatsapp: w.ownerWhatsapp || w.onboardPhone || '',
          ownerWhatsappLast4: (w.ownerWhatsapp || '').slice(-4),
          onboardPhone: w.onboardPhone || '',
          onboardEmail: w.onboardEmail || '',
          publishCodeSetAt: w.publishCodeSetAt || null,
          rsvpCount: w.rsvpCount || 0,
          viewCount: w.viewCount || 0,
        }))
        .filter(r => !q || `${r.brideName} ${r.groomName} ${r.slug}`.toLowerCase().includes(q))
      return ok({ hubs: rows })
    }

    // ===== ADMIN: RESET PUBLISH CODE =====
    // Lets an admin reset a couple's 4-digit publish code (e.g. they forgot it).
    // We DON'T set a new code — we clear the hash so the next /owner/set-code call
    // from any verified WhatsApp re-sets it. The ownerToken stays so the Hub URL
    // remains valid for the admin to share once the couple sets a new code.
    const adReset = route.match(/^\/admin\/hubs\/([^\/]+)\/reset-publish-code$/)
    if (adReset && method === 'POST') {
      const u = getAuthUser(request)
      if (!u) return err('Unauthorized', 401)
      const w = await db.collection('weddings').findOne({ id: adReset[1], deletedAt: { $exists: false } })
      if (!w) return err('Not found', 404)
      await db.collection('weddings').updateOne(
        { id: w.id },
        {
          $unset: { publishCodeHash: '', publishCodeSetAt: '' },
          $set: { publishCodeResetAt: new Date(), publishCodeResetBy: u.id, updatedAt: new Date() },
        },
      )
      return ok({ ok: true, message: 'Publish code reset. Couple can re-set from WhatsApp.' })
    }

    // Approve a payment — publishes the wedding
    const adAp = route.match(/^\/admin\/payments\/([^\/]+)\/approve$/)
    if (adAp && method === 'POST') {
      const u = getAuthUser(request)
      if (!u) return err('Unauthorized', 401)
      const w = await db.collection('weddings').findOne({ id: adAp[1] })
      if (!w) return err('Not found', 404)
      // State-machine guard: only approve if still pending verification
      if (w.paymentStatus === 'approved') return err('This payment has already been approved.', 409)
      if (w.paymentStatus !== 'verification_pending') return err('Payment is not awaiting verification.', 400)
      const now = new Date()
      await db.collection('weddings').updateOne(
        { id: w.id },
        {
          $set: {
            paymentStatus: 'approved',
            paymentApprovedAt: now,
            paymentApprovedBy: u.id,
            status: 'published',
            ...(w.ownerToken ? {} : { ownerToken: randomBytes(24).toString('base64url') }),
            updatedAt: now,
          },
          // Mark the latest attempt as approved
          ...(Array.isArray(w.paymentAttempts) && w.paymentAttempts.length
            ? { } : {}),
        }
      )
      // Update last attempt status -> approved
      const attempts = Array.isArray(w.paymentAttempts) ? [...w.paymentAttempts] : []
      if (attempts.length) attempts[attempts.length - 1] = { ...attempts[attempts.length - 1], status: 'approved', resolvedAt: now }
      if (attempts.length) await db.collection('weddings').updateOne({ id: w.id }, { $set: { paymentAttempts: attempts } })

      const fresh = await db.collection('weddings').findOne({ id: w.id })
      await logRevenueIfNeeded(db, fresh)
      await logEmail(db, {
        type: 'website_published',
        to: fresh.onboardEmail,
        weddingId: fresh.id,
        statusToken: fresh.statusToken,
        subject: 'Your Vivoha invitation is live ✨',
        body: `Congratulations ${fresh.brideName} & ${fresh.groomName}! Your wedding website is live: /wedding/${fresh.slug}. Track: /status/${fresh.statusToken || ''}`,
      })
      const { _id, invitePassword, ...rest } = fresh
      return ok({ wedding: { ...rest, passwordProtected: !!invitePassword?.passwordHash } })
    }

    // Reject a payment — moves to 'rejected', preserves attempt history
    const adRj = route.match(/^\/admin\/payments\/([^\/]+)\/reject$/)
    if (adRj && method === 'POST') {
      const u = getAuthUser(request)
      if (!u) return err('Unauthorized', 401)
      const w = await db.collection('weddings').findOne({ id: adRj[1] })
      if (!w) return err('Not found', 404)
      if (w.paymentStatus === 'approved') return err('Cannot reject — payment already approved.', 409)
      const body = await request.json().catch(() => ({}))
      const reason = String(body.reason || '').slice(0, 400)
      const now = new Date()
      // Mark the latest attempt as rejected
      const attempts = Array.isArray(w.paymentAttempts) ? [...w.paymentAttempts] : []
      if (attempts.length) attempts[attempts.length - 1] = { ...attempts[attempts.length - 1], status: 'rejected', rejectionReason: reason, resolvedAt: now }
      await db.collection('weddings').updateOne(
        { id: w.id },
        {
          $set: {
            paymentStatus: 'rejected',
            paymentRejectionReason: reason,
            paymentRejectedAt: now,
            paymentAttempts: attempts,
            updatedAt: now,
          },
          // Reset preview viewing window so the customer can retry payment
          // without being blocked by the 24-hour expiry.
          $unset: { previewFirstViewedAt: '', previewExpiresAt: '' },
        }
      )
      await logEmail(db, {
        type: 'payment_rejected',
        to: w.onboardEmail,
        weddingId: w.id,
        statusToken: w.statusToken,
        subject: 'Payment needs a second look',
        body: `Hi ${w.brideName} & ${w.groomName}, our studio couldn't verify the last payment. Reason: ${reason || '—'}. Retry from your status page: /status/${w.statusToken || ''}`,
      })
      return ok({ ok: true })
    }

    // Admin: request changes from the customer (status moves to changes_requested)
    const adRc = route.match(/^\/admin\/payments\/([^\/]+)\/request-changes$/)
    if (adRc && method === 'POST') {
      const u = getAuthUser(request)
      if (!u) return err('Unauthorized', 401)
      const w = await db.collection('weddings').findOne({ id: adRc[1] })
      if (!w) return err('Not found', 404)
      const body = await request.json().catch(() => ({}))
      const message = String(body.message || '').slice(0, 1000).trim()
      if (!message) return err('Please provide a message describing the changes needed')
      const now = new Date()
      const note = {
        id: uuidv4(),
        type: 'changes_requested',
        author: u.name || 'Vivoha Studio',
        message,
        createdAt: now,
      }
      await db.collection('weddings').updateOne(
        { id: w.id },
        {
          $set: { paymentStatus: 'changes_requested', updatedAt: now },
          $push: { adminMessages: note },
        }
      )
      await logEmail(db, {
        type: 'changes_requested',
        to: w.onboardEmail,
        weddingId: w.id,
        statusToken: w.statusToken,
        subject: 'Small changes needed before we publish',
        body: `Hi ${w.brideName} & ${w.groomName}, our studio has requested a few changes: "${message}". Update your details from your status page: /status/${w.statusToken || ''}`,
      })
      return ok({ ok: true, note })
    }

    // Admin: send a free-form note to the customer (shows on status page)
    const adNote = route.match(/^\/admin\/payments\/([^\/]+)\/note$/)
    if (adNote && method === 'POST') {
      const u = getAuthUser(request)
      if (!u) return err('Unauthorized', 401)
      const w = await db.collection('weddings').findOne({ id: adNote[1] })
      if (!w) return err('Not found', 404)
      const body = await request.json().catch(() => ({}))
      const message = String(body.message || '').slice(0, 1000).trim()
      if (!message) return err('Message is empty')
      const note = {
        id: uuidv4(),
        type: 'note',
        author: u.name || 'Vivoha Studio',
        message,
        createdAt: new Date(),
      }
      await db.collection('weddings').updateOne(
        { id: w.id },
        { $push: { adminMessages: note }, $set: { updatedAt: new Date() } }
      )
      await logEmail(db, {
        type: 'admin_note',
        to: w.onboardEmail,
        weddingId: w.id,
        statusToken: w.statusToken,
        subject: 'A note from Vivoha Studio',
        body: message,
      })
      return ok({ ok: true, note })
    }

    // ===== STATUS PAGE (public, no login) =====
    // Lookup by short statusToken; returns a safe customer-facing project summary.
    const stG = route.match(/^\/status\/([A-Z0-9]{6,16})$/)
    if (stG && method === 'GET') {
      const tok = stG[1]
      const w = await db.collection('weddings').findOne({ statusToken: tok, deletedAt: { $exists: false } })
      if (!w) return err('Status not found', 404)
      // Compute live + short URLs (only meaningful once published)
      const proto = request.headers.get('x-forwarded-proto') || 'https'
      const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || ''
      const externalBase = `${proto}://${host}`
      const publicUrl = w.status === 'published' ? `${externalBase}/wedding/${w.slug}` : null
      let shortUrl = null
      if (publicUrl) {
        const existing = await db.collection('shortlinks').findOne({ userId: w.userId, target: publicUrl })
        if (existing) shortUrl = `${externalBase}/s/${existing.id}`
      }
      // Pre-render the QR as a data URI so the client never has to call out to
      // a 3rd-party QR service (which was getting blocked in some environments).
      let qrDataUri = null
      if (publicUrl) {
        try {
          const QRCode = (await import('qrcode')).default
          qrDataUri = await QRCode.toDataURL(shortUrl || publicUrl, {
            width: 480, margin: 1,
            color: { dark: '#1A1A1A', light: '#FFFFFF' },
          })
        } catch (_e) { qrDataUri = null }
      }
      const view = {
        statusToken: tok,
        brideName: w.brideName,
        groomName: w.groomName,
        weddingDate: w.weddingDate,
        template: w.template,
        plan: w.plan,
        planAmount: w.paymentAmount,
        paymentStatus: w.paymentStatus,
        publishedStatus: w.status,
        publishedSlug: w.status === 'published' ? w.slug : null,
        publicUrl,
        shortUrl,
        qrDataUri,
        // History — strip server fields
        paymentAttempts: (w.paymentAttempts || []).map(a => ({
          id: a.id,
          status: a.status,
          screenshot: a.screenshot ? { url: a.screenshot.url } : null,
          txnRef: a.txnRef,
          rejectionReason: a.rejectionReason || '',
          createdAt: a.createdAt,
          resolvedAt: a.resolvedAt,
        })),
        adminMessages: (w.adminMessages || []).map(m => ({
          id: m.id,
          type: m.type,
          author: m.author,
          message: m.message,
          createdAt: m.createdAt,
        })),
        // Editing is only allowed BEFORE the customer submits payment. Once payment
        // is submitted (verification_pending) or approved, the preview becomes
        // view-only and the customer must reach the studio on WhatsApp.
        canEdit: !['verification_pending', 'approved'].includes(w.paymentStatus),
        previewUrl: w.status !== 'published' && w.onboardToken
          ? `/preview/${w.slug}?onboardToken=${w.onboardToken}`
          : null,
        editUrl: !['verification_pending', 'approved'].includes(w.paymentStatus) && w.onboardToken
          ? `/onboard/${w.onboardToken}`
          : null,
      }
      return ok({ status: view })
    }

    // =====================================================================
    // OWNER AUTH (lightweight: WhatsApp only — PIN removed).
    //
    // Lifecycle:
    //  1. POST /api/owner/register   { onboardToken, whatsapp }
    //     -> stores the couple's WhatsApp and mints an opaque, high-entropy
    //        ownerToken. The private hub URL is /hub/manage/<ownerToken>.
    //  2. POST /api/owner/auth       { whatsapp }
    //     -> recovers the ownerToken when the couple loses the WhatsApp link.
    //        Rate-limited per (whatsapp + IP).
    //  3. GET  /api/hub/owner/:tok   -> hub payload (no PIN gate).
    // =====================================================================

    function normaliseWhatsapp(raw) {
      const digits = String(raw || '').replace(/\D+/g, '')
      if (!digits) return ''
      if (digits.length === 10) return '91' + digits
      return digits.slice(0, 15)
    }
    async function rateLimitOwnerAuth(db, key) {
      const now = Date.now()
      const windowMs = 10 * 60 * 1000
      const maxAttempts = 8
      const lockoutMs = 15 * 60 * 1000
      const doc = await db.collection('owner_auth_rl').findOne({ _id: key })
      if (doc?.lockedUntil && doc.lockedUntil > now) {
        return { ok: false, lockedSeconds: Math.ceil((doc.lockedUntil - now) / 1000) }
      }
      const recent = (doc?.attempts || []).filter(t => now - t < windowMs)
      if (recent.length >= maxAttempts) {
        await db.collection('owner_auth_rl').updateOne(
          { _id: key },
          { $set: { lockedUntil: now + lockoutMs, attempts: recent } },
          { upsert: true },
        )
        return { ok: false, lockedSeconds: Math.ceil(lockoutMs / 1000) }
      }
      return { ok: true, prev: recent }
    }
    async function recordOwnerAuthAttempt(db, key, success, prev) {
      const now = Date.now()
      if (success) {
        await db.collection('owner_auth_rl').deleteOne({ _id: key })
      } else {
        await db.collection('owner_auth_rl').updateOne(
          { _id: key },
          { $set: { attempts: [...prev, now] }, $unset: { lockedUntil: '' } },
          { upsert: true },
        )
      }
    }

    // ---- POST /api/owner/register ---------------------------------------
    // Backward-compatible alias /api/owner/set-code is handled below too.
    if ((route === '/owner/register' || route === '/owner/set-code') && method === 'POST') {
      const body = await request.json().catch(() => ({}))
      const onboardToken = String(body.onboardToken || '').trim()
      const whatsapp = normaliseWhatsapp(body.whatsapp)
      if (!onboardToken) return err('Missing onboard session', 400)
      if (!whatsapp || whatsapp.length < 10) return err('Please enter a valid WhatsApp number', 400)
      const w = await db.collection('weddings').findOne({ onboardToken, deletedAt: { $exists: false } })
      if (!w) return err('Onboard session not found', 404)
      const ownerToken = w.ownerToken || randomBytes(24).toString('base64url')
      await db.collection('weddings').updateOne(
        { _id: w._id },
        {
          $set: {
            ownerWhatsapp: whatsapp,
            ownerToken,
            ownerRegisteredAt: new Date(),
            updatedAt: new Date(),
          },
        },
      )
      return ok({ ok: true, ownerToken, whatsappLast4: whatsapp.slice(-4) })
    }

    // ---- POST /api/owner/auth -------------------------------------------
    // WhatsApp-only lookup. Returns ownerToken so the couple can find their hub
    // again if they lost the WhatsApp message.
    if (route === '/owner/auth' && method === 'POST') {
      const body = await request.json().catch(() => ({}))
      const whatsapp = normaliseWhatsapp(body.whatsapp)
      if (!whatsapp || whatsapp.length < 10) return err('Please enter a valid WhatsApp number', 400)
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
      const rlKey = `${whatsapp}::${ip}`
      const rl = await rateLimitOwnerAuth(db, rlKey)
      if (!rl.ok) {
        return err(`Too many attempts. Please wait ${Math.ceil(rl.lockedSeconds / 60)} minute(s).`, 429)
      }
      const w = await db.collection('weddings').findOne({ ownerWhatsapp: whatsapp, deletedAt: { $exists: false } })
      if (!w) {
        await recordOwnerAuthAttempt(db, rlKey, false, rl.prev)
        return err("We couldn't find a wedding with that number", 401)
      }
      await recordOwnerAuthAttempt(db, rlKey, true, rl.prev)
      let ownerToken = w.ownerToken
      if (!ownerToken) {
        ownerToken = randomBytes(24).toString('base64url')
        await db.collection('weddings').updateOne({ _id: w._id }, { $set: { ownerToken, updatedAt: new Date() } })
      }
      return ok({
        ok: true,
        ownerToken,
        slug: w.slug,
        brideName: w.brideName,
        groomName: w.groomName,
      })
    }


    // ---- GET /api/hub/owner/:ownerToken ---------------------------------
    // Long-token Hub endpoint — same payload shape as /api/status/:tok so the
    // existing Wedding Hub UI can reuse it. Owner-authenticated devices use
    // /hub/manage/<ownerToken> (no WhatsApp re-entry needed once in URL).
    const ownerHub = route.match(/^\/hub\/owner\/([A-Za-z0-9_-]{24,64})$/)
    if (ownerHub && method === 'GET') {
      const tok = ownerHub[1]
      const w = await db.collection('weddings').findOne({ ownerToken: tok, deletedAt: { $exists: false } })
      if (!w) return err('Hub not found', 404)
      // SELF-HEAL: a published site is always paid. Fixes any hub stuck on
      // "pending payment" because it was published without going through the
      // payment-approve flow.
      if (w.status === 'published' && w.paymentStatus !== 'approved') {
        const now = new Date()
        await db.collection('weddings').updateOne(
          { id: w.id },
          { $set: { paymentStatus: 'approved', paymentApprovedAt: now, paymentApprovedBy: 'auto-published', updatedAt: now } }
        )
        w.paymentStatus = 'approved'
      }
      const proto = request.headers.get('x-forwarded-proto') || 'https'
      const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || ''
      const externalBase = `${proto}://${host}`
      const publicUrl = w.status === 'published' ? `${externalBase}/wedding/${w.slug}` : null
      let shortUrl = null
      if (publicUrl) {
        const existing = await db.collection('shortlinks').findOne({ userId: w.userId, target: publicUrl })
        if (existing) shortUrl = `${externalBase}/s/${existing.id}`
      }
      let qrDataUri = null
      if (publicUrl) {
        try {
          const QRCode = (await import('qrcode')).default
          qrDataUri = await QRCode.toDataURL(shortUrl || publicUrl, {
            width: 480, margin: 1,
            color: { dark: '#1A1A1A', light: '#FFFFFF' },
          })
        } catch (_e) { qrDataUri = null }
      }

      // Post-publish data: RSVPs + photo wall + analytics. Cheap to compute and
      // makes the Hub a single source of truth (no separate dashboard needed).
      const rsvps = await db.collection('rsvps').find({ weddingId: w.id }).sort({ createdAt: -1 }).limit(500).toArray()
      const photoCounts = await db.collection('photo_wall').aggregate([
        { $match: { weddingId: w.id } },
        { $group: { _id: '$status', n: { $sum: 1 } } },
      ]).toArray()
      const counts = { pending: 0, approved: 0, rejected: 0 }
      for (const c of photoCounts) counts[c._id] = c.n
      const viewsByDay = w.viewsByDay || {}
      const viewsTrend = []
      for (let i = 13; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400 * 1000).toISOString().slice(0, 10)
        viewsTrend.push({ day: d, views: viewsByDay[d] || 0 })
      }
      const attendingCount = rsvps.reduce((s, r) => s + (r.attending === 'yes' ? (Number(r.guests) || 1) : 0), 0)

      // Selected add-ons — resolve against canonical catalog so admin/UI can render labels safely.
      const selectedAddons = Array.isArray(w.paymentAddons) ? w.paymentAddons : []
      const addons = selectedAddons.map(id => ADDONS_BY_ID[id]).filter(Boolean)

      const view = {
        statusToken: w.statusToken || null,   // for short-link/share endpoints
        ownerToken: tok,
        ownerWhatsappLast4: (w.ownerWhatsapp || '').slice(-4),
        brideName: w.brideName,
        groomName: w.groomName,
        weddingDate: w.weddingDate,
        slug: w.slug,
        template: w.template,
        plan: w.plan,
        planAmount: w.paymentAmount,
        paymentStatus: w.paymentStatus,
        publishedStatus: w.status,
        publishedSlug: w.status === 'published' ? w.slug : null,
        publicUrl,
        shortUrl,
        qrDataUri,
        addons,
        addonsAmount: w.paymentAddonsAmount || 0,
        photoWallEnabled: !!w.advancedSettings?.photoWall?.enabled,
        // Post-publish hub data
        stats: {
          totalViews: w.viewCount || 0,
          viewsTrend,
          totalRsvps: rsvps.length,
          attendingCount,
          photoCounts: counts,
        },
        rsvps: rsvps.map(({ _id, ...r }) => r),
        paymentAttempts: (w.paymentAttempts || []).map(a => ({
          id: a.id, status: a.status, txnRef: a.txnRef,
          createdAt: a.createdAt, reviewedAt: a.reviewedAt,
          reviewedBy: a.reviewedBy, rejectionReason: a.rejectionReason,
        })),
        adminMessages: (w.adminMessages || []).map(m => ({
          id: m.id, type: m.type, author: m.author, message: m.message, createdAt: m.createdAt,
        })),
        canEdit: !['verification_pending', 'approved'].includes(w.paymentStatus),
        previewUrl: w.status !== 'published' && w.onboardToken
          ? `/preview/${w.slug}?onboardToken=${w.onboardToken}`
          : null,
        editUrl: !['verification_pending', 'approved'].includes(w.paymentStatus) && w.onboardToken
          ? `/onboard/${w.onboardToken}`
          : null,
      }
      return ok({ status: view })
    }

    // ---- GET /api/hub/owner/:ownerToken/photo-wall (post-publish photo moderation list) ----
    const ownerPhotoList = route.match(/^\/hub\/owner\/([A-Za-z0-9_-]{24,64})\/photo-wall$/)
    if (ownerPhotoList && method === 'GET') {
      const w = await db.collection('weddings').findOne({ ownerToken: ownerPhotoList[1], deletedAt: { $exists: false } })
      if (!w) return err('Hub not found', 404)
      const photos = await db.collection('photo_wall').find({
        weddingId: w.id, status: { $in: ['pending', 'approved'] },
      }).sort({ createdAt: -1 }).limit(500).toArray()
      return ok({ photos: photos.map(({ _id, ...p }) => p) })
    }

    // ---- POST /api/hub/owner/:ownerToken/photo-wall/:id/moderate ----
    const ownerPhotoMod = route.match(/^\/hub\/owner\/([A-Za-z0-9_-]{24,64})\/photo-wall\/([^\/]+)\/moderate$/)
    if (ownerPhotoMod && method === 'POST') {
      const w = await db.collection('weddings').findOne({ ownerToken: ownerPhotoMod[1], deletedAt: { $exists: false } })
      if (!w) return err('Hub not found', 404)
      const body = await request.json().catch(() => ({}))
      const requested = String(body.action || '').toLowerCase()
      if (requested !== 'approve' && requested !== 'reject') return err('action must be "approve" or "reject"', 400)
      const action = requested === 'reject' ? 'rejected' : 'approved'
      const photo = await db.collection('photo_wall').findOne({ id: ownerPhotoMod[2], weddingId: w.id })
      if (!photo) return err('Photo not found', 404)
      await db.collection('photo_wall').updateOne(
        { id: photo.id },
        { $set: { status: action, [`${action}At`]: new Date(), moderatedBy: 'owner' } },
      )
      return ok({ ok: true, status: action })
    }

    // ---- GET /api/hub/owner/:ownerToken/rsvp-export.csv ----
    const ownerRsvpExp = route.match(/^\/hub\/owner\/([A-Za-z0-9_-]{24,64})\/rsvp-export$/)
    if (ownerRsvpExp && method === 'GET') {
      const w = await db.collection('weddings').findOne({ ownerToken: ownerRsvpExp[1], deletedAt: { $exists: false } })
      if (!w) return err('Hub not found', 404)
      const rsvps = await db.collection('rsvps').find({ weddingId: w.id }).sort({ createdAt: -1 }).toArray()
      const headers = ['Name', 'Email', 'Phone', 'Attending', 'Guests', 'Meals', 'Message', 'Submitted']
      const rows = rsvps.map(r => [
        r.name, r.email || '', r.phone || '', r.attending, r.guests,
        (r.mealPreferences || []).join('; '), (r.message || '').replace(/\n/g, ' '),
        new Date(r.createdAt).toISOString(),
      ])
      const csv = [headers, ...rows].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="rsvps-${w.slug}.csv"`,
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    // ---- GET /api/hub/owner/:ownerToken/photo-wall-zip ----
    const ownerPhotoZip = route.match(/^\/hub\/owner\/([A-Za-z0-9_-]{24,64})\/photo-wall-zip$/)
    if (ownerPhotoZip && method === 'GET') {
      const w = await db.collection('weddings').findOne({ ownerToken: ownerPhotoZip[1], deletedAt: { $exists: false } })
      if (!w) return err('Hub not found', 404)
      const photos = await db.collection('photo_wall').find({ weddingId: w.id, status: 'approved' }).sort({ approvedAt: -1 }).toArray()
      if (photos.length === 0) return err('No approved photos to download yet', 404)
      const { buildPhotoZip } = await import('@/lib/zip')
      const buffer = await buildPhotoZip(photos, w.slug)
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${w.slug}-photo-wall.zip"`,
          'Access-Control-Allow-Origin': '*',
        },
      })
    }


    // Public: create / get shortlink for a published wedding (by statusToken)
    const stSL = route.match(/^\/status\/([A-Z0-9]{6,16})\/short-link$/)
    if (stSL && method === 'POST') {
      const tok = stSL[1]
      const w = await db.collection('weddings').findOne({ statusToken: tok, deletedAt: { $exists: false } })
      if (!w) return err('Status not found', 404)
      if (w.status !== 'published') return err('Website is not published yet', 409)
      const proto = request.headers.get('x-forwarded-proto') || 'https'
      const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || ''
      const externalBase = `${proto}://${host}`
      const target = `${externalBase}/wedding/${w.slug}`
      let sl = await db.collection('shortlinks').findOne({ userId: w.userId, target })
      if (!sl) {
        function gen() { return Math.random().toString(36).slice(2, 8) }
        let sid = gen()
        while (await db.collection('shortlinks').findOne({ id: sid })) sid = gen()
        sl = {
          id: sid,
          target,
          userId: w.userId,
          label: `${w.brideName}-${w.groomName}`.slice(0, 60),
          hits: 0,
          createdAt: new Date(),
        }
        await db.collection('shortlinks').insertOne(sl)
      }
      return ok({ shortUrl: `${externalBase}/s/${sl.id}`, publicUrl: target })
    }

    // Public: download thank-you / invite PDF (only when approved + published)
    const stPdf = route.match(/^\/status\/([A-Z0-9]{6,16})\/invite-pdf$/)
    if (stPdf && method === 'GET') {
      const tok = stPdf[1]
      const w = await db.collection('weddings').findOne({ statusToken: tok, deletedAt: { $exists: false } })
      if (!w) return err('Status not found', 404)
      if (w.status !== 'published') return err('Website is not published yet', 409)
      const proto = request.headers.get('x-forwarded-proto') || 'https'
      const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || ''
      const externalBase = `${proto}://${host}`
      const publicUrl = `${externalBase}/wedding/${w.slug}`
      let sl = await db.collection('shortlinks').findOne({ userId: w.userId, target: publicUrl })
      if (!sl) {
        function gen() { return Math.random().toString(36).slice(2, 8) }
        let sid = gen()
        while (await db.collection('shortlinks').findOne({ id: sid })) sid = gen()
        sl = { id: sid, target: publicUrl, userId: w.userId, label: `${w.brideName}-${w.groomName}`, hits: 0, createdAt: new Date() }
        await db.collection('shortlinks').insertOne(sl)
      }
      const shortUrl = `${externalBase}/s/${sl.id}`
      const { buildInvitePdf } = await import('@/lib/pdf')
      const buffer = await buildInvitePdf(w, { publicUrl, shortUrl })
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${w.slug}-invite.pdf"`,
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    // Public: retry a rejected payment via statusToken (no WhatsApp needed)
    const stR = route.match(/^\/status\/([A-Z0-9]{6,16})\/retry-payment$/)
    if (stR && method === 'POST') {
      const tok = stR[1]
      const w = await db.collection('weddings').findOne({ statusToken: tok, deletedAt: { $exists: false } })
      if (!w) return err('Status not found', 404)
      if (w.paymentStatus === 'approved') return err('Already approved — nothing to retry.', 409)
      if (!['rejected', 'changes_requested', 'verification_pending'].includes(w.paymentStatus)) {
        return err('Payment retry is not available in this state.', 400)
      }
      const body = await request.json().catch(() => ({}))
      if (!body.dataUri || typeof body.dataUri !== 'string' || !body.dataUri.startsWith('data:image/')) return err('Please attach a payment screenshot')
      if (body.dataUri.length > 14 * 1024 * 1024) return err('Screenshot too large (max ~10MB)')
      const folder = `vivoha/payments/${w.id}`
      const uploaded = await uploadDataUri(body.dataUri, folder)
      const now = new Date()
      const attempt = {
        id: uuidv4(),
        screenshot: uploaded,
        txnRef: String(body.txnRef || '').slice(0, 80),
        note: String(body.note || '').slice(0, 400),
        status: 'verification_pending',
        createdAt: now,
      }
      await db.collection('weddings').updateOne(
        { id: w.id },
        {
          $set: {
            paymentStatus: 'verification_pending',
            paymentScreenshot: uploaded,
            paymentSubmittedAt: now,
            paymentTxnRef: attempt.txnRef,
            paymentNote: attempt.note,
            paymentRejectionReason: '',
            updatedAt: now,
          },
          $push: { paymentAttempts: attempt },
        }
      )
      await logEmail(db, {
        type: 'payment_submitted',
        to: w.onboardEmail,
        weddingId: w.id,
        statusToken: tok,
        subject: 'New payment received — verification under way',
        body: `Hi ${w.brideName} & ${w.groomName}, we received your retry. We'll publish within a few hours. Track: /status/${tok}`,
      })
      return ok({ ok: true, status: 'verification_pending' })
    }

    // ===== HEALTH =====
    if (route === '/' || route === '/root') {
      return ok({ message: 'Vivoha API', ok: true })
    }

    return err(`Route ${route} not found`, 404)
  } catch (e) {
    console.error('API error:', e)
    return err(e.message || 'Internal server error', 500)
  }
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const DELETE = handler
export const PATCH = handler
