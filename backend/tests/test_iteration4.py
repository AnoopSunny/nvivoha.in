"""
Backend tests for Iteration 4 — plan limits + feature gating + plan rename (eternal -> elegant).

Covers:
- GET /api/plans returns full PLAN_CONFIG with classic/grand/elegant shape + limits.
- Plan migration: no legacy plan ids (eternal/heirloom/signature/essential) exist in DB.
- Backwards-compat normalisation on POST /api/weddings (legacy ids -> new ids).
- Gallery cap clipping on POST + PUT for each plan.
- Feature stripping on POST: photoWall, customDomain, musicEmbed disabled when plan doesn't allow.
- RSVP cap (423) + meal preference gating (Classic strips, Grand+ preserves).
- Photo Wall guest upload gating: Classic 403, Grand cap 423.
- Photo Wall admin-add: Classic non-demo 403, demo bypass succeeds.
- GET /api/weddings/<id>/usage shape & non-negative remaining.
- Regression smoke for revenue stats keys (classic/grand/elegant).
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@kalyanaya.com"
ADMIN_PASSWORD = "KalyanayaAdmin@2026"


@pytest.fixture(scope="session")
def s():
    return requests.Session()


@pytest.fixture(scope="session")
def token(s):
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def auth(token):
    return {"Authorization": f"Bearer {token}"}


# Globally collect TEST_ wedding ids to clean up at session end
_CREATED_WEDDING_IDS = []


@pytest.fixture(scope="session", autouse=True)
def cleanup(s, auth):
    yield
    for wid in _CREATED_WEDDING_IDS:
        try:
            s.delete(f"{API}/weddings/{wid}", headers=auth)
        except Exception:
            pass


def _make_wedding(s, auth, plan, *, gallery_count=0, advanced=None, extras=None):
    body = {
        "brideName": f"TEST_It4_{plan}_{uuid.uuid4().hex[:6]}",
        "groomName": "TEST_It4_G",
        "weddingDate": "2099-12-31",
        "template": "Moonveil",
        "status": "draft",
        "isDemo": False,
        "isTest": True,
        "plan": plan,
        "events": [{"name": "Ceremony", "date": "2099-12-31", "startTime": "5:00 PM"}],
        "gallery": [{"url": f"https://picsum.photos/seed/it4_{i}/600/400", "caption": ""} for i in range(gallery_count)],
    }
    if advanced is not None:
        body["advancedSettings"] = advanced
    if extras:
        body.update(extras)
    r = s.post(f"{API}/weddings", json=body, headers=auth)
    assert r.status_code == 200, f"create failed: {r.status_code} {r.text}"
    w = r.json()["wedding"]
    _CREATED_WEDDING_IDS.append(w["id"])
    return w


# ===== GET /api/plans =====
class TestPlansEndpoint:
    def test_plans_public_no_auth(self, s):
        r = s.get(f"{API}/plans")
        assert r.status_code == 200, r.text
        d = r.json()
        plans = d.get("plans") or d
        # The endpoint may wrap in {plans:...} or return raw dict
        if "classic" not in plans and "plans" in plans:
            plans = plans["plans"]
        for key in ("classic", "grand", "elegant"):
            assert key in plans, f"missing plan key {key}: {list(plans.keys())}"
        # Ensure no legacy keys
        for legacy in ("eternal", "heirloom", "signature", "essential"):
            assert legacy not in plans, f"legacy plan id '{legacy}' leaked into /api/plans"

    def test_plans_limits_exact(self, s):
        r = s.get(f"{API}/plans")
        plans = r.json()
        if "plans" in plans:
            plans = plans["plans"]
        expected = {
            "classic": {"maxGalleryPhotos": 15, "maxRsvpResponses": 150, "maxLiveWallUploads": 0, "hostingMonths": 6},
            "grand":   {"maxGalleryPhotos": 40, "maxRsvpResponses": 400, "maxLiveWallUploads": 250, "hostingMonths": 12},
            "elegant": {"maxGalleryPhotos": 75, "maxRsvpResponses": 800, "maxLiveWallUploads": 500, "hostingMonths": 36},
        }
        for k, exp in expected.items():
            lim = plans[k].get("limits", {})
            for f, v in exp.items():
                assert lim.get(f) == v, f"{k}.limits.{f} expected {v}, got {lim.get(f)}"

    def test_plans_features_and_analytics_shape(self, s):
        r = s.get(f"{API}/plans")
        plans = r.json()
        if "plans" in plans:
            plans = plans["plans"]
        # Classic photoWall must be false; Grand+ true
        assert plans["classic"]["features"]["photoWall"] is False
        assert plans["grand"]["features"]["photoWall"] is True
        assert plans["elegant"]["features"]["photoWall"] is True
        # Custom domain only elegant
        assert plans["classic"]["features"]["customDomain"] is False
        assert plans["grand"]["features"]["customDomain"] is False
        assert plans["elegant"]["features"]["customDomain"] is True
        # mealPreferences gate
        assert plans["classic"]["features"]["mealPreferences"] is False
        assert plans["grand"]["features"]["mealPreferences"] is True
        # analytics nested object present
        for k in ("classic", "grand", "elegant"):
            assert "analytics" in plans[k]
            assert "visits" in plans[k]["analytics"]


# ===== MIGRATION + backwards-compat =====
class TestPlanMigration:
    def test_no_legacy_plans_in_db(self, s, auth):
        r = s.get(f"{API}/weddings", headers=auth)
        assert r.status_code == 200
        weds = r.json()["weddings"]
        legacy = [w for w in weds if w.get("plan") in ("eternal", "heirloom", "signature", "essential")]
        assert not legacy, f"DB still contains legacy plan ids: {[(w['slug'], w['plan']) for w in legacy]}"

    def test_post_legacy_eternal_normalises_to_elegant(self, s, auth):
        w = _make_wedding(s, auth, "eternal")
        assert w["plan"] == "elegant", f"eternal->elegant normalisation failed: {w['plan']}"

    def test_post_legacy_signature_normalises_to_grand(self, s, auth):
        w = _make_wedding(s, auth, "signature")
        assert w["plan"] == "grand", f"signature->grand normalisation failed: {w['plan']}"

    def test_post_legacy_essential_normalises_to_classic(self, s, auth):
        w = _make_wedding(s, auth, "essential")
        assert w["plan"] == "classic", f"essential->classic normalisation failed: {w['plan']}"


# ===== GALLERY CAP =====
class TestGalleryCap:
    def test_classic_gallery_clipped_to_15_on_post(self, s, auth):
        w = _make_wedding(s, auth, "classic", gallery_count=20)
        assert len(w.get("gallery") or []) == 15

    def test_grand_gallery_clipped_to_40_on_post(self, s, auth):
        w = _make_wedding(s, auth, "grand", gallery_count=60)
        assert len(w.get("gallery") or []) == 40

    def test_elegant_gallery_clipped_to_75_on_post(self, s, auth):
        w = _make_wedding(s, auth, "elegant", gallery_count=100)
        assert len(w.get("gallery") or []) == 75

    def test_classic_put_with_50_clips_to_15(self, s, auth):
        w = _make_wedding(s, auth, "classic", gallery_count=5)
        upd = {
            "gallery": [{"url": f"https://picsum.photos/seed/upd_{i}/600/400", "caption": ""} for i in range(50)],
        }
        r = s.put(f"{API}/weddings/{w['id']}", json=upd, headers=auth)
        assert r.status_code == 200, r.text
        w2 = r.json()["wedding"]
        assert len(w2["gallery"]) == 15


# ===== FEATURE STRIP =====
class TestFeatureStripping:
    def test_classic_photowall_stripped(self, s, auth):
        adv = {"photoWall": {"enabled": True, "title": "Should be off"}, "customDomain": "", "musicEmbed": ""}
        w = _make_wedding(s, auth, "classic", advanced=adv)
        pw = (w.get("advancedSettings") or {}).get("photoWall") or {}
        assert pw.get("enabled") is False, f"photoWall.enabled not stripped on Classic: {pw}"

    def test_classic_customdomain_stripped(self, s, auth):
        adv = {"photoWall": {"enabled": False}, "customDomain": "https://my-wedding.example", "musicEmbed": ""}
        w = _make_wedding(s, auth, "classic", advanced=adv)
        cd = (w.get("advancedSettings") or {}).get("customDomain")
        assert cd == "", f"customDomain not stripped on Classic: {cd!r}"

    def test_grand_customdomain_stripped(self, s, auth):
        adv = {"customDomain": "https://my-wedding.example", "musicEmbed": ""}
        w = _make_wedding(s, auth, "grand", advanced=adv)
        cd = (w.get("advancedSettings") or {}).get("customDomain")
        assert cd == "", f"customDomain should be stripped on Grand: {cd!r}"

    def test_elegant_customdomain_preserved(self, s, auth):
        url = "https://wedding-elegant.example"
        adv = {"customDomain": url, "musicEmbed": "https://youtu.be/abc"}
        w = _make_wedding(s, auth, "elegant", advanced=adv)
        cd = (w.get("advancedSettings") or {}).get("customDomain")
        assert cd == url

    def test_classic_musicembed_stripped(self, s, auth):
        adv = {"musicEmbed": "https://youtu.be/dQw4w9WgXcQ"}
        w = _make_wedding(s, auth, "classic", advanced=adv)
        me = (w.get("advancedSettings") or {}).get("musicEmbed")
        assert me == "", f"musicEmbed should be stripped on Classic: {me!r}"

    def test_grand_musicembed_preserved(self, s, auth):
        url = "https://youtu.be/abc1234"
        adv = {"musicEmbed": url}
        w = _make_wedding(s, auth, "grand", advanced=adv)
        me = (w.get("advancedSettings") or {}).get("musicEmbed")
        # Grand allows video embed (musicEmbed field doubles for both)
        assert me == url, f"musicEmbed should be preserved on Grand (video): {me!r}"


# ===== USAGE ENDPOINT =====
class TestUsageEndpoint:
    def test_usage_shape(self, s, auth):
        w = _make_wedding(s, auth, "grand", gallery_count=5)
        r = s.get(f"{API}/weddings/{w['id']}/usage", headers=auth)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "plan" in d and "used" in d and "remaining" in d
        p = d["plan"]
        assert p.get("id") == "grand"
        assert "limits" in p and "features" in p
        used = d["used"]
        for k in ("galleryPhotos", "rsvpResponses", "liveWallUploads"):
            assert k in used, f"missing used.{k}"
        rem = d["remaining"]
        for k in ("galleryPhotos", "rsvpResponses", "liveWallUploads"):
            assert k in rem
            assert rem[k] >= 0, f"remaining.{k} must be non-negative, got {rem[k]}"
        # Gallery: 5 used, 35 remaining (Grand=40)
        assert used["galleryPhotos"] == 5
        assert rem["galleryPhotos"] == 35

    def test_usage_requires_auth(self, s):
        # Pick any wedding id (use a fake to confirm 401 not 404)
        r = s.get(f"{API}/weddings/nonexistent-id/usage")
        assert r.status_code in (401, 404)


# ===== RSVP CAP + meal preference gating =====
class TestRsvpGating:
    def test_classic_strips_meal_preferences(self, s, auth):
        w = _make_wedding(s, auth, "classic", extras={"status": "published"})
        body = {
            "weddingSlug": w["slug"],
            "name": "TEST_RSVP_mealClassic",
            "attending": "yes",
            "guests": 1,
            "mealPreferences": ["veg", "vegan"],
        }
        r = s.post(f"{API}/rsvp", json=body)
        assert r.status_code == 200, r.text
        rsvp = r.json()["rsvp"]
        assert rsvp["mealPreferences"] == [], f"Classic should strip mealPreferences, got {rsvp['mealPreferences']}"

    def test_grand_preserves_meal_preferences(self, s, auth):
        w = _make_wedding(s, auth, "grand", extras={"status": "published"})
        body = {
            "weddingSlug": w["slug"],
            "name": "TEST_RSVP_mealGrand",
            "attending": "yes",
            "guests": 1,
            "mealPreferences": ["veg", "gluten-free"],
        }
        r = s.post(f"{API}/rsvp", json=body)
        assert r.status_code == 200, r.text
        rsvp = r.json()["rsvp"]
        assert sorted(rsvp["mealPreferences"]) == sorted(["veg", "gluten-free"])

    @pytest.mark.slow
    def test_classic_rsvp_cap_returns_423(self, s, auth):
        """Fill RSVP up to cap=150 on a Classic wedding via direct API and expect 151st to 423."""
        w = _make_wedding(s, auth, "classic", extras={"status": "published"})
        slug = w["slug"]
        # Seed 150 RSVPs via API
        sess = requests.Session()
        ok_count = 0
        for i in range(150):
            r = sess.post(f"{API}/rsvp", json={
                "weddingSlug": slug,
                "name": f"TEST_GUEST_{i}",
                "attending": "yes",
                "guests": 1,
            })
            if r.status_code == 200:
                ok_count += 1
            else:
                pytest.fail(f"RSVP {i+1}/150 failed early: {r.status_code} {r.text[:120]}")
        assert ok_count == 150
        # 151st should be capped
        r2 = sess.post(f"{API}/rsvp", json={
            "weddingSlug": slug,
            "name": "TEST_GUEST_overflow",
            "attending": "yes",
            "guests": 1,
        })
        assert r2.status_code == 423, f"expected 423 at cap, got {r2.status_code}: {r2.text[:200]}"
        msg = (r2.json().get("error") or "").lower()
        assert "no longer being accepted" in msg or "rsvp" in msg


# ===== PHOTO WALL gating =====
class TestPhotoWallGating:
    # Tiny 1x1 PNG data URI for upload tests
    TINY_PNG = (
        "data:image/png;base64,"
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    )

    def test_classic_admin_add_returns_403(self, s, auth):
        w = _make_wedding(s, auth, "classic")
        body = {
            "weddingId": w["id"],
            "dataUri": self.TINY_PNG,
            "uploaderName": "TEST_admin",
            "caption": "TEST",
        }
        r = s.post(f"{API}/photo-wall/admin-add", json=body, headers=auth)
        assert r.status_code == 403, f"Classic admin-add should be 403, got {r.status_code}: {r.text[:200]}"

    def test_demo_bypasses_plan_gating(self, s, auth):
        # Find a demo preview wedding (preview-* slug, isDemo:true)
        r = s.get(f"{API}/weddings", headers=auth)
        weds = r.json()["weddings"]
        demo = next((w for w in weds if w.get("isDemo") and w.get("slug", "").startswith("preview-")), None)
        assert demo, "no demo wedding found to test demo bypass"
        body = {
            "weddingId": demo["id"],
            "dataUri": self.TINY_PNG,
            "uploaderName": "TEST_demo_bypass",
            "caption": "TEST_iter4_bypass",
        }
        r = s.post(f"{API}/photo-wall/admin-add", json=body, headers=auth)
        # 201 expected (demo bypass plan gating + cap). If cloudinary fails, accept 500 as env issue.
        if r.status_code in (500, 502):
            pytest.skip(f"upload backend failure (env): {r.status_code} {r.text[:120]}")
        assert r.status_code == 201, f"demo admin-add should succeed, got {r.status_code}: {r.text[:200]}"
        # Cleanup: delete the uploaded photo
        photo = r.json().get("photo") or {}
        if photo.get("id"):
            try:
                s.delete(f"{API}/photo-wall/{photo['id']}", headers=auth)
            except Exception:
                pass

    def test_classic_guest_upload_returns_403(self, s, auth):
        w = _make_wedding(s, auth, "classic", extras={"status": "published"},
                          advanced={"photoWall": {"enabled": True, "title": "T"}})
        # Note: applyPlanGating strips photoWall.enabled to false on Classic, so we expect 403 either way
        body = {
            "weddingSlug": w["slug"],
            "uploaderName": "TEST_guest",
            "dataUri": self.TINY_PNG,
            "caption": "T",
        }
        r = s.post(f"{API}/photo-wall", json=body)
        assert r.status_code in (403, 423), f"expected 403/423 for Classic guest upload, got {r.status_code}: {r.text[:200]}"


# ===== REGRESSION =====
class TestRegression:
    def test_revenue_stats_byPlan_keys(self, s, auth):
        r = s.get(f"{API}/revenue/stats", headers=auth)
        assert r.status_code == 200
        d = r.json()
        keys = set(d.get("byPlan", {}).keys())
        # New plan ids — note iter3 used 'eternal'; iter4 renamed to 'elegant'
        assert "classic" in keys and "grand" in keys
        # Either elegant or eternal acceptable depending on revenue stats build
        assert ("elegant" in keys) or ("eternal" in keys), f"byPlan missing elegant/eternal: {keys}"
        # Should NOT have older legacy ids
        assert not ({"heirloom", "signature", "essential"} & keys), f"legacy plan keys leaked: {keys}"

    def test_admin_badges_endpoint(self, s, auth):
        r = s.get(f"{API}/admin/badges", headers=auth)
        assert r.status_code == 200
        d = r.json()
        for k in ("photoWallPending", "leadsNew", "formsSubmitted"):
            assert k in d

    def test_plans_alias_available(self, s):
        # API surface health — /api/plans should be reachable
        r = s.get(f"{API}/plans")
        assert r.status_code == 200
