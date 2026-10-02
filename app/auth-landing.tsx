'use client';
import Landing from './landing';
import {safeNext} from '@/lib/auth/redirects';
export default function AuthLanding({initialAuth=null,initialError='',next='/dashboard'}:{initialAuth?:'login'|'signup'|null;initialError?:string;next?:string}){
  return <Landing initialAuth={initialAuth} initialError={initialError} next={safeNext(next)} onAuthenticated={()=>window.location.assign(safeNext(next))}/>;
}
