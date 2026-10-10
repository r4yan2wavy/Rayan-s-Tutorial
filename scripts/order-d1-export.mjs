// D1 defers missing *rows*, but cannot insert into a table whose foreign-key
// parent table does not exist. Put every table definition before any data.
// Scan quoted SQL values so a semicolon/newline in a student's text is preserved.
export function orderD1Export(sql){
  const statements=[];
  let start=0,quote='',lineComment=false,blockComment=false;
  for(let i=0;i<sql.length;i++){
    const c=sql[i],next=sql[i+1];
    if(lineComment){if(c==='\n')lineComment=false;continue;}
    if(blockComment){if(c==='*'&&next==='/'){blockComment=false;i++;}continue;}
    if(quote){
      const closing=quote==='['?']':quote;
      if(c===closing){if(quote!=='['&&next===closing)i++;else quote='';}
      continue;
    }
    if(c==='-'&&next==='-'){lineComment=true;i++;continue;}
    if(c==='/'&&next==='*'){blockComment=true;i++;continue;}
    if(["'",'"','`','['].includes(c)){quote=c;continue;}
    if(c===';'){const value=sql.slice(start,i+1).trim();if(value)statements.push(value);start=i+1;}
  }
  if(quote||blockComment||sql.slice(start).trim())throw Error('Incomplete SQL export; preserve the original file and investigate.');
  const tables=[],data=[],indexes=[];
  for(const statement of statements){
    const command=statement.replace(/^(?:\s*--[^\n]*\n|\s*\/\*[\s\S]*?\*\/)*\s*/,'');
    if(/^PRAGMA\s+defer_foreign_keys\s*=/i.test(command))continue;
    if(/^CREATE\s+TABLE\b/i.test(command))tables.push(statement);
    else if(/^INSERT\s+INTO\b/i.test(command))data.push(statement);
    else if(/^CREATE\s+(?:UNIQUE\s+)?INDEX\b/i.test(command))indexes.push(statement);
    else throw Error('Unexpected SQL statement in export. The original backup is preserved; review it before restoring.');
  }
  if(!tables.length)throw Error('No table definitions in the export.');
  return ['PRAGMA defer_foreign_keys=TRUE;',...tables,...data,...indexes,'PRAGMA defer_foreign_keys=FALSE;',''].join('\n');
}
