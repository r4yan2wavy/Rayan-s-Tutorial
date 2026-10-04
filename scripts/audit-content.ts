import {existsSync} from 'node:fs';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {validate,type Question} from '../lib/assessment';
import {SUBTOPICS,findSubtopic} from '../lib/curriculum';
import {normalizedWording,similarity} from '../lib/content-quality';
import {mathBatch,mathFeedbackForStoredQuestion} from '../lib/math';
import {editingBatch} from '../lib/editing-data';

export const AUDIT_VERSION='legacy-content-audit-v3.1';
type StoredQuestion=Question&{contentAudit?:Record<string,unknown>};
export type AuditItem={id:string;subject:string;skill:string;difficulty:number;fatal:string[];review:string[];mathKeyCheck:'verified'|'unsupported'|'not-applicable';subtopic?:string};
export type StoredAuditRow={id:string;data:string;status:string;subject:string;skill:string;difficulty:number;linked_passage_id?:string|null;passage_content?:string|null};
export type AuditReport={version:string;created:string;scope:string;total:number;Math:number;ELA:number;reading:number;editing:number;passages:number;clearBroken:number;needsReview:number;mathKeysVerified:number;mathKeysUnsupported:number;duplicateGroups:{kind:string;ids:string[]}[];counts:Record<string,number>;items:AuditItem[];limitation:string};
type PassageRecord={id:string;title:string;content:string;type:string;difficulty:number;questions:Question[]};
const numeric=(text:string)=>[...text.matchAll(/\d+(?:\.\d+)?/g)].map(match=>Number(match[0]));
const requireMatch=(text:string,pattern:RegExp)=>{const result=pattern.exec(text);if(!result)throw Error('Unsupported displayed problem');return result};
const plain=(text:string)=>text.replaceAll('−','-');

// Parse the displayed arithmetic, independently of generator parameters and key.
function arithmetic(source:string,x=0):number{
 const normalized=plain(source).replaceAll('×','*').replaceAll('÷','/').replaceAll('²','^2').replace(/(\d|\))(?=[x(])/g,'$1*');
 const tokens=normalized.match(/\d+(?:\.\d+)?|[x()+\-*/^]/g)||[];
 if(tokens.join('')!==normalized.replace(/\s/g,''))throw Error('Unsupported arithmetic');
 let index=0;
 const primary=():number=>{const token=tokens[index++];if(token==='x')return x;if(token==='('){const value=sum();if(tokens[index++]!==')')throw Error('Missing parenthesis');return value}if(!/^\d/.test(token||''))throw Error('Missing number');return Number(token)};
 const power=():number=>{const value=primary();return tokens[index]==='^'?(index++,value**unary()):value};
 const unary=():number=>{if(tokens[index]==='-'){index++;return-unary()}if(tokens[index]==='+'){index++;return unary()}return power()};
 const product=():number=>{let value=unary();while(['*','/'].includes(tokens[index])){const operation=tokens[index++],next=unary();value=operation==='*'?value*next:value/next}return value};
 const sum=():number=>{let value=product();while(['+','-'].includes(tokens[index])){const operation=tokens[index++],next=product();value=operation==='+'?value+next:value-next}return value};
 const result=sum();if(index!==tokens.length||!Number.isFinite(result))throw Error('Invalid arithmetic');return result;
}
const coordinatePairs=(text:string)=>[...plain(text).matchAll(/\((-?\d+),\s*(-?\d+)\)/g)].map(match=>[Number(match[1]),Number(match[2])] as [number,number]);
function polygonArea(points:[number,number][]){return Math.abs(points.reduce((sum,[x,y],index)=>{const[nextX,nextY]=points[(index+1)%points.length];return sum+x*nextY-y*nextX},0))/2}
function singleInteger(predicate:(value:number)=>boolean,min=-100,max=100){const values=[];for(let value=min;value<=max;value++)if(predicate(value))values.push(value);if(values.length!==1)throw Error('No unique integer solution');return values[0]}
function numericChoice(choice:string|number){const text=plain(String(choice)).trim();if(/^[-+]?\d+(?:\.\d+)?\/-?\d+(?:\.\d+)?$/.test(text)){const[a,b]=text.split('/').map(Number);return a/b}return Number(text)}

