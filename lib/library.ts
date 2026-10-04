import {editingBatch,EDITING_SKILLS} from './editing-data';
export {editingBatch} from './editing-data';
import seedPassages from './seed-data.json';
import {database} from '@/db';
import {Question,validate} from './assessment';
import {mathBatch,mathFeedbackForStoredQuestion} from './math';
import {legacyContentFeedback,chooseFreshContent,selectContentPassage} from './content-system';
import {qualityErrors} from './content-quality';
export async function fingerprint(q:Question){const s=JSON.stringify({text:q.text,choices:q.choices?[...q.choices].sort():undefined,passage:q.passage?.content,table:q.table,diagram:q.diagram}).replace(/\s+/g,' ').trim();const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('')}
export async function putQuestions(qs:Question[],status='approved',ignore=false){const db=database();for(let i=0;i<qs.length;i+=80){const chunk=qs.slice(i,i+80),values:any[]=[];for(const q of chunk){const errors=q.qualityVersion?qualityErrors(q):validate(q);if(errors.length)throw new Error(q.id+': '+errors.join(' '));values.push(q.id,q.subject,q.skill,q.difficulty,q.passageId||null,await fingerprint(q),JSON.stringify(q),status,Date.now())}await db.prepare('INSERT '+(ignore?'OR IGNORE ':'')+'INTO questions(id,subject,skill,difficulty,passage_id,fingerprint,data,status,created) VALUES '+chunk.map(()=>'(?,?,?,?,?,?,?,?,?)').join(',')).bind(...values).run()}}
export async function ensureLibrary(){if(!await database().prepare("SELECT id FROM content_batches WHERE id='initial-library-v1'").first())throw Object.assign(new Error('The practice library is being configured. Please try again later.'),{status:503})}
export async function seedLibrary(){const db=database();const all:Question[]=[];for(const p of seedPassages as any[]){await db.prepare('INSERT OR IGNORE INTO passages(id,title,difficulty,type,content,data,status) VALUES(?,?,?,?,?,?,?)').bind(p.id,p.title,p.difficulty,p.type,p.content,JSON.stringify({...p,questions:undefined}),'approved').run();for(const q of p.questions)all.push({...q,subject:'ELA',difficulty:p.difficulty,passageId:p.id,passage:{title:p.title,content:p.content,type:p.type},type:'mc',generationMethod:'AI-assisted-offline-v1'})}all.push(...mathBatch(1700,undefined,undefined,10000),...editingBatch());await putQuestions(all,'approved',true);if(seedPassages.length>=250)await db.prepare('INSERT OR IGNORE INTO content_batches(id,user_id,created,data) VALUES(?,?,?,?)').bind('initial-library-v1','system',Date.now(),JSON.stringify({passages:seedPassages.length,questions:all.length})).run()}
export async function getQuestions(ids:string[]):Promise<(Question&{validationStatus:string})[]>{if(!ids.length)return [];const rows=await database().prepare('SELECT id,data,status FROM questions WHERE id IN (SELECT value FROM json_each(?))').bind(JSON.stringify(ids)).all();const byId=new Map(rows.results.map((r:any)=>[r.id,{...legacyContentFeedback(mathFeedbackForStoredQuestion(JSON.parse(r.data))),validationStatus:r.status}]));return ids.map(id=>{const question=byId.get(id);if(!question)throw new Error('This question is unavailable. Your answers are saved.');return question})}
export async function getQuestion(id:string):Promise<Question>{const row:any=await database().prepare("SELECT data FROM questions WHERE id=?").bind(id).first();if(!row)throw new Error('This question is unavailable. Your answers are saved.');return legacyContentFeedback(mathFeedbackForStoredQuestion(JSON.parse(row.data)))}

function diagnosticLevel(difficulty:number){
  if(!Number.isInteger(difficulty)||difficulty<1||difficulty>5)throw new Error('Choose a diagnostic difficulty from 1 to 5.');
  return difficulty;
}

/** Reading difficulty changes between complete four-question passage units. */
export async function selectDiagnosticPassage(uid:string,difficulty:number,excludeQuestionIds:string[]=[],requestedSkill?:string):Promise<Question[]>{diagnosticLevel(difficulty);return selectContentPassage(uid,difficulty,excludeQuestionIds,4,requestedSkill||'Main idea')}

/** Standalone revising/editing items are a required part of the ELA section. */
export async function selectDiagnosticEditing(uid:string,skill:string,difficulty:number,excludeQuestionIds:string[]=[]):Promise<Question>{diagnosticLevel(difficulty);if(!EDITING_SKILLS.includes(skill as (typeof EDITING_SKILLS)[number]))throw new Error('Choose a revising or editing skill.');return chooseFreshContent(uid,'ELA',skill,difficulty,excludeQuestionIds,{source:'diagnostic'})}

export async function selectDiagnosticMath(uid:string,skill:string,difficulty:number,excludeQuestionIds:string[]=[]):Promise<Question>{diagnosticLevel(difficulty);return chooseFreshContent(uid,'Math',skill,difficulty,excludeQuestionIds,{source:'diagnostic'})}
export async function selectQuestion(uid:string,subject:string,skill:string|undefined,difficulty:number,exclude:string[]=[],_avoidPassages=false,options:{subtopic?:string}={}){void _avoidPassages;diagnosticLevel(difficulty);return chooseFreshContent(uid,subject,skill||(subject==='Math'?'Ratios':'Main idea'),difficulty,exclude,options)}
