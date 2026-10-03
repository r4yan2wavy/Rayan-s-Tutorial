import test from 'node:test';
import assert from 'node:assert/strict';
import passages from '../lib/seed-data.json';
import {validate,publicQuestion,type Question} from '../lib/assessment';
import {editingBatch,EDITING_SKILLS} from '../lib/editing-data';

const normalized=(value:string)=>value.toLowerCase().replace(/\s+/g,' ').trim();
const contentKey=(question:Question)=>normalized(question.text)+'|'+question.choices?.map(normalized).sort().join('|');

test('each reading level has fifty distinct complete passage units with supported answer keys',()=>{
  assert.equal(passages.length,250);
  assert.equal(new Set(passages.map(p=>p.id)).size,250);
  assert.equal(new Set(passages.map(p=>normalized(p.title))).size,250);
  assert.equal(new Set(passages.map(p=>normalized(p.content))).size,250);
  const questionIds=new Set<string>();
  for(let difficulty=1;difficulty<=5;difficulty++){
    const level=passages.filter(p=>p.difficulty===difficulty);
    assert.equal(level.length,50,`Level ${difficulty}`);
    const types=new Set(level.map(p=>normalized(p.type)));
    assert.ok(types.has('literary'),`Level ${difficulty} needs literary texts.`);
    assert.ok(types.size>=3,`Level ${difficulty} needs more than one informational genre.`);
    for(const passage of level){
      assert.equal(passage.questions.length,4,passage.id);
      assert.ok(passage.content.trim().split(/\s+/).length>=140,passage.id);
      assert.ok(new Set(passage.questions.map(q=>q.skill)).size>=3,passage.id);
      for(const stored of passage.questions){
        const question:Question={...stored,subject:'ELA',difficulty,passageId:passage.id,passage:{title:passage.title,content:passage.content,type:passage.type},type:'mc'};
        assert.deepEqual(validate(question),[],question.id);
        assert.equal(questionIds.has(question.id),false,question.id);questionIds.add(question.id);
        assert.equal(question.distractorReasons?.length,4,question.id);
        assert.ok(question.evidence&&passage.content.includes(question.evidence),question.id);
        assert.ok(question.explanation.length>=30,question.id);
        const visible=publicQuestion(question);
        for(const hidden of ['correct','explanation','breakthrough','commonTrap','evidence','distractorReasons'])assert.equal(hidden in visible,false,question.id);
      }
    }
  }
  assert.equal(questionIds.size,1000);
});

test('editing bank covers all four skills at every level without relabeled duplicate items',()=>{
  const questions=editingBatch();
  assert.equal(questions.length,200);
  assert.equal(new Set(questions.map(q=>q.id)).size,200);
  assert.equal(new Set(questions.map(contentKey)).size,200);
  for(let difficulty=1;difficulty<=5;difficulty++){
    const level=questions.filter(q=>q.difficulty===difficulty);
    assert.equal(level.length,40);
    for(const skill of EDITING_SKILLS)assert.equal(level.filter(q=>q.skill===skill).length,10,`${difficulty}: ${skill}`);
    for(const q of level){
      assert.deepEqual(validate(q),[],q.id);
      assert.ok(q.id.startsWith('edit-v2-'),q.id);
      assert.equal(q.passageId,undefined,q.id);
      assert.equal(q.passage,undefined,q.id);
      assert.equal(/\[Editing item|level \d/i.test(q.text),false,q.id);
      assert.equal(q.distractorReasons?.length,4,q.id);
      assert.ok(q.subskill,q.id);
    }
  }
  for(const skill of EDITING_SKILLS){
    const byLevel=Array.from({length:5},(_,i)=>new Set(questions.filter(q=>q.skill===skill&&q.difficulty===i+1).map(q=>q.subskill)));
    assert.ok(byLevel.every(set=>set.size===1),skill);
    assert.equal(new Set(byLevel.flatMap(set=>[...set])).size,5,`${skill} must change the task across levels.`);
  }
});

test('editing answer keys preserve subject agreement, logical sequence, and evidence limits',()=>{
  const questions=editingBatch();
  const answer=(question:Question)=>question.choices![Number(question.correct)];
  // These are independently specified grammar rules, not a replay of the
  // answer rotation or generator arithmetic.
  const agreementAnswers=['belongs','has','are','lies','represents'];
  for(const q of questions.filter(q=>q.skill==='Grammar'))assert.equal(answer(q),agreementAnswers[q.difficulty-1],q.id);
  for(const q of questions.filter(q=>q.skill==='Organization'&&q.difficulty===2))assert.equal(answer(q),'2, 3, 1',q.id);
  for(const q of questions.filter(q=>q.skill==='Organization'&&q.difficulty===3))assert.equal(answer(q),'Sentence 3',q.id);
  for(const q of questions.filter(q=>q.skill==='Organization'&&q.difficulty===4))assert.equal(answer(q),'Between sentences 2 and 3',q.id);
  for(const q of questions.filter(q=>q.skill==='Revision'&&q.difficulty===3)){
    assert.match(answer(q),/^Twelve of the 20 tested .+ met the stated accuracy standard\.$/,q.id);
    assert.doesNotMatch(answer(q),/all|every|future|never/i,q.id);
  }
  for(const q of questions.filter(q=>q.skill==='Revision'&&q.difficulty===5)){
    assert.match(answer(q),/more consistent measurements than the earlier method/,q.id);
    assert.match(answer(q),/does not establish its superiority under all conditions/,q.id);
  }
});
