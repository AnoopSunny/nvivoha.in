/**
 * Vivoha — Template catalog with categories.
 * Single source of truth for the landing page filter, the demo personalization route,
 * and any future template-pickers.
 */

export const CATEGORIES = [
  { id: 'all', label: 'All Designs', short: 'All' },
  { id: 'hindu', label: 'Hindu Invitations', short: 'Hindu' },
  { id: 'christian', label: 'Christian Invitations', short: 'Christian' },
  { id: 'muslim', label: 'Muslim Invitations', short: 'Muslim' },
  { id: 'contemporary', label: 'Modern · Contemporary', short: 'Modern' },
  { id: 'destination', label: 'Destination Weddings', short: 'Destination' },
  { id: 'south-indian', label: 'Traditional South Indian', short: 'South Indian' },
]

// slug -> friendly name used by the template renderer registry.
export const TEMPLATES = [
  {
    slug: 'moonveil', name: 'Moonveil', subtitle: 'Editorial · Minimal · Timeless',
    categories: ['contemporary', 'destination'],
    coverBg: 'linear-gradient(180deg,#FDFBF7 0%, #F5EFE4 100%)', coverInk: '#3A3226', coverAccent: '#8B7355',
    coverFontId: 'cormorant', coverFontStack: '"Cormorant Garamond", Georgia, serif', coverItalic: true,
    ornament: 'rule', coverEyebrow: 'Together with love',
  },
  {
    slug: 'royal-heritage', name: 'Royal Heritage', subtitle: 'Mughal · Rich · Royal',
    categories: ['hindu'],
    coverBg: 'radial-gradient(circle at 50% 30%, #5A1A1A 0%, #2A0A0A 100%)', coverInk: '#F5C842', coverAccent: '#D4AF37',
    coverFontId: 'cinzel', coverFontStack: '"Cinzel", serif',
    ornament: 'arch', coverEyebrow: 'Royal invitation',
  },
  {
    slug: 'eternal-edit', name: 'Eternal Edit', subtitle: 'Cinematic · Dark · Bold',
    categories: ['contemporary'],
    coverBg: 'linear-gradient(180deg,#0A0A0A 0%, #1A1A1A 100%)', coverInk: '#F5F5F5', coverAccent: '#C9B896',
    coverFontId: 'bodoni', coverFontStack: '"Bodoni Moda", serif',
    ornament: 'rule', coverEyebrow: 'Chapter one',
  },
  {
    slug: 'crimson-lotus', name: 'Crimson Lotus', subtitle: 'Floral · Romantic · Garden',
    categories: ['hindu'],
    coverBg: 'linear-gradient(180deg,#FFF5F3 0%, #FCDCD4 100%)', coverInk: '#5A2A30', coverAccent: '#B8456C',
    coverFontId: 'great-vibes', coverFontStack: '"Great Vibes", cursive',
    ornament: 'wreath', coverEyebrow: 'In full bloom',
  },
  {
    slug: 'sapphire-saga', name: 'Sapphire Saga', subtitle: 'Celestial · Mughal · Royal',
    categories: ['hindu'],
    coverBg: 'radial-gradient(circle at 50% 30%, #1F3A5F 0%, #0A1226 100%)', coverInk: '#F5EFE3', coverAccent: '#C0C8DD',
    coverFontId: 'italiana', coverFontStack: '"Italiana", serif',
    ornament: 'arch', coverEyebrow: 'Written in the sky',
  },
  {
    slug: 'sanctum-veil', name: 'Sanctum Veil', subtitle: 'Cathedral · Sacred · Ivory',
    categories: ['christian'],
    coverBg: 'linear-gradient(180deg,#FFFFFF 0%, #F5F2EC 100%)', coverInk: '#2D3142', coverAccent: '#8B7E66',
    coverFontId: 'cormorant-infant', coverFontStack: '"Cormorant Infant", Georgia, serif', coverItalic: true,
    ornament: 'cross', coverEyebrow: 'A sacred union',
  },
  {
    slug: 'marigold-bloom', name: 'Marigold Bloom', subtitle: 'Festive · Vibrant · Joyful',
    categories: ['hindu'],
    coverBg: 'linear-gradient(135deg,#FFB627 0%, #FF6B35 60%, #C73E1D 100%)', coverInk: '#FFFEF5', coverAccent: '#0F5132',
    coverFontId: 'forum', coverFontStack: '"Forum", serif',
    ornament: 'wreath', coverEyebrow: 'A joyful welcome',
  },
  {
    slug: 'pearl-velvet', name: 'Pearl & Velvet', subtitle: 'Art Deco · Gatsby · Luxe',
    categories: ['contemporary', 'destination'],
    coverBg: 'linear-gradient(180deg,#0F3D2E 0%, #051A14 100%)', coverInk: '#F0DDA8', coverAccent: '#D4AF37',
    coverFontId: 'cinzel', coverFontStack: '"Cinzel", serif',
    ornament: 'rule', coverEyebrow: 'An affair to remember',
  },
  {
    slug: 'banyan-brass', name: 'Banyan & Brass', subtitle: 'Temple · Sacred · South Indian',
    categories: ['south-indian', 'hindu'],
    coverBg: 'linear-gradient(180deg,#FBF1DD 0%, #E8D5A8 100%)', coverInk: '#5A1A1A', coverAccent: '#B8860B',
    coverFontId: 'marcellus', coverFontStack: '"Marcellus", serif',
    ornament: 'kalasham', coverEyebrow: 'Subhamasthu',
  },
  {
    slug: 'pichwai-bloom', name: 'Pichwai Bloom', subtitle: 'Pichwai · Indigo · Haveli',
    categories: ['hindu'],
    coverBg: 'linear-gradient(180deg,#1A2A52 0%, #0F1A38 100%)', coverInk: '#FBC04B', coverAccent: '#E89BB1',
    coverFontId: 'italiana', coverFontStack: '"Italiana", serif',
    ornament: 'arch', coverEyebrow: 'In the haveli',
  },
  {
    slug: 'albion-vow', name: 'Albion Vow', subtitle: 'English · Manor · Garden',
    categories: ['destination', 'contemporary'],
    coverBg: 'linear-gradient(180deg,#F4F1E8 0%, #D4D9C9 100%)', coverInk: '#3D4A3C', coverAccent: '#8E5D5D',
    coverFontId: 'pinyon', coverFontStack: '"Pinyon Script", cursive',
    ornament: 'wreath', coverEyebrow: 'A garden affair',
  },
  {
    slug: 'jannah-vow', name: 'Jannah Vow', subtitle: 'Nikah · Mughal · Heritage',
    categories: ['muslim'],
    coverBg: 'radial-gradient(circle at 50% 35%, #0F5132 0%, #052414 100%)', coverInk: '#F5EFE3', coverAccent: '#C5A572',
    coverFontId: 'italiana', coverFontStack: '"Italiana", serif', coverItalic: true,
    ornament: 'eight-star', coverEyebrow: 'Bismillah',
  },
]

