"""
Iteration 5 regression tests — Vivoha
Coverage:
  - Invite-password gating (423 on protected endpoints; cookie unlocks all)
  - No rate-limit on invite-password
  - Couple dashboard TOKEN-ONLY (slug login & slug dashboard route gone)
  - Theme persistence + sanitisation
  - Admin client-access flow + rotate
"""
import os
import re
import time
import pytest
import requests
from pymongo import MongoClient
import bcrypt

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://kmaya-preview.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@vivoha.in")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "VivohaAdmin@2026")
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "vivoha")

SLUG = "preview-moonveil"
COUPLE_PWD = "couple123"


# ---------------- shared fixtures ----------------

@pytest.fixture(scope="session")
def db():
    c = MongoClient(MONGO_URL)
    return c[DB_NAME]


@pytest.fixture(scope="session")
def wedding_id(db):
    w = db.weddings.find_one({"slug": SLUG, "deletedAt": {"$exists": False}})
    assert w, f"Seeded wedding {SLUG} missing"
    return w["id"]


@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text[:200]}"
    return r.json().get("token") or r.json().get("accessToken") or r.json().get("jwt")


@pytest.fixture
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


# ---------------- INVITE-PASSWORD GATING ----------------

class TestInvitePasswordGating:
    @pytest.fixture(scope="class", autouse=True)
    def clean_password(self, db):
        """Ensure no password set initially, restore at end."""
        db.weddings.update_one({"slug": SLUG}, {"$unset": {"invitePassword": ""}})
        yield
        db.weddings.update_one({"slug": SLUG}, {"$unset": {"invitePassword": ""}})

    def test_no_password_public_wedding_200(self):
        r = requests.get(f"{BASE_URL}/api/public/wedding/{SLUG}", timeout=15)
        assert r.status_code == 200
        assert r.json()["wedding"]["slug"] == SLUG

    def test_no_password_photo_wall_public_200(self):
        r = requests.get(f"{BASE_URL}/api/photo-wall/public/{SLUG}", timeout=15)
        assert r.status_code in (200, 404)  # 404 if not enabled — but moonveil has photo wall

    def test_set_password_then_endpoints_return_423(self, db):
        # Seed bcrypt hash directly
        pw_hash = bcrypt.hashpw(b"secret123", bcrypt.gensalt(10)).decode()
        db.weddings.update_one(
            {"slug": SLUG},
            {"$set": {"invitePassword": {"passwordHash": pw_hash, "prompt": "Private", "updatedAt": time.time()}}},
        )

        r1 = requests.get(f"{BASE_URL}/api/public/wedding/{SLUG}", timeout=15)
        assert r1.status_code == 423, f"public/wedding should be 423 got {r1.status_code}"
        # No data leak
        body1 = r1.json()
        assert "wedding" not in body1 or not body1.get("wedding"), f"data leak: {body1}"

        r2 = requests.get(f"{BASE_URL}/api/photo-wall/public/{SLUG}", timeout=15)
        assert r2.status_code == 423, f"photo-wall/public should be 423 got {r2.status_code} {r2.text[:200]}"

        r3 = requests.post(
            f"{BASE_URL}/api/rsvp",
            json={"weddingSlug": SLUG, "name": "TEST_gate", "attending": "yes"},
            timeout=15,
        )
        assert r3.status_code == 423, f"rsvp POST should be 423 got {r3.status_code} {r3.text[:200]}"

        r4 = requests.post(
            f"{BASE_URL}/api/photo-wall",
            json={"weddingSlug": SLUG, "uploaderName": "TEST", "dataUri": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgYAAAAAMAASsJTYQAAAAASUVORK5CYII="},
            timeout=15,
        )
        assert r4.status_code == 423, f"photo-wall POST should be 423 got {r4.status_code} {r4.text[:200]}"

    def test_invite_auth_unlocks_all_endpoints(self):
        # password from prior test still set
        s = requests.Session()
        r = s.post(f"{BASE_URL}/api/invite/auth", json={"slug": SLUG, "password": "secret123"}, timeout=15)
        assert r.status_code == 200, f"invite/auth failed: {r.status_code} {r.text[:200]}"
        # cookie name
        assert any(k.startswith("vivoha_invite_") for k in s.cookies.keys()), f"cookie not set: {s.cookies}"

        r1 = s.get(f"{BASE_URL}/api/public/wedding/{SLUG}", timeout=15)
        assert r1.status_code == 200

        r2 = s.get(f"{BASE_URL}/api/photo-wall/public/{SLUG}", timeout=15)
        assert r2.status_code == 200

        # RSVP POST should now succeed (or 200/201)
        r3 = s.post(f"{BASE_URL}/api/rsvp", json={"weddingSlug": SLUG, "name": "TEST_unlocked", "attending": "yes"}, timeout=15)
        assert r3.status_code in (200, 201), f"rsvp POST after unlock: {r3.status_code} {r3.text[:200]}"

        # Photo wall POST should not be 423 (may be 400/422 due to validation but NOT 423)
        r4 = s.post(
            f"{BASE_URL}/api/photo-wall",
            json={"weddingSlug": SLUG, "uploaderName": "TEST", "dataUri": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgYAAAAAMAASsJTYQAAAAASUVORK5CYII="},
            timeout=15,
        )
        assert r4.status_code != 423, f"photo-wall POST still gated after unlock: {r4.status_code} {r4.text[:200]}"


# ---------------- NO RATE LIMIT ON INVITE AUTH ----------------

class TestInviteAuthNoRateLimit:
    @pytest.fixture(scope="class", autouse=True)
    def seed_password(self, db):
        pw_hash = bcrypt.hashpw(b"secret123", bcrypt.gensalt(10)).decode()
        db.weddings.update_one(
            {"slug": SLUG},
            {"$set": {"invitePassword": {"passwordHash": pw_hash, "prompt": "Private", "updatedAt": time.time()}}},
        )
        yield
        db.weddings.update_one({"slug": SLUG}, {"$unset": {"invitePassword": ""}})

    def test_12_wrong_attempts_all_return_401(self):
        codes = []
        for i in range(12):
            r = requests.post(
                f"{BASE_URL}/api/invite/auth",
                json={"slug": SLUG, "password": f"wrong-{i}"},
                timeout=15,
            )
            codes.append(r.status_code)
        assert all(c == 401 for c in codes), f"Expected all 401 (no rate-limit), got: {codes}"
        assert 429 not in codes, f"Got 429 lockout: {codes}"


# ---------------- COUPLE DASHBOARD TOKEN-ONLY ----------------

class TestCoupleTokenOnly:
    @pytest.fixture(scope="class")
    def dashboard_token(self, db, wedding_id):
        # Ensure a clientAccess + dashboardToken exists. Use admin endpoint.
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
        token = r.json().get("token") or r.json().get("accessToken")
        headers = {"Authorization": f"Bearer {token}"}
        g = requests.get(f"{BASE_URL}/api/weddings/{wedding_id}/client-access", headers=headers, timeout=15)
        assert g.status_code == 200, f"client-access GET failed: {g.status_code} {g.text[:200]}"
        gd = g.json()
        if not gd.get("dashboardToken"):
            # set password
            p = requests.post(
                f"{BASE_URL}/api/weddings/{wedding_id}/client-access",
                json={"password": COUPLE_PWD},
                headers=headers, timeout=15
            )
            assert p.status_code == 200
            return p.json()["dashboardToken"]
        # Ensure password is couple123 — set it again to be safe
        requests.post(
            f"{BASE_URL}/api/weddings/{wedding_id}/client-access",
            json={"password": COUPLE_PWD},
            headers=headers, timeout=15
        )
        return gd["dashboardToken"]

    def test_slug_based_dashboard_route_gone(self):
        r = requests.get(f"{BASE_URL}/api/client/dashboard/{SLUG}", timeout=15)
        # slug should not match the hex regex → 404 OR 401
        assert r.status_code in (404, 401), f"slug dashboard route still works: {r.status_code}"

    def test_slug_login_rejected(self):
        r = requests.post(
            f"{BASE_URL}/api/client/login",
            json={"slug": SLUG, "password": COUPLE_PWD},
            timeout=15,
        )
        assert r.status_code in (400, 404), f"slug login should fail: {r.status_code} {r.text[:200]}"

    def test_token_login_returns_jwt(self, dashboard_token):
        r = requests.post(
            f"{BASE_URL}/api/client/login",
            json={"dashboardToken": dashboard_token, "password": COUPLE_PWD},
            timeout=15,
        )
        assert r.status_code == 200, f"token login failed: {r.status_code} {r.text[:200]}"
        j = r.json()
        assert "token" in j and isinstance(j["token"], str) and len(j["token"]) > 20

    def test_dashboard_with_bearer_works(self, dashboard_token):
        login = requests.post(
            f"{BASE_URL}/api/client/login",
            json={"dashboardToken": dashboard_token, "password": COUPLE_PWD},
            timeout=15,
        )
        jwt = login.json()["token"]
        r = requests.get(
            f"{BASE_URL}/api/client/dashboard/{dashboard_token}",
            headers={"Authorization": f"Bearer {jwt}"},
            timeout=15,
        )
        assert r.status_code == 200, f"client dashboard: {r.status_code} {r.text[:200]}"

    def test_photo_wall_list_with_bearer(self, dashboard_token):
        login = requests.post(
            f"{BASE_URL}/api/client/login",
            json={"dashboardToken": dashboard_token, "password": COUPLE_PWD},
            timeout=15,
        )
        jwt = login.json()["token"]
        r = requests.get(
            f"{BASE_URL}/api/client/photo-wall/list/{dashboard_token}",
            headers={"Authorization": f"Bearer {jwt}"},
            timeout=15,
        )
        assert r.status_code == 200, f"client photo-wall list: {r.status_code} {r.text[:200]}"


# ---------------- THEME PERSISTENCE + SANITISATION ----------------

class TestTheme:
    @pytest.fixture(scope="class", autouse=True)
    def restore_theme(self, db):
        yield
        db.weddings.update_one(
            {"slug": SLUG},
            {"$set": {"theme": {"accent": "", "headingFont": "", "bodyFont": ""}}},
        )

    def test_admin_can_set_theme(self, admin_headers, wedding_id):
        payload = {"theme": {"accent": "#0F5132", "headingFont": "cinzel", "bodyFont": "lora"}}
        r = requests.put(f"{BASE_URL}/api/weddings/{wedding_id}", json=payload, headers=admin_headers, timeout=15)
        assert r.status_code == 200, f"PUT theme: {r.status_code} {r.text[:200]}"

    def test_public_wedding_exposes_theme(self):
        r = requests.get(f"{BASE_URL}/api/public/wedding/{SLUG}", timeout=15)
        assert r.status_code == 200
        t = r.json()["wedding"].get("theme")
        assert t == {"accent": "#0F5132", "headingFont": "cinzel", "bodyFont": "lora"}, f"theme not persisted: {t}"

    def test_theme_sanitises_xss(self, admin_headers, wedding_id):
        payload = {"theme": {"accent": "javascript:alert(1)", "headingFont": "<script>", "bodyFont": "lora"}}
        r = requests.put(f"{BASE_URL}/api/weddings/{wedding_id}", json=payload, headers=admin_headers, timeout=15)
        assert r.status_code == 200
        # Verify sanitisation
        g = requests.get(f"{BASE_URL}/api/public/wedding/{SLUG}", timeout=15)
        t = g.json()["wedding"].get("theme")
        assert t == {"accent": "", "headingFont": "", "bodyFont": "lora"}, f"sanitise failed: {t}"


# ---------------- ADMIN CLIENT-ACCESS FLOW ----------------

class TestClientAccessFlow:
    def test_get_client_access(self, admin_headers, wedding_id):
        r = requests.get(f"{BASE_URL}/api/weddings/{wedding_id}/client-access", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert "enabled" in body and "dashboardToken" in body

    def test_set_password(self, admin_headers, wedding_id):
        r = requests.post(
            f"{BASE_URL}/api/weddings/{wedding_id}/client-access",
            json={"password": COUPLE_PWD},
            headers=admin_headers, timeout=15
        )
        assert r.status_code == 200
        body = r.json()
        assert body.get("ok") is True
        token = body.get("dashboardToken")
        assert isinstance(token, str) and re.match(r"^[a-f0-9]{16,128}$", token)

    def test_rotate_invalidates_old_token(self, admin_headers, wedding_id):
        # Get current token
        g = requests.get(f"{BASE_URL}/api/weddings/{wedding_id}/client-access", headers=admin_headers, timeout=15)
        old_token = g.json()["dashboardToken"]
        # Login with old token to confirm it works
        login_old = requests.post(
            f"{BASE_URL}/api/client/login",
            json={"dashboardToken": old_token, "password": COUPLE_PWD},
            timeout=15,
        )
        assert login_old.status_code == 200, "Old token login should work before rotate"

        # Rotate
        r = requests.post(
            f"{BASE_URL}/api/weddings/{wedding_id}/client-access/rotate",
            headers=admin_headers, timeout=15
        )
        assert r.status_code == 200, f"rotate failed: {r.status_code} {r.text[:200]}"
        new_token = r.json()["dashboardToken"]
        assert new_token != old_token

        # Old token login should now fail
        login_fail = requests.post(
            f"{BASE_URL}/api/client/login",
            json={"dashboardToken": old_token, "password": COUPLE_PWD},
            timeout=15,
        )
        assert login_fail.status_code in (401, 404), f"Old token still works after rotate: {login_fail.status_code}"

        # New token should work
        login_new = requests.post(
            f"{BASE_URL}/api/client/login",
            json={"dashboardToken": new_token, "password": COUPLE_PWD},
            timeout=15,
        )
        assert login_new.status_code == 200
