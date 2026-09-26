#!/usr/bin/env node
/**
 * Android client contract test.
 *
 * Replays the exact HTTP sequence apps/android performs, asserting the shape
 * of every field the Kotlin parsers read. This is the guard against the two
 * halves of the product drifting apart: if a field is renamed or a route moves,
 * this fails here rather than on a user's device.
 */
const BASE = process.env.CORE_URL || 'http://127.0.0.1:3002';
const DB_PATH = process.env.DB_PATH || 'database/nexastream.db';
const { DatabaseSync } = await import('node:sqlite');
const db = new DatabaseSync(DB_PATH);
let pass = 0, fail = 0;
const failures = [];

function check(name, cond, detail = '') {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; failures.push(name); console.log(`  FAIL ${name} ${detail}`); }
}

async function call(method, path, body, token) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = {};
  const text = await res.text();
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  return { status: res.status, json };
}

(async () => {
  const stamp = Date.now();
  const viewerId = 'android-' + stamp;

  console.log('\n== auth ==');
  const reg = await call('POST', '/api/auth/register', {
    email: `android${stamp}@example.test`,
    password: 'android-test-pass-123',
    username: `android${stamp}`,
  });
  check('register returns 200', reg.status === 200, `got ${reg.status}`);
  check('register returns token', typeof reg.json.token === 'string' && reg.json.token.length > 20);
  check('register returns user.id', !!reg.json.user?.id);
  check('register returns user.email', !!reg.json.user?.email);
  check('register returns user.username', !!reg.json.user?.username);
  const token = reg.json.token;
  const userId = reg.json.user.id;

  const badLogin = await call('POST', '/api/auth/login', {
    email: `android${stamp}@example.test`, password: 'wrong-password',
  });
  check('wrong password is rejected', badLogin.status === 401, `got ${badLogin.status}`);

  console.log('\n== auth/me ==');
  const me = await call('GET', '/api/auth/me', null, token);
  check('auth/me returns 200', me.status === 200, `got ${me.status}`);
  check('auth/me returns the same user', me.json.user?.id === userId, JSON.stringify(me.json).slice(0, 150));
  check('auth/me hides the password hash', !JSON.stringify(me.json).includes('password'), 'password field leaked');

  const meNoAuth = await call('GET', '/api/auth/me');
  check('auth/me requires a token', meNoAuth.status === 401, `got ${meNoAuth.status}`);

  console.log('\n== feed ==');
  const feed = await call('GET', `/api/feed?tab=all&viewer=${viewerId}`);
  check('feed returns 200', feed.status === 200, `got ${feed.status}`);
  check('feed has shorts array', Array.isArray(feed.json.shorts));
  check('feed has videos array', Array.isArray(feed.json.videos));
  check('feed reports algorithm', typeof feed.json.algorithm === 'string');

  console.log('\n== upload ==');
  // 1x1 px PNG header padding is enough: the core stores bytes and ffprobe
  // classifies them. We only assert the route contract here.
  const fakeMp4 = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypmp42'), Buffer.alloc(2048)]);
  const upRes = await fetch(`${BASE}/api/videos/upload?title=${encodeURIComponent('Android Contract Clip')}&description=${encodeURIComponent('uploaded by contract test')}&type=video`, {
    method: 'PUT',
    headers: { 'Content-Type': 'video/mp4', Authorization: 'Bearer ' + token },
    body: fakeMp4,
  });
  const upJson = await upRes.json().catch(() => ({}));
  check('upload returns 200', upRes.status === 200, `got ${upRes.status}`);
  check('upload returns videoId', typeof upJson.videoId === 'string' && upJson.videoId.length > 10, JSON.stringify(upJson).slice(0, 200));
  // The client needs the handle back so it can link straight to the creator's
  // channel after publishing without a second lookup.
  check('upload returns channelHandle', typeof upJson.channelHandle === 'string' && upJson.channelHandle.length > 0,
    JSON.stringify(upJson));
  check('upload returns channelId', typeof upJson.channelId === 'string' && upJson.channelId.length > 10);
  const channelHandle = upJson.channelHandle;
  const channelId = upJson.channelId;

  // The bytes above are not real video, so the upload stays in processing and
  // never reaches the list surfaces. Downstream assertions therefore run
  // against a ready row seeded directly, which keeps this suite deterministic
  // and independent of ffmpeg. The real pipeline is covered by pipeline-test.mjs.
  const videoId = 'contract-fixture-' + stamp;
  db.prepare(`INSERT INTO videos
      (id, channel_id, title, description, video_path, status, duration, width, height, is_short, qualities, views)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(videoId, channelId, 'Android Contract Fixture', 'seeded by contract test',
      `/storage/videos/${videoId}.mp4`, 'ready', 120, 1280, 720, 0, '["360p","720p"]', 0);

  // channel_handle must be present on every list surface, not only detail.
  console.log('\n== channel_handle on list surfaces ==');
  const listRes = await call('GET', '/api/videos');
  const listed = (listRes.json.videos || []).find(v => v.id === videoId);
  check('video appears in /api/videos', !!listed, 'seeded video missing from list');
  check('list rows carry channel_handle', listed?.channel_handle === channelHandle,
    `got ${listed?.channel_handle}`);

  const searchRes = await call('GET', '/api/search?q=Contract');
  const found = (searchRes.json.videos || []).find(v => v.id === videoId);
  check('search finds the video', !!found, 'not in search results');
  check('search rows carry channel_handle', found?.channel_handle === channelHandle,
    `got ${found?.channel_handle}`);

  const feedRes = await call('GET', `/api/feed?tab=all&viewer=${viewerId}`);
  const inFeed = [...(feedRes.json.videos || []), ...(feedRes.json.shorts || [])].find(v => v.id === videoId);
  check('feed rows carry channel_handle', inFeed?.channel_handle === channelHandle,
    `got ${inFeed?.channel_handle}`);

  console.log('\n== like ==');
  const likeRes = await call('POST', `/api/videos/${videoId}/like`, {}, token);
  check('like returns 200', likeRes.status === 200, `got ${likeRes.status}`);
  check('like returns a numeric count', typeof likeRes.json.likes === 'number', JSON.stringify(likeRes.json));

  console.log('\n== video detail ==');
  const detail = await call('GET', `/api/videos/${videoId}`);
  check('video detail returns 200', detail.status === 200, `got ${detail.status}`);
  const v = detail.json.video || {};
  check('video.id present', !!v.id);
  check('video.title present', !!v.title);
  check('video.duration is number', typeof v.duration === 'number');
  check('video.views is number', typeof v.views === 'number');
  check('video.is_short is number', typeof v.is_short === 'number');
  check('video.channel_name present', !!v.channel_name);
  check('video.qualities is array', Array.isArray(v.qualities));
  if (Array.isArray(v.qualities) && v.qualities.length) {
    check('quality entries have label', typeof v.qualities[0].label === 'string');
    check('quality entries have url', typeof v.qualities[0].url === 'string');
  }

  console.log('\n== related ==');
  const rel = await call('GET', `/api/videos/${videoId}/related`);
  check('related returns 200 (not swallowed by /videos/:id)', rel.status === 200, `got ${rel.status}`);
  check('related returns videos array', Array.isArray(rel.json.videos), JSON.stringify(rel.json).slice(0, 120));

  console.log('\n== channel ==');
  const chRes = await call('GET', `/api/channels/${upJson.channelHandle || upJson.handle || ''}`);
  if (upJson.channelHandle || upJson.handle) {
    check('channel returns 200', chRes.status === 200, `got ${chRes.status}`);
    check('channel.videoCount is number', typeof chRes.json.channel?.videoCount === 'number');
    check('channel.monetized is bool', typeof chRes.json.channel?.monetized === 'boolean');
    check('channel.lifetimeEarnedNst is number', typeof chRes.json.channel?.lifetimeEarnedNst === 'number');
  } else {
    // Fall back to the uploader's own channel
    const list = await call('GET', '/api/videos?limit=1');
    const first = (list.json.videos || [])[0];
    if (first) {
      const c2 = await call('GET', `/api/channels/${first.channel_id}`);
      check('channel by id returns 200', c2.status === 200, `got ${c2.status}`);
      check('channel.videoCount is number', typeof c2.json.channel?.videoCount === 'number');
    } else {
      check('channel route reachable (no data to sample)', false, 'no videos');
    }
  }

  console.log('\n== search ==');
  const search = await call('GET', '/api/search?q=android');
  check('search returns 200', search.status === 200, `got ${search.status}`);
  check('search returns videos array', Array.isArray(search.json.videos));

  console.log('\n== monetization config ==');
  const cfg = await call('GET', '/api/monetization/config');
  check('config returns 200', cfg.status === 200, `got ${cfg.status}`);
  check('config.ratesVersion present', typeof cfg.json.ratesVersion === 'string');
  check('config.split.creator is 0.5', cfg.json.split?.creator === 0.5, String(cfg.json.split?.creator));
  check('config.split.platform is 0.5', cfg.json.split?.platform === 0.5);
  check('config.minPayoutNst is 100', cfg.json.minPayoutNst === 100);
  check('config.minWatchSeconds is 10', cfg.json.minWatchSeconds === 10);
  check('config.completionRatio is 0.85', cfg.json.completionRatio === 0.85);
  check('config.fraudRejectThreshold is 0.7', cfg.json.fraudRejectThreshold === 0.7);
  check('config.timelockHours is 24', cfg.json.timelockHours === 24);
  check('config.networks is array', Array.isArray(cfg.json.networks));
  check('config.memoNetworks is array', Array.isArray(cfg.json.memoNetworks));

  console.log('\n== accrue: below minimum watch ==');
  const short = await call('POST', '/api/monetization/accrue', {
    videoId, viewerId, seconds: 0.4, completed: false, deviceId: 'android-device-1',
  });
  check('short watch returns 200', short.status === 200, `got ${short.status}`);
  check('short watch not credited', short.json.credited === false, JSON.stringify(short.json));
  check('short watch has reason', typeof short.json.reason === 'string');
  check('short watch reason cites the 10s floor', /10s|10 s|minimum/i.test(short.json.reason || ''), short.json.reason);

  console.log('\n== accrue: full watch ==');
  const full = await call('POST', '/api/monetization/accrue', {
    videoId, viewerId, seconds: 120, completed: true, deviceId: 'android-device-1',
  });
  check('full watch returns 200', full.status === 200, `got ${full.status}`);
  check('full watch credited', full.json.credited === true, JSON.stringify(full.json));
  check('full watch fraudScore is number', typeof full.json.fraudScore === 'number');
  check('full watch creatorNst is number', typeof full.json.creatorNst === 'number');
  check('full watch creatorNst > 0', full.json.creatorNst > 0, String(full.json.creatorNst));
  check('full watch signals is array', Array.isArray(full.json.signals));

  console.log('\n== engagement reward ==');
  const like = await call('POST', '/api/monetization/reward/like', { videoId, viewerId });
  check('like reward returns 200', like.status === 200, `got ${like.status}`);
  check('like reward has credited field', typeof like.json.credited === 'boolean');

  const sub = await call('POST', '/api/monetization/reward/subscribe', { videoId, viewerId });
  check('subscribe reward returns 200', sub.status === 200, `got ${sub.status}`);

  const bogus = await call('POST', '/api/monetization/reward/bogus', { videoId, viewerId });
  check('unknown reward kind rejected', bogus.status === 404 || bogus.status === 400, `got ${bogus.status}`);

  console.log('\n== wallet ==');
  const unauthWallet = await call('GET', '/api/monetization/wallet');
  check('wallet requires auth', unauthWallet.status === 401, `got ${unauthWallet.status}`);

  const wallet = await call('GET', '/api/monetization/wallet', null, token);
  check('wallet returns 200', wallet.status === 200, `got ${wallet.status}`);
  check('wallet.balanceNst is number', typeof wallet.json.balanceNst === 'number');
  check('wallet.lifetimeCreatorNst is number', typeof wallet.json.lifetimeCreatorNst === 'number');
  check('wallet.lifetimeViewerNst is number', typeof wallet.json.lifetimeViewerNst === 'number');
  check('wallet.lifetimePaidNst is number', typeof wallet.json.lifetimePaidNst === 'number');
  check('wallet.platformNst is number', typeof wallet.json.platformNst === 'number');
  check('wallet.earningsByKind is array', Array.isArray(wallet.json.earningsByKind));
  check('wallet.recentLedger is array', Array.isArray(wallet.json.recentLedger));
  check('wallet.payouts is array', Array.isArray(wallet.json.payouts));
  if (wallet.json.recentLedger?.length) {
    const e = wallet.json.recentLedger[0];
    check('ledger entry has kind', typeof e.kind === 'string');
    check('ledger entry has role', typeof e.role === 'string');
    check('ledger entry has nst', typeof e.nst === 'number');
    check('ledger entry has status', typeof e.status === 'string');
    check('ledger entry has videoId', typeof e.videoId === 'string');
    check('ledger entry has createdAt', typeof e.createdAt === 'string');
  }
  check('creator was credited in ledger', wallet.json.lifetimeCreatorNst > 0, String(wallet.json.lifetimeCreatorNst));

  console.log('\n== studio ==');
  const studio = await call('GET', '/api/monetization/studio', null, token);
  check('studio returns 200', studio.status === 200, `got ${studio.status}`);
  check('studio.videos is array', Array.isArray(studio.json.videos));
  const t = studio.json.totals || {};
  check('totals.videos is number', typeof t.videos === 'number');
  check('totals.views is number', typeof t.views === 'number');
  check('totals.earnedNst is number', typeof t.earnedNst === 'number');
  check('totals.revenuePerThousandViewsNst is number', typeof t.revenuePerThousandViewsNst === 'number');
  check('totals.revenuePerViewNst is number', typeof t.revenuePerViewNst === 'number');
  check('totals.completionRate is number', typeof t.completionRate === 'number');
  check('totals.watchHours is number', typeof t.watchHours === 'number');
  if (studio.json.videos?.length) {
    const sv = studio.json.videos[0];
    check('studio video has earnedNst', typeof sv.earnedNst === 'number');
    check('studio video has isShort bool', typeof sv.isShort === 'boolean');
    check('studio video has watchSeconds', typeof sv.watchSeconds === 'number');
  }

  console.log('\n== address validation ==');
  const goodAddr = await call('GET', '/api/monetization/validate-address?address=nano_1111111111111111111111111111111111111111111111111111hifc8npp&network=NANO');
  check('valid nano address accepted', goodAddr.status === 200, `got ${goodAddr.status}`);
  check('validation reports valid=true', goodAddr.json.valid === true, JSON.stringify(goodAddr.json));

  const badAddr = await call('GET', '/api/monetization/validate-address?address=not-an-address&network=NANO');
  check('bad address reports valid=false', badAddr.json.valid === false, JSON.stringify(badAddr.json));

  const badNet = await call('GET', '/api/monetization/validate-address?address=nano_1111111111111111111111111111111111111111111111111111hifc8npp&network=DOGE');
  check('unsupported network rejected', badNet.status === 400 || badNet.json.valid === false, JSON.stringify(badNet.json).slice(0, 160));

  console.log('\n== payout validation order ==');
  const lowAmount = await call('POST', '/api/monetization/payout', {
    amountNst: 1, destAddress: 'nano_1111111111111111111111111111111111111111111111111111hifc8npp', destNetwork: 'NANO',
  }, token);
  check('below-minimum payout rejected', lowAmount.status === 400, `got ${lowAmount.status}`);
  check('below-minimum names the minimum', /minimum/i.test(lowAmount.json.error || ''), lowAmount.json.error);

  const badAddress = await call('POST', '/api/monetization/payout', {
    amountNst: 500, destAddress: 'garbage', destNetwork: 'NANO',
  }, token);
  check('bad address rejected', badAddress.status === 400, `got ${badAddress.status}`);
  // Address validation must be reported before the balance check, otherwise a
  // caller cannot tell a typo from an empty wallet.
  check('bad address error mentions address', /address/i.test(badAddress.json.error || ''), badAddress.json.error);

  const validAddrInsuff = await call('POST', '/api/monetization/payout', {
    amountNst: 500, destAddress: 'nano_1111111111111111111111111111111111111111111111111111hifc8npp', destNetwork: 'NANO',
  }, token);
  check('valid address with no balance reports balance', /balance/i.test(validAddrInsuff.json.error || ''), validAddrInsuff.json.error);

  const unauthPayout = await call('POST', '/api/monetization/payout', {
    amountNst: 500, destAddress: 'nano_1111111111111111111111111111111111111111111111111111hifc8npp', destNetwork: 'NANO',
  });
  check('payout requires auth', unauthPayout.status === 401, `got ${unauthPayout.status}`);

  console.log('\n== memo-required network ==');
  const memoCfg = cfg.json.memoNetworks || [];
  if (memoCfg.length) {
    const net = memoCfg[0];
    const noMemo = await call('POST', '/api/monetization/payout', {
      amountNst: 500, destAddress: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh', destNetwork: net,
    }, token);
    check(`payout on ${net} without memo rejected`, noMemo.status === 400, `got ${noMemo.status}`);
    check('error explains memo requirement', /memo|tag/i.test(noMemo.json.error || ''), noMemo.json.error);
  }

  console.log('\n== rate limit / abuse ==');
  const burst = [];
  for (let i = 0; i < 3; i++) {
    burst.push(await call('POST', '/api/monetization/accrue', {
      videoId, viewerId: 'android-burst', seconds: 120, completed: true, deviceId: 'android-device-2',
    }));
  }
  check('repeat accruals are answered', burst.every(r => r.status === 200), burst.map(r => r.status).join(','));
  check('accrual fraudScore is always numeric', burst.every(r => typeof r.json.fraudScore === 'number'));

  console.log('\n== payout success path ==');
  // Earning 100 NST through /accrue would need ~1400 distinct viewers, so the
  // wallet is topped up directly as a fixture. This exercises the payout route
  // itself; the earning path is already covered by the accrue assertions above.
  db.prepare("UPDATE wallets SET nst_micro = ? WHERE owner_id = ?").run(150_000_000, userId);

  const okPayout = await call('POST', '/api/monetization/payout', {
    amountNst: 100, destAddress: 'nano_1111111111111111111111111111111111111111111111111111hifc8npp', destNetwork: 'NANO',
  }, token);
  check('valid payout accepted', okPayout.status === 200, JSON.stringify(okPayout.json).slice(0, 200));
  check('payout returns id', typeof okPayout.json.id === 'string' && okPayout.json.id.length > 10);
  check('payout status approved', okPayout.json.status === 'approved', okPayout.json.status);
  check('payout amount echoes 100', okPayout.json.amountNst === 100, String(okPayout.json.amountNst));
  check('payout is flagged testnet', okPayout.json.testnet === true);
  check('payout normalizes network', okPayout.json.destNetwork === 'NANO');
  check('payout needsMemo false for NANO', okPayout.json.needsMemo === false);
  check('low-value payout has no timelock', okPayout.json.timelockUntil === null, String(okPayout.json.timelockUntil));

  // The balance must have been debited exactly once.
  const afterPayout = await call('GET', '/api/monetization/wallet', null, token);
  check('balance debited by exactly 100', Math.abs(afterPayout.json.balanceNst - 50) < 1e-6, String(afterPayout.json.balanceNst));
  check('lifetimePaidNst reflects the payout', Math.abs(afterPayout.json.lifetimePaidNst - 100) < 1e-6, String(afterPayout.json.lifetimePaidNst));
  check('payout recorded in history', afterPayout.json.payouts.some(p => p.id === okPayout.json.id));
  check('payout history entry is approved', afterPayout.json.payouts.find(p => p.id === okPayout.json.id)?.status === 'approved');

  console.log('\n== high-value timelock ==');
  db.prepare("UPDATE wallets SET nst_micro = ? WHERE owner_id = ?").run(500_000_000_000, userId);
  const bigPayout = await call('POST', '/api/monetization/payout', {
    amountNst: 20000, destAddress: 'nano_1111111111111111111111111111111111111111111111111111hifc8npp', destNetwork: 'NANO',
  }, token);
  check('high-value payout accepted', bigPayout.status === 200, JSON.stringify(bigPayout.json).slice(0, 200));
  check('high-value payout is timelocked', bigPayout.json.status === 'timelocked', bigPayout.json.status);
  check('timelockUntil is set', typeof bigPayout.json.timelockUntil === 'string' && bigPayout.json.timelockUntil.length >= 19, String(bigPayout.json.timelockUntil));
  check('timelock note explains the window', /review window/i.test(bigPayout.json.note || ''), bigPayout.json.note);

  const tl = Date.parse((bigPayout.json.timelockUntil || '').replace(' ', 'T') + 'Z');
  const hoursOut = (tl - Date.now()) / 3_600_000;
  check('timelock is ~24h in the future', hoursOut > 23.5 && hoursOut < 24.5, hoursOut.toFixed(2) + 'h');

  // A memo-network payout must carry its tag through to the stored record.
  console.log('\n== memo-network payout with tag ==');
  const xlmPayout = await call('POST', '/api/monetization/payout', {
    amountNst: 100, destAddress: 'GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37',
    destNetwork: 'XLM', destMemo: '12345',
  }, token);
  check('memo-network payout accepted with tag', xlmPayout.status === 200, JSON.stringify(xlmPayout.json).slice(0, 200));
  check('memo network reports needsMemo true', xlmPayout.json.needsMemo === true, String(xlmPayout.json.needsMemo));

  db.close();

  console.log(`\n=== ${pass} passed, ${fail} failed ===`);
  if (failures.length) console.log('failed: ' + failures.join(' | '));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('harness error', e); process.exit(1); });
