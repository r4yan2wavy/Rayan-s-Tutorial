import test from 'node:test';
import assert from 'node:assert/strict';
import {DIAGNOSTIC,DIAGNOSTIC_BLUEPRINT,ELA_EDITING_SKILLS,MATH_SKILLS,diagnosticBlueprintForSavedQuestions,diagnosticComposition,diagnosticDone,diagnosticNext,diagnosticStartingLevels,diagnosticValidationErrors,type DiagnosticBlueprint,type DiagnosticLevels,type Evidence,type Question} from '../lib/assessment';
import {mathQuestion} from '../lib/math';

function item(id:string,subject='ELA',skill='Main idea',difficulty=2,passageId?:string):Question{
  return{id,subject,skill,difficulty,passageId,text:'A diagnostic fixture question.',choices:['A','B','C','D'],correct:0,explanation:'A fixture explanation.',breakthrough:'A fixture strategy.',commonTrap:'A fixture trap.',type:'mc'};
}
function evidence(q:Question,correct=1):Evidence{return{id:q.id,subject:q.subject,skill:q.skill,difficulty:q.difficulty,passageId:q.passageId,correct}}
function fillDiagnostic(saved:Question[]=[],blueprint:DiagnosticBlueprint=DIAGNOSTIC_BLUEPRINT,levels:DiagnosticLevels={ELA:2,Math:2}){
  const questions=[...saved],rows=saved.map(q=>evidence(q));
  let group=0;
  while(!diagnosticDone(rows,blueprint)){
    assert.ok(rows.length<100,'The diagnostic must finish at exactly 100 answers.');
    const next=diagnosticNext(rows,levels,blueprint);
    if(next.kind==='reading'){
      const pid='new-passage-'+group++;
      for(let index=0;index<next.count;index++){
        const q=item(`${pid}-${index}`,'ELA',['Main idea','Inference','Vocabulary','Supporting evidence'][index],next.difficulty,pid);
        questions.push(q);rows.push(evidence(q));
      }
    }else{
      const q=next.kind==='math'?mathQuestion(next.skill!,next.difficulty,50000+rows.length):item('editing-'+rows.length,'ELA',next.skill!,next.difficulty);
      questions.push(q);rows.push(evidence(q));
    }
  }
  return{questions,rows};
}

test('diagnostic requires exactly 100 answers, with 50 ELA and 50 Math',()=>{
  const{questions,rows}=fillDiagnostic();
  assert.equal(DIAGNOSTIC.min,100);assert.equal(DIAGNOSTIC.max,100);
  assert.deepEqual(diagnosticComposition(rows),{ELA:50,Math:50,reading:40,editing:10,total:100});
  for(const count of [0,28,40,50,99])assert.equal(diagnosticDone(rows.slice(0,count)),false,`Ended early at ${count}`);
  assert.equal(diagnosticDone(rows),true);
  assert.equal(diagnosticDone([...rows,rows[99]]),false);
  assert.deepEqual(diagnosticValidationErrors(questions),[]);
  const math=rows.filter(r=>r.subject==='Math');
  for(const skill of MATH_SKILLS){const count=math.filter(r=>r.skill===skill).length;assert.ok(count===2||count===3,skill)}
  assert.deepEqual(new Set(rows.filter(r=>r.subject==='ELA'&&!r.passageId).map(r=>r.skill)),new Set(ELA_EDITING_SKILLS));
});

test('reading stays in four-question passage groups and changes level only at the next set',()=>{
  const{questions}=fillDiagnostic();
  const passages=new Set<string>();
  for(let index=0;index<40;index+=4){
    const group=questions.slice(index,index+4);
    assert.equal(group.length,4);
    assert.equal(new Set(group.map(q=>q.passageId)).size,1);
    assert.equal(new Set(group.map(q=>q.difficulty)).size,1);
    assert.ok(!passages.has(group[0].passageId!));passages.add(group[0].passageId!);
  }
  assert.equal(passages.size,10);
  const first=questions.slice(0,4);
  assert.equal(first[0].difficulty,2);
  assert.equal(diagnosticNext(first.map(q=>evidence(q,1))).difficulty,3);
  assert.equal(diagnosticNext(first.map(q=>evidence(q,0))).difficulty,1);
});

