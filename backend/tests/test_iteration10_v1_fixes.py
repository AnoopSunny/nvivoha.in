"""
Vivoha backend regression tests — iteration 10 (V1 fixes)

Covers the 7 fixes shipped in iteration 10:
  1. Preview TTL now 24h (previewExpiresAt ~86,400,000 ms after previewFirstViewedAt)
  2. PUT /api/onboard/wedding/{tok} returns 423 when paymentStatus is
     verification_pending OR approved. Edits still allowed when not_started.
  3. GET /api/public/wedding/{slug}?onboardToken={tok} exposes paymentStatus
     and statusToken to the preview (used by 'Payment Approval Pending' state).
  4. GET /api/status/{tok}:
       - canEdit=false, editUrl=null, previewUrl populated when
         paymentStatus is verification_pending OR approved
       - publicUrl + shortUrl populated after admin approval
  5. POST /api/status/{tok}/short-link:
       - returns 409 when wedding not yet published
       - returns shortUrl using external x-forwarded-host once published
  6. GET /api/status/{tok}/invite-pdf:
       - returns 409 when not published
       - returns application/pdf bytes (non-zero) after approval
  7. End-to-end self-serve flow with admin approval.

Also smoke-tests admin login, /api/public/previews, /api/root to confirm
no regressions.
"""
import os
import uuid
import datetime
import pytest
import requests
from pymongo import MongoClient

BASE_URL = "https://43c9b774-7841-4961-a482-af702e8488db.preview.emergentagent.com"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "vivoha_db"

ADMIN_EMAIL = "admin@vivoha.in"
ADMIN_PASSWORD = "Vivoha@2026"

# valid 1x1 PNG (cloudinary accepts this)
TINY_PNG = (
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ"
    "AAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
)


# -------- fixtures --------
@pytest.fixture(scope="session")
def db():
    return MongoClient(MONGO_URL)[DB_NAME]


@pytest.fixture(scope="session")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


@pytest.fixture(scope="session")
def admin_token(s):
    r = s.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )
    assert r.status_code == 200, r.text
    return r.json()["token"]


def _start_onboard(s, db, email_prefix="it10"):
    """Create a fresh self-serve draft, return the start payload."""
    email = f"TEST_{email_prefix}_{uuid.uuid4().hex[:8]}@example.com"
    payload = {
        "brideName": "TEST_Bride",
        "groomName": "TEST_Groom",
        "weddingDate": "2027-12-12",
        "email": email,
        "template": "Moonveil",
    }
    r = s.post(f"{BASE_URL}/api/onboard/start", json=payload)
    assert r.status_code == 201, r.text
    d = r.json()
    return {"email": email, **d}


def _cleanup(db, tok=None, email=None):
    if tok:
        db.weddings.delete_many({"onboardToken": tok})
    if email:
        db.leads.delete_many({"email": email.lower()})


# -------- 0. Smoke (no regression) --------
class TestSmoke:
    def test_root(self, s):
        r = s.get(f"{BASE_URL}/api/root")
        assert r.status_code == 200, r.text
        assert r.json().get("ok") is True

    def test_admin_login_works(self, admin_token):
        assert isinstance(admin_token, str) and len(admin_token) > 20

    def test_public_previews(self, s):
        r = s.get(f"{BASE_URL}/api/public/previews")
        assert r.status_code == 200, r.text
        assert "previews" in r.json()


# -------- 1. Preview TTL = 24h --------
class TestPreviewTTL24h:
    def test_previewExpiresAt_is_24h_after_firstViewedAt(self, s, db):
        sess = _start_onboard(s, db, "ttl")
        tok, slug, email = sess["token"], sess["slug"], sess["email"]
        try:
            r = s.get(f"{BASE_URL}/api/public/wedding/{slug}?onboardToken={tok}")
            assert r.status_code == 200, r.text
            w = db.weddings.find_one({"onboardToken": tok})
            assert w["previewFirstViewedAt"] is not None
            assert w["previewExpiresAt"] is not None
            delta = (w["previewExpiresAt"] - w["previewFirstViewedAt"]).total_seconds()
            # 24 hours ±2 s
            assert 86398 <= delta <= 86402, f"expected ~86400s, got {delta}"
        finally:
            _cleanup(db, tok, email)


