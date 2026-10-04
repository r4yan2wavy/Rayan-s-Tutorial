import test from 'node:test';
import assert from 'node:assert/strict';
import {SUBTOPICS} from '../lib/curriculum';
import {generateMathV3,mathFamilies} from '../lib/math-v3';
import {qualityErrors} from '../lib/content-quality';
import {matches,publicQuestion,type Question} from '../lib/assessment';

const topics=SUBTOPICS.filter(topic=>topic.kind==='math');
function numeric(value:string|number){const pieces=String(value).split('/');return pieces.length===2?Number(pieces[0])/Number(pieces[1]):Number(value)}
function key(q:Question){return q.type==='grid'?Number(q.correct):numeric(q.choices![Number(q.correct)])}
function equalNumeric(q:Question,expected:number){
  assert.ok(Number.isFinite(expected),`Oracle could not solve ${q.familyId}: ${q.text}`);
  assert.ok(Math.abs(key(q)-expected)<1e-8*Math.max(1,Math.abs(expected)),`${q.familyId}: expected ${expected}, received ${key(q)}. ${q.text}`);
  if(q.choices)assert.equal(q.choices.filter(choice=>Math.abs(numeric(choice)-expected)<1e-8*Math.max(1,Math.abs(expected))).length,1,`${q.familyId}: multiple equivalent correct choices`);
  else{assert.equal(matches(q,String(expected)),true);assert.equal(matches(q,expected.toFixed(4)),true)}
}

