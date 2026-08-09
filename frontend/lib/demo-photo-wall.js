/**
 * Demo Guest Photo Wall — assets + funky name/caption pools.
 *
 * Used ONLY on /demo/[templateSlug] pages so that lead-only visitors see
 * what a packed photo wall feels like (the /preview pages still show the
 * empty themed placeholders since those belong to a real, paying couple).
 *
 * Selection is deterministic per (slug + index) so each page renders
 * stably across SSR / hydration / refresh — no jumpy re-shuffles.
 */

// 8 hand-picked Vivoha demo photos (uploaded to Cloudinary so they never break)
export const DEMO_PHOTOS = [
  'https://res.cloudinary.com/dqnjsxtcl/image/upload/v1779372951/vivoha/demo-photowall/couple-cousin-circle.jpg',
  'https://res.cloudinary.com/dqnjsxtcl/image/upload/v1779372952/vivoha/demo-photowall/sangeet-bestie-pile.jpg',
  'https://res.cloudinary.com/dqnjsxtcl/image/upload/v1779372953/vivoha/demo-photowall/mehendi-hands.jpg',
  'https://res.cloudinary.com/dqnjsxtcl/image/upload/v1779372953/vivoha/demo-photowall/haldi-hug.jpg',
  'https://res.cloudinary.com/dqnjsxtcl/image/upload/v1779372954/vivoha/demo-photowall/bridesmaid-cluster.jpg',
  'https://res.cloudinary.com/dqnjsxtcl/image/upload/v1779374479/vivoha/demo-photowall/haldi-petal-toss.jpg',
  'https://res.cloudinary.com/dqnjsxtcl/image/upload/v1779374480/vivoha/demo-photowall/mehendi-squad-selfie.jpg',
  'https://res.cloudinary.com/dqnjsxtcl/image/upload/v1779374481/vivoha/demo-photowall/after-party-peace-sign.jpg',
]

// Playful guest aliases — the vibe is "your circle of besties on a wild night"
export const DEMO_NAMES = [
  'your bestieee',
  'shreyaa here',
  'sheryaaa',
  'bestieee',
  'your friend',
  'cousin gang',
  'pari ❤︎',
  'aman bhaiyaaa',
  'tanu di',
  'roomie x4',
  'chai squad',
  'naina_xo',
  'ishaan',
  'rhea',
  'kabir',
  'mehul',
  'school bois',
  'college gang',
  'kiara’s plus 1',
  'late-night squad',
  'meher',
  'rohan',
  'maasi',
  'priya 💃',
  'ananya',
  'sahil',
  'tanvi',
  'di & jiju',
  'the chachu',
  'office gang',
]

// Festive, slightly mischievous shaadi captions
export const DEMO_CAPTIONS = [
  'best groom ever 🤵🏽',
  'how does this loook??',
  'we love youuu!!!',
  'thank me later 😉',
  'we rocked your party!',
  'happy married life ❤️',
  'finally legal 😂',
  'so much love · so much daaru',
  'frame this one',
  'crashing the dance floor',
  'mehendi szn 🌿',
  'best couple in town',
  'forever wala pyaar 💕',
  'see you in the wedding album!',
  'haldi got us 💛',
  'baraat MVPs',
  'main character energy',
  'screenshot incoming',
  'crying happy tears',
  'cousin core unlocked',
  'this is the one!',
  'tag yourselves',
  'shaadi mein zaroor aana',
  'tum bhi smile karo 🥹',
  'iconic, period.',
  'love wins 💍',
  'we ate and left no crumbs',
  'forever bridesmaid',
  'guess who looks fab 💁🏽‍♀️',
  'ok one more for the gram',
]

// Deterministic seeded shuffle/pick — same input → same output (SSR safe).
function fnv1a(str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0
  }
  return h
}

/**
 * Returns the demo wall content for a given seed (typically the wedding slug
 * or template name). Output is stable for a given seed.
 *
 * Returns an array of: { id, image.url, uploaderName, caption, createdAt }
 * (shape matches what LivePhotoWall already expects).
 */
export function getDemoPhotoWall(seed = 'vivoha-demo', count = DEMO_PHOTOS.length) {
  const photos = DEMO_PHOTOS.slice(0, count)
  const usedNames = new Set()
  const usedCaps = new Set()

  return photos.map((url, i) => {
    const h = fnv1a(`${seed}::${i}`)
    // Pick a name that hasn't been used yet for variety
    let n = DEMO_NAMES[h % DEMO_NAMES.length]
    let attempt = 0
    while (usedNames.has(n) && attempt < DEMO_NAMES.length) {
      attempt++
      n = DEMO_NAMES[(h + attempt * 7) % DEMO_NAMES.length]
    }
    usedNames.add(n)

    const h2 = fnv1a(`${seed}::cap::${i}`)
    let c = DEMO_CAPTIONS[h2 % DEMO_CAPTIONS.length]
    let attempt2 = 0
    while (usedCaps.has(c) && attempt2 < DEMO_CAPTIONS.length) {
      attempt2++
      c = DEMO_CAPTIONS[(h2 + attempt2 * 11) % DEMO_CAPTIONS.length]
    }
    usedCaps.add(c)

    return {
      id: `demo-${i}`,
      image: { url },
      uploaderName: n,
      caption: c,
      // Stable createdAt so SSR/CSR don't mismatch
      createdAt: new Date(1733184000000 - i * 3600 * 1000).toISOString(),
    }
  })
}
