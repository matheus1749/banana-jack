const res = await fetch('https://vivacious-patience-production.up.railway.app/api/v1/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Origin': 'https://vivacious-patience-production.up.railway.app'
  },
  body: JSON.stringify({
    tenantId: '11111111-1111-1111-1111-111111111111',
    email: 'admin@restaurante.com',
    password: 'admin123'
  })
});
console.log('status:', res.status);
console.log('cors header:', res.headers.get('access-control-allow-origin'));
const body = await res.json();
console.log('body:', JSON.stringify(body).substring(0, 100));
