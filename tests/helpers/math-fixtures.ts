import type {Question} from '../../lib/assessment';

// Original persisted question from the student's screenshot. Choice indices are
// part of saved answer history and must not change when feedback is repaired.
export const legacyBeadQuestion:Question={
  id:'math-ratios-2-10051-1',subject:'Math',skill:'Ratios',difficulty:2,
  text:'The ratio of red to blue beads is 4:11. There are 36 red beads. How many beads are there in all?',
  choices:['270','135','139','124'],correct:1,type:'mc',
  explanation:'There are 9 copies of the ratio. Each copy has 15 beads, so the total is (4 + 11) × 9 = 135.',
  breakthrough:'A ratio is a bundle of parts. Find the scale factor, then apply it to every part.',
  commonTrap:'A common trap is doing a familiar operation before identifying what the question asks.',
  distractorReasons:['270 does not follow the required sequence.','This follows the calculation.','139 does not follow the required sequence.','124 does not follow the required sequence.'],
  templateId:'Ratios-1',subskill:'Ratios-1',generationMethod:'procedural-v1',estimatedTime:100,
};
