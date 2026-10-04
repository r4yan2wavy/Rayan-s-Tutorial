import {editingBatch,EDITING_SKILLS} from './editing-data';
export {editingBatch} from './editing-data';
import seedPassages from './seed-data.json';
import {database} from '@/db';
import {Question,validate} from './assessment';
import {mathBatch,mathFeedbackForStoredQuestion} from './math';
export async function fingerprint(q:Question){const s=(q.text+'|'+(q.choices||[]).join('|')).toLowerCase().replace(/\s+/g,' ').trim();const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('')}
export async function putQuestions(qs:Question[],status='approved',ignore=false){const db=database();for(let i=0;i<qs.length;i+=80){const chunk=qs.slice(i,i+80),values:any[]=[];for(const q of chunk){const errors=validate(q);if(errors.length)throw new Error(q.id+': '+errors.join(' '));values.push(q.id,q.subject,q.skill,q.difficulty,q.passageId||null,await fingerprint(q),JSON.stringify(q),status,Date.now())}await db.prepare('INSERT '+(ignore?'OR IGNORE ':'')+'INTO questions(id,subject,skill,difficulty,passage_id,fingerprint,data,status,created) VALUES '+chunk.map(()=>'(?,?,?,?,?,?,?,?,?)').join(',')).bind(...values).run()}}
export async function ensureLibrary(){if(!await database().prepare("SELECT id FROM content_batches WHERE id='initial-library-v1'").first())throw Object.assign(new Error('The practice library is being configured. Please try again later.'),{status:503})}
export async function seedLibrary(){const db=database();const all:Question[]=[];for(const p of seedPassages as any[]){await db.prepare('INSERT OR IGNORE INTO passages(id,title,difficulty,type,content,data,status) VALUES(?,?,?,?,?,?,?)').bind(p.id,p.title,p.difficulty,p.type,p.content,JSON.stringify({...p,questions:undefined}),'approved').run();for(const q of p.questions)all.push({...q,subject:'ELA',difficulty:p.difficulty,passageId:p.id,passage:{title:p.title,content:p.content,type:p.type},type:'mc',generationMethod:'AI-assisted-offline-v1'})}all.push(...mathBatch(1700,undefined,undefined,10000),...editingBatch());await putQuestions(all,'approved',true);if(seedPassages.length>=250)await db.prepare('INSERT OR IGNORE INTO content_batches(id,user_id,created,data) VALUES(?,?,?,?)').bind('initial-library-v1','system',Date.now(),JSON.stringify({passages:seedPassages.length,questions:all.length})).run()}
export async function getQuestions(ids:string[]):Promise<(Question&{validationStatus:string})[]>{if(!ids.length)return [];const rows=await database().prepare('SELECT id,data,status FROM questions WHERE id IN (SELECT value FROM json_each(?))').bind(JSON.stringify(ids)).all();const byId=new Map(rows.results.map((r:any)=>[r.id,{...mathFeedbackForStoredQuestion(JSON.parse(r.data)),validationStatus:r.status}]));return ids.map(id=>{const question=byId.get(id);if(!question)throw new Error('This question is unavailable. Your answers are saved.');return question})}
export async function getQuestion(id:string):Promise<Question>{const row:any=await database().prepare("SELECT data FROM questions WHERE id=?").bind(id).first();if(!row)throw new Error('This question is unavailable. Your answers are saved.');return mathFeedbackForStoredQuestion(JSON.parse(row.data))}

function diagnosticLevel(difficulty:number){
  if(!Number.isInteger(difficulty)||difficulty<1||difficulty>5)throw new Error('Choose a diagnostic difficulty from 1 to 5.');
  return difficulty;
}
function unavailable(message:string):never{throw Object.assign(new Error(message),{status:503})}

