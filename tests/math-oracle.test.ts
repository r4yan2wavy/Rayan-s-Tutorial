import assert from 'node:assert/strict';
import test from 'node:test';
import {MATH_SKILLS,type Question} from '../lib/assessment';
import {mathQuestion} from '../lib/math';

// Read the actual displayed problem. Expected answers never use generator
// parameters, its random-number sequence, answer key, or explanation.
const seeds=[100,101,105,106,149,997,10000,10051,65537,987654,200000003,1999999999];
const numbers=(text:string)=>[...text.matchAll(/\d+(?:\.\d+)?/g)].map(match=>Number(match[0]));
const normalized=(text:string)=>text.replaceAll('−','-');
function capture(text:string,pattern:RegExp){const match=pattern.exec(text);assert.ok(match,`Unrecognized mathematical prompt: ${text}`);return match}
function arithmetic(source:string,x=0):number{
  const normalizedSource=normalized(source).replaceAll('×','*').replaceAll('÷','/').replaceAll('²','^2').replace(/(\d|\))(?=[x(])/g,'$1*');
  const tokens=normalizedSource.match(/\d+(?:\.\d+)?|[x()+\-*/^]/g)||[];
  assert.equal(tokens.join(''),normalizedSource.replace(/\s/g,''),'Only the supported arithmetic expression may be evaluated.');
  let index=0;
  function primary():number{const token=tokens[index++];if(token==='x')return x;if(token==='('){const result=sum();assert.equal(tokens[index++],')');return result}assert.match(token||'',/^\d/);return Number(token)}
  function power():number{const base=primary();return tokens[index]==='^'?(index++,base**unary()):base}
  function unary():number{if(tokens[index]==='-'){index++;return-unary()}if(tokens[index]==='+'){index++;return unary()}return power()}
  function product():number{let result=unary();while(['*','/'].includes(tokens[index])){const operation=tokens[index++],next=unary();result=operation==='*'?result*next:result/next}return result}
  function sum():number{let result=product();while(['+','-'].includes(tokens[index])){const operation=tokens[index++],next=product();result=operation==='+'?result+next:result-next}return result}
  const result=sum();assert.equal(index,tokens.length);return result;
}
function coordinates(text:string){return[...normalized(text).matchAll(/\((-?\d+),\s*(-?\d+)\)/g)].map(match=>[Number(match[1]),Number(match[2])] as [number,number])}
function polygonArea(points:[number,number][]){let twiceArea=0;for(let index=0;index<points.length;index++){const[x,y]=points[index],[nextX,nextY]=points[(index+1)%points.length];twiceArea+=x*nextY-y*nextX}return Math.abs(twiceArea)/2}
function uniqueInteger(predicate:(value:number)=>boolean,start=-100,end=100){const solutions=[];for(let value=start;value<=end;value++)if(predicate(value))solutions.push(value);assert.equal(solutions.length,1,'The displayed problem must have exactly one integer solution.');return solutions[0]}