// This expression parser is independent of the generator. It evaluates the
// displayed expression, including grouping, rather than trusting solution text.
function calculate(expression:string,x?:number):number{
  const input=expression.replace(/[−–]/g,'-').replace(/×/g,'*').replace(/÷/g,'/').replace(/²/g,'^2').replace(/\b[xt]\b/g,()=>`(${x})`).replace(/([0-9])([xt])/g,(_,n)=>`${n}*(${x})`);
  assert.ok(!/[^0-9.+\-*/^()\s]/.test(input),`Unexpected expression: ${expression}`);
  const tokens=input.match(/\d*\.\d+|\d+|[()+\-*/^]/g)||[];let index=0;
  function atom():number{if(tokens[index]==='-'){index++;return-atom()}if(tokens[index]==='+'){index++;return atom()}if(tokens[index]==='('){index++;const value=sum();assert.equal(tokens[index++],')');return value}return Number(tokens[index++])}
  function power():number{const left=atom();if(tokens[index]==='^'){index++;return left**power()}return left}
  function product():number{let value=power();while(tokens[index]==='*'||tokens[index]==='/'||tokens[index]==='('){const op=tokens[index];if(op==='('){value*=power();continue}index++;const right=power();value=op==='*'?value*right:value/right}return value}
  function sum():number{let value=product();while(tokens[index]==='+'||tokens[index]==='-'){const op=tokens[index++],right=product();value=op==='+'?value+right:value-right}return value}
  const value=sum();assert.equal(index,tokens.length,expression);return value;
}
function displayedExpression(q:Question){return q.text.replace(/ Give an exact fraction.+$/,'').match(/^Evaluate (.*)\.$/)?.[1]}
function dataValues(q:Question){const match=q.text.match(/(?:data |median of |mode of |range of )([\d, .-]+)\?/);assert.ok(match,q.text);return match[1].match(/-?\d+(?:\.\d+)?/g)!.map(Number)}
function numberTokens(q:Question){return(q.text.replace(/−/g,'-').match(/-?\d+(?:\.\d+)?/g)||[]).map(Number)}
function independentAnswer(q:Question):number|undefined{
  const f=q.familyId!.split(':')[1],n=numberTokens(q),rows=q.table?.rows;
  if(f.startsWith('signed-compute-')||f.startsWith('fraction-compute-')||f==='decimal-operation'||f==='nested-order-of-operations'||f==='mixed-rational-operations'||f==='three-signed-factors')return calculate(displayedExpression(q)!);
  if(f.startsWith('missing-fraction-')){const match=q.text.match(/satisfies (.+?) ([+×÷-]) \? = (.+?)\. What/)!;const left=calculate(match[1]),result=calculate(match[3]);return match[2]==='+'?result-left:match[2]==='-'?left-result:match[2]==='×'?result/left:left/result}
  if(['one-step-equation','two-step-equation','grouped-equation','rational-equation','rational-grouped-equation'].includes(f)){
    const equation=q.text.replace(/^Solve (?:for x: )?/,'').split('.')[0],parts=equation.split('=');const offset=calculate(parts[0],0),slope=calculate(parts[0],1)-offset;return(calculate(parts[1])-offset)/slope;
  }
  switch(f){
    case'part-comparison':return n[0]*n[2]/n[1];
    case'whole-to-part':return n[2]*n[1]/(n[0]+n[1]);
    case'changed-composition':return n[2]/n[0]*(n[0]+n[1])-n[3];
    case'ratio-table':return Number(rows![2][0])*Number(rows![0][1])/Number(rows![0][0]);
    case'ratio-part-as-fraction':return n[0]/(n[0]+n[1]);
    case'unit-quotient':return n[1]/n[0];
    case'fractional-rate':return(n[0]/n[1])/(n[2]/n[3]);
    case'fractional-rate-time':return(n[2]/n[3])/(n[0]/n[1]);
    case'rate-amount':return n[0]/n[1]*(q.text.includes('have already been covered')?n[3]:n[2])+(q.text.includes('have already been covered')?n[2]:0);
    case'rate-time':return(n[1]-n[2])/n[0];
    case'convert-rate-units':return n[0]*n[1]*60;
    case'constant-from-table':return Number(rows![1][1])/Number(rows![1][0]);
    case'proportional-graph':return n[3]/n[2]*n[4];
    case'constant-work':return n[0]*n[1]/n[2];
    case'percent-part':return n[0]*n[1]/100;
    case'percent-complement-part':return(100-n[0])*n[1]/100;
    case'percent-whole':return n[0]*100/n[1];
    case'find-percent':return n[0]/n[1]*100;
    case'percent-increase':return(n[1]-n[0])/n[0]*100;
    case'percent-decrease':return(n[0]-n[1])/n[0]*100;
    case'growth-table-percent':return Math.abs(Number(rows![1][1])-Number(rows![0][1]))/Number(rows![0][1])*100;
    case'recover-original-after-change':return n[1]/(1+(q.text.includes('raised')?1:-1)*n[0]/100);
    case'recover-original-price':return n[1]/(1-n[0]/100);
    case'successive-percent-changes':return n[0]*(1-n[1]/100)*(1+n[2]/100);
    case'interest-over-time':return n[0]*n[1]*n[2]/100;
    case'recover-interest-principal':return n[0]/(n[1]*n[2]/100);
    case'relative-error':return Math.abs(n[1]-n[0])/n[0]*100;
    case'recover-accepted-measurement':return n[0]/(1+n[1]/100);
    case'whole-from-percent-loss':return n[0]/(n[1]/100);
    case'number-line-location':return n[0]+n[1];
    case'number-line-distance':return Math.abs(n[1]-n[0]);
    case'additive-inverse':return-n[0];
    case'absolute-value':return Math.abs(n[0]);
    case'opposite-to-balance':return-n[0];
    case'fraction-to-decimal':return n[0]/n[1];
    case'fraction-decimal-on-scale':return n[3]/n[2];
    case'next-multiple':return n[1]+n[0];
    case'multiple-between-bounds':return(Math.floor(n[1]/n[0])+1)*n[0];
    case'greatest-common-factor':return gcf(n[0],n[1]);
    case'largest-square-tiles':return gcf(n[0],n[1]);
    case'maximum-identical-kits':return gcf(n[0],n[1]);
    case'least-common-multiple':return n[0]*n[1]/gcf(n[0],n[1]);
    case'common-denominator-choice':return n[0]*n[1]/gcf(n[0],n[1]);
    case'shared-schedule-count':return n.at(-1)!/(n[0]*n[1]/gcf(n[0],n[1]));
    case'equivalent-fraction':return n[0]*n[2]/n[1];
    case'mixed-to-improper':return n[0]*n[2]+n[1];
    case'missing-reciprocal-factor':return n[1]/n[0];
    case'decimal-money-change':return n[2]-n[0]*n[1];
    case'decimal-unit-conversion':return n[0]/n[1];
    case'contextual-expression-value':return n[0]*n[2]+n[1];
    case'complete-factored-form':return n[1]/n[2];
    case'unknown-from-total':return n[0]-n[1]-n[2];
    case'word-equation':return(n[2]-n[0])/n[1];
    case'integer-solution-boundary':return Math.floor((n[2]-n[0])/n[1]);
    case'minimum-whole-count':return Math.ceil((n[2]-n[0])/n[1]);
    case'rational-price-budget':return Math.floor((n[3]-n[0])/(n[1]/n[2])+1e-10);
    case'protractor-difference':return n[1]-n[0];
    case'full-turn-remainder':return 360-n[0]-n[1]-n[2];
    case'fractional-turn-angle':return 360*n[0]/n[1];
    case'adjacent-partition':return n[0]-n[1];
    case'adjacent-ratio-partition':return n[0]*n[1]/(n[1]+n[2]);
    case'perpendicular-right-angle':return 90-n[0];
    case'vertical-equality':return n.length>1?(n[0]-n[2])/n[1]:n[0];
    case'vertical-pairs-around-point':return 180-n[0];
    case'vertical-pair-total':return n[0]/2;
    case'complementary-missing':return 90-n[0];
    case'supplementary-missing':return 180-n[0];
    case'complementary-algebraic':return(90-n[0])/n[1];
    case'supplementary-algebraic':return(180-n[0])/n[1];
    case'complementary-ratio':return 90*n[0]/(n[0]+n[1]);
    case'supplementary-ratio':return 180*n[0]/(n[0]+n[1]);
    case'parallel-transversal':return n[0];
    case'parallel-then-linear-pair':return 180-n[0];
    case'triangle-angle-sum':return(180-n[0]-n[1])/(n[2]||1);
    case'isosceles-angle-reasoning':return(180-n[0])/2;
    case'triangle-area':return n[0]*n[1]/2;
    case'triangle-missing-height':return 2*n[0]/n[1];
    case'triangle-missing-base':return 2*n[0]/n[1];
    case'triangle-area-comparison':return n[0]*(n[2]-n[1])/2;
    case'integer-third-side-count':return 2*Math.min(n[0],n[1])-1;
    case'rectangle-area':return n[0]*n[1];
    case'rectangle-perimeter':return 2*(n[0]+n[1]);
    case'rectangle-missing':return n[0]/n[1];
    case'square-area':return n[0]*n[0];
    case'square-perimeter':return 4*n[0];
    case'square-perimeter-to-area':return(n[0]/4)**2;
    case'parallelogram-area':return n[0]*n[1];
    case'parallelogram-dimension':return n[0]/n[1];
    case'trapezoid-area':return(n[0]+n[1])*n[2]/2;
    case'trapezoid-dimension':return n[0]/((n[1]+n[2])/2);
    case'parallelogram-height-change':return n[0]*(n[2]-n[1]);
    case'trapezoid-height-change':return(n[0]+n[1])*(n[3]-n[2])/2;
    case'polygon-missing-side':return n[0]-n[1]-n[2]-n[3];
    case'rectangle-with-cutout':return n[0]*n[1]-n[2]*n[3];
    case'adjacent-rectangles-boundary':return 2*(n[0]+n[1]+n[2]);
    case'circle-radius':return n[0]/2;
    case'circle-diameter':return n[0]*2;
    case'circle-radius-reverse':return n[0]/(2*n[1]);
    case'circle-diameter-reverse':return n[0]/n[1];
    case'circle-circumference':return 2*n[0]*n[1];
    case'circle-circumference-reverse':return n[0]*n[1];
    case'circle-area':return n[1]*n[0]**2;
    case'circle-area-reverse':return n[1]*(n[0]/2)**2;
    case'circle-border-and-cost':return 2*n[2]*n[0]*n[1];
    case'radius-from-area':return Math.sqrt(n[0]/n[1]);
    case'diameter-from-area':return 2*Math.sqrt(n[0]/n[1]);
    case'two-circle-area-difference':return n[2]*(n[1]**2-n[0]**2);
    case'cube-volume':return n[0]**3;
    case'cube-surface-area':return 6*n[0]**2;
    case'rectangular-prism-volume':return n[0]*n[1]*n[2];
    case'rectangular-prism-surface-area':return 2*(n[0]*n[1]+n[0]*n[2]+n[1]*n[2]);
    case'rectangular-prism-height':return n[0]/(n[1]*n[2]);
    case'open-box-surface-area':return n[0]*n[1]+2*n[0]*n[2]+2*n[1]*n[2];
    case'triangular-prism-volume':return n[0]*n[1]/2*n[2];
    case'scale-factor':return n[1]/n[0];
    case'scale-actual':return n[2]/n[0]*n[1];
    case'scale-drawing':return n[2]/n[1]*n[0];
    case'scale-area':return n[0]**2*n[1]**2;
    case'actual-two-part-length':return n[1]*(n[2]+n[3]);
    case'drawing-two-part-length':return(n[2]+n[3])/n[1];
    case'coordinate-distance':return Math.abs(n[2]-n[0])+Math.abs(n[3]-n[1]);
    case'coordinate-rectangle-area':return Math.abs(n[2]-n[0])*Math.abs(n[5]-n[1]);
    case'sample-extrapolation':return n[1]/n[0]*n[2];
    case'mean-from-data':{const values=dataValues(q);return values.reduce((a,b)=>a+b,0)/values.length}
    case'median-from-ordered-data':{const values=dataValues(q).sort((a,b)=>a-b),mid=Math.floor(values.length/2);return values.length%2?values[mid]:(values[mid]+values[mid-1])/2}
    case'mode-frequency':{const values=dataValues(q),frequencies=new Map<number,number>();for(const value of values)frequencies.set(value,(frequencies.get(value)||0)+1);return[...frequencies].sort((a,b)=>b[1]-a[1])[0][0]}
    case'range-extremes':{const values=dataValues(q);return Math.max(...values)-Math.min(...values)}
    case'missing-value-from-mean':return 4*n[0]-n[1]-n[2]-n[3];
    case'missing-extreme-from-range':return n[0]+n[1];
    case'frequency-table-total':return q.text.includes('mean')?rows!.reduce((sum,row)=>sum+Number(row[0])*Number(row[1]),0)/rows!.reduce((sum,row)=>sum+Number(row[1]),0):rows!.reduce((sum,row)=>sum+Number(row[1]),0);
    case'missing-table-frequency':return n[0]-Number(rows![0][1])-Number(rows![2][1]);
    case'bar-graph-comparison':return Number(rows![1][1])-Number(rows![0][1]);
    case'line-graph-change':return Number(rows![2][1])-Number(rows![0][1]);
    case'dot-plot-count':return n[2]+n[4];
    case'histogram-interval':return Number(rows![1][1])+Number(rows![2][1]);
    case'box-plot-summary':return q.text.includes('interquartile')?n[3]-n[1]:n[4]-n[0];
    case'single-random-draw':return n[0]/(n[0]+n[1]);
    case'complement-event':return(n[0]-n[1])/n[0];
    case'observed-frequency':return n[1]/n[0];
    case'experimental-future-estimate':return n[0]/n[1]*n[2];
    case'list-sample-space':return n[0]*n[2];
    case'independent-compound-event':return n[1]/n[0]*n[3]/n[2];
    case'without-replacement':return n[0]/(n[0]+n[1])*(n[0]-1)/(n[0]+n[1]-1);
    case'two-way-outcome-table':{const cut=n[n.length-1];return rows!.filter(row=>Number(row[2])>=cut).length/rows!.length}
    case'tree-branches':return n[0]*n[1];
    case'alternative-tree-paths':return n[0]+n[1];
    case'unit-price-and-budget':return Math.floor((n[3]-n[2])/(n[1]/n[0]));
    case'two-stage-rate-trip':return(n[0]*n[1]+n[2]*n[3])/(n[0]+n[2]);
    case'area-missing-length-and-border':return 2*(n[0]/n[1]+n[1]);
    case'area-then-percent':return n[0]*n[1]*n[2]/100;
    case'circle-area-percent':return n[2]*n[0]**2*n[1]/100;
    case'percent-area-to-dimension':return n[2]/(n[1]/100)/n[0];
    case'frequency-to-percent':return Number(rows![1][1])/rows!.reduce((sum,row)=>sum+Number(row[1]),0)*100;
    case'ratio-to-percent':return n[0]/(n[0]+n[1])*100;
    case'ratio-then-percent-of-part':return n[2]*n[0]/(n[0]+n[1])*n[3]/100;
    default:{if(f.startsWith('recover-base-'))return n[0]/(1+n[1]/100);if(/(?:final|total|amount)$/.test(f)&&q.text.includes('bill or listed price')||f==='part-in-money'||f==='annual-interest'||f.startsWith('commission-')){const change=n[0]*n[1]/100;return q.text.includes('amount,')?change:q.text.includes('subtracting')?n[0]-change:n[0]+change}return undefined}
  }
}
function gcf(a:number,b:number):number{return b?gcf(b,a%b):a}
function isPrime(n:number){if(n<2||!Number.isInteger(n))return false;for(let factor=2;factor*factor<=n;factor++)if(n%factor===0)return false;return true}