export function getTemplateBySlug(slug) {
  return TEMPLATES.find(t => t.slug === slug) || null
}

export function getTemplateByName(name) {
  return TEMPLATES.find(t => t.name === name) || null
}

export function filterByCategory(categoryId) {
  if (!categoryId || categoryId === 'all') return TEMPLATES
  return TEMPLATES.filter(t => t.categories.includes(categoryId))
}

// Sample hero images per template — used during personalized demo (no Cloudinary writes needed).
export const DEMO_HERO_IMAGES = {
  'moonveil': 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1600&q=80',
  'royal-heritage': 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=1600&q=80',
  'eternal-edit': 'https://images.unsplash.com/photo-1606800052052-a08af7148866?w=1600&q=80',
  'crimson-lotus': 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1600&q=80',
  'sapphire-saga': 'https://images.unsplash.com/photo-1584242353192-7a1df2e855d8?w=1600&q=80',
  'sanctum-veil': 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1600&q=80',
  'marigold-bloom': 'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&w=1600',
  'pearl-velvet': 'https://images.unsplash.com/photo-1708077809012-4740dd43bd53?w=1600&q=80',
  'banyan-brass': 'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?auto=compress&w=1600',
  'pichwai-bloom': 'https://images.pexels.com/photos/1488315/pexels-photo-1488315.jpeg?auto=compress&w=1600',
  'albion-vow': 'https://images.pexels.com/photos/1444444/pexels-photo-1444444.jpeg?auto=compress&w=1600',
  'jannah-vow': 'https://images.pexels.com/photos/2306281/pexels-photo-2306281.jpeg?auto=compress&w=1600',
}

export const DEMO_GALLERY_IMAGES = [
  'https://images.unsplash.com/photo-1519741497674-611481863552?w=900&q=80',
  'https://images.unsplash.com/photo-1606800052052-a08af7148866?w=900&q=80',
  'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&w=900',
  'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=900&q=80',
  'https://images.unsplash.com/photo-1584242353192-7a1df2e855d8?w=900&q=80',
  'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?auto=compress&w=900',
]
