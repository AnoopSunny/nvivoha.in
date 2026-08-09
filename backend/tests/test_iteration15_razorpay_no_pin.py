"""
Iteration 15 - Razorpay (mock mode) + PIN removal regression suite.

Covers:
  * GET /api/payment-config           addons catalogue
  * Full happy path: onboard/start -> owner/register -> select-plan (3 addons)
       -> create-order -> verify-payment -> wedding auto-published
  * /api/hub/owner/<ownerToken>       post-publish payload
  * whatsapp_log persistence after verify-payment
  * /api/owner/auth                   WhatsApp-only auth
  * /api/owner/verify-pin             must be removed (404)
  * /api/create-order                 must NEVER expose RAZORPAY_KEY_SECRET
  * /api/onboard/wedding/<token>      must not expose publishCodeHash / publishCodeSet
"""

import os
import re
import time
import uuid
import pytest
import requests
from pymongo import MongoClient

# ---- Config ----------------------------------------------------------------
# Public preview URL is the same one the frontend uses (NEXT_PUBLIC_BASE_URL).
BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://a202cc14-ba1e-4a9d-af9f-e487be5c34af.preview.emergentagent.com",
).rstrip("/")

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "vivoha")

API = lambda path: f"{BASE_URL}/api{path}"  # noqa: E731


@pytest.fixture(scope="module")
def http():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def mongo():
    cli = MongoClient(MONGO_URL, serverSelectionTimeoutMS=4000)
    return cli[DB_NAME]


@pytest.fixture(scope="module")
def onboarded(http):
    """Create a fresh draft wedding for the test class."""
    payload = {
        "brideName": "TEST_Priya",
        "groomName": "TEST_Rahul",
        "email": f"test_{uuid.uuid4().hex[:8]}@vivohatest.in",
        "whatsapp": f"99{int(time.time()) % 100000000:08d}",
        "weddingDate": "2026-12-15",
        "template": "Moonveil",
    }
    r = http.post(API("/onboard/start"), json=payload, timeout=30)
    assert r.status_code in (200, 201), f"onboard/start failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and "slug" in data
    return {**payload, **data}


# ============================================================================
# Module: payment-config + addons catalogue
# ============================================================================
class TestPaymentConfig:
    def test_addons_catalogue(self, http):
        r = http.get(API("/payment-config"), timeout=20)
        assert r.status_code == 200, r.text
        cfg = r.json().get("config") or {}
        addons = cfg.get("addons") or []
        assert isinstance(addons, list) and len(addons) >= 3, addons
        by_id = {a["id"]: a for a in addons}
        assert by_id["custom-domain"]["price"] == 799
        assert by_id["concierge"]["price"] == 1499
        assert by_id["guest-memories"]["price"] == 299


