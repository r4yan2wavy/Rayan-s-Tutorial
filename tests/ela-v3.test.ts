import test from 'node:test';
import assert from 'node:assert/strict';
import corpus from '../lib/ela-corpus-v3.json';
import {SUBTOPICS} from '../lib/curriculum';
import {publicQuestion,type Question} from '../lib/assessment';
import {qualityErrors} from '../lib/content-quality';
import {allReadingQuestionsV3,editingFamilies,elaV3Coverage,generateEditingV3,generateReadingSetV3,readingFamilies} from '../lib/ela-v3';

const answer=(q:Question)=>q.choices![Number(q.correct)];
const editTopic=(label:string)=>SUBTOPICS.find(t=>t.kind==='editing'&&t.label===label)!.id;
const direct=(label:string,difficulty:number,seed=0)=>generateEditingV3(editTopic(label),difficulty,seed,editingFamilies(editTopic(label))[0]);

test('every individual editing skill has three real task types at every level and passes the publication gate',()=>{
  let combinations=0;
  for(const topic of SUBTOPICS.filter(t=>t.kind==='editing')){
    const families=editingFamilies(topic.id);
    assert.equal(new Set(families).size,3,topic.label);
    for(let difficulty=1;difficulty<=5;difficulty++){
      const questions=families.map(family=>generateEditingV3(topic.id,difficulty,0,family));
      assert.equal(new Set(questions.map(q=>q.structureId)).size,3,`${topic.label} level ${difficulty}`);
      assert.equal(new Set(questions.map(q=>q.reasoningType)).size,3,`${topic.label} level ${difficulty}`);
      assert.equal(new Set(questions.map(q=>q.id)).size,3,`${topic.label} level ${difficulty}`);
      for(const question of questions){
        combinations++;
        assert.deepEqual(qualityErrors(question),[],question.id);
        assert.equal(question.subtopic,topic.id);
        assert.equal(question.skill,topic.skill);
        assert.equal(question.difficulty,difficulty);
        assert.equal(question.passageId,undefined);
        assert.ok(question.explanation.includes(answer(question)),question.id);
        assert.ok(question.commonTrap.length>=30,question.id);
        assert.ok(question.breakthrough.length>=30,question.id);
      }
    }
  }
  assert.equal(combinations,SUBTOPICS.filter(t=>t.kind==='editing').length*5*3);
});

test('names and answer rotations do not manufacture new editing task families or question identities',()=>{
  for(const topic of SUBTOPICS.filter(t=>t.kind==='editing')){
    for(const family of editingFamilies(topic.id)){
      const original=generateEditingV3(topic.id,3,0,family);
      const rotated=generateEditingV3(topic.id,3,18,family);
      assert.equal(rotated.id,original.id,`${topic.id}: rotation`);
      assert.equal(rotated.contentSignature,original.contentSignature);
      assert.equal(answer(rotated),answer(original));
      const anotherContext=generateEditingV3(topic.id,3,3,family);
      assert.equal(anotherContext.familyId,original.familyId,`${topic.id}: name change`);
      assert.equal(anotherContext.structureId,original.structureId);
    }
  }
});

test('editing plans do not recycle the same item under different difficulty labels',()=>{
  for(const topic of SUBTOPICS.filter(t=>t.kind==='editing')){
    for(const family of editingFamilies(topic.id)){
      const levels=Array.from({length:5},(_,i)=>generateEditingV3(topic.id,i+1,0,family));
      assert.equal(new Set(levels.map(q=>q.id)).size,5,`${topic.label}: ${family}`);
      assert.equal(new Set(levels.map(q=>q.contentSignature)).size,5,`${topic.label}: ${family}`);
    }
  }
});

