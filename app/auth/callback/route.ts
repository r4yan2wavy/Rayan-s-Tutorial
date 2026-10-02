import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {configuredOrigin,safeNext} from '@/lib/auth/redirects';
import {ensureProfile} from '@/lib/auth/user';
import {cookies} from 'next/headers';
import {publicSupabaseConfig} from '@/lib/supabase/config';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function GET(request:Request){
  const url=new URL(request.url);let origin:string;
  try{origin=configuredOrigin(process.env)}catch{return new Response('Sign-in is being configured. Return to the login page and try again later.',{status:503,headers:{'Cache-Control':'private, no-store','Content-Type':'text/plain;charset=UTF-8'}})}
  function finish(path:string){const response=NextResponse.redirect(origin+path);response.headers.set('Cache-Control','private, no-store');response.headers.set('Pragma','no-cache');response.headers.set('Expires','0');return response}
  const code=url.searchParams.get('code');
  if(url.searchParams.has('error')||!code||code.length>4096)return finish('/login?error=oauth');
  async function failed(){
    // A partially completed OAuth exchange must not leave a broken session
    // that immediately redirects away from the friendly login error.
    const config=publicSupabaseConfig();
    if(config){const prefix='sb-'+new URL(config.url).hostname.split('.')[0]+'-auth-token',store=await cookies();for(const cookie of store.getAll())if(cookie.name===prefix||cookie.name.startsWith(prefix+'.')||cookie.name.startsWith(prefix+'-'))store.set(cookie.name,'',{maxAge:0,path:'/'})}
    return finish('/login?error=oauth');
  }
  try{
    const supabase=await createClient();const {error}=await supabase.auth.exchangeCodeForSession(code);
    if(error)return failed();
    const {data,error:userError}=await supabase.auth.getUser();
    if(userError||!data.user)return failed();
    await ensureProfile(data.user);
    return finish(safeNext(url.searchParams.get('next')));
  }catch{return failed()}
}
