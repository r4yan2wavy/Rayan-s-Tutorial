import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {before,after,test} from 'node:test';
import {PGlite} from '@electric-sql/pglite';
import {ApplicationDatabase,type Transaction} from '../db/statements';
import {serviceRuntime} from './helpers/service-runtime';
import type {Question} from '../lib/assessment';

type TestSessionView={
  session:{id:string;version:number;total:number;expires:number|null;cursor:number;answered:number;answers:Record<string,unknown>;tools:Record<string,{notes?:string}>;questionMap:{subject:string}[];diagnostic:{order:string}};
  questions:(Question&{index:number})[];
  result?:{total:number;unanswered:number;items:Question[]};
};

const USER='55555555-5555-4555-8555-555555555555';
let pg:PGlite;
let runtime:Awaited<ReturnType<typeof serviceRuntime>>;
function adapter(setup=false){
  const transaction:Transaction=operation=>pg.transaction(async tx=>{
    if(!setup){await tx.query("SELECT set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:USER,role:'authenticated'})]);await tx.exec('SET LOCAL ROLE rayan_app')}
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

test('passage selection stays at the requested level, excludes session repeats, and rotates oldest only after exhaustion',async()=>{
  const first:Question[]=await runtime.library.selectDiagnosticPassage(USER,1,[]);
  const second:Question[]=await runtime.library.selectDiagnosticPassage(USER,1,first.map(q=>q.id));
  assert.equal(first.length,4);assert.equal(second.length,4);
  assert.ok(first.concat(second).every(q=>q.difficulty===1));
  assert.notEqual(first[0].passageId,second[0].passageId);
  const now=Date.now(),sid='selector-exposure-fixture';
  await pg.query("INSERT INTO test_sessions(id,user_id,type,status,created,updated,data) VALUES($1,$2,'practice','active',$3,$3,'{}')",[sid,USER,now]);
  await pg.query("INSERT INTO question_exposure(user_id,question_id,first_seen,last_seen,times_seen,session_id,session_type) SELECT $1,id,100,200,1,$2,'practice' FROM questions WHERE subject='ELA' AND passage_id IS NOT NULL AND difficulty=1 ON CONFLICT(user_id,question_id) DO UPDATE SET last_seen=200",[USER,sid]);
  await pg.query('UPDATE question_exposure SET last_seen=100 WHERE user_id=$1 AND question_id IN (SELECT id FROM questions WHERE passage_id=$2)',[USER,second[0].passageId]);
  assert.equal((await runtime.library.selectDiagnosticPassage(USER,1,[]))[0].passageId,second[0].passageId);
  await pg.query('DELETE FROM question_exposure WHERE user_id=$1 AND question_id IN (SELECT id FROM questions WHERE passage_id=$2)',[USER,first[0].passageId]);
  assert.equal((await runtime.library.selectDiagnosticPassage(USER,1,[]))[0].passageId,first[0].passageId,'unseen must win over the oldest seen passage');
});

test('exhausted global Math generation reuses only an exact-level approved variant unseen by this student',async context=>{
  const rows=await pg.query<{id:string}>("SELECT q.id FROM questions q WHERE q.subject='Math' AND q.skill='Probability' AND q.difficulty=1 AND q.status='approved' ORDER BY q.id");
  assert.ok(rows.rows.length>2);
  const generated=rows.rows[0].id,seed=Number(/-(\d+)-[01]$/.exec(generated)?.[1]);
  assert.ok(Number.isSafeInteger(seed));
  const candidates=await pg.query<{id:string}>("SELECT q.id FROM questions q WHERE q.subject='Math' AND q.skill='Probability' AND q.difficulty=1 AND q.status='approved' AND q.id<>$1 AND NOT EXISTS(SELECT 1 FROM question_exposure e WHERE e.user_id=$2 AND e.question_id=q.id) ORDER BY q.id",[generated,USER]);
  assert.ok(candidates.rows.length>0);
  const eligible=candidates.rows[0].id,excluded=rows.rows.filter(row=>row.id!==eligible).map(row=>row.id);
  const before=await pg.query<{count:number}>('SELECT count(*)::int AS count FROM questions');
  const random=context.mock.method(crypto,'getRandomValues',(array:Uint32Array)=>{array[0]=seed;return array});
  try{
    const selected:Question=await runtime.library.selectDiagnosticMath(USER,'Probability',1,excluded);
    assert.equal(random.mock.callCount(),40,'Every generation attempt must collide before selecting from the shared library.');
    assert.equal(selected.id,eligible);assert.equal(selected.subject,'Math');assert.equal(selected.skill,'Probability');assert.equal(selected.difficulty,1);
    assert.ok(!excluded.includes(selected.id));
    const seen=await pg.query('SELECT 1 FROM question_exposure WHERE user_id=$1 AND question_id=$2',[USER,selected.id]);assert.equal(seen.rows.length,0);
    const after=await pg.query<{count:number}>('SELECT count(*)::int AS count FROM questions');assert.equal(after.rows[0].count,before.rows[0].count);
  }finally{random.mock.restore()}
});

test('exhausted Math generation cannot repeat exposed/session items or substitute another level and leaves saved progress intact',async context=>{
  const pool=await pg.query<{id:string}>("SELECT id FROM questions WHERE subject='Math' AND skill='Probability' AND difficulty=1 AND status='approved' ORDER BY id");
  const generated=pool.rows[0].id,seed=Number(/-(\d+)-[01]$/.exec(generated)?.[1]);
  const sessionId='math-exhaustion-fixture',now=Date.now(),saved=JSON.stringify({ids:[generated],max:100,cursor:0,lockedUntil:0,tools:{[generated]:{notes:'Keep this saved work'}}});
  await pg.query("INSERT INTO test_sessions(id,user_id,type,status,created,updated,version,data) VALUES($1,$2,'diagnostic','active',$3,$3,7,$4)",[sessionId,USER,now,saved]);
  await pg.query('INSERT INTO answers(session_id,question_id,user_id,answer,correct,seconds,updated) VALUES($1,$2,$3,\'0\',0,12,$4)',[sessionId,generated,USER,now]);
  const exposed=pool.rows.at(-1)!.id,excluded=pool.rows.filter(row=>row.id!==exposed).map(row=>row.id);
  await pg.query("INSERT INTO question_exposure(user_id,question_id,first_seen,last_seen,times_seen,session_id,session_type) VALUES($1,$2,$3,$3,1,$4,'diagnostic') ON CONFLICT(user_id,question_id) DO UPDATE SET last_seen=excluded.last_seen",[USER,exposed,now,sessionId]);
  const snapshot=await pg.query<{data:string;version:number}>('SELECT data,version FROM test_sessions WHERE id=$1',[sessionId]);
  const random=context.mock.method(crypto,'getRandomValues',(array:Uint32Array)=>{array[0]=seed;return array});
  try{
    await assert.rejects(runtime.library.selectDiagnosticMath(USER,'Probability',1,excluded),(error:unknown)=>{assert.equal((error as {status:number}).status,503);assert.match((error as Error).message,/answers are saved/i);return true});
    assert.equal(random.mock.callCount(),40);
    const unchanged=await pg.query<{data:string;version:number}>('SELECT data,version FROM test_sessions WHERE id=$1',[sessionId]);assert.deepEqual(unchanged.rows,snapshot.rows);
    const answer=await pg.query<{answer:string}>('SELECT answer FROM answers WHERE session_id=$1 AND question_id=$2',[sessionId,generated]);assert.equal(answer.rows[0].answer,'0');
  }finally{random.mock.restore()}
});
