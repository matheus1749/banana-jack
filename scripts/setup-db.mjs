import pg from 'pg';
import { readFileSync } from 'fs';

function stripBOM(str) {
  return str.charCodeAt(0) === 0xFEFF ? str.slice(1) : str;
}

const { Pool } = pg;

const DATABASE_URL = 'postgresql://postgres:LIhmfbiWolXvhBuINCXAjBrBlpUNSSpo@hopper.proxy.rlwy.net:25713/railway';

const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const schema = stripBOM(readFileSync('db/schema.sql', 'utf8'));
  const seed   = stripBOM(readFileSync('db/seed.sql',   'utf8'));

  console.log('Rodando schema...');
  await pool.query(schema);
  console.log('✅ Schema criado');

  console.log('Rodando seed...');
  await pool.query(seed);
  console.log('✅ Seed inserido');

  await pool.end();
  console.log('Banco configurado com sucesso!');
}

run().catch((err) => { console.error('❌', err.message); process.exit(1); });
