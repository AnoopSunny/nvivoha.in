"""
Iteration 12 - Batch 2: WhatsApp + 4-digit publish code owner auth.

Tests:
  * POST /api/owner/set-code (success, validation, idempotency)
  * POST /api/owner/auth (success, wrong code -> 401 generic, normalisation, rate limit)
  * GET  /api/hub/owner/:tok (404 + valid payload shape)
  * Sanity: POST /api/onboard/select-plan returns 2999 + GET /api/status still works
"""

import os
import time
import uuid
import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'vivoha_db')

assert BASE_URL, "REACT_APP_BACKEND_URL is required"

PUBLISH_CODE = '2026'
WHATSAPP_10 = '9876501234'    # 10-digit Indian
WHATSAPP_E164 = '91' + WHATSAPP_10  # normalised


# ---------- Fixtures ---------------------------------------------------------

@pytest.fixture(scope="module")
def mongo():
    cli = MongoClient(MONGO_URL)
    db = cli[DB_NAME]
    yield db
    cli.close()


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture
def fresh_onboard(api, mongo):
    """Mints a fresh onboard session and returns (onboardToken, slug)."""
    suffix = uuid.uuid4().hex[:6]
    r = api.post(f"{BASE_URL}/api/onboard/start", json={
        "brideName": f"TESTBride{suffix}",
        "groomName": f"TESTGroom{suffix}",
        "email": f"test_{suffix}@example.com",
        "weddingDate": "2026-11-22",
        "template": "Moonveil",
    })
    assert r.status_code in (200, 201), f"onboard/start failed: {r.status_code} {r.text}"
    data = r.json()
    token = data.get("token") or data.get("onboardToken")
    slug = data.get("slug")
    assert token and slug
    yield {"token": token, "slug": slug, "suffix": suffix}
    # Teardown: mark deleted
    mongo.weddings.update_one({"onboardToken": token}, {"$set": {"deletedAt": "test-cleanup"}})


@pytest.fixture(autouse=True)
def purge_rate_limiter(mongo):
    """Wipe rate-limit collection before & after each test."""
    mongo.owner_auth_rl.delete_many({})
    yield
    mongo.owner_auth_rl.delete_many({})


# ---------- /owner/set-code --------------------------------------------------

class TestSetCode:
    def test_set_code_success_returns_owner_token(self, api, mongo, fresh_onboard):
        r = api.post(f"{BASE_URL}/api/owner/set-code", json={
            "onboardToken": fresh_onboard["token"],
            "whatsapp": WHATSAPP_10,
            "code": PUBLISH_CODE,
        })
        assert r.status_code == 200, r.text
        body = r.json()
        assert "ownerToken" in body and isinstance(body["ownerToken"], str)
        assert len(body["ownerToken"]) >= 24
        assert body["whatsappLast4"] == WHATSAPP_10[-4:]
        # Persistence: wedding doc has hash, ownerWhatsapp normalised to E.164, ownerToken
        w = mongo.weddings.find_one({"onboardToken": fresh_onboard["token"]})
        assert w["ownerWhatsapp"] == WHATSAPP_E164, f"expected normalised E.164 got {w['ownerWhatsapp']}"
        assert w.get("publishCodeHash") and w["publishCodeHash"] != PUBLISH_CODE  # hashed
        assert w["ownerToken"] == body["ownerToken"]

    def test_set_code_rejects_5_digit_code(self, api, fresh_onboard):
        r = api.post(f"{BASE_URL}/api/owner/set-code", json={
            "onboardToken": fresh_onboard["token"],
            "whatsapp": WHATSAPP_10,
            "code": "12345",
        })
        assert r.status_code == 400
        assert "4 digits" in r.json().get("error", "").lower() or "4 digit" in r.json().get("error", "").lower()

    def test_set_code_rejects_letters(self, api, fresh_onboard):
        r = api.post(f"{BASE_URL}/api/owner/set-code", json={
            "onboardToken": fresh_onboard["token"],
            "whatsapp": WHATSAPP_10,
            "code": "abcd",
        })
        assert r.status_code == 400

    def test_set_code_is_idempotent(self, api, fresh_onboard):
        """Second call with same onboardToken must NOT rotate ownerToken."""
        r1 = api.post(f"{BASE_URL}/api/owner/set-code", json={
            "onboardToken": fresh_onboard["token"],
            "whatsapp": WHATSAPP_10,
            "code": PUBLISH_CODE,
        })
        assert r1.status_code == 200
        tok1 = r1.json()["ownerToken"]

        r2 = api.post(f"{BASE_URL}/api/owner/set-code", json={
            "onboardToken": fresh_onboard["token"],
            "whatsapp": WHATSAPP_10,
            "code": PUBLISH_CODE,
        })
        assert r2.status_code == 200
        tok2 = r2.json()["ownerToken"]
        assert tok1 == tok2, "ownerToken rotated on retry — should be idempotent"


# ---------- /owner/auth ------------------------------------------------------

