import test from 'node:test';
import assert from 'node:assert/strict';
import {mathQuestion,mathFeedbackForStoredQuestion} from '../lib/math';
import {MATH_SKILLS,matches,validate,publicQuestion,type Question} from '../lib/assessment';
import {legacyBeadQuestion} from './helpers/math-fixtures';

function beadSteps(q:Question){
  assert.match(q.explanation,/36[\s\S]*4[\s\S]*9/);
  assert.match(q.explanation,/11[\s\S]*9[\s\S]*99/);
  assert.match(q.explanation,/36[\s\S]*99[\s\S]*135/);
  assert.doesNotMatch(q.commonTrap,/familiar operation|use this rule/i);
}

test('reported bead question has the correct total and choices with distinct problem-specific feedback',()=>{
  const q=mathQuestion('Ratios',2,10051,1);
  assert.equal(q.choices![Number(q.correct)],'135');
  assert.equal(q.generationMethod,'procedural-v2');assert.match(q.id,/-v2$/);
  assert.equal(new Set(q.choices).size,4);
  assert.equal(q.choices!.filter(choice=>choice==='135').length,1);
  beadSteps(q);
  assert.equal(new Set(q.distractorReasons).size,4);
  for(const [index,choice] of q.choices!.entries()){
    assert.ok(q.distractorReasons![index].includes(choice),`${choice}: ${q.distractorReasons![index]}`);
    assert.doesNotMatch(q.distractorReasons![index],/required sequence|does not follow|familiar operation/i);
  }
});

test('saved bead feedback improves without changing choices, answer indices, identity, or the stored input',()=>{
  const original=structuredClone(legacyBeadQuestion),before=JSON.stringify(original);
  const repaired=mathFeedbackForStoredQuestion(original);
  beadSteps(repaired);
  for(const key of ['id','subject','skill','difficulty','text','type','choices','correct','generationMethod','templateId'] as const)assert.deepEqual(repaired[key],original[key],key);
  assert.equal(JSON.stringify(original),before);
  assert.equal(matches(repaired,1),true);assert.equal(matches(repaired,2),false);
  assert.match(repaired.distractorReasons![2],/139/);
  assert.doesNotMatch(repaired.distractorReasons![2],/required sequence|does not follow/i);
  assert.notEqual(repaired.distractorReasons![2],repaired.distractorReasons![0]);
  for(const key of ['correct','explanation','breakthrough','commonTrap','distractorReasons'])assert.equal(key in publicQuestion(repaired),false,key);
});

test('feedback repair leaves edited, unrecognized, or non-Math questions unchanged',()=>{
  const candidates:Question[]=[
    {...legacyBeadQuestion,text:legacyBeadQuestion.text.replace('36','40')},
    {...legacyBeadQuestion,correct:2},
    {...legacyBeadQuestion,id:'teacher-authored-ratio'},
    {...legacyBeadQuestion,subject:'ELA'},
    {...legacyBeadQuestion,generationMethod:'teacher-authored'},
    {...legacyBeadQuestion,difficulty:4},
  ];
  for(const q of candidates)assert.equal(mathFeedbackForStoredQuestion(q),q,q.id);
});

test('new Math variants have unique versioned choices and instructional feedback across every skill and level',()=>{
  for(const skill of MATH_SKILLS)for(let level=1;level<=5;level++)for(let seed=101;seed<131;seed++){
    const q=mathQuestion(skill,level,seed);
    assert.deepEqual(validate(q),[],q.id);
    assert.match(q.id,/-v2$/);assert.equal(q.generationMethod,'procedural-v2');
    assert.ok(q.explanation.trim(),q.id);
    assert.doesNotMatch(q.commonTrap,/familiar operation|use this rule/i,q.id);
    if(q.choices){
      assert.equal(q.choices.length,4,q.id);assert.equal(new Set(q.choices).size,4,q.id);
      assert.equal(q.distractorReasons!.length,4,q.id);assert.equal(new Set(q.distractorReasons).size,4,q.id);
      for(const reason of q.distractorReasons!)assert.doesNotMatch(reason,/required sequence|does not follow/i,q.id);
    }
  }
});
