const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');

test('compact mobile rules are scoped to Android rather than any narrow popup',()=>{
 const css=fs.readFileSync(path.join(__dirname,'../style.css'),'utf8');
 assert.match(css,/body\.android,body\.android\.popup\{min-width:0;width:100%/);
 assert.match(css,/body\.android \.grid\{grid-template-columns:1fr/);
 assert.doesNotMatch(css,/@media \(max-width:600px\)/);
});
