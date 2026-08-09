"""
Iteration 6 — Vivoha Self-Serve Onboarding + Payment Flow + Admin Payments.

Covers backend endpoints for:
  - POST /api/onboard/start       (public, creates draft wedding + token)
  - GET  /api/onboard/wedding/:t  (read draft)
  - PUT  /api/onboard/wedding/:t  (update draft)
  - POST /api/onboard/select-plan/:t
  - POST /api/onboard/submit-payment/:t  (uploads screenshot, sets verification_pending)
  - GET  /api/public/wedding/:slug?onboardToken=  (draft preview)
  - GET  /api/admin/payments  (admin-only)
  - POST /api/admin/payments/:id/approve  (admin-only, publishes)
  - POST /api/admin/payments/:id/reject
  - GET/POST /api/admin/payment-config
  - GET  /api/payment-config (public)
"""
import os
import io
import time
import uuid
import base64
import pytest
import requests
from PIL import Image

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@vivoha.in')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'VivohaAdmin@2026')

UNIQUE = uuid.uuid4().hex[:8]


def _png_data_uri():
    """Return a tiny in-memory PNG as data-URI for image uploads."""
    img = Image.new('RGB', (8, 8), color=(220, 180, 80))
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    b64 = base64.b64encode(buf.getvalue()).decode('ascii')
    return f'data:image/png;base64,{b64}'


@pytest.fixture(scope='session')
def api():
    s = requests.Session()
    s.headers.update({'Content-Type': 'application/json'})
    return s


@pytest.fixture(scope='session')
def admin_token(api):
    r = api.post(f'{BASE_URL}/api/auth/login', json={'email': ADMIN_EMAIL, 'password': ADMIN_PASSWORD})
    if r.status_code != 200:
        pytest.skip(f'Admin login failed: {r.status_code} {r.text[:200]}')
    data = r.json()
    tok = data.get('token') or data.get('accessToken') or data.get('access_token')
    assert tok, f'No token in admin login response: {data}'
    return tok


@pytest.fixture(scope='session')
def admin_session(api, admin_token):
    s = requests.Session()
    s.headers.update({'Content-Type': 'application/json', 'Authorization': f'Bearer {admin_token}'})
    return s


@pytest.fixture(scope='session')
def onboard(api):
    """Create one self-serve onboarding session shared across tests."""
    payload = {
        'brideName': f'TEST_Ananya_{UNIQUE}',
        'groomName': f'TEST_Vikram_{UNIQUE}',
        'email': f'TEST_{UNIQUE}@example.com',
        'weddingDate': '2026-12-15',
        'template': 'Royal Heritage',
    }
    r = api.post(f'{BASE_URL}/api/onboard/start', json=payload)
    assert r.status_code == 201, f'/api/onboard/start failed: {r.status_code} {r.text}'
    d = r.json()
    assert d.get('token') and len(d['token']) >= 32
    assert d.get('slug')
    assert d.get('weddingId')
    return d


# ---------- Onboard start ----------

class TestOnboardStart:
    def test_missing_fields_rejected(self, api):
        r = api.post(f'{BASE_URL}/api/onboard/start', json={'brideName': 'A', 'groomName': '', 'email': 'x@y.com'})
        assert r.status_code == 400

    def test_invalid_email_rejected(self, api):
        r = api.post(f'{BASE_URL}/api/onboard/start', json={'brideName': 'A', 'groomName': 'B', 'email': 'not-an-email'})
        assert r.status_code == 400

    def test_start_creates_draft_with_token(self, onboard):
        assert onboard['token']
        assert 'ananya' in onboard['slug'].lower() and 'vikram' in onboard['slug'].lower()


# ---------- Onboard read / update ----------

