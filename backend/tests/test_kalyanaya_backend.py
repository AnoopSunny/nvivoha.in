"""
Backend tests for Kalyanaya — Previews, Plans, Revenue, Test toggle.
Hits the public Next.js API (proxied) at REACT_APP_BACKEND_URL / hardcoded preview URL.
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://c7405654-bb3f-444c-817e-a37946d76ea7.preview.emergentagent.com",
).rstrip("/")

ADMIN_EMAIL = "admin@kalyanaya.com"
ADMIN_PASSWORD = "KalyanayaAdmin@2026"

PLAN_PRICES = {"essential": 2499, "signature": 4999, "heirloom": 7000}


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=30,
    )
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and data["user"]["role"] == "admin"
    return data["token"]


@pytest.fixture(scope="session")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


def _wedding_payload(**overrides):
    base = {
        "brideName": "TEST_Bride",
        "groomName": "TEST_Groom",
        "weddingDate": "2026-12-12",
        "template": "Moonveil",
        "status": "draft",
    }
    base.update(overrides)
    return base


# Track created weddings for cleanup
created_ids = []


@pytest.fixture(scope="session", autouse=True)
def cleanup(auth_headers):
    yield
    for wid in created_ids:
        try:
            requests.delete(f"{BASE_URL}/api/weddings/{wid}", headers=auth_headers, timeout=20)
        except Exception:
            pass


def _create(headers, **overrides):
    r = requests.post(
        f"{BASE_URL}/api/weddings",
        headers=headers,
        json=_wedding_payload(**overrides),
        timeout=60,
    )
    assert r.status_code == 200, f"Create failed: {r.status_code} {r.text}"
    w = r.json()["wedding"]
    created_ids.append(w["id"])
    return w


# ---------- Health / Auth ----------
class TestHealth:
    def test_root(self):
        # /api/ has a trailing-slash redirect loop on this proxy; use a known route instead
        r = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "x", "password": "x"},
            timeout=30,
        )
        # We just want to confirm the API is reachable & responsive
        assert r.status_code in (400, 401)

    def test_login(self, admin_token):
        assert isinstance(admin_token, str) and len(admin_token) > 10


# ---------- Preview / Demo wedding ----------
class TestPreviews:
    def test_create_preview_no_revenue(self, auth_headers):
        w = _create(auth_headers, brideName="TEST_PreviewBride", isDemo=True)
        assert w["isDemo"] is True
        assert w.get("plan") in (None, "")
        assert w.get("revenueLogged") in (False, None)

    def test_isDemo_filter_true_returns_only_previews(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/weddings?isDemo=true", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        weddings = r.json()["weddings"]
        assert len(weddings) >= 1
        for w in weddings:
            assert w.get("isDemo") is True, f"Non-demo wedding leaked into isDemo=true filter: {w.get('slug')}"

    def test_isDemo_filter_false_returns_only_real(self, auth_headers):
        # ensure at least one real wedding exists
        _create(auth_headers, brideName="TEST_RealForFilter", plan="signature")
        r = requests.get(f"{BASE_URL}/api/weddings?isDemo=false", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        weddings = r.json()["weddings"]
        assert len(weddings) >= 1
        for w in weddings:
            assert w.get("isDemo") in (False, None), f"Demo leaked into isDemo=false filter: {w.get('slug')}"


# ---------- Revenue logging via wedding lifecycle ----------
class TestRevenueLogging:
    def test_signature_plan_logs_revenue(self, auth_headers):
        # Snapshot stats before
        r0 = requests.get(f"{BASE_URL}/api/revenue/stats", headers=auth_headers, timeout=30)
        assert r0.status_code == 200
        before = r0.json()

        w = _create(auth_headers, brideName="TEST_SigPlan", plan="signature")
        assert w["plan"] == "signature"
        assert w.get("revenueLogged") is True
        assert w.get("revenueAmount") == 4999

        # Verify revenue entry exists for this wedding
        r1 = requests.get(f"{BASE_URL}/api/revenue", headers=auth_headers, timeout=30)
        assert r1.status_code == 200
        revs = r1.json()["revenues"]
        match = [x for x in revs if x.get("weddingId") == w["id"]]
        assert len(match) == 1
        assert match[0]["plan"] == "signature"
        assert match[0]["amount"] == 4999
        assert match[0]["currency"] == "INR"

        # Verify stats incremented
        r2 = requests.get(f"{BASE_URL}/api/revenue/stats", headers=auth_headers, timeout=30)
        assert r2.status_code == 200
        after = r2.json()
        assert after["total"] == before["total"] + 4999
        assert after["count"] == before["count"] + 1
        assert after["byPlan"]["signature"] == before["byPlan"]["signature"] + 4999
        assert after["planPrices"] == PLAN_PRICES

    def test_heirloom_test_mode_no_revenue(self, auth_headers):
        r0 = requests.get(f"{BASE_URL}/api/revenue/stats", headers=auth_headers, timeout=30)
        before_total = r0.json()["total"]

        w = _create(auth_headers, brideName="TEST_HeirloomTest", plan="heirloom", isTest=True)
        assert w["plan"] == "heirloom"
        assert w["isTest"] is True
        assert w.get("revenueLogged") in (False, None)

        r1 = requests.get(f"{BASE_URL}/api/revenue", headers=auth_headers, timeout=30)
        revs = r1.json()["revenues"]
        match = [x for x in revs if x.get("weddingId") == w["id"]]
        assert len(match) == 0

        r2 = requests.get(f"{BASE_URL}/api/revenue/stats", headers=auth_headers, timeout=30)
        assert r2.json()["total"] == before_total

    def test_demo_no_revenue_even_with_plan(self, auth_headers):
        # Even if a plan is somehow set, isDemo should block revenue
        w = _create(auth_headers, brideName="TEST_DemoWithPlan", isDemo=True, plan="heirloom")
        assert w.get("revenueLogged") in (False, None)
        r = requests.get(f"{BASE_URL}/api/revenue", headers=auth_headers, timeout=30)
        match = [x for x in r.json()["revenues"] if x.get("weddingId") == w["id"]]
        assert len(match) == 0

    def test_flip_isTest_false_logs_revenue_once(self, auth_headers):
        # Create test wedding with plan; no revenue logged
        w = _create(auth_headers, brideName="TEST_FlipTest", plan="heirloom", isTest=True)
        assert w.get("revenueLogged") in (False, None)

        # Flip isTest -> false → should log revenue
        r = requests.put(
            f"{BASE_URL}/api/weddings/{w['id']}",
            headers=auth_headers,
            json={"isTest": False},
            timeout=30,
        )
        assert r.status_code == 200
        updated = r.json()["wedding"]
        assert updated["isTest"] is False
        assert updated.get("revenueLogged") is True
        assert updated.get("revenueAmount") == 7000

        # Idempotency: flipping again should NOT create a duplicate revenue entry
        r2 = requests.put(
            f"{BASE_URL}/api/weddings/{w['id']}",
            headers=auth_headers,
            json={"isTest": False},
            timeout=30,
        )
        assert r2.status_code == 200
        revs = requests.get(f"{BASE_URL}/api/revenue", headers=auth_headers, timeout=30).json()["revenues"]
        match = [x for x in revs if x.get("weddingId") == w["id"]]
        assert len(match) == 1, f"Duplicate revenue logged: {match}"
        assert match[0]["amount"] == 7000
        assert match[0]["plan"] == "heirloom"


# ---------- Revenue endpoints ----------
class TestRevenueEndpoints:
    def test_revenue_list_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/revenue", timeout=30)
        assert r.status_code == 401

    def test_revenue_export_csv(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/revenue/export", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        ct = r.headers.get("Content-Type", "")
        assert "text/csv" in ct
        body = r.text
        assert "Date" in body and "Plan" in body and "Amount (INR)" in body

    def test_revenue_stats_structure(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/revenue/stats", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        data = r.json()
        for k in ("total", "last30", "count", "byPlan", "countByPlan", "planPrices"):
            assert k in data, f"Missing key: {k}"
        assert data["planPrices"] == PLAN_PRICES
        for p in ("essential", "signature", "heirloom"):
            assert p in data["byPlan"]
            assert p in data["countByPlan"]