/** Reading difficulty changes between complete four-question passage units. */
export async function selectDiagnosticPassage(uid:string,difficulty:number,excludeQuestionIds:string[]=[]):Promise<Question[]>{
  const db=database();
  diagnosticLevel(difficulty);
  // Exclusions include every persisted session ID, so even an unseen queued
  // passage cannot be selected again within the same diagnostic.
  const selected:any=await db.prepare(`
    SELECT p.id FROM passages p
    WHERE p.status='approved' AND p.difficulty=?
      AND (SELECT COUNT(*) FROM questions q WHERE q.passage_id=p.id AND q.status='approved' AND q.subject='ELA')=4
      AND NOT EXISTS (
        SELECT 1 FROM questions used
        WHERE used.passage_id=p.id AND used.id IN (SELECT value FROM json_each(?))
      )
    ORDER BY
      CASE WHEN EXISTS (
        SELECT 1 FROM questions q JOIN question_exposure e ON e.question_id=q.id
        WHERE q.passage_id=p.id AND e.user_id=?
      ) THEN 1 ELSE 0 END,
      COALESCE((SELECT MAX(e.last_seen) FROM questions q JOIN question_exposure e ON e.question_id=q.id WHERE q.passage_id=p.id AND e.user_id=?),0),
      p.id
    LIMIT 1
  `).bind(difficulty,JSON.stringify(excludeQuestionIds),uid,uid).first();
  if(!selected)unavailable(`The level ${difficulty} reading library needs another complete passage. Your answers are saved.`);
  const rows=await db.prepare("SELECT id FROM questions WHERE passage_id=? AND status='approved' AND subject='ELA' ORDER BY id").bind(selected.id).all();
  const questions=await getQuestions(rows.results.map((row:any)=>row.id));
  if(questions.length!==4||questions.some(question=>question.subject!=='ELA'||question.difficulty!==difficulty||question.passageId!==selected.id||!question.passage||validate(question).length))unavailable('This passage could not be validated. Your answers are saved.');
  return questions;
}

/** Standalone revising/editing items are a required part of the ELA section. */
export async function selectDiagnosticEditing(uid:string,skill:string,difficulty:number,excludeQuestionIds:string[]=[]):Promise<Question>{
  diagnosticLevel(difficulty);
  if(!EDITING_SKILLS.includes(skill as (typeof EDITING_SKILLS)[number]))throw new Error('Choose a revising or editing skill.');
  const row:any=await database().prepare(`
    SELECT q.id FROM questions q
    LEFT JOIN question_exposure e ON e.question_id=q.id AND e.user_id=?
    WHERE q.status='approved' AND q.subject='ELA' AND q.passage_id IS NULL
      AND q.skill=? AND q.difficulty=? AND q.id LIKE 'edit-v2-%'
      AND q.id NOT IN (SELECT value FROM json_each(?))
    ORDER BY CASE WHEN e.question_id IS NULL THEN 0 ELSE 1 END,COALESCE(e.last_seen,0),q.id
    LIMIT 1
  `).bind(uid,skill,difficulty,JSON.stringify(excludeQuestionIds)).first();
  if(!row)unavailable(`The level ${difficulty} ${skill.toLowerCase()} library is being replenished. Your answers are saved.`);
  const question=await getQuestion(row.id);
  if(question.subject!=='ELA'||question.passageId||question.difficulty!==difficulty||question.skill!==skill||validate(question).length)unavailable('This editing item could not be validated. Your answers are saved.');
  return question;
}

