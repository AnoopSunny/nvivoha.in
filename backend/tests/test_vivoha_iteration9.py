"""
Vivoha backend regression tests — iteration 9
Covers:
  * /api/leads dedupe + relaxed validation
  * /api/onboard/start (self-serve) + preview expiry chain
  * /api/onboard/submit-payment 409 on resubmit
  * Invite password gate bypass for previews (onboardToken)
  * Preview expiry simulated via direct DB write
  * Smoke checks: /api/auth/login, /api/public/previews, /api/ root
"""
import os
import time
import uuid
import base64
import datetime
import pytest
import requests
from pymongo import MongoClient

BASE_URL = "https://b4346bfa-8ce6-4499-b22a-0c314028bcf0.preview.emergentagent.com"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "vivoha_db"

ADMIN_EMAIL = "admin@vivoha.in"
ADMIN_PASSWORD = "VivohaAdmin@2026"

TINY_PNG = (
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ"
    "AAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
)


@pytest.fixture(scope="session")
def db():
    return MongoClient(MONGO_URL)[DB_NAME]


@pytest.fixture(scope="session")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# ---------- Smoke ----------
class TestSmoke:
    def test_root(self, s):
        # /api/ has a known ingress redirect loop; /api/root hits the same handler
        r = s.get(f"{BASE_URL}/api/root")
        assert r.status_code == 200, r.text
        assert r.json().get("ok") is True

    def test_public_previews(self, s):
        r = s.get(f"{BASE_URL}/api/public/previews")
        assert r.status_code == 200, r.text
        assert "previews" in r.json()

    def test_admin_login(self, s):
        r = s.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "token" in data and data["user"]["email"] == ADMIN_EMAIL


# ---------- Leads ----------
class TestLeads:
    def test_name_only_fails(self, s):
        r = s.post(f"{BASE_URL}/api/leads", json={"name": "TEST_OnlyName"})
        assert r.status_code == 400, r.text
        assert "phone" in r.text.lower() or "email" in r.text.lower()

    def test_name_plus_phone_ok(self, s, db):
        phone = f"99{int(time.time())%10**8:08d}"
        r = s.post(
            f"{BASE_URL}/api/leads",
            json={"name": "TEST_PhoneOnly", "phone": phone, "source": "pytest"},
        )
        assert r.status_code == 201, r.text
        lead = r.json()["lead"]
        assert lead["phone"] == phone and lead["email"] == ""
        # cleanup
        db.leads.delete_one({"id": lead["id"]})

    def test_name_plus_email_and_dedupe(self, s, db):
        email = f"TEST_dedup_{uuid.uuid4().hex[:8]}@example.com"
        r1 = s.post(
            f"{BASE_URL}/api/leads",
            json={"name": "TEST_Dedupe", "email": email.upper(), "source": "pytest"},
        )
        assert r1.status_code == 201, r1.text
        lead1 = r1.json()["lead"]
        # normalised to lowercase
        assert lead1["email"] == email.lower()
        assert lead1.get("touchCount") == 1

        # 2nd POST same email — different case — should dedupe
        r2 = s.post(
            f"{BASE_URL}/api/leads",
            json={
                "name": "TEST_DedupeAgain",
                "email": email,
                "message": "second touch",
                "source": "pytest2",
            },
        )
        assert r2.status_code == 200, r2.text
        body2 = r2.json()
        assert body2.get("deduped") is True
        assert body2["lead"]["id"] == lead1["id"]

        # confirm DB touchCount incremented
        from_db = db.leads.find_one({"id": lead1["id"]})
        assert from_db["touchCount"] == 2
        db.leads.delete_one({"id": lead1["id"]})


# ---------- Self-serve onboarding + preview expiry chain ----------
@pytest.fixture(scope="class")
def onboard_session(s, db):
    """Create a fresh self-serve draft and clean up at the end of the class."""
    email = f"TEST_onb_{uuid.uuid4().hex[:8]}@example.com"
    payload = {
        "brideName": "TestBride",
        "groomName": "TestGroom",
        "weddingDate": "2027-12-12",
        "email": email,
        "template": "Moonveil",
    }
    r = s.post(f"{BASE_URL}/api/onboard/start", json=payload)
    assert r.status_code == 201, r.text
    data = r.json()
    yield {"email": email, "payload": payload, **data}
    # teardown
    db.weddings.delete_many({"onboardToken": data["token"]})
    db.leads.delete_many({"email": email})


