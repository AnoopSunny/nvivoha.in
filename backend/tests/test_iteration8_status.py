"""
Iteration 8 — Vivoha trust/protection slice.

Covers backend endpoints for:
  - POST /api/onboard/upload/:token        (preview upload 5-cap, 429 on 6th, image compression tag)
  - PUT  /api/onboard/wedding/:token       (invitePassword bcrypt + no hash leak, per-event mapsLink)
  - POST /api/onboard/submit-payment/:t    (statusToken issued + paymentAttempts pushed)
  - GET  /api/status/:statusToken          (public project summary)
  - POST /api/status/:statusToken/retry-payment (public retry; 409 when approved)
  - POST /api/admin/payments/:id/reject    (latest attempt status='rejected' + reason)
  - POST /api/admin/payments/:id/request-changes (requires message + adminMessages + email_log)
  - POST /api/admin/payments/:id/note      (adminMessages note + email_log)
  - POST /api/admin/payments/:id/approve   (latest attempt status='approved' + website_published email_log)
  - email_log collection records all status-changing events
"""
import os
import io
import re
import uuid
import base64
import string
import pytest
import requests
from PIL import Image
from pymongo import MongoClient

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@vivoha.in')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'VivohaAdmin@2026')
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'vivoha')

STATUS_ALPHABET = set(string.ascii_uppercase + string.digits) - set('0O1I')
UNIQUE = uuid.uuid4().hex[:8]


def _png_uri(color=(220, 180, 80), size=(16, 16)):
    img = Image.new('RGB', size, color=color)
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    return f'data:image/png;base64,{base64.b64encode(buf.getvalue()).decode("ascii")}'


# ---------- fixtures ----------

@pytest.fixture(scope='session')
def api():
    s = requests.Session()
    s.headers.update({'Content-Type': 'application/json'})
    return s


@pytest.fixture(scope='session')
def db():
    c = MongoClient(MONGO_URL)
    return c[DB_NAME]


@pytest.fixture(scope='session')
def admin(api):
    r = api.post(f'{BASE_URL}/api/auth/login', json={'email': ADMIN_EMAIL, 'password': ADMIN_PASSWORD})
    if r.status_code != 200:
        pytest.skip(f'admin login failed: {r.status_code}')
    s = requests.Session()
    s.headers.update({'Content-Type': 'application/json', 'Authorization': f'Bearer {r.json()["token"]}'})
    return s


def _start(api, suffix):
    u = uuid.uuid4().hex[:8]
    payload = {
        'brideName': f'TEST_Bride_{suffix}_{u}',
        'groomName': f'TEST_Groom_{suffix}_{u}',
        'email': f'TEST_{suffix}_{u}@example.com',
        'weddingDate': '2026-12-20',
        'template': 'Royal Heritage',
    }
    r = api.post(f'{BASE_URL}/api/onboard/start', json=payload)
    assert r.status_code == 201, r.text
    return r.json()


@pytest.fixture
def fresh(api):
    s = _start(api, 'st')
    yield s
    # cleanup attempted via admin in test_zz_cleanup


# ---------- upload limit ----------

class TestUploadLimit:
    def test_first_5_uploads_succeed_then_6th_returns_429(self, api, fresh):
        tok = fresh['token']
        for i in range(5):
            r = api.post(f'{BASE_URL}/api/onboard/upload/{tok}', json={'dataUri': _png_uri()})
            assert r.status_code == 200, f'upload {i+1} failed: {r.status_code} {r.text}'
            data = r.json()
            assert 'url' in data and isinstance(data['url'], str)
            # attach to wedding gallery so server-side count progresses
            cur = api.get(f'{BASE_URL}/api/onboard/wedding/{tok}').json()['wedding']
            new_gallery = list(cur.get('gallery') or [])
            new_gallery.append({'url': data['url'], 'publicId': data.get('publicId')})
            api.put(f'{BASE_URL}/api/onboard/wedding/{tok}', json={'gallery': new_gallery})
        # 6th upload pre-payment must be 429
        r6 = api.post(f'{BASE_URL}/api/onboard/upload/{tok}', json={'dataUri': _png_uri()})
        assert r6.status_code == 429, f'expected 429, got {r6.status_code}: {r6.text}'

    def test_upload_invalid_payload_400(self, api, fresh):
        r = api.post(f'{BASE_URL}/api/onboard/upload/{fresh["token"]}', json={'dataUri': 'not-an-image'})
        assert r.status_code == 400


# ---------- invitePassword & per-event mapsLink ----------

