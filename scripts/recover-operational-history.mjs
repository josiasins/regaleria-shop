import fs from 'node:fs';import crypto from 'node:crypto';import {spawnSync} from 'node:child_process';import {databaseQuery} from './database-env.mjs';
const source=process.argv[2];if(!source||!fs.existsSync(source))throw Error('Provide the verified historical dump. Defaults to preview; --apply requires --expected=<state hash>.');
const fields=['sales','quotes','transfers','expenses','movements','onlineOrders','purchaseReceipts','customers','suppliers','cashClosures','cashShifts','supplierPayments','capitalEntries','emailMessages','salesAuditEntries','operationAuditEntries'];
const blocked=new Set(['sale_001','sale_002','quote_001','tr_001','exp_001','exp_002','mov_001','mov_002','cust_claudia','cust_empresa_norte']);
const read=spawnSync('/opt/homebrew/opt/libpq/bin/pg_restore',['--data-only','--table=operational_state','--file=-',source],{encoding:'utf8',maxBuffer:30*1024*1024});if(read.status!==0)throw Error('Historical dump could not be read.');
const row=read.stdout.split('\n').find(x=>x.startsWith('main\t'));if(!row)throw Error('No main operational row in the dump.');
const unescapeCopy=s=>s.replace(/\\([btnrfv\\])/g,(_,c)=>({b:'\b',t:'\t',n:'\n',r:'\r',f:'\f',v:'\v','\\':'\\'}[c]));
const old=JSON.parse(unescapeCopy(row.split('\t')[1]));
const current=JSON.parse(databaseQuery("select jsonb_build_object('hash',md5(data::text),'data',data) from public.operational_state where id='main';"));
const candidate=structuredClone(current.data);const report={source,sourceSha256:crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex'),expectedCurrentHash:current.hash,fields:{}};
for(const field of fields){if(!Array.isArray(old[field])||!Array.isArray(candidate[field]))throw Error('Invalid historical arrays.');const existing=new Set(candidate[field].map(x=>x.id));const missing=old[field].filter(x=>!blocked.has(x.id)&&!existing.has(x.id));const collisions=old[field].filter(x=>existing.has(x.id)&&JSON.stringify(x)!==JSON.stringify(candidate[field].find(y=>y.id===x.id))).length;candidate[field].push(...missing);report.fields[field]={before:current.data[field].length,added:missing.length,after:candidate[field].length,existingRecordsKept:collisions};}
fs.mkdirSync('backups',{recursive:true,mode:0o700});fs.writeFileSync('backups/recovery-plan-20261112.json',JSON.stringify(report,null,2),{mode:0o600});
if(process.argv.includes('--apply')){
 const expected=process.argv.find(x=>x.startsWith('--expected='))?.slice(11);if(expected!==current.hash)throw Error('Review the preview and supply its matching expected state hash.');
 const tag='recovery_'+crypto.randomBytes(12).toString('hex');const data=JSON.stringify(candidate);if(data.includes('$'+tag+'$'))throw Error('Unsafe recovery delimiter.');
 databaseQuery(`select set_config('app.change_reason','Recovery of missing historical IDs from verified 2026-07-30 backup; preserve current catalog and existing records',true);
 do $guard$ begin perform 1 from public.operational_state where id='main' for update; if (select md5(data::text) from public.operational_state where id='main')<>'${expected}' then raise exception 'State changed; re-preview recovery'; end if; end $guard$;
 update public.operational_state set data=jsonb_set($${tag}$${data}$${tag}$::jsonb,'{updatedAt}',to_jsonb(clock_timestamp()::text)),updated_at=clock_timestamp() where id='main';`,{write:true});
 report.applied=true;
}
console.log(JSON.stringify(report,null,2));
