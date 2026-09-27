import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const { POST } = await import('../src/app/api/auth/phone/verify-otp/route.js');

  const req = new Request('http://localhost:3000/api/auth/phone/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: '9876543210',
      accessToken: 'WIDGET_VERIFIED_12345',
      otp: '757325',
    }),
  });

  console.log('Sending request to /api/auth/phone/verify-otp...');
  const res = await POST(req);
  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Response body:', data);
  console.log('Cookies set:', res.headers.get('set-cookie'));
  process.exit(0);
}

main().catch((err) => {
  console.error('Route error:', err);
  process.exit(1);
});
