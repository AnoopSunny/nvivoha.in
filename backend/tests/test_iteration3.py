"""
Backend tests for Iteration 3 features:
- Privacy fix on GET /api/forms/public/<token> (no leak after submission)
- Form auto-shortlink generation on POST /api/forms
- Plan rename classic/grand/eternal + legacy migration acceptance
- Slim Invite PDF (smaller, valid)
- Client access admin endpoints (POST/GET/DELETE /api/weddings/<id>/client-access)
- Public client login (rate-limit + lockout)
- Client dashboard data endpoint
- Client RSVP CSV export
- Client photo-wall ZIP
- View tracking + public leak guards (viewCount/viewsByDay/clientAccess)
"""
import os
import re
import base64
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@kalyanaya.com"
ADMIN_PASSWORD = "KalyanayaAdmin@2026"
TEST_SLUG = "preview-moonveil"


# ---------- shared fixtures ----------
@pytest.fixture(scope="session")
def s():
    return requests.Session()


@pytest.fixture(scope="session")
def token(s):
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def auth(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def moonveil_id(s, auth):
    r = s.get(f"{API}/photo-wall/stats", headers=auth)
    assert r.status_code == 200, r.text
    wid = next(w["weddingId"] for w in r.json()["weddings"] if w["slug"] == TEST_SLUG)
    return wid


# ===== FORMS: shortlink auto-gen + privacy fix =====
class TestFormsShortlinkAndPrivacy:
    created_id = None
    created_token = None
    short_id = None

    def test_create_form_returns_shortlink_and_shortUrl(self, s, auth):
        r = s.post(f"{API}/forms", json={"clientName": "TEST_iter3 client"}, headers=auth)
        assert r.status_code == 201, r.text
        body = r.json()
        f = body["form"]
        assert "shortlinkId" in f and isinstance(f["shortlinkId"], str) and len(f["shortlinkId"]) >= 4
        assert "shortUrl" in body and "/s/" in body["shortUrl"]
        TestFormsShortlinkAndPrivacy.created_id = f["id"]
        TestFormsShortlinkAndPrivacy.created_token = f["token"]
        TestFormsShortlinkAndPrivacy.short_id = f["shortlinkId"]

    def test_list_forms_includes_shortlinkId(self, s, auth):
        r = s.get(f"{API}/forms", headers=auth)
        assert r.status_code == 200
        match = next((f for f in r.json()["forms"] if f["id"] == TestFormsShortlinkAndPrivacy.created_id), None)
        assert match is not None
        assert match.get("shortlinkId") == TestFormsShortlinkAndPrivacy.short_id

    def test_short_id_redirects_to_form(self, s):
        sid = TestFormsShortlinkAndPrivacy.short_id
        r = s.get(f"{BASE_URL}/s/{sid}", allow_redirects=False, timeout=15)
        assert r.status_code in (301, 302, 307, 308), f"{r.status_code} {r.text[:200]}"
        loc = r.headers.get("Location", "")
        assert "/form/" in loc, f"redirect target: {loc}"
        assert TestFormsShortlinkAndPrivacy.created_token in loc

    def test_public_get_pending_minimal_shape(self, s):
        r = s.get(f"{API}/forms/public/{TestFormsShortlinkAndPrivacy.created_token}")
        assert r.status_code == 200
        f = r.json()["form"]
        # Only the safe fields should be present — never the submission/notes
        allowed = {"id", "clientName", "status", "submittedAt"}
        extra = set(f.keys()) - allowed
        assert not extra, f"public GET leaked extra fields: {extra}"
        assert f["status"] == "pending"

    def test_public_submit_then_get_does_not_leak(self, s):
        # Submit
        r = s.post(f"{API}/forms/public/{TestFormsShortlinkAndPrivacy.created_token}", json={
            "brideName": "TEST_BridePriv",
            "groomName": "TEST_GroomPriv",
            "weddingDate": "2027-06-15",
            "tagline": "TEST tagline secret",
            "template": "Moonveil",
            "story": "SECRET-STORY-DO-NOT-LEAK",
            "events": [{"name": "Ceremony", "date": "2027-06-15", "startTime": "5:00 PM"}],
            "contactEmail": "test_priv@example.com",
            "contactPhone": "+91-9999999999",
        })
        assert r.status_code == 200, r.text
        # Now GET — must NOT leak submission, story, contact info
        r2 = s.get(f"{API}/forms/public/{TestFormsShortlinkAndPrivacy.created_token}")
        assert r2.status_code == 200
        f = r2.json()["form"]
        allowed = {"id", "clientName", "status", "submittedAt"}
        extra = set(f.keys()) - allowed
        assert not extra, f"public GET leaked extra fields after submit: {extra}"
        assert f["status"] == "submitted"
        raw = r2.text
        # No secret values should appear
        for needle in ("SECRET-STORY", "TEST_BridePriv", "TEST_GroomPriv", "test_priv@example.com", "9999999999"):
            assert needle not in raw, f"public GET leaked '{needle}' in response body"

    def test_cleanup(self, s, auth):
        if TestFormsShortlinkAndPrivacy.created_id:
            s.delete(f"{API}/forms/{TestFormsShortlinkAndPrivacy.created_id}", headers=auth)


# ===== PLAN RENAME + LEGACY ACCEPTANCE =====
class TestPlanRename:
    def test_revenue_stats_uses_new_plan_keys(self, s, auth):
        r = s.get(f"{API}/revenue/stats", headers=auth)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "byPlan" in d
        keys = set(d["byPlan"].keys())
        assert {"classic", "grand", "eternal"}.issubset(keys), f"byPlan keys: {keys}"
        # Legacy keys must NOT be in the response
        assert not ({"essential", "signature", "heirloom"} & keys), f"legacy keys leaked: {keys}"
        assert "planPrices" in d
        assert {"classic", "grand", "eternal"}.issubset(d["planPrices"].keys())

    def test_create_wedding_accepts_legacy_plan_and_normalises(self, s, auth):
        body = {
            "brideName": "TEST_LegacyPlan",
            "groomName": "TEST_LegacyG",
            "weddingDate": "2099-11-11",
            "template": "Moonveil",
            "status": "draft",
            "isDemo": False,
            "isTest": True,
            "plan": "signature",  # legacy
            "events": [{"name": "Ceremony", "date": "2099-11-11", "startTime": "5:00 PM"}],
        }
        r = s.post(f"{API}/weddings", json=body, headers=auth)
        assert r.status_code == 200, r.text
        w = r.json()["wedding"]
        assert w["plan"] == "grand", f"legacy 'signature' should normalise to 'grand', got {w.get('plan')}"
        # cleanup
        s.delete(f"{API}/weddings/{w['id']}", headers=auth)

    def test_existing_weddings_have_no_legacy_plan(self, s, auth):
        r = s.get(f"{API}/weddings", headers=auth)
        assert r.status_code == 200
        legacy = [w for w in r.json()["weddings"] if w.get("plan") in ("essential", "signature", "heirloom")]
        assert not legacy, f"migration missed weddings: {[w['slug'] for w in legacy]}"


# ===== SLIM INVITE PDF =====
class TestSlimInvitePdf:
    def test_pdf_valid_and_slim(self, s, token, moonveil_id):
        url = f"{API}/weddings/{moonveil_id}/invite-pdf?token={token}&base={BASE_URL}"
        r = s.get(url, timeout=90)
        assert r.status_code == 200, r.text[:300]
        ct = r.headers.get("Content-Type", "")
        assert "pdf" in ct.lower()
        assert r.content[:5] == b"%PDF-"
        sz = len(r.content)
        # Should be slim now (no gallery): 50KB-500KB acceptable
        assert 50 * 1024 <= sz <= 500 * 1024, f"PDF size {sz} bytes outside 50KB-500KB band"


# ===== CLIENT ACCESS ADMIN =====
class TestClientAccessAdmin:
    CLIENT_PASSWORD = "couple123-iter3"

    def test_admin_set_client_access_requires_auth(self, s, moonveil_id):
        r = s.post(f"{API}/weddings/{moonveil_id}/client-access", json={"password": self.CLIENT_PASSWORD})
        assert r.status_code == 401

    def test_admin_set_client_access_min_length(self, s, auth, moonveil_id):
        r = s.post(f"{API}/weddings/{moonveil_id}/client-access", json={"password": "abc"}, headers=auth)
        assert r.status_code == 400, r.text

    def test_admin_set_client_access_success(self, s, auth, moonveil_id):
        r = s.post(f"{API}/weddings/{moonveil_id}/client-access", json={"password": self.CLIENT_PASSWORD}, headers=auth)
        assert r.status_code == 200, r.text

    def test_admin_get_client_access(self, s, auth, moonveil_id):
        r = s.get(f"{API}/weddings/{moonveil_id}/client-access", headers=auth)
        assert r.status_code == 200
        d = r.json()
        assert d["enabled"] is True
        assert d.get("createdAt")


# ===== CLIENT LOGIN: rate limit + success =====
class TestClientLogin:
    CLIENT_PASSWORD = TestClientAccessAdmin.CLIENT_PASSWORD
    client_token = None

    def test_login_success_returns_token(self, s):
        r = s.post(f"{API}/client/login", json={"slug": TEST_SLUG, "password": self.CLIENT_PASSWORD})
        assert r.status_code == 200, r.text
        d = r.json()
        assert isinstance(d.get("token"), str) and len(d["token"]) > 20
        TestClientLogin.client_token = d["token"]
        w = d["wedding"]
        assert w["slug"] == TEST_SLUG
        # photoWallEnabled flag is exposed
        assert "photoWallEnabled" in w

    def test_login_wrong_password_decrements(self, s, auth, moonveil_id):
        # Reset rate-limit by resetting password (same value) — clears nothing actually.
        # Use a unique IP via X-Forwarded-For per test class to isolate.
        ip = f"10.99.{int(time.time()) % 250}.{uuid.uuid4().int % 250}"
        hdr = {"X-Forwarded-For": ip}
        r1 = s.post(f"{API}/client/login", json={"slug": TEST_SLUG, "password": "wrong-pw-aaa"}, headers=hdr)
        assert r1.status_code == 401, r1.text
        # Message should mention attempts left (4 left after 1 fail)
        msg = (r1.json().get("error") or "").lower()
        assert "invalid password" in msg
        assert "4 attempts left" in msg, f"expected '4 attempts left', got: {msg}"

    def test_lockout_after_5_wrong(self, s):
        ip = f"10.88.{int(time.time()) % 250}.{uuid.uuid4().int % 250}"
        hdr = {"X-Forwarded-For": ip}
        # Burn 5 wrong attempts
        for i in range(5):
            r = s.post(f"{API}/client/login", json={"slug": TEST_SLUG, "password": f"wrong-{i}"}, headers=hdr)
            assert r.status_code == 401, f"attempt {i+1}: {r.status_code} {r.text}"
        # 6th attempt should be locked even with the CORRECT password
        r6 = s.post(f"{API}/client/login", json={"slug": TEST_SLUG, "password": TestClientLogin.CLIENT_PASSWORD}, headers=hdr)
        assert r6.status_code == 429, f"expected 429 after lockout, got {r6.status_code}: {r6.text}"
        assert "too many" in r6.text.lower() or "try again" in r6.text.lower()


# ===== CLIENT DASHBOARD DATA =====
class TestClientDashboardData:
    def test_dashboard_requires_client_token(self, s):
        r = s.get(f"{API}/client/dashboard/{TEST_SLUG}")
        assert r.status_code == 401

    def test_dashboard_rejects_admin_token(self, s, auth):
        r = s.get(f"{API}/client/dashboard/{TEST_SLUG}", headers=auth)
        assert r.status_code == 401, r.text

    def test_dashboard_returns_data(self, s):
        tok = TestClientLogin.client_token
        assert tok, "client login token not present — previous test failed"
        r = s.get(f"{API}/client/dashboard/{TEST_SLUG}", headers={"Authorization": f"Bearer {tok}"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["wedding"]["slug"] == TEST_SLUG
        st = d["stats"]
        assert "totalViews" in st and isinstance(st["totalViews"], int)
        assert "totalRsvps" in st
        assert "attendingCount" in st
        assert "viewsByDay" in st and isinstance(st["viewsByDay"], list) and len(st["viewsByDay"]) == 14
        assert "photoCounts" in st

    def test_rsvp_csv_export(self, s):
        tok = TestClientLogin.client_token
        r = s.get(f"{API}/client/rsvp/{TEST_SLUG}/export?token={tok}")
        assert r.status_code == 200, r.text[:300]
        ct = r.headers.get("Content-Type", "")
        assert "csv" in ct.lower()
        # CSV header must include Name + Attending
        first_line = r.text.splitlines()[0].lower() if r.text else ""
        assert "name" in first_line and "attending" in first_line

    def test_rsvp_csv_rejects_admin_token(self, s, token):
        r = s.get(f"{API}/client/rsvp/{TEST_SLUG}/export?token={token}")
        assert r.status_code == 401

    def test_photo_wall_zip_with_client_token(self, s):
        tok = TestClientLogin.client_token
        r = s.get(f"{API}/client/photo-wall/zip/{TEST_SLUG}?token={tok}", timeout=60)
        # Either 200 (zip) or 404 (no approved photos). Both are valid per spec.
        assert r.status_code in (200, 404), r.text[:300]
        if r.status_code == 200:
            assert "zip" in r.headers.get("Content-Type", "").lower()
            assert r.content[:2] == b"PK"


# ===== VIEW TRACKING + PUBLIC LEAK GUARD =====
class TestViewTrackingAndLeakGuard:
    def test_public_does_not_leak_internal_fields(self, s):
        r = s.get(f"{API}/public/wedding/{TEST_SLUG}")
        assert r.status_code == 200
        w = r.json()["wedding"]
        for forbidden in ("viewCount", "viewsByDay", "clientAccess"):
            assert forbidden not in w, f"public endpoint leaked '{forbidden}'"

    def test_view_count_increments_on_public_fetch(self, s):
        # Capture current via client dashboard
        tok = TestClientLogin.client_token
        assert tok, "need client token"
        d0 = s.get(f"{API}/client/dashboard/{TEST_SLUG}", headers={"Authorization": f"Bearer {tok}"}).json()
        before = d0["stats"]["totalViews"]
        # Trigger 3 public fetches
        for _ in range(3):
            s.get(f"{API}/public/wedding/{TEST_SLUG}")
        d1 = s.get(f"{API}/client/dashboard/{TEST_SLUG}", headers={"Authorization": f"Bearer {tok}"}).json()
        after = d1["stats"]["totalViews"]
        assert after >= before + 3, f"viewCount did not increment: {before} -> {after}"


# ===== CLIENT ACCESS DELETE (cleanup at end) =====
class TestClientAccessCleanup:
    def test_admin_delete_client_access(self, s, auth, moonveil_id):
        # Don't actually delete — context note says couple123 was preseeded by main agent.
        # We DO want to ensure DELETE works, so re-set then delete then re-set again.
        # Re-set fresh password
        pw = "iter3-restore-pw"
        r1 = s.post(f"{API}/weddings/{moonveil_id}/client-access", json={"password": pw}, headers=auth)
        assert r1.status_code == 200
        # Delete
        r2 = s.delete(f"{API}/weddings/{moonveil_id}/client-access", headers=auth)
        assert r2.status_code == 200
        # Verify disabled
        r3 = s.get(f"{API}/weddings/{moonveil_id}/client-access", headers=auth)
        assert r3.status_code == 200
        assert r3.json()["enabled"] is False
        # Restore original 'couple123' so the public preview stays usable
        r4 = s.post(f"{API}/weddings/{moonveil_id}/client-access", json={"password": "couple123"}, headers=auth)
        assert r4.status_code == 200


# ===== REGRESSION SMOKE =====
class TestRegression:
    def test_admin_login(self, s):
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200

    def test_previews(self, s):
        r = s.get(f"{API}/public/previews")
        assert r.status_code == 200

    def test_wedding_page_renders(self, s):
        r = s.get(f"{BASE_URL}/wedding/{TEST_SLUG}", timeout=30)
        assert r.status_code == 200

    def test_landing_page_shows_new_plan_labels(self, s):
        r = s.get(f"{BASE_URL}/", timeout=30)
        assert r.status_code == 200
        body = r.text
        # New plan labels should be present
        assert re.search(r"\bClassic\b", body, re.I), "Classic label missing on landing page"
        assert re.search(r"\bGrand\b", body, re.I), "Grand label missing on landing page"
        assert re.search(r"\bEternal\b", body, re.I), "Eternal label missing on landing page"
