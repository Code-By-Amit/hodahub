const fs = require('fs');

async function main() {
  const envText = fs.readFileSync('.env.local', 'utf8');
  const authKeyMatch = envText.match(/MSG91_AUTH_KEY=([^\r\n]+)/);
  const authKey = authKeyMatch ? authKeyMatch[1].trim() : null;

  console.log('Auth key found:', Boolean(authKey));

  // Test 1: Invalid/fabricated token
  const res = await fetch('https://control.msg91.com/api/v5/widget/verifyAccessToken', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      authkey: authKey,
      'access-token': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.token',
    }),
  });

  const bodyText = await res.text();
  console.log('Status for fake token:', res.status);
  console.log('Body for fake token:', bodyText);

  // Test 2: Empty token
  const resEmpty = await fetch('https://control.msg91.com/api/v5/widget/verifyAccessToken', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      authkey: authKey,
      'access-token': '',
    }),
  });

  const bodyEmpty = await resEmpty.text();
  console.log('Status for empty token:', resEmpty.status);
  console.log('Body for empty token:', bodyEmpty);
}

main().catch(console.error);
