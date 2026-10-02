'use client';
import Link from 'next/link';
import {Button} from '@/components/ui/button';
export default function ErrorPage({reset}:{reset:()=>void}){
  return <main className="boot"><span className="brandmark">R</span><h1>Your studio could not open.</h1><p>Sign-in or saved progress is temporarily unavailable. Please try again.</p><Button onClick={reset}>Try again</Button><Link href="/login">Return to login</Link></main>;
}
