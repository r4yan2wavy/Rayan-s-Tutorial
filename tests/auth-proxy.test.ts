import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {isAbsolute,join,relative} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {before,after,test} from 'node:test';
import ts from 'typescript';

type Cookie={name:string;value:string;httpOnly?:boolean};
type ProxyResponse={kind:'next'|'redirect';url?:string;headers:Headers;cookies:{getAll():Cookie[]}};
type AuthFixture={claims:{sub:string}|null;verifiedUser:{id:string}|null;claimError?:{message:string};refreshed?:Cookie[]};
type RedirectFixture=Error&{destination:string};
let directory:string,proxy:{updateSession(request:unknown):Promise<ProxyResponse>},driver:{configure(value:AuthFixture):void};
let login:{default(props:{searchParams:Promise<Record<string,string>>}):Promise<{props:{initialAuth:string}}>},signup:typeof login,protectedLayout:{default(props:{children:string}):Promise<string>};

before(async()=>{
  directory=await mkdtemp(join(tmpdir(),'rayans-auth-proxy-test-'));
  await writeFile(join(directory,'stubs.mjs'),`
    let state={claims:null,verifiedUser:null};
    export const configure=value=>{state=value};
    export const publicSupabaseConfig=()=>({url:'https://fixture.invalid',key:'public-fixture-key'});
    export const createServerClient=(_url,_key,options)=>({auth:{async getClaims(){
      if(state.refreshed)options.cookies.setAll(state.refreshed.map(({name,value,...options})=>({name,value,options})),{'Expires':'0','Pragma':'no-cache'});
      return{data:{claims:state.claims},error:state.claimError||null};
    }}});
    export const currentAuthUser=async()=>state.verifiedUser;
    export const ensureProfile=async()=>({});
    export function redirect(destination){throw Object.assign(new Error('Fixture redirect'),{destination})}
    export default function AuthLanding(){}
    function response(kind,url){const values=[];return{kind,url,headers:new Headers(),cookies:{
      getAll:()=>[...values],set(name,value,options){values.push(typeof name==='object'?name:{name,value,...options})}
    }}}
    export const NextResponse={next:()=>response('next'),redirect:url=>response('redirect',url.toString())};
  `);
  await writeFile(join(directory,'jsx.mjs'),"export const jsx=(component,props)=>({component,props});export const jsxs=jsx;");
  const sources:{name:string;path:string}[]=[
    {name:'redirects',path:'../lib/auth/redirects.ts'},
    {name:'proxy',path:'../lib/supabase/proxy.ts'},
    {name:'login',path:'../app/login/page.tsx'},
    {name:'signup',path:'../app/signup/page.tsx'},
    {name:'protected-layout',path:'../app/(protected)/layout.tsx'},
  ];
  for(const entry of sources){
    let source=await readFile(new URL(entry.path,import.meta.url),'utf8');
    source=source.replace(/(['"])(?:@supabase\/ssr|next\/server|next\/navigation|\.\/config|@\/lib\/auth\/user|\.\.\/auth-landing)\1/g,"'./stubs.mjs'")
      .replace(/(['"])@\/lib\/auth\/redirects\1/g,"'./redirects.mjs'");
    const output=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText.replace(/(['"])react\/jsx-runtime\1/g,"'./jsx.mjs'");
    await writeFile(join(directory,entry.name+'.mjs'),output);
  }
  driver=await import(pathToFileURL(join(directory,'stubs.mjs')).href);
  proxy=await import(pathToFileURL(join(directory,'proxy.mjs')).href);
  login=await import(pathToFileURL(join(directory,'login.mjs')).href);
  signup=await import(pathToFileURL(join(directory,'signup.mjs')).href);
  protectedLayout=await import(pathToFileURL(join(directory,'protected-layout.mjs')).href);
});
after(async()=>{if(directory){const child=relative(tmpdir(),directory);if(child.startsWith('..')||isAbsolute(child))throw new Error('Unexpected auth fixture directory');await rm(directory,{recursive:true,force:true})}});
function request(path:string){const values:Cookie[]=[];return{nextUrl:new URL(path,'https://fixture.invalid'),cookies:{getAll:()=>values,set(name:string,value:string){values.push({name,value})}}}}
const claims={sub:'fixture-user'};

test('valid local JWT claims with no authenticated server user can recover on login and signup without a redirect loop',async()=>{
  driver.configure({claims,verifiedUser:null});
  assert.equal((await proxy.updateSession(request('/diagnostic'))).kind,'next');
  await assert.rejects(protectedLayout.default({children:'Protected diagnostic'}),(error:unknown)=>{assert.equal((error as RedirectFixture).destination,'/login');return true});
  for(const[path,page,mode]of [['/login',login,'login'],['/signup',signup,'signup']] as const){
    assert.equal((await proxy.updateSession(request(path+'?next=%2Fdiagnostic'))).kind,'next');
    const rendered=await page.default({searchParams:Promise.resolve({next:'/diagnostic'})});
    assert.equal(rendered.props.initialAuth,mode);
  }
});

test('server-verified users still leave login and signup for their safe destination',async()=>{
  driver.configure({claims,verifiedUser:{id:'fixture-user'}});
  for(const page of [login,signup])await assert.rejects(page.default({searchParams:Promise.resolve({next:'/diagnostic'})}),(error:unknown)=>{assert.equal((error as RedirectFixture).destination,'/diagnostic');return true});
  assert.equal(await protectedLayout.default({children:'Protected diagnostic'}),'Protected diagnostic');
});

test('missing claims still protect diagnostic pages and preserve refreshed cookies on redirects',async()=>{
  const refreshed:Cookie[]=[{name:'fixture-auth-cookie',value:'fixture-only',httpOnly:true}];
  driver.configure({claims:null,verifiedUser:null,refreshed});
  const response=await proxy.updateSession(request('/diagnostic?session=fixture-session'));
  assert.equal(response.kind,'redirect');
  const destination=new URL(response.url!);assert.equal(destination.pathname,'/login');assert.equal(destination.searchParams.get('next'),'/diagnostic?session=fixture-session');
  assert.deepEqual(response.cookies.getAll(),refreshed);
  assert.equal(response.headers.get('Cache-Control'),'private, no-store');assert.equal(response.headers.get('Expires'),'0');assert.equal(response.headers.get('Pragma'),'no-cache');
  assert.equal((await proxy.updateSession(request('/login'))).kind,'next');
});
