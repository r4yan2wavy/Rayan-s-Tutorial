export type FreePolicy={enabled:boolean;freeVerified:boolean;monthlyLimitCents:number};
export function freeCreditGate(policy:FreePolicy,balanceDollars:number,spentCents:number,reservedCents:number,requestedCents:number){
 if(!policy.enabled||!policy.freeVerified)return 'Free credits have not been activated and verified.';
 if(!Number.isFinite(balanceDollars)||balanceDollars<=0||balanceDollars>5)return 'A verified free-credit balance is unavailable.';
 if(!Number.isFinite(requestedCents)||requestedCents<=0||!Number.isFinite(spentCents)||spentCents<0||!Number.isFinite(reservedCents)||reservedCents<0||policy.monthlyLimitCents<0||policy.monthlyLimitCents>500)return 'The free-credit budget is invalid.';
 if(spentCents+reservedCents+requestedCents>policy.monthlyLimitCents||requestedCents>balanceDollars*100)return 'The free-credit allowance is exhausted.';
 return null;
}
export function maximumRequestCost(inputCharacters:number,maxOutputTokens:number,pricing:{input:string|number;output:string|number}){
 const input=Number(pricing.input),output=Number(pricing.output);
 if(!Number.isFinite(input)||!Number.isFinite(output)||input<0||output<0||inputCharacters<0||maxOutputTokens<0)throw new Error('Current model prices are required.');
 // UTF-8 byte count supplied by caller is an upper bound on ordinary token count.
 return Math.ceil((inputCharacters*input+maxOutputTokens*output)*100*1.25)+1;
}
