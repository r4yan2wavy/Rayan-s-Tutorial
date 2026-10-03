type DatabaseEnvironment=Record<string,string|undefined>;

// Shared by runtime connections and authentication readiness. Both names are server-only.
export function configuredDatabaseUrl(env:DatabaseEnvironment){
  const value=env.SUPABASE_DB_URL?.trim()||env.POSTGRES_URL?.trim();
  if(!value)throw Object.assign(new Error('The progress database is not configured.'),{status:503});
  let url:URL;
  try{url=new URL(value)}catch{throw new Error('Invalid database configuration.')}
  if(!['postgres:','postgresql:'].includes(url.protocol)||!url.hostname)throw new Error('Invalid database configuration.');
  return url;
}

export function configuredDatabaseSsl(env:DatabaseEnvironment):{rejectUnauthorized:true;ca?:string}{
  const value=env.SUPABASE_DB_SSL_CA?.trim();
  if(!value)return {rejectUnauthorized:true};
  // Support multiline PEM and the literal \n form used in private environment files.
  const ca=value.replace(/\\r\\n|\\n|\r\n?/g,'\n');
  if(!/^-----BEGIN CERTIFICATE-----\n(?:[A-Za-z0-9+/]+={0,2}\n)+-----END CERTIFICATE-----$/.test(ca))throw new Error('Invalid database CA certificate configuration.');
  return {rejectUnauthorized:true,ca:ca+'\n'};
}
