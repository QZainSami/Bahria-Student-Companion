const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/cms-attendance.json'),'utf8'));
function documentFor(rows=fixture){return {querySelectorAll:()=>[{textContent:'Code Registered Course Title Present\nHours Absent Hours Total Hours',querySelectorAll:()=>rows.map(values=>({querySelectorAll:()=>values.map(textContent=>({textContent}))}))}]};}
function parser(){const context=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(__dirname,'../parsers.js'),'utf8'),context);return context;}
test('CMS supplied attendance page yields all eight courses with hours and percentages',()=>{const records=parser().parseAttendance(documentFor());assert.equal(records.length,8);assert.equal(records[0].course,'Artificial Intelligence');assert.equal(records[0].attended,17);assert.equal(records[0].absent,7);assert.equal(records[0].total,24);assert(Math.abs(records[0].percentage-70.8333333333)<0.001);assert.equal(records[3].attended,29);assert.equal(records[3].percentage,100);assert.equal(records[6].isLab,true);});
test('present-hours reader supports actual CMS formats and rejects malformed values',()=>{const c=parser();for(const [text,expected] of [['17.0 :70.83%',17],['29.0 :100%',29],['24.0:80%',24],['42:00',42],['42',42],['0.0 :0%',0],[' 15.5 : 77.5% ',15.5]])assert.equal(c.parsePresentHours(text),expected,text);for(const text of ['', 'N/A','Paid','42junk','-1 :50%','Infinity'])assert.equal(c.parsePresentHours(text),null,text);});
test('fresh CMS sync populates storage after local data has been cleared',async()=>{
 const saved={},event={addListener(){}};
 const browser={storage:{local:{async get(){return structuredClone(saved)},async set(value){Object.assign(saved,value)}},onChanged:event},runtime:{onMessage:event,onInstalled:event},downloads:{onChanged:event},alarms:{onAlarm:event},action:{}};
 const context=vm.createContext({browser,URL,Date,Map,AbortSignal,console});
 for(const file of ['core.js','parsers.js','background.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context);
 context.page=async()=>({doc:documentFor(),url:'https://cms.bahria.edu.pk/Sys/Student/ClassAttendance/StudentWiseAttendance.aspx'});
 const result=await context.handle({type:'sync',kind:'cms'},{});
 assert.equal(result.count,8);assert.equal(saved.attendance.length,8);assert(saved.cmsSynced);assert.equal(saved.cmsSession.state,'connected');assert.equal(saved.attendance[0].classesToRecover,4);
});