function expectedAnswer(q:Question):number{
  const text=q.text,n=numbers(text);
  switch(q.skill){
    case'Ratios':{
      if(text.startsWith('A club'))return uniqueInteger(art=>art*n[1]===n[2]*n[0],0,1000);
      if(text.includes('beads'))return n[2]+uniqueInteger(blue=>blue*n[0]===n[2]*n[1],0,1000);
      assert.equal(n[2]*n[1],n[3]*(n[0]+n[1]),'The given blue count must agree with the stated ratio.');
      return n[2]-n[3];
    }
    case'Proportions':{
      if(text.includes('notebooks'))return n[1]/n[0]*n[2];
      if(text.includes('scale drawing'))return uniqueInteger(length=>length*n[0]===n[2]*n[1],0,1000);
      // At the original arrangement each pump completes this fraction of the
      // tank per minute. Combine the new pump rates and invert that flow.
      const perPumpFlow=1/(n[0]*n[1]);return 1/(n[2]*perPumpFlow);
    }
    case'Number systems':return arithmetic(text.includes('value of')?capture(text,/value of (.+?)\?/)[1]:capture(text,/Evaluate (.+?)\.(?:\s|$)/)[1]);
    case'Expressions':{
      const x=Number(capture(text,/x = (\d+)/)[1]);
      const expression=text.includes('value of')?capture(text,/value of (.+?)\?/)[1]:capture(text,/evaluate (.+?)\.(?:\s|$)/i)[1];return arithmetic(expression,x);
    }
    case'Equations':{
      const[left,right]=capture(text,/Solve for x: (.+?)\.(?:\s|$)/)[1].split('=');
      return uniqueInteger(x=>Math.abs(arithmetic(left,x)-arithmetic(right,x))<1e-10);
    }
    case'Inequalities':{
      const[left,right]=capture(text,/satisf(?:ies|ying) (.+?)\?/)[1].split('>');
      const satisfies=(x:number)=>arithmetic(left,x)>arithmetic(right,x),valid=[];
      for(let x=-100;x<=100;x++)if(satisfies(x))valid.push(x);
      assert.ok(valid.length);const expected=text.includes('smallest')?valid[0]:valid.at(-1)!;
      assert.ok(!satisfies(expected+(text.includes('smallest')?-1:1)),'The adjacent integer must fail the strict inequality.');return expected;
    }
    case'Arithmetic':return arithmetic(capture(text,/Evaluate (.+?)\.(?:\s|$)/)[1]);
    case'Fractions':{
      if(text.startsWith('What is'))return arithmetic(capture(text,/What is (.+?)\?/)[1]);
      if(text.includes('ribbon')){const fraction=capture(text,/ribbon is (\d+)\/(\d+)/),count=Number(capture(text,/of (\d+) such ribbons/)[1]);return Number(fraction[1])/Number(fraction[2])*count}
      const capacity=Number(capture(text,/holds (\d+) liters/)[1]),denominators=[...text.matchAll(/1\/(\d+)/g)].map(match=>Number(match[1]));
      assert.equal(denominators.length,2);const firstWithdrawal=capacity/denominators[0],remaining=capacity-firstWithdrawal;return remaining/denominators[1];
    }
    case'Decimals':return text.startsWith('Evaluate')?arithmetic(capture(text,/Evaluate (.+?)\.(?:\s|$)/)[1]):n[0]*n[1]+n[2];
    case'Percentages':{
      const discount=n[0]*n[1]/100,afterDiscount=n[0]-discount;
      return text.includes('tax')?afterDiscount+afterDiscount*n[2]/100:afterDiscount;
    }
    case'Rates':{
      if(text.includes('returns')){const outboundTime=n[0]/n[1],returnTime=n[0]/n[2];return(n[0]+n[0])/(outboundTime+returnTime)}
      if(text.startsWith('A pump'))return n[1]/n[0];
      return n[0]/n[1]*n[2];
    }
    case'Geometry':{
      if(text.includes('box'))return n[0]*n[1]*n[2];
      const whole=n[0]*n[1],removed=text.includes('triangle')?polygonArea([[0,0],[n[2],0],[0,n[3]]]):n[2]*n[3];return whole-removed;
    }
    case'Coordinate geometry':{
      const points=coordinates(text);
      if(text.includes('triangle')){assert.equal(points.length,3);return polygonArea(points)}
      assert.equal(points.length,2);const dx=points[1][0]-points[0][0],dy=points[1][1]-points[0][1];return text.includes('slope')?dy/dx:Math.hypot(dx,dy);
    }
    case'Statistics':{
      if(text.startsWith('Four numbers')){const mean=Number(capture(text,/have mean (\d+)/)[1]),known=numbers(capture(text,/numbers are ([^.]+)\./)[1]);return uniqueInteger(missing=>Math.abs((known.reduce((sum,value)=>sum+value,0)+missing)/4-mean)<1e-10)}
      if(text.includes('median')){const ordered=n.slice(0,5).sort((a,b)=>a-b);return ordered[2]}
      const values=n.slice(0,3);return values.reduce((sum,value)=>sum+value,0)/values.length;
    }
    case'Probability':{
      const[green,yellow]=n,total=green+yellow;
      if(!text.includes('without replacement'))return green/total;
      // Enumerate unordered pairs of counters; no conditional-probability
      // formula from the generator is used as the expected answer.
      let allPairs=0,greenPairs=0;
      for(let first=0;first<total;first++)for(let second=first+1;second<total;second++){allPairs++;if(first<green&&second<green)greenPairs++}
      return greenPairs/allPairs;
    }
    case'Data interpretation':{
      if(text.includes('library'))return n[1]-n[0];
      const total=n[0]+n[1],newVotes=text.includes('change from B to A')?n[2]:0;
      assert.ok(newVotes<=n[1],'More voters cannot leave B than B originally contains.');return(n[0]+newVotes)/total*100;
    }
    case'Multi-step reasoning':{
      if(text.startsWith('A school'))return Array.from({length:n[0]},()=>n[1]).reduce((sum,value)=>sum+value,0)-n[2];
      const[tickets,adultPrice,childPrice,revenue]=n;
      return uniqueInteger(adults=>adults*adultPrice+(tickets-adults)*childPrice===revenue,0,tickets);
    }
    default:throw new Error('Missing independent oracle for '+q.skill);
  }
}
function keyValue(q:Question){return q.type==='grid'?Number(q.correct):Number(q.choices![Number(q.correct)])}

