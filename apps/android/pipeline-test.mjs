#!/usr/bin/env node
/**
 * Full-pipeline test with real media.
 *
 * Uploads actual H.264 files so ffprobe classification and ffmpeg transcoding
 * run for real, then drives the monetization gateway against the resulting
 * video. This is the test that proves the pieces are connected: a fake upload
 * exercises routes, but only a real file exercises the pipeline.
 *
 * Usage: node apps/android/pipeline-test.mjs
 */
import { readFileSync } from 'node:fs';

const BASE = process.env.CORE_URL || 'http://127.0.0.1:3002';
let pass = 0, fail = 0;
const failures = [];

function check(name, cond, detail = '') {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; failures.push(name); console.log(`  FAIL ${name} ${detail}`); }
}

async function call(method, path, body, token) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = {};
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  return { status: res.status, json };
}

async function upload(bytes, title, type, token) {
  const res = await fetch(
    `${BASE}/api/videos/upload?title=${encodeURIComponent(title)}&description=${encodeURIComponent('pipeline test')}&type=${type}`,
    { method: 'PUT', headers: { 'Content-Type': 'video/mp4', Authorization: 'Bearer ' + token }, body: bytes },
  );
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

/** Polls until the video leaves `processing`, or the deadline passes. */
async function waitForReady(videoId, timeoutMs = 180_000) {
  const deadline = Date.now() + timeoutMs;
  let last = null;
  while (Date.now() < deadline) {
    const r = await call('GET', `/api/videos/${videoId}`);
    last = r.json.video;
    if (last && last.status && last.status !== 'processing' && last.status !== 'uploading') return last;
    await new Promise(r => setTimeout(r, 2000));
  }
  return last;
}

(async () => {
  const stamp = Date.now();
  const reg = await call('POST', '/api/auth/register', {
    email: `pipe${stamp}@example.test`, password: 'pipeline-test-pass', username: `pipe${stamp}`,
  });
  check('register ok', reg.status === 200, `got ${reg.status}`);
  const token = reg.json.token;

  console.log('\n== upload a real 45s 640x360 file (should classify as Short) ==');
  const shortBytes = readFileSync('/tmp/e2e_short.mp4');
  const upShort = await upload(shortBytes, 'Pipeline Short 45s', 'video', token);
  check('short upload accepted', upShort.status === 200, JSON.stringify(upShort.json).slice(0, 200));
  const shortId = upShort.json.videoId;
  check('short upload returns videoId', typeof shortId === 'string');

  const shortVideo = await waitForReady(shortId);
  check('short finished processing', shortVideo?.status === 'ready', `status=${shortVideo?.status}`);
  check('short duration probed by ffprobe', Math.abs((shortVideo?.duration || 0) - 45) <= 2,
    `duration=${shortVideo?.duration}`);
  check('45s file classified as Short', shortVideo?.is_short === 1,
    `is_short=${shortVideo?.is_short} duration=${shortVideo?.duration}`);

  console.log('\n== upload a real 120s 1280x720 file (should be long-form) ==');
  const longBytes = readFileSync('/tmp/e2e_long.mp4');
  const upLong = await upload(longBytes, 'Pipeline Long 120s', 'video', token);
  check('long upload accepted', upLong.status === 200, JSON.stringify(upLong.json).slice(0, 200));
  const longId = upLong.json.videoId;

  const longVideo = await waitForReady(longId);
  check('long finished processing', longVideo?.status === 'ready', `status=${longVideo?.status}`);
  check('long duration probed by ffprobe', Math.abs((longVideo?.duration || 0) - 120) <= 2,
    `duration=${longVideo?.duration}`);
  check('120s horizontal file is NOT a Short', longVideo?.is_short === 0,
    `is_short=${longVideo?.is_short}`);

  console.log('\n== transcoding produced real renditions ==');
  const detail = await call('GET', `/api/videos/${longId}`);
  const qualities = detail.json.video?.qualities || [];
  check('qualities array is non-empty', qualities.length > 0, JSON.stringify(qualities));
  check('qualities carry labels', qualities.every(q => typeof q.label === 'string' && q.label.length > 0));
  check('qualities carry urls', qualities.every(q => typeof q.url === 'string' && q.url.length > 0));
  console.log('     renditions: ' + qualities.map(q => q.label).join(', '));

  // Each rendition must actually be fetchable and be a real MP4.
  for (const q of qualities) {
    const res = await fetch(BASE + q.url);
    const buf = Buffer.from(await res.arrayBuffer());
    check(`rendition ${q.label} serves bytes`, res.status === 200 && buf.length > 1000,
      `status=${res.status} bytes=${buf.length}`);
    // ISO-BMFF files carry an 'ftyp' box near the start.
    check(`rendition ${q.label} is a real MP4`, buf.includes(Buffer.from('ftyp')),
      'no ftyp box');
  }

  const thumb = await fetch(BASE + `/storage/thumbs/${longId}.jpg`);
  check('thumbnail was generated', thumb.status === 200, `status=${thumb.status}`);

  console.log('\n== monetization against a real transcoded video ==');
  const viewerId = 'pipeline-viewer-' + stamp;

  const belowMin = await call('POST', '/api/monetization/accrue', {
    videoId: longId, viewerId, seconds: 3, completed: false, deviceId: 'pipeline-dev',
  });
  check('3s watch not credited', belowMin.json.credited === false, JSON.stringify(belowMin.json));

  const realWatch = await call('POST', '/api/monetization/accrue', {
    videoId: longId, viewerId, seconds: 118, completed: true, deviceId: 'pipeline-dev',
  });
  check('118s completed watch credited', realWatch.json.credited === true, JSON.stringify(realWatch.json));
  check('creator paid for the real view', realWatch.json.creatorNst > 0, String(realWatch.json.creatorNst));
  // A first-ever viewer carries a small "new_viewer" risk weight, so the score
  // is low but not necessarily zero. What matters is that it stays well under
  // the rejection threshold and the view is credited.
  check('fraud score is below the reject threshold',
    realWatch.json.fraudScore < 0.7, String(realWatch.json.fraudScore));

  // 0.01 valid_view + 0.02 completion, halved = 0.015 NST to the creator.
  check('creator payout matches the rate table exactly',
    Math.abs(realWatch.json.creatorNst - 0.015) < 1e-9, String(realWatch.json.creatorNst));

  // The client reports recommendation telemetry separately from monetization;
  // both calls happen for a real playback session.
  const watchTelemetry = await call('POST', `/api/videos/${longId}/watch`, {
    seconds: 118, completed: true,
  });
  check('watch telemetry accepted', watchTelemetry.status === 200, `got ${watchTelemetry.status}`);

  console.log('\n== viewer-side watch-to-earn ==');
  const viewerWallet = await call('GET', '/api/monetization/wallet', null, token);
  check('wallet reachable after real playback', viewerWallet.status === 200);

  console.log('\n== studio reflects the real video ==');
  const studio = await call('GET', '/api/monetization/studio', null, token);
  const row = (studio.json.videos || []).find(v => v.id === longId);
  check('studio lists the transcoded video', !!row, 'video missing from studio');
  check('studio records its watch seconds', (row?.watchSeconds || 0) > 0, String(row?.watchSeconds));
  check('studio records its earnings', (row?.earnedNst || 0) > 0, String(row?.earnedNst));
  check('studio counts the completion', (row?.completions || 0) > 0, String(row?.completions));

  console.log(`\n=== ${pass} passed, ${fail} failed ===`);
  if (failures.length) console.log('failed: ' + failures.join(' | '));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('harness error', e); process.exit(1); });