test('Math starts at its own level and responds to the current Math answers',()=>{
  const ela=fillDiagnostic().rows.slice(0,50);
  const first=diagnosticNext(ela);assert.equal(first.kind,'math');assert.equal(first.difficulty,2);
  const math=item('math-first','Math',first.skill!,first.difficulty);
  assert.equal(diagnosticNext([...ela,evidence(math,1)]).difficulty,2);
  assert.equal(diagnosticNext([...ela,evidence(math,0)]).difficulty,2);
  const consistentCorrect=Array.from({length:3},(_,index)=>evidence({...math,id:'math-correct-'+index},1));
  const consistentIncorrect=Array.from({length:3},(_,index)=>evidence({...math,id:'math-incorrect-'+index},0));
  assert.equal(diagnosticNext([...ela,...consistentCorrect]).difficulty,3);
  assert.equal(diagnosticNext([...ela,...consistentIncorrect]).difficulty,1);
  const hard=item('math-hard','Math','Ratios',5),easy=item('math-easy','Math','Ratios',1);
  assert.equal(diagnosticNext([...ela,evidence(hard,1)]).difficulty,5);
  assert.equal(diagnosticNext([...ela,evidence(easy,0)]).difficulty,1);
  assert.equal(diagnosticNext(ela,{ELA:1,Math:4}).difficulty,4);
});

test('retake starting levels use prior evidence separately for ELA and Math',()=>{
  assert.deepEqual(diagnosticStartingLevels([]),{ELA:2,Math:2});
  const prior:Evidence[]=[];
  for(let index=0;index<20;index++){prior.push({subject:'ELA',skill:'Inference',difficulty:1,correct:0},{subject:'Math',skill:'Ratios',difficulty:5,correct:1})}
  const levels=diagnosticStartingLevels(prior);
  assert.equal(levels.ELA,2);assert.equal(levels.Math,3);
});

test('completion rejects a skewed section count, duplicates, and broken passage grouping',()=>{
  const{questions,rows}=fillDiagnostic();
  const skewed=rows.map((r,index)=>index===99?{...r,subject:'ELA',passageId:undefined}:r);
  assert.equal(diagnosticDone(skewed),false);
  const duplicate=questions.map((q,index)=>index===99?questions[98]:q);
  assert.ok(diagnosticValidationErrors(duplicate).some(error=>error.includes('distinct')));
  const broken=questions.map((q,index)=>index===1?{...q,passageId:'other-passage'}:q);
  assert.ok(diagnosticValidationErrors(broken).some(error=>error.includes('together')));
});

test('an active legacy diagnostic can keep its saved questions and still reach 50 ELA plus 50 Math',()=>{
  const saved:Question[]=[];
  for(let index=0;index<17;index++)saved.push(item('saved-reading-'+index,'ELA','Inference',2,'saved-passage-'+index));
  for(let index=0;index<3;index++)saved.push(item('saved-editing-'+index,'ELA','Grammar'));
  for(let index=0;index<19;index++)saved.push(item('saved-math-'+index,'Math','Ratios'));
  const blueprint=diagnosticBlueprintForSavedQuestions(saved);
  assert.deepEqual(blueprint,DIAGNOSTIC_BLUEPRINT);
  const{questions,rows}=fillDiagnostic(saved,blueprint);
  assert.deepEqual(questions.slice(0,saved.length),saved);
  assert.deepEqual(diagnosticComposition(rows),{ELA:50,Math:50,reading:40,editing:10,total:100});
  assert.equal(diagnosticDone(rows,blueprint),true);
  assert.deepEqual(diagnosticValidationErrors(questions,blueprint,true),[]);
});

test('legacy ELA editing evidence is preserved while the remaining ELA quota adjusts',()=>{
  const saved=Array.from({length:11},(_,index)=>item('saved-editing-'+index,'ELA','Revision'));
  const blueprint=diagnosticBlueprintForSavedQuestions(saved);
  assert.equal(blueprint.editing,11);assert.equal(blueprint.reading,39);
  const{questions,rows}=fillDiagnostic(saved,blueprint);
  assert.equal(diagnosticDone(rows,blueprint),true);
  assert.deepEqual(diagnosticValidationErrors(questions,blueprint,true),[]);
  assert.throws(()=>diagnosticBlueprintForSavedQuestions(Array.from({length:51},(_,index)=>item('over-capacity-'+index))),/capacity/);
});
