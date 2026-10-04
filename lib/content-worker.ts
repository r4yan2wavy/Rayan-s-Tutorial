import 'server-only';
import {timingSafeEqual} from 'node:crypto';
import {getVercelOidcToken} from '@vercel/oidc';
import {z} from 'zod';
import {database,withDatabaseSetup} from '@/db';
import {findSubtopic,PASSAGE_GENRES} from './curriculum';
import {qualityErrors,nearDuplicate,QUALITY_VERSION} from './content-quality';
import {freeCreditGate,maximumRequestCost} from './generation-policy';
import {fingerprint} from './library';
import type {Question} from './assessment';

const GATEWAY='https://ai-gateway.vercel.sh/v1';
const passageSchema=z.object({title:z.string().min(8).max(150),content:z.string().min(100).max(11000),genre:z.string().min(3).max(50)});
const tableSchema=z.object({headers:z.array(z.string().min(1).max(120)).min(2).max(8),rows:z.array(z.array(z.union([z.string().max(240),z.number().finite()])).min(2).max(8)).min(1).max(60),caption:z.string().max(300).optional()});
const diagramSchema=z.object({kind:z.enum(['coordinate','angles','shape']),description:z.string().min(20).max(1200),points:z.array(z.object({label:z.string().min(1).max(80),x:z.number().finite(),y:z.number().finite()})).max(30).optional(),segments:z.array(z.object({from:z.string().min(1).max(80),to:z.string().min(1).max(80)})).max(40).optional(),labels:z.array(z.object({text:z.string().min(1).max(120),x:z.number().finite(),y:z.number().finite()})).max(30).optional()});
const itemSchema=z.object({text:z.string().min(25).max(1600),choices:z.array(z.string().trim().min(1).max(400)).length(4),correct:z.number().int().min(0).max(3),structure:z.string().min(8).max(120),scenario:z.string().min(8).max(120),reasoningType:z.string().min(8).max(100),estimatedTime:z.number().int().min(30).max(300),table:tableSchema.optional(),diagram:diagramSchema.optional()});
const batchSchema=z.object({passage:passageSchema.optional(),items:z.array(itemSchema).min(1).max(4)});
const reviewSchema=z.object({items:z.array(z.object({correct:z.number().int().min(0).max(3),oneDefensibleAnswer:z.boolean(),gradeAppropriate:z.boolean(),skillMatches:z.boolean(),difficultyMatches:z.boolean(),howToThink:z.string().min(50),steps:z.array(z.string().min(15)).min(2).max(10),explanation:z.string().min(100),reasons:z.array(z.string().min(35)).length(4),breakthrough:z.string().min(50),commonTrap:z.string().min(35),evidence:z.string().optional(),evidenceExplanation:z.string().optional(),misconceptions:z.array(z.string()).length(4)})).min(1).max(4)});
function parseJson(text:string){return JSON.parse(text.replace(/^\s*```(?:json)?\s*/,'').replace(/\s*```\s*$/,''));}
async function gateway(path:string,token:string,body?:unknown,preserveRaw=false){
 const response=await fetch(GATEWAY+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(55000),cache:'no-store'});
 if(preserveRaw)return{status:response.status,ok:response.ok,body:await response.text()};
 if(!response.ok)throw new Error(response.status===402||response.status===403?'Free AI credits are unavailable.':response.status===429?'Free model rate limit reached.':'Content provider temporarily unavailable.');
 return response.json();
}
export async function authorizeContentWorker(request:Request){
 const bearer=request.headers.get('authorization')?.replace(/^Bearer /,'')||'';
 if(bearer.length<32||bearer.length>200)return false;
 return withDatabaseSetup(async()=>{const row=await database().prepare('SELECT secret FROM content_worker_config WHERE id=1').first();if(!row)return false;const expected=Buffer.from(String(row.secret)),actual=Buffer.from(bearer);return expected.length===actual.length&&timingSafeEqual(expected,actual)});
}
async function complete(token:string,model:string,prompt:string,maxTokens:number){
 const response=await gateway('/chat/completions',token,{model,messages:[{role:'system',content:'You are an expert middle-school SHSAT content editor. Return one JSON object only. Write original material; never copy exam questions. Do not use tools or web searches.'},{role:'user',content:prompt}],max_tokens:maxTokens,temperature:0.4,response_format:{type:'json_object'}},true);
 // Envelope failures are retained alongside successful responses. Parsing the
 // generated JSON happens only after this response and receipt are persisted.
 let raw:Record<string,any>|undefined;try{raw=JSON.parse(response.body)}catch{raw=undefined}
 return{rawResponse:response.body,status:Number(response.status),ok:!!response.ok,text:raw?.choices?.[0]?.message?.content,receipt:{id:typeof raw?.id==='string'?raw.id:undefined,model,tokens:Number(raw?.usage?.total_tokens)||0,inputTokens:Number(raw?.usage?.prompt_tokens)||0,outputTokens:Number(raw?.usage?.completion_tokens)||0}};
}
type Completion=Awaited<ReturnType<typeof complete>>;
function completionData(result:Completion){if(!result.ok)throw new Error(result.status===402||result.status===403?'Free AI credits are unavailable.':result.status===429?'Free model rate limit reached.':'Content provider temporarily unavailable.');if(typeof result.text!=='string')throw new Error('The provider returned no usable content.');return parseJson(result.text)}
export function validateGeneratedBatch(kind:'math'|'reading'|'editing',data:unknown,plannedGenre?:string){
 const draft=batchSchema.parse(data);
 if(draft.items.length!==(kind==='reading'?4:2)||kind==='reading'&&!draft.passage||kind!=='reading'&&draft.passage)throw new Error('The planned batch is incomplete or includes an unplanned passage.');
 if(draft.passage){
  const canonical=PASSAGE_GENRES.find(genre=>genre.toLowerCase()===draft.passage!.genre.trim().toLowerCase());
  if(!canonical)throw new Error('The passage genre is unsupported.');
  if(plannedGenre&&canonical.toLowerCase()!==plannedGenre.trim().toLowerCase())throw new Error('The passage genre does not match the generation plan.');
  draft.passage.genre=canonical;
  const words=draft.passage.content.trim().split(/\s+/u).filter(Boolean).length,poem=canonical==='Poetry';
  if(words<(poem?100:350)||words>(poem?250:800))throw new Error(poem?'An original poem must contain 100–250 words.':'An original prose passage must contain 350–800 words.');
 }
 for(const item of draft.items){
  if(item.table?.rows.some(row=>row.length!==item.table!.headers.length))throw new Error('A generated table has inconsistent dimensions.');
  const labels=item.diagram?.points?.map(point=>point.label)||[];
  if(new Set(labels).size!==labels.length||item.diagram?.segments?.some(segment=>!labels.includes(segment.from)||!labels.includes(segment.to)))throw new Error('A generated diagram has ambiguous or missing endpoints.');
 }
 return draft;
}
/** Called only by a secret-authenticated scheduler. No student information leaves the app. */
export async function runContentWorker(){return withDatabaseSetup(async()=>{
 const db=database(),config=await db.prepare('SELECT enabled,free_verified,monthly_limit_cents,generation_model,review_model FROM content_worker_config WHERE id=1').first();
 if(!config?.enabled||!config.free_verified)return {status:'paused',reason:'Free AI credits are not activated. No paid generation is permitted.'};
 let token:string;try{token=await getVercelOidcToken()}catch{return {status:'paused',reason:'The free-credit provider is not connected.'}}
 const credits=await gateway('/credits',token),balance=Number(credits.balance),period=new Date().toISOString().slice(0,7);
 const policy={enabled:!!config.enabled,freeVerified:!!config.free_verified,monthlyLimitCents:Number(config.monthly_limit_cents)};
 const budget=await db.prepare('SELECT spent_cents,reserved_cents FROM content_budget WHERE period=?').bind(period).first();
 const gate=freeCreditGate(policy,balance,Number(budget?.spent_cents||0),Number(budget?.reserved_cents||0),1);if(gate)return {status:'paused',reason:gate};
 if(!config.generation_model||!config.review_model||config.generation_model===config.review_model)return {status:'paused',reason:'Two different free-tier models must be verified before generation.'};
 const catalog=await gateway('/models',token),generationPrice=catalog.data?.find((m:{id:string})=>m.id===config.generation_model)?.pricing,reviewPrice=catalog.data?.find((m:{id:string})=>m.id===config.review_model)?.pricing;
 if(!generationPrice||!reviewPrice)return {status:'paused',reason:'Current verified model prices are unavailable.'};
 // Reserve a worst-case byte/token ceiling for both independent requests.
 const reserved=maximumRequestCost(18000,7500,generationPrice)+maximumRequestCost(50000,9000,reviewPrice);
 const limit=freeCreditGate(policy,balance,Number(budget?.spent_cents||0),Number(budget?.reserved_cents||0),reserved);if(limit)return {status:'paused',reason:limit};
 const lease=crypto.randomUUID(),now=Date.now();
 // Only one worker can own a lease; expired work retains its cost reservation.
 const job=await db.prepare("UPDATE content_requests SET status='working',updated=?,review=jsonb_build_object('lease',?::text) WHERE id=(SELECT id FROM content_requests WHERE status='queued' ORDER BY created FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *").bind(now,lease).first();
 if(!job)return {status:'idle'};
 const reservation=await db.prepare('INSERT INTO content_budget(period,reserved_cents) VALUES(?,?) ON CONFLICT(period) DO UPDATE SET reserved_cents=content_budget.reserved_cents+excluded.reserved_cents WHERE content_budget.spent_cents+content_budget.reserved_cents+excluded.reserved_cents<=? RETURNING period').bind(period,reserved,policy.monthlyLimitCents).first();
 if(!reservation){await db.prepare("UPDATE content_requests SET status='paused',error=?,updated=? WHERE id=?").bind('Free allowance exhausted.',Date.now(),job.id).run();return {status:'paused'};}
 await db.prepare('UPDATE content_requests SET reserved_cents=?,model=? WHERE id=?').bind(reserved,String(config.generation_model),job.id).run();
 let providerStarted=false;const receipts:Record<string,unknown>[]=[],archive:Record<string,unknown>={providers:{},receipts};
 const saveResponse=async(stage:'generation'|'review',result:Completion)=>{
  receipts.push(result.receipt);
  (archive.providers as Record<string,unknown>)[stage]={rawResponse:result.rawResponse,status:result.status,receipt:result.receipt};
  await db.prepare('UPDATE content_requests SET output=?::jsonb,tokens=?,updated=? WHERE id=?').bind(JSON.stringify(archive),receipts.reduce((sum,r)=>sum+Number(r.tokens||0),0),Date.now(),job.id).run();
 };
 try{
  const topic=findSubtopic(String(job.subtopic));if(!topic)throw new Error('The generation plan has no valid subtopic.');
  const previous=await db.prepare("SELECT data FROM questions WHERE data::jsonb->>'subtopic'=? ORDER BY created DESC LIMIT 250").bind(topic.id).all();
  const recent=previous.results.map(row=>JSON.parse(String(row.data)) as Question);
  const avoidance=recent.slice(0,12).map(q=>({structure:q.structureId,scenario:q.scenarioId,text:q.text}));
  const plan=typeof job.plan==='string'?parseJson(job.plan):job.plan,plannedGenre=typeof plan?.genre==='string'?plan.genre:undefined;
  const prompt=JSON.stringify({task:'Plan and write original SHSAT practice content with a single defensible key. Return {passage?:{title,content,genre},items:[{text,choices:[four options],correct:0to3,structure,scenario,reasoningType,estimatedTime,table?:{headers,rows,caption?},diagram?:{kind:coordinate|angles|shape,description,points?:[{label,x,y}],segments?:[{from,to}],labels?:[{text,x,y}]}}]}. Every table and diagram must contain only given information, without disclosing an unknown answer. Each wrong option must represent a realistic specific misconception.',blueprint:{...topic,difficulty:Number(job.difficulty),reasoningDepth:Number(job.difficulty)+1,grade:'Grade 7 prerequisites; difficulty through interpretation and combined reasoning, never high-school content',count:topic.kind==='reading'?4:2,genre:plannedGenre},readingRequirement:topic.kind==='reading'?'Write a substantive original 350–800 word prose passage or 100–250 word poem. All four questions must test the requested exact subtopic using different evidence and reasoning; include paired texts when the skill calls for comparison.':undefined,genres:PASSAGE_GENRES,avoidRecentlyUsed:avoidance});
  if(Buffer.byteLength(prompt)>16000)throw new Error('The generation plan exceeds its reserved input ceiling.');
  providerStarted=true;const generated=await complete(token,String(config.generation_model),prompt,7500);await saveResponse('generation',generated);
  const generatedData=completionData(generated);archive.draft=generatedData;
  const draft=validateGeneratedBatch(topic.kind,generatedData,plannedGenre);
  // The second model receives stems/choices only: the generator key is withheld.
  const blind=draft.items.map(item=>({text:item.text,choices:item.choices,structure:item.structure,scenario:item.scenario,table:item.table,diagram:item.diagram}));
  const reviewPrompt=JSON.stringify({task:'Independently solve each item and audit its exact skill, difficulty and Grade 7 appropriateness. You have not been given the proposed keys. Return {items:[{correct:0to3,oneDefensibleAnswer,gradeAppropriate,skillMatches,difficultyMatches,howToThink,steps,explanation,reasons:[analysis of each choice in given order],breakthrough,commonTrap,evidence?:exact quote,evidenceExplanation?:interpretation,misconceptions:[specific choice misconception tags; empty for correct or unknown]}]}. Reject any ambiguous item. Teach every calculation with no unexplained numbers. For reading distinguish evidence from inference. For editing teach the precise grammar/revision rule.',blueprint:{...topic,difficulty:Number(job.difficulty)},passage:draft.passage,items:blind});
  if(Buffer.byteLength(reviewPrompt)>48000)throw new Error('The independent review exceeds its reserved ceiling.');
  const reviewed=await complete(token,String(config.review_model),reviewPrompt,9000);await saveResponse('review',reviewed);const reviewedData=completionData(reviewed);
  await db.prepare("UPDATE content_requests SET review=?::jsonb WHERE id=? AND review->>'lease'=?").bind(JSON.stringify({lease,independent:reviewedData}),job.id,lease).run();
  const review=reviewSchema.parse(reviewedData);
  if(review.items.length!==draft.items.length)throw new Error('The review did not examine every item.');
  const passageId=draft.passage?'generated-passage-'+job.id:undefined;
  const questions:Question[]=draft.items.map((item,index)=>{const audit=review.items[index];if(audit.correct!==item.correct||!audit.oneDefensibleAnswer||!audit.gradeAppropriate||!audit.skillMatches||!audit.difficultyMatches)throw new Error('Independent review rejected the proposed answer or calibration.');return {id:'generated-'+job.id+'-'+index,subject:topic.subject,skill:topic.skill,difficulty:Number(job.difficulty),text:item.text,choices:item.choices,correct:audit.correct,type:'mc',explanation:audit.explanation,breakthrough:audit.breakthrough,commonTrap:audit.commonTrap,distractorReasons:audit.reasons,distractorMisconceptions:audit.misconceptions,howToThink:audit.howToThink,solutionSteps:audit.steps,evidence:audit.evidence,evidenceExplanation:audit.evidenceExplanation,subtopic:topic.id,subskill:topic.label,domain:topic.domain,topic:topic.skill,familyId:'generated:'+item.structure,structureId:item.structure,scenarioId:item.scenario,reasoningType:item.reasoningType,reasoningSteps:audit.steps.length,estimatedTime:item.estimatedTime,qualityVersion:QUALITY_VERSION,calibration:{basis:'Independently model-reviewed task and passage complexity; awaiting empirical calibration.',status:'editorial',version:QUALITY_VERSION},generationMethod:'free-credits-independent-review-v3',...(item.table?{table:item.table}:{}),...(item.diagram?{diagram:item.diagram}:{}),...(draft.passage?{passageId,passage:{title:draft.passage.title,content:draft.passage.content,type:draft.passage.genre}}:{})};});
  for(const q of questions){const errors=qualityErrors(q);if(errors.length)throw new Error(errors.join(' '));if(recent.some(old=>nearDuplicate(q,old))||questions.some(other=>other.id!==q.id&&nearDuplicate(q,other)))throw new Error('Duplicate or near-duplicate content rejected.');}
  const passageDuplicate=draft.passage?await db.prepare('SELECT id FROM passages WHERE content=? LIMIT 1').bind(draft.passage.content).first():null;if(passageDuplicate)throw new Error('Duplicate passage rejected.');
  const statements=[];if(draft.passage)statements.push(db.prepare('INSERT INTO passages(id,title,difficulty,type,content,data,status) VALUES(?,?,?,?,?,?,?)').bind(passageId,draft.passage.title,job.difficulty,draft.passage.genre,draft.passage.content,JSON.stringify({...draft.passage,qualityVersion:QUALITY_VERSION}),'approved'));
  for(const q of questions)statements.push(db.prepare('INSERT INTO questions(id,subject,skill,difficulty,passage_id,fingerprint,data,status,created) VALUES(?,?,?,?,?,?,?,?,?)').bind(q.id,q.subject,q.skill,q.difficulty,q.passageId||null,await fingerprint(q),JSON.stringify(q),'approved',Date.now()));
  statements.push(db.prepare("UPDATE content_requests SET status='approved',output=?::jsonb,review=?::jsonb,tokens=?,updated=? WHERE id=? AND review->>'lease'=?").bind(JSON.stringify({...archive,questionIds:questions.map(q=>q.id)}),JSON.stringify({lease,independent:reviewedData}),receipts.reduce((sum,r)=>sum+Number(r.tokens||0),0),Date.now(),job.id,lease));
  await db.batch(statements);
  return {status:'approved',id:job.id,questions:questions.length};
 }catch(error){const message=error instanceof Error?error.message:'Generation rejected.';await db.prepare("UPDATE content_requests SET status='rejected',error=?,review=COALESCE(review,'{}'::jsonb)||?::jsonb,updated=? WHERE id=?").bind(message.slice(0,500),JSON.stringify({lease,receipts,error:message.slice(0,500)}),Date.now(),job.id).run();return {status:'rejected',id:job.id,reason:message};}
 finally{
  // Conservatively charge the reservation even for provider timeouts/unknown usage.
  // No retry can silently release money already potentially used by a provider.
  await db.batch([db.prepare('UPDATE content_budget SET reserved_cents=GREATEST(0,reserved_cents-?),spent_cents=spent_cents+? WHERE period=?').bind(reserved,providerStarted?reserved:0,period),db.prepare('UPDATE content_requests SET cost_cents=?,reserved_cents=0 WHERE id=?').bind(providerStarted?reserved:0,job.id)]);
 }
});}
