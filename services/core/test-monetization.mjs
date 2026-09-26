// ---------------------------------------------------------------------------
// Monetization Gateway Tests (Item 21 — reward system, Item 22 — anti-fraud)
// Run: JWT_SECRET=test_secret node services/core/server.js & sleep 1 && node services/core/test-monetization.mjs
// ---------------------------------------------------------------------------

import { describe, it } from 'node:test';
import assert from 'node:assert';

const BASE = process.env.CORE_URL || 'http://localhost:3002';
let token = '';
let userId = '';

function headers(extra = {}) {
  const h = { 'Content-Type': 'application/json', ...extra };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

async function api(method, path, body) {
  const opts = { method, headers: headers() };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(BASE + path, opts);
  return { status: r.status, data: await r.json().catch(() => ({})) };
}

/** Registers a throwaway account and publishes a clip, returning both ids. */
async function seedCreator(suffix) {
  const reg = await api('POST', '/api/auth/register', {
    email: `mon${suffix}@nexastream.io`, password: 'Test1234!', username: `mon${suffix}`,
  });
  assert.strictEqual(reg.status, 200, JSON.stringify(reg.data));
  const savedToken = token;
  token = reg.data.token;
  const bytes = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypmp42'), Buffer.alloc(2048)]);
  const res = await fetch(
    `${BASE}/api/videos/upload?title=${encodeURIComponent('Monetization Fixture ' + suffix)}&description=x&type=video`,
    { method: 'PUT', headers: { 'Content-Type': 'video/mp4', Authorization: `Bearer ${reg.data.token}` }, body: bytes },
  );
  const up = await res.json().catch(() => ({}));
  token = savedToken;
  return { token: reg.data.token, userId: reg.data.user.id, videoId: up.videoId };
}

const NANO = 'nano_1111111111111111111111111111111111111111111111111111hifc8npp';

describe('Monetization — rate table', () => {
  it('publishes the documented rates and split', async () => {
    const { status, data } = await api('GET', '/api/monetization/config');
    assert.strictEqual(status, 200);
    assert.strictEqual(data.split.creator, 0.5);
    assert.strictEqual(data.split.platform, 0.5);
    assert.strictEqual(data.rates.valid_view, 0.01);
    assert.strictEqual(data.rates.completion, 0.02);
    assert.strictEqual(data.rates.like, 0.005);
    assert.strictEqual(data.rates.subscribe, 0.05);
    assert.strictEqual(data.rates.viewer_view, 0.002);
    assert.strictEqual(data.rates.viewer_daily_view_cap, 50);
  });

  it('publishes anti-fraud and payout thresholds', async () => {
    const { data } = await api('GET', '/api/monetization/config');
    assert.strictEqual(data.minWatchSeconds, 10);
    assert.strictEqual(data.completionRatio, 0.85);
    assert.strictEqual(data.fraudRejectThreshold, 0.7);
    assert.strictEqual(data.minPayoutNst, 100);
    assert.strictEqual(data.timelockHours, 24);
  });

  it('never exposes secrets in the public config', async () => {
    const { data } = await api('GET', '/api/monetization/config');
    const blob = JSON.stringify(data).toLowerCase();
    for (const forbidden of ['secret', 'privatekey', 'private_key', 'seed', 'jwt', 'apikey', 'api_key']) {
      assert.ok(!blob.includes(forbidden), `config leaked "${forbidden}"`);
    }
  });
});

describe('Monetization — accrual', () => {
  it('rejects a watch below the minimum without crediting', async () => {
    const c = await seedCreator('short' + Math.random().toString(36).slice(2, 7));
    const { status, data } = await api('POST', '/api/monetization/accrue', {
      videoId: c.videoId, viewerId: 'viewer-short', seconds: 0.4, completed: false, deviceId: 'dev-a',
    });
    assert.strictEqual(status, 200);
    assert.strictEqual(data.credited, false);
    assert.match(String(data.reason), /minimum|10s/i);
  });

  it('credits a full watch and pays the creator', async () => {
    const c = await seedCreator('full' + Math.random().toString(36).slice(2, 7));
    const { status, data } = await api('POST', '/api/monetization/accrue', {
      videoId: c.videoId, viewerId: 'viewer-full', seconds: 120, completed: true, deviceId: 'dev-b',
    });
    assert.strictEqual(status, 200);
    assert.strictEqual(data.credited, true);
    assert.ok(data.creatorNst > 0, 'creator should be paid');
    assert.ok(typeof data.fraudScore === 'number');
  });

  it('requires videoId and viewerId', async () => {
    const missing = await api('POST', '/api/monetization/accrue', { seconds: 60 });
    assert.strictEqual(missing.status, 400);
    const noViewer = await api('POST', '/api/monetization/accrue', { videoId: 'x' });
    assert.strictEqual(noViewer.status, 400);
  });

  it('404s for an unknown video', async () => {
    const { status } = await api('POST', '/api/monetization/accrue', {
      videoId: 'does-not-exist', viewerId: 'v', seconds: 60, completed: true,
    });
    assert.strictEqual(status, 404);
  });

  it('reports a numeric fraud score for every decision', async () => {
    const c = await seedCreator('score' + Math.random().toString(36).slice(2, 7));
    for (const seconds of [0, 5, 30, 300]) {
      const { data } = await api('POST', '/api/monetization/accrue', {
        videoId: c.videoId, viewerId: 'viewer-score-' + seconds, seconds, completed: seconds >= 300, deviceId: 'dev-c',
      });
      assert.strictEqual(typeof data.fraudScore, 'number', `seconds=${seconds}`);
      assert.ok(data.fraudScore >= 0 && data.fraudScore <= 1, `score out of range: ${data.fraudScore}`);
    }
  });
});

describe('Monetization — engagement rewards', () => {
  it('accepts like and subscribe, rejects unknown kinds', async () => {
    const c = await seedCreator('eng' + Math.random().toString(36).slice(2, 7));
    for (const kind of ['like', 'subscribe']) {
      const { status, data } = await api('POST', `/api/monetization/reward/${kind}`, {
        videoId: c.videoId, viewerId: 'viewer-eng',
      });
      assert.strictEqual(status, 200, kind);
      assert.strictEqual(typeof data.credited, 'boolean', kind);
    }
    const bogus = await api('POST', '/api/monetization/reward/bogus', {
      videoId: c.videoId, viewerId: 'viewer-eng',
    });
    assert.ok(bogus.status === 404 || bogus.status === 400);
  });

  it('requires videoId', async () => {
    const { status } = await api('POST', '/api/monetization/reward/like', {});
    assert.strictEqual(status, 400);
  });
});

describe('Monetization — wallet', () => {
  it('refuses unauthenticated access', async () => {
    const saved = token;
    token = '';
    const { status } = await api('GET', '/api/monetization/wallet');
    token = saved;
    assert.strictEqual(status, 401);
  });

  it('returns a complete wallet shape for a creator who has been viewed', async () => {
    const c = await seedCreator('wal' + Math.random().toString(36).slice(2, 7));
    await api('POST', '/api/monetization/accrue', {
      videoId: c.videoId, viewerId: 'viewer-wal', seconds: 120, completed: true, deviceId: 'dev-d',
    });
    const saved = token;
    token = c.token;
    const { status, data } = await api('GET', '/api/monetization/wallet');
    token = saved;

    assert.strictEqual(status, 200);
    for (const key of ['balanceNst', 'lifetimeCreatorNst', 'lifetimeViewerNst', 'lifetimePaidNst', 'platformNst']) {
      assert.strictEqual(typeof data[key], 'number', key);
    }
    assert.ok(Array.isArray(data.earningsByKind));
    assert.ok(Array.isArray(data.recentLedger));
    assert.ok(Array.isArray(data.payouts));
    assert.ok(data.lifetimeCreatorNst > 0, 'creator earnings should be recorded');
    assert.ok(data.recentLedger.length > 0, 'ledger should have entries');
    for (const e of data.recentLedger) {
      assert.strictEqual(typeof e.kind, 'string');
      assert.strictEqual(typeof e.role, 'string');
      assert.strictEqual(typeof e.nst, 'number');
      assert.strictEqual(typeof e.status, 'string');
    }
  });

  it('keeps the 50/50 split visible in the ledger', async () => {
    const c = await seedCreator('split' + Math.random().toString(36).slice(2, 7));
    await api('POST', '/api/monetization/accrue', {
      videoId: c.videoId, viewerId: 'viewer-split', seconds: 120, completed: true, deviceId: 'dev-e',
    });
    const saved = token;
    token = c.token;
    const { data } = await api('GET', '/api/monetization/wallet');
    token = saved;

    // Creator and platform sides must both be recorded, and the platform share
    // must equal the creator share of the same gross event (Item 20).
    const creator = data.lifetimeCreatorNst;
    assert.ok(creator > 0);
    assert.ok(data.platformNst > 0, 'platform share should be recorded');
    assert.ok(Math.abs(data.platformNst - creator) < 1e-6,
      `expected platform (${data.platformNst}) to equal creator (${creator}) at a 50/50 split`);
  });
});

describe('Monetization — studio', () => {
  it('reports per-video unit economics', async () => {
    const c = await seedCreator('stu' + Math.random().toString(36).slice(2, 7));
    await api('POST', '/api/monetization/accrue', {
      videoId: c.videoId, viewerId: 'viewer-stu', seconds: 120, completed: true, deviceId: 'dev-f',
    });
    const saved = token;
    token = c.token;
    const { status, data } = await api('GET', '/api/monetization/studio');
    token = saved;

    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(data.videos));
    assert.ok(data.videos.length >= 1);
    for (const key of ['videos', 'views', 'likes', 'earnedNst', 'revenuePerThousandViewsNst',
      'revenuePerViewNst', 'completionRate', 'watchHours']) {
      assert.strictEqual(typeof data.totals[key], 'number', key);
    }
    const v = data.videos[0];
    assert.strictEqual(typeof v.earnedNst, 'number');
    assert.strictEqual(typeof v.isShort, 'boolean');
    assert.strictEqual(typeof v.watchSeconds, 'number');
  });
});

