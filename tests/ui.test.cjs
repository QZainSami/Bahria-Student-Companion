const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),Core=require('../core');
class Element{
 constructor(tag='div'){this.tagName=tag;this.children=[];this.dataset={};this.textContent='';this._value='';this.classList={add(){},toggle(){}};}
 append(...items){this.children.push(...items);}replaceChildren(...items){this.children=[];this._value='';this.append(...items);}get firstChild(){return this.children[0];}
 get value(){return this._value||(this.tagName==='select'?this.children[0]?.value||'':'');}set value(v){this._value=String(v);}
 click(){} setAttribute(){} querySelectorAll(q){return this.children.flatMap(c=>[...(q.startsWith('input')&&c.tagName==='input'&&(!q.includes(':checked')||c.checked)?[c]:[]),...c.querySelectorAll(q)]);}
}
async function fixture(){
 const data={view:{tab:'files',course:'AI Lab'},courses:[{id:'1',name:'AI'},{id:'2',name:'AI Lab'}],files:[{url:'https://lms.bahria.edu.pk/a.pdf',course:'AI Lab',title:'Lab 1',filename:'a.pdf'},{url:'https://lms.bahria.edu.pk/b.pdf',course:'AI Lab',title:'Lab 2',filename:'b.pdf'},{url:'https://lms.bahria.edu.pk/c.pdf',course:'AI',title:'Theory',filename:'c.pdf'}]},ids=new Map(),requests=[];
 const $=id=>{if(!ids.has(id))ids.set(id,new Element(['file-course','grade-course'].includes(id)?'select':'div'));return ids.get(id);};
 $('target').value=75;
 const tabs=['assignments','attendance','files','grades','settings'].map(tab=>{const b=new Element('button');b.dataset.tab=tab;return b;});const panels=tabs.map(t=>{const e=new Element();e.id=t.dataset.tab;return e;});const syncs=['lms','cms','files'].map(kind=>{const b=new Element();b.dataset.sync=kind;return b;});
 const document={getElementById:$,createElement:tag=>new Element(tag),body:new Element(),querySelector:q=>syncs.find(b=>q.includes(b.dataset.sync)),querySelectorAll:q=>q==='[data-tab]'?tabs:q==='[data-sync]'?syncs:q==='.panel'?panels:[]};
 let exported;const U=class extends URL{};U.createObjectURL=blob=>{exported=blob;return 'blob:backup'};U.revokeObjectURL=()=>{};
 const c=vm.createContext({Core,Blob,URL:U,setTimeout:()=>{},confirm:()=>true,document,location:{pathname:'/popup.html'},browser:{storage:{local:{async get(){return structuredClone(data)},async set(d){Object.assign(data,d)}},onChanged:{addListener(){}}},runtime:{async sendMessage(m){requests.push(m);return {ok:true,total:m.files?.length,started:m.files?.length,failures:[]};}}},crypto,console});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../ui.js'),'utf8'),c);await new Promise(r=>setImmediate(r));
 return {data,$,tabs,panels,c,requests,get exported(){return exported}};
}
test('reopening popup restores lecture section and selected course',async()=>{const f=await fixture();assert.equal(f.panels.find(p=>p.id==='files').hidden,false);assert.equal(f.panels.find(p=>p.id==='assignments').hidden,true);assert.equal(f.$('file-course').value,'AI Lab');});
test('Download all submits every lecture in selected course only',async()=>{const f=await fixture();await f.$('download-all').onclick();assert.equal(f.requests[0].type,'download_batch');assert.equal(f.requests[0].files.length,2);assert(f.requests[0].files.every(file=>file.course==='AI Lab'));});
test('course and tab choices are saved',async()=>{const f=await fixture();f.$('file-course').value='AI';await f.$('file-course').onchange();await f.tabs.find(b=>b.dataset.tab==='attendance').onclick();assert.equal(f.data.view.tab,'attendance');assert.equal(f.data.view.course,'AI');});
test('sync progress overrides unrelated completed download messages',async()=>{const f=await fixture();f.data.lmsJob={busy:true,current:2,total:8,course:'AI Lab'};f.data.lectureBatch={busy:false,total:0,started:0,failures:[]};await f.c.load();f.c.setTab('assignments',false);assert.equal(f.$('notice').textContent,'Syncing 2/8 — AI Lab');});

test('new grade plan prompts instead of reporting invalid empty weights',async()=>{const f=await fixture();assert.match(f.$('grade-result').textContent,/Enter assessment weights/);});
test('grade plan ignores unused templates but retains weighted ungraded work',async()=>{
 const f=await fixture();const rows=f.$('grade-rows').children;
 const put=(index,field,value)=>{rows[index].querySelectorAll('input').find(i=>i.dataset.field===field).value=value;};
 put(0,'weight','20');put(0,'score','80');put(1,'weight','50');
 f.c.calculate();assert.match(f.$('grade-result').textContent,/Earned 16.0/);assert.match(f.$('grade-result').textContent,/allocated 70%/);
 f.$('course-name').value='AI';await f.$('save-plan').onclick();assert.equal(f.data.gradePlans[0].rows.length,2);assert.equal(f.data.gradePlans[0].rows[1].score,'');
});
test('partially entered grade row cannot be silently discarded on save',async()=>{const f=await fixture();f.$('grade-rows').children[0].querySelectorAll('input').find(i=>i.dataset.field==='score').value='75';f.c.calculate();assert.match(f.$('grade-result').textContent,/Complete the weight/);f.$('course-name').value='AI';await f.$('save-plan').onclick();assert.equal(f.data.gradePlans,undefined);});
test('backup export and import restores course dropdown records',async()=>{const f=await fixture();f.$('export').onclick();const backup=JSON.parse(await f.exported.text());assert.equal(backup.courses.length,2);delete f.data.courses;f.$('import').files=[{size:100,text:async()=>JSON.stringify(backup)}];await f.$('import').onchange();assert.equal(f.data.courses[1].name,'AI Lab');});
test('batch clears successful selections but retains failed selections',async()=>{const f=await fixture();const files=f.data.files.filter(x=>x.course==='AI Lab');f.c.request=async()=>({started:1,total:2,failures:[{...files[1],error:'Missing'}]});vm.runInContext('selectedLectures.add(selectionKey(snapshot.files[0]));selectedLectures.add(selectionKey(snapshot.files[1]));',f.c);await f.c.startLectureBatch(files);assert.equal(vm.runInContext('selectedLectures.has(selectionKey(snapshot.files[0]))',f.c),false);assert.equal(vm.runInContext('selectedLectures.has(selectionKey(snapshot.files[1]))',f.c),true);});

