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
  const directory=await mkdtemp(join(tmpdir(),'rayans-diagnostic-test-'));
  const sourceRoot=new URL('../../lib/',import.meta.url);
  for(const name of ['assessment','math','editing-data','library','service']){
    let source=await readFile(new URL(name+'.ts',sourceRoot),'utf8');
    source=source.replace(/import ['"]server-only['"];?/g,'')
      .replace(/(['"])@\/db\1/g,"'./database.mjs'")
      .replace(/(['"])\.\/(?:auth\/handlers|auth\/user|supabase\/server)\1/g,"'./auth-stubs.mjs'")
      .replace(/(['"])\.\/(assessment|math|editing-data|library)\1/g,"'./$2.mjs'")
      .replace(/import seedPassages from ['"]\.\/seed-data\.json['"];?/,"import {readFile as readSeed} from 'node:fs/promises'; const seedPassages=JSON.parse(await readSeed(new URL('./seed-data.json',import.meta.url),'utf8'));");
    if(name==='service')source+='\nexport {startSession,sessionAction,viewSession,ownSession};\n';
    const output=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
    await writeFile(join(directory,name+'.mjs'),output);
  }
  await writeFile(join(directory,'seed-data.json'),await readFile(new URL('seed-data.json',sourceRoot)));
  await writeFile(join(directory,'database.mjs'),"let current; export const setDatabase=value=>{current=value}; export const database=()=>{if(!current)throw new Error('Missing test database');return current}; export const withDatabaseUser=(_,operation)=>operation();");
  await writeFile(join(directory,'auth-stubs.mjs'),"const unavailable=()=>{throw new Error('Authentication is outside the isolated diagnostic fixture')}; export const authResponse=unavailable,currentAuthUser=unavailable,ensureProfile=unavailable,createClient=unavailable;");
  const driver=await import(pathToFileURL(join(directory,'database.mjs')).href);
  driver.setDatabase(database);
  return{
    service:await import(pathToFileURL(join(directory,'service.mjs')).href),
    library:await import(pathToFileURL(join(directory,'library.mjs')).href),
    setDatabase:driver.setDatabase as (value:ApplicationDatabase)=>void,
    async close(){const child=relative(tmpdir(),directory);if(child.startsWith('..')||isAbsolute(child))throw new Error('Unexpected fixture directory');await rm(directory,{recursive:true,force:true})},
  };
}
