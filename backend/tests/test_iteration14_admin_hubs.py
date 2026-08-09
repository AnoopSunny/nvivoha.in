"""
Iteration 14 — Admin Owner Hubs API backend tests
Covers:
 - GET /api/admin/hubs (auth required, projection, ?q filter)
 - POST /api/admin/hubs/:id/reset-publish-code (auth, 404, success, persistence)
"""
import os
import re
import pytest
import requests

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL", "https://vausy-staging.preview.emergentagent.com"
).rstrip("/")

ADMIN_EMAIL = "admin@vivoha.in"
ADMIN_PASSWORD = "VivohaAdmin@2026"


@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=20,
    )
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    token = r.json().get("token")
    assert token and len(token) > 50
    return token


@pytest.fixture(scope="session")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# --------- Module: GET /api/admin/hubs ---------

class TestAdminHubsList:
    def test_unauthorized_returns_401(self):
        r = requests.get(f"{BASE_URL}/api/admin/hubs", timeout=15)
        assert r.status_code == 401

    def test_authorized_returns_hubs_array(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/admin/hubs", headers=auth_headers, timeout=20)
        assert r.status_code == 200
        body = r.json()
        assert "hubs" in body and isinstance(body["hubs"], list)
        assert len(body["hubs"]) > 0, "Expected at least one hub (ameya-kaushal)"

    def test_row_projection_contains_required_keys(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/admin/hubs", headers=auth_headers, timeout=20)
        hubs = r.json()["hubs"]
        # Find canonical ameya-kaushal row
        ameya = next((h for h in hubs if h.get("slug") == "ameya-kaushal"), None)
        assert ameya is not None, "Seeded ameya-kaushal wedding not found"
        expected_keys = [
            "id", "slug", "brideName", "groomName", "weddingDate", "template",
            "plan", "paymentStatus", "publishedStatus", "paymentAmount",
            "paymentAddons", "paymentAddonsAmount", "ownerToken",
            "ownerWhatsappLast4", "publishCodeSetAt", "rsvpCount", "viewCount",
        ]
        for k in expected_keys:
            assert k in ameya, f"Missing key {k} in hub row"
        assert isinstance(ameya["paymentAddons"], list)
        assert isinstance(ameya["paymentAddonsAmount"], (int, float))
        # ownerToken must exist on every row (filter requirement)
        for h in hubs:
            assert h.get("ownerToken"), f"Row {h.get('slug')} missing ownerToken"

    def test_query_filter_ameya_returns_only_match(self, auth_headers):
        r = requests.get(
            f"{BASE_URL}/api/admin/hubs?q=ameya", headers=auth_headers, timeout=20
        )
        assert r.status_code == 200
        hubs = r.json()["hubs"]
        assert len(hubs) >= 1
        for h in hubs:
            blob = f"{h.get('brideName','')} {h.get('groomName','')} {h.get('slug','')}".lower()
            assert "ameya" in blob

    def test_query_filter_case_insensitive(self, auth_headers):
        r = requests.get(
            f"{BASE_URL}/api/admin/hubs?q=AMEYA", headers=auth_headers, timeout=20
        )
        assert r.status_code == 200
        assert any(h["slug"] == "ameya-kaushal" for h in r.json()["hubs"])

    def test_query_filter_no_match_returns_empty(self, auth_headers):
        r = requests.get(
            f"{BASE_URL}/api/admin/hubs?q=zzznotacouple", headers=auth_headers, timeout=20
        )
        assert r.status_code == 200
        assert r.json()["hubs"] == []


# --------- Module: POST /api/admin/hubs/:id/reset-publish-code ---------

class TestAdminResetPublishCode:
    def test_unauthorized_returns_401(self):
        r = requests.post(
            f"{BASE_URL}/api/admin/hubs/some-id/reset-publish-code", timeout=15
        )
        assert r.status_code == 401

    def test_unknown_id_returns_404(self, auth_headers):
        r = requests.post(
            f"{BASE_URL}/api/admin/hubs/this-id-does-not-exist/reset-publish-code",
            headers=auth_headers,
            timeout=15,
        )
        assert r.status_code == 404

    def test_reset_publish_code_success_and_persistence(self, auth_headers):
        # Pick a TEST_ row so we don't disturb ameya-kaushal canonical demo.
        r = requests.get(f"{BASE_URL}/api/admin/hubs", headers=auth_headers, timeout=20)
        hubs = r.json()["hubs"]
        target = next(
            (h for h in hubs if h.get("brideName", "").startswith("TEST")
             and h.get("publishCodeSetAt")),
            None,
        )
        # Fall back to any row with publishCodeSetAt if no TEST_ row
        if target is None:
            target = next((h for h in hubs if h.get("publishCodeSetAt")), None)
        assert target is not None, "No hub row with publishCodeSetAt to reset"
        wid = target["id"]
        original_owner_token = target["ownerToken"]

        r2 = requests.post(
            f"{BASE_URL}/api/admin/hubs/{wid}/reset-publish-code",
            headers=auth_headers,
            timeout=20,
        )
        assert r2.status_code == 200, f"reset failed: {r2.status_code} {r2.text}"
        body = r2.json()
        assert body.get("ok") is True
        assert "message" in body and isinstance(body["message"], str)

        # Re-fetch list and verify publishCodeSetAt is now null AND ownerToken preserved
        r3 = requests.get(f"{BASE_URL}/api/admin/hubs", headers=auth_headers, timeout=20)
        after = next(h for h in r3.json()["hubs"] if h["id"] == wid)
        assert after.get("publishCodeSetAt") in (None, ""), (
            f"publishCodeSetAt not cleared: {after.get('publishCodeSetAt')!r}"
        )
        assert after.get("ownerToken") == original_owner_token, (
            "ownerToken must be preserved after reset"
        )


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