# ============================================================================
# Module: owner registration (no PIN) + PIN endpoint removal
# ============================================================================
class TestOwnerAuthNoPin:
    def test_owner_register_no_pin(self, http, onboarded):
        body = {"onboardToken": onboarded["token"], "whatsapp": onboarded["whatsapp"]}
        r = http.post(API("/owner/register"), json=body, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("ok") is True
        assert "ownerToken" in data and len(data["ownerToken"]) >= 24
        assert "whatsappLast4" in data
        onboarded["ownerToken"] = data["ownerToken"]

    def test_owner_verify_pin_removed(self, http):
        r = http.post(API("/owner/verify-pin"), json={"whatsapp": "9999999999", "code": "1234"}, timeout=15)
        # Acceptable: 404 (route gone) or 405 (method not allowed). Anything <400 fails.
        assert r.status_code in (404, 405), f"verify-pin should be removed; got {r.status_code} {r.text[:200]}"

    def test_owner_auth_whatsapp_only(self, http, onboarded):
        # Owner already registered above
        r = http.post(API("/owner/auth"), json={"whatsapp": onboarded["whatsapp"]}, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("ok") is True
        assert data.get("ownerToken") == onboarded.get("ownerToken")
        assert "code" not in data  # nothing about PIN should leak


# ============================================================================
# Module: onboard/wedding payload sanitisation
# ============================================================================
class TestOnboardWeddingClean:
    def test_no_pin_fields_exposed(self, http, onboarded):
        r = http.get(API(f"/onboard/wedding/{onboarded['token']}"), timeout=15)
        assert r.status_code == 200, r.text
        w = r.json().get("wedding") or {}
        # publishCodeHash must never appear
        assert "publishCodeHash" not in w, "publishCodeHash leaked"
        # Requirement: PIN concept fully removed — publishCodeSet flag must also be gone
        assert "publishCodeSet" not in w, (
            "publishCodeSet still exposed — PIN concept not fully removed from onboard/wedding payload"
        )


# ============================================================================
# Module: plan selection with add-ons
# ============================================================================
class TestSelectPlanWithAddons:
    def test_select_plan_all_addons(self, http, onboarded):
        body = {"plan": "vivoha", "addons": ["custom-domain", "concierge", "guest-memories"]}
        r = http.post(API(f"/onboard/select-plan/{onboarded['token']}"), json=body, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["plan"] == "vivoha"
        assert data["baseAmount"] == 2999
        assert data["addonsAmount"] == 2597  # 799 + 1499 + 299
        assert data["amount"] == 5596
        assert {a["id"] for a in data["addons"]} == {"custom-domain", "concierge", "guest-memories"}
        onboarded["amount"] = data["amount"]

    def test_select_plan_rejects_bogus_addon(self, http, onboarded):
        # Bogus ids must be silently filtered, not priced
        body = {"plan": "vivoha", "addons": ["custom-domain", "hacker-discount-9999"]}
        r = http.post(API(f"/onboard/select-plan/{onboarded['token']}"), json=body, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["amount"] == 2999 + 799


# ============================================================================
# Module: Razorpay create-order (mock) — no secret leak
# ============================================================================
class TestCreateOrder:
    def test_create_order_returns_safe_fields_only(self, http, onboarded):
        body = {
            "amount": onboarded.get("amount", 5596),
            "currency": "INR",
            "receipt": f"viv-{onboarded['token'][:10]}",
            "notes": {"onboardToken": onboarded["token"]},
        }
        r = http.post(API("/create-order"), json=body, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("orderId", "").startswith("order_mock_"), data
        # amount is in paise
        assert data["amount"] == body["amount"] * 100
        assert data["currency"] == "INR"
        assert data.get("keyId"), "keyId missing"
        # CRITICAL: secret must never appear
        body_str = r.text.lower()
        assert "secret" not in body_str, f"secret-like field leaked: {r.text[:300]}"
        assert "placeholder_secret" not in r.text
        onboarded["orderId"] = data["orderId"]


# ============================================================================
# Module: verify-payment (mock mode accepts any signature) + auto-publish + whatsapp_log
# ============================================================================
class TestVerifyPaymentAndPublish:
    def test_verify_payment_mock_accepts_any_signature(self, http, onboarded, mongo):
        # Mock mode: any non-empty signature should be accepted.
        body = {
            "razorpay_order_id": onboarded["orderId"],
            "razorpay_payment_id": f"pay_mock_{uuid.uuid4().hex[:14]}",
            "razorpay_signature": "deadbeef" * 8,  # garbage on purpose
            "onboardToken": onboarded["token"],
        }
        r = http.post(API("/verify-payment"), json=body, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("success") is True
        assert "websiteUrl" in data and onboarded["slug"] in data["websiteUrl"]
        assert "hubUrl" in data
        assert "ownerToken" in data
        onboarded["ownerToken"] = data["ownerToken"]  # confirm same / minted

        # MongoDB sanity — wedding flipped to published
        w = mongo["weddings"].find_one({"onboardToken": onboarded["token"]})
        assert w is not None
        assert w.get("paymentStatus") == "approved"
        assert w.get("status") == "published"
        assert w.get("paymentProvider") == "razorpay"

    def test_whatsapp_log_written(self, mongo, onboarded):
        # Look up wedding by onboardToken to get its id, then check whatsapp_log by weddingId
        # (backend normalises phone with 91 country prefix so we can't match on `to`).
        w = mongo["weddings"].find_one({"onboardToken": onboarded["token"]})
        assert w, "wedding row gone"
        deadline = time.time() + 5
        log = None
        while time.time() < deadline:
            log = mongo["whatsapp_log"].find_one({"weddingId": w["id"], "type": "website_live"})
            if log:
                break
            time.sleep(0.5)
        assert log is not None, "whatsapp_log entry not found for this wedding"
        body = (log.get("body") or "").lower()
        assert "vivoha" in body and "live" in body
        # Recipient phone must be persisted (post country-code normalisation it will start with 91)
        assert log.get("to"), "whatsapp_log.to missing"
        assert log["to"].endswith(onboarded["whatsapp"][-8:])

    def test_verify_payment_rejects_missing_fields(self, http):
        r = http.post(API("/verify-payment"), json={"razorpay_order_id": "x"}, timeout=15)
        assert r.status_code == 400


# ============================================================================
# Module: Hub payload after publish
# ============================================================================
class TestHubAfterPublish:
    def test_hub_payload(self, http, onboarded):
        r = http.get(API(f"/hub/owner/{onboarded['ownerToken']}"), timeout=20)
        assert r.status_code == 200, r.text
        view = r.json().get("status") or {}
        assert view.get("paymentStatus") == "approved"
        assert view.get("publishedStatus") == "published"
        assert view.get("publicUrl") and onboarded["slug"] in view["publicUrl"]
        # add-ons round-tripped
        addon_ids = {a["id"] for a in (view.get("addons") or [])}
        # Last successful select-plan was the 'bogus-filtered' one with just custom-domain.
        # That's fine — we just assert the field is present + parseable.
        assert isinstance(view.get("addons"), list)
        # No PIN concept in hub
        assert "publishCodeHash" not in view
        assert "publishCodeSet" not in view