class TestOwnerAuth:
    def _seed(self, api, fresh_onboard):
        r = api.post(f"{BASE_URL}/api/owner/set-code", json={
            "onboardToken": fresh_onboard["token"],
            "whatsapp": WHATSAPP_10,
            "code": PUBLISH_CODE,
        })
        assert r.status_code == 200
        return r.json()["ownerToken"]

    def test_auth_valid_returns_same_owner_token(self, api, fresh_onboard):
        expected_tok = self._seed(api, fresh_onboard)
        r = api.post(f"{BASE_URL}/api/owner/auth", json={
            "whatsapp": WHATSAPP_10, "code": PUBLISH_CODE,
        })
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["ownerToken"] == expected_tok
        assert body.get("brideName", "").startswith("TESTBride")

    def test_auth_works_with_e164_format(self, api, fresh_onboard):
        expected_tok = self._seed(api, fresh_onboard)
        r = api.post(f"{BASE_URL}/api/owner/auth", json={
            "whatsapp": WHATSAPP_E164, "code": PUBLISH_CODE,
        })
        assert r.status_code == 200, r.text
        assert r.json()["ownerToken"] == expected_tok

    def test_auth_wrong_code_generic_401(self, api, fresh_onboard):
        self._seed(api, fresh_onboard)
        r = api.post(f"{BASE_URL}/api/owner/auth", json={
            "whatsapp": WHATSAPP_10, "code": "0000",
        })
        assert r.status_code == 401
        msg = r.json().get("error", "")
        # Generic — must NOT leak whether the whatsapp exists vs code mismatch
        assert "could not find an invite" in msg.lower()

    def test_auth_unknown_whatsapp_same_generic_401(self, api):
        r = api.post(f"{BASE_URL}/api/owner/auth", json={
            "whatsapp": "9111100000", "code": "1234",
        })
        assert r.status_code == 401
        assert "could not find an invite" in r.json().get("error", "").lower()

    def test_auth_rate_limit_triggers_429(self, api, fresh_onboard, mongo):
        self._seed(api, fresh_onboard)
        wa = "9999900000"     # unknown whatsapp — every attempt will be bad
        for i in range(5):
            r = api.post(f"{BASE_URL}/api/owner/auth", json={"whatsapp": wa, "code": "0000"})
            assert r.status_code == 401, f"attempt {i} expected 401 got {r.status_code}"
        # 6th attempt should be 429
        r6 = api.post(f"{BASE_URL}/api/owner/auth", json={"whatsapp": wa, "code": "0000"})
        assert r6.status_code == 429, f"6th attempt expected 429 got {r6.status_code} body={r6.text}"
        assert "too many" in r6.json().get("error", "").lower()


# ---------- /hub/owner/:tok --------------------------------------------------

class TestOwnerHub:
    def test_invalid_token_returns_404(self, api):
        r = api.get(f"{BASE_URL}/api/hub/owner/{'x' * 32}")
        assert r.status_code == 404

    def test_valid_token_returns_status_payload(self, api, fresh_onboard):
        # seed
        r = api.post(f"{BASE_URL}/api/owner/set-code", json={
            "onboardToken": fresh_onboard["token"],
            "whatsapp": WHATSAPP_10, "code": PUBLISH_CODE,
        })
        tok = r.json()["ownerToken"]
        rh = api.get(f"{BASE_URL}/api/hub/owner/{tok}")
        assert rh.status_code == 200, rh.text
        body = rh.json()
        # response may be wrapped under "status" or returned flat — handle both
        view = body.get("status", body)
        for key in ("brideName", "groomName", "ownerToken",
                    "ownerWhatsappLast4", "paymentStatus", "previewUrl"):
            assert key in view, f"missing field {key} in hub payload: {list(view.keys())}"
        assert view["ownerToken"] == tok
        assert view["ownerWhatsappLast4"] == WHATSAPP_10[-4:]
        assert view["brideName"].startswith("TESTBride")
        # previewUrl should embed onboardToken for pre-payment weddings
        assert view["previewUrl"], "previewUrl should be populated pre-publish"
        assert "onboardToken=" in view["previewUrl"]


# ---------- Sanity: batch 1 endpoints ----------------------------------------

class TestBatch1Sanity:
    def test_select_plan_vivoha_returns_2999(self, api, fresh_onboard):
        r = api.post(
            f"{BASE_URL}/api/onboard/select-plan/{fresh_onboard['token']}",
            json={"plan": "vivoha"},
        )
        assert r.status_code == 200, f"select-plan failed: {r.status_code} {r.text}"
        body = r.json()
        # amount may be top-level or nested
        amount = body.get("amount") or body.get("planAmount") or body.get("paymentAmount")
        assert amount == 2999, f"expected 2999 got {amount} body={body}"

    def test_status_token_endpoint_still_works(self, api, mongo, fresh_onboard):
        # Stamp a statusToken so we can hit /api/status/:tok
        # statusToken pattern is [A-Z0-9]{6,16}
        status_tok = uuid.uuid4().hex[:12].upper()
        mongo.weddings.update_one(
            {"onboardToken": fresh_onboard["token"]},
            {"$set": {"statusToken": status_tok}},
        )
        r = api.get(f"{BASE_URL}/api/status/{status_tok}")
        assert r.status_code == 200, r.text
