"""
Backend tests for Iteration 2 features:
- Photo Wall: lock/demo enforcement, admin-add demo upload, ZIP download
- Admin Badges
- Forms (one-time client form lifecycle)
- Shortlinks + /s/<id> redirect
- Invite PDF
"""
import os
import re
import base64
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@kalyanaya.com"
ADMIN_PASSWORD = "KalyanayaAdmin@2026"
TEST_SLUG = "preview-moonveil"  # demo with photo wall enabled (locked, future date)

_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
)
DATA_URI = "data:image/png;base64," + base64.b64encode(_PNG).decode()


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
    """Get the wedding id of preview-moonveil."""
    r = s.get(f"{API}/photo-wall/stats", headers=auth)
    assert r.status_code == 200, r.text
    wid = next(w["weddingId"] for w in r.json()["weddings"] if w["slug"] == TEST_SLUG)
    return wid


# ===== PHOTO WALL: public + lock + demo enforcement =====
class TestPhotoWallPublic:
    def test_public_endpoint_shape(self, s):
        r = s.get(f"{API}/photo-wall/public/{TEST_SLUG}")
        assert r.status_code == 200
        d = r.json()
        assert d.get("enabled") is True
        assert d.get("isDemo") is True
        assert d.get("template") == "Moonveil"
        assert "isLocked" in d
        assert "opensAt" in d
        # First event date for preview-moonveil is in the future (2026-12-12)
        assert d["isLocked"] is True, f"expected locked, got {d}"

    def test_public_wedding_endpoint_includes_photo_wall_opensAt(self, s):
        r = s.get(f"{API}/public/wedding/{TEST_SLUG}")
        assert r.status_code == 200, r.text
        d = r.json()
        # Response is nested under {wedding: {...}} per route.js line ~289-298
        w = d.get("wedding") or d
        assert "rsvpClosed" in w
        assert w["rsvpClosed"] is False, "future-dated demo should still be open for RSVP"
        assert "photoWallOpensAt" in w

    def test_demo_upload_rejected_403(self, s):
        # preview-moonveil is a demo → uploads disabled
        r = s.post(f"{API}/photo-wall", json={
            "weddingSlug": TEST_SLUG,
            "dataUri": DATA_URI,
            "uploaderName": "TEST_DemoBlock",
        })
        assert r.status_code == 403, r.text
        assert "demo" in r.text.lower() or "disabled" in r.text.lower()


# ===== PHOTO WALL: lock 423 enforcement via non-demo future wedding =====
class TestPhotoWallLock:
    @pytest.fixture(scope="class")
    def future_wedding(self, s, auth):
        # Create non-demo wedding with first event date in far future → photo wall locked
        body = {
            "brideName": "TESTBride",
            "groomName": "TESTGroom",
            "weddingDate": "2099-12-31",
            "template": "Moonveil",
            "status": "published",
            "isDemo": False,
            "isTest": True,
            "events": [{"name": "Ceremony", "date": "2099-12-31", "startTime": "5:00 PM"}],
            "advancedSettings": {
                "photoWall": {"enabled": True, "title": "Guest Photo Wall"},
            },
        }
        r = s.post(f"{API}/weddings", json=body, headers=auth)
        assert r.status_code == 200, r.text
        w = r.json()["wedding"]
        yield w
        # cleanup
        try:
            s.delete(f"{API}/weddings/{w['id']}", headers=auth)
        except Exception:
            pass

    def test_lock_423_on_future_wedding(self, s, future_wedding):
        r = s.post(f"{API}/photo-wall", json={
            "weddingSlug": future_wedding["slug"],
            "dataUri": DATA_URI,
            "uploaderName": "TEST_LockedUploader",
        })
        assert r.status_code == 423, f"expected 423 locked, got {r.status_code}: {r.text}"
        assert "not yet open" in r.text.lower() or "ceremony" in r.text.lower()