test('independent grammar oracles confirm agreement, case, possessives, tense, and modifiers',()=>{
  const agreement=['belongs','has','are','lies','represents'];
  const pronounCase=['me','She','me','him','whom'];
  const pronounAgreement=['their','its','their','their','its'];
  const adjective=['clear','careful','sweet','more detailed','rough'];
  const adverb=['clearly','carefully','remarkably','especially','independently'];
  for(let level=1;level<=5;level++){
    assert.equal(answer(direct('Subject-verb agreement',level)),agreement[level-1]);
    assert.equal(answer(direct('Pronoun case',level)),pronounCase[level-1]);
    assert.equal(answer(direct('Pronoun agreement',level)),pronounAgreement[level-1]);
    assert.equal(answer(direct('Adjectives',level)),adjective[level-1]);
    assert.equal(answer(direct('Adverbs',level)),adverb[level-1]);
  }
  assert.equal(answer(direct('Possessives',1)),"the student's field guide");
  assert.equal(answer(direct('Possessives',2)),"the students' field guide");
  assert.equal(answer(direct('Possessives',3)),"the children's field guide");
  assert.equal(answer(direct('Possessives',4)),"Lena and Omar's report");
  assert.equal(answer(direct('Possessives',5)),"the directors' separate reports");
  assert.equal(answer(direct('Verb tense',3)),'had arranged');
  assert.equal(answer(direct('Verb tense',4)),'will have labeled');
  assert.equal(answer(direct('Commonly confused words',4)),'lay');
  assert.equal(answer(direct('Pronoun reference',2)),'The assistant placed the report in the damaged folder.');
  assert.equal(answer(direct('Pronoun reference',4)),'Comparing the records revealed a missing entry.');
});

test('clause, fragment, boundary, and logical-revision keys satisfy independently specified rules',()=>{
  assert.equal(answer(direct('Phrases',4)),'To compare the records before making a decision');
  assert.equal(answer(direct('Independent clauses',2)),'Check the label before opening the case.');
  assert.equal(answer(direct('Dependent clauses',4)),'why the dates differed');
  assert.match(answer(direct('Fragments',3)),/now fits the actor\.$/);
  assert.match(answer(direct('Fragments',4)),/was found in the archive\.$/);
  assert.equal(answer(direct('Run-ons',3)),'The revised method was faster; however, the committee needed to check its accuracy.');
  for(let level=1;level<=5;level++)assert.ok(answer(direct('Comma splices',level)).includes(';'));
  const connectors=['As a result','For example','However','In addition','Nevertheless'];
  for(let level=1;level<=5;level++)assert.equal(answer(direct('Transitions',level)),connectors[level-1]);
  assert.match(answer(direct('Sentence combining',2)),/because the original had faded\.$/);
  assert.match(answer(direct('Sentence combining',4)),/kept the current schedule/);
  assert.doesNotMatch(answer(direct('Sentence combining',4)),/definitely|immediately adopted|every future/);
});

test('every finite reading plan quotes its actual passage exactly and explains all four choices',()=>{
  const questions=allReadingQuestionsV3();
  const coverage=elaV3Coverage();
  assert.equal(questions.length,coverage.readingQuestions);
  assert.equal(corpus.passages.length,coverage.passages);
  assert.equal(new Set(questions.map(q=>q.id)).size,questions.length);
  assert.equal(new Set(corpus.passages.map(p=>p.content)).size,corpus.passages.length);
  for(const q of questions){
    assert.deepEqual(qualityErrors(q),[],q.id);
    assert.ok(q.passage!.content.includes(q.evidence!),q.id);
    assert.ok(q.explanation.includes(q.evidence!),q.id);
    assert.ok(q.explanation.includes(answer(q)),q.id);
    assert.equal(q.calibration.status,'editorial');
    assert.match(q.calibration.basis,/not empirically|not.*calibrated/);
    assert.equal(q.distractorReasons!.length,4);
    for(const reason of q.distractorReasons!)assert.ok(reason.length>=20,q.id);
    const visible=publicQuestion(q);
    for(const field of ['correct','evidence','explanation','breakthrough','commonTrap','distractorReasons','howToThink','solutionSteps','evidenceExplanation'])assert.equal(field in visible,false,q.id);
  }
});

