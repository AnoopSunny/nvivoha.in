"""Batch 3 — Premium Publish Flow + Unified Hub + UPI Checkout + Add-ons.

Tests verify:
- /api/onboard/start basic shape
- /api/payment-config addons catalogue (3 items)
- /api/onboard/select-plan with addons computes 2999+1499+999=5497
- /api/owner/set-code returns 32-char base64url ownerToken
- /api/owner/auth happy + wrong-code paths
- /api/hub/owner/:t expanded payload contract
- /api/hub/owner/:t/rsvp-export CSV
- /api/hub/owner/:t/photo-wall empty list
- /api/hub/owner/:t/photo-wall-zip 404 when empty
- /api/hub/owner/:t/photo-wall/:id/moderate 404 for unknown photo
- Invalid ownerToken → 404
- New weddings via POST /api/weddings default to plan='vivoha'
- /api/onboard/submit-payment/:t response includes ownerToken
"""

import os
import re
import time
import uuid
import requests
import pytest

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
ADMIN_EMAIL = 'admin@vivoha.in'
ADMIN_PASSWORD = 'VivohaAdmin@2026'

# Tiny 1x1 PNG as a valid data URI for payment screenshot tests
TINY_PNG_DATAURI = (
    'data:image/png;base64,'
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
)


@pytest.fixture(scope='session')
def api():
    s = requests.Session()
    s.headers.update({'Content-Type': 'application/json'})
    return s


@pytest.fixture(scope='session')
def admin_token(api):
    r = api.post(f'{BASE_URL}/api/auth/login', json={'email': ADMIN_EMAIL, 'password': ADMIN_PASSWORD})
    assert r.status_code == 200, f'Admin login failed: {r.status_code} {r.text[:200]}'
    return r.json().get('token')


@pytest.fixture
def onboard(api):
    """Create a fresh onboard session and return its core fields."""
    suffix = uuid.uuid4().hex[:6]
    r = api.post(f'{BASE_URL}/api/onboard/start', json={
        'brideName': f'TESTBride{suffix}',
        'groomName': f'TESTGroom{suffix}',
        'email': f'test{suffix}@example.com',
    })
    assert r.status_code in (200, 201), f'onboard/start failed: {r.status_code} {r.text[:200]}'
    data = r.json()
    assert 'token' in data and 'slug' in data and 'weddingId' in data
    return data


# ---- onboard/start ----------------------------------------------------------

def test_onboard_start_shape(onboard):
    assert isinstance(onboard['token'], str) and len(onboard['token']) >= 16
    assert isinstance(onboard['slug'], str) and len(onboard['slug']) > 0
    assert isinstance(onboard['weddingId'], str)


# ---- payment-config addons --------------------------------------------------

def test_payment_config_addons(api):
    r = api.get(f'{BASE_URL}/api/payment-config')
    assert r.status_code == 200, r.text[:200]
    cfg = r.json()
    # Endpoint wraps payload under "config"
    if 'config' in cfg and 'addons' not in cfg:
        cfg = cfg['config']
    assert 'addons' in cfg, f'no addons in payment-config: {list(cfg.keys())}'
    addons = cfg['addons']
    assert isinstance(addons, list) and len(addons) == 3
    ids = {a['id'] for a in addons}
    assert ids == {'guest-memories', 'custom-domain', 'concierge'}
    by_id = {a['id']: a for a in addons}
    assert by_id['guest-memories']['price'] == 499
    assert by_id['custom-domain']['price'] == 1499
    assert by_id['concierge']['price'] == 999


# ---- select-plan with addons ------------------------------------------------

def test_select_plan_vivoha_with_two_addons(api, onboard):
    tok = onboard['token']
    r = api.post(f'{BASE_URL}/api/onboard/select-plan/{tok}', json={
        'plan': 'vivoha',
        'addons': ['custom-domain', 'concierge'],
    })
    assert r.status_code == 200, r.text[:300]
    j = r.json()
    assert j['plan'] == 'vivoha'
    assert j['baseAmount'] == 2999
    assert j['addonsAmount'] == 1499 + 999
    assert j['amount'] == 5497
    assert {a['id'] for a in j['addons']} == {'custom-domain', 'concierge'}


