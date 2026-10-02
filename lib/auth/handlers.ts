import 'server-only';
import {createClient} from '@/lib/supabase/server';
import {publicSupabaseConfig} from '@/lib/supabase/config';
import {configuredOrigin} from './redirects';
import {currentAuthUser,ensureProfile} from './user';
import {database,withDatabaseUser} from '@/db';
function fail(message:string,status=400):never{throw Object.assign(new Error(message),{status})}
function json(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'private, no-store','Pragma':'no-cache','Expires':'0','X-Content-Type-Options':'nosniff'}})}
export async function authResponse(request:Request,route:string,body:Record<string,unknown>){
  if(route==='auth/config'){
    if(request.method!=='GET')fail('Method not allowed.',405);
    try{return json({enabled:!!publicSupabaseConfig()&&!!process.env.SUPABASE_DB_URL,callbackUrl:configuredOrigin(process.env)+'/auth/callback'})}catch{return json({enabled:false})}
  }
  if(route==='auth/me'){if(request.method!=='GET')fail('Method not allowed.',405);const user=await currentAuthUser();return json({user:user?await ensureProfile(user):null})}
  if(request.method!=='POST')fail('Method not allowed.',405);
  if(request.headers.get('origin')!==new URL(request.url).origin)fail('Request origin is not allowed.',403);
  const supabase=await createClient();
  if(route==='auth/logout'){const {error}=await supabase.auth.signOut({scope:'global'});if(error&&![401,403,404].includes(error.status??0))fail('Could not log out. Please try again.',503);return json({ok:true})}
  if(!['auth/signup','auth/login'].includes(route))fail('Route not found.',404);
  const email=String(body.email||'').toLowerCase().trim(),password=String(body.password||'');
  if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail('Enter a valid email address.');
  if(password.length<10||password.length>128)fail('Use a password between 10 and 128 characters.');
  // Server-side throttling; raw passwords are passed only to Supabase Auth.
  await withDatabaseUser(null,async()=>{const now=Date.now(),key='auth-ip:'+(request.headers.get('x-forwarded-for')?.split(',')[0].trim()||'local'),db=database();await db.prepare('INSERT INTO rate_limits(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires<? THEN 1 ELSE count+1 END,expires=CASE WHEN expires<? THEN ? ELSE expires END').bind(key,now+900000,now,now,now+900000).run();const row=await db.prepare('SELECT count FROM rate_limits WHERE key=?').bind(key).first();if(Number(row?.count)>60)fail('Too many attempts. Please wait before trying again.',429)});
  if(route==='auth/signup'){
    if(password!==body.confirmPassword)fail('Passwords do not match.');
    const name=String(body.name||'').trim();if(!name||name.length>80)fail('Enter your name, using 80 characters or fewer.');
    const {data,error}=await supabase.auth.signUp({email,password,options:{data:{display_name:name}}});
    if(error){if(['user_already_exists','email_exists'].includes(error.code??''))fail('An account already exists for this email. Log in to continue.',409);if(error.code==='weak_password')fail('Choose a stronger password.');fail('Could not create your account. Please try again.',error.status===429?429:400)}
    if(!data.user||!data.session)fail('Sign-up is being configured. Please contact support before trying again.',503);
    return json({user:await ensureProfile(data.user)});
  }
  const {data,error}=await supabase.auth.signInWithPassword({email,password});
  if(error||!data.user){if(error?.status===429)fail('Too many attempts. Please wait before trying again.',429);fail('Incorrect email or password.',401)}
  return json({user:await ensureProfile(data.user)});
}
