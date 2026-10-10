import {orderD1Export} from './order-d1-export.mjs';
import {existsSync,mkdirSync,readFileSync,writeFileSync,unlinkSync,chmodSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {resolve} from 'node:path';
if(!existsSync('dist/server/wrangler.json'))throw Error('Build the project first.');
mkdirSync('backups',{recursive:true});
const output='backups/qst-'+new Date().toISOString().replace(/[:.]/g,'-')+'.sql';
// This pinned Wrangler does not accept --persist-to for export. Its local
// export state is relative to the config file, so use a temporary root config
// with the same D1 identity rather than exporting the wrong empty database.
const built=JSON.parse(readFileSync('dist/server/wrangler.json','utf8'));
const config=resolve('.qst-local-backup-'+randomUUID()+'.json');
let status=1;
try{
  writeFileSync(config,JSON.stringify({name:'qst-local-backup',compatibility_date:built.compatibility_date,d1_databases:built.d1_databases}),{mode:0o600,flag:'wx'});
  const result=spawnSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','export','DB','--local','--config',config,'--output',output],{stdio:'inherit'});
  status=result.status??1;
}finally{if(existsSync(config))unlinkSync(config);}
if(status!==0)process.exit(status);
writeFileSync(output,orderD1Export(readFileSync(output,'utf8')));
chmodSync(output,0o600);
console.log('Saved '+output+'. This backup includes private accounts and academic records. Keep it private.');
