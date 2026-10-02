import fs from 'node:fs';
import crypto from 'node:crypto';

const code = crypto.randomBytes(24).toString('hex');
fs.writeFileSync('.dev.vars', 'ADMIN_SETUP_TOKEN=' + code + '\n');
fs.writeFileSync('.env', 'ADMIN_SETUP_TOKEN=' + code + '\n');
fs.writeFileSync('.env.example', 'ADMIN_SETUP_TOKEN=configure-a-private-administrator-setup-code\n');
fs.writeFileSync('../administrator-access.txt', `Rayan's Tutorial administrator access

Create your normal email/password account. Open Account → Content studio access. Enter this private setup code:

${code}

Keep this file private. Students do not need this code.
`);
console.log('Administrator access configured locally.');
