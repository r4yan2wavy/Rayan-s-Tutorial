import {Question,MATH_SKILLS} from './assessment';
const round=(n:number)=>Math.round(n*10000)/10000;
function rng(seed:number){let x=seed|0;return()=>{x=(Math.imul(x,1664525)+1013904223)|0;return(x>>>0)/4294967296}}
function legacyMathQuestion(skill:string,d:number,seed:number,variant=seed%2):Question{const r=rng(seed),n=(a:number,b:number)=>a+Math.floor(r()*(b-a+1));const a=n(2,8+d*5),b=n(2,7+d*2),template=skill+'-'+variant;let c=n(2,10),answer=0,text='',explanation='',breakthrough='',trap='';switch(skill){
case 'Ratios':if(variant===0){answer=a*c;text=`A club has ${a} art students for every ${b} music students. If there are ${b*c} music students, how many art students are there?`;explanation=`The scale factor is ${b*c} ÷ ${b} = ${c}. Multiply the art part by the same factor: ${a} × ${c} = ${answer}.`}else{answer=(a+b)*c;text=`The ratio of red to blue beads is ${a}:${b}. There are ${a*c} red beads. How many beads are there in all?`;explanation=`There are ${c} copies of the ratio. Each copy has ${a+b} beads, so the total is (${a} + ${b}) × ${c} = ${answer}.`}break;
case 'Proportions':if(variant===0){answer=a*c;text=`${b} identical notebooks cost $${a*b}. At that rate, what is the cost of ${c} notebooks?`;explanation=`Unit cost = ${a*b} ÷ ${b} = $${a}. For ${c} notebooks: ${c} × ${a} = $${answer}.`}else{answer=b*c;text=`A scale drawing uses ${a} cm for ${b} m. A wall measures ${a*c} cm on the drawing. What is its real length, in meters?`;explanation=`${a*c} ÷ ${a} = ${c} scale units. Multiply by ${b} m per unit: ${answer} m.`}break;
case 'Number systems':if(variant===0){answer=-a+b-c;text=`What is the value of −${a} + ${b} − ${c}?`;explanation=`Combine the negative terms: −${a} − ${c} = −${a+c}. Add ${b} to get ${answer}.`}else{answer=a*a-b*b;text=`What is the value of ${a}² − ${b}²?`;explanation=`Square each number first: ${a*a} − ${b*b} = ${answer}.`}break;
case 'Expressions':if(variant===0){answer=a*c+b;text=`If x = ${c}, what is the value of ${a}x + ${b}?`;explanation=`Substitute ${c} for x: ${a}(${c}) + ${b} = ${a*c} + ${b} = ${answer}.`}else{answer=(a+b)*c-b;text=`For x = ${c}, evaluate ${a}(x + ${b}) − ${b}(${a+1} − x).`;answer=a*(c+b)-b*(a+1-c);explanation=`First evaluate parentheses: ${a}(${c+b}) − ${b}(${a+1-c}). Multiply and subtract to get ${answer}.`}break;
case 'Equations':if(variant===0){answer=c;text=`Solve for x: ${a}x + ${b} = ${a*c+b}.`;explanation=`Subtract ${b} from both sides: ${a}x = ${a*c}. Divide both sides by ${a}: x = ${c}.`}else{answer=c;text=`Solve for x: ${a}(x − ${b}) = ${a*(c-b)}.`;explanation=`Divide by ${a}: x − ${b} = ${c-b}. Add ${b}: x = ${c}.`}break;
case 'Inequalities':answer=c+1;text=`What is the smallest integer x that satisfies ${a}x − ${b} > ${a*c-b}?`;explanation=`Add ${b}, then divide by positive ${a}: x > ${c}. The smallest integer greater than ${c} is ${answer}.`;break;
case 'Arithmetic':if(variant===0){answer=a*b+c;text=`Evaluate ${a} × ${b} + ${c}.`;explanation=`Multiply before adding: ${a*b} + ${c} = ${answer}.`}else{answer=(a+b)*c;text=`Evaluate (${a} + ${b}) × ${c}.`;explanation=`Evaluate parentheses first: ${a+b} × ${c} = ${answer}.`}break;
case 'Fractions':if(variant===0){answer=round((a+b)/(b*c));text=`What is ${a}/${b*c} + 1/${c}? Give a decimal or fraction.`;explanation=`Use denominator ${b*c}. The second fraction becomes ${b}/${b*c}. Add numerators to get ${a+b}/${b*c}, which is approximately ${answer}.`}else{answer=round(a/b*c);text=`A ribbon is ${a}/${b} meter long. What is the combined length, in meters, of ${c} such ribbons? Give a decimal or fraction.`;explanation=`Multiply ${a}/${b} by ${c}: ${a*c}/${b} ≈ ${answer}.`}break;
case 'Decimals':if(variant===0){answer=round(a/10+b/100);text=`Evaluate ${(a/10).toFixed(1)} + ${(b/100).toFixed(2)}.`;explanation=`Align decimal places: ${(a/10).toFixed(2)} + ${(b/100).toFixed(2)} = ${answer}.`}else{answer=round(a*b/100);text=`Evaluate ${(a/10).toFixed(1)} × ${(b/10).toFixed(1)}.`;explanation=`Multiply the whole numbers: ${a} × ${b} = ${a*b}. Divide by 100 for two decimal places: ${answer}.`}break;
case 'Percentages':{const price=a*20,percent=n(1,7)*5;answer=round(price*(1-percent/100));text=`A jacket priced at $${price} is discounted by ${percent}%. What is the sale price, in dollars?`;explanation=`The discount is ${percent/100} × ${price} = $${price*percent/100}. Subtract it from the original price: ${price} − ${price*percent/100} = $${answer}.`;break}
case 'Rates':if(variant===0){answer=a*c;text=`A cyclist travels ${a*b} kilometers in ${b} hours at a constant speed. How far, in kilometers, will the cyclist travel in ${c} hours?`;explanation=`Speed = ${a*b} ÷ ${b} = ${a} km/h. Distance = ${a} × ${c} = ${answer} km.`}else{answer=round(b/a);text=`A pump fills ${a} liters each minute. How many minutes does it take to fill a ${b}-liter tank?`;explanation=`Time = volume ÷ rate = ${b} ÷ ${a} ≈ ${answer} minutes.`}break;
case 'Geometry':if(variant===0){answer=a*b-a*c/2;text=`A rectangle is ${a} cm long and ${b+c} cm wide. A right triangle with base ${a} cm and height ${c} cm is removed. What area remains, in square centimeters?`;answer=a*(b+c)-a*c/2;explanation=`Rectangle area = ${a} × ${b+c} = ${a*(b+c)}. Removed triangle area = ½ × ${a} × ${c} = ${a*c/2}. Subtract to get ${answer} cm².`}else{answer=a*b*c;text=`A rectangular box has length ${a} cm, width ${b} cm, and height ${c} cm. What is its volume in cubic centimeters?`;explanation=`Volume = length × width × height = ${a} × ${b} × ${c} = ${answer} cm³.`}break;
case 'Coordinate geometry':if(variant===0){answer=round(b/a);text=`A line passes through (0, ${c}) and (${a}, ${c+b}). What is its slope?`;explanation=`Slope = change in y ÷ change in x = (${c+b} − ${c}) ÷ (${a} − 0) = ${b}/${a} ≈ ${answer}.`}else{answer=a+b;text=`Point P is (−${a}, ${c}) and point Q is (${b}, ${c}). What is the distance between P and Q?`;explanation=`The y-coordinates agree. The horizontal distance is ${b} − (−${a}) = ${a+b}.`}break;
case 'Statistics':if(variant===0){answer=round((a+b+c)/3);text=`Find the mean of ${a}, ${b}, and ${c}. Round to four decimal places if needed.`;explanation=`Add the three numbers: ${a+b+c}. Divide by 3: ${answer}.`}else{const values=[a,b,c,a+2,b+3].sort((x,y)=>x-y);answer=values[2];text=`What is the median of ${values.join(', ')}?`;explanation=`The data are already ordered. With five values, the median is the third value, ${answer}.`}break;
case 'Probability':answer=round(a/(a+b));text=`A bag contains ${a} green and ${b} yellow counters. One counter is drawn at random. What is the probability of green? Give a fraction or decimal rounded to four places.`;explanation=`Favorable outcomes = ${a}. Total = ${a+b}. Probability = ${a}/${a+b} ≈ ${answer}.`;break;
case 'Data interpretation':if(variant===0){answer=b*c;text=`A library recorded ${a*c} visits on Monday and ${(a+b)*c} on Tuesday. How many more visits were recorded on Tuesday?`;explanation=`Subtract Monday from Tuesday: ${(a+b)*c} − ${a*c} = ${answer}.`}else{answer=round(a/(a+b)*100);text=`A survey recorded ${a*10} votes for option A and ${b*10} for option B. What percent of all votes were for A? Round to four decimal places if needed.`;explanation=`Total votes = ${(a+b)*10}. Divide A votes by total and multiply by 100: ${a*10}/${(a+b)*10} × 100 ≈ ${answer}%.`}break;
default:c=Math.min(c,a*b-1);answer=a*b-c;text=`A school buys ${a} boxes with ${b} pencils each and distributes ${c} pencils. How many pencils remain?`;explanation=`Find the initial count: ${a} × ${b} = ${a*b}. Subtract the ${c} distributed: ${answer}.`;
}

if(d>=3){switch(skill){
case 'Ratios':answer=a*c;text=`A shipment has red and blue folders in the ratio ${a}:${b}. There are ${(a+b)*c} folders altogether. After ${b*c} blue folders are removed, how many red folders remain?`;explanation=`One ratio bundle has ${a+b} folders. There are ${(a+b)*c} ÷ ${a+b} = ${c} bundles. Red folders = ${a} × ${c} = ${answer}; removing blue folders does not change the red count.`;break;
case 'Proportions':answer=c*a;text=`${a} identical pumps drain a tank in ${b*c} minutes. At the same rate, how many minutes would ${b} pumps need?`;explanation=`The job requires ${a*b*c} pump-minutes. With ${b} pumps, time is ${a*b*c} ÷ ${b} = ${answer} minutes. Fewer pumps require more time.`;break;
case 'Number systems':answer=-a*a+b*c;text=`Evaluate −${a}² + (−${b})(−${c}).`;explanation=`Exponentiation comes before the leading minus: −${a}² = −${a*a}. The product of two negatives is ${b*c}. Add to get ${answer}.`;break;
case 'Expressions':answer=a*(c-b)+b*(c+a);text=`If x = ${c}, evaluate ${a}(x − ${b}) + ${b}(x + ${a}).`;explanation=`Substitute x = ${c}. The terms are ${a*(c-b)} and ${b*(c+a)}. Their sum is ${answer}. You may also distribute first; the constant terms cancel.`;break;
case 'Equations':answer=c;text=`Solve for x: ${a+b}x − ${a*c} = ${b}x.`;explanation=`Subtract ${b}x from both sides: ${a}x − ${a*c} = 0. Add ${a*c} and divide by ${a} to find x = ${answer}.`;break;
case 'Inequalities':answer=c-1;text=`What is the greatest integer x satisfying −${a}x + ${b} > ${b-a*c}?`;explanation=`Subtract ${b}: −${a}x > −${a*c}. Dividing by a negative reverses the inequality, so x < ${c}. The greatest allowed integer is ${answer}.`;break;
case 'Arithmetic':answer=(a+b)*c-a*a;text=`Evaluate (${a} + ${b}) × ${c} − ${a}².`;explanation=`Parentheses give ${a+b}. The product is ${(a+b)*c} and the square is ${a*a}. Subtract to obtain ${answer}.`;break;
case 'Fractions':answer=round(a*c*(b-1)/b);text=`A tank holds ${a*b*c} liters. One student uses 1/${b} of the water. Another uses 1/${b} of what remains. How many liters does the second student use?`;explanation=`After the first use, ${a*b*c} × (${b-1}/${b}) = ${a*c*(b-1)} liters remain. Take 1/${b} of that amount: ${a*c*(b-1)}/${b} ≈ ${answer}. The second fraction applies to the remaining amount, not the original.`;break;
case 'Decimals':answer=round(a*b/100+c/10);text=`A shop buys ${(a/10).toFixed(1)} kilograms of flour at ${(b/10).toFixed(1)} per kilogram and pays a ${(c/10).toFixed(1)} delivery fee. What is the total cost in dollars?`;explanation=`Flour cost = ${a/10} × ${b/10} = ${a*b/100}. Add delivery ${c/10} to get ${answer}.`;break;
case 'Percentages':{const price=a*20,discount=b*5,tax=c;answer=round(price*(1-discount/100)*(1+tax/100));text=`An item costs ${price}. It is discounted by ${discount}%, then a ${tax}% tax is applied to the discounted price. What is the final cost, in dollars? Round to four decimal places if needed.`;explanation=`Discounted price = ${price} × ${1-discount/100} = ${price*(1-discount/100)}. Apply tax to that price: multiply by ${1+tax/100} to get ${answer}. Percent changes multiply; do not simply subtract their rates.`;break}
case 'Rates':answer=round(2*a*b/(a+b));text=`A cyclist rides ${a*b} kilometers at ${a} km/h, then returns the same distance at ${b} km/h. What is the average speed for the whole trip? Round to four decimal places if needed.`;explanation=`Outgoing time = ${b} hours and return time = ${a} hours. Total distance = ${2*a*b} km; total time = ${a+b} hours. Average speed = ${2*a*b}/${a+b} ≈ ${answer} km/h. The two speeds are not averaged directly.`;break;
case 'Geometry':answer=(a+b)*(b+c)-b*c;text=`A rectangular garden is ${a+b} meters long and ${b+c} meters wide. A ${b}-by-${c}-meter rectangular pond is inside it. What is the garden area excluding the pond, in square meters?`;explanation=`Whole area = ${a+b} × ${b+c} = ${(a+b)*(b+c)}. Pond area = ${b} × ${c} = ${b*c}. Subtract to find ${answer} m².`;break;
case 'Coordinate geometry':answer=a*b/2;text=`A triangle has vertices (${c}, ${c}), (${c+a}, ${c}), and (${c}, ${c+b}). What is its area?`;explanation=`The horizontal base is ${a} units and the perpendicular height is ${b}. Triangle area = ½ × ${a} × ${b} = ${answer} square units. The offset coordinates do not change these lengths.`;break;
case 'Statistics':answer=4*c-a-b;text=`Four numbers have mean ${c}. Three of the numbers are ${a}, ${b}, and 0. What is the fourth number?`;explanation=`The four values must total 4 × ${c} = ${4*c}. The known values total ${a+b}. Subtract to get ${answer}. A negative missing value is allowed.`;break;
case 'Probability':answer=round(a*(a-1)/((a+b)*(a+b-1)));text=`A bag has ${a} green and ${b} yellow counters. Two are drawn without replacement. What is the probability both are green? Give a fraction or decimal rounded to four places.`;explanation=`First green probability = ${a}/${a+b}. After a green draw, second green probability = ${a-1}/${a+b-1}. Multiply: ${a*(a-1)}/${(a+b)*(a+b-1)} ≈ ${answer}. The counts change because there is no replacement.`;break;
case 'Data interpretation':answer=round((a+c)/(a+b)*100);text=`A survey records ${a*10} votes for A and ${b*10} for B. Then ${Math.min(c,b)*10} voters change from B to A. What percent now favor A? Round to four decimal places if needed.`;answer=round((a+Math.min(c,b))/(a+b)*100);explanation=`The total stays ${(a+b)*10}. A now has ${(a+Math.min(c,b))*10} votes. Divide by the unchanged total and multiply by 100: approximately ${answer}%.`;break;
default:{const adult=a+b,child=b,adults=c,children=a,total=adult*adults+child*children;answer=adults;text=`A show sells ${adults+children} tickets. Adult tickets cost ${adult} and child tickets cost ${child}. Revenue is ${total}. How many adult tickets were sold?`;explanation=`If all tickets were child tickets, revenue would be ${(adults+children)*child}. The extra ${total-(adults+children)*child} comes from adult tickets, each costing ${adult-child} more. Divide: ${total-(adults+children)*child} ÷ ${adult-child} = ${answer}.`}
}}
const strategies:Record<string,string>={'Ratios':'A ratio is a bundle of parts. Find the scale factor, then apply it to every part.','Proportions':'Find a unit rate or scale factor first; keep the units consistent.','Number systems':'Track signs carefully, and apply exponents before addition.','Expressions':'Replace each variable with its value before calculating.','Equations':'Undo operations in reverse order, doing the same thing to both sides.','Inequalities':'A strict inequality excludes its boundary. Check the nearest allowed integer.','Arithmetic':'Parentheses first, then multiplication and division, then addition and subtraction.','Fractions':'Equivalent fractions describe the same amount. Use common denominators for addition.','Decimals':'Place value matters: align decimals for addition and count decimal places for multiplication.','Percentages':'A discount leaves (100 − percent)% of the original price.','Rates':'Use distance = rate × time, and check that the units cancel.','Geometry':'Sketch the whole shape and each removed piece before combining their areas.','Coordinate geometry':'Measure coordinate changes. Subtracting a negative adds distance.','Statistics':'Mean uses every value; median uses the middle of an ordered list.','Probability':'Probability is favorable outcomes divided by all equally likely outcomes.','Data interpretation':'Identify the total or comparison asked for before using the data.','Multi-step reasoning':'Write the sequence of quantities and operations before calculating.'};breakthrough=strategies[skill]||strategies['Multi-step reasoning'];trap=`A common trap is doing a familiar operation before identifying what the question asks. Check the units and use this rule: ${breakthrough}`;
const grid=seed%7===0||['Fractions','Probability'].includes(skill);let choices:string[]|undefined,correct:number|string=answer;if(!grid){const vals=[answer];for(const v of [round(answer+a),round(answer-b),round(answer*2),round(answer+1),round(answer-1)])if(!vals.includes(v)&&vals.length<4)vals.push(v);while(vals.length<4)vals.push(answer+vals.length+19);const shift=seed%4;choices=vals.slice(shift).concat(vals.slice(0,shift)).map(String);correct=choices.indexOf(String(answer))}return{id:`math-${skill.toLowerCase().replaceAll(' ','-')}-${d}-${seed}-${variant}`,subject:'Math',skill,difficulty:d,text,choices,correct,type:grid?'grid':'mc',explanation,breakthrough,commonTrap:trap,distractorReasons:choices?.map((v,i)=>i===correct?'This follows the calculation.':`${v} does not follow the required sequence. ${explanation}`),templateId:template,generationMethod:'procedural-v1',estimatedTime:60+d*20,subskill:template}}
type Misconception={value:number;reason:string};
type MathFeedback={explanation:string;breakthrough:string;commonTrap:string;verification:string;misconceptions:Misconception[]};