class TestOnboardingFlow:
    def test_onboard_wedding_get(self, s, onboard_session):
        tok = onboard_session["token"]
        r = s.get(f"{BASE_URL}/api/onboard/wedding/{tok}")
        assert r.status_code == 200, r.text
        w = r.json()["wedding"]
        assert w["onboardToken"] == tok
        assert "passwordProtected" in w and w["passwordProtected"] is False
        assert "previewExpired" in w and w["previewExpired"] is False

    def test_public_wedding_sets_previewExpiresAt(self, s, db, onboard_session):
        slug = onboard_session["slug"]
        tok = onboard_session["token"]
        r = s.get(f"{BASE_URL}/api/public/wedding/{slug}?onboardToken={tok}")
        assert r.status_code == 200, r.text
        # DB now has previewFirstViewedAt and previewExpiresAt set ~10 mins apart
        w = db.weddings.find_one({"onboardToken": tok})
        assert w.get("previewFirstViewedAt") is not None
        assert w.get("previewExpiresAt") is not None
        delta = (w["previewExpiresAt"] - w["previewFirstViewedAt"]).total_seconds()
        # 10 minutes ±2 seconds tolerance
        assert 595 <= delta <= 605, f"expected ~600s, got {delta}"

    def test_second_self_serve_same_email_no_duplicate_lead(self, s, db, onboard_session):
        email = onboard_session["email"].lower()
        leads_before = list(db.leads.find({"email": email}))
        assert len(leads_before) == 1, leads_before
        first_id = leads_before[0]["id"]
        first_touch = leads_before[0].get("touchCount", 1)

        # second self-serve with same email
        payload2 = {
            **onboard_session["payload"],
            "brideName": "TestBride2",
            "groomName": "TestGroom2",
            "template": "Aurelia",
        }
        r = s.post(f"{BASE_URL}/api/onboard/start", json=payload2)
        assert r.status_code == 201, r.text
        new_tok = r.json()["token"]

        leads_after = list(db.leads.find({"email": email}))
        assert len(leads_after) == 1, f"duplicate lead created: {leads_after}"
        assert leads_after[0]["id"] == first_id
        assert leads_after[0]["touchCount"] == first_touch + 1
        assert leads_after[0]["templateInterest"] == "Aurelia"

        # cleanup the second wedding draft
        db.weddings.delete_many({"onboardToken": new_tok})


# ---------- Invite password should NOT block preview ----------
class TestInvitePasswordBypassesPreview:
    def test_preview_open_after_password_protect(self, s, db):
        # create fresh draft
        email = f"TEST_pwd_{uuid.uuid4().hex[:8]}@example.com"
        r = s.post(
            f"{BASE_URL}/api/onboard/start",
            json={
                "brideName": "PwdBride",
                "groomName": "PwdGroom",
                "weddingDate": "2027-11-11",
                "email": email,
                "template": "Moonveil",
            },
        )
        assert r.status_code == 201, r.text
        d = r.json()
        tok, slug = d["token"], d["slug"]
        try:
            # Set passwordProtect via PUT
            pr = s.put(
                f"{BASE_URL}/api/onboard/wedding/{tok}",
                json={"passwordProtect": True, "invitePassword": "secret123"},
            )
            assert pr.status_code == 200, pr.text
            w = pr.json()["wedding"]
            assert w["passwordProtected"] is True

            # GET via onboardToken — must be 200 (preview bypasses password)
            gr = s.get(f"{BASE_URL}/api/public/wedding/{slug}?onboardToken={tok}")
            assert gr.status_code == 200, gr.text
            assert "requiresPassword" not in gr.text

            # GET without onboardToken — published-only check should 404 (it's a draft)
            # but if status==draft we get 404. We're only verifying preview bypass here.
        finally:
            db.weddings.delete_many({"onboardToken": tok})
            db.leads.delete_many({"email": email})