test('all 195 Math targets have at least three declared structures and pass the strict gate at five levels',context=>{
  assert.equal(topics.length,195);let checked=0;
  for(const topic of topics){const families=mathFamilies(topic.id);assert.ok(families.length>=3,topic.label);assert.equal(new Set(families).size,families.length);
    for(const family of families)for(let difficulty=1;difficulty<=5;difficulty++)for(const seed of [0,1,19,37,123,927,2147483647]){
      const q=generateMathV3(topic.id,difficulty,seed,family);assert.deepEqual(qualityErrors(q),[],`${family}: ${q.text}`);assert.equal(q.subtopic,topic.id);assert.equal(q.skill,topic.skill);assert.equal(q.reasoningSteps,q.solutionSteps!.length);checked++;
    }
  }
  assert.ok(checked>20_000);
  context.diagnostic(`${checked} generated cases checked across ${topics.length} targets; these are test cases, not stored inventory counts.`);
});

test('independent prompt and table oracles verify numeric keys and rule out equivalent distractors',context=>{
  const solved=new Set<string>(),errors=new Map<string,string>();let checked=0;
  for(const topic of topics)for(const family of mathFamilies(topic.id))for(let difficulty=1;difficulty<=5;difficulty++)for(const seed of [2,9,53,91,204,702,9999]){
    const q=generateMathV3(topic.id,difficulty,seed,family);try{const expected=independentAnswer(q);if(expected===undefined)continue;equalNumeric(q,expected);solved.add(family.split(':')[1]);checked++}catch(error){if(!errors.has(family))errors.set(family,String(error))}
  }
  assert.deepEqual([...errors],[]);
  assert.ok(solved.size>=120,`Only ${solved.size} structures independently solved.`);assert.ok(checked>=4_000);
  context.diagnostic(`${checked} independent numeric checks covering ${solved.size} authored structures, including all applicable target mappings.`);
});

