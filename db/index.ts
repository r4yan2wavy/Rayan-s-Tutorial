import 'server-only';
import {AsyncLocalStorage} from 'node:async_hooks';
import {Pool} from 'pg';
import {ApplicationDatabase,type Transaction} from './statements';
const context=new AsyncLocalStorage<{userId:string|null;setup?:boolean}>();
let pool:Pool|undefined;
function connection(){
  if(!pool){
    const value=process.env.SUPABASE_DB_URL;
    if(!value)throw Object.assign(new Error('The progress database is not configured.'),{status:503});
    const url=new URL(value);
    if(!['postgres:','postgresql:'].includes(url.protocol))throw new Error('Invalid database configuration.');
    for(const name of ['sslmode','sslcert','sslkey','sslrootcert'])url.searchParams.delete(name);
    pool=new Pool({connectionString:url.toString(),ssl:{rejectUnauthorized:true},max:2,idleTimeoutMillis:20000,connectionTimeoutMillis:10000,statement_timeout:30000});
    pool.on('error',()=>console.error('Database connection interrupted.'));
  }
  return pool;
}
export function withDatabaseUser<T>(userId:string|null,operation:()=>Promise<T>){return context.run({userId},operation)}
// Offline setup/import only. No HTTP route exposes this context.
export function withDatabaseSetup<T>(operation:()=>Promise<T>){return context.run({userId:null,setup:true},operation)}
export function database(){
  const transaction:Transaction=async operation=>{
    const scope=context.getStore();if(!scope)throw new Error('Database queries require an authenticated request context.');
    const client=await connection().connect();
    try{
      await client.query('BEGIN');
      if(!scope.setup){await client.query("SELECT set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:scope.userId,role:'authenticated'})]);await client.query('SET LOCAL ROLE rayan_app')}
      const result=await operation(async(text,values)=>{const row=await client.query(text,values);return{rows:row.rows,rowCount:row.rowCount}});
      await client.query('COMMIT');return result;
    }catch(e){await client.query('ROLLBACK').catch(()=>{});throw e}finally{client.release()}
  };
  return new ApplicationDatabase(transaction);
}
export async function closeDatabase(){if(pool){await pool.end();pool=undefined}}
