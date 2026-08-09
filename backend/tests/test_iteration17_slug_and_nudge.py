"""
Iteration 17 — slug availability + preview-nudge regression suite.

Covers the new endpoints / fields added in iteration 17:
  * GET  /api/check-url?slug=...&exclude=...
  * POST /api/send-preview-nudge          (idempotent, mock WhatsApp)
  * PUT  /api/onboard/wedding/<token>     with websiteSlug
  * /api/verify-payment                   locks slugStatus=published + slugLockedAt
"""

import os
import time
import uuid
import pytest
import requests
from pymongo import MongoClient

# ---- Config ----------------------------------------------------------------
BASE_URL = (
    os.environ.get("REACT_APP_BACKEND_URL")
    or os.environ.get("NEXT_PUBLIC_BASE_URL")
    or "https://a202cc14-ba1e-4a9d-af9f-e487be5c34af.preview.emergentagent.com"
).rstrip("/")
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "vivoha")

API = lambda path: f"{BASE_URL}/api{path}"  # noqa: E731


# ---- Fixtures --------------------------------------------------------------
@pytest.fixture(scope="module")
def http():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def mongo():
    cli = MongoClient(MONGO_URL, serverSelectionTimeoutMS=4000)
    return cli[DB_NAME]


def _onboard_fresh(http, label="A"):
    """Helper: spin up a brand-new draft wedding and return dict with token+slug+whatsapp.

    Bride/Groom names are intentionally short so the generated slug fits inside
    the 3-30 char wedding-URL regex (`^[a-z0-9]([a-z0-9-]{1,28})[a-z0-9]$`).
    """
    unique = uuid.uuid4().hex[:4]
    payload = {
        "brideName": f"Test{label}{unique}",
        "groomName": f"Couple{unique}",
        "email": f"test_{uuid.uuid4().hex[:8]}@vivohatest.in",
        "whatsapp": f"99{int(time.time() * 1000) % 100000000:08d}",
        "weddingDate": "2026-12-15",
        "template": "Moonveil",
    }
    r = http.post(API("/onboard/start"), json=payload, timeout=30)
    assert r.status_code in (200, 201), f"onboard/start failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and "slug" in data
    return {**payload, **data}


@pytest.fixture(scope="module")
def wedding_a(http):
    return _onboard_fresh(http, "A")


@pytest.fixture(scope="module")
def wedding_b(http):
    # second, independent draft used to test "taken by other" + cross-tenancy
    return _onboard_fresh(http, "B")


