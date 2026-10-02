import {redirect} from 'next/navigation';
import Platform from '../../platform';
import {currentAuthUser,ensureProfile} from '@/lib/auth/user';
export default async function AdminPage(){
  const user=await currentAuthUser();if(!user)redirect('/login');
  const profile=await ensureProfile(user);if(profile.role!=='admin')redirect('/dashboard');
  return <Platform initialView="admin"/>;
}