# ---------- Submit-payment 409 on resubmit ----------
class TestSubmitPaymentLock:
    def test_resubmit_after_verification_pending_returns_409(self, s, db):
        """Cloudinary isn't configured in this env so we can't make the *first*
        submit-payment call succeed end-to-end (it 500s on upload). We assert
        the actual guard logic instead by flipping paymentStatus in the DB and
        confirming both the 'verification_pending' and 'approved' branches
        short-circuit with HTTP 409 *before* hitting Cloudinary."""
        email = f"TEST_pay_{uuid.uuid4().hex[:8]}@example.com"
        r = s.post(
            f"{BASE_URL}/api/onboard/start",
            json={
                "brideName": "PayBride",
                "groomName": "PayGroom",
                "weddingDate": "2027-10-10",
                "email": email,
                "template": "Moonveil",
            },
        )
        assert r.status_code == 201, r.text
        d = r.json()
        tok = d["token"]
        try:
            # select a plan first (required by submit-payment)
            pr = s.post(
                f"{BASE_URL}/api/onboard/select-plan/{tok}",
                json={"plan": "essential"},
            )
            assert pr.status_code == 200, pr.text

            # Simulate verification_pending state directly
            db.weddings.update_one(
                {"onboardToken": tok},
                {"$set": {"paymentStatus": "verification_pending"}},
            )
            r2 = s.post(
                f"{BASE_URL}/api/onboard/submit-payment/{tok}",
                json={"dataUri": TINY_PNG, "txnRef": "TESTTXN2"},
            )
            assert r2.status_code == 409, r2.text
            assert "verified" in r2.text.lower() or "verifying" in r2.text.lower()

            # Flip to approved -> also 409
            db.weddings.update_one(
                {"onboardToken": tok},
                {"$set": {"paymentStatus": "approved"}},
            )
            r3 = s.post(
                f"{BASE_URL}/api/onboard/submit-payment/{tok}",
                json={"dataUri": TINY_PNG, "txnRef": "TESTTXN3"},
            )
            assert r3.status_code == 409, r3.text
            assert "published" in r3.text.lower() or "already" in r3.text.lower()

            # select-plan also locked
            pr2 = s.post(
                f"{BASE_URL}/api/onboard/select-plan/{tok}",
                json={"plan": "premium"},
            )
            assert pr2.status_code == 423, pr2.text
        finally:
            db.weddings.delete_many({"onboardToken": tok})
            db.leads.delete_many({"email": email})


# ---------- Preview expiry via direct DB manipulation ----------
class TestPreviewExpiry:
    def test_expired_preview_returns_410(self, s, db):
        email = f"TEST_exp_{uuid.uuid4().hex[:8]}@example.com"
        r = s.post(
            f"{BASE_URL}/api/onboard/start",
            json={
                "brideName": "ExpBride",
                "groomName": "ExpGroom",
                "weddingDate": "2027-09-09",
                "email": email,
                "template": "Moonveil",
            },
        )
        assert r.status_code == 201, r.text
        d = r.json()
        tok, slug = d["token"], d["slug"]
        try:
            # First view to set timestamps
            v = s.get(f"{BASE_URL}/api/public/wedding/{slug}?onboardToken={tok}")
            assert v.status_code == 200

            # Force expiry — 20 min ago
            twenty_min_ago = datetime.datetime.utcnow() - datetime.timedelta(minutes=20)
            db.weddings.update_one(
                {"onboardToken": tok},
                {"$set": {
                    "previewFirstViewedAt": twenty_min_ago,
                    "previewExpiresAt": twenty_min_ago + datetime.timedelta(minutes=10),
                }},
            )

            # GET public/wedding -> 410
            r1 = s.get(f"{BASE_URL}/api/public/wedding/{slug}?onboardToken={tok}")
            assert r1.status_code == 410, r1.text
            assert r1.json().get("expired") is True

            # PUT onboard/wedding -> 410
            r2 = s.put(
                f"{BASE_URL}/api/onboard/wedding/{tok}",
                json={"tagline": "should not save"},
            )
            assert r2.status_code == 410, r2.text

            # GET onboard/wedding should return 200 with previewExpired:true
            r3 = s.get(f"{BASE_URL}/api/onboard/wedding/{tok}")
            assert r3.status_code == 200, r3.text
            assert r3.json()["wedding"]["previewExpired"] is True
        finally:
            db.weddings.delete_many({"onboardToken": tok})
            db.leads.delete_many({"email": email})
