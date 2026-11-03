const $=id=>document.getElementById(id);
const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
let snapshot={},plans=[],planId=null;
if(location.pathname.endsWith('popup.html'))document.body.classList.add('popup');
function tell(message){$('notice').textContent=message;}
async function request(m){const r=await browser.runtime.sendMessage(m);if(!r?.ok)throw Error(r?.error||'The background task did not respond.');return r;}
function empty(parent,text){parent.replaceChildren(node('div',text,'empty'));}
function stamp(ms){return ms?new Date(ms).toLocaleString():'Not synced yet';}
function link(url,text){const a=node('a',text);try{a.href=Core.portalUrl(url);}catch{return node('span',text);}a.target='_blank';a.rel='noreferrer';return a;}
function render(){
 const batch=snapshot.lectureBatch;
 $('download-selected').disabled=!!batch?.busy;
 $('download-selected').textContent=batch?.busy?`Downloading ${batch.processed+1}/${batch.total}…`:'Download selected';
 const pending=Core.pending(snapshot.assignments||[]);$('summary').textContent=pending.length+' pending · '+(snapshot.files||[]).filter(f=>f.isNew).length+' new files';
 $('lms-time').textContent='Last sync: '+stamp(snapshot.lmsSynced);$('cms-time').textContent='Target: 75% · Last sync: '+stamp(snapshot.cmsSynced);
 for(const kind of ['lms','cms','files']){const job=snapshot[kind+'Job'];$(kind+'-error').textContent=job?.error||'';document.querySelector('[data-sync='+kind+']').disabled=!!job?.busy;}
 const list=$('assignment-list');list.replaceChildren();
 if(!pending.length)empty(list,snapshot.lmsSynced?'No pending assignments found.':'Sync LMS to bring your assignments here.');
 for(const a of pending){
  const c=node('article',null,'card assignment-card'),d=a.deadline?new Date(a.deadline):null;
  const days=d?Math.ceil((d-Date.now())/86400000):null;
  const top=node('div',null,'card-top'),info=node('div',null,'card-info');info.append(node('h3',a.title),node('p',a.course,'course-name'));
  top.append(info,node('span',d?(days<=0?'Due today / overdue':days+'d left'):'No date','pill'+(days!==null&&days<=1?' danger':'')));
  const bottom=node('div',null,'assignment-actions');bottom.append(node('span',d?d.toLocaleString([],{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'No deadline','muted'),link(a.link,'Open ↗'));
  c.append(top,bottom);
  if(a.downloads?.length){const actions=node('div',null,'download-actions');a.downloads.forEach((f,i)=>{const b=node('button',a.downloads.length>1?'Download file '+(i+1):'Download assignment');b.title=f.filename;b.onclick=async()=>{b.disabled=true;try{await request({type:'assignment_download',url:f.url,link:a.link,title:a.title,course:a.course});tell('Assignment download started.');}catch(e){tell(e.message);}finally{b.disabled=false;}};actions.append(b);});c.append(actions);}
  else c.append(node('span',a.downloads?'No downloadable file found. Open LMS for details.':'Sync again to discover assignment files.','muted download-hint'));
  list.append(c);
 }
 const attendance=$('attendance-list');attendance.replaceChildren();if(!(snapshot.attendance||[]).length)empty(attendance,'Refresh CMS to see attendance and hours available.');
 for(const r of snapshot.attendance||[]){
  const c=node('article',null,'card attendance-card'),top=node('div',null,'card-top'),info=node('div',null,'card-info');
  info.append(node('h3',r.course),node('p',`${r.code} · ${r.creditHours||'—'} Cr Hr · ${r.attended}/${r.total} hrs`,'course-name'));
  const short=r.percentage<75, recovery=r.classesToRecover||0;
  const label=short?`${recovery}h${r.isLab?' ('+Math.ceil(recovery/3)+' Labs)':''} Required`:`${r.absentLeft}h${r.isLab?' ('+r.sessionsLeft+' Labs)':''} Left`;
  top.append(info,node('span',label,'pill'+(short?' danger':'')));
  const bar=node('progress');bar.max=100;bar.value=r.percentage;bar.setAttribute('aria-label',r.course+' attendance');if(short)bar.className='short';
  const metrics=node('div',null,'metrics');
  for(const [name,value] of [['Current rate',r.percentage.toFixed(1)+'%'],['Max allowed',r.maxAllowed+'h'],['Used / left',r.absent+'h / '+r.absentLeft+'h']]){const metric=node('div');metric.append(node('span',name),node('strong',value));metrics.append(metric);}
  c.append(top,bar,metrics);attendance.append(c);
 }
 renderFiles();
 const sessions=$('sessions');sessions.replaceChildren();for(const portal of ['lms','cms']){const s=snapshot[portal+'Session'];const c=node('article',null,'card');c.append(node('h3',portal.toUpperCase()),node('span',s?.state||'Not checked','pill'+(s?.state==='expired'?' danger':'')),node('p',s?.message||'Check your current login session.'),node('p','Checked: '+stamp(s?.checked),'muted'),link('https://'+portal+'.bahria.edu.pk/','Open '+portal.toUpperCase()+' ↗'));sessions.append(c);}
}
function renderFiles(){
 const list=$('file-list'),select=$('file-course'),previous=select.value;
 const names=[...new Set([...(snapshot.courses||[]).map(c=>c.name),...(snapshot.files||[]).map(f=>f.course)])];
 select.replaceChildren();for(const name of names){const o=node('option',name);o.value=name;select.append(o);}
 if(names.includes(previous))select.value=previous;
 list.replaceChildren();
 const files=(snapshot.files||[]).filter(f=>f.course===select.value);
 if(!files.length){empty(list,names.length?'No lecture files found for this course.':'Scan lecture files to populate your courses.');return;}
 list.append(node('h3',select.value,'course-heading'));
 for(const [index,f] of files.entries()){
  const row=node('article',null,'card file'),check=node('input');check.type='checkbox';check.dataset.url=f.url;check.dataset.course=f.course;
  const label=f.lectureNumber?f.lectureNumber+(f.part?' '+f.part:''):String(index+1);
  check.setAttribute('aria-label','Select lecture '+label+' '+f.title);
  const info=node('div',null,'details');info.append(node('h3',f.title),node('span',f.downloaded?'Downloaded':f.isNew?'New':'Available','file-status'));
  const button=node('button','Download');button.onclick=async()=>{button.disabled=true;try{await request({type:'download',url:f.url,course:f.course});tell('Download started.');}catch(e){tell(e.message);}finally{button.disabled=false;}};
  row.append(check,node('span',label,'lecture-number'),info,button);list.append(row);
 }
}
async function load(){snapshot=await browser.storage.local.get(null);render();}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('.panel').forEach(p=>p.hidden=p.id!==b.dataset.tab);document.querySelectorAll('[data-tab]').forEach(t=>t.classList.toggle('selected',t===b));});
document.querySelectorAll('[data-sync]').forEach(b=>b.onclick=async()=>{b.disabled=true;tell('Syncing in the background…');try{const r=await request({type:'sync',kind:b.dataset.sync});tell('Synced '+r.count+' records.');}catch(e){tell(e.message);}finally{await load();}});
$('expand').onclick=()=>browser.tabs.create({url:browser.runtime.getURL('dashboard.html')});
$('file-course').onchange=renderFiles;
$('download-selected').onclick=async()=>{
 // Snapshot values, never keep live checkbox elements in an async download loop.
 const files=[...$('file-list').querySelectorAll('input:checked')].map(f=>({url:f.dataset.url,course:f.dataset.course}));
 if(!files.length)return tell('Select files to download first.');
 $('download-selected').disabled=true;
 tell(`Starting ${files.length} downloads in the background…`);
 try{
  const result=await request({type:'download_batch',files});
  tell(`${result.started}/${result.total} downloads started.`+(result.failures.length?` ${result.failures.length} failed: ${result.failures[0].error}`:''));
 }catch(e){tell(e.message);}finally{await load();}
};
$('mark-seen').onclick=()=>browser.storage.local.set({files:(snapshot.files||[]).map(f=>({...f,isNew:false}))});
$('check-sessions').onclick=async()=>{tell('Checking sessions…');try{await request({type:'sessions'});await load();tell('Session check complete.');}catch(e){tell(e.message);}};
$('save-settings').onclick=async()=>{try{const url=$('lecture-url').value.trim();if(url)Core.portalUrl(url,'lms.bahria.edu.pk');await request({type:'settings',value:{autoSync:$('auto-sync').checked,reminders:$('reminders').checked,lectureUrl:url}});tell('Settings saved.');}catch(e){tell(e.message);}};
function rows(){return [...$('grade-rows').children].map(tr=>Object.fromEntries([...tr.querySelectorAll('input')].map(i=>[i.dataset.field,i.value])));}
function calculate(){try{const r=Core.grades(rows(),Number($('target').value));$('grade-result').textContent=`Earned ${r.earned.toFixed(1)} overall percentage points. Current average on graded work: ${r.current==null?'—':r.current.toFixed(1)+'%'}. ${r.remaining.toFixed(1)}% of the course remains. `+(r.needed==null?(r.possible?'Target reached.':'Target not reached.'):(r.possible?`Need an average of ${r.needed.toFixed(1)}% on the remaining weight.`:'Target is above the maximum possible with the entered marks.'))+(r.total<100?` You have allocated ${r.total}% of the course; the unallocated weight is included as remaining.`:'');}catch(e){$('grade-result').textContent=e.message;}}
function addRow(r={name:'',weight:'',score:'',max:100}){const tr=node('tr');for(const field of ['name','weight','score','max']){const td=node('td'),input=node('input');input.type=field==='name'?'text':'number';input.value=r[field]??'';input.dataset.field=field;input.setAttribute('aria-label',field);if(field!=='name'){input.min=0;input.step='any';}input.oninput=calculate;td.append(input);tr.append(td);}const td=node('td'),remove=node('button','×');remove.setAttribute('aria-label','Remove assessment');remove.onclick=()=>{tr.remove();calculate();};td.append(remove);tr.append(td);$('grade-rows').append(tr);calculate();}
function planOptions(){const select=$('grade-course');select.replaceChildren(node('option','Choose saved course'));select.firstChild.value='';for(const p of plans){const o=node('option',p.name);o.value=p.id;select.append(o);}select.value=planId||'';}
function newPlan(){planId=null;$('course-name').value='';$('target').value=75;$('grade-rows').replaceChildren();for(const name of ['Assignments','Quizzes','Midterm','Final'])addRow({name,weight:'',score:'',max:100});planOptions();}
$('new-plan').onclick=newPlan;$('add-row').onclick=()=>addRow();$('target').oninput=calculate;
$('grade-course').onchange=()=>{const p=plans.find(p=>p.id===$('grade-course').value);if(!p)return;planId=p.id;$('course-name').value=p.name;$('target').value=p.target;$('grade-rows').replaceChildren();p.rows.forEach(addRow);calculate();};
$('save-plan').onclick=async()=>{try{const name=$('course-name').value.trim();if(!name)throw Error('Enter a course name.');const r=rows();Core.grades(r,Number($('target').value));const p={id:planId||crypto.randomUUID(),name,target:Number($('target').value),rows:r};plans=plans.filter(x=>x.id!==p.id);plans.push(p);planId=p.id;await browser.storage.local.set({gradePlans:plans});planOptions();tell('Grade plan saved.');}catch(e){tell(e.message);}};
$('delete-plan').onclick=async()=>{if(!planId)return;if(!confirm('Delete this saved course plan?'))return;plans=plans.filter(p=>p.id!==planId);await browser.storage.local.set({gradePlans:plans});newPlan();};
$('export').onclick=()=>{const allowed=['assignments','attendance','files','gradePlans','settings','lmsSynced','cmsSynced','filesSynced'];const data={format:'bahria-companion',version:1};for(const k of allowed)if(snapshot[k]!=null)data[k]=snapshot[k];const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=node('a');a.href=url;a.download='bahria-companion-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);};
$('import').onchange=async()=>{try{const file=$('import').files[0];if(!file)return;if(file.size>5000000)throw Error('Backup must be smaller than 5 MB.');const data=JSON.parse(await file.text()),out={};for(const k of ['assignments','attendance','files','gradePlans'])if(data[k]!=null){if(!Array.isArray(data[k]))throw Error('Invalid '+k+' list.');out[k]=data[k];}if(Array.isArray(data.attendanceData))out.attendance=data.attendanceData;
 for(const a of out.assignments||[]){if(typeof a.title!=='string'||typeof a.course!=='string')throw Error('Invalid assignment.');if(a.link)Core.portalUrl(a.link);}
 for(const r of out.attendance||[]){if(typeof r.course!=='string'||!['percentage','attended','total','absent','absentLeft','maxAllowed'].every(k=>Number.isFinite(r[k])))throw Error('Invalid attendance record.');r.classesToRecover=Math.max(0,Math.ceil(3*r.total-4*r.attended));r.sessionsLeft=Math.floor(r.absentLeft/3);}
 for(const f of out.files||[]){Core.portalUrl(f.url,'lms.bahria.edu.pk');if(!['title','filename','course'].every(k=>typeof f[k]==='string'))throw Error('Invalid file.');}
 for(const p of out.gradePlans||[]){if(typeof p.id!=='string'||typeof p.name!=='string'||!Array.isArray(p.rows))throw Error('Invalid grade plan.');Core.grades(p.rows,p.target);}
 if(data.settings){const v=data.settings;if(typeof v.autoSync!=='boolean'||typeof v.reminders!=='boolean')throw Error('Invalid settings.');if(v.lectureUrl)Core.portalUrl(v.lectureUrl,'lms.bahria.edu.pk');out.settings={autoSync:v.autoSync,reminders:v.reminders,lectureUrl:v.lectureUrl||''};}for(const k of ['lmsSynced','cmsSynced','filesSynced'])if(Number.isFinite(data[k]))out[k]=data[k];if(!Object.keys(out).length)throw Error('No supported data found.');if(!confirm('Replace the matching local data with this backup?'))return;await browser.storage.local.set(out);plans=out.gradePlans||plans;newPlan();tell('Import complete.');}catch(e){tell('Import failed: '+e.message);}finally{$('import').value='';}};
$('clear-data').onclick=async()=>{if(confirm('Delete all Companion data, including grade plans? Export a backup first if needed.')){await browser.storage.local.clear();plans=[];newPlan();await load();tell('Local data cleared.');}};
browser.storage.onChanged.addListener(changes=>{
 load().catch(e=>tell(e.message));
 const batch=changes.lectureBatch?.newValue;
 if(batch)tell(batch.busy?`Downloading selected lectures: ${batch.processed}/${batch.total} processed…`:`${batch.started}/${batch.total} downloads started.`+(batch.failures.length?` ${batch.failures.length} failed: ${batch.failures[0].error}`:''));
});
(async()=>{await load();plans=snapshot.gradePlans||[];const s={autoSync:true,reminders:true,...snapshot.settings};$('auto-sync').checked=s.autoSync;$('reminders').checked=s.reminders;$('lecture-url').value=s.lectureUrl||snapshot.discoveredLectureUrl||'';newPlan();})().catch(e=>tell(e.message));
