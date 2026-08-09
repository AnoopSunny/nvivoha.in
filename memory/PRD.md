# Vivoha — PRD

## Original context
Cloned public repo https://github.com/teranforres/vivovi into Emergent. App = Next.js 14 full-stack wedding-website builder (Emergent "nextjs-mongo-template"). FastAPI (backend/server.py) is a reverse-proxy forwarding /api/* to Next.js on :3000; all API logic lives in app/api/[[...path]]/route.js. MongoDB via MONGO_URL/DB_NAME. Cloudinary for uploads.

## Architecture
- Frontend/Backend: Next.js 14 app router (SSR + API routes) at /app/frontend.
- DB: MongoDB. Auth: JWT admin login (admin@vivoha.in). Images: Cloudinary.
- Payments: MANUAL UPI (no Razorpay account). UPI anoopsunny04@ybl, WhatsApp 917339557802, Instagram @vivoha.in.

## Implemented (dates)
- 2026-06: Cloned repo, wired env, preview live.
- 2026-06: Manual UPI payment page (/publish) — QR (server-generated PNG at /api/upi-qr), UPI copy, WhatsApp/Instagram CTAs, screenshot upload → submit-payment (verification_pending) → owner hub. Added Cloudinary keys.
- 2026-06: Admin Payment Verification — nav badge (paymentsPending), full unmasked mobile, screenshot view, Approve & Publish / Reject, pre-written WhatsApp approved/declined message buttons.
- 2026-06: BUGFIX — publishing a wedding (Weddings PUT or approve) now marks paymentStatus=approved + mints ownerToken; hub self-heals published-but-unpaid; HubView treats published as live. Hub no longer stuck on "pending payment".
- 2026-06: Price reduced 2999 → 799 everywhere; Optional add-ons removed entirely (backend ADDONS_CATALOG=[], publish/preview/terms UI stripped).
- 2026-06: DEPLOY FIX — removed `output: 'standalone'` from next.config.js so `next build` emits standard `.next` (deploy pipeline expected build/dist/.next; standalone broke frontend-build-push). Clean prod build verified.

## Test credentials
admin@vivoha.in / VivohaAdmin@2026 (see /app/memory/test_credentials.md)

## Backlog / P1-P2
- Rename legacy localStorage 'kal_token' → vivoha token (cosmetic).
- Revenue endpoints use unbounded find() — switch to aggregation/limit (perf).
- Clean unused font preloads.