function numericAnswer(question:Question){return Number(question.type==='grid'?question.correct:question.choices?.[Number(question.correct)])}

/** The parameter stream also reconstructs old v1 questions for safe feedback overlays. */
function parameters(skill:string,difficulty:number,seed:number){
  const random=rng(seed),integer=(min:number,max:number)=>min+Math.floor(random()*(max-min+1));
  const a=integer(2,8+difficulty*5),b=integer(2,7+difficulty*2);
  let c=integer(2,10);
  const percent=skill==='Percentages'?integer(1,7)*5:0;
  if(difficulty<3&&skill==='Multi-step reasoning')c=Math.min(c,a*b-1);
  return{a,b,c,percent};
}

function feedback(question:Question,seed:number,variant:number):MathFeedback{
  const {a,b,c,percent}=parameters(question.skill,question.difficulty,seed);
  const answer=numericAnswer(question),high=question.difficulty>=3;
  const mistakes:Misconception[]=[];
  const add=(value:number,reason:string)=>{
    value=round(value);
    const percentShare=question.skill==='Data interpretation'&&(high||variant===1);
    const count=question.skill==='Ratios'||(question.skill==='Data interpretation'&&!high&&variant===0)||question.skill==='Multi-step reasoning';
    if(percentShare&&(value<0||value>100))return;
    if(count&&(!Number.isInteger(value)||value<0))return;
    if(question.skill==='Multi-step reasoning'&&high&&value>a+c)return;
    if(question.skill==='Probability'&&(value<0||value>1))return;
    if(['Proportions','Rates','Geometry','Fractions'].includes(question.skill)&&value<0)return;
    if(Number.isFinite(value)&&value!==answer&&!mistakes.some(m=>m.value===value))mistakes.push({value,reason});
  };
  let explanation=question.explanation,breakthrough=question.breakthrough,commonTrap='',verification='';
  switch(question.skill){
    case 'Ratios':
      if(high){
        const total=(a+b)*c,blue=b*c;
        explanation=`A ratio bundle contains ${a} red + ${b} blue = ${a+b} folders. The shipment has ${total} ÷ ${a+b} = ${c} bundles. Red folders: ${a} × ${c} = ${answer}. Blue folders: ${b} × ${c} = ${blue}. Removing only blue folders leaves all ${answer} red folders.`;
        commonTrap='Removing one color does not remove the other color. Find the red count from the original ratio and total.';
        verification=`The original total is ${total}; ${answer} red + ${blue} blue = ${total}. Only blue folders are removed, so the remaining red count is ${answer}.`;
        add(total,'This is the original total of both colors, not the remaining red count.');
        add(blue,'This is the blue count, not the red count.');
        add(total-c,'This subtracts the number of ratio bundles instead of the number of blue folders.');
        add(total-b,'This removes only one bundle’s blue part instead of all blue folders.');
        add(a,'This uses the red part of one ratio bundle without scaling to the shipment.');
        add(c,'This is the number of ratio bundles, not the number of red folders.');
      }else if(variant===0){
        const music=b*c;
        explanation=`The ${music} music students represent ${music} ÷ ${b} = ${c} ratio bundles. Each bundle has ${a} art students, so there are ${c} × ${a} = ${answer} art students. Check: ${answer}:${music} has the same ratio as ${a}:${b}.`;
        commonTrap='Scale both ratio parts by the same multiplier; do not add a ratio part to the given count.';
        verification=`The music count gives ${music} ÷ ${b} = ${c} bundles, and ${c} × ${a} = ${answer} art students.`;
        add((a+b)*c,'This counts both art and music students; the question asks only for art students.');
        add(music,'This repeats the given music count instead of finding the art count.');
        add(a,'This is the art count in just one ratio bundle.');
        add(music+a,'This adds one art ratio part to the music count instead of scaling it.');
        add(a+b,'This is the size of one mixed bundle, not the requested scaled art count.');
        add(c,'This is the scale factor, not the number of art students.');
      }else{
        const red=a*c,blue=b*c;
        explanation=`The ${red} red beads represent ${red} ÷ ${a} = ${c} ratio bundles. Blue beads: ${c} × ${b} = ${blue}. Total beads: ${red} + ${blue} = ${answer}. Equivalently, ${c} bundles × (${a} + ${b}) beads per bundle = ${answer}.`;
        commonTrap='The given red count is one part of the total. Scale the blue part too, then add the two colors.';
        verification=`${red} red beads ÷ ${a} red beads per bundle = ${c} bundles; ${c} × ${b} = ${blue} blue beads; ${red} + ${blue} = ${answer} total beads.`;
        add(red,'This counts only the given red beads and leaves out the blue beads.');
        add(blue,'This counts only the blue beads and leaves out the red beads.');
        add(red+b,'This adds one blue ratio part instead of the scaled blue count.');
        add(a+b,'This is the number of beads in one bundle, not in all the bundles.');
        add(answer+a,`This adds ${a} extra beads to the already complete red-plus-blue total.`);
        add(answer+b,`This adds ${b} extra beads after both colors have already been counted.`);
      }
      break;
    case 'Proportions':
      if(high){
        const minutes=b*c,work=a*minutes;
        const comparison=b>a?'More pumps do the same job in less time.':b<a?'Fewer pumps take more time to do the same job.':'The pump count is unchanged, so the time is unchanged.';
        explanation=`The job takes ${a} pumps × ${minutes} minutes = ${work} pump-minutes. With ${b} pumps, the time is ${work} ÷ ${b} = ${answer} minutes. Pump count and time vary inversely. ${comparison}`;
        commonTrap='For a fixed job, multiply pump count by time to find the work; do not treat pump count and time as a direct proportion.';
        verification=`${b} pumps × ${answer} minutes = ${work} pump-minutes, matching ${a} × ${minutes}.`;
        add(round(minutes*b/a),'This applies a direct proportion; more pumps should not require proportionally more time for the same job.');
        add(work,'This is the total pump-minutes of work; it still must be divided by the new pump count.');
        add(c,'This divides the old time by the new pump count without including the old pump count.');
        add(minutes,'This repeats the old time without accounting for the changed pump count.');
        add(work*a,'This multiplies by the old pump count a second time instead of dividing by the new count.');
      }else if(variant===0){
        const cost=a*b;
        commonTrap='The given price covers several notebooks. Divide by that count before multiplying by the requested count.';
        verification=`$${cost} ÷ ${b} notebooks = $${a} per notebook; ${c} notebooks × $${a} = $${answer}.`;
        add(cost,'This is the given price for the original number of notebooks.');
        add(cost*c,'This treats the original group price as the price of one notebook.');
        add(a,'This is the price of one notebook, not the requested group.');
        add(cost+c,'This adds the requested notebook count to a dollar amount instead of applying the unit price.');
        add(a+c,'This adds dollars per notebook and notebook count instead of multiplying them.');
      }else{
        commonTrap='Drawing centimeters and real meters are different units; use the scale factor to convert them.';
        verification=`${a*c} drawing cm ÷ ${a} cm per scale unit = ${c} units; ${c} × ${b} real meters = ${answer} meters.`;
        add(a*c,'This reports the drawing length as though centimeters were real meters.');
        add(a*b*c,'This multiplies by both scale numbers instead of dividing by drawing centimeters per unit.');
        add(b,'This is the real length of only one scale unit.');
        add(c,'This is the number of scale units, before converting to real meters.');
        add(a*c+b,'This adds the meter scale number to the drawing measurement instead of converting units.');
      }
      break;
    case 'Number systems':
      if(high){
        commonTrap='In −a², the exponent applies before the leading minus; multiplying two negative numbers produces a positive result.';
        verification=`−${a}² = −${a*a}; (−${b})(−${c}) = ${b*c}; −${a*a} + ${b*c} = ${answer}.`;
        add(a*a+b*c,'This treats the leading minus as part of the squared base, making the square positive.');
        add(-a*a-b*c,'This makes the product of two negative factors negative.');
        add(-2*a+b*c,'This multiplies the base by 2 instead of squaring it.');
        add(a*a-b*c,'This reverses the signs of both terms.');
        add(b*c,'This leaves out the negative square term.');
      }else if(variant===0){
        commonTrap='Keep both negative terms negative when combining the integers.';
        verification=`−${a} − ${c} = −${a+c}; then −${a+c} + ${b} = ${answer}.`;
        add(a+b-c,'This drops the minus sign on the first term.');
        add(-a+b+c,'This changes the final subtraction into addition.');
        add(-(a+b+c),'This makes the positive middle term negative.');
        add(a+b+c,'This ignores both negative signs.');
        add(-a-c,'This leaves out the positive middle term.');
      }else{
        commonTrap='Square each number before subtracting; the square of a difference is a different expression.';
        verification=`${a}² − ${b}² = ${a*a} − ${b*b} = ${answer}.`;
        explanation=`Square the two bases separately: ${a}² = ${a*a} and ${b}² = ${b*b}. Then subtract in the stated order: ${a*a} − ${b*b} = ${answer}.`;
        add((a-b)*(a-b),'This squares the difference rather than subtracting the two squares.');
        add(a*a+b*b,'This adds the squares instead of subtracting them.');
        add(2*a-2*b,'This doubles the numbers instead of squaring them.');
        add(a-b,'This ignores both exponents.');
        add(b*b-a*a,'This reverses the subtraction order.');
        add(a*a-b,'This squares only the first number.');
        add(a*a,'This evaluates only the first square and omits the subtraction of the second square.');
        add(-b*b,'This keeps only the subtracted square and omits the first square.');
      }
      break;
    case 'Expressions':
      if(high){
        commonTrap='Substitute the same x into both parentheses, and distribute each coefficient to every term inside its parentheses.';
        verification=`${a}(${c} − ${b}) + ${b}(${c} + ${a}) = ${a*(c-b)} + ${b*(c+a)} = ${answer}.`;
        add(a*c-b+b*c+a,'This does not distribute the outer coefficients to the constant terms.');
        add(a*(c-b)-b*(c+a),'This subtracts the second product even though the expression adds it.');
        add(a*(c+b)+b*(c+a),'This changes the minus inside the first parentheses to a plus.');
        add(a*(c-b),'This evaluates only the first term.');
        add(b*(c+a),'This evaluates only the second term.');
        add((a+b)*c-a*b,'This keeps a constant term that should cancel when the expression is expanded.');
      }else if(variant===0){
        commonTrap='A coefficient next to x means multiplication, not addition.';
        verification=`${a}x + ${b}, with x=${c}, is ${a} × ${c} + ${b} = ${answer}.`;
        add(a*(c+b),'This adds the constant to x before multiplying, adding parentheses that the expression does not contain.');
        add(a+c+b,'This adds the coefficient and x rather than multiplying them.');
        add(a*c,'This leaves out the constant term.');
        add(a*c-b,'This subtracts the constant instead of adding it.');
        add(a*(c+1)+b,'This substitutes a value one greater than the given x.');
      }else{
        commonTrap='Evaluate each parenthesis first, then multiply; the minus sign applies to the entire second product.';
        verification=`${a}(${c} + ${b}) − ${b}(${a+1} − ${c}) = ${a*(c+b)} − ${b*(a+1-c)} = ${answer}.`;
        add(a*(c+b)+b*(a+1-c),'This adds the second product instead of subtracting it.');
        add(a*c+b-b*(a+1-c),'This does not multiply the first parenthesis’s constant by its outside coefficient.');
        add(a*(c+b)-b*(a+1)-c,'This mishandles the negative sign when expanding the second product.');
        add(a*(c+b),'This leaves out the second product.');
        add((a+b)*c,'This combines unlike parts before evaluating the parentheses.');
      }
      break;
    case 'Equations':
      if(high){
        commonTrap='Move the x terms to one side by subtraction before dividing; the right-hand coefficient is not the whole coefficient of x.';
        verification=`${a+b}x − ${a*c} = ${b}x gives ${a}x = ${a*c}, so x = ${answer}.`;
        add(a*c,'This finds the constant after moving terms but stops before dividing by the remaining coefficient.');
        add(round(a*c/(a+b)),'This divides by the left coefficient without first removing the right-hand x term.');
        add(-c,'This changes the sign when moving the negative constant to the other side.');
        add(round(a*c/b),'This divides by the right coefficient rather than by the difference of the coefficients.');
        add(round(a*c/(a+2*b)),'This adds the x coefficients instead of subtracting the right-hand coefficient.');
      }else if(variant===0){
        const right=a*c+b;
        commonTrap='Subtract the constant from both sides before dividing by the coefficient of x.';
        verification=`${a}x = ${right} − ${b} = ${a*c}; divide by ${a} to get x=${answer}.`;
        add(round(right/a),'This divides before removing the added constant.');
        add(round((right+b)/a),'This adds the constant to the right side instead of subtracting it.');
        add(a*c,'This stops at ax rather than solving for x.');
        add(right-a,'This subtracts the coefficient instead of undoing multiplication by it.');
        add(-c,'This introduces an unnecessary negative sign.');
      }else{
        const right=a*(c-b);
        commonTrap='Divide by the outside coefficient, then undo the subtraction inside the parentheses.';
        verification=`x − ${b} = ${right} ÷ ${a} = ${c-b}; add ${b} to get x=${answer}.`;
        explanation=`First divide both sides by ${a}: x − ${b} = ${right} ÷ ${a} = ${c-b}. Then add ${b} to both sides: x = ${c-b} + ${b} = ${answer}.`;
        add(c-b,'This stops after dividing and does not add back the subtracted constant.');
        add(c-2*b,'This subtracts the constant again instead of adding it.');
        add(right+b,'This adds the constant before removing the outside coefficient.');
        add(c+b,'This adds the constant twice relative to the original equation.');
        add(-c,'This reverses the sign of the solution.');
      }
      break;
    case 'Inequalities':
      if(high){
        commonTrap='Dividing by a negative reverses the inequality. A strict boundary is excluded.';
        verification=`−${a}x > −${a*c}; dividing by −${a} gives x < ${c}. The greatest integer below ${c} is ${answer}.`;
        add(c,'This includes the boundary even though the inequality is strict.');
        add(c+1,'This goes above the boundary, as if dividing by a negative had not reversed the inequality.');
        add(-c,'This changes the sign of the boundary rather than reversing the inequality symbol.');
        add(c-2,'This is below the boundary but is not the greatest allowed integer.');
        add(-a*c,'This reports an intermediate constant rather than solving for x.');
      }else{
        commonTrap='A strict “greater than” inequality excludes equality; the requested integer is one above the boundary.';
        verification=`${a}x > ${a*c} gives x > ${c}; the smallest integer above ${c} is ${answer}.`;
        add(c,'This includes the excluded boundary.');
        add(c-1,'This is below the boundary and does not satisfy the inequality.');
        add(c+2,'This satisfies the inequality but is not the smallest allowed integer.');
        add(a*c,'This stops before dividing by the coefficient of x.');
        add(c+b,'This adds the original constant again after it has already canceled.');
      }
      break;
    case 'Arithmetic':
      if(high){
        commonTrap='Evaluate parentheses and the exponent before the final subtraction.';
        verification=`(${a} + ${b}) × ${c} − ${a}² = ${(a+b)*c} − ${a*a} = ${answer}.`;
        add(a+b*c-a*a,'This ignores the parentheses and multiplies only the second addend.');
        add((a+b)*c-2*a,'This doubles the base instead of squaring it.');
        add((a+b)*c+a*a,'This adds the square instead of subtracting it.');
        add((a+b)*(c-a*a),'This subtracts the square inside a new parenthesis before multiplication.');
        add((a+b)*c,'This leaves out the square term.');
      }else if(variant===0){
        commonTrap='Multiply before adding; do not insert parentheses that change the expression.';
        verification=`${a} × ${b} + ${c} = ${a*b} + ${c} = ${answer}.`;
        explanation=`Apply multiplication before addition: ${a} × ${b} = ${a*b}. Then add the final term: ${a*b} + ${c} = ${answer}.`;
        add(a*(b+c),'This adds before multiplying, as if the expression had parentheses around the last two numbers.');
        add(a+b+c,'This treats the multiplication sign as addition.');
        add(a*b,'This leaves out the final addition.');
        add(a*b-c,'This subtracts the last number instead of adding it.');
        add(a+b*c,'This multiplies a different pair of numbers.');
      }else{
        commonTrap='The entire sum inside the parentheses must be multiplied by the final factor.';
        verification=`(${a} + ${b}) × ${c} = ${a+b} × ${c} = ${answer}.`;
        explanation=`First evaluate the parentheses: ${a} + ${b} = ${a+b}. Multiply that entire sum by ${c}: ${a+b} × ${c} = ${answer}.`;
        add(a+b*c,'This ignores the parentheses and multiplies only the second addend.');
        add(a*c+b,'This multiplies only the first addend.');
        add(a+b+c,'This treats the multiplication as addition.');
        add(a*b*c,'This replaces the addition inside the parentheses with multiplication.');
        add(a+b,'This stops after evaluating the parentheses.');
      }
      break;
    case 'Fractions':
      if(high){
        const total=a*b*c,remaining=a*c*(b-1);
        commonTrap='The second fraction applies to the remaining water, not to the original amount.';
        verification=`Start with ${total} liters; ${total} ÷ ${b} = ${a*c} liters are used first. The remaining ${remaining} liters give ${remaining} ÷ ${b} ≈ ${answer} liters for the second student.`;
        add(a*c,'This takes the second fraction from the original tank rather than from the remaining water.');
        add(remaining,'This is the amount remaining before the second student uses any water.');
        add(a*c+answer,'This counts the combined use by both students, not only the second student’s use.');
        add(total-2*a*c,'This subtracts two equal original fractions and reports water left, not the second use.');
      }else if(variant===0){
        commonTrap='Use a common denominator; adding the denominators changes the sizes of the parts.';
        verification=`1/${c} = ${b}/${b*c}; therefore ${a}/${b*c} + ${b}/${b*c} = ${a+b}/${b*c} ≈ ${answer}.`;
        add((a+1)/(b*c+c),'This adds numerators and denominators directly instead of using equal-sized parts.');
        add((a+1)/(b*c),'This changes the second denominator without scaling its numerator.');
        add(a/(b*c),'This leaves out the second fraction.');
        add((a+b)/(b*c*2),'This doubles the common denominator after adding.');
      }else{
        commonTrap='Multiply the length of each ribbon by the number of ribbons; do not divide by the count.';
        verification=`${c} ribbons × ${a}/${b} meter per ribbon = ${a*c}/${b} ≈ ${answer} meters.`;
        add(a/(b*c),'This divides the length by the ribbon count instead of multiplying.');
        add(a/b+c,'This adds the ribbon count to a length rather than finding the combined length.');
        add(a/b,'This is the length of just one ribbon.');
        add(a*c,'This multiplies the numerator but forgets the denominator.');
      }
      break;
    case 'Decimals':
      if(high){
        const flour=a*b/100,delivery=c/10;
        commonTrap='Multiply kilograms by dollars per kilogram, then add the one-time delivery fee.';
        verification=`${a/10} kg × $${b/10}/kg = $${flour}; $${flour} + $${delivery} delivery = $${answer}.`;
        add(flour,'This counts the flour cost but omits the delivery fee.');
        add((a/10)*(b/10+c/10),'This charges the delivery fee for every kilogram rather than once.');
        add(a/10+b/10+c/10,'This adds weight and rate instead of multiplying them to find cost.');
        add(a*b/10+c/10,'This misplaces the decimal in the product by one place.');
        add(a*b/1000+c/10,'This divides the product by an extra factor of 10.');
      }else if(variant===0){
        commonTrap='Align decimal place values before adding tenths and hundredths.';
        verification=`${(a/10).toFixed(2)} + ${(b/100).toFixed(2)} = ${answer}.`;
        explanation=`Write both numbers in hundredths: ${(a/10).toFixed(1)} = ${(a/10).toFixed(2)} and ${(b/100).toFixed(2)} stays the same. Add the aligned place values: ${(a/10).toFixed(2)} + ${(b/100).toFixed(2)} = ${answer}.`;
        add((a+b)/10,'This treats the hundredths term as tenths.');
        add((a+b)/100,'This treats the tenths term as hundredths.');
        add(a/10-b/100,'This subtracts the hundredths instead of adding them.');
        add(a*b/1000,'This multiplies the decimal terms instead of adding them.');
        add(a/10,'This leaves out the hundredths term.');
      }else{
        commonTrap='Each factor has one decimal place, so the product of their whole-number parts must be divided by 100.';
        verification=`${a} × ${b} = ${a*b}; two total decimal places give ${a*b} ÷ 100 = ${answer}.`;
        add(a*b/10,'This places only one decimal place in the product.');
        add(a*b/1000,'This places three decimal places instead of two.');
        add((a+b)/10,'This adds the two decimals instead of multiplying them.');
        add(a*b,'This ignores both decimal places.');
      }
      break;
    case 'Percentages':{
      const price=a*20;
      if(high){
        const discount=b*5,tax=c,discounted=price*(1-discount/100);
        commonTrap='Apply the tax to the discounted price. The two percentage changes have different bases.';
        verification=`$${price} × ${(100-discount)/100} = $${round(discounted)} after discount; $${round(discounted)} × ${(100+tax)/100} = $${answer} after tax.`;
        add(discounted,'This stops at the discounted price and leaves out the tax.');
        add(price*(1-discount/100)+price*tax/100,'This calculates tax on the original price instead of the discounted price.');
        add(price*(1-(discount+tax)/100),'This treats the tax as another discount.');
        add(price*discount/100*(1+tax/100),'This applies tax to the discount amount rather than the sale price.');
        add(price*(1+tax/100),'This applies tax but leaves out the discount.');
      }else{
        const discount=price*percent/100;
        commonTrap='The discount is the amount saved, not the sale price. Subtract it from the original price.';
        verification=`${percent}% of $${price} is $${round(discount)}; $${price} − $${round(discount)} = $${answer}.`;
        add(discount,'This is the discount amount, not the price after the discount.');
        add(price+discount,'This adds the discount to the price instead of subtracting it.');
        add(price-percent,'This subtracts the percent number as though it were a dollar amount.');
        add(price,'This leaves out the discount.');
        add(price*(1-percent/10000),'This divides the percentage by 100 twice.');
      }
      break;
    }
    case 'Rates':
      if(high){
        const distance=a*b,totalDistance=2*distance,totalTime=a+b;
        commonTrap='For equal distances at different speeds, add the travel times; do not take the arithmetic mean of the speeds.';
        verification=`The times are ${distance} ÷ ${a} = ${b} hours and ${distance} ÷ ${b} = ${a} hours. Average speed = ${totalDistance} km ÷ ${totalTime} hours ≈ ${answer} km/h.`;
        add((a+b)/2,'This takes the arithmetic mean of the speeds, even though the two legs take different amounts of time.');
        add(totalDistance/b,'This counts both distances but only the outgoing travel time.');
        add(totalDistance/a,'This counts both distances but only the return travel time.');
        add(distance/totalTime,'This counts both travel times but only one leg’s distance.');
        add(totalTime/totalDistance,'This divides time by distance, producing hours per kilometer instead of kilometers per hour.');
        add(a+b,'This adds the speeds instead of finding distance divided by elapsed time.');
      }else if(variant===0){
        commonTrap='The first distance covers several hours; find kilometers per hour before scaling to the requested time.';
        verification=`${a*b} km ÷ ${b} hours = ${a} km/h; ${a} km/h × ${c} hours = ${answer} km.`;
        add(a*b*c,'This treats the original multi-hour distance as the distance traveled in one hour.');
        add(a,'This is the hourly speed, not the requested distance.');
        add(a*b,'This repeats the original distance without scaling to the new time.');
        add(a+c,'This adds speed and time instead of multiplying them.');
        add(a*b+c,'This adds the new time to the original distance.');
      }else{
        commonTrap='Time equals volume divided by liters per minute; multiplying volume and rate has the wrong units.';
        verification=`${b} liters ÷ ${a} liters/minute = ${b}/${a} ≈ ${answer} minutes.`;
        add(a/b,'This reverses the division, producing the reciprocal of the required time.');
        add(a*b,'This multiplies volume and rate rather than dividing to find time.');
        add(b,'This treats the pump as though it filled only one liter per minute.');
        add(a+b,'This adds the rate number to the volume instead of using their quotient.');
        add(60*b/a,'This converts the required minutes to seconds but reports that number as minutes.');
        add(b/(60*a),'This converts the rate to liters per hour and reports the resulting hours as minutes.');
      }
      break;
    case 'Geometry':
      if(high){
        const whole=(a+b)*(b+c),pond=b*c;
        commonTrap='Subtract the pond’s area from the whole rectangle’s area; subtracting lengths does not subtract an area.';
        verification=`Whole area = ${a+b} × ${b+c} = ${whole} m². Pond area = ${b} × ${c} = ${pond} m². Remaining area = ${whole} − ${pond} = ${answer} m².`;
        add(whole,'This is the entire garden area and still includes the pond.');
        add(pond,'This is only the pond area, not the garden area outside it.');
        add(whole+pond,'This adds the pond’s area instead of removing it.');
        add(a*b,'This subtracts the pond dimensions from the garden dimensions before multiplying; that does not remove the pond’s area.');
        add(2*((a+b)+(b+c)),'This computes the whole garden’s perimeter rather than its area.');
      }else if(variant===0){
        const whole=a*(b+c),triangle=a*c/2;
        commonTrap='The removed triangle has half the area of a rectangle with the same base and height.';
        verification=`Rectangle area = ${a} × ${b+c} = ${whole} cm². Triangle area = ½ × ${a} × ${c} = ${triangle} cm². Remaining area = ${whole} − ${triangle} = ${answer} cm².`;
        add(whole,'This does not remove the triangle.');
        add(whole-a*c,'This subtracts base times height without the triangle’s factor of one-half.');
        add(triangle,'This reports the removed triangle’s area rather than the remaining area.');
        add(whole+triangle,'This adds the removed piece instead of subtracting it.');
        add(2*(a+b+c),'This is the rectangle’s perimeter, which uses linear rather than square units.');
      }else{
        commonTrap='Volume requires all three dimensions; multiplying only two gives a face area.';
        verification=`${a} cm × ${b} cm × ${c} cm = ${answer} cm³.`;
        add(a*b,'This multiplies only length and width, giving a face area rather than volume.');
        add(a+b+c,'This adds dimensions instead of multiplying them.');
        add(2*(a*b+a*c+b*c),'This computes surface area rather than volume.');
        add(a*b+c,'This adds the height to the base area instead of multiplying by the height.');
        add(a*c,'This multiplies only length and height.');
        add(b*c,'This multiplies only width and height.');
      }
      break;
    case 'Coordinate geometry':
      if(high){
        commonTrap='Measure differences between coordinates, then use one-half times the perpendicular base and height.';
        verification=`Base = (${c+a}) − ${c} = ${a}; height = (${c+b}) − ${c} = ${b}; area = ½ × ${a} × ${b} = ${answer} square units.`;
        add(a*b,'This omits the triangle’s factor of one-half.');
        add((c+a)*(c+b)/2,'This uses the vertex coordinates as lengths without subtracting the shared offset.');
        add((a+b)/2,'This adds the side lengths instead of multiplying them to find area.');
        add(a+b,'This reports the sum of the perpendicular side lengths rather than area.');
        add(a*b/4,'This halves the base and then halves the triangle area again.');
      }else if(variant===0){
        commonTrap='Slope is change in y divided by change in x; the starting y-coordinate is not the rise.';
        verification=`Rise = ${c+b} − ${c} = ${b}; run = ${a} − 0 = ${a}; slope = ${b}/${a} ≈ ${answer}.`;
        add(a/b,'This divides run by rise rather than rise by run.');
        add((c+b)/a,'This uses the second y-coordinate instead of the change in y.');
        add(b,'This finds the rise but leaves out division by the run.');
        add((b-c)/a,'This subtracts the starting y-coordinate twice.');
        add(-b/a,'This reverses the order for only the y-values, changing the sign.');
      }else{
        commonTrap='Distance across zero is found by subtracting a negative coordinate, which adds its magnitude.';
        verification=`The y-coordinates match. Horizontal distance = ${b} − (−${a}) = ${a+b} units.`;
        add(Math.abs(b-a),'This subtracts the magnitudes as though both x-coordinates were on the same side of zero.');
        add(b,'This counts only the segment from zero to Q.');
        add(a,'This counts only the segment from P to zero.');
        add(a+b+c,'This adds the shared y-coordinate even though the vertical change is zero.');
        add(2*(a+b),'This doubles the distance between the two points.');
      }
      break;
    case 'Statistics':
      if(high){
        const total=4*c,known=a+b;
        commonTrap='Multiply the mean by all four values, including the zero, before subtracting the known values.';
        verification=`Required total = 4 × ${c} = ${total}; known total = ${a} + ${b} + 0 = ${known}; missing number = ${total} − ${known} = ${answer}.`;
        add(c-known,'This treats the mean as the required total.');
        add(3*c-known,'This uses three values instead of all four when converting the mean to a total.');
        add(total+known,'This adds the known values instead of subtracting them from the total.');
        add(total,'This is the required total of all four values, not the missing value.');
        add(total-a,'This subtracts only one of the two nonzero known values.');
      }else if(variant===0){
        const total=a+b+c;
        commonTrap='The mean is the sum divided by the number of values, not the sum itself or the midpoint of the range.';
        verification=`Sum = ${a} + ${b} + ${c} = ${total}; mean = ${total} ÷ 3 ≈ ${answer}.`;
        add(total,'This is the sum before dividing by the three values.');
        add(total/2,'This divides by two rather than by the number of values.');
        add(total/4,'This divides by four even though there are three values.');
        add((Math.min(a,b,c)+Math.max(a,b,c))/2,'This uses the midpoint of the range rather than the mean of all three values.');
        add(total/6,'This divides by the number of values twice as far as required, producing half the mean.');
      }else{
        const values=[a,b,c,a+2,b+3].sort((x,y)=>x-y),mean=values.reduce((sum,v)=>sum+v,0)/5;
        commonTrap='For five ordered values, select the third value; an odd-sized set does not require averaging two middle values.';
        verification=`The ordered data are ${values.join(', ')}. Position 3 of 5 is ${answer}, the median.`;
        add(mean,'This computes the mean rather than selecting the median.');
        add(values[0],'This selects the minimum rather than the middle value.');
        add(values[4],'This selects the maximum rather than the middle value.');
        add(values[1],'This selects the second value, one position before the middle.');
        add(values[3],'This selects the fourth value, one position after the middle.');
        add((values[0]+values[4])/2,'This uses the midpoint of the range rather than the middle observation.');
        add(values.reduce((sum,v)=>sum+v,0),'This reports the sum of the observations rather than the middle observation.');
      }
      break;
    case 'Probability':
      if(high){
        commonTrap='Without replacement, both the green count and total count decrease after a green draw.';
        verification=`P(first green) = ${a}/${a+b}; P(second green after first green) = ${a-1}/${a+b-1}; multiply to get ${a*(a-1)}/${(a+b)*(a+b-1)} ≈ ${answer}.`;
        add(a*a/((a+b)*(a+b)),'This treats the draws as though the first counter were replaced.');
        add(a/(a+b),'This counts only the chance of the first green draw.');
        add(a*(a-1)/((a+b)*(a+b)),'This reduces the green count but does not reduce the total count for the second draw.');
        add((a-1)/(a+b-1),'This counts only the second draw conditional on an initial green draw.');
      }else{
        commonTrap='The denominator counts all counters, not only the counters of the other color.';
        verification=`There are ${a} favorable green counters out of ${a+b} counters total, so P(green) = ${a}/${a+b} ≈ ${answer}.`;
        add(b/(a+b),'This is the probability of yellow rather than green.');
        add(a/b,'This compares green counters with yellow counters instead of all counters.');
        add(1/(a+b),'This counts one particular counter rather than every green counter.');
        add((a-1)/(a+b),'This omits one favorable green counter.');
      }
      break;
    case 'Data interpretation':
      if(high){
        const moved=Math.min(c,b),total=(a+b)*10,newA=(a+moved)*10;
        commonTrap='Moving voters between options changes the option counts but does not change the total number of voters.';
        verification=`A becomes ${a*10} + ${moved*10} = ${newA} votes. Total remains ${total}. A’s share is ${newA}/${total} × 100 ≈ ${answer}%.`;
        add(a/(a+b)*100,'This uses A’s original count and ignores the voters who changed their vote.');
        add((a+moved)/(a+b+moved)*100,'This adds the moved voters to the total even though they were already counted.');
        add((a+moved)/(a+b-moved)*100,'This removes moved voters from the total instead of transferring them between options.');
        add((a+moved)/(a+b),'This gives the fractional share but does not convert it to a percent.');
        add((b-moved)/(a+b)*100,'This reports the remaining percentage for B rather than the new percentage for A.');
        add((a+moved)/(2*(a+b))*100,'This counts the original voters twice in the denominator.');
        add(moved/(a+b)*100,'This reports only the share who changed to A, leaving out A’s original supporters.');
      }else if(variant===0){
        const monday=a*c,tuesday=(a+b)*c;
        commonTrap='“How many more” asks for the difference, not the later total or the sum of both days.';
        verification=`Tuesday visits − Monday visits = ${tuesday} − ${monday} = ${answer} visits.`;
        add(tuesday,'This is Tuesday’s total, before subtracting Monday’s visits.');
        add(monday,'This is Monday’s count, not the increase.');
        add(monday+tuesday,'This totals both days instead of finding their difference.');
        add(b,'This finds the change in one bundle without scaling by the bundle count.');
        add(-b*c,'This reverses the subtraction order and produces a decrease.');
      }else{
        const votesA=a*10,total=(a+b)*10;
        commonTrap='Divide the requested option’s votes by all votes, then multiply by 100 to get a percent.';
        verification=`Total votes = ${a*10} + ${b*10} = ${total}; A’s share = ${votesA}/${total} × 100 ≈ ${answer}%.`;
        add(b/(a+b)*100,'This reports B’s percentage rather than A’s percentage.');
        add(a/b*100,'This divides A votes by B votes instead of by the total.');
        add(a/(a+b),'This gives the fractional share without converting to a percent.');
        add(a*10,'This reports A’s vote count as though it were a percentage.');
        add((a+b)*10,'This reports the total vote count rather than A’s percentage.');
        add(a/(2*(a+b))*100,'This counts the total voters twice in the denominator.');
        add(a/(a+b)*10,'This multiplies the fractional share by 10 instead of 100 to convert to a percent.');
      }
      break;
    default:
      if(high){
        const adultPrice=a+b,childPrice=b,tickets=c+a,total=adultPrice*c+childPrice*a,extra=total-tickets*childPrice;
        commonTrap='Revenue above an all-child-ticket baseline comes from the adult price premium, not the full adult price.';
        verification=`All ${tickets} tickets at the child price would earn ${tickets} × $${childPrice} = $${tickets*childPrice}. Extra revenue is $${total} − $${tickets*childPrice} = $${extra}. Each adult ticket adds $${adultPrice-childPrice}, so adults = ${extra} ÷ ${adultPrice-childPrice} = ${answer}.`;
        add(tickets,'This counts all tickets as adult tickets.');
        add(a,'This is the child-ticket count, not the adult-ticket count.');
        add(extra,'This is the extra revenue in dollars before dividing by the adult price premium.');
        add(extra/adultPrice,'This divides the extra revenue by the full adult price rather than by the adult price premium.');
        add(total/adultPrice,'This treats all revenue as though it came only from adult tickets.');
        add(c+a+b,'This adds price numbers to a ticket count instead of using the revenue relationship.');
        add(Math.floor(extra/adultPrice),'This divides extra revenue by the full adult price instead of the price premium, then rounds down to a ticket count.');
        add(adultPrice,'This treats the adult ticket’s dollar price as a number of adult tickets.');
        add(childPrice,'This treats the child ticket’s dollar price as the adult-ticket count.');
        add(1,'This assumes exactly one adult ticket without accounting for the full extra revenue.');
        add(0,'This assumes all tickets were child tickets, which cannot explain the extra revenue.');
      }else{
        const initial=a*b;
        commonTrap='First find the pencils in all boxes, then subtract the pencils distributed.';
        verification=`${a} boxes × ${b} pencils per box = ${initial} pencils; ${initial} − ${c} = ${answer} pencils remain.`;
        add(initial,'This counts the starting pencils and does not remove the distributed pencils.');
        add(initial+c,'This adds distributed pencils instead of subtracting them.');
        add(a+b-c,'This adds boxes and pencils per box rather than multiplying to find the starting count.');
        add(a*(b-c),'This subtracts the total distributed count from every box.');
        add(c,'This is the number distributed, not the number left.');
        add(a,'This reports the number of boxes rather than the pencils remaining.');
        add(b,'This reports the pencils in one box instead of the number remaining after distribution.');
        add(initial-1,'This removes one pencil instead of the stated number distributed.');
      }
  }
  if((question.skill==='Fractions')||(question.skill==='Rates'&&!high&&variant===1)||(question.skill==='Coordinate geometry'&&!high&&variant===0)){
    explanation+=' Give an exact fraction when allowed, or round a decimal answer to four decimal places.';
  }
  breakthrough=question.skill==='Proportions'&&high?'For a fixed job, pump count × time stays constant. Divide the work by the new pump count.':breakthrough;
  return{explanation,breakthrough,commonTrap,verification,misconceptions:mistakes};
}

