const LMS='https://lms.bahria.edu.pk/Student/Assignments.php';
const CMS='https://cms.bahria.edu.pk/Sys/Student/ClassAttendance/StudentWiseAttendance.aspx';
const jobs=new Map();
let backgroundReady=Promise.resolve();
const defaults={autoSync:true,reminders:true,lectureUrl:''};
async function state(){return browser.storage.local.get(null);}
async function settings(){return {...defaults,...(await state()).settings};}
async function status(portal,value){const key=portal+'Session';await browser.storage.local.set({[key]:{...value,checked:Date.now()}});}
async function fetchPortalPage(url){
 try{const r=await fetch(url,{credentials:'include',cache:'no-store',signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error('Portal returned HTTP '+r.status);return {ok:true,url:r.url,html:await r.text()};}
 catch(error){return {ok:false,error:error.message};}
}
async function page(url){
 Core.portalUrl(url);
 let r;
 try{r=await fetch(url,{credentials:'include',signal:AbortSignal.timeout(25000),cache:'no-store'});}
 catch(error){
  const host=new URL(url).hostname;
  const tabs=browser.tabs?.query?await browser.tabs.query({url:'https://'+host+'/*'}):[];
  const tab=tabs.find(t=>t.active)||tabs[0];if(!tab)throw error;
  const result=(await browser.scripting.executeScript({target:{tabId:tab.id},func:fetchPortalPage,args:[url]}))?.[0]?.result;
  if(!result?.ok)throw Error(result?.error||'The portal tab could not load this page.');
  r={ok:true,url:result.url,text:async()=>result.html};
 }
 if(!r.ok)throw Error('Portal returned HTTP '+r.status+'. Try again later.');
 const doc=new DOMParser().parseFromString(await r.text(),'text/html');
 if(new URL(r.url).hostname!==new URL(url).hostname || /login|signin/i.test(new URL(r.url).pathname) || doc.querySelector('input[type=password]')){const e=Error('Session expired. Open the portal and log in, then sync again.');e.expired=true;throw e;}
 return {doc,url:r.url};
}
function courseSelect(doc){return doc.querySelector('#courseId,#course,select[name=courseName]')||([...doc.querySelectorAll('select')][1]);}
async function syncLms(){
 const {doc}=await page(LMS),select=courseSelect(doc);
 if(!select)throw Error('Course list not found. Log in to LMS or check that assignments are available.');
 const courses=[...select.options].filter(o=>o.value && !/select\s*course/i.test(o.textContent)).map(o=>({id:o.value,name:o.textContent.trim()}));
 if(!courses.length)throw Error('No courses found. Previous assignments have been kept.');
 const all=[];
 for(const [index,c] of courses.entries()){
  await progress('lms',index+1,courses.length,c.name);
  const url=coursePageUrl(LMS,doc,c.id);
  const result=await page(url.href);
  if(!courseSelect(result.doc))throw Error('Course page was not recognized. Previous assignments have been kept.');
  all.push(...parseTableRows([...result.doc.querySelectorAll('table tr')],c.name,url.href));
 }
 const unique=[...new Map(all.map(a=>[a.course+'|'+a.title+'|'+a.deadline,a])).values()];
 const lectureLink=[...doc.querySelectorAll('a[href]')].find(a=>/lecture\s*notes/i.test(a.textContent));
 const extra={};if(lectureLink){try{extra.discoveredLectureUrl=Core.portalUrl(new URL(lectureLink.getAttribute('href'),LMS).href,'lms.bahria.edu.pk');}catch{}}
 await browser.storage.local.set({assignments:unique,courses,lmsSynced:Date.now(),...extra});
 return unique.length;
}
async function syncCms(){
 const {doc}=await page(CMS);const records=parseAttendance(doc);
 if(!records.length)throw Error('No readable attendance records found on CMS. Saved attendance has not been changed.');
 const attendance=records.map(r=>({...r,classesToRecover:Math.max(0,Math.ceil(3*r.total-4*r.attended)),sessionsLeft:Math.floor(r.absentLeft/3)}));
 await browser.storage.local.set({attendance,cmsSynced:Date.now()});return attendance.length;
}
async function syncFiles(){
 const s=await state(),config=await settings();
 if(!config.lectureUrl&&!s.discoveredLectureUrl)throw Error('Sync assignments first to discover Lecture Notes, or enter its URL in Sessions & settings.');
 const url=Core.portalUrl(config.lectureUrl||s.discoveredLectureUrl,'lms.bahria.edu.pk');
 const first=await page(url);const select=courseSelect(first.doc);
 const pages=select?[...select.options].filter(o=>o.value&&!/select\s*course/i.test(o.textContent)).map(o=>({id:o.value,name:o.textContent.trim()})):[{name:'Lecture notes'}];
 const files=[];
 for(const [index,c] of pages.entries()){
  await progress('files',index+1,pages.length,c.name);
  const u=coursePageUrl(url,first.doc,c.id);
  const result=c.id?await page(u.href):first;
  for(const f of parseLectureFiles(result.doc,result.url,c.name)){
   const old=(s.files||[]).find(old=>Core.fileIdentity(old.url)===Core.fileIdentity(f.url)&&old.course===f.course);
   files.push({...f,isNew:old?old.isNew:true,downloaded:old?.downloaded||false});
  }
 }
 const unique=[...new Map(files.map(f=>[f.course+'|'+f.url,f])).values()];
 await browser.storage.local.set({files:unique,filesSynced:Date.now()});return unique.length;
}
async function progress(kind,current,total,course){
 await browser.storage.local.set({[kind+'Job']:{busy:true,error:'',current,total,course}});
}
async function run(kind){
 if(jobs.has(kind))return jobs.get(kind);
 const portal=kind==='cms'?'cms':'lms';
 const task=(async()=>{
  await browser.storage.local.set({[kind+'Job']:{busy:true,error:''}});
  try{const count=await ({lms:syncLms,cms:syncCms,files:syncFiles}[kind])();await status(portal,{state:'connected',message:'Portal responded successfully'});return {count};}
  catch(e){if(e.expired)await status(portal,{state:'expired',message:e.message});throw e;}
 })();jobs.set(kind,task);
 try{const r=await task;await browser.storage.local.set({[kind+'Job']:{busy:false,error:'',count:r.count,finished:Date.now()}});return r;}
 catch(e){await browser.storage.local.set({[kind+'Job']:{busy:false,error:e.message}});throw e;}
 finally{jobs.delete(kind);}
}
async function checkSessions(){
 for(const [portal,url] of [['lms',LMS],['cms',CMS]]){
 try{const {doc}=await page(url);const recognized=portal==='lms'?courseSelect(doc):[...doc.querySelectorAll('table')].some(t=>/presenthours/i.test(t.textContent.replace(/\s+/g,'')));await status(portal,{state:recognized?'connected':'unknown',message:recognized?'Logged-in page available':'Page layout not recognized; open the portal to check.'});}
 catch(e){await status(portal,{state:e.expired?'expired':'unavailable',message:e.message});}
 }
}
async function reminders(){
 const s=await state();
 const cutoff=Date.now()-14*86400000;
 const shown=Object.fromEntries(Object.entries(s.shown||{}).filter(([,time])=>Number.isFinite(time)&&time>=cutoff));
 if(!(await settings()).reminders){if(Object.keys(shown).length!==Object.keys(s.shown||{}).length)await browser.storage.local.set({shown});return;}
 for(const a of Core.pending(s.assignments||[])){
  const days=Math.ceil((Date.parse(a.deadline)-Date.now())/86400000);
  if(![0,1,2,3].includes(days))continue;
  const key=JSON.stringify([a.course,a.title,a.deadline,days]);if(shown[key])continue;
  await browser.notifications.create({type:'basic',iconUrl:'icon.png',title:days<=1?'Assignment due soon':'Upcoming assignment',message:a.course+': '+a.title});shown[key]=Date.now();
 }
 await browser.storage.local.set({shown});
}
async function openCmsLogin(){
 const tabs=await browser.tabs.query({url:'https://cms.bahria.edu.pk/*'});
 const tab=tabs.find(t=>t.active)||tabs[0];
 if(tab){
  await browser.tabs.update(tab.id,{url:CMS,active:true});
  // Firefox for Android has tabs but does not need a desktop-window focus request.
  if(tab.windowId!=null&&browser.windows?.update)await browser.windows.update(tab.windowId,{focused:true});
 }
 else await browser.tabs.create({url:CMS});
}
async function freshDownloadLink(file,cache){
 const token=Core.fileToken(file.url);
 if(!token)return file;
 const source=Core.portalUrl(file.sourcePage||token.source,'lms.bahria.edu.pk');
 if(!cache.has(source))cache.set(source,page(source));
 const result=await cache.get(source);
 const match=downloadLinks(result.doc,result.url).find(f=>Core.fileIdentity(f.url)===Core.fileIdentity(file.url));
 if(!match)throw Error('This file is no longer listed on LMS. Scan lecture files or sync assignments again.');
 return {...file,...match,title:file.title||match.title,referrer:result.url};
}
let lectureBatch = null;
async function downloadLectureBatch(selected, sender) {
 if(lectureBatch)throw Error('A lecture download batch is already running.');
 if(!Array.isArray(selected)||!selected.length||selected.length>1000)throw Error('Select between 1 and 1000 lecture files.');
 // Copy primitive identifiers before any async work or UI/storage updates.
 const items=[...new Map(selected.map(f=>{if(typeof f.url!=='string'||typeof f.course!=='string')throw Error('Invalid selected file.');return [f.course+'|'+f.url,{url:f.url,course:f.course}];})).values()];
 const task=(async()=>{
  let started=0;const failures=[],downloadPages=new Map();
  for(let i=0;i<items.length;i++){
   await browser.storage.local.set({lectureBatch:{busy:true,total:items.length,processed:i,started,failures}});
   try{await handle({type:'download',...items[i]},sender,downloadPages);started++;}
   catch(e){failures.push({...items[i],error:e.message});}
  }
  const result={busy:false,total:items.length,processed:items.length,started,failures};
  await browser.storage.local.set({lectureBatch:result});return result;
 })();
 lectureBatch=task;
 try{return await task;}finally{lectureBatch=null;}
}
async function handle(m,sender,downloadPages=new Map()){
 await backgroundReady;
 if(typeof m?.type==='string'&&m.type.startsWith('survey_'))return SurveyRunner.message(m,sender);
 const internal=!sender.tab;
 if(m.type==='portal_open'){
  let host;try{host=new URL(sender.tab?.url||sender.url).hostname;}catch{return {ok:true};}
  if(!['lms.bahria.edu.pk','cms.bahria.edu.pk'].includes(host))return;
  const kind=host.startsWith('lms')?'lms':'cms',s=await state();
  if(s.surveyJob?.running&&s.surveyJob.tabId===sender.tab?.id)return {ok:true};
  if((await settings()).autoSync && Date.now()-(s[kind+'Synced']||0)>60000)await run(kind);
  return {ok:true};
 }
 if(!internal)throw Error('This action is only available in the extension.');
 if(m.type==='sync'){
  if(!['lms','cms','files'].includes(m.kind))throw Error('Unknown sync.');
  try{return await run(m.kind);}catch(error){
   if(m.kind==='cms'&&error.expired){await openCmsLogin();throw Error('CMS login expired. The CMS portal is open; log in, then refresh attendance again.');}
   throw error;
  }
 }
 if(m.type==='download_batch')return downloadLectureBatch(m.files,sender);
 if(m.type==='sessions'){await checkSessions();return {};}
 if(m.type==='assignment_download'){
  const s=await state();
  const assignment=(s.assignments||[]).find(a=>a.link===m.link&&a.title===m.title&&a.course===m.course);
  const file=assignment?.downloads?.find(f=>f.url===m.url);
  if(!file)throw Error('Assignment file not found. Sync assignments again to discover its download links.');
  const part=assignment.downloads.length>1?' - File '+(assignment.downloads.indexOf(file)+1):'';
  const resolved=await freshDownloadLink({...file,sourcePage:assignment.link},downloadPages);
  const id=await FileDownload.start(resolved,assignment.title+part,'Bahria/'+Core.segment(assignment.course)+'/Assignments');
  return {id};
 }
 if(m.type==='download'){
  const s=await state(),f=(s.files||[]).find(f=>f.url===m.url&&f.course===m.course);if(!f)throw Error('File not in the scanned list.');
  const label=f.lectureNumber?f.lectureNumber+(f.part?' '+f.part:'')+' - ':'';
  const resolved=await freshDownloadLink(f,downloadPages);
  const id=await FileDownload.start(resolved,label+f.title,'Bahria/'+Core.segment(f.course));
  const pending=(await state()).pendingDownloads||{};pending[id]={url:f.url,course:f.course,key:Core.fileIdentity(f.url)};await browser.storage.local.set({pendingDownloads:pending});return {id};
 }
 if(m.type==='settings'){const current=await settings();await browser.storage.local.set({settings:{...current,...m.value}});return {};}
 throw Error('Unknown action.');
}
browser.runtime.onMessage.addListener((m,sender)=>{
 const message=m?.type==='download_batch'?{...m,files:Array.isArray(m.files)?m.files.map(f=>({...f})):m.files}:m;
 return handle(message,sender).then(data=>({ok:true,...data}),e=>({ok:false,error:e.message}));
});
browser.downloads.onChanged.addListener(async delta=>{
 if(!delta.state||!['complete','interrupted'].includes(delta.state.current))return;
 const s=await state(),pending=s.pendingDownloads||{},item=pending[delta.id];if(!item)return;delete pending[delta.id];
 const update={pendingDownloads:pending};if(delta.state.current==='complete')update.files=(s.files||[]).map(f=>Core.fileIdentity(f.url)===(item.key||Core.fileIdentity(item.url))&&f.course===item.course?{...f,downloaded:true,isNew:false}:f);
 await browser.storage.local.set(update);
});
browser.storage.onChanged.addListener(async(changes,area)=>{if(area==='local'&&changes.assignments){const count=Core.pending(changes.assignments.newValue||[]).length;await browser.action.setBadgeText({text:count?String(count):''});await browser.action.setBadgeBackgroundColor({color:'#2563eb'});}});
browser.alarms.onAlarm.addListener(a=>{if(a.name==='reminders')reminders().catch(console.error);});
browser.runtime.onInstalled.addListener(async()=>{await browser.alarms.create('reminders',{periodInMinutes:180});});

// Recover interrupted jobs without publishing a fake completed 0/0 batch.
backgroundReady=(async()=>{
 const saved=await state(),updates={};
 for(const kind of ['lms','cms','files'])if(saved[kind+'Job']?.busy)updates[kind+'Job']={busy:false,error:'Sync interrupted. Please try again.'};
 if(saved.lectureBatch?.busy)updates.lectureBatch={...saved.lectureBatch,busy:false,interrupted:true};
 if(Object.keys(updates).length)await browser.storage.local.set(updates);
 await refreshCachedBadge();
})();

async function refreshCachedBadge(){
 if(!browser.action?.setBadgeText)return;
 const saved=await state(),count=Core.pending(saved.assignments||[]).length;
 await browser.action.setBadgeText({text:count?String(count):''});
 if(browser.action.setBadgeBackgroundColor)await browser.action.setBadgeBackgroundColor({color:'#bd93f9'});
}
browser.runtime.onStartup?.addListener(()=>refreshCachedBadge().catch(console.error));
