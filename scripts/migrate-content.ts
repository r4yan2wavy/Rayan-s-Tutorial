import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
if(existsSync('.env.local'))process.loadEnvFile('.env.local');
const {withDatabaseSetup,database,closeDatabase}=await import('../db/index');
try{await withDatabaseSetup(async()=>{
 const db=database(),existing=await db.prepare("SELECT to_regclass('public.content_requests') AS existing").first();
 if(!existing?.existing){const migration=await readFile(new URL('../supabase/migrations/202610030002_content_system.sql',import.meta.url),'utf8');await db.batch(migration.split(';').map(text=>text.trim()).filter(Boolean).map(text=>db.prepare(text)));}
 console.log(JSON.stringify({migration:'content-v3',installed:!!(await db.prepare("SELECT to_regclass('public.content_worker_config') AS installed").first())?.installed,questions:(await db.prepare('SELECT COUNT(*) AS count FROM questions').first())?.count,databaseBytes:(await db.prepare('SELECT pg_database_size(current_database()) AS bytes').first())?.bytes}));
})}catch{console.error('The additive content migration did not complete.');process.exitCode=1}finally{await closeDatabase()}