function freshPrompt(question:Question,variant:number){
  const rounding=question.skill==='Fractions'||(question.skill==='Rates'&&question.difficulty<3&&variant===1)||(question.skill==='Coordinate geometry'&&question.difficulty<3&&variant===0);
  let text=question.text;
  if(rounding)text=text.replace(/ Give a decimal or fraction\.$/,'')+' Give an exact fraction or round a decimal to four decimal places.';
  if(question.skill==='Decimals'&&question.difficulty>=3)text=text.replace(/ at ([\d.]+) per kilogram and pays a ([\d.]+) delivery fee/,' at $$ $1 per kilogram and pays a $$ $2 delivery fee').replaceAll('$ ','$');
  if(question.skill==='Percentages'&&question.difficulty>=3)text=text.replace(/^An item costs (\d+)\./,'An item costs $$ $1.').replace('$ ','$');
  if(question.skill==='Multi-step reasoning'&&question.difficulty>=3)text=text.replace(/Adult tickets cost (\d+) and child tickets cost (\d+)\. Revenue is (\d+)\./,'Adult tickets cost $$ $1 and child tickets cost $$ $2. Revenue is $$ $3.').replaceAll('$ ','$');
  return text;
}

export function mathQuestion(skill:string,difficulty:number,seed:number,variant=seed%2):Question{
  if(!MATH_SKILLS.includes(skill)||!Number.isInteger(difficulty)||difficulty<1||difficulty>5||!Number.isInteger(seed)||seed<0||!Number.isInteger(variant)||variant<0||variant>1)throw new Error('Choose a valid math skill, difficulty, seed, and variant.');
  const legacy=legacyMathQuestion(skill,difficulty,seed,variant),details=feedback(legacy,seed,variant),answer=numericAnswer(legacy);
  let choices:string[]|undefined,correct:number|string=answer,distractorReasons:string[]|undefined;
  if(legacy.type!=='grid'){
    const wrong=details.misconceptions.slice(0,3);
    if(wrong.length!==3)throw new Error(`The ${skill} template could not produce three distinct misconception choices.`);
    const options=[{value:answer,reason:`Correct. ${details.verification}`},...wrong];
    const shift=seed%4,rotated=options.slice(shift).concat(options.slice(0,shift));
    choices=rotated.map(option=>String(option.value));
    correct=rotated.findIndex(option=>option.value===answer);
    distractorReasons=rotated.map(option=>option.value===answer?option.reason:`${option.value}: ${option.reason} ${details.verification}`);
  }
  return{...legacy,id:legacy.id+'-v2',text:freshPrompt(legacy,variant),choices,correct,explanation:details.explanation,breakthrough:details.breakthrough,commonTrap:details.commonTrap,distractorReasons,generationMethod:'procedural-v2'};
}