describe('Monetization — payouts', () => {
  it('requires authentication', async () => {
    const saved = token;
    token = '';
    const { status } = await api('POST', '/api/monetization/payout', {
      amountNst: 100, destAddress: NANO, destNetwork: 'NANO',
    });
    token = saved;
    assert.strictEqual(status, 401);
  });

  it('rejects a non-positive amount', async () => {
    const c = await seedCreator('pz' + Math.random().toString(36).slice(2, 7));
    const saved = token;
    token = c.token;
    const { status, data } = await api('POST', '/api/monetization/payout', {
      amountNst: 0, destAddress: NANO, destNetwork: 'NANO',
    });
    token = saved;
    assert.strictEqual(status, 400);
    assert.match(String(data.error), /positive/i);
  });

  it('enforces the 100 NST minimum before anything else', async () => {
    const c = await seedCreator('pm' + Math.random().toString(36).slice(2, 7));
    const saved = token;
    token = c.token;
    const { status, data } = await api('POST', '/api/monetization/payout', {
      amountNst: 99.99, destAddress: NANO, destNetwork: 'NANO',
    });
    token = saved;
    assert.strictEqual(status, 400);
    assert.match(String(data.error), /minimum/i);
    assert.strictEqual(data.minPayoutNst, 100);
  });

  it('validates the address before checking the balance', async () => {
    // Reporting "insufficient balance" for a typo'd address sends the user
    // looking in the wrong place, so ordering matters here.
    const c = await seedCreator('pa' + Math.random().toString(36).slice(2, 7));
    const saved = token;
    token = c.token;
    const badAddr = await api('POST', '/api/monetization/payout', {
      amountNst: 500, destAddress: 'garbage', destNetwork: 'NANO',
    });
    assert.strictEqual(badAddr.status, 400);
    assert.match(String(badAddr.data.error), /address/i);

    const goodAddrNoFunds = await api('POST', '/api/monetization/payout', {
      amountNst: 500, destAddress: NANO, destNetwork: 'NANO',
    });
    token = saved;
    assert.match(String(goodAddrNoFunds.data.error), /balance/i);
  });

  it('rejects an unsupported network', async () => {
    const c = await seedCreator('pn' + Math.random().toString(36).slice(2, 7));
    const saved = token;
    token = c.token;
    const { status, data } = await api('POST', '/api/monetization/payout', {
      amountNst: 500, destAddress: NANO, destNetwork: 'DOGECOIN',
    });
    token = saved;
    assert.strictEqual(status, 400);
    assert.match(String(data.error), /network/i);
  });

  it('requires a memo on memo-addressed networks', async () => {
    // Omitting the tag on XRP/XLM sends funds to an unrecoverable destination.
    const c = await seedCreator('pme' + Math.random().toString(36).slice(2, 7));
    const saved = token;
    token = c.token;
    const { status, data } = await api('POST', '/api/monetization/payout', {
      amountNst: 500, destAddress: 'GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37', destNetwork: 'XLM',
    });
    token = saved;
    assert.strictEqual(status, 400);
    assert.match(String(data.error), /memo|tag/i);
    assert.strictEqual(data.needsMemo, true);
  });
});

