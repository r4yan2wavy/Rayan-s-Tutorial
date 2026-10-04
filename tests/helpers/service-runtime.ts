import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {isAbsolute,join,relative} from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
import type {ApplicationDatabase} from '../../db/statements';

// Run the actual service and selectors against an isolated PostgreSQL fixture.
// Only database/auth module boundaries are substituted; session logic and SQL
// come directly from production source. No network or real account is used.
export async function serviceRuntime(database:ApplicationDatabase){
  if(!(await database.prepare("SELECT to_regclass('public.content_requests') AS content_requests").first())?.content_requests){
    const migration=await readFile(new URL('../../supabase/migrations/202610030002_content_system.sql',import.meta.url),'utf8');
    for(const statement of migration.split(';').map(text=>text.trim()).filter(Boolean))await database.prepare(statement).run();
  }
  const directory=await mkdtemp(join(tmpdir(),'rayans-diagnostic-test-'));
  const sourceRoot=new URL('../../lib/',import.meta.url);
  const modules=['assessment','curriculum','content-quality','content-system','math','math-v3','editing-data','ela-v3','library','service'];
  for(const name of modules){
    let source=await readFile(new URL(name+'.ts',sourceRoot),'utf8');
    source=source.replace(/import ['"]server-only['"];?/g,'')
      .replace(/(['"])@\/db\1/g,"'./database.mjs'")
      .replace(/(['"])\.\/(?:auth\/handlers|auth\/user|supabase\/server)\1/g,"'./auth-stubs.mjs'")
      .replace(new RegExp("(['\"])\\./("+modules.join('|')+")\\1",'g'),"'./$2.mjs'")
      .replace(/import (\w+) from ['"]\.\/(seed-data|ela-corpus-v3)\.json['"];?/g,(_match,binding,file)=>`import {readFile as readFixtureJson} from 'node:fs/promises'; const ${binding}=JSON.parse(await readFixtureJson(new URL('./${file}.json',import.meta.url),'utf8'));`);
    if(name==='service')source+='\nexport {startSession,sessionAction,viewSession,ownSession,startDiagnosticRemediation};\n';
    const output=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
    await writeFile(join(directory,name+'.mjs'),output);
  }
  for(const file of ['seed-data','ela-corpus-v3'])await writeFile(join(directory,file+'.json'),await readFile(new URL(file+'.json',sourceRoot)));
  await writeFile(join(directory,'database.mjs'),"let current; export const setDatabase=value=>{current=value}; export const database=()=>{if(!current)throw new Error('Missing test database');return current}; export const withDatabaseUser=(_,operation)=>operation();");
  await writeFile(join(directory,'auth-stubs.mjs'),"let verified=null; export const setAuthenticatedUser=user=>{verified=user}; export const currentAuthUser=async()=>verified; export const ensureProfile=async user=>user; const unavailable=()=>{throw new Error('Provider authentication is outside the isolated diagnostic fixture')}; export const authResponse=unavailable,createClient=unavailable;");
  const driver=await import(pathToFileURL(join(directory,'database.mjs')).href);
  const auth=await import(pathToFileURL(join(directory,'auth-stubs.mjs')).href);
  driver.setDatabase(database);
  return{
    service:await import(pathToFileURL(join(directory,'service.mjs')).href),
    library:await import(pathToFileURL(join(directory,'library.mjs')).href),
    math:await import(pathToFileURL(join(directory,'math-v3.mjs')).href),
    content:await import(pathToFileURL(join(directory,'content-system.mjs')).href),
    setAuthenticatedUser:auth.setAuthenticatedUser as (value:{id:string;email:string;role:string;created:number}|null)=>void,
    setDatabase:driver.setDatabase as (value:ApplicationDatabase)=>void,
    async close(){const child=relative(tmpdir(),directory);if(child.startsWith('..')||isAbsolute(child))throw new Error('Unexpected fixture directory');await rm(directory,{recursive:true,force:true})},
  };
}