/** Known legacy prompts only. Unknown forms require review, never a guessed key. */
export function legacyMathAnswer(q:Question):number|undefined{
 if(q.subject!=='Math'||!['procedural-v1','procedural-v2'].includes(q.generationMethod||''))return undefined;
 try{
  const text=q.text,n=numeric(text);
  switch(q.skill){
   case 'Ratios':if(text.startsWith('A club'))return singleInteger(count=>count*n[1]===n[2]*n[0],0,10000);if(text.includes('beads'))return n[2]+singleInteger(count=>count*n[0]===n[2]*n[1],0,10000);if(text.startsWith('A shipment')&&n[2]*n[1]===n[3]*(n[0]+n[1]))return n[2]-n[3];return undefined;
   case 'Proportions':if(text.includes('notebooks'))return n[1]/n[0]*n[2];if(text.includes('scale drawing'))return n[2]/n[0]*n[1];if(text.includes('pumps drain'))return n[0]*n[1]/n[2];return undefined;
   case 'Number systems':return arithmetic(requireMatch(text,text.includes('value of')?/value of (.+?)\?/:/Evaluate (.+?)\.(?:\s|$)/)[1]);
   case 'Arithmetic':return arithmetic(requireMatch(text,/Evaluate (.+?)\.(?:\s|$)/)[1]);
   case 'Expressions':{const value=Number(requireMatch(text,/x = (\d+)/)[1]);return arithmetic(requireMatch(text,text.includes('value of')?/value of (.+?)\?/:/evaluate (.+?)\.(?:\s|$)/i)[1],value)}
   case 'Equations':{const[left,right]=requireMatch(text,/Solve for x: (.+?)\.(?:\s|$)/)[1].split('=');return singleInteger(value=>Math.abs(arithmetic(left,value)-arithmetic(right,value))<1e-9)}
   case 'Inequalities':{const[left,right]=requireMatch(text,/satisf(?:ies|ying) (.+?)\?/)[1].split('>'),values=[];for(let value=-100;value<=100;value++)if(arithmetic(left,value)>arithmetic(right,value))values.push(value);const answer=text.includes('smallest')?values[0]:values.at(-1);if(answer===undefined||answer===-100||answer===100)return undefined;return answer}
   case 'Fractions':if(text.startsWith('What is'))return arithmetic(requireMatch(text,/What is (.+?)\?/)[1]);if(text.includes('ribbon')){const ratio=requireMatch(text,/ribbon is (\d+)\/(\d+)/),count=Number(requireMatch(text,/of (\d+) such ribbons/)[1]);return Number(ratio[1])/Number(ratio[2])*count}if(text.startsWith('A tank holds')){const capacity=Number(requireMatch(text,/holds (\d+) liters/)[1]),fractions=[...text.matchAll(/1\/(\d+)/g)].map(match=>Number(match[1]));if(fractions.length!==2)return undefined;return(capacity-capacity/fractions[0])/fractions[1]}return undefined;
   case 'Decimals':return text.startsWith('Evaluate')?arithmetic(requireMatch(text,/Evaluate (.+?)\.(?:\s|$)/)[1]):text.startsWith('A shop buys')?n[0]*n[1]+n[2]:undefined;
   case 'Percentages':{const discounted=n[0]*(1-n[1]/100);return text.includes('tax')?discounted*(1+n[2]/100):text.includes('discounted')?discounted:undefined}
   case 'Rates':if(text.includes('returns the same distance'))return 2*n[0]/(n[0]/n[1]+n[0]/n[2]);if(text.startsWith('A pump fills'))return n[1]/n[0];if(text.startsWith('A cyclist travels'))return n[0]/n[1]*n[2];return undefined;
   case 'Geometry':if(text.includes('rectangular box'))return n[0]*n[1]*n[2];if(text.includes('right triangle')||text.includes('rectangular pond'))return n[0]*n[1]-(text.includes('right triangle')?polygonArea([[0,0],[n[2],0],[0,n[3]]]):n[2]*n[3]);return undefined;
   case 'Coordinate geometry':{const points=coordinatePairs(text);if(text.includes('triangle')&&points.length===3)return polygonArea(points);if(points.length!==2)return undefined;return text.includes('slope')?(points[1][1]-points[0][1])/(points[1][0]-points[0][0]):Math.hypot(points[1][0]-points[0][0],points[1][1]-points[0][1])}
   case 'Statistics':if(text.startsWith('Four numbers')){const mean=Number(requireMatch(text,/have mean (\d+)/)[1]),known=numeric(requireMatch(text,/numbers are ([^.]+)\./)[1]);return mean*4-known.reduce((sum,value)=>sum+value,0)}if(text.includes('median'))return n.slice(0,5).sort((a,b)=>a-b)[2];if(text.startsWith('Find the mean'))return n.slice(0,3).reduce((sum,value)=>sum+value,0)/3;return undefined;
   case 'Probability':if(!text.startsWith('A bag')||!/green and \d+ yellow/.test(text)||!/probability (?:of green|both are green)/.test(text))return undefined;return text.includes('without replacement')?n[0]*(n[0]-1)/((n[0]+n[1])*(n[0]+n[1]-1)):n[0]/(n[0]+n[1]);
   case 'Data interpretation':if(text.includes('library recorded'))return n[1]-n[0];if(text.startsWith('A survey'))return(n[0]+(text.includes('change from B to A')?n[2]:0))/(n[0]+n[1])*100;return undefined;
   case 'Multi-step reasoning':if(text.startsWith('A school buys'))return n[0]*n[1]-n[2];if(text.startsWith('A show sells'))return singleInteger(adults=>adults*n[1]+(n[0]-adults)*n[2]===n[3],0,n[0]);return undefined;
   default:return undefined;
  }
 }catch{return undefined}
}

