import {handle} from '@/lib/service';
import {after} from 'next/server';
import {runContentWorker} from '@/lib/content-worker';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export const maxDuration=180;
async function route(request:Request,{params}:{params:Promise<{path:string[]}>}){
 const path=(await params).path,response=await handle(request,path);
 if(response.ok&&request.method==='POST'&&path[0]==='sessions')after(async()=>{try{await runContentWorker()}catch{/* The saved session does not depend on a provider being available. */}});
 return response;
}
export const GET=route;
export const POST=route;
export const DELETE=route;