class TestInvitePasswordAndMaps:
    def test_password_protect_hashed_and_not_returned(self, api, fresh, db):
        tok = fresh['token']
        body = {'passwordProtect': True, 'invitePassword': 'secret123', 'invitePasswordPrompt': 'Family only'}
        r = api.put(f'{BASE_URL}/api/onboard/wedding/{tok}', json=body)
        assert r.status_code == 200, r.text
        w = r.json()['wedding']
        assert w.get('passwordProtected') is True
        # raw key must NOT be in response
        assert 'invitePassword' not in w, f'invitePassword leaked: {w.get("invitePassword")}'
        # DB-side: hash starts with bcrypt $2 prefix
        raw = db.weddings.find_one({'onboardToken': tok})
        ip = raw.get('invitePassword') or {}
        assert isinstance(ip.get('passwordHash'), str) and ip['passwordHash'].startswith('$2'), 'expected bcrypt hash'
        assert ip['passwordHash'] != 'secret123'

    def test_top_level_mapsLink_not_persisted(self, api, fresh):
        tok = fresh['token']
        api.put(f'{BASE_URL}/api/onboard/wedding/{tok}', json={'mapsLink': 'https://maps.example.com/top'})
        w = api.get(f'{BASE_URL}/api/onboard/wedding/{tok}').json()['wedding']
        assert 'mapsLink' not in w or not w.get('mapsLink'), f'top-level mapsLink leaked: {w.get("mapsLink")}'

    def test_per_event_mapsLink_persisted(self, api, fresh):
        tok = fresh['token']
        events = [{'id': 'e1', 'name': 'Sangeet', 'date': '2026-12-19', 'venue': 'Taj',
                   'mapsLink': 'https://maps.example.com/sangeet'}]
        r = api.put(f'{BASE_URL}/api/onboard/wedding/{tok}', json={'events': events})
        assert r.status_code == 200
        w = api.get(f'{BASE_URL}/api/onboard/wedding/{tok}').json()['wedding']
        assert w['events'][0]['mapsLink'] == 'https://maps.example.com/sangeet'


# ---------- submit-payment + statusToken + status page ----------

@pytest.fixture(scope='session')
def paid(api):
    s = _start(api, 'pay')
    # plan
    r = api.post(f'{BASE_URL}/api/onboard/select-plan/{s["token"]}', json={'plan': 'classic'})
    assert r.status_code == 200, r.text
    r = api.post(f'{BASE_URL}/api/onboard/submit-payment/{s["token"]}',
                 json={'dataUri': _png_uri(), 'txnRef': 'UPI-TEST-001'})
    assert r.status_code == 200, r.text
    d = r.json()
    assert d.get('ok') is True
    assert d.get('status') == 'verification_pending'
    return {**s, 'submit': d}


class TestSubmitPaymentAndStatus:
    def test_status_token_shape(self, paid):
        st = paid['submit']['statusToken']
        assert isinstance(st, str)
        assert len(st) == 8, f'expected 8 chars, got {len(st)}: {st}'
        assert re.fullmatch(r'[A-Z0-9]{8}', st), f'not uppercase alnum: {st}'
        assert all(c in STATUS_ALPHABET for c in st), f'forbidden chars in {st}'

    def test_status_get_returns_summary(self, api, paid):
        st = paid['submit']['statusToken']
        r = api.get(f'{BASE_URL}/api/status/{st}')
        assert r.status_code == 200, r.text
        s = r.json()['status']
        assert s['brideName'].startswith('TEST_Bride_pay')
        assert s['plan'] == 'classic'
        assert s['paymentStatus'] == 'verification_pending'
        assert s['canEdit'] is True  # not yet approved
        assert isinstance(s['paymentAttempts'], list) and len(s['paymentAttempts']) >= 1
        assert isinstance(s['adminMessages'], list)
        assert s.get('previewUrl', '').startswith('/preview/'), s.get('previewUrl')

    def test_status_nonexistent_404(self, api):
        r = api.get(f'{BASE_URL}/api/status/ZZZZZZZZ')
        assert r.status_code == 404

    def test_email_log_payment_submitted(self, db, paid):
        st = paid['submit']['statusToken']
        e = db.email_log.find_one({'statusToken': st, 'type': 'payment_submitted'})
        assert e is not None, 'no email_log entry for payment_submitted'


# ---------- admin reject + retry + request-changes + note ----------