/** Use only a recognizable target, rather than labeling a broad legacy item by guess. */
export function knownLegacySubtopic(q:Question){
 const existing=findSubtopic(q.subtopic);if(existing&&existing.skill===q.skill&&existing.subject===q.subject)return existing.id;
 const exact=SUBTOPICS.find(topic=>topic.subject===q.subject&&topic.skill===q.skill&&topic.label.toLowerCase()===(q.subskill||'').toLowerCase());if(exact)return exact.id;
 let label:string|undefined;const text=q.text.toLowerCase(),description=(q.text+' '+q.explanation+' '+(q.subskill||'')).toLowerCase();
 if(q.subject==='Math')switch(q.skill){
  case 'Ratios':if(/ratio|for every/.test(text))label='Ratios';break;
  case 'Proportions':label=/scale drawing/.test(text)?undefined:/pumps/.test(text)?'Multi-step proportional reasoning':/at that rate/.test(text)?'Proportional relationships':undefined;break;
  case 'Arithmetic':if(/evaluate/.test(text))label='Order of operations';break;
  case 'Number systems':if(/−|-|negative/.test(text))label='Rational numbers';break;
  case 'Expressions':if(/evaluate|value of/.test(text))label='Evaluating expressions';break;
  case 'Equations':if(/solve for x/.test(text))label=text.includes('(')?'Equations containing parentheses':/x[^=]*=[^=]*x/.test(text)?undefined:'Two-step equations';break;
  case 'Inequalities':if(/integer x/.test(text))label='Solving inequalities';break;
  case 'Fractions':label=/such ribbons/.test(text)?'Fraction multiplication':/what is.+\+/.test(text)?'Fraction addition':/what remains/.test(text)?'Fractions':undefined;break;
  case 'Decimals':if(/evaluate|total cost/.test(text))label='Decimal operations';break;
  case 'Percentages':label=/discount.*tax/.test(text)?'Multi-step percent situations':/discount/.test(text)?'Discounts':undefined;break;
  case 'Rates':if(/cyclist|pump/.test(text))label='Unit rates';break;
  case 'Geometry':label=/volume/.test(text)?'Volume':/removed|excluding/.test(text)?'Composite figures':undefined;break;
  case 'Coordinate geometry':if(/vertices|point p|line passes/.test(text))label='Coordinate-plane geometry';break;
  case 'Statistics':label=/mean/.test(text)?'Mean':/median/.test(text)?'Median':undefined;break;
  case 'Probability':label=/without replacement/.test(text)?'Compound events':/at random/.test(text)?'Simple probability':undefined;break;
  case 'Multi-step reasoning':if(/pencils|tickets/.test(text))label='Multi-step mathematical reasoning';break;
 }
 else if(q.passage){
  switch(q.skill){
   case 'Main idea':if(/main|central|overall|best express|what.*(?:lesson|must|suggest|illustrate|reveals)/.test(text))label='Main idea';break;
   case 'Inference':label='Inference';break;
   case 'Vocabulary':label='Vocabulary in context';break;
   case 'Supporting evidence':label='Textual evidence';break;
   case 'Tone':label='Tone';break;
   case 'Structure':label=/paragraph/.test(text)?'Paragraph function':/sentence/.test(text)?'Sentence function':'Text structure';break;
   case 'Author purpose':if(/author|writer|purpose|include|mention|describe|discuss|example/.test(text))label="Author's purpose";break;
   case 'Comparison':if(/passages|texts|authors|compare/.test(text))label='Comparing texts';break;
   case 'Argument':if(/claim|argument/.test(text))label='Claims';break;
   case 'Literary analysis':label=/simile|like a|as though|comparison/.test(text)?'Simile':/motivat|why/.test(text)?'Character motivation':/character|trait|reveal/.test(text)?'Character traits':undefined;break;
  }
 }else{
  if(q.skill==='Grammar'&&/subject.*verb|subject.{0,60}singular|verb.*agrees|agreement/.test(description))label='Subject-verb agreement';
  if(q.skill==='Sentence structure')label=/fragment/.test(description)?'Fragments':/comma splice/.test(description)?'Comma splices':/modifier/.test(description)?'Modifiers':/run.on/.test(description)?'Run-ons':/combine/.test(description)?'Sentence combining':undefined;
  if(q.skill==='Organization')label=/transition/.test(description)?'Transitions':/reorder|order|sequence/.test(text)?'Reordering':/where|placement/.test(text)?'Sentence placement':undefined;
  if(q.skill==='Revision')label=/redundan|concise|wordy|concision/.test(description)?'Concision':/precision|precise/.test(description)?'Precision':/evidence|supported/.test(description)?'Evidence':/clarity|clear/.test(description)?'Clarity':undefined;
 }
 const kind=q.subject==='Math'?'math':q.passage?'reading':'editing';return SUBTOPICS.find(topic=>topic.kind===kind&&topic.skill===q.skill&&topic.label===label)?.id;
}

