/**
 * Vivoha — Central Plan Configuration
 * All limits, features, analytics flags and pricing live here.
 * Backend route.js enforces everything; frontend reads to gate fields gracefully.
 */

export const PLAN_CONFIG = {
  // ===== Vivoha Wedding Experience — the only customer-facing tier (₹799) =====
  // Every couple gets the full studio treatment: all templates, photo wall,
  // RSVPs, multi-event timelines, concierge support, lifetime hosting.
  // Limits are generous-but-sane to keep the experience premium.
  vivoha: {
    id: 'vivoha',
    name: 'Vivoha Wedding Experience',
    price: 799,
    order: 1,
    tagline: 'One studio-crafted experience for every couple.',
    perks: [
      'Access to all wedding templates',
      'Couple story · multi-event timeline · venues · maps',
      'Live Guest Photo Wall (QR uploads · approval queue)',
      'Live RSVPs · meal preferences · WhatsApp confirmations',
      'Personal Wedding Hub · studio concierge support',
      'Studio review · free edits · lifetime hosting',
    ],
    limits: {
      maxGalleryPhotos: 60,
      maxRsvpResponses: 600,
      maxLiveWallUploads: 400,
      hostingMonths: 60,
    },
    features: {
      photoWall: true,
      customDomain: false,
      videoEmbeds: true,
      musicEmbed: true,
      memoryArchive: true,
      conciergeSupport: true,
      premiumAnimations: true,
      advancedRsvp: true,
      mealPreferences: true,
      customSlug: true,
      autoCompression: true,
      photoModeration: true,
      topMoments: true,
      multiEventPages: true,
    },
    analytics: {
      visits: true,
      rsvpCount: true,
      rsvpAdvanced: true,
      liveWall: true,
      topMoments: true,
      visitorInsights: true,
    },
  },
  // ===== Legacy tiers — kept ONLY for historical doc resolution (no UI). =====
  // No new wedding is ever priced into these. Any code path that reads them
  // (e.g. admin revenue stats on archived records) still works.
  classic: {
    id: 'classic',
    name: 'Classic',
    price: 1499,
    order: 90,
    tagline: 'Legacy tier · no longer offered.',
    perks: ['Legacy plan — see Vivoha Wedding Experience for current inclusions.'],
    limits: {
      maxGalleryPhotos: 15,
      maxRsvpResponses: 150,
      maxLiveWallUploads: 0,
      hostingMonths: 6,
    },
    features: {
      photoWall: false,
      customDomain: false,
      videoEmbeds: false,
      musicEmbed: false,
      memoryArchive: false,
      conciergeSupport: false,
      premiumAnimations: false,
      advancedRsvp: false,
      mealPreferences: false,
      customSlug: false,
      autoCompression: false,
      photoModeration: false,
      topMoments: false,
      multiEventPages: false,
    },
    analytics: {
      visits: true,
      rsvpCount: true,
      rsvpAdvanced: false,
      liveWall: false,
      topMoments: false,
      visitorInsights: false,
    },
  },
  grand: {
    id: 'grand',
    name: 'Grand',
    price: 3499,
    order: 91,
    tagline: 'Legacy tier · no longer offered.',
    perks: ['Legacy plan — see Vivoha Wedding Experience for current inclusions.'],
    limits: {
      maxGalleryPhotos: 40,
      maxRsvpResponses: 400,
      maxLiveWallUploads: 250,
      hostingMonths: 12,
    },
    features: {
      photoWall: true,
      customDomain: false,
      videoEmbeds: true,
      musicEmbed: false,
      memoryArchive: false,
      conciergeSupport: false,
      premiumAnimations: false,
      advancedRsvp: true,
      mealPreferences: true,
      customSlug: true,
      autoCompression: true,
      photoModeration: true,
      topMoments: false,
      multiEventPages: false,
    },
    analytics: {
      visits: true,
      rsvpCount: true,
      rsvpAdvanced: true,
      liveWall: true,
      topMoments: false,
      visitorInsights: false,
    },
  },
  elegant: {
    id: 'elegant',
    name: 'Elegant',
    price: 5999,
    order: 92,
    tagline: 'Legacy tier · no longer offered.',
    perks: ['Legacy plan — see Vivoha Wedding Experience for current inclusions.'],
    limits: {
      maxGalleryPhotos: 75,
      maxRsvpResponses: 800,
      maxLiveWallUploads: 500,
      hostingMonths: 36,
    },
    features: {
      photoWall: true,
      customDomain: true,
      videoEmbeds: true,
      musicEmbed: true,
      memoryArchive: true,
      conciergeSupport: true,
      premiumAnimations: true,
      advancedRsvp: true,
      mealPreferences: true,
      customSlug: true,
      autoCompression: true,
      photoModeration: true,
      topMoments: true,
      multiEventPages: true,
    },
    analytics: {
      visits: true,
      rsvpCount: true,
      rsvpAdvanced: true,
      liveWall: true,
      topMoments: true,
      visitorInsights: true,
    },
  },
}

// Customer-facing ordering — only the Vivoha tier is ever surfaced in UI.
export const PLAN_ORDER = ['vivoha']

// Legacy plan ids (accepted on input + migrated to the new single tier).
// Old admin payloads and any in-flight migrations resolve gracefully.
export const LEGACY_PLAN_MAP = {
  essential: 'vivoha',
  signature: 'vivoha',
  heirloom: 'vivoha',
  eternal: 'vivoha',
}

export function normalisePlan(p) {
  if (!p) return null
  if (p in PLAN_CONFIG) return p
  return LEGACY_PLAN_MAP[p] || null
}

export function getPlan(planId) {
  return PLAN_CONFIG[normalisePlan(planId) || 'vivoha']
}

export function getPlanFor(wedding) {
  return getPlan(wedding?.plan)
}

/** Returns the lowest plan that includes a given feature flag. */
export function minPlanFor(featureKey) {
  for (const id of PLAN_ORDER) {
    if (PLAN_CONFIG[id].features?.[featureKey]) return id
  }
  return null
}

/** Returns label like 'Grand or higher' */
export function planRequirementLabel(featureKey) {
  const min = minPlanFor(featureKey)
  if (!min) return ''
  return `${PLAN_CONFIG[min].name} or higher`
}

/** A gentle, premium copy generator for limit messages. */
export function limitMessage(planId, kind) {
  const plan = getPlan(planId)
  const lookup = {
    gallery: `Your ${plan.name} plan includes up to ${plan.limits.maxGalleryPhotos} gallery photos.`,
    rsvp:    `Your ${plan.name} plan welcomes up to ${plan.limits.maxRsvpResponses} RSVP responses.`,
    liveWall: plan.features.photoWall
      ? `Your ${plan.name} plan supports up to ${plan.limits.maxLiveWallUploads} guest photo uploads.`
      : `The Live Photo Wall is part of the Grand and Elegant experiences.`,
    customDomain: `Custom domains are part of the Elegant experience.`,
    musicEmbed: `Music integration is part of the Elegant experience.`,
    videoEmbeds: `Video embeds are part of the Grand and Elegant experiences.`,
  }
  return lookup[kind] || `This is included in a higher plan.`
}
