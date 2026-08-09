"""
Backend tests for Live Photo Wall feature + smoke checks for existing flows.
Targets the Next.js catch-all /api proxy via REACT_APP_BACKEND_URL.
"""
import os
import base64
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@kalyanaya.com"
ADMIN_PASSWORD = "KalyanayaAdmin@2026"
TEST_SLUG = "preview-moonveil"
DISABLED_SLUG = "preview-royal-heritage"  # photo wall should be disabled here

# 1x1 transparent PNG data uri
_PNG_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
)
DATA_URI = "data:image/png;base64," + base64.b64encode(_PNG_BYTES).decode()


@pytest.fixture(scope="session")
def s():
    return requests.Session()


@pytest.fixture(scope="session")
def admin_token(s):
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and data["user"]["email"] == ADMIN_EMAIL
    return data["token"]


@pytest.fixture(scope="session")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# ===== Smoke: existing flows =====
class TestSmoke:
    def test_public_previews(self, s):
        r = s.get(f"{API}/public/previews")
        assert r.status_code == 200
        data = r.json()
        previews = data.get("previews") or data
        # previews is a dict of {templateName: {slug, heroImage,...}}
        if isinstance(previews, dict):
            slugs = [v.get("slug") for v in previews.values() if isinstance(v, dict)]
        else:
            slugs = [it.get("slug") for it in previews if isinstance(it, dict)]
        assert TEST_SLUG in slugs, f"preview-moonveil missing in previews. slugs={slugs}"

    def test_landing_loads(self, s):
        r = s.get(BASE_URL + "/", timeout=20)
        assert r.status_code == 200

    def test_public_wedding_page(self, s):
        r = s.get(f"{BASE_URL}/wedding/{TEST_SLUG}", timeout=20)
        assert r.status_code == 200


# ===== Photo Wall public GET =====
class TestPhotoWallPublic:
    def test_public_list_returns_enabled_and_photos(self, s):
        r = s.get(f"{API}/photo-wall/public/{TEST_SLUG}")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("enabled") is True
        assert "photos" in data and isinstance(data["photos"], list)
        assert "title" in data
        # Should contain at least the seeded approved photo
        # (not strictly required — just informative)

    def test_public_list_unknown_slug_404(self, s):
        r = s.get(f"{API}/photo-wall/public/this-slug-does-not-exist-xyz")
        assert r.status_code == 404


# ===== Photo Wall public POST (upload) =====
class TestPhotoWallUpload:
    def test_upload_missing_fields(self, s):
        r = s.post(f"{API}/photo-wall", json={"weddingSlug": TEST_SLUG})
        assert r.status_code == 400

    def test_upload_unknown_slug_404(self, s):
        r = s.post(f"{API}/photo-wall", json={
            "weddingSlug": "totally-nonexistent-slug-zzz",
            "dataUri": DATA_URI,
            "uploaderName": "TEST_Bot",
        })
        assert r.status_code == 404

    def test_upload_disabled_wedding_403(self, s):
        r = s.post(f"{API}/photo-wall", json={
            "weddingSlug": DISABLED_SLUG,
            "dataUri": DATA_URI,
            "uploaderName": "TEST_Bot",
        })
        # If this preview has photo wall enabled in seed, this might fail; allow 200/201 fallback
        assert r.status_code in (403, 404), (
            f"expected 403 disabled (or 404 missing), got {r.status_code}: {r.text}"
        )

    def test_upload_success_then_pending(self, s):
        r = s.post(f"{API}/photo-wall", json={
            "weddingSlug": TEST_SLUG,
            "dataUri": DATA_URI,
            "uploaderName": "TEST_Bot",
            "caption": "TEST_caption upload",
        })
        assert r.status_code == 201, r.text
        photo = r.json().get("photo")
        assert photo and photo["status"] == "pending"
        assert photo["uploaderName"] == "TEST_Bot"
        assert photo["weddingSlug"] == TEST_SLUG
        assert photo["image"]["url"].startswith("http")
        # share via pytest cache for next tests
        pytest.uploaded_photo_id = photo["id"]


# ===== Admin endpoints =====
class TestAdminPhotoWall:
    def test_admin_list_requires_auth(self, s):
        r = s.get(f"{API}/photo-wall")
        assert r.status_code == 401

    def test_admin_stats_requires_auth(self, s):
        r = s.get(f"{API}/photo-wall/stats")
        assert r.status_code == 401

    def test_admin_stats(self, s, auth_headers):
        r = s.get(f"{API}/photo-wall/stats", headers=auth_headers)
        assert r.status_code == 200, r.text
        data = r.json()
        items = data.get("weddings", [])
        assert isinstance(items, list)
        slugs = [w["slug"] for w in items]
        assert TEST_SLUG in slugs, f"{TEST_SLUG} should appear in stats (photo wall enabled). got slugs={slugs}"
        moon = next(w for w in items if w["slug"] == TEST_SLUG)
        assert "counts" in moon
        for k in ("pending", "approved", "rejected"):
            assert k in moon["counts"]

    def test_admin_list_by_wedding(self, s, auth_headers):
        # get weddingId from stats
        stats = s.get(f"{API}/photo-wall/stats", headers=auth_headers).json()
        wid = next(w["weddingId"] for w in stats["weddings"] if w["slug"] == TEST_SLUG)
        r = s.get(f"{API}/photo-wall?weddingId={wid}&status=pending", headers=auth_headers)
        assert r.status_code == 200, r.text
        photos = r.json().get("photos", [])
        # Our uploaded photo should be in pending
        ids = [p["id"] for p in photos]
        assert getattr(pytest, "uploaded_photo_id", None) in ids, "uploaded photo not in pending list"

    def test_approve_then_appears_public(self, s, auth_headers):
        pid = pytest.uploaded_photo_id
        r = s.put(f"{API}/photo-wall/{pid}", json={"status": "approved"}, headers=auth_headers)
        assert r.status_code == 200, r.text
        assert r.json()["photo"]["status"] == "approved"

        # Now public list must include this photo
        rp = s.get(f"{API}/photo-wall/public/{TEST_SLUG}")
        assert rp.status_code == 200
        ids = [p["id"] for p in rp.json()["photos"]]
        assert pid in ids, "approved photo not visible in public list"

    def test_invalid_status_rejected(self, s, auth_headers):
        pid = pytest.uploaded_photo_id
        r = s.put(f"{API}/photo-wall/{pid}", json={"status": "bogus"}, headers=auth_headers)
        assert r.status_code == 400

    def test_reject_then_hidden_from_public(self, s, auth_headers):
        pid = pytest.uploaded_photo_id
        r = s.put(f"{API}/photo-wall/{pid}", json={"status": "rejected"}, headers=auth_headers)
        assert r.status_code == 200
        rp = s.get(f"{API}/photo-wall/public/{TEST_SLUG}")
        ids = [p["id"] for p in rp.json()["photos"]]
        assert pid not in ids, "rejected photo should not be visible in public list"

    def test_delete_photo(self, s, auth_headers):
        pid = pytest.uploaded_photo_id
        r = s.delete(f"{API}/photo-wall/{pid}", headers=auth_headers)
        assert r.status_code == 200, r.text
        # verify not in admin list either
        stats = s.get(f"{API}/photo-wall/stats", headers=auth_headers).json()
        wid = next(w["weddingId"] for w in stats["weddings"] if w["slug"] == TEST_SLUG)
        rl = s.get(f"{API}/photo-wall?weddingId={wid}&status=all", headers=auth_headers)
        ids = [p["id"] for p in rl.json()["photos"]]
        assert pid not in ids
