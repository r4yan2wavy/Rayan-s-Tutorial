import test from 'node:test';
import assert from 'node:assert/strict';
import {Client} from 'pg';
import {configuredDatabaseSsl,configuredDatabaseUrl} from '../db/config';

const native='postgresql://postgres.native:placeholder@native.pooler.example:6543/postgres';
const manual='postgresql://postgres.manual:placeholder@manual.pooler.example:6543/postgres';

test('native integration database configuration works without a manual duplicate',()=>{
  assert.equal(configuredDatabaseUrl({POSTGRES_URL:native}).hostname,'native.pooler.example');
  assert.equal(configuredDatabaseUrl({SUPABASE_DB_URL:'  ',POSTGRES_URL:native}).hostname,'native.pooler.example');
});
test('explicit database override takes precedence and invalid overrides fail closed',()=>{
  assert.equal(configuredDatabaseUrl({SUPABASE_DB_URL:' '+manual+' ',POSTGRES_URL:native}).hostname,'manual.pooler.example');
  assert.throws(()=>configuredDatabaseUrl({SUPABASE_DB_URL:'https://wrong.example',POSTGRES_URL:native}),/Invalid database configuration/);
});
test('URL SSL parameters cannot override the verified driver TLS options',()=>{
  const ssl=configuredDatabaseSsl({});
  // Reproduce the actual driver's override without opening a socket.
  assert.equal(new Client({connectionString:native+'?ssl=false',ssl}).ssl,'false');
  const url=configuredDatabaseUrl({POSTGRES_URL:native+'?ssl=false&ssl=true&sslmode=disable&sslcert=untrusted.crt&sslkey=private.key&sslrootcert=untrusted-ca.crt&application_name=rayan-tutorial'});
  for(const name of ['ssl','sslmode','sslcert','sslkey','sslrootcert'])assert.equal(url.searchParams.has(name),false);
  assert.equal(url.searchParams.get('application_name'),'rayan-tutorial');
  assert.equal(url.hostname,'native.pooler.example');
  assert.deepEqual(new Client({connectionString:url.toString(),ssl}).ssl,{rejectUnauthorized:true});
});
test('missing or malformed database settings do not appear configured or expose credentials',()=>{
  assert.throws(()=>configuredDatabaseUrl({}),{message:'The progress database is not configured.',status:503});
  for(const value of ['not-a-url','https://example.com','postgresql:///postgres','postgresql:postgres'])assert.throws(()=>configuredDatabaseUrl({POSTGRES_URL:value}),/Invalid database configuration/);
  try{configuredDatabaseUrl({SUPABASE_DB_URL:'invalid-secret-placeholder'})}catch(error){assert.equal((error as Error).message.includes('secret-placeholder'),false)}
});
test('database TLS uses default trust when no project CA is configured',()=>{
  assert.deepEqual(configuredDatabaseSsl({}),{rejectUnauthorized:true});
  assert.deepEqual(configuredDatabaseSsl({SUPABASE_DB_SSL_CA:'  '}),{rejectUnauthorized:true});
});
test('project CA normalizes PEM newlines while retaining certificate and hostname verification',()=>{
  // A synthetic PEM body tests configuration parsing; live TLS still validates the real certificate.
  const pem='-----BEGIN CERTIFICATE-----\nQUJDRA==\n-----END CERTIFICATE-----';
  for(const value of [pem,pem.replace(/\n/g,'\r\n'),pem.replace(/\n/g,'\\n'),pem.replace(/\n/g,'\\r\\n')]){
    const options=configuredDatabaseSsl({SUPABASE_DB_SSL_CA:value});
    assert.equal(options.ca,pem+'\n');
    assert.equal(options.rejectUnauthorized,true);
    assert.equal('checkServerIdentity' in options,false);
  }
});
test('malformed CA values fail closed without accepting keys, paths, or trust-all settings',()=>{
  for(const value of ['false','rejectUnauthorized=false','C:\\private\\ca.pem','-----BEGIN PRIVATE KEY-----\nQUJDRA==\n-----END PRIVATE KEY-----','-----BEGIN CERTIFICATE-----\n-----END CERTIFICATE-----','-----BEGIN CERTIFICATE-----\n!invalid-body!\n-----END CERTIFICATE-----','private-certificate-placeholder']){
    assert.throws(()=>configuredDatabaseSsl({SUPABASE_DB_SSL_CA:value}),{message:'Invalid database CA certificate configuration.'});
  }
});
