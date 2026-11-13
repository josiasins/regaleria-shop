import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { parseEnv } from 'node:util';

const configured={};for(const file of ['.env','.env.local'])if(fs.existsSync(file))Object.assign(configured,parseEnv(fs.readFileSync(file,'utf8')));
Object.assign(configured,process.env);
const connection=new URL(configured.DIRECT_URL||configured.DATABASE_URL||'');
const env={...process.env,PGHOST:connection.hostname,PGPORT:connection.port||'5432',PGDATABASE:connection.pathname.slice(1),PGUSER:decodeURIComponent(connection.username),PGPASSWORD:decodeURIComponent(connection.password),PGSSLMODE:'verify-full',PGSSLROOTCERT:new URL('./certs/supabase-ca.crt',import.meta.url).pathname,PGCONNECT_TIMEOUT:'15',PGOPTIONS:''};
const dir=path.resolve(configured.BACKUP_DIR||'backups');fs.mkdirSync(dir,{recursive:true,mode:0o700});
const candidates=[configured.PG_DUMP_BIN,'/opt/homebrew/opt/libpq/bin/pg_dump','/usr/bin/pg_dump','pg_dump'].filter(Boolean);
const dump=candidates.find(exe=>spawnSync(exe,['--version'],{encoding:'utf8'}).status===0);
if(!dump)throw Error('No compatible pg_dump installation found.');
const restore=path.isAbsolute(dump)?path.join(path.dirname(dump),'pg_restore'):'pg_restore';
const stamp=new Date().toISOString().replace(/[:.]/g,'-');const file=path.join(dir,`regaleria-${stamp}.dump`);const partial=file+'.partial';
const statusFile=path.join(dir,'latest-status.json');
const status={startedAt:new Date().toISOString(),databaseVerified:false,storageVerified:false,databaseFile:file,storageFiles:0};
function statusWrite(){fs.writeFileSync(statusFile,JSON.stringify(status,null,2)+'\n',{mode:0o600});}
function query(sql){const r=spawnSync(fs.existsSync('/opt/homebrew/opt/libpq/bin/psql')?'/opt/homebrew/opt/libpq/bin/psql':'psql',['-X','-q','-t','-A','-v','ON_ERROR_STOP=1'],{env,input:sql,encoding:'utf8',timeout:30000});if(r.status!==0)throw Error('Could not read backup inventory.');return r.stdout.trim();}
try{
  const r=spawnSync(dump,['--format=custom','--no-owner','--no-acl','--file='+partial],{env,encoding:'utf8',timeout:180000});
  if(r.status!==0)throw Error('Database backup did not finish; no completed dump was reported.');
  const toc=spawnSync(restore,['--list',partial],{encoding:'utf8'});
  if(toc.status!==0||!toc.stdout.includes('operational_state')||fs.statSync(partial).size===0)throw Error('Backup verification failed.');
  fs.renameSync(partial,file);fs.chmodSync(file,0o600);status.databaseVerified=true;
  status.databaseSha256=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');statusWrite();
  if(process.argv.includes('--storage')){
    const base=new URL(configured.VITE_SUPABASE_URL);const storageDir=path.join(dir,'storage','product-images');fs.mkdirSync(storageDir,{recursive:true,mode:0o700});
    const objects=JSON.parse(query("begin read only; select coalesce(jsonb_agg(jsonb_build_object('name',name,'updatedAt',updated_at)),'[]') from storage.objects where bucket_id='product-images'; rollback;"));
    const privateCount=Number(query("begin read only; select count(*) from storage.objects where bucket_id<>'product-images'; rollback;"));
    const inventory=[];let cursor=0;
    await Promise.all(Array.from({length:4},async()=>{while(cursor<objects.length){const obj=objects[cursor++];const id=crypto.createHash('sha256').update(obj.name+'\0'+obj.updatedAt).digest('hex');const target=path.join(storageDir,id);
      if(!fs.existsSync(target)){const url=new URL('/storage/v1/object/public/product-images/'+obj.name.split('/').map(encodeURIComponent).join('/'),base);const response=await fetch(url,{signal:AbortSignal.timeout(60000),redirect:'error'});if(!response.ok)throw Error('A storage object could not be downloaded.');const bytes=Buffer.from(await response.arrayBuffer());fs.writeFileSync(target+'.partial',bytes,{mode:0o600});fs.renameSync(target+'.partial',target);}
      const bytes=fs.readFileSync(target);inventory.push({...obj,file:id,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
    }}));
    fs.writeFileSync(path.join(dir,`storage-${stamp}.json`),JSON.stringify({bucket:'product-images',objects:inventory,privateObjectsNotExported:privateCount},null,2),{mode:0o600});
    status.storageFiles=inventory.length;status.storageVerified=privateCount===0;
    if(privateCount)throw Error('Private files need an authenticated export; database and public images were backed up.');
  }
  status.completedAt=new Date().toISOString();statusWrite();
  console.log(JSON.stringify({databaseVerified:status.databaseVerified,databaseFile:file,storageVerified:status.storageVerified,storageFiles:status.storageFiles}));
}catch(error){status.failedAt=new Date().toISOString();status.error=error.message;statusWrite();console.error(error.message);process.exitCode=1;}
