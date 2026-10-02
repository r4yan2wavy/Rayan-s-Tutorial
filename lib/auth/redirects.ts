const destinations=new Set(['/dashboard','/practice','/diagnostic','/mock','/results','/profile','/mistakes','/mastery','/analytics']);
export function safeNext(value:unknown,fallback='/dashboard'){
  if(typeof value!=='string'||!value.startsWith('/')||value.startsWith('//')||/[\\\u0000-\u0020]/.test(value))return fallback;
  try{const decoded=decodeURIComponent(value);if(decoded.startsWith('//')||/[\\\u0000-\u0020]/.test(decoded))return fallback;const url=new URL(value,'https://internal.invalid');if(url.origin!=='https://internal.invalid'||!destinations.has(url.pathname))return fallback;return url.pathname+url.search}catch{return fallback}
}
export function configuredOrigin(env:Record<string,string|undefined>){
  const value=env.VERCEL_ENV==='preview'&&env.VERCEL_URL?'https://'+env.VERCEL_URL:env.NEXT_PUBLIC_SITE_URL;
  if(!value)throw new Error('Site URL is not configured.');const url=new URL(value),local=['localhost','127.0.0.1'].includes(url.hostname);
  if(url.username||url.password||url.pathname!=='/'||url.search||url.hash||(!local&&url.protocol!=='https:')||!['https:','http:'].includes(url.protocol))throw new Error('Invalid site URL configuration.');
  if(env.VERCEL_ENV==='production'&&local)throw new Error('Production URL cannot be localhost.');
  if(env.VERCEL_ENV==='preview'&&!url.hostname.endsWith('.vercel.app'))throw new Error('Invalid preview URL configuration.');return url.origin;
}
