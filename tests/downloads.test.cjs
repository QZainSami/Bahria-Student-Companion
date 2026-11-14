const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),Core=require('../core');
function setup(){let options,created,released=[];const URLMock=class extends URL{};URLMock.createObjectURL=blob=>{created=blob;return 'blob:fixture'};URLMock.revokeObjectURL=url=>released.push(url);const timers=[];const c=vm.createContext({Core,atob,btoa,TextDecoder,Uint8Array,Blob,URL:URLMock,AbortSignal,setTimeout:f=>timers.push(f),fetch:async()=>new Response('%PDF-1.7\nreal file bytes',{headers:{'Content-Type':'application/octet-stream','Content-Disposition':'attachment; filename="Download.php"'}}),browser:{downloads:{async download(o){options=o;return 42}}}});vm.runInContext(fs.readFileSync(path.join(__dirname,'../downloads.js'),'utf8')+'\nglobalThis.api=FileDownload',c);return {api:c.api,get options(){return options},get blob(){return created},timers,released};}
test('PHP endpoint downloads real bytes using topic name and detected PDF suffix',async()=>{const f=setup();const id=await f.api.start({url:'https://lms.bahria.edu.pk/Download.php?id=1',filename:'Download.php'},'3 A - Regular Expression','Bahria/Automata');assert.equal(id,42);assert.equal(f.options.filename,'Bahria/Automata/3 A - Regular Expression.pdf');assert.equal(f.options.url,'blob:fixture');assert.equal(await f.blob.text(),'%PDF-1.7\nreal file bytes');f.timers[0]();assert.equal(f.released[0],'blob:fixture');});
test('original file extension is read from response headers',()=>{const {api}=setup();assert.equal(api.identify(new Uint8Array([1,2]),'application/octet-stream','attachment; filename="random.pptx"','Download.php'),'pptx');assert.equal(api.headerName("attachment; filename*=UTF-8''Lecture%20one.pdf"),'Lecture one.pdf');});
test('Office ZIP contents identify real format',()=>{const {api}=setup();assert.equal(api.identify(new TextEncoder().encode('PK\x03\x04ppt/slides/slide1.xml'),'application/octet-stream','','Download.php'),'pptx');});
test('login pages and PHP errors are rejected instead of saved',()=>{const {api}=setup();for(const body of ['<!DOCTYPE html><html>Login</html>','<html>Sign in</html>','Warning: session expired'])assert.throws(()=>api.identify(new TextEncoder().encode(body),'text/html','','Download.php'));});
test('assignment titles produce safe filenames without double suffixes',()=>{const {api}=setup();assert.equal(api.filename('Lab 7: Strings','pdf'),'Lab 7_ Strings.pdf');assert.equal(api.filename('Lab.pdf','pdf'),'Lab.pdf');});


test('encoded LMS download bypasses fetch and preserves assignment title and docx type',async()=>{
 const f=setup();const token=btoa('7,2026-11-04,Assignment,0,original-upload.docx,lms.bahria.edu.pk/Student/Assignments.php');
 const url='https://lms.bahria.edu.pk/Student/Download.php?k='+encodeURIComponent(token);
 const referrer='https://lms.bahria.edu.pk/Student/Assignments.php?oc=course';
 await f.api.start({url,filename:'Download.php',referrer},'D&C and Greedy Algorithms','Bahria/Algorithms/Assignments');
 assert.equal(f.options.url,url);assert.equal(f.options.filename,'Bahria/Algorithms/Assignments/D&C and Greedy Algorithms.docx');assert.equal(f.options.headers[0].value,referrer);assert.equal(f.blob,undefined);
});
test('invalid tokens do not produce guessed extensions',()=>{assert.equal(setup().api.tokenExtension('https://lms.bahria.edu.pk/Student/Download.php?k=invalid'),'');});
test('network failure falls back to the logged-in tab and saves the returned bytes',async()=>{
 let options,injection;
 const U=class extends URL{};U.createObjectURL=()=> 'blob:tab';U.revokeObjectURL=()=>{};
 const context=vm.createContext({Core,atob,btoa,TextDecoder,Uint8Array,Blob,URL:U,AbortSignal,setTimeout:()=>{},fetch:async()=>{throw Error('NetworkError when attempting to fetch resource.');},browser:{tabs:{async query(){return [{id:5,active:true}]}},scripting:{async executeScript(opts){injection=opts;return [{result:{ok:true,url:opts.args[0],base64:btoa('%PDF-1.7 test'),mime:'application/pdf',disposition:''}}]}},downloads:{async download(opts){options=opts;return 8;}}}});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../downloads.js'),'utf8')+'\nglobalThis.api=FileDownload',context);
 const result=await context.api.start({url:'https://lms.bahria.edu.pk/Student/Download.php?id=7'},'Lab 7','Bahria/Test/Assignments');
 assert.equal(result,8);assert.equal(injection.target.tabId,5);assert.equal(options.filename,'Bahria/Test/Assignments/Lab 7.pdf');
});