# -------- 3. Public wedding exposes paymentStatus + statusToken w/ onboardToken --------
class TestPublicWeddingExposesPaymentStatus:
    def test_paymentStatus_and_statusToken_in_public_response(self, s, db):
        sess = _start_onboard(s, db, "pub")
        tok, slug, email = sess["token"], sess["slug"], sess["email"]
        try:
            # Drive it to verification_pending: pick plan + submit payment
            r = s.post(
                f"{BASE_URL}/api/onboard/select-plan/{tok}",
                json={"plan": "grand"},
            )
            assert r.status_code == 200, r.text

            r = s.post(
                f"{BASE_URL}/api/onboard/submit-payment/{tok}",
                json={"dataUri": TINY_PNG, "txnRef": "TEST_TXN_PUB"},
            )
            assert r.status_code == 200, r.text
            stok = r.json()["statusToken"]

            # Public wedding with onboardToken should now show paymentStatus + statusToken
            r = s.get(f"{BASE_URL}/api/public/wedding/{slug}?onboardToken={tok}")
            assert r.status_code == 200, r.text
            w = r.json()["wedding"]
            assert w.get("paymentStatus") == "verification_pending"
            assert w.get("statusToken") == stok
        finally:
            _cleanup(db, tok, email)


# -------- 2. PUT /onboard/wedding lock --------
class TestOnboardPutLock:
    def test_put_allowed_when_not_started(self, s, db):
        sess = _start_onboard(s, db, "putok")
        tok, email = sess["token"], sess["email"]
        try:
            r = s.put(
                f"{BASE_URL}/api/onboard/wedding/{tok}",
                json={"tagline": "Edits should work pre-payment"},
            )
            assert r.status_code == 200, r.text
            assert r.json()["wedding"]["tagline"] == "Edits should work pre-payment"
        finally:
            _cleanup(db, tok, email)

    def test_put_blocked_with_423_when_verification_pending(self, s, db):
        sess = _start_onboard(s, db, "put_vp")
        tok, email = sess["token"], sess["email"]
        try:
            # Flip directly (avoids burning cloudinary calls)
            db.weddings.update_one(
                {"onboardToken": tok},
                {"$set": {"paymentStatus": "verification_pending"}},
            )
            r = s.put(
                f"{BASE_URL}/api/onboard/wedding/{tok}",
                json={"tagline": "should be locked"},
            )
            assert r.status_code == 423, r.text
            assert "locked" in r.text.lower() or "edits" in r.text.lower()
        finally:
            _cleanup(db, tok, email)

    def test_put_blocked_with_423_when_approved(self, s, db):
        sess = _start_onboard(s, db, "put_ap")
        tok, email = sess["token"], sess["email"]
        try:
            db.weddings.update_one(
                {"onboardToken": tok},
                {"$set": {"paymentStatus": "approved"}},
            )
            r = s.put(
                f"{BASE_URL}/api/onboard/wedding/{tok}",
                json={"tagline": "should be locked"},
            )
            assert r.status_code == 423, r.text
            assert "published" in r.text.lower() or "contact" in r.text.lower() or "status page" in r.text.lower()
        finally:
            _cleanup(db, tok, email)