test('two fresh Main idea and Inference questions can use different passages after a miss at every level',()=>{
  for(const subtopic of ['ela-reading-main-idea','ela-reading-inference']){
    for(let difficulty=1;difficulty<=5;difficulty++){
      const original=generateReadingSetV3(subtopic,difficulty,0,{count:1,targetOnly:true})[0];
      const second=generateReadingSetV3(subtopic,difficulty,1,{count:1,targetOnly:true,excludePassageIds:[original.passageId!]})[0];
      const third=generateReadingSetV3(subtopic,difficulty,2,{count:1,targetOnly:true,excludePassageIds:[original.passageId!,second.passageId!]})[0];
      assert.equal(new Set([original,second,third].map(q=>q.id)).size,3);
      assert.equal(new Set([original,second,third].map(q=>q.passage!.content)).size,3);
      assert.equal(new Set([original,second,third].map(q=>q.familyId)).size,3);
      assert.equal(new Set([original,second,third].map(q=>q.structureId)).size,3);
      assert.ok([original,second,third].every(q=>q.subtopic===subtopic&&q.difficulty===difficulty));
    }
  }
});

test('each supported passage set keeps its target first, preserves one level, and honors its four-question limit',()=>{
  for(const doc of corpus.passages){
    const subtopic=allReadingQuestionsV3().find(q=>q.passageId===`ela-v3-${doc.id}`)!.subtopic;
    const family=readingFamilies(subtopic).find(id=>id===doc.id)!;
    const questions=generateReadingSetV3(subtopic,doc.difficulty,4,{count:4,preferredFamily:family});
    assert.equal(questions.length,4,doc.id);
    assert.equal(questions[0].subtopic,subtopic,doc.id);
    assert.equal(new Set(questions.map(q=>q.id)).size,4,doc.id);
    assert.ok(questions.every(q=>q.passageId===`ela-v3-${doc.id}`&&q.difficulty===doc.difficulty),doc.id);
  }
});

test('unsupported combinations and fully excluded reading inventories fail honestly rather than relabel a question',()=>{
  assert.throws(()=>generateReadingSetV3('ela-reading-comparing-texts',1,0,{count:1,targetOnly:true}),error=>{
    assert.equal((error as Error&{code:string}).code,'ELA_LIBRARY_EXHAUSTED');return true;
  });
  const allAtLevel=allReadingQuestionsV3().filter(q=>q.subtopic==='ela-reading-main-idea'&&q.difficulty===2).map(q=>q.passageId!);
  assert.throws(()=>generateReadingSetV3('ela-reading-main-idea',2,0,{count:1,targetOnly:true,excludePassageIds:allAtLevel}),/No unused authored/);
  assert.throws(()=>generateReadingSetV3('ela-reading-main-idea',2,0,{count:5}),/1 to 4/);
  assert.throws(()=>generateEditingV3(editTopic('Subject-verb agreement'),2,0,'invented-family'),/requested invented-family/);
  assert.throws(()=>generateEditingV3(editTopic('Subject-verb agreement'),6,0),/difficulty/);
  assert.throws(()=>generateEditingV3('ela-reading-tone',2,0),/Unsupported ELA editing/);
});

test('reading evidence oracles distinguish stated facts, defensible inferences, and rejected overclaims',()=>{
  const questions=allReadingQuestionsV3();
  const named=(id:string)=>questions.find(q=>q.id===id)!;
  assert.equal(answer(named('read-v3-a-different-ending-detail')),'In the empty cafeteria.');
  assert.equal(answer(named('read-v3-a-different-ending-context')),'The blank area beside the written lines on a page.');
  assert.equal(answer(named('read-v3-tickets-and-time-vocabulary')),'Distributed according to a process.');
  assert.equal(answer(named('read-v3-fold-in-the-curtain-inference')),'He recognizes that Tessa has already handled a task he habitually took responsibility for.');
  const ledgerMain=named('read-v3-ledger-gap-main-synthesis');
  assert.match(answer(ledgerMain),/matching a conclusion to what the surviving records actually establish/);
  assert.doesNotMatch(ledgerMain.explanation,/payments|transactions/);
  assert.match(answer(named('read-v3-train-map-main-synthesis')),/independence.*accepting help/);
  assert.match(named('read-v3-a-different-ending-inference').evidenceExplanation,/direct evidence.*inferred/);
});