test('prime identification and factorization have one mathematically defensible choice',()=>{
  for(const seed of Array.from({length:150},(_,index)=>index)){
    const prime=generateMathV3('math-prime-numbers',3,seed,'prime-identification');assert.equal(prime.choices!.filter(choice=>isPrime(Number(choice))).length,1);assert.ok(isPrime(key(prime)));
    const q=generateMathV3('math-prime-factorization',3,seed,'prime-factorization'),target=numberTokens(q)[0];
    const valid=q.choices!.map(choice=>{if(choice.includes('+'))return false;const factors=choice.split('×').map(part=>part.trim());return factors.every(part=>isPrime(Number(part.split('^')[0])))&&factors.reduce((product,part)=>product*calculate(part),1)===target});
    assert.equal(valid.filter(Boolean).length,1);assert.equal(valid[Number(q.correct)],true);
  }
});

test('equivalent expression choices agree for multiple signed inputs and preserve the entire expression',()=>{
  const families=['combine-like-terms','subtract-like-terms','distribute-then-combine','expand-group','factor-common-factor','equivalence-by-structure'];
  for(const family of families){const topic=topics.find(t=>mathFamilies(t.id).some(f=>f.endsWith(':'+family)))!;
    for(let seed=0;seed<100;seed++){const q=generateMathV3(topic.id,4,seed,family),source=q.text.match(/(?:Simplify |Expand |equals |equivalent to )(.+?)(?: for every x|\?|\.)/)![1];const valid=q.choices!.map(choice=>[-7,-1,0,2,11].every(x=>Math.abs(calculate(choice,x)-calculate(source,x))<1e-9));assert.equal(valid.filter(Boolean).length,1,q.text);assert.equal(valid[Number(q.correct)],true)}
  }
});