/** Improve feedback without changing the question or grading contract a student already saw. */
export function mathFeedbackForStoredQuestion(question:Question):Question{
  if(question.subject!=='Math'||!MATH_SKILLS.includes(question.skill)||!Number.isInteger(question.difficulty)||question.difficulty<1||question.difficulty>5||!['procedural-v1','procedural-v2'].includes(question.generationMethod||''))return question;
  const slug=question.skill.toLowerCase().replaceAll(' ','-');
  const match=question.id.match(new RegExp(`^math-${slug}-(\\d+)-(\\d+)-([01])(-v2)?$`));
  if(!match||Number(match[1])!==question.difficulty||(question.generationMethod==='procedural-v2')!==Boolean(match[4]))return question;
  const seed=Number(match[2]),variant=Number(match[3]);
  if(!Number.isSafeInteger(seed))return question;
  const expected=match[4]?mathQuestion(question.skill,question.difficulty,seed,variant):legacyMathQuestion(question.skill,question.difficulty,seed,variant);
  const answer=numericAnswer(question);
  if(question.id!==expected.id||question.text!==expected.text||question.type!==expected.type||!Number.isFinite(answer)||answer!==numericAnswer(expected)||question.choices?.some(choice=>!Number.isFinite(Number(choice))))return question;
  const legacy=legacyMathQuestion(question.skill,question.difficulty,seed,variant),details=feedback(legacy,seed,variant);
  const distractorReasons=question.choices?.map((choice,index)=>{
    if(index===question.correct)return `Correct. ${details.verification}`;
    const value=Number(choice),mistake=details.misconceptions.find(candidate=>candidate.value===value);
    // Older options included arbitrary offsets. Explain their failed numerical
    // check without claiming to know which thought produced the student's choice.
    return mistake?`${choice}: ${mistake.reason} ${details.verification}`:`${choice} is ${round(Math.abs(value-answer))} ${value>answer?'above':'below'} the required value ${answer}. ${details.verification}`;
  });
  return{...question,explanation:details.explanation,breakthrough:details.breakthrough,commonTrap:details.commonTrap,distractorReasons};
}

export function mathBatch(count=100,skill?:string,difficulty?:number,seed=1){return Array.from({length:count},(_,i)=>mathQuestion(skill||MATH_SKILLS[i%MATH_SKILLS.length],difficulty||i%5+1,seed+i,i%2))}
