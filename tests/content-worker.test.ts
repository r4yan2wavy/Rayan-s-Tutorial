import assert from 'node:assert/strict';
import {after,before,beforeEach,test} from 'node:test';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {isAbsolute,join,relative} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import ts from 'typescript';
import {PGlite} from '@electric-sql/pglite';
import {ApplicationDatabase,type Transaction} from '../db/statements';

type Worker={runContentWorker:()=>Promise<{status:string;reason?:string;questions?:number}>;validateGeneratedBatch:(kind:'math'|'reading'|'editing',data:unknown,genre?:string)=>{passage?:{genre:string};items:Record<string,unknown>[]}};
let pg:PGlite,worker:Worker,directory:string;
const originalFetch=globalThis.fetch;
let responses:{body:string;status?:number}[]=[],chatRequests:Record<string,unknown>[]=[],fetchCount=0;
const JOB='00000000-0000-4000-8000-000000000001';
const prices={input:'0.00000005',output:'0.00000008'};

function envelope(content:string,id='fixture-generation',tokens=21){return JSON.stringify({id,choices:[{message:{content}}],usage:{total_tokens:tokens,prompt_tokens:10,completion_tokens:tokens-10}})}
const draftItems=[
 {text:'At a supply workshop, the ratio of red to blue badges is 2:3. There are 10 red badges. How many badges are there altogether?',choices:['25','15','30','20'],correct:0,structure:'part-count-to-total',scenario:'supply-workshop-badges',reasoningType:'scale-ratio-parts-and-combine',estimatedTime:90,table:{headers:['Red','Blue'],rows:[[2,3],[10,'?']],caption:'Equivalent ratio groups.'}},
 {text:'A festival display has green and gold ribbons in the ratio 3:4. It contains 28 ribbons altogether. How many ribbons are green?',choices:['12','16','21','7'],correct:0,structure:'whole-count-to-part',scenario:'festival-ribbon-display',reasoningType:'partition-a-known-ratio-whole',estimatedTime:100,diagram:{kind:'shape',description:'A ribbon bundle contains three green ribbons and four gold ribbons.',points:[{label:'Bundle',x:50,y:50}],labels:[{text:'Green : Gold = 3 : 4',x:60,y:60}]}},
];
const generated=()=>({items:structuredClone(draftItems)});
function independentReview(){return{items:draftItems.map((item,index)=>({correct:item.correct,oneDefensibleAnswer:true,gradeAppropriate:true,skillMatches:true,difficultyMatches:true,howToThink:'Find the count represented by one complete ratio group before scaling the requested quantity.',steps:index===0?['The given 10 red badges represent 10 ÷ 2 = 5 complete ratio groups.','Each group has 2 + 3 = 5 badges altogether.','Multiply the five badges per group by five groups to obtain 25 badges.']:['Each ribbon group has 3 + 4 = 7 ribbons altogether.','The total of 28 ribbons contains 28 ÷ 7 = 4 groups.','Each group has 3 green ribbons, so the green count is 4 × 3 = 12.'],explanation:index===0?'First find the number of complete ratio groups from the known red count: 10 divided by 2 gives 5. Each group contains both colors, totaling 2 plus 3, or 5 badges. Five groups of five badges give a total of 25.':'Use the whole, including both ribbon colors, to find the group count. Each group contains 3 plus 4, or 7 ribbons, and 28 ribbons make 4 groups. Each group has 3 green ribbons, so 4 groups contain 12 green ribbons.',reasons:index===0?['This counts all five complete groups, each containing five badges.','This counts only the blue badges instead of both colors.','This multiplies by the blue ratio part without recovering and combining the requested whole.','This doubles the given red count instead of scaling both ratio parts.']:['This takes the green part of each of the four complete groups.','This counts the gold ribbons rather than the requested green ribbons.','This uses the green part without dividing the whole into complete ratio groups.','This is the size of one complete group rather than its total green count.'],breakthrough:'Find how many complete ratio groups the known quantity represents, and then count the exact part or whole asked for.',commonTrap:'A part-to-part ratio compares two categories; their sum represents the complete group when finding a whole.',misconceptions:['','part-versus-whole','wrong-scaling','wrong-quantity']}))}}

