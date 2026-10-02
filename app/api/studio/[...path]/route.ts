import {handle} from '@/lib/service';
export const dynamic='force-dynamic';
async function route(request:Request,{params}:{params:Promise<{path:string[]}>}){return handle(request,(await params).path)}
export const GET=route;
export const POST=route;
export const DELETE=route;
