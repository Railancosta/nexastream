/**
 * Alerts service.
 *
 * Emits operational alerts through real channels: an HTTP webhook (Slack/Discord
 * incoming webhook or generic), and email via SMTP (nodemailer is lazy-required
 * only if SMTP is configured). Alerts are never silently dropped: if no channel
 * is configured, they are logged at error level so they surface in logs/Promtail.
 *
 * Used by the financial layer for critical events (e.g. withdrawal refund
 * failure) and is the single hook other modules call for "automatic alerts".
 */
const config = require('../config');

const ALERT_WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL || '';
const ALERT_EMAIL_TO = process.env.ALERT_EMAIL_TO || '';

const listeners = [];
function on(fn) { if (typeof fn === 'function') listeners.push(fn); }

async function emit(event, payload) {
  const alert = { event, payload, timestamp: new Date().toISOString(), severity: payload?.severity || 'warn' };
  // Local listeners (e.g. socket fan-out in tests/dev).
  for (const fn of listeners) { try { fn(alert); } catch { /* ignore */ } }

  // Webhook channel.
  if (ALERT_WEBHOOK_URL) {
    try {
      const axios = require('axios');
      await axios.post(ALERT_WEBHOOK_URL, { text: `[NexaStream:${event}] ${JSON.stringify(payload)}`, alert }, { timeout: 5000 });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[alerts] webhook delivery failed for ${event}:`, err.message);
    }
  }

  // Email channel.
  if (ALERT_EMAIL_TO && config.SMTP_USER && config.SMTP_PASS) {
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: config.SMTP_HOST, port: config.SMTP_PORT,
        secure: config.SMTP_PORT === 465,
        auth: { user: config.SMTP_USER, pass: config.SMTP_PASS }
      });
      await transporter.sendMail({
        from: config.SMTP_USER, to: ALERT_EMAIL_TO,
        subject: `[NexaStream Alert] ${event}`,
        text: JSON.stringify(alert, null, 2)
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[alerts] email delivery failed for ${event}:`, err.message);
    }
  }

  // Always log so unconfigured deployments still surface alerts.
  // eslint-disable-next-line no-console
  console.warn(`[alerts] ${event}:`, JSON.stringify(payload));
  return alert;
}

module.exports = { emit, on, isConfigured: () => !!(ALERT_WEBHOOK_URL || (ALERT_EMAIL_TO && config.SMTP_USER)) };
