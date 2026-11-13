import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync, spawn } from 'node:child_process';
import assert from 'node:assert/strict';

const bin = process.env.TEST_PG_BIN || ['/opt/homebrew/opt/postgresql@16/bin','/usr/lib/postgresql/16/bin','/usr/lib/postgresql/17/bin'].find(x=>existsSync(join(x,'initdb')));
if (!bin) throw Error('A local PostgreSQL installation is required for isolated database tests (TEST_PG_BIN).');
const dir=mkdtempSync(join(tmpdir(),'regaleria-db-test-')); const port='55447';
const env={...process.env,PGHOST:dir,PGPORT:port,PGDATABASE:'postgres',PGUSER:process.env.USER||'postgres',PGPASSWORD:'',PGSSLMODE:'disable',PGOPTIONS:'',DATABASE_URL:'',DIRECT_URL:''};
function run(exe,args,options={}){const r=spawnSync(join(bin,exe),args,{encoding:'utf8',env,...options});if(r.status!==0)throw Error(`${exe} failed: ${r.stderr}`);return r.stdout;}
function sql(query){return run('psql',['-X','-q','-v','ON_ERROR_STOP=1','-t','-A'],{input:query});}
try {
  run('initdb',['-D',join(dir,'data'),'--auth-local=trust','--auth-host=reject','--no-instructions']);
  run('pg_ctl',['-D',join(dir,'data'),'-l',join(dir,'server.log'),'-o',`-k ${dir} -p ${port} -c listen_addresses=`, 'start']);
  const v2=join(dir,'commerce-v2.sql');
  writeFileSync(v2,readFileSync('supabase/storefront-commerce-v2.sql','utf8').replace('create extension if not exists pg_cron;','-- pg_cron scheduling is verified separately on hosted Postgres.'));
  const bootstrap=readFileSync('tests/database/bootstrap.sql','utf8').replace(/^\\ir (.+)$/gm,(_,p)=>'\\i '+(p.endsWith('storefront-commerce-v2.sql')?v2:resolve('tests/database',p)));
  sql(bootstrap);
  run('psql',['-X','-q','-v','ON_ERROR_STOP=1','-f',resolve('tests/database/assertions.sql')]);
  console.log('Database: authorization, capital privacy, missing IDs, mandatory versions, atomic catalog rollback, SKU uniqueness, audit preservation, public response passed.');
  const rev=sql("select updated_at from public.operational_state where id='main'").trim();
  const query=(label)=>`begin;set local role authenticated;select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}',true);select public.save_operational_state_v2(jsonb_set(public.load_operational_state_v2()->'data','{categories}',to_jsonb(array['${label}']::text[])),'${rev}');select pg_sleep(0.2);commit;`;
  const simultaneous=(q)=>new Promise(resolve=>{const c=spawn(join(bin,'psql'),['-X','-q','-v','ON_ERROR_STOP=1'],{env});let stderr='';c.stderr.on('data',b=>stderr+=b);c.stdout.resume();c.on('exit',status=>resolve({status,stderr}));c.stdin.end(q);});
  const results=await Promise.all([simultaneous(query('first')),simultaneous(query('second'))]);
  assert.equal(results.filter(x=>x.status===0).length,1,'exactly one writer must commit');
  assert.match(results.find(x=>x.status!==0).stderr,/changed remotely/);
  console.log('Database: simultaneous writers passed (one committed, one rejected; no last-writer overwrite).');
} finally {
  spawnSync(join(bin,'pg_ctl'),['-D',join(dir,'data'),'-m','fast','stop'],{env,encoding:'utf8'});
  rmSync(dir,{recursive:true,force:true});
}
