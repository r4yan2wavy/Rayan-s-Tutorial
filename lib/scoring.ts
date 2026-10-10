import { EXAM } from './exam';
import { ability } from './adaptive';
import { isCorrect, type Item } from './content/math';

type SectionCurve = {
  points: { ability: number; scaled: number }[];
  residual95: [number, number];
};
export type Calibration = {
  version: string;
  title: string;
  examYear: number;
  admissionYear: number;
  grade: number;
  abilityModel: string;
  contentRelease: string;
  precision: number;
  source: {
    description: string; url: string; permissions: string;
    sampleSize: number; heldOutSize: number; validationSummary: string;
    representativeness: string; sectionErrors: { ELA: number; Math: number };
  };
  sections: { ELA: SectionCurve; Math: SectionCurve };
};

export function validateCalibration(value: unknown): Calibration {
  const c = value as Calibration;
  const text = (v: unknown, min = 10) => typeof v === 'string' && v.trim().length >= min && v.length <= 4000;
  const finite = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
  if (!c || !text(c.version, 3) || !/^[a-z0-9._-]{3,80}$/i.test(c.version) || !text(c.title, 3)) throw Error('Supply a stable version ID and title.');
  if (c.examYear !== EXAM.administrationYear || c.admissionYear !== EXAM.admissionYear || ![8,9].includes(c.grade)) throw Error('The calibration must match the configured exam year and Grade 8 or Grade 9 track.');
  if (c.abilityModel !== EXAM.abilityModel || c.contentRelease !== EXAM.contentRelease) throw Error('This mapping does not match the app’s ability model and content release.');
  if (![1,5,10].includes(c.precision)) throw Error('Use a supported score precision of 1, 5, or 10 points.');
  const s = c.source;
  if (!s || !text(s.description) || !text(s.permissions,20) || !text(s.validationSummary,40) || !text(s.representativeness,20)) throw Error('Document the source, permissions, representative sample, and held-out validation.');
  try { const url = new URL(s.url); if (url.protocol !== 'https:') throw Error(); } catch { throw Error('Supply an HTTPS source reference.'); }
  if (!Number.isInteger(s.sampleSize) || !Number.isInteger(s.heldOutSize) || s.sampleSize < 30 || s.heldOutSize < 10 || s.heldOutSize >= s.sampleSize) throw Error('Supply the actual sample and separate held-out sample sizes (minimum 30 and 10). These minima alone do not establish accuracy.');
  for (const subject of ['ELA','Math'] as const) {
    const section = c.sections?.[subject];
    if (!section || !Array.isArray(section.points) || section.points.length < 3 || section.points.length > 100) throw Error(subject + ': supply 3–100 validated ability-to-score points.');
    for (let i=0;i<section.points.length;i++) {
      const p = section.points[i], previous = section.points[i-1];
      if (!finite(p.ability) || !finite(p.scaled) || p.ability < -3 || p.ability > 3 || p.scaled < 0 || (previous && (p.ability <= previous.ability || p.scaled < previous.scaled))) throw Error(subject + ': use finite, ordered, nondecreasing mapping points within the app’s ability range.');
    }
    if (!Array.isArray(section.residual95) || section.residual95.length !== 2 || !section.residual95.every(finite) || section.residual95[0] > 0 || section.residual95[1] < 0) throw Error(subject + ': supply the measured held-out residual interval around zero.');
    if (!finite(s.sectionErrors?.[subject]) || s.sectionErrors[subject] <= 0) throw Error(subject + ': supply a positive held-out prediction error.');
  }
  // Reconstruct a bounded payload. Unrecognized fields cannot become executable configuration.
  return {
    version:c.version,title:c.title,examYear:c.examYear,admissionYear:c.admissionYear,
    grade:c.grade,abilityModel:c.abilityModel,contentRelease:c.contentRelease,precision:c.precision,
    source:{description:s.description,url:s.url,permissions:s.permissions,sampleSize:s.sampleSize,heldOutSize:s.heldOutSize,validationSummary:s.validationSummary,representativeness:s.representativeness,sectionErrors:{ELA:s.sectionErrors.ELA,Math:s.sectionErrors.Math}},
    sections:Object.fromEntries(['ELA','Math'].map(subject=>{
      const v=c.sections[subject as 'ELA'|'Math'];
      return [subject,{points:v.points.map(p=>({ability:p.ability,scaled:p.scaled})),residual95:[...v.residual95]}];
    })) as Calibration['sections'],
  };
}

