import fs from 'node:fs';
import { parseEnv } from 'node:util';
import { spawnSync } from 'node:child_process';
export function databaseEnvironment() {
  const configured={};for(const file of ['.env','.env.local'])if(fs.existsSync(file))Object.assign(configured,parseEnv(fs.readFileSync(file,'utf8')));
  Object.assign(configured,process.env);const u=new URL(configured.DIRECT_URL||configured.DATABASE_URL||'');
  return {configured,env:{...process.env,PGHOST:u.hostname,PGPORT:u.port||'5432',PGDATABASE:u.pathname.slice(1),PGUSER:decodeURIComponent(u.username),PGPASSWORD:decodeURIComponent(u.password),PGSSLMODE:'verify-full',PGSSLROOTCERT:new URL('./certs/supabase-ca.crt',import.meta.url).pathname,PGCONNECT_TIMEOUT:'15',PGOPTIONS:''}};
}
export function databaseQuery(query,{write=false,env=databaseEnvironment().env}={}) {
  const r=spawnSync(fs.existsSync('/opt/homebrew/opt/libpq/bin/psql')?'/opt/homebrew/opt/libpq/bin/psql':'psql',['-X','-q','-t','-A','-v','ON_ERROR_STOP=1'],{env,input:`BEGIN${write?'':' READ ONLY'};\n${query}\nCOMMIT;`,encoding:'utf8',timeout:90000,maxBuffer:30*1024*1024});
  if(r.status!==0)throw Error('Database operation rejected; transaction rolled back.');return r.stdout.trim();
}
