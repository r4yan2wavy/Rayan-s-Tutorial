import {validate,type Question} from './assessment';
import {findSubtopic} from './curriculum';
export const QUALITY_VERSION='content-v3.1';
function numericOption(text:string){
 const normalized=text.trim().replaceAll('−','-');
 const fraction=normalized.match(/^([-+]?\d+(?:\.\d+)?)\s*\/\s*([-+]?\d+(?:\.\d+)?)$/);
 if(fraction){const denominator=Number(fraction[2]);return denominator?Number(fraction[1])/denominator:undefined;}
 if(/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized))return Number(normalized);
 return undefined;
}
export function normalizedWording(text:string){const operators:Record<string,string>={'+':'plus','-':'minus','×':'times','*':'times','÷':'divide','/':'divide','(':'openparen',')':'closeparen','^':'power','=':'equals',':':'ratio'};return text.toLowerCase().replace(/\d+(?:\.\d+)?/g,' value ').replace(/[+\-×*÷/()^=:]/g,operator=>' '+operators[operator]+' ').replace(/[^a-z]+/g,' ').trim();}
export function similarity(a:string,b:string){const tokens=(text:string)=>{const words=normalizedWording(text).split(' ').filter(Boolean);return new Set([...words.filter(word=>word.length>2),...words.slice(1).map((word,i)=>words[i]+' '+word)])};const left=tokens(a),right=tokens(b);const shared=[...left].filter(word=>right.has(word)).length;return shared/Math.max(1,new Set([...left,...right]).size);}
export function qualityErrors(q:Question,strict=true){
 const errors=validate(q),topic=findSubtopic(q.subtopic);
 if(!strict)return errors;
 if(q.subject==='Math'&&q.choices){const values=q.choices.map(numericOption);if(values.some((value,index)=>value!==undefined&&values.some((other,j)=>j!==index&&other!==undefined&&Math.abs(value-other)<1e-10)))errors.push('Numerically equivalent choices make the item ambiguous.');}
 if(!topic||topic.subject!==q.subject||topic.skill!==q.skill)errors.push('The planned subtopic and skill must match the item.');
 if(!q.familyId||!q.structureId||!q.scenarioId||!q.reasoningType||!q.estimatedTime||!q.calibration)errors.push('A complete generation plan is required.');
 if(!q.howToThink||q.howToThink.length<25||!q.solutionSteps?.length||q.solutionSteps.some(step=>step.trim().length<12))errors.push('Teach the approach and each reasoning step.');
 if(q.explanation.length<70||q.breakthrough.length<30)errors.push('Reasoning and the reusable lesson need substantive explanation.');
 if(q.choices&&(!q.distractorReasons||q.distractorReasons.length!==4||q.distractorReasons.some(reason=>reason.length<20)))errors.push('Every option must have a specific explanation.');
 if(q.subject==='ELA'&&q.passage&&(!q.evidenceExplanation||q.evidenceExplanation.length<40))errors.push('Explain how the exact textual evidence supports the answer.');
 if(q.subject==='ELA'&&q.passage&&(!q.evidence||!q.passage.content.includes(q.evidence)))errors.push('Reading evidence must quote the supplied passage exactly.');
 if(/does not follow the (?:required )?sequence|the correct answer is [abcd]\.?$|^use the formula\.?$/i.test(q.explanation+' '+(q.distractorReasons||[]).join(' ')))errors.push('Generic answer feedback cannot be approved.');
 if(q.subject==='Math'&&/quadratic|trigonometric|logarithm|calculus|differentiation/i.test(q.text))errors.push('The item exceeds the intended prerequisite curriculum.');
 if(q.table&&(q.table.headers.length<2||!q.table.rows.length||q.table.rows.some(row=>row.length!==q.table!.headers.length)))errors.push('Table dimensions are inconsistent.');
 if(q.diagram?.segments?.some(segment=>!q.diagram!.points?.some(point=>point.label===segment.from)||!q.diagram!.points?.some(point=>point.label===segment.to)))errors.push('Diagram segments need labeled endpoints.');
 return [...new Set(errors)];
}
export function nearDuplicate(q:Question,previous:Question){
 if(q.id===previous.id||q.text.trim()===previous.text.trim()&&(q.passage?.content||'')===(previous.passage?.content||''))return true;
 if(q.passage&&previous.passage&&q.passageId!==previous.passageId&&similarity(q.passage.content,previous.passage.content)>.88)return true;
 if(!q.passage&&!previous.passage&&q.subtopic===previous.subtopic&&similarity(q.text,previous.text)>.94)return true;
 return q.subtopic===previous.subtopic&&q.familyId===previous.familyId&&q.scenarioId===previous.scenarioId&&q.structureId===previous.structureId&&similarity(q.text,previous.text)>.9;
}