function interpolate(curve: SectionCurve, value: number) {
  const points=curve.points;
  if (value < points[0].ability || value > points[points.length-1].ability) return null;
  const right = points.findIndex(p=>p.ability >= value);
  if (right === 0) return points[0].scaled;
  const a=points[right-1],b=points[right];
  return a.scaled+(b.scaled-a.scaled)*(value-a.ability)/(b.ability-a.ability);
}

export function summarizeAttempt(a: any, calibration: Calibration|null = null, exposure = false) {
  const items:Item[]=JSON.parse(a.items),answers:Record<string,unknown>=JSON.parse(a.answers);
  let correct=0,answered=0;
  const domains:Record<string,{subject:string;topic:string;correct:number;total:number}>={};
  const sections={ELA:{correct:0,answered:0,total:0},Math:{correct:0,answered:0,total:0}};
  items.forEach((it,index)=>{
    const key=it.subject+':'+it.topic;
    domains[key]??={subject:it.subject,topic:it.topic,correct:0,total:0};domains[key].total++;
    const section=sections[it.subject as 'ELA'|'Math'];if(section)section.total++;
    if(answers[index]!==undefined){answered++;if(section)section.answered++;if(isCorrect(it,answers[index])){correct++;domains[key].correct++;if(section)section.correct++;}}
  });
  const estimates={ELA:ability(items,answers,'ELA'),Math:ability(items,answers,'Math')};
  const conditions=JSON.parse(a.conditions||'{}');
  let reason:string|null=null;
  if(a.mode!=='diagnostic')reason='Only a full-length diagnostic can receive a SHSAT-scale estimate.';
  else if(!['submitted','expired'].includes(a.state))reason='This attempt was interrupted, abandoned, or is unfinished.';
  else if(items.length!==100||sections.ELA.total!==50||sections.Math.total!==50||answered!==100)reason='The diagnostic is incomplete.';
  else if(!a.deadline||a.deadline-a.started!==EXAM.standardMinutes*60000)reason='These test conditions differ from the standard timed diagnostic.';
  else if(exposure||conditions.priorExposure)reason='Previously exposed answer keys make this attempt unsuitable for an independent score estimate.';
  const eligible=!reason;
  let numeric:any=null,status=calibration?'Approved local practice mapping':'SHSAT score estimate not yet calibrated';
  if(eligible&&calibration&&calibration.grade===a.grade){
    const ela=interpolate(calibration.sections.ELA,estimates.ELA.estimate),math=interpolate(calibration.sections.Math,estimates.Math.estimate);
    if(ela===null||math===null){reason='The performance falls outside this mapping’s validated coverage.';status='Outside calibration coverage';}
    else {
      const round=(v:number)=>Math.round(v/calibration.precision)*calibration.precision;
      const interval=(subject:'ELA'|'Math',v:number)=>[Math.max(0,round(v+calibration.sections[subject].residual95[0])),round(v+calibration.sections[subject].residual95[1])];
      const ei=interval('ELA',ela),mi=interval('Math',math);
      numeric={total:round(ela+math),ELA:round(ela),Math:round(math),sectionIntervals:{ELA:ei,Math:mi},interval:[ei[0]+mi[0],ei[1]+mi[1]],intervalNote:'Combined section residual bounds from the approved held-out validation; this is not a claimed 95% coverage interval for the total.',mappingVersion:calibration.version};
    }
  } else if(calibration&&calibration.grade!==a.grade) status='No approved mapping for this grade track';
  return {
    correct,answered,total:items.length,sections,topics:Object.values(domains),ability:estimates,
    scoreEstimate:numeric,calibration:status,
    eligibility:{eligible:eligible&&!reason,reason:reason||(!calibration?'A defensible SHSAT-scale mapping has not been approved.':'Standard complete diagnostic')},
    modelVersion:EXAM.abilityModel,examVersion:EXAM.version,examYear:EXAM.administrationYear,admissionYear:EXAM.admissionYear,grade:a.grade,
    mappingVersion:numeric?.mappingVersion||null,contentRelease:EXAM.contentRelease,
    contentVersions:items.map(i=>({id:i.id,version:i.version})),conditions,
    label:a.mode==='diagnostic'?'Independent limited-bank diagnostic practice':'Practice result',
    readiness:answered<10?'More independent evidence needed':correct/answered>=0.8?'Strong performance on sampled skills':correct/answered>=0.5?'Developing sampled skills':'Focus on foundations and mistake review',
    method:'A subject-specific difficulty-band practice model; not the NYCPS operational algorithm. SHSAT-scale results require an approved locally validated mapping.',
  };
}
