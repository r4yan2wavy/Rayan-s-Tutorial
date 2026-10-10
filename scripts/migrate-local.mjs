import {existsSync,readdirSync,readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const config='dist/server/wrangler.json';
if(!existsSync(config))throw Error('Run npm run build before applying local migrations.');
const args=['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config',config,'--persist-to','.wrangler/state'];
function execute(extra,json=false){const r=spawnSync(process.execPath,[...args,...extra,...(json?['--json']:[])],{encoding:'utf8'});if(r.status!==0){process.stderr.write(r.stderr||'');process.stderr.write(r.stdout||'');throw Error('Local migration failed. Preserve the database and investigate before retrying.');}return json?JSON.parse(r.stdout.trim()):r.stdout;}
const results=execute(['--command',"SELECT name FROM sqlite_master WHERE type='table' AND name IN ('users','qst_local_migrations')"],true);
const names=results.flatMap(r=>r.results||[]).map(r=>r.name);
if(names.includes('users')&&!names.includes('qst_local_migrations'))throw Error('An existing database has no local migration ledger. Do not replay initial migrations. Back it up and use the upgrade instructions in README.md.');
execute(['--command','CREATE TABLE IF NOT EXISTS qst_local_migrations (name TEXT PRIMARY KEY NOT NULL)']);
const applied=new Set(execute(['--command','SELECT name FROM qst_local_migrations'],true).flatMap(r=>r.results||[]).map(r=>r.name));
const files=readdirSync('drizzle').filter(f=>/^\d+_[\w-]+\.sql$/.test(f)).sort();
for(const file of files){
  if(applied.has(file))continue;
  if(!readFileSync('drizzle/'+file,'utf8').trim())throw Error('Empty migration: '+file);
  execute(['--file','drizzle/'+file]);
  execute(['--command',"INSERT INTO qst_local_migrations (name) VALUES ('"+file+"')"]);
  console.log('Applied '+file);
}
console.log('Local database is ready. These commands do not deploy or contact a hosted database.');
