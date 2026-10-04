import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {before,after,test} from 'node:test';
import {PGlite} from '@electric-sql/pglite';
import {ApplicationDatabase,type Transaction} from '../db/statements';
import {serviceRuntime} from './helpers/service-runtime';
import {DIAGNOSTIC,DIAGNOSTIC_BLUEPRINT,ELA_EDITING_SKILLS,ELA_READING_SKILLS,MATH_SKILLS,type Question} from '../lib/assessment';
import {legacyBeadQuestion} from './helpers/math-fixtures';
import {subtopicsFor} from '../lib/curriculum';
import {allReadingQuestionsV3} from '../lib/ela-v3';

type TestSessionView={
  session:{id:string;version:number;total:number;expires:number|null;cursor:number;answered:number;answers:Record<string,unknown>;tools:Record<string,{notes?:string}>;questionMap:{subject:string}[];diagnostic:{order:string}};
  questions:(Question&{index:number})[];
  result?:{total:number;unanswered:number;items:Question[]};
};

const USER='55555555-5555-4555-8555-555555555555';
let pg:PGlite;
let runtime:Awaited<ReturnType<typeof serviceRuntime>>;
function adapter(setup=false,userId=USER){
  const transaction:Transaction=operation=>pg.transaction(async tx=>{
    if(!setup){await tx.query("SELECT set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:userId,role:'authenticated'})]);await tx.exec('SET LOCAL ROLE rayan_app')}
    return operation(async(text,values)=>{const result=await tx.query<Record<string,unknown>>(text,values);return{rows:result.rows,rowCount:result.rowCount??result.affectedRows??result.rows.length}});
  });
  return new ApplicationDatabase(transaction);
}
before(async()=>{
  pg=new PGlite();
  await pg.exec(`CREATE ROLE anon NOLOGIN NOBYPASSRLS; CREATE ROLE authenticated NOLOGIN NOBYPASSRLS;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb NOT NULL DEFAULT '{}');
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid $$;
    GRANT USAGE ON SCHEMA public,auth TO authenticated,anon; GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated,anon;`);
  await pg.exec(await readFile(new URL('../supabase/migrations/202610020001_platform.sql',import.meta.url),'utf8'));
  await pg.query('INSERT INTO auth.users(id,email) VALUES($1,$2)',[USER,'diagnostic-fixture@example.test']);
  runtime=await serviceRuntime(adapter(true));
  await runtime.library.seedLibrary();
  runtime.setDatabase(adapter());
});
after(async()=>{await runtime?.close();await pg?.close()});
const read=(id:string):Promise<TestSessionView>=>runtime.service.ownSession(USER,id).then((session:unknown)=>runtime.service.viewSession(session));
const act=(state:TestSessionView,action:string,extra:Record<string,unknown>={}):Promise<TestSessionView>=>runtime.service.sessionAction(USER,state.session.id,{action,version:state.session.version,...extra});
function assertPublic(state:TestSessionView){for(const question of state.questions)for(const secret of ['correct','explanation','breakthrough','commonTrap','evidence','distractorReasons'])assert.equal(secret in question,false,secret)}

test('real diagnostic service completes exactly 100 with 50 ELA, 50 adaptive Math and intact passage groups',async()=>{
  let state:TestSessionView=await runtime.service.startSession(USER,{type:'diagnostic',timed:true});
  const id=state.session.id;
  assert.equal(state.session.total,100);assert.equal(state.session.expires,null);
  assert.equal(state.questions.length,4);assertPublic(state);
  await assert.rejects(act(state,'submit'),/100|complete|answer/i);
  const levels:number[]=[];let answered=0;
  while(!state.result){
    const visible=state.questions;
    if(visible[0].passageId){assert.ok(visible.every(q=>q.passageId===visible[0].passageId&&q.difficulty===visible[0].difficulty));assert.equal(visible.length,4)}
    for(const question of visible){
      const stored=await pg.query<{data:string}>('SELECT data FROM questions WHERE id=$1',[question.id]);
      const key=JSON.parse(stored.rows[0].data).correct;
      const math=question.subject==='Math';if(math)levels.push(question.difficulty);
      const correct=!(math&&levels.length>25);
      const answer=correct?key:question.type==='grid'?String(Number(key)+1234):(Number(key)+1)%4;
      state=await act(state,'answer',{index:question.index,answer:question.type==='grid'?String(answer):answer,seconds:15});answered++;
      assertPublic(state);
      assert.equal(state.session.total,100);
      if(answered===32||answered===50||answered===99){await assert.rejects(act(state,'submit'),/100|complete|answer/i);const restored=await read(id);assert.equal(restored.session.answered,answered);assert.deepEqual(restored.session.answers,state.session.answers)}
    }
    const previousLast=visible.at(-1)!.index;
    state=await act(state,'advance',{index:state.session.cursor});
    if(!state.result){assert.ok(state.session.cursor>previousLast);assertPublic(state)}
  }
  assert.equal(answered,100);assert.equal(state.result.total,100);assert.equal(state.result.unanswered,0);
  const items=state.result.items;
  assert.equal(new Set(items.map(q=>q.id)).size,100);
  assert.equal(items.filter(q=>q.subject==='ELA').length,50);
  assert.equal(items.filter(q=>q.subject==='Math').length,50);
  assert.equal(items.filter(q=>q.subject==='ELA'&&q.passageId).length,40);
  assert.equal(items.filter(q=>q.subject==='ELA'&&!q.passageId).length,10);
  assert.ok(items.slice(0,50).every(q=>q.subject==='ELA'));
  assert.ok(items.slice(50).every(q=>q.subject==='Math'));
  for(const skill of MATH_SKILLS)assert.ok(items.some(q=>q.subject==='Math'&&q.skill===skill),`Missing major Math evidence: ${skill}`);
  for(const skill of ELA_READING_SKILLS)assert.ok(items.some(q=>q.passageId&&q.skill===skill),`Missing major reading evidence: ${skill}`);
  for(const skill of ELA_EDITING_SKILLS)assert.ok(items.some(q=>q.subject==='ELA'&&!q.passageId&&q.skill===skill),`Missing major revising/editing evidence: ${skill}`);
  assert.ok(levels.slice(0,25).some(level=>level>levels[0]),'correct Math answers should raise difficulty');
  assert.ok(levels.at(-1)!<Math.max(...levels),'incorrect Math answers should lower difficulty');
  assert.equal((await read(id)).result?.total,100);
  const results=await pg.query<{count:number}>('SELECT count(*)::int AS count FROM results WHERE session_id=$1',[id]);assert.equal(results.rows[0].count,1);
});

test('active short legacy diagnostic upgrades without losing answers, IDs or saved tools',async()=>{
  const reading=await pg.query<{id:string}>('SELECT id FROM questions WHERE passage_id IS NOT NULL ORDER BY id LIMIT 1');
  const math=await pg.query<{id:string}>("SELECT id FROM questions WHERE subject='Math' ORDER BY id LIMIT 1");
  const ids=[reading.rows[0].id,math.rows[0].id],id='legacy-upgrade-fixture';
  const state={ids,max:40,cursor:1,lockedUntil:1,config:{timed:true},tools:{[ids[0]]:{notes:'Preserve this note'}}};
  await pg.query('INSERT INTO test_sessions(id,user_id,type,status,created,updated,expires,version,data) VALUES($1,$2,\'diagnostic\',\'active\',$3,$3,$4,0,$5)',[id,USER,Date.now(),Date.now()+3600000,JSON.stringify(state)]);
  await pg.query('INSERT INTO answers(session_id,question_id,user_id,answer,correct,seconds,updated) VALUES($1,$2,$3,\'0\',0,12,$4)',[id,ids[0],USER,Date.now()]);
  const resumed=await read(id);
  assert.equal(resumed.session.total,100);assert.equal(resumed.session.expires,null);
  assert.equal(resumed.session.cursor,1);assert.equal(resumed.session.answers[ids[0]],0);
  assert.equal(resumed.session.tools[ids[0]].notes,'Preserve this note');
  assert.deepEqual(resumed.session.questionMap.map(q=>q.subject),['ELA','Math']);
  assert.equal(resumed.session.diagnostic.order,'legacy-preserved');
  await assert.rejects(act(resumed,'submit'),/100|complete|answer/i);
});

test('reading selection stays at the requested level and never replays exposed passages when its unseen supply is exhausted',async()=>{
  const first:Question[]=await runtime.library.selectDiagnosticPassage(USER,1,[]);
  const second:Question[]=await runtime.library.selectDiagnosticPassage(USER,1,first.map(q=>q.id));
  assert.equal(first.length,4);assert.equal(second.length,4);
  assert.ok(first.concat(second).every(q=>q.difficulty===1));
  assert.notEqual(first[0].passageId,second[0].passageId);
  const now=Date.now(),sid='selector-exposure-fixture';
  await pg.query("INSERT INTO test_sessions(id,user_id,type,status,created,updated,data) VALUES($1,$2,'practice','active',$3,$3,'{}')",[sid,USER,now]);
  await pg.query("INSERT INTO question_exposure(user_id,question_id,first_seen,last_seen,times_seen,session_id,session_type) SELECT $1,id,100,200,1,$2,'practice' FROM questions WHERE subject='ELA' AND passage_id IS NOT NULL AND difficulty=1 ON CONFLICT(user_id,question_id) DO UPDATE SET last_seen=200",[USER,sid]);
  await pg.query('UPDATE question_exposure SET last_seen=100 WHERE user_id=$1 AND question_id IN (SELECT id FROM questions WHERE passage_id=$2)',[USER,second[0].passageId]);
  const newlySelected=new Set<string>();let exhaustion:unknown;
  for(let attempt=0;attempt<100;attempt++){
    try{
      const next:Question[]=await runtime.library.selectDiagnosticPassage(USER,1,[]);
      assert.ok(next.every(q=>q.difficulty===1));assert.equal(next.length,4);
      assert.notEqual(next[0].passageId,first[0].passageId);assert.notEqual(next[0].passageId,second[0].passageId);
      assert.ok(!newlySelected.has(next[0].passageId!));newlySelected.add(next[0].passageId!);
      await pg.query("INSERT INTO question_exposure(user_id,question_id,first_seen,last_seen,times_seen,session_id,session_type) SELECT $1,id,100,200,1,$2,'practice' FROM questions WHERE passage_id=$3 ON CONFLICT(user_id,question_id) DO NOTHING",[USER,sid,next[0].passageId]);
    }catch(error){exhaustion=error;break}
  }
  assert.equal((exhaustion as {status:number}).status,503,'A reviewed finite corpus cannot be silently replayed as fresh content.');
  assert.match((exhaustion as Error).message,/saved|replenish|created/i);
  const queued=await pg.query("SELECT 1 FROM content_requests WHERE difficulty=1 AND status='queued' AND plan->>'kind'='reading' LIMIT 1");assert.equal(queued.rows.length,1);
  const resumeId='reading-replenishment-resume',ids=first.map(q=>q.id),savedTools={[ids[0]]:{notes:'Preserve the student’s notes while waiting for reviewed content.'}};
  const savedState={ids,max:100,cursor:3,lockedUntil:0,diagnosticVersion:DIAGNOSTIC.version,diagnosticOrder:'ela-then-math',diagnosticBlueprint:{...DIAGNOSTIC_BLUEPRINT},diagnosticLevels:{ELA:1,Math:2},config:{subject:'Mixed',timed:false},tools:savedTools};
  await pg.query("INSERT INTO test_sessions(id,user_id,type,status,created,updated,version,data) VALUES($1,$2,'diagnostic','active',$3,$3,5,$4)",[resumeId,USER,now,JSON.stringify(savedState)]);
  for(let index=0;index<3;index++)await pg.query('INSERT INTO answers(session_id,question_id,user_id,answer,correct,seconds,updated) VALUES($1,$2,$3,$4,0,12,$5)',[resumeId,ids[index],USER,JSON.stringify((Number(first[index].correct)+1)%4),now+index]);
  const resumed=await read(resumeId);
  await assert.rejects(act(resumed,'next',{index:3,answer:(Number(first[3].correct)+1)%4,seconds:13}),(error:unknown)=>{assert.equal((error as {status:number}).status,503);return true});
  const preserved=await read(resumeId);assert.equal(preserved.session.answered,4);assert.equal(preserved.session.cursor,3);assert.equal(preserved.session.total,100);assert.deepEqual(preserved.session.tools,savedTools);assertPublic(preserved);
  const storedState=await pg.query<{data:string;status:string}>('SELECT data,status FROM test_sessions WHERE id=$1',[resumeId]);assert.equal(storedState.rows[0].status,'active');assert.deepEqual(JSON.parse(storedState.rows[0].data).ids,ids);
  assert.equal((await pg.query('SELECT 1 FROM results WHERE session_id=$1',[resumeId])).rows.length,0);
  await pg.query('DELETE FROM question_exposure WHERE user_id=$1 AND session_id=$2',[USER,sid]);
});

test('stored Math feedback and completed results improve without rewriting saved grading or question records',async()=>{
  const legacy=structuredClone(legacyBeadQuestion),now=Date.now(),id='legacy-feedback-result';
  runtime.setDatabase(adapter(true));
  try{await runtime.library.putQuestions([legacy],'approved',true)}finally{runtime.setDatabase(adapter())}
  const stored=await pg.query<{data:string}>('SELECT data FROM questions WHERE id=$1',[legacy.id]);
  assert.ok(stored.rows.length);
  const result={id,type:'practice',created:now,total:1,correct:0,incorrect:1,unanswered:0,accuracy:0,profile:{overall:2.5},items:[{...legacy,index:0,answer:2,status:'incorrect',seconds:12}]};
  await pg.query("INSERT INTO test_sessions(id,user_id,type,status,created,updated,version,data) VALUES($1,$2,'practice','complete',$3,$3,4,$4)",[id,USER,now,JSON.stringify({ids:[legacy.id],max:1,cursor:0,lockedUntil:0})]);
  await pg.query("INSERT INTO answers(session_id,question_id,user_id,answer,correct,seconds,updated) VALUES($1,$2,$3,'2',0,12,$4)",[id,legacy.id,USER,now]);
  await pg.query('INSERT INTO results(session_id,user_id,created,data) VALUES($1,$2,$3,$4)',[id,USER,now,JSON.stringify(result)]);
  const loaded:Question=await runtime.library.getQuestion(legacy.id),bulk:Question[] = await runtime.library.getQuestions([legacy.id]);
  for(const item of [loaded,bulk[0]]){
    assert.deepEqual(item.choices,legacy.choices);assert.equal(item.correct,1);assert.equal(item.text,legacy.text);
    assert.match(item.explanation,/36[\s\S]*99[\s\S]*135/);assert.doesNotMatch(item.distractorReasons![2],/required sequence/i);
  }
  const view:{result:typeof result}=await runtime.service.viewSession(await runtime.service.ownSession(USER,id));
  assert.equal(view.result.items[0].answer,2);assert.equal(view.result.items[0].status,'incorrect');assert.equal(view.result.items[0].seconds,12);
  assert.deepEqual(view.result.items[0].choices,legacy.choices);assert.equal(view.result.items[0].correct,1);
  assert.match(view.result.items[0].explanation,/36[\s\S]*99[\s\S]*135/);assert.doesNotMatch(view.result.items[0].distractorReasons![2],/required sequence/i);
  assert.deepEqual(view.result.profile,result.profile);assert.equal(view.result.correct,0);assert.equal(view.result.accuracy,0);
  const unchanged=await pg.query<{data:string}>('SELECT data FROM questions WHERE id=$1',[legacy.id]);assert.deepEqual(unchanged.rows,stored.rows);
  const savedResult=await pg.query<{data:string}>('SELECT data FROM results WHERE session_id=$1',[id]);assert.deepEqual(JSON.parse(savedResult.rows[0].data),result);
  const answer=await pg.query<{answer:string;correct:number;seconds:number}>('SELECT answer,correct,seconds FROM answers WHERE session_id=$1',[id]);assert.deepEqual(answer.rows,[{answer:'2',correct:0,seconds:12}]);
  const next:Question=await runtime.library.selectQuestion(USER,'Math','Ratios',2,[]);
  assert.equal(next.generationMethod,'procedural-v3');assert.ok(next.familyId);assert.ok(next.subtopic);assert.notEqual(next.id,legacy.id);
});

test('Math selection uses only an approved, exact-level, exact-subtopic variant unseen by this student',async()=>{
  const target=subtopicsFor('Math','Probability').find(topic=>topic.label==='Simple probability')!;
  const eligible:Question=runtime.math.generateMathV3(target.id,1,184393,runtime.math.mathFamilies(target.id)[0]);
  runtime.setDatabase(adapter(true));try{await runtime.library.putQuestions([eligible],'approved',true)}finally{runtime.setDatabase(adapter())}
  const pool=await pg.query<{id:string}>("SELECT id FROM questions WHERE subject='Math' AND skill='Probability' AND difficulty=1 AND status='approved'");
  const excluded=pool.rows.filter(row=>row.id!==eligible.id).map(row=>row.id);
  const before=await pg.query<{count:number}>('SELECT count(*)::int AS count FROM questions');
  const newStudent='45454545-4545-4545-8545-454545454545';await pg.query('INSERT INTO auth.users(id,email) VALUES($1,$2)',[newStudent,'unseen-selector-fixture@example.test']);
  runtime.setDatabase(adapter(false,newStudent));
  try{
    const selected:Question=await runtime.library.selectQuestion(newStudent,'Math','Probability',1,excluded,true,{subtopic:target.id});
    assert.equal(selected.id,eligible.id);assert.equal(selected.subject,'Math');assert.equal(selected.skill,'Probability');assert.equal(selected.difficulty,1);assert.equal(selected.subtopic,target.id);
    assert.ok(!excluded.includes(selected.id));
    const seen=await pg.query('SELECT 1 FROM question_exposure WHERE user_id=$1 AND question_id=$2',[newStudent,selected.id]);assert.equal(seen.rows.length,0);
    const after=await pg.query<{count:number}>('SELECT count(*)::int AS count FROM questions');assert.equal(after.rows[0].count,before.rows[0].count);
  }finally{runtime.setDatabase(adapter())}
});

test('normal practice never selects a cached unseen question from a passage the student has already encountered',async()=>{
  const target=subtopicsFor('ELA','Main idea').find(topic=>topic.label==='Main idea')!,corpus=allReadingQuestionsV3();
  const blocked=corpus.find(q=>q.subtopic===target.id&&q.difficulty===2)!,encountered=corpus.find(q=>q.passageId===blocked.passageId&&q.id!==blocked.id)!,fresh=corpus.find(q=>q.subtopic===target.id&&q.difficulty===2&&q.passageId!==blocked.passageId)!;
  assert.ok(blocked&&encountered&&fresh,'The regression requires distinct authored passages and different questions on the exposed passage.');
  for(const question of [blocked,fresh])await pg.query('INSERT INTO passages(id,title,difficulty,type,content,data,status) VALUES($1,$2,$3,$4,$5,$6,\'approved\') ON CONFLICT DO NOTHING',[question.passageId,question.passage!.title,question.difficulty,question.passage!.type,question.passage!.content,JSON.stringify(question.passage)]);
  runtime.setDatabase(adapter(true));try{await runtime.library.putQuestions([blocked,encountered,fresh],'approved',true)}finally{runtime.setDatabase(adapter())}
  const newStudent='96969696-9696-4696-8696-969696969696',sessionId='old-reading-passage-exposure',now=Date.now();
  await pg.query('INSERT INTO auth.users(id,email) VALUES($1,$2)',[newStudent,'passage-exposure-fixture@example.test']);
  await pg.query("INSERT INTO test_sessions(id,user_id,type,status,created,updated,version,data) VALUES($1,$2,'practice','active',$3,$3,0,$4)",[sessionId,newStudent,now,JSON.stringify({ids:[encountered.id],max:1,cursor:0,lockedUntil:0,config:{subject:'ELA'},tools:{}})]);
  await pg.query("INSERT INTO question_exposure(user_id,question_id,first_seen,last_seen,times_seen,session_id,session_type) VALUES($1,$2,1,1,1,$3,'practice')",[newStudent,encountered.id,sessionId]);
  // The earlier passage is outside the recent-history window. Passage-level
  // protection must therefore use all exposure, rather than recent IDs alone.
  const recentMath=await pg.query<{id:string}>("SELECT id FROM questions WHERE subject='Math' ORDER BY id LIMIT 18");
  for(let index=0;index<recentMath.rows.length;index++)await pg.query("INSERT INTO question_exposure(user_id,question_id,first_seen,last_seen,times_seen,session_id,session_type) VALUES($1,$2,$3,$3,1,$4,'practice')",[newStudent,recentMath.rows[index].id,now+index,sessionId]);
  assert.equal((await pg.query('SELECT 1 FROM question_exposure WHERE user_id=$1 AND question_id=$2',[newStudent,blocked.id])).rows.length,0,'The cached target question itself must be unseen.');
  await pg.query('UPDATE questions SET created=$1 WHERE id=$2',[now+100000,blocked.id]);
  const countBefore=(await pg.query<{count:number}>('SELECT count(*)::int AS count FROM questions')).rows[0].count;
  runtime.setDatabase(adapter(false,newStudent));
  try{
    const practice:TestSessionView=await runtime.service.startSession(newStudent,{type:'practice',subject:'ELA',skill:'Main idea',subtopic:target.id,difficulty:2,count:5}),selected=practice.questions[0];
    assert.notEqual(selected.id,blocked.id);assert.notEqual(selected.passageId,blocked.passageId);
    assert.equal(selected.subtopic,target.id);assert.equal(selected.skill,'Main idea');assert.equal(selected.difficulty,2);assertPublic(practice);
    assert.equal((await pg.query<{count:number}>('SELECT count(*)::int AS count FROM questions')).rows[0].count,countBefore,'An unseen, reviewed cached passage should be selected before generating another.');
    assert.equal((await pg.query('SELECT 1 FROM question_exposure WHERE user_id=$1 AND question_id=$2',[newStudent,blocked.id])).rows.length,0,'The seen passage must not be re-exposed through a different question.');
  }finally{runtime.setDatabase(adapter())}
});

test('exhausted Math generation cannot repeat exposed/session items or substitute another level and leaves saved progress intact',async context=>{
  const seed=172949;
  const candidates=subtopicsFor('Math','Probability').flatMap(topic=>runtime.math.mathFamilies(topic.id).map((family:string)=>runtime.math.generateMathV3(topic.id,1,seed,family)));
  runtime.setDatabase(adapter(true));try{await runtime.library.putQuestions(candidates,'approved',true)}finally{runtime.setDatabase(adapter())}
  const pool=await pg.query<{id:string}>("SELECT id FROM questions WHERE subject='Math' AND skill='Probability' AND difficulty=1 AND status='approved' ORDER BY id");
  const generated=pool.rows[0].id;
  const sessionId='math-exhaustion-fixture',now=Date.now(),saved=JSON.stringify({ids:[generated],max:100,cursor:0,lockedUntil:0,tools:{[generated]:{notes:'Keep this saved work'}}});
  await pg.query("INSERT INTO test_sessions(id,user_id,type,status,created,updated,version,data) VALUES($1,$2,'diagnostic','active',$3,$3,7,$4)",[sessionId,USER,now,saved]);
  await pg.query('INSERT INTO answers(session_id,question_id,user_id,answer,correct,seconds,updated) VALUES($1,$2,$3,\'0\',0,12,$4)',[sessionId,generated,USER,now]);
  const exposed=pool.rows.at(-1)!.id,excluded=pool.rows.filter(row=>row.id!==exposed).map(row=>row.id);
  await pg.query("INSERT INTO question_exposure(user_id,question_id,first_seen,last_seen,times_seen,session_id,session_type) VALUES($1,$2,$3,$3,1,$4,'diagnostic') ON CONFLICT(user_id,question_id) DO UPDATE SET last_seen=excluded.last_seen",[USER,exposed,now,sessionId]);
  const snapshot=await pg.query<{data:string;version:number}>('SELECT data,version FROM test_sessions WHERE id=$1',[sessionId]);
  const random=context.mock.method(crypto,'getRandomValues',(array:Uint32Array)=>{array[0]=seed;return array});
  try{
    await assert.rejects(runtime.library.selectDiagnosticMath(USER,'Probability',1,excluded),(error:unknown)=>{assert.equal((error as {status:number}).status,503);assert.match((error as Error).message,/answers are saved/i);return true});
    assert.ok(random.mock.callCount()>0);assert.ok(random.mock.callCount()<1000,'Colliding generation retries must remain bounded.');
    const unchanged=await pg.query<{data:string;version:number}>('SELECT data,version FROM test_sessions WHERE id=$1',[sessionId]);assert.deepEqual(unchanged.rows,snapshot.rows);
    const answer=await pg.query<{answer:string}>('SELECT answer FROM answers WHERE session_id=$1 AND question_id=$2',[sessionId,generated]);assert.equal(answer.rows[0].answer,'0');
  }finally{random.mock.restore()}
});