test('independent prompt-derived oracle verifies all Math skills, levels, variants, and both answer formats',()=>{
  const formats=new Set<string>();let checked=0;
  for(const skill of MATH_SKILLS)for(let level=1;level<=5;level++)for(const variant of [0,1])for(const seed of seeds){
    const q=mathQuestion(skill,level,seed,variant),expected=expectedAnswer(q),actual=keyValue(q),context=`${skill}, level ${level}, variant ${variant}, seed ${seed}: ${q.text}`;
    assert.ok(Number.isFinite(expected),context);assert.ok(Math.abs(actual-expected)<=.000051,context);
    if(q.type!=='grid')assert.equal(q.choices!.filter(choice=>Math.abs(Number(choice)-expected)<=.000051).length,1,'Only one displayed option may satisfy '+context);
    formats.add(q.type!);checked++;
  }
  assert.equal(checked,2040);assert.deepEqual(formats,new Set(['mc','grid']));
});

test('nonterminating grid results state the four-place rounding requirement in the displayed question',()=>{
  let checked=0;
  for(const skill of MATH_SKILLS)for(let level=1;level<=5;level++)for(const variant of [0,1])for(const seed of seeds){
    const q=mathQuestion(skill,level,seed,variant);if(q.type!=='grid')continue;
    const exact=expectedAnswer(q);if(Math.abs(exact-Number(exact.toFixed(4)))<1e-9)continue;
    assert.match(q.text,/(?:four|4)\s+(?:decimal\s+)?places/i,`${skill}: ${q.text}`);checked++;
  }
  assert.ok(checked>20,'The regression must exercise recurring decimals across multiple skills.');
});

test('inverse pump problems conserve work and do not claim fewer pumps when the new group is larger or equal',()=>{
  const directions=new Set<string>();
  for(let seed=100;seed<300;seed++){
    const q=mathQuestion('Proportions',4,seed),[originalPumps,originalTime,newPumps]=numbers(q.text),expected=expectedAnswer(q);
    const direction=newPumps>originalPumps?'more':newPumps<originalPumps?'fewer':'same';directions.add(direction);
    assert.ok(Math.abs(keyValue(q)*newPumps-originalPumps*originalTime)<1e-8);
    if(direction==='more')assert.ok(expected<originalTime);else if(direction==='fewer')assert.ok(expected>originalTime);else assert.ok(Math.abs(expected-originalTime)<1e-8);
    if(direction!=='fewer')assert.doesNotMatch(q.explanation,/Fewer pumps require more time\.$/);
  }
  assert.deepEqual(directions,new Set(['more','fewer','same']));
});
