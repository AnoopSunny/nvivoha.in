"""
Vivoha — Batch 1 UX overhaul backend sanity tests (iteration 11).
Scope:
  - /api/public/templates with reordered CATEGORIES
  - POST /api/leads (demo modal WhatsApp lead)
  - GET /api/onboard/wedding/:onboardToken
  - POST /api/onboard/select-plan/:onboardToken with plan='vivoha'
  - GET /api/status/:STATUS_TOKEN
  - /robots.txt disallow lines
  - POST /api/auth/login (admin sanity)
  - GET /api/public/previews (existing endpoint sanity)
"""
import os
import re
import uuid
import pytest
import requests
from pymongo import MongoClient

BASE_URL = "https://d4897f9e-7f0a-4f70-bbfc-e86c685300de.preview.emergentagent.com"
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "vivoha_db")
ADMIN_EMAIL = "admin@vivoha.com"
ADMIN_PASSWORD = "Vivoha@Admin2026"

EXPECTED_CATEGORY_ORDER = ["all", "hindu", "christian", "muslim", "contemporary", "destination", "south-indian"]

# ----- shared session -----
@pytest.fixture(scope="session")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess

@pytest.fixture(scope="session")
def db():
    return MongoClient(MONGO_URL)[DB_NAME]

# ----- 1) public/templates returns CATEGORIES in new order -----
def test_public_templates_returns_reordered_categories(s):
    r = s.get(f"{BASE_URL}/api/public/templates")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:200]}"
    data = r.json()
    cats = data.get("categories") or data.get("CATEGORIES") or []
    assert isinstance(cats, list) and len(cats) > 0, "categories list missing"
    ids = [c.get("id") for c in cats]
    assert ids == EXPECTED_CATEGORY_ORDER, f"Category order wrong: {ids}"
    # templates list should also be present
    tpls = data.get("templates") or data.get("TEMPLATES") or []
    assert isinstance(tpls, list) and len(tpls) > 0, "templates list missing"

# ----- 2) /api/leads accepts WhatsApp demo-builder payload -----
def test_leads_post_demo_builder(s, db):
    payload = {
        "name": "TEST WhatsApp Lead",
        "phone": "+919900099000",
        "email": f"TEST_demo_{uuid.uuid4().hex[:8]}@example.com",
        "weddingDate": "2026-12-12",
        "templateInterest": "Moonveil",
        "message": "Interested in the demo builder",
        "source": "demo-builder",
    }
    r = s.post(f"{BASE_URL}/api/leads", json=payload)
    assert r.status_code in (200, 201), f"Expected 200/201, got {r.status_code}: {r.text[:300]}"
    body = r.json()
    # Verify persistence — find by email
    lead = db.leads.find_one({"email": payload["email"].lower()})
    assert lead is not None, "Lead not persisted"
    assert lead.get("source") == "demo-builder"
    assert lead.get("phone") == payload["phone"]
    # cleanup
    db.leads.delete_one({"email": payload["email"].lower()})

# ----- 3+4) onboard/wedding/:tok and select-plan with plan='vivoha' -----
@pytest.fixture(scope="session")
def onboard_token(s):
    # Mint a fresh onboard session
    payload = {
        "brideName": "TestBride",
        "groomName": "TestGroom",
        "email": f"TEST_onb_{uuid.uuid4().hex[:8]}@example.com",
        "weddingDate": "2026-11-11",
        "template": "Moonveil",
    }
    r = s.post(f"{BASE_URL}/api/onboard/start", json=payload)
    assert r.status_code in (200, 201), f"onboard/start failed: {r.status_code} {r.text[:300]}"
    tok = r.json().get("token")
    assert tok and re.match(r"^[a-f0-9]{16,96}$", tok), f"bad onboard token: {tok}"
    return tok

def test_onboard_wedding_get(s, onboard_token):
    r = s.get(f"{BASE_URL}/api/onboard/wedding/{onboard_token}")
    assert r.status_code == 200, f"GET wedding failed: {r.status_code} {r.text[:300]}"
    data = r.json()
    w = data.get("wedding")
    assert w and w.get("brideName") == "TestBride"
    assert w.get("status") in ("draft", "preview", "published")

def test_onboard_select_plan_vivoha(s, db, onboard_token):
    r = s.post(f"{BASE_URL}/api/onboard/select-plan/{onboard_token}",
               json={"plan": "vivoha"})
    assert r.status_code == 200, f"select-plan failed: {r.status_code} {r.text[:300]}"
    body = r.json()
    assert body.get("plan") == "vivoha", f"plan not set to vivoha: {body}"
    # Verify persistence
    w = db.weddings.find_one({"onboardToken": onboard_token})
    assert w is not None
    assert w.get("plan") == "vivoha", f"plan persisted as {w.get('plan')}"

# ----- 5) /api/status/:STATUS_TOKEN returns full payload -----
@pytest.fixture(scope="session")
def status_token(db, onboard_token):
    # Seed a statusToken on the existing test wedding
    tok = "T" + "".join([c for c in uuid.uuid4().hex.upper() if c.isalnum()])[:7]
    # tok pattern must match ^[A-Z0-9]{6,16}$
    tok = re.sub(r"[^A-Z0-9]", "X", tok)[:8]
    db.weddings.update_one(
        {"onboardToken": onboard_token},
        {"$set": {
            "statusToken": tok,
            "paymentStatus": "verification_pending",
            "paymentAttempts": [{
                "id": str(uuid.uuid4()),
                "status": "verification_pending",
                "txnRef": "TEST123",
            }],
        }},
    )
    return tok

def test_status_get(s, status_token):
    r = s.get(f"{BASE_URL}/api/status/{status_token}")
    assert r.status_code == 200, f"status GET failed: {r.status_code} {r.text[:300]}"
    data = r.json()
    # Backend wraps payload under data.status
    payload_obj = data.get("status") or data.get("wedding") or data
    assert "paymentStatus" in payload_obj, f"missing paymentStatus in payload: {list(payload_obj.keys())}"
    payment_status = payload_obj.get("paymentStatus")
    assert payment_status == "verification_pending", f"paymentStatus unexpected: {payment_status}"
    # The hub timeline relies on paymentAttempts
    assert "paymentAttempts" in payload_obj or "paymentStatus" in payload_obj

# ----- 6) robots.txt has new Disallow lines -----
def test_robots_disallow_lines(s):
    r = s.get(f"{BASE_URL}/robots.txt")
    assert r.status_code == 200, f"robots.txt status {r.status_code}"
    txt = r.text
    for path in ["/preview/", "/hub/", "/status/", "/onboard/", "/publish/", "/payment/", "/demo/"]:
        assert f"Disallow: {path}" in txt, f"Missing Disallow: {path}"

# ----- 7) admin login sanity -----
def test_admin_login(s):
    r = s.post(f"{BASE_URL}/api/auth/login",
               json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text[:300]}"
    body = r.json()
    assert body.get("token"), "no token returned"
    assert (body.get("user") or {}).get("email") == ADMIN_EMAIL

# ----- 8) public/previews still works -----
def test_public_previews_still_200(s):
    r = s.get(f"{BASE_URL}/api/public/previews")
    assert r.status_code == 200, f"previews failed: {r.status_code} {r.text[:300]}"
    body = r.json()
    # Should be a list or dict containing previews
    assert isinstance(body, (list, dict))

# ----- teardown: cleanup test wedding -----
def test_zz_cleanup(db, onboard_token):
    db.weddings.delete_many({"onboardToken": onboard_token})