class TestAdminAndRetryFlow:
    def test_admin_reject_marks_latest_attempt(self, admin, db, paid):
        wid = paid['weddingId']
        r = admin.post(f'{BASE_URL}/api/admin/payments/{wid}/reject',
                       json={'reason': 'Blurred screenshot — please resend.'})
        assert r.status_code == 200, r.text
        raw = db.weddings.find_one({'id': wid})
        assert raw['paymentStatus'] == 'rejected'
        attempts = raw.get('paymentAttempts') or []
        assert attempts and attempts[-1]['status'] == 'rejected'
        assert 'Blurred' in attempts[-1].get('rejectionReason', '')
        # email_log entry
        e = db.email_log.find_one({'weddingId': wid, 'type': 'payment_rejected'})
        assert e is not None

    def test_customer_retry_after_reject_pushes_new_attempt(self, api, db, paid):
        st = paid['submit']['statusToken']
        before = db.weddings.find_one({'id': paid['weddingId']}).get('paymentAttempts') or []
        n_before = len(before)
        r = api.post(f'{BASE_URL}/api/status/{st}/retry-payment',
                     json={'dataUri': _png_uri(color=(10, 220, 90)), 'txnRef': 'UPI-RETRY-2'})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get('status') == 'verification_pending'
        after = db.weddings.find_one({'id': paid['weddingId']}).get('paymentAttempts') or []
        assert len(after) == n_before + 1, f'expected attempt count to grow ({n_before}→{n_before+1}), got {len(after)}'
        # paymentStatus reset to verification_pending
        assert db.weddings.find_one({'id': paid['weddingId']})['paymentStatus'] == 'verification_pending'

    def test_request_changes_requires_message(self, admin, paid):
        r = admin.post(f'{BASE_URL}/api/admin/payments/{paid["weddingId"]}/request-changes', json={})
        assert r.status_code == 400

    def test_request_changes_pushes_admin_message(self, admin, db, paid):
        wid = paid['weddingId']
        r = admin.post(f'{BASE_URL}/api/admin/payments/{wid}/request-changes',
                       json={'message': 'Please update wedding date to Dec 21.'})
        assert r.status_code == 200, r.text
        raw = db.weddings.find_one({'id': wid})
        assert raw['paymentStatus'] == 'changes_requested'
        msgs = raw.get('adminMessages') or []
        assert any(m['type'] == 'changes_requested' and 'Dec 21' in m['message'] for m in msgs)
        e = db.email_log.find_one({'weddingId': wid, 'type': 'changes_requested'})
        assert e is not None

    def test_note_pushes_admin_message(self, admin, db, paid):
        wid = paid['weddingId']
        r = admin.post(f'{BASE_URL}/api/admin/payments/{wid}/note', json={'message': 'Just a friendly note.'})
        assert r.status_code == 200, r.text
        raw = db.weddings.find_one({'id': wid})
        msgs = raw.get('adminMessages') or []
        assert any(m['type'] == 'note' and 'friendly' in m['message'] for m in msgs)
        e = db.email_log.find_one({'weddingId': wid, 'type': 'admin_note'})
        assert e is not None

    def test_retry_to_get_back_to_pending_then_approve(self, api, admin, db, paid):
        # After request-changes, customer retries to put status back to verification_pending
        st = paid['submit']['statusToken']
        r = api.post(f'{BASE_URL}/api/status/{st}/retry-payment',
                     json={'dataUri': _png_uri(), 'txnRef': 'UPI-RETRY-3'})
        assert r.status_code == 200, r.text
        # Admin approves
        r2 = admin.post(f'{BASE_URL}/api/admin/payments/{paid["weddingId"]}/approve', json={})
        assert r2.status_code == 200, r2.text
        w = r2.json().get('wedding') or {}
        assert w.get('status') == 'published'
        # latest attempt status approved
        raw = db.weddings.find_one({'id': paid['weddingId']})
        assert raw['paymentAttempts'][-1]['status'] == 'approved'
        # password hash still never leaked even in admin response
        assert 'invitePassword' not in w
        # website_published email_log
        e = db.email_log.find_one({'weddingId': paid['weddingId'], 'type': 'website_published'})
        assert e is not None

    def test_retry_when_approved_returns_409(self, api, paid):
        st = paid['submit']['statusToken']
        r = api.post(f'{BASE_URL}/api/status/{st}/retry-payment',
                     json={'dataUri': _png_uri(), 'txnRef': 'NOPE'})
        assert r.status_code == 409, f'expected 409, got {r.status_code}: {r.text}'

    def test_status_after_publish(self, api, paid):
        st = paid['submit']['statusToken']
        r = api.get(f'{BASE_URL}/api/status/{st}')
        assert r.status_code == 200
        s = r.json()['status']
        assert s['publishedStatus'] == 'published'
        assert s['publishedSlug'] == paid['slug']
        assert s['canEdit'] is False


# ---------- cleanup ----------

def test_zz_cleanup(admin, paid, db):
    """Soft-delete TEST_ weddings & related leads. Best-effort."""
    try:
        admin.delete(f'{BASE_URL}/api/weddings/{paid["weddingId"]}')
    except Exception:
        pass
    try:
        # also soft-delete any other TEST_ drafts created by this run
        for w in db.weddings.find({'brideName': {'$regex': f'^TEST_.*{UNIQUE[:4]}'}, 'deletedAt': {'$exists': False}}):
            try:
                admin.delete(f'{BASE_URL}/api/weddings/{w["id"]}')
            except Exception:
                pass
    except Exception:
        pass
