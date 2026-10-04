import assert from 'node:assert/strict';
import test from 'node:test';
import {qualityErrors,nearDuplicate} from '../lib/content-quality';
import {mathFeedbackForStoredQuestion} from '../lib/math';
import {type Question} from '../lib/assessment';
import {auditQuestions,auditStoredRows,legacyMathAnswer,knownLegacySubtopic,type StoredAuditRow} from '../scripts/audit-content';
import {legacyBeadQuestion} from './helpers/math-fixtures';

function ratioQuestion():Question{
 return{...mathFeedbackForStoredQuestion(structuredClone(legacyBeadQuestion)),subtopic:'math-ratios',domain:'Ratios and proportional relationships',topic:'Ratios',familyId:'ratio-part-to-total',scenarioId:'beads',structureId:'given-first-part-find-total',reasoningType:'scale-parts-and-combine',reasoningSteps:3,estimatedTime:100,qualityVersion:'content-v3.1',howToThink:'Use the red count to determine how many complete ratio bundles there are, then count both colors.',solutionSteps:['Each ratio bundle contains 4 red beads and 11 blue beads.','The 36 red beads make 36 ÷ 4 = 9 complete ratio bundles.','There are 9 × 11 = 99 blue beads, so the total is 36 + 99 = 135 beads.'],calibration:{basis:'Original ratio reasoning aligned to public Grade 7 prerequisite standards.',status:'editorial',version:3}};
}
function readingQuestion():Question{
 const content='Lena assumed the short bridge needed only a fresh coat of paint. When she inspected the support posts, she found that one had rotted below the waterline. The crew replaced that post before painting. Lena wrote that careful inspection had changed the order of their work and prevented them from hiding a serious weakness under a new surface.';
 return{id:'quality-reading-example',subject:'ELA',skill:'Inference',subtopic:'ela-reading-inference',difficulty:2,text:'What does the crew’s decision suggest about its priorities?',choices:['The crew values sound construction more than an immediate improvement in appearance.','The crew believes that paint can strengthen a damaged support post.','The crew expects the bridge to collapse before the repair begins.','The crew avoids inspection when a bridge looks worn.'],correct:0,type:'mc',passageId:'quality-reading-passage',passage:{title:'Before the Paint',content,type:'Science'},evidence:'The crew replaced that post before painting.',explanation:'Replacing the rotted support before painting shows that the crew addressed a structural problem before making a surface improvement. This supports a priority for sound construction; it does not establish that collapse was inevitable.',evidenceExplanation:'The order of the actions is direct evidence. The priority inferred from that order is that a sound support matters more than an immediate surface improvement.',breakthrough:'Infer a priority by comparing which competing action the people choose first, and keep the conclusion within what their actions support.',commonTrap:'A real concern about a weak support does not prove that a collapse is certain or imminent.',distractorReasons:['Repair comes before paint, so the crew gives the structural support priority over the bridge’s appearance.','Replacing the support rather than painting it contradicts the idea that paint provides the needed strength.','The passage identifies a weakness, but it does not say the bridge is certain to collapse before work begins.','Lena discovers the rot through inspection; the crew’s repair follows that inspection.'],howToThink:'Compare the action chosen first with the action delayed, then infer the priority supported by that order.',solutionSteps:['Find the sentence that states the order of the repair and painting.','Distinguish the visible appearance from the strength of the support post.','Choose the inference supported by that action without assuming an unstated future collapse.'],familyId:'repair-before-appearance',scenarioId:'bridge-repair',structureId:'action-order-priority',reasoningType:'infer-priority-from-actions',reasoningSteps:3,estimatedTime:105,qualityVersion:'content-v3.1',calibration:{basis:'Editorial inference depth and evidence distance; no empirical difficulty claim.',status:'editorial',version:3}};
}

test('the reported 4:11 bead question has the independently verified total of 135 and no invented grading correction',()=>{
 const original=structuredClone(legacyBeadQuestion),report=auditQuestions([original]);
 assert.equal(legacyMathAnswer(original),135);assert.equal(report.mathKeysVerified,1);assert.equal(report.clearBroken,0);
 assert.ok(report.items[0].review.some(issue=>issue.includes('Generic option feedback')));
 assert.deepEqual(original,legacyBeadQuestion,'The audit must not rewrite a question or its historical option indices.');
 assert.deepEqual(qualityErrors(ratioQuestion()),[]);
});

test('a wrong key on the reported ratio is quarantined based on the displayed problem rather than the generator seed',()=>{
 const corrupted={...legacyBeadQuestion,correct:2};
 const report=auditQuestions([corrupted]);assert.equal(report.clearBroken,1);
 assert.ok(report.items[0].fatal.some(issue=>issue.includes('independently solved')));
 assert.equal(corrupted.correct,2,'Audit classification must preserve the original grading record.');
});

