import pg from 'pg';
import { readFileSync } from 'fs';

const { Pool } = pg;
const url = process.argv[2];
const file = process.argv[3];

if (!url || !file) {
  console.error('Usage: node run-sql.mjs <DATABASE_URL> <file.sql>');
  process.exit(1);
}

const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
const sql = readFileSync(file, 'utf8');

try {
  await pool.query(sql);
  console.log(`✅ ${file} executado com sucesso`);
} catch (err) {
  console.error('❌ Erro:', err.message);
  process.exit(1);
} finally {
  await pool.end();
}
