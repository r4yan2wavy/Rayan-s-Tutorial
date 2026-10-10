"use client";
import { useState } from 'react';
import { AlertDialog,AlertDialogContent,AlertDialogHeader,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel } from '@/components/ui/alert-dialog';
import { api } from './ui';

export function UserAccessActions({person,actor,onSaved}:any) {
  const [action,setAction]=useState<'revoke'|'restore'|null>(null);
  const [reason,setReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const restore=person.state==='revoked';
  const canRestore=actor.role==='admin'||(person.revoked_by===actor.id&&person.enrollment==='active');
  return <>
    {(!restore||canRestore)&&<button className={'btn '+(restore?'':'danger')} onClick={()=>{setError('');setAction(restore?'restore':'revoke');}}>{restore?'Restore access':'Revoke access'}</button>}
    <AlertDialog open={!!action} onOpenChange={open=>{if(!open&&!busy)setAction(null);}}>
      <AlertDialogContent><AlertDialogHeader>
        <AlertDialogTitle>{action==='restore'?'Restore access for':'Revoke access for'} {person.name}?</AlertDialogTitle>
        <AlertDialogDescription>{action==='restore'
          ? 'A fresh login will be required. Previous sessions and interrupted attempts stay closed; student enrollment and classroom relationships still govern access.'
          : `This blocks ${person.username} throughout the portal and all classes, including existing sessions. Academic records are retained.${person.role==='teacher'?' Students keep their own access; an administrator can reassign the classes.':''}`}</AlertDialogDescription>
      </AlertDialogHeader>
      {action==='revoke'&&<label>Private reason (optional)<textarea value={reason} maxLength={1000} onChange={e=>setReason(e.target.value)}/></label>}
      {error&&<div className="alert error" role="alert">{error}</div>}
      <AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel><button disabled={busy} className={'btn '+(action==='revoke'?'danger':'dark')} onClick={async()=>{
        setBusy(true);setError('');try{await api(action==='revoke'?'revoke-access':'restore-access',{id:person.id,reason});setAction(null);setReason('');onSaved();}catch(e:any){setError(e.message);}finally{setBusy(false);}
      }}>{busy?'Saving…':action==='restore'?'Restore access':'Revoke access'}</button></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}

export function AccessUnavailable() {
  return <div className="alert" role="status" style={{marginBottom:24}}><strong>Your session or account access is inactive.</strong><p>Please log in again. If your account or enrollment has been paused or revoked, contact your teacher or call or text 718-913-7706.</p><a className="btn" href="/login" style={{marginTop:12}}>Return to login</a></div>;
}
