import test from 'node:test';
import assert from 'node:assert/strict';
import {freeCreditGate,maximumRequestCost,type FreePolicy} from '../lib/generation-policy';
const policy={enabled:true,freeVerified:true,monthlyLimitCents:500};
test('No paid generation: unverified, disabled, exhausted, invalid and purchased-credit balances stop',()=>{
 const cases:[FreePolicy,number,number,number,number][]=[[{...policy,enabled:false},5,0,0,10],[{...policy,freeVerified:false},5,0,0,10],[policy,0,0,0,10],[policy,50,0,0,10],[policy,5,490,5,10],[policy,.01,0,0,10],[{...policy,monthlyLimitCents:501},5,0,0,10],[policy,NaN,0,0,10],[policy,5,NaN,0,10],[policy,5,0,-1,10]];
 for(const args of cases)assert.ok(freeCreditGate(...args));
 assert.equal(freeCreditGate(policy,4,100,20,15),null);
});
test('Reservations use current prices and an input-byte/output-token ceiling',()=>{
 assert.equal(maximumRequestCost(10000,5000,{input:'.000001',output:'.000005'}),6);
 assert.throws(()=>maximumRequestCost(10,10,{input:'missing',output:'.01'}));
});
