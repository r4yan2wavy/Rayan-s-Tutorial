'use client';
import {useEffect,useState} from 'react';
import type {Subtopic} from '@/lib/curriculum';
type Inventory={topics:(Subtopic&{approved:number;reviewed:number;pendingReview:number;unseen:number;families:number})[];goalPerSubtopic:number};
export function ContentAvailability({subtopic,detailed=false}:{subtopic?:string;detailed?:boolean}){
 const [inventory,setInventory]=useState<Inventory|null>(null),[search,setSearch]=useState('');
 useEffect(()=>{const controller=new AbortController();void fetch('/api/studio/content',{signal:controller.signal,cache:'no-store'}).then(async response=>{if(response.ok)setInventory(await response.json())}).catch(()=>{});return()=>controller.abort()},[]);
 if(!inventory)return null;
 const focus=inventory.topics.find(topic=>topic.id===subtopic);
 if(!detailed)return focus?<div className="note spaced"><strong>{focus.label}</strong><p>{focus.unseen} saved questions you haven’t seen · {focus.reviewed} questions passed the new review checks · {focus.families} available question families. Fresh generated questions are checked before selection.</p></div>:null;
 const topics=inventory.topics.filter(topic=>(topic.label+' '+topic.domain).toLowerCase().includes(search.toLowerCase()));
 return <section className="panel spaced"><h3>Your content library by subtopic</h3><p className="muted spaced">These counts show saved questions and those that passed the new review checks. Older items may still need evidence, explanation, or difficulty review. The long-term goal is {inventory.goalPerSubtopic.toLocaleString()} per individual subtopic; a goal is separate from the available inventory.</p><label className="field spaced">Find a subtopic<input className="inventory-search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Inference, Circle Area, Percent Increase…"/></label><div className="table-wrap"><table><thead><tr><th>Subtopic</th><th>Saved</th><th>New review checks</th><th>Unseen by you</th><th>Families</th></tr></thead><tbody>{topics.map(topic=><tr key={topic.id}><td><b>{topic.label}</b><small>{topic.subject} · {topic.domain}</small></td><td>{topic.approved.toLocaleString()}</td><td>{topic.reviewed.toLocaleString()}</td><td>{topic.unseen.toLocaleString()}</td><td>{topic.families}</td></tr>)}</tbody></table></div><p className="tiny spaced">New ELA generation is limited to verified free credits. Existing questions remain available when credits are unavailable.</p></section>;
}
