import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {before,after,test} from 'node:test';
import {PGlite} from '@electric-sql/pglite';
import {ApplicationDatabase,type Transaction} from '../db/statements';
import {serviceRuntime} from './helpers/service-runtime';
import {DIAGNOSTIC,DIAGNOSTIC_BLUEPRINT,MATH_SKILLS,diagnosticSkill,nextDifficulty,publicQuestion,validate,type Evidence,type Question} from '../lib/assessment';
import {findSubtopic} from '../lib/curriculum';

const USER='67676767-6767-4676-8676-676767676767';
let pg:PGlite,runtime:Awaited<ReturnType<typeof serviceRuntime>>;
type Item=Question&{index:number;answer:unknown;status:string};
type View={session:{id:string;version:number;cursor:number;answered:number;total:number;answers:Record<string,unknown>;remediation?:{targets:{originalQuestionId:string;questionIds:string[]}[]}};questions:(Question&{index:number})[];result?:{id:string;total:number;correct:number;unanswered:number;items:Item[];remediation?:{outcomes:{correct:number;label:string;questionIds:string[]}[]}}};
function adapter(setup=false){const transaction:Transaction=operation=>pg.transaction(async tx=>{if(!setup){await tx.query("SELECT set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:USER,role:'authenticated'})]);await tx.exec('SET LOCAL ROLE rayan_app')}return operation(async(text,values)=>{const result=await tx.query<Record<string,unknown>>(text,values);return{rows:result.rows,rowCount:result.rowCount??result.affectedRows??result.rows.length}})});return new ApplicationDatabase(transaction)}
before(async()=>{
  pg=new PGlite();
  await pg.exec(`CREATE ROLE anon NOLOGIN NOBYPASSRLS; CREATE ROLE authenticated NOLOGIN NOBYPASSRLS;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb NOT NULL DEFAULT '{}');
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid $$;
    GRANT USAGE ON SCHEMA public,auth TO authenticated,anon; GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated,anon;`);
  await pg.exec(await readFile(new URL('../supabase/migrations/202610020001_platform.sql',import.meta.url),'utf8'));
  await pg.exec(await readFile(new URL('../supabase/migrations/202610030002_content_system.sql',import.meta.url),'utf8'));
  await pg.query('INSERT INTO auth.users(id,email) VALUES($1,$2)',[USER,'overhaul-fixture@example.test']);
  runtime=await serviceRuntime(adapter(true));await runtime.library.seedLibrary();runtime.setDatabase(adapter());
  runtime.setAuthenticatedUser({id:USER,email:'overhaul-fixture@example.test',role:'student',created:Date.now()});
});
after(async()=>{await runtime?.close();await pg?.close()});
const read=(id:string):Promise<View>=>runtime.service.ownSession(USER,id).then((session:unknown)=>runtime.service.viewSession(session));
const act=(view:View,action:string,extra:Record<string,unknown>={}):Promise<View>=>runtime.service.sessionAction(USER,view.session.id,{action,version:view.session.version,...extra});
async function request(path:string[],body?:Record<string,unknown>){return runtime.service.handle(new Request('https://diagnostic-fixture.example.test/api/studio/'+path.join('/'),{method:body?'POST':'GET',headers:body?{'Origin':'https://diagnostic-fixture.example.test','Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined}),path) as Promise<Response>}
async function post(path:string[],body:Record<string,unknown>):Promise<View>{const response=await request(path,body);const data=await response.json();assert.equal(response.status,200,JSON.stringify(data));return data}
async function key(id:string):Promise<Question>{const row=await pg.query<{data:string}>('SELECT data FROM questions WHERE id=$1',[id]);return JSON.parse(row.rows[0].data)}
function choice(question:Question,correct=true){return question.type==='grid'?String(Number(question.correct)+(correct?0:9999)):correct?question.correct:(Number(question.correct)+1)%4}
function assertSilent(view:View){for(const field of ['profile','feedback','accuracy','score','correctResult'])assert.equal(field in view,false,field);for(const question of view.questions)for(const field of ['correct','explanation','breakthrough','commonTrap','distractorReasons','distractorMisconceptions','evidence','howToThink','solutionSteps','evidenceExplanation','expectedMisconception','misconception','reasoningSteps'])assert.equal(field in question,false,field)}
async function readyToFinish(id:string,grid=false,mistakeIndices:number[]=[]){
  const reading=await pg.query<{id:string}>("SELECT q.id FROM questions q WHERE q.passage_id IS NOT NULL AND (SELECT count(*) FROM questions setq WHERE setq.passage_id=q.passage_id)=4 ORDER BY q.passage_id,q.id LIMIT 40");
  const editing=await pg.query<{id:string}>("SELECT id FROM questions WHERE subject='ELA' AND passage_id IS NULL ORDER BY id LIMIT 10");
  const math=await pg.query<{id:string}>("SELECT id FROM questions WHERE subject='Math' AND COALESCE(data::jsonb->>'type','mc')<>'grid' ORDER BY skill,id LIMIT 50");
  const ids=[...reading.rows,...editing.rows,...math.rows].map(row=>row.id);
  if(grid){const row=await pg.query<{id:string}>("SELECT id FROM questions WHERE subject='Math' AND data::jsonb->>'type'='grid' ORDER BY id LIMIT 1");ids[99]=row.rows[0].id}
  assert.equal(ids.length,100);assert.equal(new Set(ids).size,100);
  const now=Date.now(),state={ids,max:100,cursor:99,lockedUntil:99,diagnosticVersion:DIAGNOSTIC.version,diagnosticOrder:'ela-then-math',diagnosticBlueprint:{...DIAGNOSTIC_BLUEPRINT},diagnosticLevels:{ELA:2,Math:2},config:{subject:'Mixed',timed:false},tools:{}};
  await pg.query("INSERT INTO test_sessions(id,user_id,type,status,created,updated,version,data) VALUES($1,$2,'diagnostic','active',$3,$3,7,$4)",[id,USER,now,JSON.stringify(state)]);
  for(let index=0;index<99;index++){const question=await key(ids[index]),answer=choice(question,!mistakeIndices.includes(index));await pg.query('INSERT INTO answers(session_id,question_id,user_id,answer,correct,seconds,updated) VALUES($1,$2,$3,$4,$5,12,$6)',[id,question.id,USER,JSON.stringify(answer),mistakeIndices.includes(index)?0:1,now+index])}
  return read(id);
}

test('difficulty requires multiple responses and resets evidence after a level change',()=>{
  const row=(correct:number,difficulty=2):Evidence=>({subject:'Math',skill:'Ratios',difficulty,correct});
  assert.equal(nextDifficulty([row(1)]),2);assert.equal(nextDifficulty([row(0)]),2);
  assert.equal(nextDifficulty([row(1),row(1)]),2);assert.equal(nextDifficulty([row(1),row(1),row(1)]),3);
  assert.equal(nextDifficulty([row(0),row(0),row(0)]),1);
  assert.equal(nextDifficulty([row(1),row(1),row(1),row(1,3)]),3);
  assert.equal(nextDifficulty([row(1),row(1),row(1),row(0,3)]),3);
  assert.equal(nextDifficulty([row(1,5),row(1,5),row(1,5)]),5);
  assert.equal(nextDifficulty([row(0,1),row(0,1),row(0,1)]),1);
});

test('major skills receive coverage before additional evidence targets uncertainty',()=>{
  const rows:Evidence[]=[];for(const skill of MATH_SKILLS){assert.equal(diagnosticSkill(rows,MATH_SKILLS),skill);rows.push({subject:'Math',skill,difficulty:2,correct:1})}
  rows.push({subject:'Math',skill:'Ratios',difficulty:2,correct:0});assert.equal(diagnosticSkill(rows,MATH_SKILLS),'Ratios');
});

test('public questions remove new tutor fields and solution metadata',()=>{
  const question:Question={id:'public-quality-item',subject:'Math',skill:'Ratios',difficulty:2,text:'A public prompt',choices:['a','b','c','d'],correct:0,explanation:'Answer-bearing explanation',breakthrough:'A strategy',commonTrap:'A trap',howToThink:'Answer-bearing setup',solutionSteps:['Private calculations'],expectedMisconception:'Private rule',distractorMisconceptions:['Correct process','Wrong denominator','Part confused with whole','Scaling one part only'],evidenceExplanation:'Private evidence',reasoningSteps:3,calibration:{basis:'Official public sample alignment',status:'editorial',version:'3'}};
  const safe=publicQuestion(question);assert.equal(safe.text,question.text);for(const name of ['correct','explanation','howToThink','solutionSteps','evidenceExplanation','expectedMisconception','distractorMisconceptions','reasoningSteps','calibration'])assert.equal(name in safe,false,name);
});

test('ELA validation preserves capitalization differences and still rejects exact duplicate options',()=>{
  const question:Question={id:'capitalization-fixture',subject:'ELA',skill:'Grammar',subtopic:'ela-editing-capitalization',difficulty:2,text:'Which version capitalizes the proper name correctly?',choices:['We visited central Park.','We visited Central park.','We visited Central Park.','We visited central park.'],correct:2,explanation:'The name Central Park is a proper noun, so both words begin with capitals.',breakthrough:'Capitalize every main word in a proper name.',commonTrap:'A place name needs capitals even when its individual words are ordinary nouns.'};
  assert.deepEqual(validate(question),[]);
  assert.ok(validate({...question,choices:[question.choices![0],question.choices![0],question.choices![2],question.choices![3]]}).some(error=>error.includes('distinct')));
  assert.ok(validate({...question,subject:'Math',choices:['red','RED','blue','yellow']}).some(error=>error.includes('distinct')));
});

test('competing Next requests save one answer and cannot advance twice or overwrite the winning answer',async()=>{
  const original:View=await runtime.service.startSession(USER,{type:'diagnostic'}),question=original.questions[0];
  const responses=await Promise.allSettled([act(original,'next',{index:0,answer:0,seconds:7}),act(original,'next',{index:0,answer:1,seconds:8})]);
  const winners=responses.filter((response):response is PromiseFulfilledResult<View>=>response.status==='fulfilled'),losers=responses.filter((response):response is PromiseRejectedResult=>response.status==='rejected');
  assert.equal(winners.length,1);assert.equal(losers.length,1);assert.equal(losers[0].reason.status,409);assertSilent(winners[0].value);
  const restored=await read(original.session.id);assert.equal(restored.session.cursor,1);assert.equal(restored.session.answered,1);
  assert.equal(restored.session.answers[question.id],winners[0].value.session.answers[question.id]);
  await assert.rejects(act(original,'next',{index:0,answer:2}),/changed/);
  const counts=await pg.query<{count:number}>('SELECT count(*)::int AS count FROM answers WHERE session_id=$1',[original.session.id]);assert.equal(counts.rows[0].count,1);
});

test('Next silently saves all 100 answers and Finish saves the final answer exactly once',async()=>{
  let view:View=await post(['sessions'],{type:'diagnostic'});let count=0;
  while(!view.result){
    assertSilent(view);const question=view.questions.find(item=>item.index===view.session.cursor)!;assert.ok(question);
    const stored=await key(question.id),previous=view.session.cursor;
    try{view=await post(['sessions',view.session.id],{action:count===99?'finish':'next',version:view.session.version,index:question.index,answer:choice(stored),seconds:11})}catch(error){throw new Error(`Diagnostic failed after question ${count+1}: ${stored.subject}, ${stored.skill}, level ${stored.difficulty}. ${(error as Error).message}`,{cause:error})}count++;
    if(!view.result){assertSilent(view);assert.equal(view.session.answered,count);assert.equal(view.session.cursor,previous+1)}
  }
  assert.equal(count,100);assert.equal(view.result.total,100);assert.equal(view.result.unanswered,0);assert.equal(view.result.correct,100);
  const snapshot=view.result,again=await runtime.service.sessionAction(USER,snapshot.id,{action:'finish',version:-1,index:99,answer:3});assert.deepEqual(again.result,snapshot);
  const rows=await pg.query<{count:number}>('SELECT count(*)::int AS count FROM answers WHERE session_id=$1',[snapshot.id]);assert.equal(rows.rows[0].count,100);
  const results=await pg.query<{count:number}>('SELECT count(*)::int AS count FROM results WHERE session_id=$1',[snapshot.id]);assert.equal(results.rows[0].count,1);
});

test('HTTP diagnostic routes enforce authentication, origin, and session ownership without revealing answer keys',async()=>{
  runtime.setAuthenticatedUser(null);
  try{const anonymous=await request(['sessions','unknown-session']);assert.equal(anonymous.status,401);assert.match((await anonymous.json()).error,/log in/)}finally{runtime.setAuthenticatedUser({id:USER,email:'overhaul-fixture@example.test',role:'student',created:Date.now()})}
  const blocked=await runtime.service.handle(new Request('https://diagnostic-fixture.example.test/api/studio/sessions',{method:'POST',headers:{'Origin':'https://other-origin.example.test','Content-Type':'application/json'},body:JSON.stringify({type:'diagnostic'})}),['sessions']);assert.equal(blocked.status,403);
  const view:View=await post(['sessions'],{type:'diagnostic'}),restored=await request(['sessions',view.session.id]);assert.equal(restored.status,200);assertSilent(await restored.json());assert.equal(restored.headers.get('Cache-Control'),'no-store');
  runtime.setAuthenticatedUser({id:'89898989-8989-4989-8989-898989898989',email:'other-fixture@example.test',role:'student',created:Date.now()});
  try{const other=await request(['sessions',view.session.id]);assert.equal(other.status,404);assert.match((await other.json()).error,/not found/)}finally{runtime.setAuthenticatedUser({id:USER,email:'overhaul-fixture@example.test',role:'student',created:Date.now()})}
});

test('atomic finish handles zero-valued multiple-choice answers and grid answers',async()=>{
  const mc=await readyToFinish('atomic-zero-choice');const complete=await act(mc,'finish',{index:99,answer:0,seconds:23});assert.equal(complete.result!.items[99].answer,0);
  const stored=await pg.query<{answer:string;seconds:number}>('SELECT answer,seconds FROM answers WHERE session_id=$1 AND question_id=$2',[mc.session.id,mc.questions[0].id]);assert.deepEqual(stored.rows,[{answer:'0',seconds:23}]);
  const grid=await readyToFinish('atomic-grid',true),question=await key(grid.questions[0].id),value=String(question.correct);
  const gridResult=await act(grid,'finish',{index:99,answer:value,seconds:17});assert.equal(gridResult.result!.items[99].answer,value);assert.equal(gridResult.result!.items[99].status,'correct');
});

test('competing final submissions return one canonical result without overwriting the final answer',async()=>{
  const view=await readyToFinish('atomic-competing-finishes');
  const responses=await Promise.all([act(view,'finish',{index:99,answer:0}),act(view,'finish',{index:99,answer:1})]);
  assert.deepEqual(responses[0].result,responses[1].result);
  const final=await pg.query<{answer:string}>('SELECT answer FROM answers WHERE session_id=$1 AND question_id=$2',[view.session.id,view.questions[0].id]);assert.equal(JSON.parse(final.rows[0].answer),responses[0].result!.items[99].answer);
  const counts=await pg.query<{count:number}>('SELECT count(*)::int AS count FROM results WHERE session_id=$1',[view.session.id]);assert.equal(counts.rows[0].count,1);
});

test('invalid, incomplete and stale finishes leave answers and results untouched',async()=>{
  const view=await readyToFinish('atomic-invalid-grid',true),before=await pg.query('SELECT status,version,data FROM test_sessions WHERE id=$1',[view.session.id]);
  await assert.rejects(act(view,'finish',{index:99,answer:'1/0'}),/valid number/);
  await assert.rejects(runtime.service.sessionAction(USER,view.session.id,{action:'finish',version:6,index:99,answer:'1'}),/changed/);
  assert.deepEqual((await pg.query('SELECT status,version,data FROM test_sessions WHERE id=$1',[view.session.id])).rows,before.rows);
  assert.equal((await pg.query('SELECT 1 FROM results WHERE session_id=$1',[view.session.id])).rows.length,0);
  assert.equal((await pg.query('SELECT 1 FROM answers WHERE session_id=$1 AND question_id=$2',[view.session.id,view.questions[0].id])).rows.length,0);
  await pg.query('DELETE FROM answers WHERE session_id=$1 AND question_id=(SELECT question_id FROM answers WHERE session_id=$1 LIMIT 1)',[view.session.id]);
  await assert.rejects(act(view,'finish',{index:99,answer:'1'}),/100/);
  assert.equal((await pg.query('SELECT 1 FROM results WHERE session_id=$1',[view.session.id])).rows.length,0);
});

test('browser database access cannot reveal silently graded active diagnostic answers',async()=>{
  const active=await readyToFinish('browser-diagnostic-privacy');assertSilent(active);
  await assert.rejects(pg.transaction(async tx=>{
    await tx.query("SELECT set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:USER,role:'authenticated'})]);await tx.exec('SET LOCAL ROLE authenticated');
    await tx.query('SELECT correct FROM public.answers WHERE session_id=$1',[active.session.id]);
  }),(error:unknown)=>{assert.equal((error as {code:string}).code,'42501');assert.match((error as Error).message,/permission denied/);return true});
  const results=await pg.transaction(async tx=>{
    await tx.query("SELECT set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:USER,role:'authenticated'})]);await tx.exec('SET LOCAL ROLE authenticated');
    return tx.query('SELECT data FROM public.results WHERE session_id=$1',[active.session.id]);
  });assert.equal(results.rows.length,0);
  const final=await key(active.questions[0].id),complete=await act(active,'finish',{index:99,answer:choice(final)});assert.equal(complete.result!.items.length,100);
});

test('remediation supplies two fresh families per mistake, all three outcome labels, and preserves original diagnostic results',async()=>{
  const source=await readyToFinish('remediation-source',false,[0,40,50]);const finalQuestion=await key(source.questions[0].id);
  const completed=await act(source,'finish',{index:99,answer:choice(finalQuestion)}),result=completed.result!;
  const original=await pg.query<{data:string}>('SELECT data FROM results WHERE session_id=$1',[result.id]);
  const mistake=result.items.find(item=>item.index===50)!;assert.equal(mistake.status,'incorrect');
  const encountered=new Set(result.items.map(item=>item.id));
  for(const expected of [2,1,0]){
    let pair:View=await post(['sessions',result.id,'remediate'],{questionId:mistake.id});
    const target=pair.session.remediation!.targets[0];assert.equal(target.questionIds.length,2);assert.equal(new Set(target.questionIds).size,2);
    const questions=await Promise.all(target.questionIds.map(key));assert.notEqual(questions[0].familyId||questions[0].family||questions[0].templateId,questions[1].familyId||questions[1].family||questions[1].templateId);
    for(const question of questions){assert.equal(question.skill,mistake.skill);assert.equal(question.subject,mistake.subject);assert.ok(Math.abs(question.difficulty-mistake.difficulty)<=1);assert.ok(!encountered.has(question.id));encountered.add(question.id)}
    for(let index=0;index<2;index++){const question=questions[index];pair=await act(pair,'answer',{index,answer:choice(question,index<expected),seconds:10});pair=await act(pair,'advance',{index})}
    assert.equal(pair.result!.remediation!.outcomes[0].correct,expected);assert.equal(pair.result!.remediation!.outcomes[0].label,['0/2 Correct — Needs More Practice','1/2 Correct — Keep Practicing','2/2 Correct — Strong Improvement'][expected]);
  }
  const all:View=await post(['sessions',result.id,'remediate'],{all:true});assert.equal(all.session.total,6);assert.equal(all.session.remediation!.targets.length,3);
  for(const target of all.session.remediation!.targets){assert.equal(target.questionIds.length,2);assert.ok(result.items.some(item=>item.id===target.originalQuestionId&&item.status==='incorrect'));for(const id of target.questionIds)assert.ok(!result.items.some(item=>item.id===id))}
  assert.deepEqual((await pg.query<{data:string}>('SELECT data FROM results WHERE session_id=$1',[result.id])).rows,original.rows);
  assert.equal((await pg.query<{count:number}>('SELECT count(*)::int AS count FROM answers a JOIN test_sessions s ON s.id=a.session_id WHERE a.user_id=$1 AND s.status=\'complete\' AND s.type=\'practice\' AND s.data::jsonb->\'remediation\'->>\'diagnosticId\'=$2',[USER,result.id])).rows[0].count,6,'Fresh remediation evidence must be available to future recommendations.');
  await assert.rejects(runtime.service.startDiagnosticRemediation(USER,result.id,{questionId:result.items[1].id}),/incorrect/);
  const active:View=await runtime.service.startSession(USER,{type:'diagnostic'});await assert.rejects(runtime.service.startDiagnosticRemediation(USER,active.session.id,{all:true}),/Finish/);
});

test('practice preserves the selected individual subtopic and rejects invalid subject/skill combinations',async()=>{
  const subtopic=findSubtopic('Percent increase')!.id;
  await assert.rejects(runtime.service.startSession(USER,{type:'practice',subject:'Math',skill:'Percentages',subtopic:'not-a-real-subtopic'}),/valid subtopic/);
  await assert.rejects(runtime.service.startSession(USER,{type:'practice',subject:'ELA',skill:'Percentages',subtopic}),/valid subtopic/);
  await assert.rejects(runtime.service.startSession(USER,{type:'practice',subject:'Math',skill:'Ratios',subtopic}),/valid subtopic/);
  let view:View=await runtime.service.startSession(USER,{type:'practice',subject:'Math',skill:'Percentages',subtopic,count:5,difficulty:3});
  for(let index=0;index<5;index++){
    const question=await key(view.questions[0].id);assert.equal(question.subtopic,subtopic);assert.equal(question.skill,'Percentages');
    view=await act(view,'answer',{index,answer:choice(question),seconds:13});view=await act(view,'advance',{index});
  }
  assert.equal(view.result!.total,5);assert.ok(view.result!.items.every(item=>item.subtopic===subtopic));
});
