import {env} from 'cloudflare:workers';
export function database():D1Database{const db=(env as any).DB;if(!db)throw new Error('The learning portal is temporarily unavailable. Please try again.');return db}
export const runtime=()=>env as any;
