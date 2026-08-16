/**
 * Google Analytics 4 (Measurement Protocol) integration.
 *
 * Sends server-side events to GA4. Requires GA_MEASUREMENT_ID (G-XXXX) and
 * GA_API_SECRET. When not configured, calls are no-ops that return early — the
 * app keeps working but no data is sent, rather than throwing.
 *
 * Client-side GA is also expected to be initialized in the frontend; this module
 * covers server-side events (signups, payouts, deposits) that may not have a
 * pageview.
 */
const config = require('../config');

const ENDPOINT = 'https://www.google-analytics.com/mp/collect';

function configured() {
  return !!(config.GA_MEASUREMENT_ID && config.GA_API_SECRET);
}

/**
 * Send a GA4 event.
 * @param {string} clientId  Anonymous client id (e.g. user id hash or session id).
 * @param {string} eventName GA4 event name (e.g. 'sign_up', 'deposit_completed').
 * @param {object} params    Event params.
 */
async function track(clientId, eventName, params = {}) {
  if (!configured()) return false;
  try {
    const axios = require('axios');
    const url = `${ENDPOINT}?measurement_id=${encodeURIComponent(config.GA_MEASUREMENT_ID)}&api_secret=${encodeURIComponent(config.GA_API_SECRET)}`;
    const body = {
      client_id: clientId || 'server',
      events: [{ name: eventName, params }]
    };
    await axios.post(url, body, { timeout: 5000 });
    return true;
  } catch (err) {
    // GA failure must never break the request that triggered the event.
    // eslint-disable-next-line no-console
    console.error('[ga] track failed:', err.message);
    return false;
  }
}

module.exports = { track, configured };
