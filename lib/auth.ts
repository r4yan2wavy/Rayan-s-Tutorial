import {scryptAsync} from '@noble/hashes/scrypt.js';
import {bytesToHex,hexToBytes} from '@noble/hashes/utils.js';
import {sha256} from '@noble/hashes/sha2.js';
export const randomToken=()=>bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
export const digest=(s:string)=>bytesToHex(sha256(new TextEncoder().encode(s)));
export const same=(a:string,b:string)=>{let v=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)v|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return v===0};
export async function hashPassword(p:string,salt=randomToken().slice(0,32)){const h=await scryptAsync(p,hexToBytes(salt),{N:16384,r:8,p:5,dkLen:32,maxmem:24*1024*1024});return `scrypt-v1$${salt}$${bytesToHex(h)}`}
export async function verifyPassword(p:string,h:string){const parts=h.split('$');if(parts[0]!=='scrypt-v1')return false;return same(await hashPassword(p,parts[1]),h)}
export function username(s:any){if(typeof s!=='string')throw new Error('Enter a username.');s=s.trim().toLowerCase();if(!/^[a-z0-9][a-z0-9_.-]{2,39}$/.test(s))throw new Error('Use 3–40 letters, numbers, dots, underscores, or hyphens for the username.');return s}
export function password(s:any){if(typeof s!=='string'||s.length<12||s.length>128)throw new Error('Use a password with 12–128 characters.');return s}
export function cookie(req:Request,t:string,clear=false){let secure=new URL(req.url).protocol==='https:'||req.headers.get('origin')?.startsWith('https:');return `qst_session=${clear?'':t}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${clear?0:86400}${secure?'; Secure':''}`}
