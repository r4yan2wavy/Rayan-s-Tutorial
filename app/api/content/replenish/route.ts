import {authorizeContentWorker,runContentWorker} from '@/lib/content-worker';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=180;
export async function POST(request:Request){
 try{if(!await authorizeContentWorker(request))return Response.json({error:'Unauthorized'},{status:401});return Response.json(await runContentWorker(),{headers:{'Cache-Control':'no-store'}})}catch{return Response.json({error:'Replenishment is paused; saved practice is available.'},{status:503})}
}
