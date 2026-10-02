import test from 'node:test';
import assert from 'node:assert/strict';
import {MATH_SKILLS,validate,matches,publicQuestion,profile,diagnosticNext,diagnosticDone} from '../lib/assessment';
import {mathQuestion} from '../lib/math';
test('all math templates preserve answer and explanation validity across skills and levels',()=>{
  for(const skill of MATH_SKILLS)for(let difficulty=1;difficulty<=5;difficulty++)for(let seed=100;seed<150;seed++){
    const q=mathQuestion(skill,difficulty,seed);assert.deepEqual(validate(q),[],q.id);
    assert.equal(matches(q,q.correct),true,q.id);
    const visible=publicQuestion(q);for(const hidden of ['correct','explanation','breakthrough','commonTrap','evidence','distractorReasons'])assert.equal(hidden in visible,false);
  }
});
test('fresh diagnostic estimates are finite and require evidence before completion',()=>{
  const fresh=profile([]);assert.equal(Number.isFinite(fresh.overall),true);assert.equal(diagnosticDone([]),false);
  const next=diagnosticNext([]);assert.ok(['ELA','Math'].includes(next.subject));assert.ok(next.difficulty>=1&&next.difficulty<=5);
});
