"use client";
import {useRef,useState} from 'react';
import {RadioGroup,RadioGroupItem} from '@/components/ui/radio-group';

export function AnswerChoices({item,value,onChange,disabled}:any){
  const[eliminated,setEliminated]=useState<string[]>([]);
  return <RadioGroup disabled={disabled} value={value||''} onValueChange={onChange} aria-label="Answer options">
    {item.options.map((option:any,i:number)=><div className="answer-choice-row" key={option.id}>
      <label htmlFor={'answer-'+option.id} className={'answer-option '+(value===option.id?'selected':'')+(eliminated.includes(option.id)?' eliminated':'')}><RadioGroupItem value={option.id} id={'answer-'+option.id}/><span className="letter">{String.fromCharCode(65+i)}</span><span>{option.text}</span></label>
      <button type="button" className="btn ghost" disabled={disabled||value===option.id} aria-pressed={eliminated.includes(option.id)} aria-label={(eliminated.includes(option.id)?'Restore':'Eliminate')+' option '+String.fromCharCode(65+i)} onClick={()=>setEliminated(v=>v.includes(option.id)?v.filter(id=>id!==option.id):[...v,option.id])}>{eliminated.includes(option.id)?'Restore':'Eliminate'}</button>
    </div>)}
  </RadioGroup>;
}

type Point=[number,number];
export function ScratchDrawing(){
  const[history,setHistory]=useState<{strokes:Point[][];redo:Point[][]}>({strokes:[],redo:[]}),[cursor,setCursor]=useState<Point>([320,110]);
  const{strokes,redo}=history;
  const drawing=useRef(false);
  const locate=(e:any):Point=>{const box=e.currentTarget.getBoundingClientRect();return[Math.max(0,Math.min(640,(e.clientX-box.left)*640/box.width)),Math.max(0,Math.min(220,(e.clientY-box.top)*220/box.height))]};
  const start=(point:Point)=>{drawing.current=true;setHistory(v=>({redo:[],strokes:[...v.strokes.slice(-99),[point]]}));};
  const append=(point:Point)=>setHistory(v=>{if(!v.strokes.length)return v;const line=v.strokes[v.strokes.length-1];return line.length>=2000?v:{...v,strokes:[...v.strokes.slice(0,-1),[...line,point]]}});
  const undo=()=>{drawing.current=false;setHistory(v=>v.strokes.length?{redo:[...v.redo,v.strokes[v.strokes.length-1]],strokes:v.strokes.slice(0,-1)}:v)};
  const repeat=()=>{drawing.current=false;setHistory(v=>v.redo.length?{strokes:[...v.strokes,v.redo[v.redo.length-1]],redo:v.redo.slice(0,-1)}:v)};
  return <details className="notepad"><summary>Scratch drawing</summary><div className="actions" style={{margin:'12px 0'}}><button className="btn" disabled={!strokes.length} onClick={undo}>Undo</button><button className="btn" disabled={!redo.length} onClick={repeat}>Redo</button><button className="btn" disabled={!strokes.length} onClick={()=>{drawing.current=false;setHistory({strokes:[],redo:[]})}}>Clear</button></div>
    <svg viewBox="0 0 640 220" className="scratch-drawing" tabIndex={0} role="img" aria-label="Drawing area. Arrow keys move the cursor. Space starts or ends a stroke. Escape ends a stroke." onPointerDown={e=>{if(!e.isPrimary)return;e.currentTarget.setPointerCapture(e.pointerId);const point=locate(e);setCursor(point);start(point)}} onPointerMove={e=>{if(drawing.current){const point=locate(e);setCursor(point);append(point)}}} onPointerUp={()=>{drawing.current=false}} onPointerCancel={()=>{drawing.current=false}} onKeyDown={e=>{if(e.key==='Escape'){drawing.current=false;return}if(e.key===' '){e.preventDefault();if(drawing.current)drawing.current=false;else start(cursor);return}const delta:Record<string,Point>={ArrowLeft:[-5,0],ArrowRight:[5,0],ArrowUp:[0,-5],ArrowDown:[0,5]};if(delta[e.key]){e.preventDefault();const point:Point=[Math.max(0,Math.min(640,cursor[0]+delta[e.key][0])),Math.max(0,Math.min(220,cursor[1]+delta[e.key][1]))];setCursor(point);if(drawing.current)append(point)}}}>
      {strokes.map((line,i)=><polyline key={i} points={line.map(p=>p.join(',')).join(' ')} fill="none" stroke="#25331f" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>)}<circle cx={cursor[0]} cy={cursor[1]} r={3} fill="#9a7d2e"/>
    </svg><p className="small muted">Optional working space. Drawings are temporary and are not submitted answers. Use arrow keys and Space to draw with the keyboard.</p>
  </details>;
}