# ===== PHOTO WALL: admin-add (demo upload) + ZIP =====
class TestPhotoWallAdminAdd:
    added_id = None

    def test_admin_add_requires_auth(self, s, moonveil_id):
        r = s.post(f"{API}/photo-wall/admin-add", json={
            "weddingId": moonveil_id, "dataUri": DATA_URI, "uploaderName": "x",
        })
        assert r.status_code == 401

    def test_admin_add_success_auto_approved(self, s, auth, moonveil_id):
        r = s.post(f"{API}/photo-wall/admin-add", json={
            "weddingId": moonveil_id,
            "dataUri": DATA_URI,
            "uploaderName": "TEST_AdminDemo",
            "caption": "TEST_demo caption",
        }, headers=auth)
        assert r.status_code == 201, r.text
        photo = r.json()["photo"]
        assert photo["status"] == "approved"
        assert photo.get("addedByAdmin") is True
        TestPhotoWallAdminAdd.added_id = photo["id"]

    def test_admin_added_photo_visible_publicly(self, s):
        r = s.get(f"{API}/photo-wall/public/{TEST_SLUG}")
        assert r.status_code == 200
        ids = [p["id"] for p in r.json()["photos"]]
        assert TestPhotoWallAdminAdd.added_id in ids


class TestPhotoWallZip:
    def test_zip_requires_auth(self, s, moonveil_id):
        r = s.get(f"{API}/photo-wall/zip/{moonveil_id}")
        assert r.status_code == 401

    def test_zip_with_token_query_param(self, s, token, moonveil_id):
        r = s.get(f"{API}/photo-wall/zip/{moonveil_id}?token={token}", timeout=60)
        assert r.status_code == 200, r.text[:300]
        ct = r.headers.get("Content-Type", "")
        assert "zip" in ct.lower(), f"expected zip content-type, got {ct}"
        # Magic bytes for zip: PK\x03\x04
        assert r.content[:2] == b"PK", "missing zip magic bytes"
        assert len(r.content) > 100

    def test_zip_with_bearer_header(self, s, auth, moonveil_id):
        r = s.get(f"{API}/photo-wall/zip/{moonveil_id}", headers=auth, timeout=60)
        assert r.status_code == 200
        assert "zip" in r.headers.get("Content-Type", "").lower()

    def test_zip_cleanup_admin_demo_photo(self, s, auth):
        # cleanup the admin-add photo we created earlier
        pid = TestPhotoWallAdminAdd.added_id
        if pid:
            r = s.delete(f"{API}/photo-wall/{pid}", headers=auth)
            assert r.status_code == 200


# ===== ADMIN BADGES =====
class TestAdminBadges:
    def test_badges_require_auth(self, s):
        r = s.get(f"{API}/admin/badges")
        assert r.status_code == 401

    def test_badges_shape(self, s, auth):
        r = s.get(f"{API}/admin/badges", headers=auth)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("photoWallPending", "leadsNew", "formsSubmitted"):
            assert k in d
            assert isinstance(d[k], int)


# ===== FORMS =====
class TestForms:
    created_id = None
    created_token = None

    def test_create_requires_auth(self, s):
        r = s.post(f"{API}/forms", json={"clientName": "TEST X"})
        assert r.status_code == 401

    def test_create_form(self, s, auth):
        r = s.post(f"{API}/forms", json={"clientName": "TEST_Aanya & Vikram"}, headers=auth)
        assert r.status_code == 201, r.text
        f = r.json()["form"]
        assert f["clientName"] == "TEST_Aanya & Vikram"
        assert f["status"] == "pending"
        assert isinstance(f["token"], str) and len(f["token"]) >= 8
        TestForms.created_id = f["id"]
        TestForms.created_token = f["token"]

    def test_list_forms_includes_created(self, s, auth):
        r = s.get(f"{API}/forms", headers=auth)
        assert r.status_code == 200
        ids = [f["id"] for f in r.json()["forms"]]
        assert TestForms.created_id in ids

    def test_public_get_form(self, s):
        r = s.get(f"{API}/forms/public/{TestForms.created_token}")
        assert r.status_code == 200
        f = r.json()["form"]
        assert f["clientName"] == "TEST_Aanya & Vikram"
        assert f["status"] == "pending"

    def test_public_submit_missing_fields(self, s):
        r = s.post(f"{API}/forms/public/{TestForms.created_token}", json={"brideName": "Only"})
        assert r.status_code == 400

    def test_public_submit_success(self, s):
        r = s.post(f"{API}/forms/public/{TestForms.created_token}", json={
            "brideName": "TEST_Aanya",
            "groomName": "TEST_Vikram",
            "weddingDate": "2027-05-20",
            "tagline": "TEST tagline",
            "template": "Moonveil",
            "events": [{"name": "Ceremony", "date": "2027-05-20", "startTime": "6:00 PM"}],
            "contactEmail": "test@example.com",
        })
        assert r.status_code == 200, r.text

    def test_public_resubmit_returns_409(self, s):
        r = s.post(f"{API}/forms/public/{TestForms.created_token}", json={
            "brideName": "X", "groomName": "Y", "weddingDate": "2027-01-01",
        })
        assert r.status_code == 409

    def test_convert_form_to_wedding(self, s, auth):
        r = s.post(f"{API}/forms/{TestForms.created_id}/convert", headers=auth)
        assert r.status_code == 201, r.text
        w = r.json()["wedding"]
        assert w["brideName"] == "TEST_Aanya"
        assert w["status"] == "draft"
        # Verify form is updated
        r2 = s.get(f"{API}/forms/{TestForms.created_id}", headers=auth)
        assert r2.status_code == 200
        f = r2.json()["form"]
        assert f["status"] == "converted"
        assert f["weddingId"] == w["id"]
        # cleanup
        s.delete(f"{API}/weddings/{w['id']}", headers=auth)

    def test_cleanup_form(self, s, auth):
        r = s.delete(f"{API}/forms/{TestForms.created_id}", headers=auth)
        assert r.status_code == 200


