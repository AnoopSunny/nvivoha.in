import { NextResponse } from 'next/server'
import { getDb } from '@/lib/server'

export async function GET(request, { params }) {
  const id = params?.id
  if (!id) return new NextResponse('Not found', { status: 404 })
  const db = await getDb()
  const sl = await db.collection('shortlinks').findOne({ id })
  if (!sl) {
    return new NextResponse(
      `<!doctype html><html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#FDFBF7;color:#3A3226"><div style="text-align:center"><h1 style="font-family:serif">Link not found</h1><p><a href="/" style="color:#8B7355">Back to Vivoha</a></p></div></body></html>`,
      { status: 404, headers: { 'Content-Type': 'text/html' } }
    )
  }
  await db.collection('shortlinks').updateOne({ id }, { $inc: { hits: 1 } })
  return NextResponse.redirect(sl.target, 302)
}
