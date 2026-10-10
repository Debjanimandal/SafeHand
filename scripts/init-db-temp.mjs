import { Pool, neonConfig } from 'file:///D:/Proofly/hackstorm/node_modules/.pnpm/@neondatabase+serverless@0.10.4/node_modules/@neondatabase/serverless/index.mjs';
import ws from 'ws';
import { readFileSync } from 'fs';
neonConfig.webSocketConstructor = ws;
const DATABASE_URL = 'postgresql://neondb_owner:npg_T97ixsuHvnrb@ep-sweet-tooth-an32s6zn-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const pool = new Pool({ connectionString: DATABASE_URL });
const client = await pool.connect();
const migrations = ['D:/Proofly/hackstorm/supabase/migrations/20260408_000001_init.sql','D:/Proofly/hackstorm/supabase/migrations/20260408_000002_auth_sessions.sql','D:/Proofly/hackstorm/supabase/migrations/20260408_000003_document_hash.sql'];
for (const path of migrations) { const content = readFileSync(path, 'utf8'); console.log('Running:', path); try { await client.query(content); console.log('  OK'); } catch (e) { console.log('  Note:', e.message); } }
await client.release();
await pool.end();
console.log('Done');