before(async()=>{
 pg=new PGlite();
 await pg.exec(`CREATE TABLE content_worker_config(id integer PRIMARY KEY,enabled boolean,free_verified boolean,monthly_limit_cents integer,generation_model text,review_model text);
 CREATE TABLE content_requests(id text PRIMARY KEY,subtopic text,difficulty integer,status text DEFAULT 'queued',created bigint,updated bigint,plan jsonb,output jsonb,review jsonb,error text,model text,tokens integer DEFAULT 0,reserved_cents integer DEFAULT 0,cost_cents integer DEFAULT 0);
 CREATE TABLE content_budget(period text PRIMARY KEY,reserved_cents integer DEFAULT 0 CHECK(reserved_cents>=0),spent_cents integer DEFAULT 0 CHECK(spent_cents>=0));
 CREATE TABLE questions(id text PRIMARY KEY,subject text,skill text,difficulty integer,passage_id text,fingerprint text UNIQUE,data text,status text,created bigint);
 CREATE TABLE passages(id text PRIMARY KEY,title text,difficulty integer,type text,content text,data text,status text);`);
 const transaction:Transaction=operation=>pg.transaction(async tx=>operation(async(text,values)=>{const result=await tx.query<Record<string,unknown>>(text,values);return{rows:result.rows,rowCount:result.rowCount??result.affectedRows??result.rows.length}}));
 const db=new ApplicationDatabase(transaction);
 directory=await mkdtemp(join(tmpdir(),'rayans-content-worker-test-'));
 const modules=['content-worker','curriculum','content-quality','assessment','generation-policy'],require=createRequire(import.meta.url),zodUrl=pathToFileURL(require.resolve('zod')).href;
 for(const name of modules){let source=await readFile(new URL('../lib/'+name+'.ts',import.meta.url),'utf8');source=source.replace(/import ['"]server-only['"];?/g,'').replace(/(['"])@\/db\1/g,"'./database.mjs'").replace(/(['"])@vercel\/oidc\1/g,"'./oidc.mjs'").replace(/(['"])zod\1/g,JSON.stringify(zodUrl)).replace(/(['"])\.\/library\1/g,"'./fingerprint.mjs'").replace(new RegExp("(['\"])\\./("+modules.join('|')+")\\1",'g'),"'./$2.mjs'");await writeFile(join(directory,name+'.mjs'),ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText)}
 const library=await readFile(new URL('../lib/library.ts',import.meta.url),'utf8'),fingerprint=library.match(/^export async function fingerprint[^\n]+/m);assert.ok(fingerprint);
 await writeFile(join(directory,'fingerprint.mjs'),ts.transpileModule(fingerprint[0],{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);
 await writeFile(join(directory,'database.mjs'),"let current;export const setDatabase=value=>{current=value};export const database=()=>current;export const withDatabaseSetup=operation=>operation();");
 await writeFile(join(directory,'oidc.mjs'),"export const getVercelOidcToken=async()=> 'fixture-only-no-account-token';");
 const databaseModule=await import(pathToFileURL(join(directory,'database.mjs')).href);databaseModule.setDatabase(db);worker=await import(pathToFileURL(join(directory,'content-worker.mjs')).href);
 globalThis.fetch=async(input,init)=>{
  fetchCount++;const url=String(input);
  if(url.endsWith('/credits'))return Response.json({balance:5});
  if(url.endsWith('/models'))return Response.json({data:[{id:'fixture-free-generator',pricing:prices},{id:'fixture-free-reviewer',pricing:prices}]});
  assert.ok(url.endsWith('/chat/completions'),'No outside request is allowed in this test.');chatRequests.push(JSON.parse(String(init?.body)));const response=responses.shift();assert.ok(response,'Unexpected provider call in an isolated test.');return new Response(response.body,{status:response.status||200,headers:{'Content-Type':'application/json'}});
 };
});
beforeEach(async()=>{responses=[];chatRequests=[];fetchCount=0;await pg.exec('DELETE FROM content_requests;DELETE FROM content_budget;DELETE FROM content_worker_config;DELETE FROM questions;DELETE FROM passages;');await pg.exec("INSERT INTO content_worker_config VALUES(1,true,true,500,'fixture-free-generator','fixture-free-reviewer');");await pg.query('INSERT INTO content_requests(id,subtopic,difficulty,created,updated,plan) VALUES($1,$2,2,1,1,$3)',[JOB,'math-ratios',JSON.stringify({subtopic:'math-ratios',kind:'math'})])});
after(async()=>{globalThis.fetch=originalFetch;await pg?.close();if(directory){const child=relative(tmpdir(),directory);assert.ok(child&&!child.startsWith('..')&&!isAbsolute(child));await rm(directory,{recursive:true,force:true})}});
async function job(){return(await pg.query<{status:string;output:{providers:Record<string,{rawResponse:string;status:number;receipt:{tokens:number;model:string}}> ;receipts:Record<string,unknown>[];draft?:unknown;questionIds?:string[]};review:{lease:string;independent?:unknown;receipts?:unknown[]};tokens:number;cost_cents:number;reserved_cents:number;error:string}>('SELECT * FROM content_requests WHERE id=$1',[JOB])).rows[0]}

test('the production worker pauses before any request when free-credit verification is disabled',async()=>{
 await pg.exec('UPDATE content_worker_config SET enabled=false,free_verified=false');const result=await worker.runContentWorker();assert.equal(result.status,'paused');assert.equal(fetchCount,0);assert.equal((await job()).status,'queued');assert.equal((await pg.query('SELECT * FROM content_budget')).rows.length,0);
});
test('an invalid provider envelope remains recorded and its unknown usage remains charged conservatively',async()=>{
 responses=[{body:'{broken response envelope'}];const result=await worker.runContentWorker(),saved=await job();assert.equal(result.status,'rejected');assert.equal(saved.output.providers.generation.rawResponse,'{broken response envelope');assert.equal(saved.output.providers.generation.receipt.model,'fixture-free-generator');assert.equal(saved.output.receipts.length,1);assert.ok(saved.cost_cents>0);assert.equal(saved.reserved_cents,0);assert.equal(chatRequests.length,1);assert.ok(!JSON.stringify(saved.output).includes('fixture-only-no-account-token'));
 const budget=(await pg.query<{spent_cents:number;reserved_cents:number}>('SELECT * FROM content_budget')).rows[0];assert.equal(budget.spent_cents,saved.cost_cents);assert.equal(budget.reserved_cents,0);
});
test('invalid generated JSON is saved with its receipt before the parse rejection',async()=>{
 const raw=envelope('{malformed generated JSON');responses=[{body:raw}];const result=await worker.runContentWorker(),saved=await job();assert.equal(result.status,'rejected');assert.equal(saved.output.providers.generation.rawResponse,raw);assert.equal(saved.output.receipts.length,1);assert.equal(saved.tokens,21);assert.equal(chatRequests.length,1);assert.ok(saved.review.lease);
});
test('valid generated JSON rejected by the schema keeps the source response and usage',async()=>{
 const raw=envelope(JSON.stringify({items:[]}));responses=[{body:raw}];assert.equal((await worker.runContentWorker()).status,'rejected');const saved=await job();assert.equal(saved.output.providers.generation.rawResponse,raw);assert.equal(saved.tokens,21);assert.equal(chatRequests.length,1);assert.ok(saved.cost_cents>0);
});
test('invalid independent-review JSON preserves both model responses and does not overwrite the draft',async()=>{
 const first=envelope(JSON.stringify(generated())),second=envelope('{malformed independent review','fixture-review',35);responses=[{body:first},{body:second}];assert.equal((await worker.runContentWorker()).status,'rejected');const saved=await job();assert.equal(saved.output.providers.generation.rawResponse,first);assert.equal(saved.output.providers.review.rawResponse,second);assert.deepEqual(saved.output.draft,generated());assert.equal(saved.output.receipts.length,2);assert.equal(saved.tokens,56);assert.ok(saved.review.lease);assert.equal((await pg.query('SELECT * FROM questions')).rows.length,0);
 const messages=chatRequests[1].messages as {content:string}[],blind=JSON.parse(messages[1].content);assert.ok(blind.items.every((item:Record<string,unknown>)=>!('correct'in item)));assert.deepEqual(blind.items[0].table,draftItems[0].table);assert.deepEqual(blind.items[1].diagram,draftItems[1].diagram);
});
test('a semantic rejection preserves the independent audit alongside both raw responses',async()=>{
 const review=independentReview();review.items[0].oneDefensibleAnswer=false;responses=[{body:envelope(JSON.stringify(generated()))},{body:envelope(JSON.stringify(review),'fixture-review')}];assert.equal((await worker.runContentWorker()).status,'rejected');const saved=await job();assert.deepEqual(saved.review.independent,review);assert.equal(saved.output.receipts.length,2);assert.ok(saved.output.providers.review.rawResponse);assert.match(saved.error,/Independent review/);assert.equal((await pg.query('SELECT * FROM questions')).rows.length,0);
});
test('successful approval keeps the complete response archive and forwards checked representations into stored items',async()=>{
 const review=independentReview();responses=[{body:envelope(JSON.stringify(generated()))},{body:envelope(JSON.stringify(review),'fixture-review')}];const result=await worker.runContentWorker();assert.equal(result.status,'approved',result.reason);assert.equal(result.questions,2);const saved=await job();assert.equal(saved.output.receipts.length,2);assert.equal(saved.output.questionIds!.length,2);assert.ok(saved.output.providers.generation.rawResponse);assert.ok(saved.output.providers.review.rawResponse);assert.deepEqual(saved.review.independent,review);
 const questions=(await pg.query<{data:string}>('SELECT data FROM questions ORDER BY id')).rows.map(row=>JSON.parse(row.data));assert.deepEqual(questions[0].table,draftItems[0].table);assert.deepEqual(questions[1].diagram,draftItems[1].diagram);
});
test('a provider error response is retained before rejection, with no review request',async()=>{
 const raw=JSON.stringify({error:{message:'Free quota unavailable'}});responses=[{body:raw,status:402}];const result=await worker.runContentWorker();assert.equal(result.status,'rejected');const saved=await job();assert.equal(saved.output.providers.generation.status,402);assert.equal(saved.output.providers.generation.rawResponse,raw);assert.equal(chatRequests.length,1);assert.match(result.reason!,/Free AI credits/);
});

const words=(count:number)=>Array.from({length:count},()=> 'fixtureword').join(' ');
function readingBatch(count:number,genre='Science'){return{passage:{title:'Word Count Fixture Passage',content:words(count),genre},items:[...generated().items,...generated().items]}}
test('reading passage word limits are deterministic and use the declared genre',()=>{
 for(const count of [350,800])assert.ok(worker.validateGeneratedBatch('reading',readingBatch(count)).passage);
 for(const count of [349,801])assert.throws(()=>worker.validateGeneratedBatch('reading',readingBatch(count)),/350–800 words/);
 for(const count of [100,250])assert.equal(worker.validateGeneratedBatch('reading',readingBatch(count,'poetry')).passage?.genre,'Poetry');
 for(const count of [99,251])assert.throws(()=>worker.validateGeneratedBatch('reading',readingBatch(count,'Poetry')),/100–250 words/);
 assert.throws(()=>worker.validateGeneratedBatch('reading',readingBatch(350,'Unrecognized genre')),/unsupported/);
 assert.throws(()=>worker.validateGeneratedBatch('reading',readingBatch(100,'Poetry'),'Science'),/generation plan/);
});
test('the passage and question-set count must match the planned kind',()=>{
 assert.throws(()=>worker.validateGeneratedBatch('reading',generated()),/planned batch/);
 assert.throws(()=>worker.validateGeneratedBatch('reading',{...readingBatch(350),items:generated().items}),/planned batch/);
 assert.throws(()=>worker.validateGeneratedBatch('math',{...generated(),passage:readingBatch(350).passage}),/unplanned passage/);
 assert.throws(()=>worker.validateGeneratedBatch('editing',{...generated(),passage:readingBatch(350).passage}),/unplanned passage/);
});
test('malformed tables or diagram endpoints are rejected before the independent review is charged',()=>{
 const table=generated();table.items[0].table!.rows[0]=[2,3,4];assert.throws(()=>worker.validateGeneratedBatch('math',table),/inconsistent dimensions/);
 const diagram=generated() as {items:Record<string,unknown>[]};diagram.items[1].diagram={kind:'coordinate',description:'A stated segment with one endpoint missing.',points:[{label:'A',x:0,y:0}],segments:[{from:'A',to:'B'}]};assert.throws(()=>worker.validateGeneratedBatch('math',diagram),/missing endpoints/);
});
