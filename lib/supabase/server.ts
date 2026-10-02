import 'server-only';
import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';
import {requireSupabaseConfig} from './config';
export async function createClient(){
  const {url,key}=requireSupabaseConfig(),store=await cookies();
  const secure=!!process.env.VERCEL||process.env.NEXT_PUBLIC_SITE_URL?.startsWith('https://')===true;
  return createServerClient(url,key,{cookieOptions:{sameSite:'lax',secure},cookies:{getAll(){return store.getAll()},setAll(values){try{for(const {name,value,options}of values)store.set(name,value,options)}catch{/* Server Components refresh cookies through proxy.ts. */}}}});
}
