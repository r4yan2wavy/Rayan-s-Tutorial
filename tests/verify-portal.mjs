import ts from 'typescript';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync,realpathSync,readdirSync} from 'node:fs';
const require=createRequire(realpathSync('./node_modules/wrangler/package.json'));
const {Miniflare}=require('miniflare');
const mf=new Miniflare({modules:true,script:"export default {fetch(){return new Response('test')}}",compatibilityDate:'2026-05-22',d1Databases:{DB:'qst-test'}});
const dir='.sites-runtime/portal-qa';mkdirSync(dir+'/content',{recursive:true});
for(const name of ['api','auth','adaptive','exam','scoring','content/math','content/ela','content/author']){
 let src=readFileSync('lib/'+name+'.ts','utf8').replace(/from '(\.\/[\w/]+)'/g,"from '$1.mjs'").replace("import checklist from './content/curriculum.json';",'const checklist='+readFileSync('lib/content/curriculum.json','utf8')+';');
 writeFileSync(dir+'/'+name+'.mjs',ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);
}
writeFileSync(dir+'/db.mjs','export const database=()=>globalThis.qstTestDB;export const runtime=()=>globalThis.qstTestEnv;');
const db=await mf.getD1Database('DB');globalThis.qstTestDB=db;globalThis.qstTestEnv={SITE_ORIGIN:'https://test.example',ADMIN_SETUP_TOKEN:crypto.randomUUID()};
const {handler}=await import('../'+dir+'/api.mjs');
const {authoredItems,reading}=await import('../'+dir+'/content/ela.mjs');
const {mathTopics,isCorrect}=await import('../'+dir+'/content/math.mjs');
const checks=[];const checked=(name)=>{checks.push(name);console.log('✓ '+name)};
async function call(route,body,user,expected=200,options={}){
 const headers={'origin':'https://test.example','cf-connecting-ip':'192.0.2.7',...(body!==undefined?{'content-type':'application/json'}:{}),...(user?.cookie?{cookie:user.cookie}:{}),...options.headers};
 if(body?.answers&&route.startsWith('attempt/')){const fixture=await db.prepare('SELECT items FROM attempts WHERE id=?').bind(route.slice(8).split('?')[0]).first();if(fixture){const items=JSON.parse(fixture.items);body={...body,answers:{...body.answers}};for(const [index,response] of Object.entries(body.answers)){const item=items[Number(index)];if(item?.format==='single'&&!String(response).startsWith('option-')){const choice=item.options.findIndex(o=>o.id===response);if(choice>=0)body.answers[index]='option-'+choice;}}}}
 const res=await handler(new Request('https://test.example/api/'+route,{method:body===undefined?'GET':'POST',headers,...(body!==undefined?{body:JSON.stringify(body)}:{})}),route.split('?')[0].split('/'));
 const data=await res.json();assert.equal(res.status,expected,route+': '+JSON.stringify({error:data.error||'Unexpected response status'}));
 if(user&&res.headers.get('set-cookie'))user.cookie=res.headers.get('set-cookie').split(';')[0];return data;
}
async function login(username,password){let user={username,password};let result=await call('login',{username,password},user);user.id=result.user.id;return user}
async function provision(username,role,classId,actor,grade=8,inquiryId){let password='Initial test pass!42';let result=await call('users',{username,name:username,role,classId,grade,password,confirm:password,inquiryId},actor);let user=await login(username,password);assert.equal(user.id,result.user.id);await call('dashboard',undefined,user,403);let replacement='Changed test pass!43';await call('password',{current:password,password:replacement,confirm:replacement},user);user.password=replacement;return user}
const row=async(sql,...args)=>db.prepare(sql).bind(...args).first();
const run=async(sql,...args)=>db.prepare(sql).bind(...args).run();
try{
 for(const f of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())for(const sql of readFileSync('drizzle/'+f,'utf8').split('--> statement-breakpoint'))if(sql.trim())await db.prepare(sql.trim()).run();
 let pub=await call('public');assert.equal(pub.config.center,'Queens Scholars Tutorial');assert.equal(pub.config.phone,'718-913-7706');assert.equal(pub.setupNeeded,true);
 await call('setup',{token:'wrong',username:'admin.qa',password:'Admin test pass!42',confirm:'Admin test pass!42'},undefined,403);
 await call('setup',{token:globalThis.qstTestEnv.ADMIN_SETUP_TOKEN,username:'admin.qa',name:'QA admin',password:'Admin test pass!42',confirm:'Admin test pass!42'});
 await call('setup',{token:globalThis.qstTestEnv.ADMIN_SETUP_TOKEN,username:'second.admin',password:'Admin test pass!42',confirm:'Admin test pass!42'},undefined,409);
 let admin=await login('admin.qa','Admin test pass!42');assert.match(admin.cookie,/^qst_session=/);
 checked('One-time administrator setup and real password login');
 await call('inquiry',{name:'Fixture student',contact:'Fixture guardian',phone:'202-555-0100',grade:7,interest:'Grade 8 SHSAT preparation',message:'Isolated fixture'});
 await call('inquiry',{name:'Fixture student',contact:'Fixture guardian',phone:'202-555-0100',grade:7,interest:'Grade 8 SHSAT preparation'});
 let aDash=await call('dashboard',undefined,admin);assert.equal(aDash.requests.length,1);assert.equal((await row('SELECT COUNT(*) n FROM users')).n,1);
 checked('Shared enrollment inquiry persists and suppresses duplicates without creating a login');
 const a=await call('classes',{title:'QA class A',description:'Fixture class',grade:8,visible:false},admin);
 const b=await call('classes',{title:'QA class B',description:'Fixture class',grade:9,visible:false},admin);
 const t1=await provision('teacher.one','teacher',a.id,admin);
 const t2=await provision('teacher.two','teacher',b.id,admin);
 const s1=await provision('student.one','student',a.id,t1,7);
 const s2=await provision('student.two','student',b.id,t2,9);
 const s3=await provision('student.three','student',a.id,admin,8,aDash.requests[0].id);
 await call('users',{username:'duplicate.convert',name:'Duplicate',role:'student',classId:a.id,grade:8,password:'Initial test pass!42',confirm:'Initial test pass!42',inquiryId:aDash.requests[0].id},admin,409);
 let td=await call('dashboard',undefined,t1);assert.equal(td.classes.length,1);assert.equal(td.people.some(u=>u.id===s2.id),false);assert.equal(td.requests.length,0);
 await call('users',{username:'forbidden.teacher',name:'Forbidden',role:'teacher',grade:8,password:'Initial test pass!42',confirm:'Initial test pass!42'},t1,403);
 await call('user-update',{id:s2.id,password:'Reset test pass!44',confirm:'Reset test pass!44'},t1,403);
 await call('membership',{classId:a.id,userId:s2.id},t1,403);
 await call('classes',{title:'Forbidden',description:'No',grade:8},s1,403);
 assert.equal((await call('content',undefined,t1)).items.length,0);await call('export',undefined,{cookie:'qst_session=bad'},401);
 checked('Forced initial password changes and role/class/student permission boundaries');
 await call('assignments',{classId:b.id,title:'Forbidden',subject:'Math',count:2},t1,403);
 const assignment=await call('assignments',{classId:a.id,title:'QA fraction assignment',subject:'Math',topic:'fractions',count:2,minutes:15,attemptLimit:1,feedback:'manual'},t1);
 await call('start',{assignmentId:assignment.id},s2,403);
 const started=await call('start',{assignmentId:assignment.id},s1);
 let attempt=await call('attempt/'+started.id,undefined,s1);assert.equal(attempt.items.length,2);assert.equal(attempt.unlocked.length,1);assert.equal('key' in attempt.items[0],false);assert.equal('difficulty' in attempt.items[0],false);assert.ok((attempt.items[0].options||[]).every(o=>/^option-[0-3]$/.test(o.id)));assert.equal('stem' in attempt.items[1],false);
 let stored=await row('SELECT * FROM attempts WHERE id=?',started.id);let items=JSON.parse(stored.items);let first=items[0];let answer=first.key;
 if(first.format==='numeric'&&String(answer).includes('/')){let [n,d]=String(answer).split('/').map(Number);answer=`${n*2}/${d*2}`}
 attempt=await call('attempt/'+started.id,{revision:attempt.revision,answers:{0:answer},note:'Saved work'},s1);assert.equal(attempt.notes['0'],'Saved work');
 await call('attempt/'+started.id,{revision:0,answers:{0:first.key}},s1,409);
 attempt=await call('attempt/'+started.id,{revision:attempt.revision,action:'advance'},s1);assert.equal(attempt.cursor,1);
 await call('attempt/'+started.id,{revision:attempt.revision,answers:{0:first.key}},s1,403);
 let wrong=items[1].format==='numeric'?'99999999':items[1].options.find(o=>o.id!==items[1].key).id;
 attempt=await call('attempt/'+started.id,{revision:attempt.revision,answers:{1:wrong},action:'advance'},s1);
 assert.equal(attempt.state,'submitted');assert.equal(attempt.summary,null);assert.equal(attempt.feedbackReleased,false);
 await call('attempt/'+started.id,undefined,t2,403);
 const staffView=await call('attempt/'+started.id,undefined,t1);assert.equal(staffView.summary.correct,1);assert.equal(staffView.items.every(i=>i.steps?.length),true);
 await call('feedback',{id:started.id,feedback:'Review the second calculation.',release:true},t1);
 attempt=await call('attempt/'+started.id,undefined,s1);assert.equal(attempt.summary.correct,1);assert.equal(attempt.feedback,'Review the second calculation.');assert.equal(attempt.summary.scoreEstimate,null);
 await call('start',{assignmentId:assignment.id},s1,409);
 let sd=await call('dashboard',undefined,s1);assert.equal(sd.mistakes.length,1);assert.equal(sd.topics.some(t=>t.id==='fractions'),true);
 await call('mistake',{id:sd.mistakes[0].id,reason:'Calculation',reviewed:true},s1);
 const exported=await call('export',undefined,t1);assert.equal(exported.attempts.length,1);assert.equal(JSON.stringify(exported).includes('hash'),false);
 checked('Assignment → autosave → revision conflict → locked submission → withheld feedback → staff release → mistake review/export');
 const practice=await call('start',{subject:'Math',topic:'fractions',count:2},s1);let pv=await call('attempt/'+practice.id,undefined,s1);assert.equal(pv.grade,8);
 await call('attempt/'+practice.id,{revision:pv.revision,action:'finish'},s1);
 checked('Grade 7 students can prepare on the Grade 8 track');
 await call('learning-plan',{minutes:60,focus:'ELA',days:[1,3,5]},t1);
 assert.equal((await call('learning-plan',undefined,s1)).plan.minutes,30);
 await call('learning-plan',{minutes:15,focus:'Math',days:[0,6],userId:t1.id,grade:9,role:'admin'},s1);
 assert.equal((await call('learning-plan',undefined,t1)).plan.minutes,60);
 assert.deepEqual((await call('learning-plan',undefined,s1)).plan.days,[0,6]);
 await call('learning-plan',{minutes:180,focus:'Math',days:[8]},s1,400);
 assert.equal((await call('dashboard',undefined,s1)).user.role,'student');
 checked('Persisted study plans isolate each owner and preference imports cannot change roles or other accounts');

 const parallel=await Promise.all([call('start',{subject:'Math',topic:'order',count:2},s3),call('start',{subject:'Math',topic:'order',count:2},s3)]);assert.equal(parallel[0].id,parallel[1].id);
 let concurrent=await call('attempt/'+parallel[0].id,undefined,s3);await call('attempt/'+concurrent.id,{revision:concurrent.revision,action:'abandon'},s3);
 checked('Concurrent starts recover one database-enforced active attempt');
 const draft={subject:'Math',topic:'order',grade:8,format:'numeric',stem:'What is the value of 42 + 6 × 2?',key:'54',steps:['Multiply 6 by 2 to obtain 12.','Then add 42 to 12 to obtain 54.'],takeaway:'Multiply before adding in this expression.',standard:'6.EE.A.2c',sourceEvidence:'NYSED Grade 6 expressions and equations, order of operations.',rights:'Original isolated test fixture written for backend verification.'};
 await call('content-import',{items:[draft]},s3,403);
 await call('content-import',{items:[{...draft,key:'1/0'}]},t1,400);
 const imported=await call('content-import',{items:[draft]},t1);assert.equal(imported.state,'draft');
 assert.equal((await call('content',undefined,t1)).items.length,1);assert.equal((await call('content',undefined,t2)).items.length,0);
 await call('content-review',{id:imported.ids[0],state:'published',notes:'Teacher cannot publish a draft.'},t1,403);
 await call('content-import',{items:[draft]},admin,409);
 await call('content-review',{id:imported.ids[0],state:'published',notes:'Independently verified arithmetic, exact key, Grade 6 source, and original authorship for this test fixture.'},admin);
 const importedStart=await call('start',{subject:'Math',topic:'order',count:2},s3);let importedAttempt=await call('attempt/'+importedStart.id,undefined,s3);assert.equal(importedAttempt.items[0].id,imported.ids[0]);assert.equal('key' in importedAttempt.items[0],false);
 await call('attempt/'+importedStart.id,{revision:importedAttempt.revision,answers:{0:'108/2'},action:'finish'},s3);
 assert.equal((await call('attempt/'+importedStart.id,undefined,s3)).summary.correct,1);
 checked('Validated staff question import, author scope, exact duplicate rejection, admin publication, and numeric grading');

 const timed=await call('start',{mode:'mini',subject:'Math',topic:'order',count:2,minutes:5},s1);await run('UPDATE attempts SET deadline=? WHERE id=?',Date.now()-1000,timed.id);
 const expired=await call('attempt/'+timed.id,undefined,s1);assert.equal(expired.state,'expired');await call('attempt/'+timed.id,{revision:expired.revision,answers:{0:'correct'}},s1);assert.deepEqual(JSON.parse((await row('SELECT answers FROM attempts WHERE id=?',timed.id)).answers),{});
 checked('Server deadlines expire attempts and reject late answers');
 await call('start',{mode:'diagnostic',startSubject:'Math'},s1,409);
 for(const iid of [...authoredItems.map(i=>i.id),...mathTopics.map(t=>'math:'+t.id)])await run('INSERT INTO content_reviews (id,state,notes,actor,created) VALUES (?,\'published\',?,?,?)',iid,'ISOLATED TEST: structural fixture, not editorial publication',admin.id,Date.now());
 for(const [student,subject] of [[s1,'Math'],[s2,'ELA']]){
  let full=await call('start',{mode:'diagnostic',startSubject:subject},student);let f=await call('attempt/'+full.id,undefined,student);let record=await row('SELECT * FROM attempts WHERE id=?',full.id);let all=JSON.parse(record.items);
  assert.equal(all.length,100);assert.equal(all.filter(i=>i.subject==='Math').length,50);assert.equal(all.filter(i=>i.subject==='ELA').length,50);assert.equal(all[0].subject,subject);assert.ok(f.deadline-f.started===180*60000);
  if(subject==='ELA'){assert.equal(f.unlocked.length,5);let responses=Object.fromEntries(f.unlocked.map(i=>[i,all[i].key]));f=await call('attempt/'+full.id,{revision:f.revision,answers:responses,action:'advance'},student);assert.equal(f.cursor,5);await call('attempt/'+full.id,{revision:f.revision,answers:{0:all[0].key}},student,403)}
  else {f=await call('attempt/'+full.id,{revision:f.revision,answers:{0:all[0].key},action:'advance'},student);assert.equal(f.cursor,1);const next=JSON.parse((await row('SELECT items FROM attempts WHERE id=?',full.id)).items)[1];assert.ok(next.key);assert.notEqual(next.stem,all[0].stem)}
  await call('attempt/'+full.id,{revision:f.revision,action:'finish'},student);
  await call('start',{mode:'diagnostic',startSubject:subject},student,409);
 }
 checked('100-question/50+50 rehearsals, both starting subjects, opaque choices, hidden difficulty, passage-set locking, distinct adaptive math and depleted-ELA gating');

 const homework=await call('assignments',{classId:a.id,title:'Custom homework title',mode:'homework',subject:'Math',topic:'equation',count:2,studentIds:[s3.id],publish:false},t1);
 await call('assignment-publish',{id:homework.id},t1);
 assert.equal((await row('SELECT COUNT(*) n FROM recipients WHERE assignment_id=?',homework.id)).n,1);
 await call('start',{assignmentId:homework.id},s1,403);
 const classwork=await call('assignments',{classId:a.id,title:'Custom classwork title',mode:'classwork',subject:'Math',topic:'ratio',count:2,studentIds:[s3.id],feedback:'submission'},admin);
 assert.equal((await row('SELECT mode FROM assignments WHERE id=?',classwork.id)).mode,'classwork');
 const cw=await call('start',{assignmentId:classwork.id},s3);let cwa=await call('attempt/'+cw.id,undefined,s3);
 assert.equal(cwa.title,'Custom classwork title');assert.equal(cwa.mode,'classwork');await call('attempt/'+cw.id,{revision:cwa.revision,action:'finish'},s3);
 await call('approve-retry',{assignmentId:classwork.id,userId:s3.id},t2,403);
 await call('approve-retry',{assignmentId:classwork.id,userId:s3.id},t1);
 await call('extension',{assignmentId:classwork.id,userId:s3.id,due:new Date(Date.now()+86400000).toISOString()},t1);
 let retry=await call('start',{assignmentId:classwork.id},s3);let ra=await call('attempt/'+retry.id,undefined,s3);await call('attempt/'+retry.id,{revision:ra.revision,action:'finish'},s3);
 await call('assignment-preview/'+classwork.id,undefined,s3,403);const preview=await call('assignment-preview/'+classwork.id,undefined,t1);assert.equal(preview.preview,true);assert.equal(preview.assignment.items.length,2);
 checked('Custom homework/classwork titles, draft-selected recipients, preview, and individual retries/extensions');

 for(const actor of [t1,admin]){
  const personal=await call('start',{subject:'Math',topic:'fractions',count:2,mode:'classwork',title:'My custom personal classwork'},actor);
  let pa=await call('attempt/'+personal.id,undefined,actor);const pi=JSON.parse((await row('SELECT items FROM attempts WHERE id=?',personal.id)).items);
  const wrong=pi[0].format==='numeric'?'999999999':pi[0].options.find(o=>o.id!==pi[0].key).id;
  pa=await call('attempt/'+personal.id,{revision:pa.revision,answers:{0:wrong},action:'advance'},actor);
  pa=await call('attempt/'+personal.id,{revision:pa.revision,answers:{1:pi[1].key},action:'advance'},actor);
  assert.equal(pa.title,'My custom personal classwork');assert.equal(pa.conditions.ownerRole,actor===admin?'admin':'teacher');assert.equal(pa.summary.correct,1);
  const d=await call('dashboard',undefined,actor);assert.ok(d.myAttempts.some(x=>x.id===personal.id));assert.equal(d.attempts.some(x=>x.id===personal.id),false);assert.ok(d.myMistakes.length);
  await call('attempt/'+personal.id,undefined,t2,403);
  await call('mistake',{id:d.myMistakes[0].id,reason:'Wrong setup',reviewed:true},actor);
  const follow=await call('start',{followup:{attemptId:personal.id,index:0}},actor);let fa=await call('attempt/'+follow.id,undefined,actor);assert.equal(fa.items.length,2);await call('attempt/'+follow.id,{revision:fa.revision,action:'finish'},actor);
  const pe=await call('export?scope=personal',undefined,actor);assert.ok(pe.attempts.some(x=>x.id===personal.id));assert.equal(pe.attempts.some(x=>x.userId!==actor.id),false);
 }
 await call('learning-track',{grade:9},t1);assert.equal((await call('dashboard',undefined,t1)).user.grade,9);await call('learning-track',{grade:8},t1);
 checked('Teacher/admin My Learning, custom personal sets, mistakes, follow-ups, track choice, personal export, and class-report separation');

 async function completeFull(actor){
  const full=await call('start',{mode:'diagnostic',startSubject:'ELA'},actor);let f=await call('attempt/'+full.id,undefined,actor);
  let iterations=0;while(f.state==='in-progress'){
   assert.ok(++iterations<=70);assert.equal(f.summary,null);const stored=JSON.parse((await row('SELECT items FROM attempts WHERE id=?',full.id)).items);
   const answers=Object.fromEntries(f.unlocked.map(index=>[index,stored[index].key]));
   f=await call('attempt/'+full.id,{revision:f.revision,answers,action:'advance'},actor);
  }assert.equal(iterations,68);assert.equal(f.summary.correct,100);assert.equal(f.summary.answered,100);assert.equal(f.items.filter(i=>i.subject==='Math').length,50);assert.equal(f.items.filter(i=>i.subject==='ELA').length,50);return f;
 }
 const teacherFull=await completeFull(t1),adminFull=await completeFull(admin);
 assert.equal(teacherFull.summary.scoreEstimate,null);assert.equal(adminFull.summary.scoreEstimate,null);
 assert.ok((await row('SELECT score_json FROM attempts WHERE id=?',teacherFull.id)).score_json);
 assert.equal((await call('dashboard',undefined,t2)).myAttempts.some(x=>x.id===teacherFull.id),false);
 checked('Full teacher/admin personal diagnostics with delayed feedback and persisted uncalibrated score snapshots');

 // Synthetic mapping is confined to this isolated D1 fixture and tests mechanics, never official accuracy.
 const fixture={version:'isolated-test-v1',title:'ISOLATED synthetic mechanics fixture',examYear:2026,admissionYear:2027,grade:8,abilityModel:'qst-band-v2',contentRelease:'qst-content-v1',precision:1,source:{description:'Synthetic fixture for mechanics; not empirical calibration',url:'https://test.example/synthetic-fixture',permissions:'Synthetic test data permitted solely in the isolated QA database.',sampleSize:100,heldOutSize:20,validationSummary:'Synthetic schema fixture; this does not establish official SHSAT score accuracy.',representativeness:'Synthetic test observations are not representative of students.',sectionErrors:{ELA:20,Math:20}},sections:{ELA:{points:[{ability:-3,scaled:100},{ability:0,scaled:200},{ability:3,scaled:300}],residual95:[-30,30]},Math:{points:[{ability:-3,scaled:100},{ability:0,scaled:200},{ability:3,scaled:300}],residual95:[-30,30]}}};
 await call('calibration-import',{mapping:fixture,confirmReviewed:true,notes:'Isolated test fixture that checks versioning and validation only, not score accuracy.'},t1,403);
 await call('calibration-import',{mapping:{...fixture,abilityModel:'old-114-question-model'},confirmReviewed:true,notes:'Isolated test fixture that checks versioning and validation only, not score accuracy.'},admin,400);
 await call('calibration-import',{mapping:fixture,confirmReviewed:false,notes:'Isolated test fixture that checks versioning and validation only, not score accuracy.'},admin,400);
 await call('calibration-import',{mapping:fixture,confirmReviewed:true,notes:'Isolated test fixture that checks versioning and validation only, not score accuracy.'},admin);
 assert.equal((await call('attempt/'+teacherFull.id,undefined,t1)).summary.scoreEstimate,null);
 const calibratedFull=await completeFull(s3);assert.ok(calibratedFull.summary.scoreEstimate.total>0);assert.equal(calibratedFull.summary.mappingVersion,'isolated-test-v1');assert.equal(calibratedFull.summary.scoreEstimate.interval.length,2);
 const originalSnapshot=(await row('SELECT score_json FROM attempts WHERE id=?',calibratedFull.id)).score_json;
 await call('calibration-import',{mapping:{...fixture,version:'isolated-test-v2'},confirmReviewed:true,notes:'Second isolated fixture for immutable historical snapshot verification only.'},admin);
 assert.equal((await row('SELECT score_json FROM attempts WHERE id=?',calibratedFull.id)).score_json,originalSnapshot);
 const assignedDiagnostic=await call('assignments',{classId:a.id,title:'Assigned full diagnostic',mode:'diagnostic',subject:'Math',studentIds:[s3.id]},t1);
 const repeated=await call('start',{assignmentId:assignedDiagnostic.id},s3);let repeatedAttempt=await call('attempt/'+repeated.id,undefined,s3);assert.equal(repeatedAttempt.items.length,100);assert.equal(repeatedAttempt.deadline-repeatedAttempt.started,180*60000);await call('attempt/'+repeated.id,{revision:repeatedAttempt.revision,action:'finish'},s3);
 checked('Validated calibration import, numeric estimate fixture, section/interval reporting, preserved historic versions, and assigned full diagnostics');

 await call('revoke-access',{id:admin.id},admin,403);await call('revoke-access',{id:t2.id},t1,403);await call('revoke-access',{id:s2.id},t1,403);
 await call('membership',{classId:b.id,userId:s3.id},admin);
 const interrupted=await call('start',{subject:'Math',topic:'order',count:2},s3);let ia=await call('attempt/'+interrupted.id,undefined,s3);const ik=JSON.parse((await row('SELECT items FROM attempts WHERE id=?',interrupted.id)).items)[0].key;ia=await call('attempt/'+interrupted.id,{revision:ia.revision,answers:{0:ik}},s3);
 const secondSession=await login(s3.username,s3.password),oldCookie=s3.cookie;
 await call('revoke-access',{id:s3.id,reason:'ISOLATED fixture access lifecycle check'},t1);
 await call('dashboard',undefined,s3,401);await call('dashboard',undefined,secondSession,401);await call('attempt/'+interrupted.id,{revision:ia.revision,action:'finish'},s3,401);await call('login',{username:s3.username,password:s3.password},undefined,401);
 const savedInterruption=await row('SELECT * FROM attempts WHERE id=?',interrupted.id);assert.equal(savedInterruption.state,'interrupted-revocation');assert.equal(JSON.parse(savedInterruption.answers)[0],ik);
 await call('restore-access',{id:s3.id},t2,403);await call('restore-access',{id:s3.id},t1);await call('dashboard',undefined,{cookie:oldCookie},401);Object.assign(s3,await login(s3.username,s3.password));
 await call('revoke-access',{id:s3.id},admin);await call('restore-access',{id:s3.id},t1,403);await call('user-update',{id:s3.id,state:'active'},admin,409);await call('restore-access',{id:s3.id},admin);Object.assign(s3,await login(s3.username,s3.password));
 await call('revoke-access',{id:t1.id},admin);await call('dashboard',undefined,t1,401);await call('start',{subject:'Math',topic:'order',count:2},t1,401);await call('dashboard',undefined,s1);await call('dashboard',undefined,s3);
 await call('restore-access',{id:t1.id},admin);Object.assign(t1,await login(t1.username,t1.password));assert.equal((await call('dashboard',undefined,t1)).myAttempts.some(x=>x.id===teacherFull.id),true);
 assert.ok(await row("SELECT id FROM audit WHERE action LIKE 'Access revoked%'"));
 checked('Immediate global revocation across sessions/classes, preserved responses, constrained restoration, fresh login, and teacher revocation without disabling students');
 await call('user-update',{id:s1.id,password:'Reset test pass!44',confirm:'Reset test pass!44'},t1);
 assert.equal((await call('session',undefined,s1)).user,null);await call('dashboard',undefined,s1,401);
 const reset=await login(s1.username,'Reset test pass!44');await call('dashboard',undefined,reset,403);
 checked('Teacher password reset revokes sessions and restores the forced-change gate');
 await call('classes',{id:a.id,title:'QA class A',description:'Fixture class',grade:8,state:'archived'},admin);
 assert.equal((await call('export',undefined,t1)).attempts.length,0);
 const remaining=await call('dashboard',undefined,s3);assert.ok(remaining.classes.some(c=>c.id===b.id));await call('membership',{classId:b.id,userId:s3.id,active:false},admin);await call('dashboard',undefined,s3,403);
 checked('Archived classes remove teacher export scope and student enrollment access');
 await call('inquiry',{name:'Bad origin',contact:'Fixture',phone:'2025550199',grade:8},undefined,403,{headers:{origin:'https://elsewhere.example'}});
 checked('Cross-origin mutations are denied');
 writeFileSync('tests/portal-verification-report.json',JSON.stringify({generatedAt:new Date().toISOString(),status:'passed',checks,environment:'Production API code against isolated Miniflare D1; binding adapter only; no production records or accounts created',limits:'API and mathematical checks only; these checks do not establish browser layout/accessibility, editorial review, or official score accuracy.'},null,2));
 console.log(`Passed ${checks.length} end-to-end backend scenarios.`);
}finally{await mf.dispose();delete globalThis.qstTestDB;delete globalThis.qstTestEnv}