const genericFeedback=(text:string)=>/^supported by (?:the )?passage\.?$|^this follows the calculation\.?$|does not follow the (?:required )?sequence|does not fit the relationship or meaning established in context|does not account for the passage.s specific wording and context|^this answer is incorrect\.?$|^use the formula\.?$/i.test(text.trim());
export function auditQuestions(questions:Question[],scope='supplied content'):AuditReport{
 const items:AuditItem[]=questions.map(q=>{
  const fatal=validate(q),review:string[]=[];let mathKeyCheck:AuditItem['mathKeyCheck']=q.subject==='Math'?'unsupported':'not-applicable';
  const expected=legacyMathAnswer(q);
  if(expected!==undefined&&Number.isFinite(expected)){
   const answer=numericChoice(q.type==='grid'?q.correct:q.choices?.[Number(q.correct)]||'NaN');
   if(!Number.isFinite(answer)||Math.abs(expected-answer)>.000051)fatal.push('The stored Math key disagrees with the independently solved displayed problem.');
   else mathKeyCheck='verified';
   if(q.type!=='grid'&&q.choices?.filter(choice=>Math.abs(numericChoice(choice)-expected)<=.000051).length!==1)fatal.push('The displayed Math choices do not contain exactly one correct numeric answer.');
  }else if(q.subject==='Math')review.push('Math prompt needs an independent semantic/key review; this audit has no supported solver for this form.');
  if(q.distractorReasons?.some(genericFeedback)||genericFeedback(q.explanation))review.push('Generic option feedback needs an authored explanation for the actual choice.');
  if(q.choices&&(!q.distractorReasons||q.distractorReasons.length!==4))review.push('Every answer choice needs a tutor explanation.');
  if(q.table&&(!Array.isArray(q.table.headers)||q.table.headers.length<2||!Array.isArray(q.table.rows)||!q.table.rows.length||q.table.rows.some(row=>!Array.isArray(row)||row.length!==q.table!.headers.length)))fatal.push('The displayed table has incomplete or inconsistent cells.');
  if(q.diagram?.segments?.some(segment=>!q.diagram!.points?.some(point=>point.label===segment.from)||!q.diagram!.points?.some(point=>point.label===segment.to)))fatal.push('The displayed diagram includes a segment without its labeled endpoint.');
  if(!q.howToThink||!q.solutionSteps?.length)review.push('Tutor approach and explicit reasoning steps need review.');
  if(q.passage){
   if(!q.evidence||!q.passage.content.includes(q.evidence))fatal.push('Quoted evidence is absent from the supplied passage.');
   else if(q.evidence.trim().split(/\s+/).length<4)review.push('A very short evidence fragment needs contextual review; exact occurrence does not prove relevance.');
   if(q.explanation.length<70||!q.evidenceExplanation)review.push('Evidence-to-answer reasoning needs a substantive semantic review.');
   if(q.skill==='Author purpose'&&!/author|writer|purpose|include|mention|describe|discuss|example/i.test(q.text))review.push('The Author purpose label may describe a content/character question; review the actual target.');
   if(q.skill==='Comparison'&&!/texts|passages|authors|perspectives|compare|comparison|contrast/i.test(q.text))review.push('The Comparison label needs target review; a single text can compare ideas but is not automatically a paired-text task.');
  }
  if(q.subject==='Math'&&(q.skill==='Coordinate geometry'&&/slope/.test(q.text)||q.skill==='Equations'&&/x[^=]*=[^=]*x/.test(q.text)))review.push('Review prerequisite alignment against public SHSAT samples and Grade 7 standards.');
  if(!q.calibration)review.push('Legacy difficulty is an editorial label, not an empirically calibrated ability measure.');
  const subtopic=knownLegacySubtopic(q);if(!subtopic)review.push('The exact individual subtopic needs review; no unsupported target will be assigned.');
  return{id:q.id,subject:q.subject,skill:q.skill,difficulty:q.difficulty,fatal:[...new Set(fatal)],review:[...new Set(review)],mathKeyCheck,subtopic};
 });
 const byId=new Map(items.map(item=>[item.id,item])),duplicateGroups:AuditReport['duplicateGroups']=[],group=(kind:string,key:(q:Question)=>string)=>{const groups=new Map<string,string[]>();for(const q of questions){const value=key(q);if(!value)continue;groups.set(value,[...(groups.get(value)||[]),q.id])}for(const ids of groups.values())if(ids.length>1){duplicateGroups.push({kind,ids});for(const id of ids)byId.get(id)!.review.push(kind==='exact-question'?'Exact duplicate question wording/options need inventory review.':'A repeated reasoning structure needs genuine family variation rather than new numbers or names.')}};
 group('exact-question',q=>JSON.stringify([q.text.trim(),q.choices,q.passage?.content]));
 group('numeric-structure',q=>q.subject==='Math'?q.skill+'|'+normalizedWording(q.text):'');
 group('editing-family',q=>q.subject==='ELA'&&!q.passage&&q.generationMethod==='offline-authored-editing-v2'?q.skill+'|'+q.subskill:'');
 const passages=[...new Map(questions.filter(q=>q.passageId&&q.passage).map(q=>[q.passageId!,q.passage!.content])).entries()];
 for(let i=0;i<passages.length;i++)for(let j=i+1;j<passages.length;j++)if(similarity(passages[i][1],passages[j][1])>.88){const ids=questions.filter(q=>q.passageId===passages[i][0]||q.passageId===passages[j][0]).map(q=>q.id);duplicateGroups.push({kind:'near-duplicate-passages',ids});for(const id of ids)byId.get(id)!.review.push('Passage language strongly overlaps another passage; review originality and substantive variation.');}
 const counts:Record<string,number>={};for(const item of items){item.review=[...new Set(item.review)];for(const issue of [...item.fatal,...item.review])counts[issue]=(counts[issue]||0)+1}
 return{version:AUDIT_VERSION,created:new Date().toISOString(),scope,total:questions.length,Math:questions.filter(q=>q.subject==='Math').length,ELA:questions.filter(q=>q.subject==='ELA').length,reading:questions.filter(q=>q.subject==='ELA'&&q.passage).length,editing:questions.filter(q=>q.subject==='ELA'&&!q.passage).length,passages:passages.length,clearBroken:items.filter(item=>item.fatal.length).length,needsReview:items.filter(item=>item.review.length).length,mathKeysVerified:items.filter(item=>item.mathKeyCheck==='verified').length,mathKeysUnsupported:items.filter(item=>item.mathKeyCheck==='unsupported').length,duplicateGroups,counts,items,limitation:'Structural checks and recognized Math prompt solvers do not establish every ELA interpretation, distractor, difficulty label, or skill label. Review flags remain pending; this audit does not automatically approve content or change grading history.'};
}

