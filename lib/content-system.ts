import 'server-only';
import {database} from '@/db';
import {type Question,validate} from './assessment';
import {SUBTOPICS,findSubtopic,subtopicsFor,type Subtopic} from './curriculum';
import {qualityErrors,nearDuplicate,QUALITY_VERSION} from './content-quality';

type SelectionOptions={subtopic?:string;avoidFamilies?:string[];source?:string;misconception?:string};
const unavailable=(message:string):never=>{throw Object.assign(new Error(message),{status:503})};
export function inferSubtopicForQuestion(q:Question):string|undefined{
 if(findSubtopic(q.subtopic))return findSubtopic(q.subtopic)!.id;
 const exact=SUBTOPICS.find(topic=>topic.subject===q.subject&&topic.skill===q.skill&&topic.label.toLowerCase()===(q.subskill||'').toLowerCase());if(exact)return exact.id;
 const text=(q.text+' '+(q.subskill||'')+' '+q.explanation).toLowerCase();
 const labels:Record<string,string>={'Ratios':'Ratios','Proportions':'Proportional relationships','Rates':'Unit rates','Fractions':'Fractions','Decimals':'Decimal operations','Percentages':'Percent of a quantity','Expressions':'Evaluating expressions','Equations':'Two-step equations','Inequalities':'Solving inequalities','Arithmetic':'Order of operations','Number systems':'Rational numbers','Geometry':'Area','Coordinate geometry':'Coordinate-plane geometry','Statistics':'Mean','Probability':'Simple probability','Data interpretation':'Graphs','Multi-step reasoning':'Multi-step mathematical reasoning','Main idea':'Main idea','Inference':'Inference','Supporting evidence':'Textual evidence','Vocabulary':'Vocabulary in context','Author purpose':"Author's purpose",'Tone':'Tone','Structure':'Text structure','Literary analysis':'Character traits','Comparison':'Comparing texts','Argument':'Claims','Grammar':'Subject-verb agreement','Sentence structure':'Sentence combining','Organization':'Organization','Revision':'Clarity'};
 let label=labels[q.skill];
 if(/percent.*increase|increased by|increase.*percent/.test(text))label='Percent increase';
 else if(/percent.*decrease|decreased by|decrease.*percent/.test(text))label='Percent decrease';
 else if(q.skill==='Geometry'){if(/circle|radius|diameter/.test(text))label=/circumference/.test(text)?'Circumference':'Circle area';else if(/volume|prism|cube/.test(text))label='Volume';else if(/perimeter/.test(text))label='Perimeter';else if(/angle/.test(text))label='Unknown angles';}
 else if(q.skill==='Statistics'){if(/median/.test(text))label='Median';else if(/range/.test(text))label='Range';}
 else if(q.skill==='Grammar'){if(/pronoun case|object pronoun|subject pronoun/.test(text))label='Pronoun case';else if(/pronoun.*agree|antecedent.*number/.test(text))label='Pronoun agreement';else if(/pronoun/.test(text))label='Pronoun reference';else if(/tense/.test(text))label='Tense consistency';else if(/apostrophe|possessive/.test(text))label='Possessives';else if(/subject.*verb|singular subject|plural subject/.test(text))label='Subject-verb agreement';else return undefined;}
 else if(q.skill==='Sentence structure'){if(/dangling|misplaced modifier/.test(text))label='Modifiers';else if(/fragment/.test(text))label='Fragments';else if(/comma splice/.test(text))label='Comma splices';else if(/run.on/.test(text))label='Run-ons';else if(/dependent clause/.test(text))label='Dependent clauses';}
 else if(q.skill==='Revision'){if(/concision|redundan|wordiness|wordy/.test(text))label='Concision';else if(/transition/.test(text))label='Transitions';}
 const kind=q.subject==='Math'?'math':q.passageId?'reading':'editing';
 return SUBTOPICS.find(topic=>topic.kind===kind&&topic.skill===q.skill&&topic.label===label)?.id;
}
export function legacyContentFeedback(q:Question):Question{
 const subtopic=inferSubtopicForQuestion(q);
 if(q.howToThink&&q.solutionSteps?.length)return q;
 const howToThink=q.subject==='Math'?q.breakthrough:`Read the task carefully: ${q.text} Locate the relevant language, interpret it in context, and compare all four choices against what the text or grammar rule actually supports.`;
 const evidenceExplanation=q.passage&&q.evidence?`The quoted language appears in the original passage. Read it with the sentences immediately before and after it. ${q.explanation} A detail that is merely present is weaker than evidence that answers this specific task.`:undefined;
 const topic=findSubtopic(subtopic),familyId=q.familyId||(q.passageId?'legacy-reading:'+q.passageId+':'+q.skill:q.templateId||'legacy:'+q.id);
 const distractorReasons=q.choices?.map((choice,index)=>index===q.correct?q.explanation:(q.distractorReasons?.[index]||q.commonTrap)+` This choice states “${choice}”; compare that claim with the rule or evidence explained below.`);
 return {...q,subtopic,domain:q.domain||topic?.domain,topic:q.topic||q.skill,familyId,scenarioId:q.scenarioId||q.passageId||familyId,structureId:q.structureId||q.subskill||q.skill,reasoningType:q.reasoningType||(q.passageId?'interpret contextual evidence':'apply the stated mathematical or language rule'),howToThink,solutionSteps:q.explanation.split(/\n+|(?<=\.) (?=(?:First|Next|Then|Finally|\d+[.)]))/).filter(Boolean),evidenceExplanation,distractorReasons};
}
async function recentQuestions(uid:string,exclude:string[]=[]){
 const rows=await database().prepare('SELECT q.data FROM question_exposure e JOIN questions q ON q.id=e.question_id WHERE e.user_id=? ORDER BY e.last_seen DESC LIMIT 18').bind(uid).all();
 const pending=exclude.length?await database().prepare('SELECT data FROM questions WHERE id IN (SELECT value FROM json_each(?))').bind(JSON.stringify(exclude.slice(-12))).all():{results:[]};
 return [...rows.results,...pending.results].map(row=>JSON.parse(String(row.data)) as Question);
}
export async function enqueueReplenishment(uid:string,topic:Subtopic,difficulty:number){
 const now=Date.now();
 await database().prepare('INSERT OR IGNORE INTO content_requests(id,subtopic,difficulty,requester,created,updated,plan) VALUES(?,?,?,?,?,?,?::jsonb)').bind(crypto.randomUUID(),topic.id,difficulty,uid,now,now,JSON.stringify({subject:topic.subject,domain:topic.domain,topic:topic.label,subtopic:topic.id,skill:topic.skill,difficulty,kind:topic.kind,qualityVersion:QUALITY_VERSION})).run();
}
async function persist(qs:Question[]){
 const {putQuestions}=await import('./library');
 const passage=qs.find(q=>q.passage)?.passage,passageId=qs.find(q=>q.passageId)?.passageId;
 if(passage&&passageId)await database().prepare('INSERT OR IGNORE INTO passages(id,title,difficulty,type,content,data,status) VALUES(?,?,?,?,?,?,?)').bind(passageId,passage.title,qs[0].difficulty,passage.type,passage.content,JSON.stringify({id:passageId,...passage,qualityVersion:QUALITY_VERSION}),'approved').run();
 await putQuestions(qs,'approved',true);
}
export async function chooseFreshContent(uid:string,subject:string,skill:string,difficulty:number,exclude:string[]=[],options:SelectionOptions={}):Promise<Question>{
 const possible=subtopicsFor(subject,skill),requested=findSubtopic(options.subtopic);
 if(options.subtopic&&(!requested||requested.subject!==subject||requested.skill!==skill))throw new Error('Choose a matching individual subtopic.');
 const recent=await recentQuestions(uid,exclude);
 // Family counts influence the whole recent history. Hard structural cooldowns
 // use the most recent two items for a narrow skill; otherwise a focused session
 // would permanently exhaust every valid authored structure after one rotation.
 const tooRecent=(q:Question)=>recent.filter(previous=>previous.subtopic===q.subtopic).slice(0,2).some(previous=>nearDuplicate(q,previous));
 const candidates=requested?[requested]:[...possible].sort((a,b)=>recent.filter(q=>q.subtopic===a.id).length-recent.filter(q=>q.subtopic===b.id).length);
 for(const topic of candidates){
  const cache=await database().prepare("SELECT data FROM questions q WHERE status='approved' AND difficulty=? AND data::jsonb->>'subtopic'=? AND NOT EXISTS(SELECT 1 FROM question_exposure e WHERE e.user_id=? AND e.question_id=q.id) AND (q.passage_id IS NULL OR NOT EXISTS(SELECT 1 FROM question_exposure pe JOIN questions pq ON pq.id=pe.question_id WHERE pe.user_id=? AND pq.passage_id=q.passage_id)) AND q.id NOT IN (SELECT value FROM json_each(?)) ORDER BY q.created DESC LIMIT 120").bind(difficulty,topic.id,uid,uid,JSON.stringify(exclude)).all();
  const ready=cache.results.map(row=>JSON.parse(String(row.data)) as Question).filter(q=>!qualityErrors(q).length&&!options.avoidFamilies?.includes(q.familyId||'')&&!tooRecent(q));
  const relevant=(q:Question)=>options.misconception?(q.distractorMisconceptions||[]).filter(tag=>tag&&options.misconception!.toLowerCase().includes(tag.toLowerCase())).length:0;
  ready.sort((a,b)=>relevant(b)-relevant(a)||recent.filter(q=>q.familyId===a.familyId).length-recent.filter(q=>q.familyId===b.familyId).length);
  if(ready.length){if(topic.kind==='reading'&&ready.length<12)await enqueueReplenishment(uid,topic,difficulty);return ready[0];}
  if(topic.kind==='reading'){
   try{return (await selectContentPassage(uid,difficulty,exclude,1,skill,topic.id,options.avoidFamilies))[0]}catch(error){if(requested)throw error;continue}
  }
  const math=topic.kind==='math'?await import('./math-v3'):null,ela=topic.kind==='editing'?await import('./ela-v3'):null;
  const families=math?math.mathFamilies(topic.id):ela!.editingFamilies(topic.id);
  const ordered=[...families].filter(family=>!options.avoidFamilies?.includes(family)).sort((a,b)=>recent.filter(q=>q.familyId===a).length-recent.filter(q=>q.familyId===b).length);
  for(let attempt=0;attempt<Math.max(12,ordered.length*4);attempt++){
   const family=ordered[attempt%ordered.length];if(!family)break;
   const seed=crypto.getRandomValues(new Uint32Array(1))[0]%2000000000;
   let q:Question;try{q=math?math.generateMathV3(topic.id,difficulty,seed,family):ela!.generateEditingV3(topic.id,difficulty,seed,family);}catch{continue}
   if(qualityErrors(q).length||exclude.includes(q.id)||tooRecent(q))continue;
   const {fingerprint}=await import('./library');
   const used=await database().prepare('SELECT id FROM questions WHERE fingerprint=?').bind(await fingerprint(q)).first();if(used)continue;
   await persist([q]);return q;
  }
 }
 const topic=requested||candidates[0];if(topic)await enqueueReplenishment(uid,topic,difficulty);
 return unavailable('No fresh validated questions are available for this exact skill yet. Your answers are saved. Choose another focus while the library expands.');
}
export async function selectContentPassage(uid:string,difficulty:number,excludeQuestionIds:string[]=[],count=4,requestedSkill?:string,subtopicId?:string,avoidFamilies:string[]=[]):Promise<Question[]>{
 const target=findSubtopic(subtopicId)||subtopicsFor('ELA',requestedSkill).find(topic=>topic.kind==='reading');
 if(!target||target.kind!=='reading')throw new Error('Choose a reading subtopic.');
 const recent=await recentQuestions(uid,excludeQuestionIds),excludedPassages=[...new Set(recent.filter(q=>excludeQuestionIds.includes(q.id)).flatMap(q=>q.passageId?[q.passageId]:[]))];
 const {generateReadingSetV3}=await import('./ela-v3');
 for(let attempt=0;attempt<24;attempt++){
  const seed=crypto.getRandomValues(new Uint32Array(1))[0]%2000000000;
  let qs:Question[];try{qs=generateReadingSetV3(target.id,difficulty,seed,{count,excludePassageIds:[...excludedPassages,...recent.flatMap(q=>q.passageId?[q.passageId]:[])],targetOnly:count===1});}catch{break}
  if(qs.some(q=>avoidFamilies.includes(q.familyId||'')))continue;
  if(qs.length<count||qs.some(q=>qualityErrors(q).length)||qs.some(q=>excludeQuestionIds.includes(q.id))||qs.some(q=>recent.some(previous=>nearDuplicate(q,previous))))continue;
  const seen=await database().prepare('SELECT 1 FROM question_exposure e JOIN questions q ON q.id=e.question_id WHERE e.user_id=? AND q.passage_id=? LIMIT 1').bind(uid,qs[0].passageId).first();if(seen)continue;
  await persist(qs);await enqueueReplenishment(uid,target,difficulty);return qs.slice(0,count);
 }
 const rows=await database().prepare(`SELECT p.id FROM passages p WHERE p.status='approved' AND p.difficulty=?
  AND NOT EXISTS(SELECT 1 FROM questions q WHERE q.passage_id=p.id AND q.id IN (SELECT value FROM json_each(?)))
  AND NOT EXISTS(SELECT 1 FROM questions q JOIN question_exposure e ON e.question_id=q.id WHERE q.passage_id=p.id AND e.user_id=?)
  AND (SELECT COUNT(*) FROM questions q WHERE q.passage_id=p.id AND q.status='approved')>=?
  ORDER BY p.id LIMIT 100`).bind(difficulty,JSON.stringify(excludeQuestionIds),uid,count).all();
 for(const row of rows.results){
  const source=await database().prepare("SELECT data FROM questions WHERE passage_id=? AND status='approved' ORDER BY id").bind(row.id).all();
  const qs=source.results.map(r=>legacyContentFeedback(JSON.parse(String(r.data))));
  const matched=qs.find(q=>(subtopicId?q.subtopic===target.id:q.skill===target.skill)&&!avoidFamilies.includes(q.familyId||''));if(!matched||qs.some(q=>validate(q).length))continue;
  if(qs.length>=count)return [matched,...qs.filter(q=>q.id!==matched.id)].slice(0,count);
 }
 await enqueueReplenishment(uid,target,difficulty);
 return unavailable('No fresh validated passage set is available for this reading skill at this level yet. Your diagnostic is saved.');
}
export async function inventory(uid:string){
 const rows=await database().prepare("SELECT q.data::jsonb->>'subtopic' AS subtopic,COUNT(*) AS approved,COUNT(*) FILTER(WHERE q.data::jsonb->>'qualityVersion' IS NOT NULL) AS reviewed,COUNT(*) FILTER(WHERE q.data::jsonb->'contentAudit'->>'reviewStatus'='pending-semantic-review') AS pendingReview,COUNT(*) FILTER(WHERE e.question_id IS NULL) AS unseen,COUNT(DISTINCT q.data::jsonb->>'familyId') FILTER(WHERE q.data::jsonb->>'qualityVersion' IS NOT NULL) AS families FROM questions q LEFT JOIN question_exposure e ON e.user_id=? AND e.question_id=q.id WHERE q.status='approved' GROUP BY q.data::jsonb->>'subtopic'").bind(uid).all();
 const counts=new Map(rows.results.map(row=>[String(row.subtopic),row]));
 const topics=SUBTOPICS.map(topic=>({...topic,approved:Number(counts.get(topic.id)?.approved||0),reviewed:Number(counts.get(topic.id)?.reviewed||0),pendingReview:Number(counts.get(topic.id)?.pendingReview||0),unseen:Number(counts.get(topic.id)?.unseen||0),families:Number(counts.get(topic.id)?.families||0)}));
 return{topics,goalPerSubtopic:2000,generationPolicy:'Free credits only. New content must pass quality checks; no paid purchases or top-ups.',qualityVersion:QUALITY_VERSION};
}
