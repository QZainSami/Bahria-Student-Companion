const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function fixture(fetch, downloader){let listener;const data={assignments:[{title:'Keep me'}]};const event={addListener(){}};const browser={storage:{local:{async get(){return structuredClone(data)},async set(d){Object.assign(data,d)}},onChanged:event},downloads:{onChanged:event},runtime:{onMessage:{addListener(f){listener=f}},onInstalled:event},alarms:{onAlarm:event},action:{}};const context=vm.createContext({browser,fetch,FileDownload:downloader,DOMParser:class{parseFromString(){return {querySelector(){return null}}}},URL,Date,Map,console,AbortSignal,setTimeout});vm.runInContext(fs.readFileSync(path.join(__dirname,'../core.js'),'utf8')+'\n'+fs.readFileSync(path.join(__dirname,'../background.js'),'utf8'),context);return {data,send:m=>listener(m,{})};}
test('network failure preserves assignments and clears busy state',async()=>{const f=fixture(async()=>{throw Error('offline')});const r=await f.send({type:'sync',kind:'lms'});assert.equal(r.ok,false);assert.equal(f.data.assignments[0].title,'Keep me');assert.equal(f.data.lmsJob.busy,false);assert.match(f.data.lmsJob.error,/offline/);});
test('concurrent refreshes share one network request',async()=>{let calls=0,release;const gate=new Promise(r=>release=r);const f=fixture(async()=>{calls++;await gate;throw Error('offline')});const a=f.send({type:'sync',kind:'cms'}),b=f.send({type:'sync',kind:'cms'});await new Promise(r=>setTimeout(r,5));release();await Promise.all([a,b]);assert.equal(calls,1);});
test('unknown sync and unscanned download rejected',async()=>{const f=fixture(async()=>{});assert.equal((await f.send({type:'sync',kind:'evil'})).ok,false);assert.equal((await f.send({type:'download',url:'https://evil.example/'})).ok,false);});
test('lecture scanning explains missing page URL',async()=>{const f=fixture(async()=>{});const r=await f.send({type:'sync',kind:'files'});assert.equal(r.ok,false);assert.match(r.error,/Lecture Notes/);});

test('login redirect reports expired session without clearing cache',async()=>{const f=fixture(async()=>({ok:true,url:'https://lms.bahria.edu.pk/Login.php',async text(){return '<html></html>'}}));const r=await f.send({type:'sync',kind:'lms'});assert.equal(r.ok,false);assert.equal(f.data.lmsSession.state,'expired');assert.equal(f.data.assignments[0].title,'Keep me');});

test('selected lectures all download through one background batch',async()=>{
 const calls=[];const f=fixture(async()=>{},{async start(file){calls.push(file.url);return calls.length;}});
 f.data.files=[1,2,3].map(n=>({url:'https://lms.bahria.edu.pk/Download.php?id='+n,course:'AI',title:'Topic '+n}));
 const selected=f.data.files.map(({url,course})=>({url,course}));
 const r=await f.send({type:'download_batch',files:selected});
 assert.equal(r.ok,true);assert.equal(r.started,3);assert.equal(calls.length,3);assert.equal(f.data.lectureBatch.busy,false);assert.equal(f.data.lectureBatch.processed,3);
});
test('a failed lecture does not stop the remaining selected files',async()=>{
 const calls=[];const f=fixture(async()=>{},{async start(file){calls.push(file.url);if(file.url.endsWith('2'))throw Error('Unavailable file');return calls.length;}});
 f.data.files=[1,2,3].map(n=>({url:'https://lms.bahria.edu.pk/Download.php?id='+n,course:'AI',title:'Topic '+n}));
 const r=await f.send({type:'download_batch',files:f.data.files.map(({url,course})=>({url,course}))});
 assert.equal(r.started,2);assert.equal(calls.length,3);assert.equal(r.failures.length,1);assert.equal(r.failures[0].error,'Unavailable file');
});
test('batch snapshots selection before the caller changes it',async()=>{
 const calls=[];const f=fixture(async()=>{},{async start(file){calls.push(file.url);return calls.length;}});
 f.data.files=[1,2].map(n=>({url:'https://lms.bahria.edu.pk/Download.php?id='+n,course:'AI',title:'Topic '+n}));
 const selected=f.data.files.map(({url,course})=>({url,course}));
 const promise=f.send({type:'download_batch',files:selected});selected[1].url='https://evil.example/';selected.length=0;
 const r=await promise;assert.equal(r.started,2);assert.equal(calls[1],'https://lms.bahria.edu.pk/Download.php?id=2');
});
