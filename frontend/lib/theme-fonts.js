// Curated romantic/wedding-styled fonts for the Vivoha theme picker.
// Each font ships from Google Fonts; the wedding page lazy-loads only what's needed.

export const HEADING_FONTS = [
  { id: 'playfair', name: 'Playfair Display', stack: '"Playfair Display", "Times New Roman", serif', gfont: 'Playfair+Display:ital,wght@0,400;0,500;0,600;1,400', mood: 'Classic editorial · stately' },
  { id: 'cormorant', name: 'Cormorant Garamond', stack: '"Cormorant Garamond", Georgia, serif', gfont: 'Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400', mood: 'Light · timeless' },
  { id: 'cormorant-infant', name: 'Cormorant Infant', stack: '"Cormorant Infant", Georgia, serif', gfont: 'Cormorant+Infant:ital,wght@0,300;0,400;0,500;1,300', mood: 'Tender · romantic' },
  { id: 'cinzel', name: 'Cinzel', stack: '"Cinzel", Trajan, serif', gfont: 'Cinzel:wght@400;500;600;700', mood: 'Regal · ceremonial' },
  { id: 'italiana', name: 'Italiana', stack: '"Italiana", Didot, serif', gfont: 'Italiana', mood: 'Italian · elegant' },
  { id: 'marcellus', name: 'Marcellus', stack: '"Marcellus", "Times New Roman", serif', gfont: 'Marcellus', mood: 'Sculpted · understated' },
  { id: 'eb-garamond', name: 'EB Garamond', stack: '"EB Garamond", Garamond, serif', gfont: 'EB+Garamond:ital,wght@0,400;0,500;1,400', mood: 'Old-world · book-like' },
  { id: 'dm-serif', name: 'DM Serif Display', stack: '"DM Serif Display", serif', gfont: 'DM+Serif+Display:ital@0;1', mood: 'Glossy magazine' },
  { id: 'libre-caslon', name: 'Libre Caslon Text', stack: '"Libre Caslon Text", Caslon, serif', gfont: 'Libre+Caslon+Text:ital,wght@0,400;1,400', mood: 'Bookish · refined' },
  { id: 'lora', name: 'Lora', stack: '"Lora", Georgia, serif', gfont: 'Lora:ital,wght@0,400;0,500;1,400', mood: 'Warm · calligraphic' },
  { id: 'forum', name: 'Forum', stack: '"Forum", "Trajan", serif', gfont: 'Forum', mood: 'Roman capitals' },
  { id: 'bodoni', name: 'Bodoni Moda', stack: '"Bodoni Moda", "Bodoni 72", serif', gfont: 'Bodoni+Moda:ital,wght@0,400;0,500;0,700;1,400', mood: 'High-fashion · dramatic' },
  { id: 'great-vibes', name: 'Great Vibes', stack: '"Great Vibes", cursive', gfont: 'Great+Vibes', mood: 'Calligraphy · script', script: true },
  { id: 'allura', name: 'Allura', stack: '"Allura", cursive', gfont: 'Allura', mood: 'Flowing script', script: true },
  { id: 'tangerine', name: 'Tangerine', stack: '"Tangerine", cursive', gfont: 'Tangerine:wght@400;700', mood: 'Whimsical script', script: true },
  { id: 'parisienne', name: 'Parisienne', stack: '"Parisienne", cursive', gfont: 'Parisienne', mood: 'Modern script', script: true },
  { id: 'sacramento', name: 'Sacramento', stack: '"Sacramento", cursive', gfont: 'Sacramento', mood: 'Handwritten script', script: true },
  { id: 'dancing', name: 'Dancing Script', stack: '"Dancing Script", cursive', gfont: 'Dancing+Script:wght@400;500;700', mood: 'Playful script', script: true },
  { id: 'pinyon', name: 'Pinyon Script', stack: '"Pinyon Script", cursive', gfont: 'Pinyon+Script', mood: 'Vintage script', script: true },
  { id: 'petit-formal', name: 'Petit Formal Script', stack: '"Petit Formal Script", cursive', gfont: 'Petit+Formal+Script', mood: 'Formal script', script: true },
]

export const BODY_FONTS = [
  { id: 'cormorant', name: 'Cormorant Garamond', stack: '"Cormorant Garamond", Georgia, serif', gfont: 'Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400' },
  { id: 'eb-garamond', name: 'EB Garamond', stack: '"EB Garamond", Garamond, serif', gfont: 'EB+Garamond:ital,wght@0,400;0,500;1,400' },
  { id: 'lora', name: 'Lora', stack: '"Lora", Georgia, serif', gfont: 'Lora:ital,wght@0,400;0,500;1,400' },
  { id: 'libre-baskerville', name: 'Libre Baskerville', stack: '"Libre Baskerville", Baskerville, serif', gfont: 'Libre+Baskerville:ital,wght@0,400;0,700;1,400' },
  { id: 'crimson', name: 'Crimson Pro', stack: '"Crimson Pro", Garamond, serif', gfont: 'Crimson+Pro:ital,wght@0,300;0,400;0,500;1,300', mood: 'Soft modern serif' },
  { id: 'cormorant-infant', name: 'Cormorant Infant', stack: '"Cormorant Infant", Georgia, serif', gfont: 'Cormorant+Infant:ital,wght@0,300;0,400;0,500;1,300' },
  { id: 'inter', name: 'Inter', stack: '"Inter", system-ui, sans-serif', gfont: 'Inter:wght@300;400;500;600' },
  { id: 'montserrat', name: 'Montserrat', stack: '"Montserrat", system-ui, sans-serif', gfont: 'Montserrat:wght@300;400;500;600' },
  { id: 'poppins', name: 'Poppins', stack: '"Poppins", system-ui, sans-serif', gfont: 'Poppins:wght@300;400;500;600' },
]

export const DEFAULT_THEME = {
  accent: '',          // empty = template default
  headingFont: '',     // empty = template default
  bodyFont: '',        // empty = template default
}

export function findFont(id, fonts) {
  return fonts.find(f => f.id === id) || null
}

// Build a Google Fonts <link href> for one or more font ids.
export function buildGoogleFontsHref(fontIds) {
  const all = [...HEADING_FONTS, ...BODY_FONTS]
  const families = []
  const seen = new Set()
  for (const id of fontIds) {
    if (!id) continue
    const f = all.find(x => x.id === id)
    if (!f || seen.has(f.gfont)) continue
    seen.add(f.gfont)
    families.push(`family=${f.gfont}`)
  }
  if (families.length === 0) return null
  return `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`
}
