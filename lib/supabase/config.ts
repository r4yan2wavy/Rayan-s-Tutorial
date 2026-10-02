export function publicSupabaseConfig(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)return null;
  try{const parsed=new URL(url);if(!['https:','http:'].includes(parsed.protocol))return null;if(process.env.NODE_ENV==='production'&&parsed.protocol!=='https:')return null}catch{return null}
  return {url,key};
}
export function requireSupabaseConfig(){const config=publicSupabaseConfig();if(!config)throw Object.assign(new Error('Sign-in is being configured. Please try again later.'),{status:503});return config}
