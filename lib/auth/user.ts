import 'server-only';
import type {User} from '@supabase/supabase-js';
import {createClient} from '@/lib/supabase/server';
import {publicSupabaseConfig} from '@/lib/supabase/config';
import {database,withDatabaseUser} from '@/db';
export type Profile={id:string;email:string;role:'student'|'admin';created:number;display_name:string|null;avatar_url:string|null};
export async function currentAuthUser(){
  if(!publicSupabaseConfig())return null;
  const supabase=await createClient();const {data,error}=await supabase.auth.getUser();
  if(error){if(['AuthSessionMissingError','AuthInvalidJwtError'].includes(error.name)||[401,403].includes(error.status??0))return null;throw Object.assign(new Error('Sign-in is temporarily unavailable. Please try again.'),{status:503})}
  return data.user;
}
export async function ensureProfile(user:User){return withDatabaseUser(user.id,async()=>{
  const db=database(),metadata=user.user_metadata||{};
  await db.prepare('INSERT INTO profiles(id,email,display_name,avatar_url) VALUES(?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(user.id,(user.email||'').toLowerCase(),String(metadata.display_name||metadata.full_name||metadata.name||'').slice(0,80)||null,typeof metadata.avatar_url==='string'?metadata.avatar_url:null).run();
  const row=await db.prepare('SELECT id,email,role,created,display_name,avatar_url FROM profiles WHERE id=?').bind(user.id).first();
  if(!row)throw Object.assign(new Error('Your account could not be opened. Please try again.'),{status:503});return row as Profile;
})}
