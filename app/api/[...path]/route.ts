import {handler} from '@/lib/api';
export const dynamic='force-dynamic';
export async function GET(req:Request,ctx:any){const {path}=await ctx.params;return handler(req,path)}
export async function POST(req:Request,ctx:any){const {path}=await ctx.params;return handler(req,path)}
