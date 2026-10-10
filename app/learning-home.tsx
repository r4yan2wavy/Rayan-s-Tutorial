"use client";
import {useState} from 'react';
import {BookOpen,Calculator,Target} from 'lucide-react';
import {Heading} from './staff';
import {StudyPlan} from './study-plan';
import {api,Choice,Badge} from './ui';

export function LearningHome({data,onStart,refresh}:any) {
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const active=data.attempts.find((a:any)=>a.state==='in-progress');
  const done=data.attempts.filter((a:any)=>a.summary);
  const diagnostics=done.filter((a:any)=>a.mode==='diagnostic');
  const latest=diagnostics[0];
  const start=async(subject:string)=>{setBusy(true);setError('');try{const a=await api('start',{subject,topic:'mixed',count:10});onStart(a.id);}catch(e:any){setError(e.message);}finally{setBusy(false);}};
  return <>
    <Heading title={`Your next step, ${data.user.name.split(' ')[0]}.`} description="Practice, review, and build your own SHSAT skills."><div style={{minWidth:180}}><Choice label="My SHSAT track" value={String(Math.max(8,data.user.grade))} options={['8','9']} onChange={async(grade:string)=>{try{await api('learning-track',{grade});await refresh();}catch(e:any){setError(e.message);}}}/></div></Heading>
    {error&&<div className="alert error" role="alert">{error}</div>}
    {active&&<div className="join-band" style={{margin:'0 0 24px'}}><div><h3>{active.title}</h3><p className="small muted">Your saved attempt is ready to continue.</p></div><a className="btn dark" href={'/assessment?id='+active.id}>Resume saved work</a></div>}
    <div className="stats-grid">{[[data.attempts.length,'Personal attempts'],[done.length,'Finished sets'],[diagnostics.length,'Full diagnostics'],[data.mistakes.filter((m:any)=>m.review_at<Date.now()).length,'Reviews due']].map(([n,label])=><div className="stat" key={String(label)}><strong>{n}</strong><span>{label}</span></div>)}</div>
    <div className="feature-grid">{[['Math',Calculator,'Put the reasoning into practice.'],['ELA',BookOpen,'Read closely. Support your answer.']].map(([subject,Icon,copy]:any)=><section className="feature" key={subject}><div className="icon-box"><Icon/></div><h2 className="serif">{subject} practice</h2><p>{copy}</p><button className="btn dark" style={{marginTop:20}} disabled={busy||(subject==='ELA'&&data.coverage.publishedELA<10)} onClick={()=>start(subject)}>Start a 10-question set</button>{subject==='ELA'&&data.coverage.publishedELA<10&&<p className="small muted" style={{marginTop:12}}>Reading practice opens when enough questions have been reviewed and published.</p>}</section>)}<section className="feature"><div className="icon-box"><Target/></div><h2 className="serif">Check your progress</h2><p>Take a timed diagnostic, then review the reasoning and focus on missed skills.</p><a className="btn gold" href="/diagnostics" style={{marginTop:20}}>Open diagnostics</a></section></div>
    <div className="workspace-grid" style={{marginTop:24}}><section className="panel"><h2>Latest diagnostic</h2>{latest?<><Badge>{latest.summary.scoreEstimate?'Calibrated local practice estimate':'Calibration unavailable'}</Badge><h3 style={{margin:'16px 0'}}>{latest.summary.scoreEstimate?`Estimated SHSAT score: ${latest.summary.scoreEstimate.total}`:`${latest.summary.correct} of ${latest.summary.total} correct`}</h3><p className="small muted">Practice estimate, not an official score. Compare attempts only when grade, conditions, and mapping are comparable.</p><a className="btn" style={{marginTop:20}} href={'/my-results?id='+latest.id}>Review this diagnostic</a></>:<><p className="small muted">Your diagnostic results will appear here after submission.</p><a className="btn" style={{marginTop:20}} href="/diagnostics">Choose a diagnostic</a></>}</section><section className="panel"><h2>Your mistake notebook</h2><p className="small muted">{data.mistakes.length?`${data.mistakes.length} saved mistakes. Read the explanation, practice two related questions, and plan a spaced review.`:'Missed questions will be saved for focused follow-up practice and spaced review.'}</p><a className="btn" style={{marginTop:20}} href="/notebook">Open my notebook</a><div className="divider"/><a className="subtle-link small" href="/my-results">All personal results</a></section></div>
    <StudyPlan data={data} onStart={onStart}/>
  </>;
}
