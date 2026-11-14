const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),Core=require('../core');
const context=vm.createContext({Core,URL,Date,Map});vm.runInContext(fs.readFileSync(path.join(__dirname,'../parsers.js'),'utf8'),context);
const anchor=(href,text='Download Lecture')=>({textContent:text,getAttribute:k=>k==='href'?href:null});
function cell(text,anchors=[]){return {textContent:text,innerHTML:text,querySelectorAll:()=>anchors,querySelector:()=>null};}
function lecture(number,topic,links){const cols=[cell(number),cell(topic),cell('',links)];return {querySelectorAll:q=>q===':scope > td'?cols:links,querySelector:()=>null};}
test('lecture rows retain topics, numbers and multiple-file suffixes',()=>{
 const rows=[lecture('1','Intro',[anchor('/files/intro.pdf')]),lecture('3','Regular Expression (Regex)',[anchor('/files/regex.pdf'),anchor('/files/regex-extra.pptx')])];
 const result=context.parseLectureFiles({querySelectorAll:()=>rows},'https://lms.bahria.edu.pk/Student/Lectures.php','Theory of Automata');
 assert.equal(result.length,3);assert.equal(result[0].lectureNumber,'1');assert.equal(result[0].part,'');assert.equal(result[1].lectureNumber,'3');assert.equal(result[1].part,'A');assert.equal(result[2].part,'B');assert.equal(result[2].title,'Regular Expression (Regex)');assert.equal(result[2].course,'Theory of Automata');
});
test('unsubmitted assignment exposes only its assignment-column download links',()=>{
 const cols=[cell('1'),cell('Lab 7'),cell('',[anchor('../uploads/lab7.pdf','Assignment')]),cell('No Submission'),cell('20 November 2026 11:55 PM')];
 const rows=[{querySelectorAll:()=>cols}];const result=context.parseTableRows(rows,'Architecture','https://lms.bahria.edu.pk/Student/Assignments.php');
 assert.equal(result[0].downloads[0].url,'https://lms.bahria.edu.pk/uploads/lab7.pdf');assert.equal(result[0].downloads[0].filename,'lab7.pdf');assert.equal(result[0].submitted,false);
});
test('lecture parser ignores unsafe and off-site links',()=>{const result=context.parseLectureFiles({querySelectorAll:()=>[lecture('1','Topic',[anchor('javascript:alert(1)'),anchor('https://evil.example/file.pdf')])]},'https://lms.bahria.edu.pk/Student/Lectures.php','AI');assert.equal(result.length,0);});
test('alphabetic suffix supports more than 26 files',()=>{assert.equal(Core.letters(0),'A');assert.equal(Core.letters(25),'Z');assert.equal(Core.letters(26),'AA');});
