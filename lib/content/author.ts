import {normalizeNumber,type Item} from './math';
const text=(value:any,label:string,min:number,max:number)=>{if(typeof value!=='string'||value.trim().length<min||value.length>max)throw Error(`${label}: use ${min}–${max} characters.`);return value.trim()};
export function validateDraft(raw:any,allowedTopics:{id:string;subject:string;grade?:number}[]):Item{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Each question must be an object.');
 const subject=raw.subject==='ELA'?'ELA':raw.subject==='Math'?'Math':null;
 if(!subject)throw Error('Choose Math or ELA.');
 const topic=text(raw.topic,'Topic ID',2,60);if(!allowedTopics.some(t=>t.id===topic&&t.subject===subject))throw Error('Choose an existing topic ID for this subject.');
 const grade=Number(raw.grade);if(![8,9].includes(grade))throw Error('Choose Grade 8 or Grade 9 testing track.');
 if((allowedTopics.find(t=>t.id===topic&&t.subject===subject)?.grade||8)>grade)throw Error('This skill belongs to a higher testing grade.');
 const format=raw.format;if(!['single','numeric'].includes(format)||subject==='ELA'&&format==='numeric')throw Error('Use single choice, or numeric entry for Math.');
 const stem=text(raw.stem,'Question',10,3000);
 const steps=Array.isArray(raw.steps)?raw.steps.map((v:any)=>text(v,'Explanation step',10,1600)):[];
 if(steps.length<2||steps.length>12)throw Error('Supply 2–12 explanation steps.');
 let options:any,key:any,why:any;
 if(format==='single'){
  if(!Array.isArray(raw.options)||raw.options.length!==4)throw Error('Single choice requires exactly four options.');
  options=raw.options.map((v:any)=>({id:text(v.id,'Option ID',1,20),text:text(v.text,'Option text',1,1000)}));
  if(new Set(options.map((o:any)=>o.id)).size!==4||new Set(options.map((o:any)=>o.text.toLowerCase())).size!==4)throw Error('Option IDs and text must be unique.');
  key=text(raw.key,'Correct option ID',1,20);if(!options.some((o:any)=>o.id===key))throw Error('The answer key must match one option ID.');
  why=Object.fromEntries(options.map((o:any)=>[o.id,text(raw.why?.[o.id],'Explanation for option '+o.id,15,1600)]));
 }else{key=text(String(raw.key??''),'Numeric answer',1,80);if(normalizeNumber(key)===null)throw Error('Use an exact integer, decimal with a leading zero, or fraction as the numeric key.');}
 const standard=text(raw.standard,'Specific standards reference',5,300);
 const rights=text(raw.rights,'Original authorship or reuse permission',20,1800);
 const sourceEvidence=text(raw.sourceEvidence,'Scope source and section',15,1800);
 let passage:any,setId:string|undefined,evidence:string|undefined;
 if(raw.passage){
  const pid=text(raw.passage.id,'Passage ID',3,60);if(!/^[a-z0-9-]+$/.test(pid))throw Error('Passage ID must use lowercase letters, numbers, and hyphens.');
  if(!Array.isArray(raw.passage.paragraphs)||raw.passage.paragraphs.length<1||raw.passage.paragraphs.length>30)throw Error('Supply 1–30 passage paragraphs.');
  setId='custom-passage:'+pid;
  passage={id:setId,title:text(raw.passage.title,'Passage title',3,120),genre:text(raw.passage.genre,'Passage genre',3,80),paragraphs:raw.passage.paragraphs.map((v:any)=>text(v,'Passage paragraph',5,5000)),attribution:rights};
  if(raw.passage.glossary){
   const entries=Object.entries(raw.passage.glossary);if(Array.isArray(raw.passage.glossary)||entries.length>12||new Set(entries.map(([term])=>term.toLowerCase())).size!==entries.length)throw Error('Use at most 12 glossary entries.');
   passage.glossary=Object.fromEntries(entries.map(([term,definition])=>{const word=text(term,'Glossary term',2,40);if(!passage.paragraphs.some((p:string)=>p.toLowerCase().includes(word.toLowerCase())))throw Error('Glossary terms must occur in the passage.');return[word,text(definition,'Glossary definition',10,300)]}));
  }
  evidence=text(raw.evidence,'Exact quotation and paragraph reference',15,1200);
 }
 if(subject==='ELA'&&!passage&&!['agreement','commas','tense','modifiers','parallel','concision'].includes(topic))throw Error('Reading questions require their passage and exact evidence.');
 return {id:'custom:'+crypto.randomUUID(),version:'1',subject,topic,domain:'Staff-authored practice',grade,difficulty:[1,2,3].includes(Number(raw.difficulty))?Number(raw.difficulty):2,format,stem,options,key,steps,why,takeaway:text(raw.takeaway,'Takeaway',10,500),verify:{sourceEvidence,rights,standard},standard,passage,setId,evidence};
}
