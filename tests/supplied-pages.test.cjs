const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),Core=require('../core');
function elements(name){return JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures',name+'.json'),'utf8')).map(cells=>{
 const converted=cells.map(c=>({textContent:c.text,innerHTML:c.anchors.map(a=>`<a>${a.text}</a>`).join('')+c.text,querySelectorAll:()=>c.anchors.map(anchor),querySelector:selector=>{const l=c.labels.find(l=>l.class?.includes(selector.slice(1)));return l?{textContent:l.text}:null;}}));
 return {querySelectorAll:q=>q===':scope > td'||q==='td'?converted:cells.flatMap(c=>c.anchors.map(anchor)),querySelector:()=>null};
});}
const anchor=a=>({textContent:a.text,getAttribute:k=>k==='href'?a.href:null});
function setup(){const c=vm.createContext({Core,URL,Date,Map});vm.runInContext(fs.readFileSync(path.join(__dirname,'../parsers.js'),'utf8'),c);return c;}
test('supplied AI lab lecture rows expose all eight topics and correct original file types',()=>{
 const c=setup(),rows=elements('ai-lab-lectures'),doc={querySelectorAll:()=>rows};
 const files=c.parseLectureFiles(doc,'https://lms.bahria.edu.pk/Student/LectureNotes.php?s=semester&oc=course','AI Lab');
 assert.equal(files.length,8);assert.equal(files[0].title,'Introduction to Python');assert.equal(files[0].lectureNumber,'1');assert(files[0].filename.endsWith('.pptx'));assert(files[4].filename.endsWith('.pdf'));assert.equal(files[0].sourcePage,'https://lms.bahria.edu.pk/Student/LectureNotes.php?s=semester&oc=course');
});
test('supplied AI lab assignments with submission links do not appear as pending',()=>{const result=setup().parseTableRows(elements('ai-lab-assignments'),'AI Lab','https://lms.bahria.edu.pk/Student/Assignments.php');assert.equal(result.length,0);});
test('course URLs retain the selected semester without double encoding',()=>{const url=setup().coursePageUrl('https://lms.bahria.edu.pk/Student/LectureNotes.php',{querySelector:()=>({value:'MjAyNjM%3D'})},'MTUxNzA2');assert.equal(url.searchParams.get('s'),'MjAyNjM=');assert.equal(url.searchParams.get('oc'),'MTUxNzA2');assert(!url.href.includes('%253D'));});
test('file identity survives dated token changes while distinct files stay distinct',()=>{const make=(date,name)=>'https://lms.bahria.edu.pk/Student/Download.php?k='+encodeURIComponent(btoa(`1,${date},Lecture,0,${name},lms.bahria.edu.pk/Student/LectureNotes.php?oc=course`));assert.equal(Core.fileIdentity(make('2026-11-03','notes.pdf')),Core.fileIdentity(make('2026-11-14','notes.pdf')));assert.notEqual(Core.fileIdentity(make('2026-11-14','notes.pdf')),Core.fileIdentity(make('2026-11-14','extra.pdf')));});
