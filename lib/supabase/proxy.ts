import {createServerClient} from '@supabase/ssr';
import {NextResponse,type NextRequest} from 'next/server';
import {publicSupabaseConfig} from './config';
import {safeNext} from '@/lib/auth/redirects';
const protectedPaths=['/dashboard','/practice','/diagnostic','/mock','/results','/profile','/mistakes','/mastery','/analytics','/admin'];
export async function updateSession(request:NextRequest){
  let response=NextResponse.next({request});const config=publicSupabaseConfig();
  const protectedPage=protectedPaths.some(path=>request.nextUrl.pathname===path||request.nextUrl.pathname.startsWith(path+'/'));
  function redirect(path:string){const url=new URL(path,request.nextUrl.origin);if(path==='/login')url.searchParams.set('next',safeNext(request.nextUrl.pathname+request.nextUrl.search));const next=NextResponse.redirect(url);for(const c of response.cookies.getAll())next.cookies.set(c);for(const key of ['Cache-Control','Expires','Pragma'])if(response.headers.has(key))next.headers.set(key,response.headers.get(key)!);next.headers.set('Cache-Control','private, no-store');return next}
  if(!config)return protectedPage?redirect('/login'):response;
  try{
    const supabase=createServerClient(config.url,config.key,{cookieOptions:{sameSite:'lax',secure:request.nextUrl.protocol==='https:'},cookies:{getAll(){return request.cookies.getAll()},setAll(values,headers){for(const {name,value}of values)request.cookies.set(name,value);response=NextResponse.next({request});for(const {name,value,options}of values)response.cookies.set(name,value,options);for(const [name,value]of Object.entries(headers??{}))response.headers.set(name,value)}}});
    const {data,error}=await supabase.auth.getClaims();const signedIn=!error&&!!data?.claims?.sub;
    if(protectedPage&&!signedIn)return redirect('/login');
    // A verified JWT can outlive its server-side user/session. Login and signup
    // pages use getUser() before redirecting, matching the protected layout and
    // allowing a stale session to recover without a login/dashboard loop.
    if(protectedPage)response.headers.set('Cache-Control','private, no-store');return response;
  }catch{return protectedPage?redirect('/login'):response}
}
