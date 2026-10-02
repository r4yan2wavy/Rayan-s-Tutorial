import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
// Run only on a trusted computer. Neither JSON file belongs in Git.
if(process.argv.includes('--help')||process.argv.length<4){console.log('Usage: pnpm db:import-legacy migration-input/legacy.json migration-input/user-map.json\nlegacy.json: object of table-name arrays; profiles must omit passwords, hashes, salts, and sessions.\nuser-map.json: {"old-profile-uuid":"new-supabase-auth-uuid"}. Create the Supabase users first.');process.exit(0)}
if(existsSync('.env.local'))process.loadEnvFile('.env.local');
const {database,withDatabaseSetup,closeDatabase}=await import('../db/index');
const fields:Record<string,string[]>={passages:['id','title','difficulty','type','content','data','status'],questions:['id','subject','skill','difficulty','passage_id','fingerprint','data','status','created'],test_sessions:['id','user_id','type','status','created','expires','updated','version','data'],answers:['session_id','question_id','user_id','answer','correct','seconds','updated'],question_exposure:['user_id','question_id','first_seen','last_seen','times_seen','session_id','session_type'],results:['session_id','user_id','created','data'],mistakes:['user_id','question_id','original_answer','created','status'],mock_tests:['id','title','data','status'],content_batches:['id','user_id','created','data']};
try{
  const legacy=JSON.parse(await readFile(process.argv[2],'utf8')),map=JSON.parse(await readFile(process.argv[3],'utf8'));
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if(!legacy||Array.isArray(legacy)||!map||Array.isArray(map))throw Error('Invalid input');
  if(legacy.auth_sessions||legacy.google_auth_challenges||JSON.stringify(legacy.profiles||[]).match(/"(?:password|password_hash|salt|access_token|refresh_token)"\s*:/i))throw Error('Export contains credentials; remove them first');
  const destinations=new Set<string>();
  for(const [oldId,newId] of Object.entries(map)){if(!uuid.test(oldId)||typeof newId!=='string'||!uuid.test(newId)||destinations.has(newId))throw Error('Each legacy user must map to one distinct Supabase UUID');destinations.add(newId)}
  const mapped=(id:string)=>{if(id==='system')return id;const value=map[id];if(!value)throw Error('Missing trusted user mapping');return value};
  await withDatabaseSetup(async()=>{
    const db=database();
    for(const id of destinations)if(!await db.prepare('SELECT id FROM auth.users WHERE id=?').bind(id).first())throw Error('A mapped Supabase user does not exist');
    const statements=[];
    for(const profile of legacy.profiles||[]){const id=mapped(profile.id);statements.push(db.prepare('UPDATE profiles SET role=?,created=? WHERE id=?').bind(profile.role==='admin'?'admin':'student',Number(profile.created),id))}
    for(const [table,columns] of Object.entries(fields)){
      const rows=legacy[table]||[];if(!Array.isArray(rows))throw Error('Table must contain an array');
      for(let i=0;i<rows.length;i+=80){const chunk=rows.slice(i,i+80),values:unknown[]=[];
        for(const row of chunk)for(const column of columns){let value=row[column]??null;if(column==='user_id')value=mapped(String(value));values.push(value)}
        statements.push(db.prepare(`INSERT INTO ${table}(${columns.join(',')}) VALUES ${chunk.map(()=>`(${columns.map(()=>'?').join(',')})`).join(',')} ON CONFLICT DO NOTHING`).bind(...values));
      }
    }
    await db.batch(statements);
  });
  console.log('Legacy content and progress imported. Existing session/question IDs preserved; users now use Supabase credentials.');
}catch{console.error('Import failed and was rolled back. Check input files, distinct UUID mappings, existing Auth users, and required content IDs. No credentials were printed.');process.exitCode=1}finally{await closeDatabase()}
