import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {after,before,test} from 'node:test';
import {PGlite,type Transaction as PgTransaction} from '@electric-sql/pglite';
import {ApplicationDatabase,type Transaction} from '../db/statements';

const A='11111111-1111-4111-8111-111111111111';
const B='22222222-2222-4222-8222-222222222222';
const EXISTING='33333333-3333-4333-8333-333333333333';
const NOW=1_800_000_000_000;
let pg:PGlite;
type AppRole='authenticated'|'rayan_app';

async function asUser<T>(id:string|null,role:AppRole,operation:(tx:PgTransaction)=>Promise<T>){
  return pg.transaction(async tx=>{
    await tx.query("SELECT set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:id,role:'authenticated'})]);
    await tx.exec(`SET LOCAL ROLE ${role}`);
    return operation(tx);
  });
}
function application(id:string){
  const transaction:Transaction=operation=>asUser(id,'rayan_app',async tx=>operation(async(text,values)=>{
    const result=await tx.query<Record<string,unknown>>(text,values);
    return{rows:result.rows,rowCount:result.rowCount??result.affectedRows??result.rows.length};
  }));
  return new ApplicationDatabase(transaction);
}
function hasCode(code:string){return(error:unknown)=>{
  assert.equal((error as {code?:string}).code,code);return true;
};}
async function session(id:string,userId=A,version=0){
  await pg.query('INSERT INTO public.test_sessions(id,user_id,type,status,created,updated,version,data) VALUES($1,$2,\'practice\',\'active\',$3,$3,$4,$5)',[id,userId,NOW,version,JSON.stringify({ids:['q1','q2'],max:2,cursor:0})]);
}

before(async()=>{
  pg=new PGlite();
  await pg.exec(`
    CREATE ROLE anon NOLOGIN NOBYPASSRLS;
    CREATE ROLE authenticated NOLOGIN NOBYPASSRLS;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb NOT NULL DEFAULT '{}');
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid
    $$;
    GRANT USAGE ON SCHEMA public,auth TO authenticated,anon;
    GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated,anon;
  `);
  await pg.query('INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES($1,$2,$3)',[EXISTING,'Before@example.test',JSON.stringify({name:'Existing student',role:'admin'})]);
  const migration=await readFile(new URL('../supabase/migrations/202610020001_platform.sql',import.meta.url),'utf8');
  await pg.exec(migration);
  await pg.query('INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES($1,$2,$3),($4,$5,$6)',[A,'StudentA@example.test',JSON.stringify({display_name:'Student A',role:'admin',avatar_url:'https://example.test/a.png'}),B,'studentb@example.test',JSON.stringify({full_name:'Student B'})]);
  await pg.query('INSERT INTO public.questions(id,subject,skill,difficulty,fingerprint,data,status,created) VALUES($1,$2,$3,2,$4,$5,$6,$7),($8,$2,$3,3,$9,$10,$6,$7),($11,$2,$3,4,$12,$13,$14,$7)',[
    'q1','Math','Ratios','fingerprint1',JSON.stringify({id:'q1',correct:2,explanation:'Private answer key'}),'approved',NOW,
    'q2','fingerprint2',JSON.stringify({id:'q2',correct:1}),'draft-q','fingerprint3',JSON.stringify({id:'draft-q',correct:0}),'draft',
  ]);
  await session('student-a',A);await session('student-b',B);
});
after(async()=>{await pg?.close();});

test('migration executes and every application table enables RLS',async()=>{
  const result=await pg.query<{relname:string;relrowsecurity:boolean}>("SELECT relname,relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND relkind='r' ORDER BY relname");
  assert.equal(result.rows.length,11);
  assert.ok(result.rows.every(row=>row.relrowsecurity),JSON.stringify(result.rows));
  const columns=await pg.query<{column_name:string}>("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles'");
  assert.ok(!columns.rows.some(row=>['password','password_hash','salt'].includes(row.column_name)));
  const role=await pg.query<{rolcanlogin:boolean;rolbypassrls:boolean}>("SELECT rolcanlogin,rolbypassrls FROM pg_roles WHERE rolname='rayan_app'");
  assert.deepEqual(role.rows,[{rolcanlogin:false,rolbypassrls:false}]);
  const membership=await pg.query<{member:boolean}>("SELECT pg_has_role('authenticated','rayan_app','MEMBER') AS member");
  assert.equal(membership.rows[0].member,false);
});

test('Auth trigger/backfill use the stable UUID and ignore admin user metadata',async()=>{
  const profiles=await pg.query<{id:string;email:string;display_name:string;role:string;avatar_url:string|null}>('SELECT id,email,display_name,role,avatar_url FROM public.profiles ORDER BY id');
  assert.equal(profiles.rows.length,3);
  assert.equal(profiles.rows[0].id,A);
  assert.equal(profiles.rows[0].email,'studenta@example.test');
  assert.equal(profiles.rows[0].display_name,'Student A');
  assert.equal(profiles.rows[0].avatar_url,'https://example.test/a.png');
  assert.ok(profiles.rows.every(row=>row.role==='student'));
  assert.equal(profiles.rows[2].display_name,'Existing student');
  await pg.query('UPDATE auth.users SET raw_user_meta_data=$1 WHERE id=$2',[JSON.stringify({name:'Changed Google name',role:'admin'}),A]);
  const unchanged=await pg.query<{display_name:string;role:string}>('SELECT display_name,role FROM public.profiles WHERE id=$1',[A]);
  assert.deepEqual(unchanged.rows,[{display_name:'Student A',role:'student'}]);
  const count=await pg.query<{n:number}>('SELECT count(*)::integer AS n FROM public.profiles WHERE id=$1',[A]);
  assert.equal(count.rows[0].n,1);
});

test('browser student can read/edit only their own profile and cannot elevate role',async()=>{
  const own=await asUser(A,'authenticated',tx=>tx.query<{id:string}>('SELECT id FROM public.profiles'));
  assert.deepEqual(own.rows,[{id:A}]);
  const other=await asUser(A,'authenticated',tx=>tx.query('UPDATE public.profiles SET display_name=$1 WHERE id=$2 RETURNING id',['Tampered',B]));
  assert.equal(other.rows.length,0);
  const edit=await asUser(A,'authenticated',tx=>tx.query<{display_name:string}>('UPDATE public.profiles SET display_name=$1 WHERE id=$2 RETURNING display_name',['Updated display name',A]));
  assert.deepEqual(edit.rows,[{display_name:'Updated display name'}]);
  await assert.rejects(asUser(A,'authenticated',tx=>tx.query("UPDATE public.profiles SET role='admin' WHERE id=$1",[A])),hasCode('42501'));
  await assert.rejects(asUser(A,'authenticated',tx=>tx.query('UPDATE public.profiles SET id=$1 WHERE id=$2',[B,A])),hasCode('42501'));
});

test('browser progress is owner-only and grading writes/answer keys are inaccessible',async()=>{
  const sessions=await asUser(A,'authenticated',tx=>tx.query<{id:string}>('SELECT id FROM public.test_sessions ORDER BY id'));
  assert.deepEqual(sessions.rows,[{id:'student-a'}]);
  await assert.rejects(asUser(A,'authenticated',tx=>tx.query("UPDATE public.test_sessions SET status='complete' WHERE id='student-a'")),hasCode('42501'));
  await assert.rejects(asUser(A,'authenticated',tx=>tx.query("INSERT INTO public.answers(session_id,question_id,user_id,answer,correct,seconds,updated) VALUES('student-a','q1',$1,'2',1,1,$2)",[A,NOW])),hasCode('42501'));
  await assert.rejects(asUser(A,'authenticated',tx=>tx.query('SELECT data FROM public.questions')),hasCode('42501'));
  await assert.rejects(asUser(A,'authenticated',tx=>tx.query('SELECT * FROM public.rate_limits')),hasCode('42501'));
  await assert.rejects(asUser(A,'authenticated',tx=>tx.query('SELECT public.delete_my_account()')),hasCode('42501'));
  const catalog=await asUser(A,'authenticated',tx=>tx.query<Record<string,unknown>>('SELECT * FROM public.question_catalog ORDER BY id'));
  assert.deepEqual(catalog.rows.map(row=>row.id),['q1','q2']);
  assert.deepEqual(Object.keys(catalog.rows[0]).sort(),['difficulty','id','skill','subject']);
});

test('server role enforces ownership even without application WHERE filters',async()=>{
  const db=application(A);
  assert.deepEqual((await db.prepare('SELECT id FROM test_sessions ORDER BY id').all()).results,[{id:'student-a'}]);
  const foreignUpdate=await db.prepare("UPDATE test_sessions SET version=version+1 WHERE id=?").bind('student-b').run();
  assert.equal(foreignUpdate.meta.changes,0);
  await assert.rejects(db.prepare('INSERT INTO test_sessions(id,user_id,type,status,created,updated,data) VALUES(?,?,?,?,?,?,?)').bind('forged-owner',B,'practice','active',NOW,NOW,'{}').run(),hasCode('42501'));
});

test('all private progress tables hide another student and reject ownership reassignment',async()=>{
  await pg.query('INSERT INTO public.answers(session_id,question_id,user_id,answer,correct,seconds,updated) VALUES($1,$2,$3,$4,1,1,$5)',['student-b','q1',B,'2',NOW]);
  await pg.query('INSERT INTO public.results(session_id,user_id,created,data) VALUES($1,$2,$3,$4)',['student-b',B,NOW,'{"correct":1}']);
  await pg.query('INSERT INTO public.question_exposure(user_id,question_id,first_seen,last_seen,times_seen,session_id,session_type) VALUES($1,$2,$3,$3,1,$4,$5)',[B,'q1',NOW,'student-b','practice']);
  await pg.query('INSERT INTO public.mistakes(user_id,question_id,original_answer,created) VALUES($1,$2,$3,$4)',[B,'q2','0',NOW]);
  const db=application(A);
  // Table names are a fixed test allowlist, never user-supplied SQL.
  for(const table of ['test_sessions','answers','question_exposure','results','mistakes']){
    const browser=await asUser(A,'authenticated',tx=>tx.query<{user_id:string}>(`SELECT user_id FROM public.${table}`));
    assert.ok(browser.rows.every(row=>row.user_id===A),`${table} leaked browser data`);
    assert.deepEqual((await db.prepare(`SELECT user_id FROM ${table} WHERE user_id=?`).bind(B).all()).results,[],`${table} leaked server data`);
    assert.equal((await db.prepare(`DELETE FROM ${table} WHERE user_id=?`).bind(B).run()).meta.changes,0,`${table} permitted another student's deletion`);
    await assert.rejects(asUser(A,'authenticated',tx=>tx.query(`DELETE FROM public.${table} WHERE user_id=$1`,[B])),hasCode('42501'));
  }
  await assert.rejects(db.prepare('UPDATE test_sessions SET user_id=? WHERE id=?').bind(B,'student-a').run(),hasCode('42501'));
  const foreign=await pg.query<{n:number}>('SELECT count(*)::integer AS n FROM public.answers WHERE user_id=$1',[B]);
  assert.equal(foreign.rows[0].n,1);
});

test('composite session ownership foreign keys reject mismatched answers and results',async()=>{
  await session('fk-owned-by-b',B);
  const db=application(A);
  await assert.rejects(db.prepare('INSERT INTO answers(session_id,question_id,user_id,answer,correct,seconds,updated) VALUES(?,?,?,?,?,?,?)').bind('fk-owned-by-b','q1',A,'2',1,1,NOW).run(),hasCode('23503'));
  await assert.rejects(db.prepare('INSERT INTO results(session_id,user_id,created,data) VALUES(?,?,?,?)').bind('fk-owned-by-b',A,NOW,'{}').run(),hasCode('23503'));
  await assert.rejects(db.prepare('INSERT INTO question_exposure(user_id,question_id,first_seen,last_seen,times_seen,session_id,session_type) VALUES(?,?,?,?,?,?,?)').bind(A,'q1',NOW,NOW,1,'fk-owned-by-b','practice').run(),hasCode('23503'));
});

test('assessment answer batch saves one winning CAS and rejects stale overwrite',async()=>{
  await session('cas');const db=application(A);
  const answer=(version:number,value:string)=>db.batch([
    db.prepare("UPDATE test_sessions SET data=?,version=version+1,updated=? WHERE id=? AND version=? AND status='active'").bind('{"cursor":0}',NOW,'cas',version),
    db.prepare("INSERT INTO answers(session_id,question_id,user_id,answer,correct,seconds,updated) SELECT ?,?,?,?,?,?,? WHERE changes()=1 AND EXISTS(SELECT 1 FROM test_sessions WHERE id=? AND version=? AND status='active') ON CONFLICT(session_id,question_id) DO UPDATE SET answer=excluded.answer,correct=excluded.correct,seconds=excluded.seconds,updated=excluded.updated").bind('cas','q1',A,JSON.stringify(value),value==='2'?1:0,3,NOW,'cas',version+1),
  ]);
  assert.deepEqual((await answer(0,'2')).map(row=>row.meta.changes),[1,1]);
  assert.deepEqual((await answer(0,'0')).map(row=>row.meta.changes),[0,0]);
  assert.deepEqual(await db.prepare('SELECT answer,correct FROM answers WHERE session_id=?').bind('cas').first(),{answer:'"2"',correct:1});
  assert.equal((await db.prepare('SELECT version FROM test_sessions WHERE id=?').bind('cas').first())?.version,1);
});

test('pending grid answer shares the same CAS gate and successful upsert',async()=>{
  await session('grid-cas');const db=application(A);
  const save=(version:number,value:string)=>db.batch([
    db.prepare("UPDATE test_sessions SET version=version+1,updated=? WHERE id=? AND version=? AND status='active'").bind(NOW,'grid-cas',version),
    db.prepare('INSERT INTO answers(session_id,question_id,user_id,answer,correct,seconds,updated) SELECT ?,?,?,?,?,0,? WHERE changes()=1 ON CONFLICT(session_id,question_id) DO UPDATE SET answer=excluded.answer,correct=excluded.correct,updated=excluded.updated').bind('grid-cas','q2',A,JSON.stringify(value),1,NOW),
  ]);
  assert.deepEqual((await save(0,'1/2')).map(row=>row.meta.changes),[1,1]);
  assert.deepEqual((await save(1,'0.5')).map(row=>row.meta.changes),[1,1]);
  assert.deepEqual((await save(1,'99')).map(row=>row.meta.changes),[0,0]);
  assert.equal((await db.prepare('SELECT answer FROM answers WHERE session_id=?').bind('grid-cas').first())?.answer,'"0.5"');
});

test('server deadline rejects new or overwritten pending answers without incrementing version',async()=>{
  await session('deadline-cas');
  await pg.query('UPDATE public.test_sessions SET expires=$1 WHERE id=$2',[NOW,'deadline-cas']);
  const db=application(A);
  // Exact pending-answer SQL from sessionAction; use a fixed server clock so
  // both the instant of expiration and the successful pre-deadline path matter.
  const save=(question:string,version:number,value:string,now:number)=>db.batch([
    db.prepare("UPDATE test_sessions SET version=version+1,updated=? WHERE id=? AND version=? AND status='active' AND (expires IS NULL OR expires>?)").bind(now,'deadline-cas',version,now),
    db.prepare('INSERT INTO answers(session_id,question_id,user_id,answer,correct,seconds,updated) SELECT ?,?,?,?,?,0,? WHERE changes()=1 ON CONFLICT(session_id,question_id) DO UPDATE SET answer=excluded.answer,correct=excluded.correct,updated=excluded.updated').bind('deadline-cas',question,A,JSON.stringify(value),value==='0.5'?1:0,now),
  ]);
  assert.deepEqual((await save('q1',0,'99',NOW)).map(row=>row.meta.changes),[0,0]);
  assert.equal(await db.prepare('SELECT answer FROM answers WHERE session_id=?').bind('deadline-cas').first(),null);
  assert.equal((await db.prepare('SELECT version FROM test_sessions WHERE id=?').bind('deadline-cas').first())?.version,0);
  assert.deepEqual((await save('q2',0,'0.5',NOW-1)).map(row=>row.meta.changes),[1,1]);
  assert.deepEqual((await save('q2',1,'99',NOW)).map(row=>row.meta.changes),[0,0]);
  assert.deepEqual((await save('q1',1,'99',NOW+1)).map(row=>row.meta.changes),[0,0]);
  assert.deepEqual(await db.prepare('SELECT question_id,answer,correct,updated FROM answers WHERE session_id=?').bind('deadline-cas').first(),{question_id:'q2',answer:'"0.5"',correct:1,updated:NOW-1});
  assert.deepEqual(await db.prepare('SELECT version,updated FROM test_sessions WHERE id=?').bind('deadline-cas').first(),{version:1,updated:NOW-1});
});

test('failed batch rolls back its successful version increment',async()=>{
  await session('rollback');const db=application(A);
  await assert.rejects(db.batch([
    db.prepare('UPDATE test_sessions SET version=version+1 WHERE id=?').bind('rollback'),
    db.prepare('INSERT INTO answers(session_id,question_id,user_id,answer,correct,seconds,updated) VALUES(?,?,?,?,?,?,?)').bind('rollback','missing-question',A,'2',1,1,NOW),
  ]),hasCode('23503'));
  assert.equal((await db.prepare('SELECT version FROM test_sessions WHERE id=?').bind('rollback').first())?.version,0);
});

test('finalization atomically gates results/mistakes by the winning token',async()=>{
  await session('finalization');const db=application(A);
  const submit=(token:string,version:number)=>db.batch([
    db.prepare("UPDATE test_sessions SET status='complete',data=?,updated=?,version=version+1 WHERE id=? AND version=? AND status='active'").bind(JSON.stringify({finalizationToken:token}),NOW,'finalization',version),
    db.prepare("INSERT OR IGNORE INTO results(session_id,user_id,created,data) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM test_sessions WHERE id=? AND json_extract(data,'$.finalizationToken')=?)").bind('finalization',A,NOW,JSON.stringify({token}),'finalization',token),
    db.prepare("INSERT OR IGNORE INTO mistakes(user_id,question_id,original_answer,created,status) SELECT ?,?,?,?,'Needs Review' WHERE EXISTS(SELECT 1 FROM test_sessions WHERE id=? AND json_extract(data,'$.finalizationToken')=?)").bind(A,'q1','0',NOW,'finalization',token),
  ]);
  assert.deepEqual((await submit('winner',0)).map(row=>row.meta.changes),[1,1,1]);
  assert.deepEqual((await submit('loser',0)).map(row=>row.meta.changes),[0,0,0]);
  assert.deepEqual((await submit('winner',0)).map(row=>row.meta.changes),[0,0,0]);
  assert.deepEqual(JSON.parse(String((await db.prepare('SELECT data FROM results WHERE session_id=?').bind('finalization').first())!.data)),{token:'winner'});
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM mistakes WHERE user_id=? AND question_id=?').bind(A,'q1').first())?.n,1);
});

test('rate-limit/exposure upserts retain arithmetic and expired counter reset',async()=>{
  const db=application(A);
  const count=(now:number)=>db.prepare('INSERT INTO rate_limits(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires<? THEN 1 ELSE count+1 END, expires=CASE WHEN expires<? THEN ? ELSE expires END').bind('test-rate',now+100,now,now,now+100).run();
  await count(NOW);await count(NOW+1);
  assert.equal((await db.prepare('SELECT count FROM rate_limits WHERE key=?').bind('test-rate').first())?.count,2);
  await count(NOW+200);
  assert.deepEqual(await db.prepare('SELECT count,expires FROM rate_limits WHERE key=?').bind('test-rate').first(),{count:1,expires:NOW+300});
  await session('exposure-one');await session('exposure-two');
  const expose=(sessionId:string)=>db.prepare('INSERT INTO question_exposure(user_id,question_id,first_seen,last_seen,times_seen,session_id,session_type) VALUES(?,?,?,?,1,?,?) ON CONFLICT(user_id,question_id) DO UPDATE SET last_seen=excluded.last_seen,times_seen=times_seen+CASE WHEN session_id=excluded.session_id THEN 0 ELSE 1 END,session_id=excluded.session_id,session_type=excluded.session_type').bind(A,'q2',NOW,NOW+1,sessionId,'practice').run();
  await expose('exposure-one');await expose('exposure-one');await expose('exposure-two');
  assert.deepEqual(await db.prepare('SELECT first_seen,times_seen,session_id FROM question_exposure WHERE user_id=? AND question_id=?').bind(A,'q2').first(),{first_seen:NOW,times_seen:2,session_id:'exposure-two'});
});

test('question exclusions, case-insensitive search, numeric analytics and quoted placeholders execute',async()=>{
  const db=application(A);
  const selection=await db.prepare("SELECT q.id FROM questions q WHERE q.status='approved' AND q.id NOT IN (SELECT value FROM json_each(?)) ORDER BY q.id").bind(JSON.stringify(['q1'])).all();
  assert.deepEqual(selection.results,[{id:'q2'}]);
  const search=await db.prepare('SELECT id FROM questions WHERE skill LIKE ? ORDER BY id').bind('%RATIOS%').all();
  assert.equal(search.results.length,3);
  const aggregate=await db.prepare('SELECT q.id,COUNT(a.question_id) AS attempts,ROUND(AVG(a.correct)*100,1) AS accuracy,ROUND(AVG(a.seconds),1) AS seconds FROM questions q LEFT JOIN answers a ON q.id=a.question_id GROUP BY q.id HAVING COUNT(a.question_id)>0 ORDER BY q.id').all();
  assert.equal(typeof aggregate.results[0].attempts,'number');
  assert.equal(typeof aggregate.results[0].accuracy,'number');
  assert.equal(typeof aggregate.results[0].seconds,'number');
  assert.deepEqual(await db.prepare("SELECT '?' AS literal,'can''t?' AS escaped,?::text AS bound").bind("' OR TRUE --").first(),{literal:'?',escaped:"can't?",bound:"' OR TRUE --"});
  await assert.rejects(db.prepare('SELECT ?').run(),/Database parameter count mismatch/);
  assert.equal(await db.prepare('SELECT id FROM questions WHERE id=?').bind('absent').first(),null);
});

test('transaction-local claims and role are cleared between student requests',async()=>{
  await application(A).prepare('SELECT id FROM profiles').all();
  const identity=await pg.query<{role:string;claims:string|null}>("SELECT current_user AS role,current_setting('request.jwt.claims',true) AS claims");
  assert.equal(identity.rows[0].role,'postgres');
  assert.ok(!identity.rows[0].claims);
  const b=await application(B).prepare('SELECT id FROM profiles').all();
  assert.deepEqual(b.results,[{id:B}]);
});
