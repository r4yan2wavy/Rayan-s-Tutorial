import {existsSync} from 'node:fs';
if(existsSync('.env.local'))process.loadEnvFile('.env.local');
const {withDatabaseSetup,database,closeDatabase}=await import('../db/index');
const {SUBTOPICS}=await import('../lib/curriculum');
const {generateMathV3,mathFamilies}=await import('../lib/math-v3');
const {generateEditingV3,editingFamilies,allReadingQuestionsV3}=await import('../lib/ela-v3');
const {qualityErrors,nearDuplicate,QUALITY_VERSION}=await import('../lib/content-quality');
const {putQuestions}=await import('../lib/library');
type Question=import('../lib/assessment').Question;
try{await withDatabaseSetup(async()=>{
 const db=database(),accepted:Question[]=[],rejections:Record<string,number>={};
 for(const topic of SUBTOPICS.filter(topic=>topic.kind!=='reading')){
  const families=topic.kind==='math'?mathFamilies(topic.id):editingFamilies(topic.id),seen:Question[]=[];
  for(let difficulty=1;difficulty<=5;difficulty++)for(const family of families)for(let draw=0;draw<20;draw++){
   let q:Question;try{q=topic.kind==='math'?generateMathV3(topic.id,difficulty,174172+draw*809+difficulty*11003,family):generateEditingV3(topic.id,difficulty,174172+draw*809+difficulty*11003,family)}catch{continue}
   const errors=qualityErrors(q);if(errors.length){for(const reason of errors)rejections[reason]=(rejections[reason]||0)+1;continue}
   // Retain genuinely different wording/scenario/reasoning structures. Numeric
   // substitutions and answer-order permutations do not inflate this inventory.
   if(seen.some(old=>old.difficulty===q.difficulty&&nearDuplicate(q,old)))continue;
   seen.push(q);accepted.push(q);
  }
 }
 for(const q of allReadingQuestionsV3())if(!qualityErrors(q).length)accepted.push(q);else rejections['Reading item did not pass strict quality checks.']=(rejections['Reading item did not pass strict quality checks.']||0)+1;
 for(const q of accepted.filter(q=>q.passageId)){if(!q.passage)continue;await db.prepare('INSERT OR IGNORE INTO passages(id,title,difficulty,type,content,data,status) VALUES(?,?,?,?,?,?,?)').bind(q.passageId,q.passage.title,q.difficulty,q.passage.type,q.passage.content,JSON.stringify(q.passage),'approved').run();}
 await putQuestions(accepted,'approved',true);
 // Initial generation requests target genuine ELA inventory gaps. No external
 // requests occur until the private free-credit gate has been verified.
 const now=Date.now();for(const topic of SUBTOPICS.filter(topic=>topic.kind==='reading'))for(let difficulty=1;difficulty<=5;difficulty++)await db.prepare('INSERT OR IGNORE INTO content_requests(id,subtopic,difficulty,requester,created,updated,plan) VALUES(?,?,?,?,?,?,?::jsonb)').bind(crypto.randomUUID(),topic.id,difficulty,null,now,now,JSON.stringify({...topic,difficulty,qualityVersion:QUALITY_VERSION})).run();
 const report={qualityVersion:QUALITY_VERSION,acceptedCandidates:accepted.length,rejections,inventory:(await db.prepare("SELECT data::jsonb->>'subtopic' AS subtopic,COUNT(*) AS count,COUNT(DISTINCT data::jsonb->>'familyId') AS families FROM questions WHERE status='approved' GROUP BY data::jsonb->>'subtopic' ORDER BY subtopic").all()).results,passages:(await db.prepare("SELECT difficulty,COUNT(*) AS count FROM passages WHERE status='approved' GROUP BY difficulty ORDER BY difficulty").all()).results};
 await db.prepare('INSERT OR IGNORE INTO content_batches(id,user_id,created,data) VALUES(?,?,?,?)').bind('content-v3-initial','system',now,JSON.stringify(report)).run();
 console.log(JSON.stringify(report));
})}catch(error){console.error(error instanceof Error?error.message:'Content seed failed.');process.exitCode=1}finally{await closeDatabase()}