test('spinner models reject coincidental half-and-half distractors',()=>{
  for(let seed=0;seed<200;seed++){const q=generateMathV3('math-probability-models',3,seed,'model-interpretation'),n=numberTokens(q);assert.notEqual(n[1]/n[0],.5);assert.equal(q.choices![Number(q.correct)],`P(red) = ${n[1]}/${n[0]}`)}
});

test('inverse circle prompts and diagrams show only the known measurement',()=>{
  for(const topic of ['math-radius','math-diameter'])for(let seed=0;seed<100;seed++){
    const q=generateMathV3(topic,4,seed,topic==='math-radius'?'circle-radius-reverse':'circle-diameter-reverse'),known=numberTokens(q)[0];
    assert.ok(q.diagram!.description.includes(String(known)));assert.ok(!/diameter \d+|radius \d+/.test(q.diagram!.description));
    const publicItem=publicQuestion(q) as Record<string,unknown>;assert.ok(!('correct'in publicItem));assert.ok(!('solutionSteps'in publicItem));assert.ok(!('howToThink'in publicItem));
  }
});

test('reference journeys are separate from the distance requested, avoiding an implied extra trip',()=>{
  for(let seed=0;seed<50;seed++)for(const difficulty of [1,4]){const q=generateMathV3('math-unit-rates',difficulty,seed,'rate-amount');assert.match(q.text,/reference journey/i);assert.match(q.text,/separate journey/i);equalNumeric(q,independentAnswer(q)!)}
});

test('unsupported plans fail explicitly instead of relabeling an unrelated item',()=>{
  assert.throws(()=>generateMathV3('math-not-a-real-skill',2,1),/Unsupported Math subtopic/);
  assert.throws(()=>generateMathV3('math-circle-area',2,1,'fraction-compute-addition'),/Unsupported family/);
  for(const difficulty of [0,6,2.5])assert.throws(()=>generateMathV3('math-ratios',difficulty,1),/difficulty/);
  assert.throws(()=>generateMathV3('math-ratios',2,NaN),/seed/);
});