# ===== SHORTLINKS + /s/<id> redirect =====
class TestShortlinks:
    sid = None

    def test_create_requires_auth(self, s):
        r = s.post(f"{API}/shortlinks", json={"url": "https://example.com"})
        assert r.status_code == 401

    def test_create(self, s, auth):
        target = f"https://example.com/TEST/{uuid.uuid4().hex[:8]}"
        r = s.post(f"{API}/shortlinks", json={"url": target, "label": "TEST_label"}, headers=auth)
        assert r.status_code == 200, r.text
        sl = r.json()["shortlink"]
        assert sl["target"] == target
        assert isinstance(sl["id"], str) and len(sl["id"]) >= 4
        TestShortlinks.sid = sl["id"]

    def test_resolve_endpoint(self, s):
        r = s.get(f"{API}/shortlinks/resolve/{TestShortlinks.sid}")
        assert r.status_code == 200
        assert "example.com" in r.json()["target"]

    def test_redirect_302(self, s):
        # /s/<id> is served by Next.js directly, not via /api
        r = s.get(f"{BASE_URL}/s/{TestShortlinks.sid}", allow_redirects=False, timeout=15)
        assert r.status_code in (301, 302, 307, 308), f"got {r.status_code}: {r.text[:200]}"
        loc = r.headers.get("Location", "")
        assert "example.com" in loc, f"redirect location: {loc}"


# ===== INVITE PDF =====
class TestInvitePdf:
    def test_pdf_requires_auth(self, s, moonveil_id):
        r = s.get(f"{API}/weddings/{moonveil_id}/invite-pdf")
        assert r.status_code == 401

    def test_pdf_with_token(self, s, token, moonveil_id):
        url = f"{API}/weddings/{moonveil_id}/invite-pdf?token={token}&base={BASE_URL}"
        r = s.get(url, timeout=60)
        assert r.status_code == 200, r.text[:300]
        ct = r.headers.get("Content-Type", "")
        assert "pdf" in ct.lower(), f"expected pdf content-type, got {ct}"
        # PDF magic bytes
        assert r.content[:5] == b"%PDF-", f"bad magic: {r.content[:8]}"
        assert len(r.content) > 50 * 1024, f"pdf too small: {len(r.content)} bytes"


# ===== REGRESSION smoke =====
class TestRegression:
    def test_admin_login_still_works(self, s):
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200

    def test_previews_endpoint(self, s):
        r = s.get(f"{API}/public/previews")
        assert r.status_code == 200

    def test_wedding_page_renders(self, s):
        r = s.get(f"{BASE_URL}/wedding/{TEST_SLUG}", timeout=30)
        assert r.status_code == 200
        assert "html" in r.headers.get("Content-Type", "").lower()

    def test_leads_listing_admin(self, s, auth):
        r = s.get(f"{API}/leads", headers=auth)
        assert r.status_code == 200
