export type QueryResult={rows:Record<string,unknown>[];rowCount:number|null};
export type Executor=(text:string,values:unknown[])=>Promise<QueryResult>;
export type Transaction=<T>(operation:(execute:Executor)=>Promise<T>)=>Promise<T>;
// Port parameterized assessment queries; user input is never interpolated.
export function postgresStatement(source:string,values:unknown[],previousChanges=0){
  const ignore=/^INSERT OR IGNORE /i.test(source);
  let text=source.replace(/^INSERT OR IGNORE /i,'INSERT ')
    .replace(/json_extract\((\w+),'\$\.finalizationToken'\)/g,"($1::jsonb->>'finalizationToken')")
    .replace(/SELECT value FROM json_each\(\?\)/g,'SELECT value FROM jsonb_array_elements_text(?::jsonb) AS excluded_ids(value)')
    .replace(/changes\(\)=1/g,previousChanges===1?'TRUE':'FALSE')
    .replace(/ROUND\(AVG\(a\.seconds\),1\)/g,'ROUND(AVG(a.seconds)::numeric,1)')
    .replace(/ LIKE /g,' ILIKE ');
  if(text.startsWith('INSERT INTO rate_limits'))text=text.replaceAll('expires<?','rate_limits.expires<?').replaceAll('count+1','rate_limits.count+1').replace('ELSE expires END','ELSE rate_limits.expires END');
  if(text.startsWith('INSERT INTO question_exposure'))text=text.replace('times_seen+CASE WHEN session_id=excluded.session_id','question_exposure.times_seen+CASE WHEN question_exposure.session_id=excluded.session_id');
  if(ignore)text+=' ON CONFLICT DO NOTHING';
  let index=0,quote=false,result='';
  for(let i=0;i<text.length;i++){const c=text[i];if(c==="'"){if(quote&&text[i+1]==="'"){result+="''";i++;continue}quote=!quote}result+=c==='?'&&!quote?'$'+(++index):c}
  if(index!==values.length)throw new Error('Database parameter count mismatch.');
  return {text:result,values};
}
const numeric=new Set(['created','updated','expires','first_seen','last_seen','count','n','attempts','retries','correct_retries','accuracy','seconds']);
function normalize(rows:Record<string,unknown>[]){return rows.map(row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[key,numeric.has(key)&&typeof value==='string'&&/^-?\d+(\.\d+)?$/.test(value)?Number(value):value])))}
class Statement{
  constructor(readonly owner:ApplicationDatabase,readonly source:string,readonly values:unknown[]=[]){ }
  bind(...values:unknown[]){return new Statement(this.owner,this.source,values)}
  async first(){return(await this.owner.batch([this]))[0].results[0]??null}
  async all(){return{results:(await this.owner.batch([this]))[0].results}}
  async run(){return(await this.owner.batch([this]))[0]}
}
export class ApplicationDatabase{
  constructor(private readonly transaction:Transaction){}
  prepare(source:string){return new Statement(this,source)}
  async batch(statements:Statement[]){
    if(!statements.length)return[];
    return this.transaction(async execute=>{let changes=0;const results=[];for(const statement of statements){const compiled=postgresStatement(statement.source,statement.values,changes);const result=await execute(compiled.text,compiled.values);changes=result.rowCount??0;results.push({results:normalize(result.rows),meta:{changes}})}return results});
  }
}
