require('dotenv').config();

const id = process.env.COURSERA_CLIENT_ID;
const sec = process.env.COURSERA_CLIENT_SECRET;
const org = process.env.COURSERA_ORG_ID;

async function getToken(scope) {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: id,
    client_secret: sec,
  });
  if (scope) body.set('scope', scope);
  const res = await fetch('https://api.coursera.com/oauth2/client_credentials/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await res.json();
  return data.access_token;
}

async function probe(scope, path) {
  const token = await getToken(scope);
  const res = await fetch(`https://api.coursera.org${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  const text = await res.text();
  console.log(`${scope || 'no-scope'} ${path} -> ${res.status} ${text.slice(0, 80)}`);
}

(async () => {
  const paths = [
    `/api/businesses.v1/${org}`,
    `/api/businesses.v1/${org}/programs?limit=5`,
    `/api/businesses.v1/${org}/enrollmentReports?limit=1`,
  ];
  for (const scope of [null, 'access_business_api']) {
    for (const path of paths) {
      await probe(scope, path);
    }
  }
})();
