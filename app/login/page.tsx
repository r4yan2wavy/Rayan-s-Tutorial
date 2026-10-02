import {redirect} from 'next/navigation';
import AuthLanding from '../auth-landing';
import {currentAuthUser} from '@/lib/auth/user';
import {safeNext} from '@/lib/auth/redirects';
export const dynamic='force-dynamic';
export default async function AuthPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const query=await searchParams,next=safeNext(query.next);
  if(await currentAuthUser())redirect(next);
  const error=query.error==='access_denied'?'Google sign-in was cancelled. Please try again, or use email and password.':query.error?'We could not finish Google sign-in. Please try again.':'';
  return <AuthLanding initialAuth="login" initialError={error} next={next}/>;
}
