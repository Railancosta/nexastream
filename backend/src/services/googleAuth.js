/**
 * Google OAuth service.
 *
 * Exchanges an authorization code (from the frontend Google Sign-In flow) for
 * Google access/ID tokens, then retrieves the user profile via the Google
 * userinfo endpoint. Uses only Node built-ins + axios (already a dependency) so
 * no extra OAuth library is required.
 *
 * Requires GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_OAUTH_REDIRECT in env.
 * If those are unset, exchangeCodeForProfile throws an explicit "not configured"
 * error rather than silently succeeding — matching the platform's honest-status
 * principle (no fake auth).
 */
const axios = require('axios');
const config = require('../config');

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

function assertConfigured() {
  if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET || !config.GOOGLE_OAUTH_REDIRECT) {
    const err = new Error('Google OAuth is not configured on the server.');
    err.code = 'GOOGLE_NOT_CONFIGURED';
    throw err;
  }
}

/**
 * Exchange an authorization code for Google tokens and return the profile.
 * @param {string} code Authorization code from the frontend.
 * @returns {Promise<{sub:string,email:string,email_verified?:boolean,name?:string,picture?:string}|null>}
 */
async function exchangeCodeForProfile(code) {
  assertConfigured();

  let tokens;
  try {
    const resp = await axios.post(TOKEN_URL, new URLSearchParams({
      code,
      client_id: config.GOOGLE_CLIENT_ID,
      client_secret: config.GOOGLE_CLIENT_SECRET,
      redirect_uri: config.GOOGLE_OAUTH_REDIRECT,
      grant_type: 'authorization_code'
    }).toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000
    });
    tokens = resp.data;
  } catch (err) {
    const status = err.response?.status;
    const detail = err.response?.data?.error_description || err.response?.data?.error || err.message;
    throw new Error(`Google token exchange failed${status ? ` (${status})` : ''}: ${detail}`);
  }

  if (!tokens.access_token) {
    throw new Error('Google token exchange returned no access token');
  }

  const profileResp = await axios.get(USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
    timeout: 10000
  });

  const p = profileResp.data;
  if (!p || !p.email) return null;
  return {
    sub: p.sub,
    email: p.email,
    email_verified: p.email_verified === true || p.email_verified === 'true',
    name: p.name,
    picture: p.picture
  };
}

/**
 * Build the Google consent URL the frontend should redirect to.
 * @returns {string}
 */
function getAuthorizationUrl(state) {
  assertConfigured();
  const params = new URLSearchParams({
    client_id: config.GOOGLE_CLIENT_ID,
    redirect_uri: config.GOOGLE_OAUTH_REDIRECT,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
    state: state || ''
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

module.exports = {
  exchangeCodeForProfile,
  getAuthorizationUrl,
  isConfigured: () => !!(config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET && config.GOOGLE_OAUTH_REDIRECT)
};