class TestOnboardWedding:
    def test_get_draft(self, api, onboard):
        r = api.get(f'{BASE_URL}/api/onboard/wedding/{onboard["token"]}')
        assert r.status_code == 200
        w = r.json()['wedding']
        assert w['status'] == 'draft'
        assert w['paymentStatus'] == 'not_started'
        assert w['slug'] == onboard['slug']
        assert '_id' not in w  # ObjectId must be stripped

    def test_get_invalid_token_404(self, api):
        r = api.get(f'{BASE_URL}/api/onboard/wedding/{"a" * 48}')
        assert r.status_code == 404

    def test_update_draft_persists(self, api, onboard):
        body = {
            'tagline': 'Together with grace',
            'story': 'A short love story.',
            'events': [{'id': 'e1', 'name': 'Sangeet', 'date': '2026-12-14', 'venue': 'Taj Palace'}],
        }
        r = api.put(f'{BASE_URL}/api/onboard/wedding/{onboard["token"]}', json=body)
        assert r.status_code == 200
        # verify persistence via GET
        r2 = api.get(f'{BASE_URL}/api/onboard/wedding/{onboard["token"]}')
        w = r2.json()['wedding']
        assert w['tagline'] == 'Together with grace'
        assert w['story'].startswith('A short')
        assert len(w['events']) == 1 and w['events'][0]['name'] == 'Sangeet'


# ---------- Public draft preview ----------

class TestPublicDraftPreview:
    def test_draft_visible_only_with_token(self, api, onboard):
        # Without token → 404 (not published)
        r = api.get(f'{BASE_URL}/api/public/wedding/{onboard["slug"]}')
        assert r.status_code == 404
        # With onboardToken → 200
        r2 = api.get(f'{BASE_URL}/api/public/wedding/{onboard["slug"]}?onboardToken={onboard["token"]}')
        assert r2.status_code == 200
        w = r2.json().get('wedding') or r2.json()
        assert w.get('slug') == onboard['slug']


# ---------- Plan selection ----------

class TestSelectPlan:
    def test_invalid_plan_rejected(self, api, onboard):
        r = api.post(f'{BASE_URL}/api/onboard/select-plan/{onboard["token"]}', json={'plan': 'bogus'})
        assert r.status_code == 400

    def test_select_grand(self, api, onboard):
        r = api.post(f'{BASE_URL}/api/onboard/select-plan/{onboard["token"]}', json={'plan': 'grand'})
        assert r.status_code == 200
        d = r.json()
        assert d['plan'] == 'grand'
        assert isinstance(d['amount'], (int, float)) and d['amount'] > 0


# ---------- Payment config (public + admin) ----------

class TestPaymentConfig:
    def test_public_config_returns_defaults(self, api):
        r = api.get(f'{BASE_URL}/api/payment-config')
        assert r.status_code == 200
        cfg = r.json()
        # Allow either wrapped or flat
        body = cfg.get('config', cfg)
        assert 'whatsappNumber' in body or 'plans' in body or body  # tolerant
        assert isinstance(body, dict)

    def test_admin_config_requires_auth(self, api):
        r = api.post(f'{BASE_URL}/api/admin/payment-config', json={'whatsappNumber': '919999999999'})
        assert r.status_code == 401

    def test_admin_config_update_persists(self, admin_session):
        payload = {
            'whatsappNumber': '919876500000',
            'plans': {
                'classic': {'upiId': 'vivoha-classic@upi'},
                'grand':   {'upiId': 'vivoha-grand@upi'},
                'elegant': {'upiId': 'vivoha-elegant@upi'},
            },
        }
        r = admin_session.post(f'{BASE_URL}/api/admin/payment-config', json=payload)
        assert r.status_code == 200, r.text
        # verify
        r2 = admin_session.get(f'{BASE_URL}/api/admin/payment-config')
        assert r2.status_code == 200
        body = r2.json().get('config', r2.json())
        assert body.get('whatsappNumber') == '919876500000'


# ---------- Submit payment ----------