/** Prefer a generated variant; share existing variants only when unseen by the student. */
export async function selectDiagnosticMath(uid:string,skill:string,difficulty:number,excludeQuestionIds:string[]=[]):Promise<Question>{
  diagnosticLevel(difficulty);
  const {MATH_SKILLS}=await import('./assessment');
  if(!MATH_SKILLS.includes(skill))throw new Error('Choose a mathematics skill.');
  const {mathQuestion}=await import('./math');
  for(let attempt=0;attempt<40;attempt++){
    const random=new Uint32Array(1);crypto.getRandomValues(random);
    const question=mathQuestion(skill,difficulty,random[0]%2_000_000_000);
    if(excludeQuestionIds.includes(question.id)||question.subject!=='Math'||question.skill!==skill||question.difficulty!==difficulty||validate(question).length)continue;
    const hash=await fingerprint(question);
    if(await database().prepare('SELECT id FROM questions WHERE fingerprint=? OR id=?').bind(hash,question.id).first())continue;
    await putQuestions([question],'approved',true);
    // A competing request may win the unique fingerprint insertion. Only use
    // this generated ID when that exact item was actually persisted.
    const persisted:any=await database().prepare("SELECT data FROM questions WHERE id=? AND fingerprint=? AND status='approved'").bind(question.id,hash).first();
    if(!persisted)continue;
    if(await database().prepare('SELECT 1 FROM question_exposure WHERE user_id=? AND question_id=?').bind(uid,question.id).first())continue;
    return JSON.parse(persisted.data);
  }
  // The finite procedural templates are deduplicated across the whole library.
  // A globally existing variant is still fresh for a student who has never seen
  // it. Keep its exact skill/level and every persisted session exclusion.
  const shared=await database().prepare(`
    SELECT q.id,q.data FROM questions q
    WHERE q.status='approved' AND q.subject='Math' AND q.passage_id IS NULL
      AND q.skill=? AND q.difficulty=?
      AND (COALESCE(q.data::jsonb->>'generationMethod','') <> 'procedural-v1'
        OR (q.skill='Probability' AND q.data::jsonb->>'type'='grid'))
      AND q.id NOT IN (SELECT value FROM json_each(?))
      AND NOT EXISTS (
        SELECT 1 FROM question_exposure e WHERE e.user_id=? AND e.question_id=q.id
      )
    ORDER BY q.created,q.id
    LIMIT 40
  `).bind(skill,difficulty,JSON.stringify(excludeQuestionIds),uid).all();
  for(const row of shared.results as {id:string;data:string}[]){
    const question:Question=JSON.parse(row.data);
    if(question.id===row.id&&question.subject==='Math'&&!question.passageId&&question.skill===skill&&question.difficulty===difficulty&&!validate(question).length)return question;
  }
  unavailable('A new math question at this level is temporarily unavailable. Your answers are saved; please try again.');
}
export async function selectQuestion(uid:string,subject:string,skill:string|undefined,difficulty:number,exclude:string[]=[],avoidPassages=false){
  const db=database();
  let sql="SELECT q.id FROM questions q LEFT JOIN question_exposure e ON q.id=e.question_id AND e.user_id=? WHERE q.status='approved' AND q.subject=?";
  const args:(string|number)[]=[uid,subject];
  if(skill){sql+=' AND q.skill=?';args.push(skill)}
  if(exclude.length){sql+=' AND q.id NOT IN (SELECT value FROM json_each(?))';args.push(JSON.stringify(exclude))}
  if(avoidPassages){sql+=' AND (q.passage_id IS NULL OR NOT EXISTS(SELECT 1 FROM questions pq JOIN question_exposure pe ON pq.id=pe.question_id WHERE pq.passage_id=q.passage_id AND pe.user_id=?))';args.push(uid)}
  sql+=' ORDER BY CASE WHEN e.question_id IS NULL THEN 0 ELSE 1 END, ABS(q.difficulty-?), COALESCE(e.last_seen,0), q.id LIMIT 1';args.push(difficulty);
  const row=await db.prepare(sql).bind(...args).first();
  if(subject==='Math'){
    const candidate=row?await getQuestion(String(row.id)):undefined;
    // Saved v1 questions retain their choices. New sessions use the corrected
    // generator rather than assigning more students the old offset distractors.
    const qualifiedLegacyGrid=candidate?.skill==='Probability'&&candidate.type==='grid';
    if(candidate&&(candidate.generationMethod!=='procedural-v1'||qualifiedLegacyGrid)&&!await db.prepare('SELECT 1 FROM question_exposure WHERE user_id=? AND question_id=?').bind(uid,candidate.id).first())return candidate;
    return selectDiagnosticMath(uid,skill||candidate?.skill||'Ratios',difficulty,exclude);
  }
  if(!row&&avoidPassages)return selectQuestion(uid,subject,skill,difficulty,exclude,false);
  if(!row)throw new Error('The selected library is temporarily exhausted. Choose another skill or difficulty.');
  return getQuestion(String(row.id));
}
