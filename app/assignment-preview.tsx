"use client";
import {useEffect,useState} from 'react';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {api,Busy} from './ui';
export function AssignmentPreview({id,onClose}:any){
  const [data,setData]=useState<any>(null),[error,setError]=useState('');
  useEffect(()=>{let alive=true;api('assignment-preview/'+id).then(r=>{if(alive)setData(r);}).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false;};},[id]);
  return <Dialog open onOpenChange={v=>!v&&onClose()}><DialogContent className="modal-scroll" style={{maxWidth:850}}><DialogHeader><DialogTitle>{data?.assignment.title||'Assignment preview'}</DialogTitle><DialogDescription>Staff preview shows explanations and creates no student submission. Previewed answers count as prior exposure.</DialogDescription></DialogHeader>{error&&<div className="alert error" role="alert">{error}</div>}{!data&&!error&&<Busy/>}{data?.assignment.items.map((item:any,i:number)=><article className="review-item" key={item.id}><h3>{i+1}. {item.stem}</h3>{item.passage&&<details><summary>Read {item.passage.title}</summary>{item.passage.paragraphs.map((p:string,n:number)=><p key={n} className="small" style={{whiteSpace:'pre-wrap',marginTop:14}}>{n+1}. {p}</p>)}</details>}<p className="small">Correct answer: {item.options?.find((o:any)=>o.id===item.key)?.text||item.key}</p><ol className="small">{item.steps.map((step:string,n:number)=><li key={n}>{step}</li>)}</ol></article>)}</DialogContent></Dialog>;
}

export function SubmissionActions({attempt}:any){
  const [due,setDue]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  if(!attempt.assignmentId)return null;
  const act=async(route:string,body:any)=>{setBusy(true);setError('');setMessage('');try{await api(route,{assignmentId:attempt.assignmentId,userId:attempt.userId,...body});setMessage(route==='extension'?'Individual deadline extended.':'One additional attempt approved.');}catch(e:any){setError(e.message);}finally{setBusy(false);}};
  return <section className="panel" style={{marginTop:20}}><h2>Individual assignment support</h2><div className="form-grid" style={{marginTop:16}}><label>New due date (your local time)<input type="datetime-local" value={due} onChange={e=>setDue(e.target.value)}/></label><div className="actions" style={{alignItems:'flex-end'}}><button className="btn" disabled={busy||!due} onClick={()=>act('extension',{due:new Date(due).toISOString()})}>Extend deadline</button><button className="btn" disabled={busy} onClick={()=>act('approve-retry',{})}>Approve a retry</button></div></div>{error&&<p className="alert error" role="alert">{error}</p>}{message&&<p className="alert success" role="status">{message}</p>}<p className="small muted" style={{marginTop:14}}>These changes apply only to this recipient. Previous attempts and grades are retained; an expired attempt stays closed.</p></section>;
}
