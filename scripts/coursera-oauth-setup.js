/**
 * One-time Coursera admin OAuth setup for Enterprise API access.
 *
 * Prerequisites:
 * 1. Register app at https://accounts.coursera.org/console
 * 2. Set Redirect URI to: http://localhost:9876/callback
 * 3. COURSERA_CLIENT_ID and COURSERA_CLIENT_SECRET in .env
 *
 * Usage: npm run coursera:auth
 */
require('dotenv').config();

const http = require('http');
const { exec } = require('child_process');

const PORT = parseInt(process.env.COURSERA_OAUTH_PORT || '9876', 10);
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
const AUTH_URL = 'https://accounts.coursera.org/oauth2/v1/auth';
const TOKEN_URL = 'https://accounts.coursera.org/oauth2/v1/token';
const SCOPE = process.env.COURSERA_SCOPE || 'access_business_api';

const clientId = process.env.COURSERA_CLIENT_ID;
const clientSecret = process.env.COURSERA_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error('Missing COURSERA_CLIENT_ID or COURSERA_CLIENT_SECRET in .env');
  process.exit(1);
}

function openBrowser(url) {
  const cmd = process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
  exec(cmd, () => {});
}

async function exchangeCode(code) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: REDIRECT_URI,
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Token exchange failed (${res.status}): ${text}`);
  return JSON.parse(text);
}

const authParams = new URLSearchParams({
  response_type: 'code',
  client_id: clientId,
  redirect_uri: REDIRECT_URI,
  scope: SCOPE,
});

const authorizeUrl = `${AUTH_URL}?${authParams}`;

console.log('\nCoursera Enterprise OAuth setup\n');
console.log('Redirect URI (must match Coursera app console):', REDIRECT_URI);
console.log('\nOpening browser for admin login…\n');
console.log('If the browser does not open, visit:\n', authorizeUrl, '\n');

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname !== '/callback') {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    res.writeHead(400, { 'Content-Type': 'text/html' });
    res.end(`<h1>Authorization failed</h1><p>${error}</p>`);
    console.error('Authorization error:', error);
    server.close();
    process.exit(1);
    return;
  }

  if (!code) {
    res.writeHead(400, { 'Content-Type': 'text/html' });
    res.end('<h1>Missing authorization code</h1>');
    return;
  }

  try {
    const tokens = await exchangeCode(code);
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h1>Success!</h1><p>You can close this tab and return to the terminal.</p>');

    console.log('\n✓ Authorization successful. Add this to backend/.env:\n');
    if (tokens.refresh_token) {
      console.log(`COURSERA_REFRESH_TOKEN=${tokens.refresh_token}`);
    } else {
      console.warn('No refresh_token returned — token may expire; re-run this script if sync fails.');
    }
    console.log('\nRestart the backend, then try Coursera Sync again.\n');
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/html' });
    res.end(`<h1>Token exchange failed</h1><pre>${err.message}</pre>`);
    console.error(err.message);
  } finally {
    server.close();
    process.exit(0);
  }
});

server.listen(PORT, () => {
  openBrowser(authorizeUrl);
});

setTimeout(() => {
  console.error('\nTimed out waiting for authorization (5 min).');
  server.close();
  process.exit(1);
}, 5 * 60 * 1000);
