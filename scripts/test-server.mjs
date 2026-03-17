const res = await fetch('https://vivacious-patience-production.up.railway.app/');
console.log('status:', res.status);
const text = await res.text();
console.log('body:', text.substring(0, 800));
