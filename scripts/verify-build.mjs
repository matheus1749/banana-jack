import { readFileSync, readdirSync } from 'fs';
const files = readdirSync('frontend/dist/assets');
const jsFile = files.find(f => f.endsWith('.js'));
const js = readFileSync(`frontend/dist/assets/${jsFile}`, 'utf8');
const hasLocalhost = js.includes('localhost');
const hasRailway = js.includes('railway.app');
console.log('JS file:', jsFile);
console.log('Has localhost:', hasLocalhost);
console.log('Has railway.app:', hasRailway);
