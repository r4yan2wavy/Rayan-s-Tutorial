import {existsSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
if(existsSync('.env.local'))process.loadEnvFile('.env.local');
const {withDatabaseSetup,database,closeDatabase}=await import('../db/index');
try{await withDatabaseSetup(async()=>{
 const db=database();
 await db.prepare('INSERT INTO content_worker_config(id,secret,updated) VALUES(1,?,?) ON CONFLICT(id) DO NOTHING').bind(randomBytes(48).toString('hex'),Date.now()).run();
 // Credentials stay in the private database; neither source nor logs contain them.
 await db.prepare('CREATE EXTENSION IF NOT EXISTS pg_cron').run();
 await db.prepare('CREATE EXTENSION IF NOT EXISTS pg_net').run();
 await db.prepare(`SELECT cron.schedule('rayans-content-replenishment','17 7 * * *', $cron$
  SELECT net.http_post(url:='https://rayan-s-tutorial.vercel.app/api/content/replenish',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(SELECT secret FROM public.content_worker_config WHERE id=1)),body:='{}'::jsonb,timeout_milliseconds:=200000);
 $cron$)`).run();
 console.log('Daily replenishment scheduled. External AI remains disabled until free credits and two free-tier models are verified.');
})}catch{console.error('Content worker setup did not complete. Existing sessions are preserved.');process.exitCode=1}finally{await closeDatabase()}
