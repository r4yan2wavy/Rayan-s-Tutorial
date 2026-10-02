import test from 'node:test';
import assert from 'node:assert/strict';
import {safeNext,configuredOrigin} from '../lib/auth/redirects';
test('auth destinations reject external, encoded, malformed, and unrecognized paths',()=>{
  for(const next of ['https://evil.example','//evil.example','/\\evil','/%2fevil','/%5cevil','/dashboard%0a','/%','/auth/callback','/admin','/dashboard/../login'])assert.equal(safeNext(next),'/dashboard');
  assert.equal(safeNext('/practice?session=trusted-id#fragment'),'/practice?session=trusted-id');
  assert.equal(safeNext('/results?session=old-id'),'/results?session=old-id');
});
test('production and preview callback origins use trusted deployment configuration',()=>{
  assert.equal(configuredOrigin({NEXT_PUBLIC_SITE_URL:'http://localhost:3000'}),'http://localhost:3000');
  assert.equal(configuredOrigin({VERCEL_ENV:'production',NEXT_PUBLIC_SITE_URL:'https://rayan-example.vercel.app'}),'https://rayan-example.vercel.app');
  assert.equal(configuredOrigin({VERCEL_ENV:'preview',VERCEL_URL:'rayan-branch-team.vercel.app',NEXT_PUBLIC_SITE_URL:'https://production.example'}),'https://rayan-branch-team.vercel.app');
  for(const value of ['http://localhost:3000','http://public.example','https://user:pass@example.com','https://example.com/path','https://example.com?query=yes'])assert.throws(()=>configuredOrigin({VERCEL_ENV:'production',NEXT_PUBLIC_SITE_URL:value}));
  assert.throws(()=>configuredOrigin({VERCEL_ENV:'preview',VERCEL_URL:'evil.example'}));
  assert.throws(()=>configuredOrigin({}));
});