test('a numeric equivalent duplicate answer makes a Math item ambiguous even when the answer texts differ',()=>{
 const ambiguous={...legacyBeadQuestion,choices:['135','135.0','139','124'],correct:0};
 const report=auditQuestions([ambiguous]);assert.equal(report.clearBroken,1);
 assert.ok(report.items[0].fatal.some(issue=>issue.includes('exactly one correct numeric answer')));
 assert.ok(qualityErrors({...ratioQuestion(),choices:['135','135.0','139','124']}).some(issue=>issue.includes('Numerically equivalent')));
 assert.ok(qualityErrors({...ratioQuestion(),choices:['1/2','.5','1/3','2/3']}).some(issue=>issue.includes('Numerically equivalent')));
});

test('the actual sequence boilerplate shown in the screenshot cannot pass the new tutor quality gate',()=>{
 const question=ratioQuestion();question.distractorReasons=legacyBeadQuestion.distractorReasons;
 assert.ok(qualityErrors(question).some(issue=>issue.includes('Generic answer feedback')));
});

test('fresh IDs and changed numbers do not make a repeated ratio structure new content',()=>{
 const first=ratioQuestion(),clone={...first,id:'another-id',text:'The ratio of red to blue beads is 3:7. There are 24 red beads. How many beads are there in all?',choices:['160','80','84','77']};
 assert.equal(nearDuplicate(first,clone),true);
 const different={...first,id:'reverse-ratio',familyId:'recover-ratio-from-two-counts',structureId:'counts-find-part-to-part',text:'A display contains 36 red beads and 99 blue beads. What is the simplest ratio of red beads to blue beads?'};
 assert.equal(nearDuplicate(first,different),false,'The same scenario can support a genuinely different reasoning direction.');
});

test('invented quotations are rejected before reading content reaches a student',()=>{
 const question=readingQuestion();assert.deepEqual(qualityErrors(question),[]);
 const invented={...question,evidence:'Lena knew the bridge would collapse that afternoon.'};
 assert.ok(qualityErrors(invented).some(issue=>issue.includes('Evidence')||issue.includes('evidence')));
 assert.equal(auditQuestions([invented]).clearBroken,1);
});

test('a short quotation that really occurs remains a semantic-review issue rather than proof of a correct interpretation',()=>{
 const question={...readingQuestion(),evidence:'new surface'};
 const report=auditQuestions([question]);assert.equal(report.clearBroken,0);
 assert.ok(report.items[0].review.some(issue=>issue.includes('contextual review')));
 assert.match(report.limitation,/do not establish every ELA interpretation/);
});

test('an author-purpose label on a why-a-person-acted question remains pending instead of receiving a guessed exact target',()=>{
 const question={...readingQuestion(),skill:'Author purpose',subtopic:undefined,text:'Why did the crew replace the support before painting?'};
 assert.equal(knownLegacySubtopic(question),undefined);
 const report=auditQuestions([question]);assert.ok(report.items[0].review.some(issue=>issue.includes('Author purpose label')));assert.equal(report.items[0].subtopic,undefined);
});

test('a display with missing table cells or diagram endpoints cannot pass the question gate',()=>{
 const question=ratioQuestion();
 assert.ok(qualityErrors({...question,table:{headers:['Red','Blue'],rows:[[36]]}}).some(issue=>issue.includes('Table dimensions')));
 assert.ok(qualityErrors({...question,diagram:{kind:'shape',description:'A segment',points:[{label:'A',x:20,y:20}],segments:[{from:'A',to:'B'}]}}).some(issue=>issue.includes('endpoints')));
});

test('malformed stored JSON and a stale linked reading passage are quarantined without discarding their source records',()=>{
 const malformed:StoredAuditRow={id:'bad-payload',subject:'Math',skill:'Ratios',difficulty:2,status:'approved',data:'{incomplete JSON'};
 const reading=readingQuestion(),stale:StoredAuditRow={id:reading.id,subject:reading.subject,skill:reading.skill,difficulty:reading.difficulty,status:'approved',data:JSON.stringify(reading),linked_passage_id:reading.passageId,passage_content:'A different passage was saved by an editor.'};
 const originals=structuredClone([malformed,stale]),result=auditStoredRows([malformed,stale]);
 assert.equal(result.report.clearBroken,2);assert.ok(result.malformed.has(0));
 assert.ok(result.report.items[0].fatal.some(issue=>issue.includes('JSON is invalid')));
 assert.ok(result.report.items[1].fatal.some(issue=>issue.includes('linked stored passage')));
 assert.deepEqual([malformed,stale],originals);
});