def test_select_plan_filters_bogus_addons(api, onboard):
    tok = onboard['token']
    r = api.post(f'{BASE_URL}/api/onboard/select-plan/{tok}', json={
        'plan': 'vivoha',
        'addons': ['custom-domain', 'this-is-fake', 'concierge'],
    })
    assert r.status_code == 200
    j = r.json()
    assert j['amount'] == 5497  # fake stripped


# ---- owner/set-code + owner/auth + hub/owner --------------------------------

@pytest.fixture
def owner_session(api, onboard):
    """Set a publish code and return ownerToken plus context."""
    suffix = uuid.uuid4().hex[:6]
    # use a unique whatsapp per test to dodge rate-limit cross-talk
    whatsapp = '9' + ''.join([str((ord(c) % 10)) for c in suffix]) + '12345'
    whatsapp = whatsapp[:10]
    r = api.post(f'{BASE_URL}/api/onboard/select-plan/{onboard["token"]}', json={
        'plan': 'vivoha', 'addons': ['custom-domain', 'concierge'],
    })
    assert r.status_code == 200
    r2 = api.post(f'{BASE_URL}/api/owner/set-code', json={
        'onboardToken': onboard['token'],
        'whatsapp': whatsapp,
        'code': '4321',
    })
    assert r2.status_code == 200, r2.text[:200]
    data = r2.json()
    assert 'ownerToken' in data
    return {
        'ownerToken': data['ownerToken'],
        'whatsappLast4': data['whatsappLast4'],
        'whatsapp': whatsapp,
        'onboardToken': onboard['token'],
        'slug': onboard['slug'],
    }


def test_set_code_returns_long_token(owner_session):
    tok = owner_session['ownerToken']
    # Code lives between 24 and 64 chars in route regex; base64url alphabet
    assert re.fullmatch(r'[A-Za-z0-9_-]{24,64}', tok), tok
    assert len(tok) >= 32


def test_owner_auth_happy_path(api, owner_session):
    r = api.post(f'{BASE_URL}/api/owner/auth', json={
        'whatsapp': owner_session['whatsapp'],
        'code': '4321',
    })
    assert r.status_code == 200, r.text[:200]
    j = r.json()
    assert j['ownerToken'] == owner_session['ownerToken']


def test_owner_auth_wrong_code(api, owner_session):
    r = api.post(f'{BASE_URL}/api/owner/auth', json={
        'whatsapp': owner_session['whatsapp'],
        'code': '0000',
    })
    assert r.status_code == 401


# ---- hub/owner expanded payload ---------------------------------------------

EXPECTED_KEYS = {
    'addons', 'addonsAmount',
    'stats', 'rsvps', 'adminMessages', 'paymentAttempts',
    'publicUrl', 'shortUrl', 'qrDataUri',
    'previewUrl', 'editUrl',
    'ownerWhatsappLast4', 'photoWallEnabled',
    'paymentStatus', 'publishedStatus',
}


def test_hub_owner_payload_contract(api, owner_session):
    r = api.get(f'{BASE_URL}/api/hub/owner/{owner_session["ownerToken"]}')
    assert r.status_code == 200, r.text[:300]
    body = r.json()
    assert 'status' in body, f'response missing top-level status: {list(body.keys())}'
    v = body['status']
    missing = EXPECTED_KEYS - set(v.keys())
    assert not missing, f'missing keys: {missing}'

    # stats sub-structure
    stats = v['stats']
    for k in ('totalViews', 'viewsTrend', 'totalRsvps', 'attendingCount', 'photoCounts'):
        assert k in stats, f'stats missing {k}'
    assert isinstance(stats['viewsTrend'], list) and len(stats['viewsTrend']) == 14
    for entry in stats['viewsTrend']:
        assert 'day' in entry and 'views' in entry
    pc = stats['photoCounts']
    assert set(pc.keys()) == {'pending', 'approved', 'rejected'}

    # addons reflect selection
    assert isinstance(v['addons'], list) and len(v['addons']) == 2
    assert v['addonsAmount'] == 1499 + 999

    # last 4 of whatsapp echoed
    assert v['ownerWhatsappLast4'] == owner_session['whatsapp'][-4:]