describe('Monetization — address validation endpoint', () => {
  it('accepts a well-formed NANO address', async () => {
    const { status, data } = await api(
      'GET', `/api/monetization/validate-address?address=${NANO}&network=NANO`,
    );
    assert.strictEqual(status, 200);
    assert.strictEqual(data.valid, true);
    assert.strictEqual(data.needsMemo, false);
  });

  it('rejects malformed input', async () => {
    const { data } = await api('GET', '/api/monetization/validate-address?address=not-an-address&network=NANO');
    assert.strictEqual(data.valid, false);
  });

  it('reports the supported networks for an unknown one', async () => {
    // This is a query endpoint: the request succeeds and the answer is
    // "invalid", so it returns 200 with valid=false rather than a 4xx.
    const { status, data } = await api('GET', '/api/monetization/validate-address?address=x&network=FOOBAR');
    assert.strictEqual(status, 200);
    assert.strictEqual(data.valid, false);
    assert.match(String(data.reason), /unsupported network/i);
    assert.ok(Array.isArray(data.networks));
    assert.ok(data.networks.includes('NANO'));
    assert.ok(data.networks.includes('XLM'));
  });

  it('requires both parameters', async () => {
    const { status } = await api('GET', '/api/monetization/validate-address?address=x');
    assert.strictEqual(status, 400);
  });

  it('flags memo-based networks', async () => {
    const { data } = await api(
      'GET', '/api/monetization/validate-address?address=GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37&network=XLM',
    );
    assert.strictEqual(data.valid, true);
    assert.strictEqual(data.needsMemo, true);
  });
});

describe('Monetization — isolation between creators', () => {
  it('does not leak one creator\'s earnings into another\'s wallet', async () => {
    const a = await seedCreator('iso' + Math.random().toString(36).slice(2, 7) + 'a');
    const b = await seedCreator('iso' + Math.random().toString(36).slice(2, 7) + 'b');
    await api('POST', '/api/monetization/accrue', {
      videoId: a.videoId, viewerId: 'viewer-iso', seconds: 120, completed: true, deviceId: 'dev-g',
    });

    const saved = token;
    token = b.token;
    const { data: walletB } = await api('GET', '/api/monetization/wallet');
    token = saved;

    assert.strictEqual(walletB.lifetimeCreatorNst, 0, 'creator B must not receive creator A\'s rewards');
    assert.strictEqual(walletB.balanceNst, 0);
  });
});
