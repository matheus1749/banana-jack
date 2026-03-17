import { readFileSync, readdirSync } from 'fs';

const files = readdirSync('frontend/dist/assets');
console.log('assets:', files);

const jsFile = files.find(f => f.endsWith('.js'));
const js = readFileSync(`frontend/dist/assets/${jsFile}`, 'utf8');

const idx = js.indexOf('localhost');
console.log('localhost found:', idx > -1);
if (idx > -1) console.log('context:', js.substring(idx - 30, idx + 60));

const idx2 = js.indexOf('railway.app');
console.log('railway.app found:', idx2 > -1);
if (idx2 > -1) console.log('context:', js.substring(idx2 - 30, idx2 + 60));
