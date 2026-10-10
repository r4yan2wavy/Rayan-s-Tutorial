"use client";
import {useEffect,useState} from 'react';
import {Checkbox} from '@/components/ui/checkbox';
import {api,Choice,download} from './ui';

const dayNames=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
type Plan={minutes:number;focus:string;days:number[]};
export function StudyPlan({data,onStart}:any){
  const[plan,setPlan]=useState<Plan|null>(null),[draft,setDraft]=useState<Plan>({minutes:30,focus:'balanced',days:[1,2,3,4,5]}),[error,setError]=useState(''),[busy,setBusy]=useState(false),[saved,setSaved]=useState('');
  useEffect(()=>{let current=true;api('learning-plan').then(r=>{if(current){setPlan(r.plan);setDraft(r.plan);}}).catch(e=>{if(current)setError(e.message)});return()=>{current=false}},[data.user.id]);
  const save=async(value:Plan)=>{setBusy(true);setError('');setSaved('');try{const r=await api('learning-plan',value);setPlan(r.plan);setDraft(r.plan);setSaved('Study preferences saved to your account.');}catch(e:any){setError(e.message);}finally{setBusy(false);}};
  // The center's local day governs the schedule; no timer or graded deadline is changed.
  const weekday=new Intl.DateTimeFormat('en-US',{weekday:'long',timeZone:'America/New_York'}).format(new Date());
  const due=data.mistakes.filter((m:any)=>m.review_at<Date.now());
  const totals=data.attempts.filter((a:any)=>a.summary).flatMap((a:any)=>a.summary.topics);
  const subject=plan?.focus==='balanced'?(data.coverage.publishedELA>=5&&dayNames.indexOf(weekday)%2===0?'ELA':'Math'):plan?.focus;
  const topics=data.topics.filter((t:any)=>t.grade<=Math.max(8,data.user.grade)&&t.subject===subject);
  const rank=(id:string)=>{const evidence=totals.filter((t:any)=>t.topic===id);const seen=evidence.reduce((n:number,t:any)=>n+t.total,0),correct=evidence.reduce((n:number,t:any)=>n+t.correct,0);return seen>=3?correct/seen:0.6;};
  const target=[...topics].sort((a:any,b:any)=>rank(a.id)-rank(b.id))[0];
  const rest=plan?Math.round(plan.minutes/3):10,practice=plan?plan.minutes-2*rest:10;
  return <section className="panel" style={{marginTop:24}}>
    <div className="section-row"><h2>Your daily study plan</h2><span className="small muted">America/New_York</span></div>
    {error&&<p className="alert error" role="alert">{error}</p>}
    {plan&&<><p className="small muted">{plan.minutes} minutes · {plan.focus==='balanced'?'Math and ELA':plan.focus} · {plan.days.map(d=>dayNames[d].slice(0,3)).join(', ')}</p>
      <p style={{margin:'16px 0'}}>{plan.days.includes(dayNames.indexOf(weekday))?`${weekday}: a focused session is on your plan.`:`${weekday} is a rest day. You can still practice whenever you choose.`}</p>
      <ol className="plan-steps"><li><strong>{rest} minutes:</strong> Read one explanation from your latest result. Write why the correct answer works.</li><li><strong>{practice} minutes:</strong> Try a short {target?.title||'mixed'} practice set. The time is a study suggestion, not a test limit.</li><li><strong>{rest} minutes:</strong> Review {due.length?'a due mistake and try its two-question follow-up':'your new answers and record a question for your teacher'}.</li></ol>
      <div className="actions"><button className="btn dark" disabled={busy||!target} onClick={async()=>{setBusy(true);setError('');try{const r=await api('start',{subject:target.subject,topic:target.id,count:Math.min(10,Math.max(3,Math.round(practice/2)))});onStart(r.id);}catch(e:any){setError(e.message)}finally{setBusy(false)}}}>Start focused practice</button><a className="btn" href="/notebook">Review my mistakes</a></div>
    </>}
    <details style={{marginTop:20}}><summary>Customize your study plan</summary><div className="form-stack" style={{marginTop:18}}>
      <div className="form-grid"><Choice label="Session length" value={String(draft.minutes)} onChange={(v:string)=>setDraft({...draft,minutes:Number(v)})} options={[15,30,45,60].map(n=>({value:String(n),label:n+' minutes'}))}/><Choice label="Study focus" value={draft.focus} onChange={(v:string)=>setDraft({...draft,focus:v})} options={[{value:'balanced',label:'Math and ELA'},'Math','ELA']}/></div>
      <fieldset><legend className="small">Study days</legend><div className="actions" style={{marginTop:10}}>{dayNames.map((name,i)=><label className="inline small" key={name}><Checkbox checked={draft.days.includes(i)} onCheckedChange={v=>setDraft({...draft,days:v?[...draft.days,i]:draft.days.filter(d=>d!==i)})}/>{name.slice(0,3)}</label>)}</div></fieldset>
      <div className="actions"><button className="btn dark" disabled={busy||!draft.days.length} onClick={()=>save(draft)}>Save plan</button><button className="btn" disabled={!plan} onClick={()=>download({format:'qst-study-preferences-v1',...plan},'queens-scholars-study-preferences.json')}>Export preferences</button><label className="btn">Import preferences<input type="file" accept="application/json,.json" style={{maxWidth:200}} onChange={async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>10000)throw Error('Choose a study preference file under 10 KB.');const value=JSON.parse(await file.text());if(value.format!=='qst-study-preferences-v1')throw Error('This is not a Queens Scholars study preference file.');await save({minutes:value.minutes,focus:value.focus,days:value.days});}catch(e:any){setError(e.message)}finally{e.target.value='';}}}/></label></div>
      <p className="small muted">Import changes only your study preferences. Assignments, answers, grades, and access remain controlled by the server.</p><p className="small" role="status">{saved}</p>
    </div></details>
  </section>;
}
