import {existsSync} from 'node:fs';
if(existsSync('.env.local'))process.loadEnvFile('.env.local');
const {withDatabaseSetup,closeDatabase,database}=await import('../db/index');
const {putQuestions}=await import('../lib/library');
const {editingBatch,EDITING_CONTENT_VERSION}=await import('../lib/editing-data');
try{
  await withDatabaseSetup(async()=>{
    await putQuestions(editingBatch(),'approved',true);
    const db=database();
    const rows=await db.prepare("SELECT difficulty,COUNT(*) AS count FROM questions WHERE id LIKE 'edit-v2-%' AND status='approved' GROUP BY difficulty ORDER BY difficulty").all();
    if(rows.results.length!==5||rows.results.some(row=>Number(row.count)!==40))throw new Error('Editing bank verification failed.');
    await db.prepare('INSERT OR IGNORE INTO content_batches(id,user_id,created,data) VALUES(?,?,?,?)').bind(EDITING_CONTENT_VERSION,'system',Date.now(),JSON.stringify({method:'offline-authored-editing-v2',questions:200,levels:5})).run();
    console.log('Revising/editing library ready: 40 items at each of five levels. Existing answers and questions preserved.');
  });
}catch{
  console.error('Editing seed failed. Check the private database settings and applied schema.');process.exitCode=1;
}finally{await closeDatabase()}