# ============================================================================
# Module: GET /api/check-url — slug availability
# ============================================================================
class TestCheckUrl:
    def test_brand_new_slug_available(self, http):
        slug = f"brand-new-couple-{uuid.uuid4().hex[:6]}"
        r = http.get(API(f"/check-url?slug={slug}"), timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data == {"available": True}, data

    def test_reserved_slug_blocked(self, http):
        r = http.get(API("/check-url?slug=admin"), timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["available"] is False
        assert data["reason"] == "reserved"
        assert isinstance(data["suggestions"], list) and len(data["suggestions"]) >= 1

    def test_too_short_slug_invalid(self, http):
        r = http.get(API("/check-url?slug=ab"), timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["available"] is False
        assert data["reason"] == "invalid"

    def test_existing_slug_taken(self, http, wedding_a):
        # Another couple's slug should appear taken
        r = http.get(API(f"/check-url?slug={wedding_a['slug']}"), timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["available"] is False
        assert data["reason"] == "taken"
        assert isinstance(data["suggestions"], list)
        assert len(data["suggestions"]) == 3, data["suggestions"]

    def test_own_slug_not_counted_taken(self, http, wedding_a):
        # When the owner passes exclude=<their onboardToken>, their own slug
        # must still report as available so they can re-confirm it.
        r = http.get(
            API(f"/check-url?slug={wedding_a['slug']}&exclude={wedding_a['token']}"),
            timeout=15,
        )
        assert r.status_code == 200, r.text
        assert r.json() == {"available": True}

    def test_uppercase_input_normalised(self, http):
        # Reserved check happens after lowercasing
        r = http.get(API("/check-url?slug=ADMIN"), timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["available"] is False
        assert data["reason"] == "reserved"


# ============================================================================
# Module: PUT /api/onboard/wedding/<token> — websiteSlug validation
# ============================================================================
class TestWebsiteSlugUpdate:
    def test_put_valid_slug_saves_and_reserves(self, http, wedding_b):
        new_slug = f"aanya-veer-{uuid.uuid4().hex[:6]}"
        r = http.put(
            API(f"/onboard/wedding/{wedding_b['token']}"),
            json={"websiteSlug": new_slug},
            timeout=20,
        )
        assert r.status_code == 200, r.text

        # Subsequent GET reflects websiteSlug + slugStatus
        g = http.get(API(f"/onboard/wedding/{wedding_b['token']}"), timeout=15)
        assert g.status_code == 200
        w = g.json().get("wedding") or {}
        assert w.get("websiteSlug") == new_slug, w
        assert w.get("slugStatus") == "reserved", w
        wedding_b["websiteSlug"] = new_slug

    def test_put_reserved_slug_blocked_409(self, http, wedding_b):
        r = http.put(
            API(f"/onboard/wedding/{wedding_b['token']}"),
            json={"websiteSlug": "ADMIN"},
            timeout=15,
        )
        assert r.status_code == 409, f"expected 409, got {r.status_code} {r.text}"
        # error text contains "reserved"
        assert "reserved" in r.text.lower()

    def test_put_invalid_chars_400(self, http, wedding_b):
        # "ab" — too short for the regex (needs 3+ with start/end alnum)
        r = http.put(
            API(f"/onboard/wedding/{wedding_b['token']}"),
            json={"websiteSlug": "ab"},
            timeout=15,
        )
        assert r.status_code == 400, f"expected 400, got {r.status_code} {r.text}"
        assert "invalid characters" in r.text.lower() or "lowercase" in r.text.lower()

    def test_put_taken_by_other_409(self, http, wedding_a, wedding_b):
        # wedding_a's slug must not be steal-able by wedding_b
        r = http.put(
            API(f"/onboard/wedding/{wedding_b['token']}"),
            json={"websiteSlug": wedding_a["slug"]},
            timeout=15,
        )
        assert r.status_code == 409, f"expected 409, got {r.status_code} {r.text}"
        assert "taken" in r.text.lower()


# ============================================================================
# Module: POST /api/send-preview-nudge — idempotent mock WhatsApp
# ============================================================================
class TestSendPreviewNudge:
    def test_nudge_fires_and_logs(self, http, mongo):
        w = _onboard_fresh(http, "N1")
        r = http.post(
            API("/send-preview-nudge"),
            json={"onboardToken": w["token"]},
            timeout=20,
        )
        assert r.status_code == 200, r.text
        assert r.json() == {"sent": True}

        # whatsapp_log row inserted with correct type + body content
        row = mongo["whatsapp_log"].find_one(
            {"weddingId": None, "type": "preview_nudge"}  # placeholder; real lookup below
        )
        # Look up via wedding id
        ww = mongo["weddings"].find_one({"onboardToken": w["token"]})
        assert ww
        row = mongo["whatsapp_log"].find_one(
            {"weddingId": ww["id"], "type": "preview_nudge"}
        )
        assert row is not None, "whatsapp_log row not written for preview_nudge"
        body = (row.get("body") or "").lower()
        assert "your vivoha website is ready" in body, body
        # Flag persisted
        assert ww.get("previewNudgeSent") is True
        assert ww.get("previewNudgeSentAt") is not None

    def test_nudge_idempotent_second_call_skipped(self, http):
        w = _onboard_fresh(http, "N2")
        r1 = http.post(API("/send-preview-nudge"), json={"onboardToken": w["token"]}, timeout=15)
        assert r1.status_code == 200 and r1.json() == {"sent": True}, r1.text

        r2 = http.post(API("/send-preview-nudge"), json={"onboardToken": w["token"]}, timeout=15)
        assert r2.status_code == 200, r2.text
        data = r2.json()
        assert data.get("skipped") is True
        assert data.get("reason") == "already_sent"

    def test_nudge_skipped_for_published(self, http, mongo):
        """Run the full happy path then call nudge — must return already_published."""
        w = _onboard_fresh(http, "P")
        # register owner
        rr = http.post(
            API("/owner/register"),
            json={"onboardToken": w["token"], "whatsapp": w["whatsapp"]},
            timeout=15,
        )
        assert rr.status_code == 200, rr.text

        # pick plan
        sp = http.post(
            API(f"/onboard/select-plan/{w['token']}"),
            json={"plan": "vivoha", "addons": []},
            timeout=15,
        )
        assert sp.status_code == 200, sp.text

        # create order
        co = http.post(
            API("/create-order"),
            json={
                "amount": 2999,
                "currency": "INR",
                "receipt": f"viv-{w['token'][:10]}",
                "notes": {"onboardToken": w["token"]},
            },
            timeout=20,
        )
        assert co.status_code == 200, co.text
        order_id = co.json()["orderId"]

        # verify-payment (mock signature accepted)
        vp = http.post(
            API("/verify-payment"),
            json={
                "razorpay_order_id": order_id,
                "razorpay_payment_id": f"pay_mock_{uuid.uuid4().hex[:14]}",
                "razorpay_signature": "deadbeef" * 8,
                "onboardToken": w["token"],
            },
            timeout=30,
        )
        assert vp.status_code == 200, vp.text
        assert vp.json().get("success") is True

        # Wedding must now have slugStatus=published + slugLockedAt
        ww = mongo["weddings"].find_one({"onboardToken": w["token"]})
        assert ww is not None
        assert ww.get("status") == "published"
        assert ww.get("slugStatus") == "published", ww.get("slugStatus")
        assert ww.get("slugLockedAt") is not None, "slugLockedAt missing after payment"

        # Now nudge must skip because already published
        nd = http.post(API("/send-preview-nudge"), json={"onboardToken": w["token"]}, timeout=15)
        assert nd.status_code == 200, nd.text
        data = nd.json()
        assert data.get("skipped") is True
        assert data.get("reason") == "already_published"

    def test_nudge_missing_token_400(self, http):
        r = http.post(API("/send-preview-nudge"), json={}, timeout=10)
        assert r.status_code == 400

    def test_nudge_unknown_token_404(self, http):
        r = http.post(
            API("/send-preview-nudge"),
            json={"onboardToken": "no-such-token-" + uuid.uuid4().hex},
            timeout=10,
        )
        assert r.status_code == 404