def test_hub_owner_invalid_token_returns_404(api):
    bogus = 'A' * 32
    r = api.get(f'{BASE_URL}/api/hub/owner/{bogus}')
    assert r.status_code == 404


# ---- rsvp-export + photo-wall list/zip/moderate -----------------------------

def test_rsvp_export_csv_empty(api, owner_session):
    r = api.get(f'{BASE_URL}/api/hub/owner/{owner_session["ownerToken"]}/rsvp-export')
    assert r.status_code == 200, r.text[:200]
    ct = r.headers.get('Content-Type', '')
    assert 'text/csv' in ct, f'unexpected content-type {ct}'
    # CSV has a header row even when 0 RSVPs
    assert 'Name' in r.text and 'Email' in r.text


def test_photo_wall_empty(api, owner_session):
    r = api.get(f'{BASE_URL}/api/hub/owner/{owner_session["ownerToken"]}/photo-wall')
    assert r.status_code == 200
    j = r.json()
    assert 'photos' in j and j['photos'] == []


def test_photo_wall_zip_empty_returns_404(api, owner_session):
    r = api.get(f'{BASE_URL}/api/hub/owner/{owner_session["ownerToken"]}/photo-wall-zip')
    assert r.status_code == 404
    # friendly message
    body = r.json() if r.headers.get('Content-Type', '').startswith('application/json') else {}
    msg = body.get('error') or body.get('message') or r.text
    assert 'approved' in msg.lower() or 'no' in msg.lower()


def test_photo_wall_moderate_unknown_id(api, owner_session):
    r = api.post(
        f'{BASE_URL}/api/hub/owner/{owner_session["ownerToken"]}/photo-wall/nonexistent-id/moderate',
        json={'action': 'approve'},
    )
    assert r.status_code == 404
    # handler reached: it returned a JSON error rather than crashing
    body = r.json() if r.headers.get('Content-Type', '').startswith('application/json') else {}
    assert ('error' in body or 'message' in body)


# ---- admin create wedding defaults to vivoha --------------------------------

def test_admin_wedding_defaults_to_vivoha(api, admin_token):
    h = {'Authorization': f'Bearer {admin_token}', 'Content-Type': 'application/json'}
    suffix = uuid.uuid4().hex[:6]
    payload = {
        'brideName': f'TESTAdminBride{suffix}',
        'groomName': f'TESTAdminGroom{suffix}',
        'weddingDate': '2027-01-01',
        # NOTE: deliberately no `plan` key
    }
    r = requests.post(f'{BASE_URL}/api/weddings', json=payload, headers=h)
    assert r.status_code in (200, 201), r.text[:300]
    j = r.json()
    wid = j.get('id') or j.get('wedding', {}).get('id')
    assert wid, f'no id in create response: {j}'
    g = requests.get(f'{BASE_URL}/api/weddings/{wid}', headers=h)
    assert g.status_code == 200, g.text[:200]
    w = g.json()
    plan = w.get('plan') or w.get('wedding', {}).get('plan')
    assert plan == 'vivoha', f'expected vivoha default, got {plan}'


# ---- submit-payment returns ownerToken --------------------------------------

def test_submit_payment_returns_owner_token(api, owner_session):
    r = api.post(
        f'{BASE_URL}/api/onboard/submit-payment/{owner_session["onboardToken"]}',
        json={'dataUri': TINY_PNG_DATAURI, 'txnRef': 'TEST-TXN-' + uuid.uuid4().hex[:6]},
    )
    assert r.status_code == 200, r.text[:300]
    j = r.json()
    assert j.get('status') == 'verification_pending'
    assert j.get('ownerToken') == owner_session['ownerToken']