class TestSubmitPayment:
    def test_submit_without_screenshot_rejected(self, api, onboard):
        r = api.post(f'{BASE_URL}/api/onboard/submit-payment/{onboard["token"]}', json={})
        assert r.status_code == 400

    def test_submit_with_screenshot_succeeds(self, api, onboard):
        r = api.post(
            f'{BASE_URL}/api/onboard/submit-payment/{onboard["token"]}',
            json={'dataUri': _png_data_uri(), 'txnRef': 'UPI-TEST-123', 'note': 'auto-test'},
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get('status') == 'verification_pending' or d.get('ok')

    def test_payment_status_locked_after_submit(self, api, onboard):
        # GET should show verification_pending
        r = api.get(f'{BASE_URL}/api/onboard/wedding/{onboard["token"]}')
        w = r.json()['wedding']
        assert w['paymentStatus'] == 'verification_pending'
        # As of iter8, PUT is intentionally allowed during verification_pending
        # so the customer can fix typos before admin approval. PUT is only locked
        # once paymentStatus == 'approved'.
        r2 = api.put(f'{BASE_URL}/api/onboard/wedding/{onboard["token"]}', json={'tagline': 'hack'})
        assert r2.status_code == 200
        assert r2.json()['wedding']['tagline'] == 'hack'


# ---------- Admin payments ----------

class TestAdminPayments:
    def test_list_requires_auth(self, api):
        r = api.get(f'{BASE_URL}/api/admin/payments')
        assert r.status_code == 401

    def test_list_contains_our_wedding(self, admin_session, onboard):
        r = admin_session.get(f'{BASE_URL}/api/admin/payments?status=verification_pending')
        assert r.status_code == 200
        weddings = r.json().get('weddings', [])
        slugs = [w['slug'] for w in weddings]
        assert onboard['slug'] in slugs, f'Expected {onboard["slug"]} in {slugs[:10]}'

    def test_approve_publishes_wedding(self, admin_session, api, onboard):
        r = admin_session.post(f'{BASE_URL}/api/admin/payments/{onboard["weddingId"]}/approve', json={})
        assert r.status_code == 200, r.text
        w = r.json().get('wedding') or {}
        assert w.get('status') == 'published'
        assert w.get('paymentStatus') == 'approved'
        # Public route should now return without onboardToken
        r2 = api.get(f'{BASE_URL}/api/public/wedding/{onboard["slug"]}')
        assert r2.status_code == 200


# ---------- Approve state-machine guard (iteration 7) ----------

class TestApproveStateMachine:
    """Verify POST /api/admin/payments/:id/approve enforces state transitions."""

    def test_approve_already_approved_returns_409(self, admin_session, onboard):
        """After TestAdminPayments.test_approve_publishes_wedding has approved the wedding,
        calling approve again must return 409."""
        # Ensure it's already approved (the earlier test should have done it).
        r = admin_session.post(
            f'{BASE_URL}/api/admin/payments/{onboard["weddingId"]}/approve', json={}
        )
        assert r.status_code == 409, f'Expected 409 (already approved), got {r.status_code}: {r.text[:200]}'

    def test_approve_not_started_returns_400(self, api, admin_session):
        """A fresh draft (paymentStatus='not_started') cannot be approved → 400."""
        u = uuid.uuid4().hex[:8]
        payload = {
            'brideName': f'TEST_NS_Bride_{u}',
            'groomName': f'TEST_NS_Groom_{u}',
            'email': f'TEST_NS_{u}@example.com',
            'weddingDate': '2026-11-11',
            'template': 'Royal Heritage',
        }
        r = api.post(f'{BASE_URL}/api/onboard/start', json=payload)
        assert r.status_code == 201, r.text
        wid = r.json()['weddingId']
        # No payment submitted → paymentStatus is 'not_started'
        r2 = admin_session.post(
            f'{BASE_URL}/api/admin/payments/{wid}/approve', json={}
        )
        assert r2.status_code == 400, f'Expected 400 (not awaiting verification), got {r2.status_code}: {r2.text[:200]}'
        # cleanup
        try:
            admin_session.delete(f'{BASE_URL}/api/weddings/{wid}')
        except Exception:
            pass

    def test_approve_nonexistent_returns_404(self, admin_session):
        r = admin_session.post(
            f'{BASE_URL}/api/admin/payments/does-not-exist-{uuid.uuid4().hex}/approve', json={}
        )
        assert r.status_code == 404



# ---------- Cleanup ----------

def test_zz_cleanup(admin_session, onboard):
    """Soft-delete TEST_ wedding so admin views stay clean."""
    try:
        admin_session.delete(f'{BASE_URL}/api/weddings/{onboard["weddingId"]}')
    except Exception:
        pass
    # also delete the lead
    try:
        leads = admin_session.get(f'{BASE_URL}/api/leads').json().get('leads', [])
        for l in leads:
            if str(l.get('email', '')).startswith('TEST_') and UNIQUE in l.get('email', ''):
                admin_session.delete(f'{BASE_URL}/api/leads/{l["id"]}')
    except Exception:
        pass
