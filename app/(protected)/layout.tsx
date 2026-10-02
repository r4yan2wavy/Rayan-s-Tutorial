import {redirect} from 'next/navigation';
import {currentAuthUser,ensureProfile} from '@/lib/auth/user';
export const dynamic='force-dynamic';
export default async function ProtectedLayout({children}:{children:React.ReactNode}){
  const user=await currentAuthUser();
  if(!user)redirect('/login');
  await ensureProfile(user);
  return children;
}
