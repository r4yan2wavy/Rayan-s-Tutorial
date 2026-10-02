import {existsSync} from 'node:fs';
if(existsSync('.env.local'))process.loadEnvFile('.env.local');
const {withDatabaseSetup,closeDatabase}=await import('../db/index');
const {seedLibrary}=await import('../lib/library');
try{await withDatabaseSetup(seedLibrary);console.log('Practice library seeded. Existing questions and progress were preserved.')}catch{console.error('Seed failed. Check the private database URL and apply the Supabase migration first.');process.exitCode=1}finally{await closeDatabase()}