async function seedQuestions(){const passages=JSON.parse(await readFile(new URL('../lib/seed-data.json',import.meta.url),'utf8')) as PassageRecord[];return [...passages.flatMap(p=>p.questions.map(q=>({...q,subject:'ELA',difficulty:p.difficulty,passageId:p.id,passage:{title:p.title,content:p.content,type:p.type},type:'mc',generationMethod:'AI-assisted-offline-v1'}))),...mathBatch(1700,undefined,undefined,10000),...editingBatch()]}
export async function auditSeedContent(){return auditQuestions(await seedQuestions(),'All original 250 passages/1,000 reading items, 1,700 Math items, and 200 editing items')}
export function auditStoredRows(rows:StoredAuditRow[]){
 const malformed=new Set<number>(),questions=rows.map((row,index)=>{try{
  const value=JSON.parse(row.data) as Record<string,unknown>;
  if(!value||typeof value!=='object'||Array.isArray(value)||['id','subject','skill','text','explanation','breakthrough','commonTrap'].some(field=>typeof value[field]!=='string')||typeof value.difficulty!=='number'||!['string','number'].includes(typeof value.correct))throw Error('Question JSON has missing required fields');
  for(const field of ['choices','distractorReasons','solutionSteps'])if(value[field]!==undefined&&(!Array.isArray(value[field])||value[field].some(entry=>typeof entry!=='string')))throw Error('Invalid string array');
  if(value.passage){const passage=value.passage as Record<string,unknown>;if(typeof passage!=='object'||['title','content','type'].some(field=>typeof passage[field]!=='string'))throw Error('Invalid passage')}
  return value as StoredQuestion;
 }catch{malformed.add(index);return{id:row.id,subject:row.subject,skill:row.skill,difficulty:row.difficulty,text:'',correct:0,explanation:'',breakthrough:'',commonTrap:''} as StoredQuestion}});
 const report=auditQuestions(questions,'Every existing stored question and embedded passage');
 for(let index=0;index<rows.length;index++){
  const q=questions[index],row=rows[index],item=report.items[index];item.id=row.id;
  if(malformed.has(index))item.fatal.push('Stored question JSON is invalid or lacks required fields; preserve the source for repair.');
  else{
   if(q.id!==row.id||q.subject!==row.subject||q.skill!==row.skill||q.difficulty!==row.difficulty)item.fatal.push('Stored question identity/labels disagree with its database row.');
   if(row.linked_passage_id&&(!q.passage||q.passageId!==row.linked_passage_id))item.fatal.push('The linked reading passage is missing or mismatched in the question payload.');
   if(q.passage&&row.passage_content&&q.passage.content!==row.passage_content)item.fatal.push('Embedded passage disagrees with its linked stored passage.');
  }
 }
 report.counts={};for(const item of report.items){item.fatal=[...new Set(item.fatal)];for(const issue of [...item.fatal,...item.review])report.counts[issue]=(report.counts[issue]||0)+1}
 report.clearBroken=report.items.filter(item=>item.fatal.length).length;
 return{report,questions,malformed};
}
async function main(){
 const outputFlag=process.argv.indexOf('--output'),output=outputFlag>=0?resolve(process.argv[outputFlag+1]||'content-audit.json'):undefined;
 if(process.argv.includes('--seed-only')){const report=await auditSeedContent();if(output)await writeFile(output,JSON.stringify(report,null,2));console.log(JSON.stringify({...report,items:undefined,duplicateGroups:report.duplicateGroups.length}));return}
 if(existsSync('.env.local'))process.loadEnvFile('.env.local');
 const {database,withDatabaseSetup,closeDatabase}=await import('../db/index');
 const {legacyContentFeedback}=await import('../lib/content-system');
 try{
  await withDatabaseSetup(async()=>{
   const db=database(),rows:StoredAuditRow[]=[];let after='';
   while(true){const page=await db.prepare('SELECT q.id,q.data,q.status,q.subject,q.skill,q.difficulty,p.id AS linked_passage_id,p.content AS passage_content FROM questions q LEFT JOIN passages p ON p.id=q.passage_id WHERE q.id>? ORDER BY q.id LIMIT 500').bind(after).all();if(!page.results.length)break;rows.push(...page.results as StoredAuditRow[]);after=String(page.results.at(-1)!.id)}
   const {questions,report,malformed}=auditStoredRows(rows);
   if(process.argv.includes('--apply')){
    for(let start=0;start<rows.length;start+=80){const statements=[];for(let index=start;index<Math.min(start+80,rows.length);index++){
     if(malformed.has(index)){statements.push(db.prepare("UPDATE questions SET status='rejected' WHERE id=?").bind(rows[index].id));continue}
     const original=questions[index],item=report.items[index],enhanced=legacyContentFeedback(mathFeedbackForStoredQuestion(original)) as StoredQuestion;
     // The audit must never alter a previously shown stem, key, option order or passage.
     const preserved={id:original.id,text:original.text,choices:original.choices,correct:original.correct,type:original.type,passage:original.passage,passageId:original.passageId};
     const reasons=enhanced.distractorReasons?.map((reason,choice)=>choice===original.correct&&genericFeedback(reason)?enhanced.explanation:reason);
     const updated={...enhanced,...preserved,subtopic:item.subtopic,distractorReasons:reasons,contentAudit:{version:AUDIT_VERSION,reviewStatus:item.fatal.length?'quarantined-broken':item.review.length?'pending-semantic-review':'automated-structural-only',reviewScope:'Structural validation and recognized Math prompt solver; no automatic human/psychometric approval.',mathKeyCheck:item.mathKeyCheck,issues:[...item.fatal,...item.review]}};
     statements.push(db.prepare('UPDATE questions SET data=?,status=? WHERE id=?').bind(JSON.stringify(updated),item.fatal.length?'rejected':rows[index].status,rows[index].id));
    }await db.batch(statements)}
    await db.prepare('INSERT INTO content_audits(id,created,data) VALUES(?,?,?::jsonb)').bind(crypto.randomUUID(),Date.now(),JSON.stringify({...report,items:undefined,duplicateGroups:report.duplicateGroups.map(group=>({kind:group.kind,count:group.ids.length})),applied:true})).run();
   }
   if(output)await writeFile(output,JSON.stringify({...report,applied:process.argv.includes('--apply')},null,2));
   console.log(JSON.stringify({...report,items:undefined,duplicateGroups:report.duplicateGroups.length,applied:process.argv.includes('--apply')}));
  });
 }finally{await closeDatabase()}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(()=>{console.error('Content audit failed. No credentials or student data were printed.');process.exitCode=1});
