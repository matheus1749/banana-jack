import { readFileSync } from 'fs';
const js = readFileSync('frontend/dist/assets/index-B3teFraw.js', 'utf8');
const idx = js.indexOf('localhost');
console.log('localhost found at:', idx);
if (idx > -1) console.log('context:', js.substring(idx - 50, idx + 80));
const idx2 = js.indexOf('API_URL');
console.log('API_URL found at:', idx2);
if (idx2 > -1) console.log('context:', js.substring(idx2 - 20, idx2 + 100));
