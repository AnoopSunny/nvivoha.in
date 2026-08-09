import { MongoClient } from 'mongodb'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { v2 as cloudinary } from 'cloudinary'
import { randomUUID, randomBytes } from 'crypto'

let _client
let _db
let _seedPromise

export async function getDb() {
  if (!_db) {
    _client = new MongoClient(process.env.MONGO_URL)
    await _client.connect()
    _db = _client.db(process.env.DB_NAME)
  }
  // Run seed once on first DB access (lazy, idempotent)
  if (!_seedPromise) {
    _seedPromise = (async () => {
      try { await migrateLegacyAdmins(_db) } catch (e) { console.error('Admin migration failed:', e) }
      try { await seedAdmin(_db) } catch (e) { console.error('Admin seed failed:', e) }
      try { await migrateLegacyPlans(_db) } catch (e) { console.error('Plan migration failed:', e) }
      try { await migrateDashboardTokens(_db) } catch (e) { console.error('Dashboard token migration failed:', e) }
    })()
  }
  return _db
}

// Remove any legacy admin@kalyanaya.com user (one-time rename cleanup) + reassign ownership
async function migrateLegacyAdmins(db) {
  const legacy = await db.collection('users').findOne({ email: 'admin@kalyanaya.com' })
  if (!legacy) return
  // Try to find the new admin so we can transfer ownership
  const newAdminEmail = process.env.ADMIN_EMAIL
  const newAdmin = newAdminEmail ? await db.collection('users').findOne({ email: newAdminEmail }) : null
  if (newAdmin && newAdmin.id && legacy.id) {
    for (const col of ['weddings', 'forms', 'shortlinks', 'leads', 'revenues']) {
      await db.collection(col).updateMany({ userId: legacy.id }, { $set: { userId: newAdmin.id } })
    }
  }
  await db.collection('users').deleteOne({ email: 'admin@kalyanaya.com' })
}

const LEGACY_PLAN_MAP = { essential: 'classic', signature: 'grand', heirloom: 'elegant', eternal: 'elegant' }

async function migrateLegacyPlans(db) {
  for (const [from, to] of Object.entries(LEGACY_PLAN_MAP)) {
    await db.collection('weddings').updateMany({ plan: from }, { $set: { plan: to } })
    await db.collection('revenues').updateMany({ plan: from }, { $set: { plan: to } })
  }
}

// Backfill clientAccess.dashboardToken for weddings that have a password but no token yet.
async function migrateDashboardTokens(db) {
  const cursor = db.collection('weddings').find({
    'clientAccess.passwordHash': { $exists: true },
    'clientAccess.dashboardToken': { $exists: false },
  })
  for await (const w of cursor) {
    const token = randomBytes(32).toString('hex')
    await db.collection('weddings').updateOne(
      { _id: w._id },
      { $set: { 'clientAccess.dashboardToken': token, 'clientAccess.updatedAt': new Date() } }
    )
  }
}

async function seedAdmin(db) {
  const email = (process.env.ADMIN_EMAIL || 'admin@vivoha.in').toLowerCase()
  const password = process.env.ADMIN_PASSWORD || 'VivohaAdmin@2026'
  const name = process.env.ADMIN_NAME || 'Vivoha Admin'
  const existing = await db.collection('users').findOne({ email })
  if (existing) return
  const user = {
    id: randomUUID(),
    email,
    password: await bcrypt.hash(password, 10),
    name,
    role: 'admin',
    createdAt: new Date(),
  }
  await db.collection('users').insertOne(user)
  console.log(`[seed] Admin user created: ${email}`)
}

export function signToken(payload, expiresIn = '30d') {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn })
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET)
  } catch (e) {
    return null
  }
}

export function getAuthUser(request) {
  const auth = request.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return null
  return verifyToken(token)
}

export async function hashPassword(p) {
  return bcrypt.hash(p, 10)
}

export async function comparePassword(p, h) {
  return bcrypt.compare(p, h)
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

export { cloudinary }

export async function uploadDataUri(dataUri, folder = 'vivoha') {
  const result = await cloudinary.uploader.upload(dataUri, {
    folder,
    resource_type: 'image',
  })
  return { url: result.secure_url, publicId: result.public_id }
}

// Lower-quality preview upload — Cloudinary transforms incoming bytes:
// q_auto:low, w_1200, f_auto. Used for ALL pre-payment uploads to avoid abuse.
// Tags as `preview-upload` so admin can sweep stale ones.
export async function uploadPreviewDataUri(dataUri, folder = 'vivoha-preview') {
  const result = await cloudinary.uploader.upload(dataUri, {
    folder,
    resource_type: 'image',
    quality: 'auto:low',
    width: 1200,
    crop: 'limit',
    fetch_format: 'auto',
    tags: ['preview-upload', 'vivoha-preview'],
  })
  return { url: result.secure_url, publicId: result.public_id, isPreview: true }
}

export async function destroyImage(publicId) {
  try {
    return await cloudinary.uploader.destroy(publicId, { invalidate: true })
  } catch (e) {
    return { result: 'error', error: e.message }
  }
}

export function slugify(s) {
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}
