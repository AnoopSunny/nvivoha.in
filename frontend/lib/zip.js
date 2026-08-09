import JSZip from 'jszip'

/** Fetch each photo URL, pack into a ZIP, return Buffer. */
export async function buildPhotoZip(photos, slug) {
  const zip = new JSZip()
  zip.file('README.txt',
    `Photo Wall — ${slug}\n` +
    `Exported on ${new Date().toISOString()}\n` +
    `Total photos: ${photos.length}\n`
  )

  for (let i = 0; i < photos.length; i++) {
    const p = photos[i]
    if (!p?.image?.url) continue
    try {
      const res = await fetch(p.image.url)
      if (!res.ok) continue
      const buf = Buffer.from(await res.arrayBuffer())
      const ext = (p.image.url.split('.').pop() || 'jpg').split('?')[0].toLowerCase().slice(0, 5)
      const safeName = (p.uploaderName || 'guest').replace(/[^a-z0-9_-]+/gi, '_').slice(0, 30)
      const filename = `${String(i + 1).padStart(3, '0')}-${safeName}.${ext}`
      zip.file(filename, buf)
    } catch (_) { /* skip failures */ }
  }

  return await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } })
}
