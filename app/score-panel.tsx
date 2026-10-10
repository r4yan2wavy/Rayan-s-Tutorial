"use client";
import { useEffect,useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { api,Badge,date } from './ui';

export function ScorePanel({summary}:any) {
  const estimate=summary.scoreEstimate;
  return <section className="panel" style={{marginTop:24}} aria-labelledby="estimate-title">
    <div className="section-row"><h2 id="estimate-title">Estimated SHSAT Score</h2><Badge tone="gold">Practice estimate, not an official score</Badge></div>
    {estimate?<>
      <div className="summary-score"><strong>{estimate.total}</strong><div><h3>Estimated range: {estimate.interval[0]}–{estimate.interval[1]}</h3><p className="small muted">ELA {estimate.ELA} · Math {estimate.Math}</p></div></div>
      <p className="small muted">{estimate.intervalNote}</p>
    </>:<><h3>{summary.calibration}</h3><p className="small muted">{summary.eligibility?.reason||'A defensible score conversion has not been approved. Continue studying with your actual results below.'}</p></>}
    <div className="divider"/>
    <div className="form-grid">{['ELA','Math'].map(subject=>{
      const count=summary.sections?.[subject],model=summary.ability?.[subject];
      return <div key={subject}><h3>{subject}</h3><p className="small">{count?.correct||0} correct · {count?.answered||0} reached · {count?.total||0} questions</p><p className="small muted">Practice ability: {model?.estimate?.toFixed(1)??'Unavailable'} · model uncertainty: {model?.standardError?.toFixed(2)??'Unavailable'}</p></div>;
    })}</div>
    <p className="small" style={{marginTop:16}}>{summary.readiness}</p>
    <details style={{marginTop:16}}><summary className="small">How to interpret this result</summary><p className="small muted" style={{marginTop:10}}>{summary.method} The model’s uncertainty is a heuristic practice measure, separate from the approved mapping’s observed prediction errors.</p><p className="small muted">Exam {summary.examYear} · Admission {summary.admissionYear} · Grade {summary.grade} · Model {summary.modelVersion} · Mapping {summary.mappingVersion||'unavailable'}</p><p className="small muted">This report is saved with the attempt. A later mapping does not silently replace it.</p></details>
  </section>;
}

export function CalibrationManager() {
  const [data,setData]=useState<any>(null),[raw,setRaw]=useState(''),[notes,setNotes]=useState(''),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const load=async()=>{try{setData(await api('calibrations'));}catch(e:any){setError(e.message);}};
  useEffect(()=>{void load();},[]);
  return <section className="panel" style={{marginTop:24,maxWidth:900}}><h2>Score calibration</h2><p className="small muted">Approve a locally validated mapping for the configured exam, grade, content release, and ability model. No conversion is installed by default.</p>
    {error&&<div className="alert error" role="alert" style={{marginTop:14}}>{error}</div>}{message&&<div className="alert success" role="status">{message}</div>}
    {data?.versions.map((v:any)=><details key={v.id} style={{marginTop:18}}><summary>{v.mapping.title} · Grade {v.grade} · {v.id}</summary><p className="small">Approved {date(v.created)} · sample {v.mapping.source.sampleSize} · held-out sample {v.mapping.source.heldOutSize}</p><p className="small">{v.mapping.source.validationSummary}</p><p className="small">Held-out section error: ELA {v.mapping.source.sectionErrors.ELA}, Math {v.mapping.source.sectionErrors.Math}</p><p className="small">{v.notes}</p><a className="subtle-link small" href={v.mapping.source.url} target="_blank" rel="noreferrer">Source and validation reference</a></details>)}
    {data&&!data.versions.length&&<div className="alert" style={{marginTop:20}}>SHSAT score estimate not yet calibrated. Actual counts, topic results, and practice ability remain available.</div>}
    {data?.canImport&&<form className="form-stack" style={{marginTop:24}} onSubmit={async e=>{
      e.preventDefault();setBusy(true);setError('');setMessage('');try{const mapping=JSON.parse(raw);await api('calibration-import',{mapping,notes,confirmReviewed:confirmed});setRaw('');setNotes('');setConfirmed(false);setMessage('Mapping approved. Previously saved reports are preserved.');await load();}catch(e:any){setError(e.message);}finally{setBusy(false);}
    }}><label>Load a calibration JSON file<input type="file" accept="application/json,.json" onChange={async e=>{const file=e.target.files?.[0];if(file){if(file.size>500000){setError('Choose a file smaller than 500 KB.');return;}setRaw(await file.text());}}}/></label><label>Mapping JSON<textarea value={raw} onChange={e=>setRaw(e.target.value)} required style={{minHeight:180,fontFamily:'monospace'}}/></label><label>Independent validation and coverage review<textarea value={notes} onChange={e=>setNotes(e.target.value)} required minLength={40}/></label><label className="check-row"><Checkbox checked={confirmed} onCheckedChange={v=>setConfirmed(v===true)}/>I checked the permissions, year and grade, sample relevance, held-out errors, and residual intervals.</label><button className="btn dark" disabled={busy||!confirmed}>{busy?'Approving…':'Approve calibration version'}</button><p className="small muted">The latest approved mapping for each grade applies only to new finished attempts. Schema checks cannot establish that supplied research is true or representative.</p></form>}
  </section>;
}
