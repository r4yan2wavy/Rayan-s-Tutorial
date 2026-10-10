import {existsSync,mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
if(!existsSync('package.json'))throw Error('Run this from the Queens Scholars Tutorial project folder.');
mkdirSync('.sites-runtime',{recursive:true});
writeFileSync('.sites-runtime/execution-profile.json',JSON.stringify({executionProfile:process.env.SITES_MANAGED_LINUX_CONTAINER==='1'?'managed-linux':'portable'}));
let token;
if(existsSync('.dev.vars')){
  const existing=readFileSync('.dev.vars','utf8');token=existing.match(/^ADMIN_SETUP_TOKEN\s*=\s*"?([^"\r\n]+)"?/m)?.[1];
  if(!token)throw Error('An existing .dev.vars is present. Add a private ADMIN_SETUP_TOKEN without overwriting its other settings.');
}else{
  token=randomBytes(32).toString('hex');
  writeFileSync('.dev.vars',`ADMIN_SETUP_TOKEN=${token}\n`,{mode:0o600,flag:'wx'});
}
console.log('Local configuration is ready. Keep the setup link private.');
console.log('After building, migrating, and starting the app, open:');
console.log('http://localhost:5173/setup#token='+encodeURIComponent(token));
console.log('Create your own administrator username and password. Setup closes after the first administrator.');