# -------- 4 & 5 & 6 & 7. Full E2E flow + status page --------
class TestE2ESelfServeAndStatus:
    """Self-serve -> submit payment -> verify status (canEdit=false,
    publicUrl=null, shortUrl=null pre-approval) -> short-link 409
    -> invite-pdf 409 -> admin approve -> status approved with publicUrl
    + shortUrl -> short-link OK -> invite-pdf OK."""

    @pytest.fixture(scope="class")
    def flow(self, s, db, admin_token):
        sess = _start_onboard(s, db, "e2e")
        tok, slug, email = sess["token"], sess["slug"], sess["email"]
        # Plan + payment submit -> verification_pending
        r = s.post(f"{BASE_URL}/api/onboard/select-plan/{tok}", json={"plan": "grand"})
        assert r.status_code == 200, r.text

        r = s.post(
            f"{BASE_URL}/api/onboard/submit-payment/{tok}",
            json={"dataUri": TINY_PNG, "txnRef": "TEST_E2E"},
        )
        assert r.status_code == 200, r.text
        stok = r.json()["statusToken"]
        wid = db.weddings.find_one({"onboardToken": tok})["id"]

        yield {
            "tok": tok,
            "slug": slug,
            "email": email,
            "statusToken": stok,
            "weddingId": wid,
            "admin_token": admin_token,
        }
        _cleanup(db, tok, email)

    def test_status_verification_pending_no_publicUrl_canEdit_false(self, s, flow):
        r = s.get(f"{BASE_URL}/api/status/{flow['statusToken']}")
        assert r.status_code == 200, r.text
        v = r.json()["status"]
        assert v["paymentStatus"] == "verification_pending"
        assert v["canEdit"] is False
        assert v["editUrl"] is None
        assert v["publicUrl"] is None
        assert v["shortUrl"] is None
        assert v["previewUrl"] is not None
        assert flow["slug"] in v["previewUrl"]
        assert flow["tok"] in v["previewUrl"]

    def test_short_link_409_when_unpublished(self, s, flow):
        r = s.post(f"{BASE_URL}/api/status/{flow['statusToken']}/short-link")
        assert r.status_code == 409, r.text
        assert "not published" in r.text.lower() or "not yet" in r.text.lower()

    def test_invite_pdf_409_when_unpublished(self, s, flow):
        r = s.get(f"{BASE_URL}/api/status/{flow['statusToken']}/invite-pdf")
        assert r.status_code == 409, r.text

    def test_admin_approve_publishes(self, s, flow, db):
        h = {"Authorization": f"Bearer {flow['admin_token']}", "Content-Type": "application/json"}
        r = requests.post(
            f"{BASE_URL}/api/admin/payments/{flow['weddingId']}/approve",
            headers=h,
        )
        assert r.status_code == 200, r.text
        w = r.json()["wedding"]
        assert w["paymentStatus"] == "approved"
        assert w["status"] == "published"

    def test_status_after_approve_has_public_and_short_url(self, s, flow):
        r = s.get(f"{BASE_URL}/api/status/{flow['statusToken']}")
        assert r.status_code == 200, r.text
        v = r.json()["status"]
        assert v["paymentStatus"] == "approved"
        assert v["publishedStatus"] == "published"
        assert v["canEdit"] is False
        assert v["editUrl"] is None
        assert v["publicUrl"] is not None and flow["slug"] in v["publicUrl"]
        # publicUrl must use the external preview host (x-forwarded-host)
        assert "preview.emergentagent.com" in v["publicUrl"], v["publicUrl"]

    def test_short_link_creates_external_host_url(self, s, flow):
        r = s.post(f"{BASE_URL}/api/status/{flow['statusToken']}/short-link")
        assert r.status_code == 200, r.text
        b = r.json()
        assert "shortUrl" in b and "publicUrl" in b
        assert "preview.emergentagent.com/s/" in b["shortUrl"], b["shortUrl"]
        assert flow["slug"] in b["publicUrl"]

        # 2nd call should return the SAME shortlink (idempotent)
        r2 = s.post(f"{BASE_URL}/api/status/{flow['statusToken']}/short-link")
        assert r2.status_code == 200, r2.text
        assert r2.json()["shortUrl"] == b["shortUrl"]

    def test_status_now_returns_shortUrl_populated(self, s, flow):
        r = s.get(f"{BASE_URL}/api/status/{flow['statusToken']}")
        assert r.status_code == 200, r.text
        v = r.json()["status"]
        assert v["shortUrl"] is not None
        assert "/s/" in v["shortUrl"]

    def test_invite_pdf_returns_pdf_bytes(self, s, flow):
        r = s.get(f"{BASE_URL}/api/status/{flow['statusToken']}/invite-pdf")
        assert r.status_code == 200, r.text[:200]
        assert r.headers.get("content-type", "").startswith("application/pdf")
        # PDF magic + non-zero size
        assert r.content[:5] == b"%PDF-", r.content[:20]
        assert len(r.content) > 500, f"PDF too small: {len(r.content)} bytes"
