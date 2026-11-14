/* User-started, sequential survey queue in one Firefox tab. */
const SurveyRunner=(()=>{
 const dashboard='https://cms.bahria.edu.pk/Sys/Student/QualityAssurance/QualityAssuranceSurveys.aspx';
 let serial=Promise.resolve();
 const save=job=>browser.storage.local.set({surveyJob:job});
 const valid=url=>Core.portalUrl(url,'cms.bahria.edu.pk');
 async function stop(message='Stopped by you.') {const {surveyJob:j}=await browser.storage.local.get('surveyJob');if(j)await save({...j,running:false,message});return {};}
 async function start(config){
  const {surveyJob:existing}=await browser.storage.local.get('surveyJob');if(existing?.running)throw Error('Survey autofill is already running.');
  const rating=Number(config?.rating??1);if(!Number.isInteger(rating)||rating<0||rating>4)throw Error('Choose a valid rating option.');
  const tab=await browser.tabs.create({url:'about:blank',active:true});
  await save({running:true,tabId:tab.id,phase:'discover',queue:[],index:0,total:0,completed:0,config:{rating},message:'Finding pending surveys…'});
  await browser.tabs.update(tab.id,{url:dashboard});return {};
 }
 async function next(j){
  if(j.index>=j.queue.length){await save({...j,running:false,message:`Finished: ${j.completed}/${j.total} surveys verified as completed.`});return {action:'idle'};}
  await save({...j,phase:'fill',message:`Filling survey ${j.index+1}/${j.total} — ${j.queue[j.index].title}`});
  await browser.tabs.update(j.tabId,{url:j.queue[j.index].url});return {action:'idle'};
 }
 async function advance(msg,sender){
  const {surveyJob:j}=await browser.storage.local.get('surveyJob');
  if(!j?.running||sender.tab?.id!==j.tabId)return {action:'idle'};
  let pageUrl;
  try{pageUrl=valid(sender.url||sender.tab.url);}catch{await stop('Survey tab left CMS. Autofill stopped.');return {action:'idle'};}
  if(msg.type==='survey_error'){await stop(msg.error||'Survey page could not be processed.');return {action:'idle'};}
  if(msg.login){await stop('CMS login expired. Log in, then start survey autofill again.');return {action:'idle'};}
  if(msg.type==='survey_submit'){
   if(j.phase!=='fill'||pageUrl!==j.queue[j.index]?.url)return {action:'idle'};
   await save({...j,phase:'verify_wait',message:`Submitting survey ${j.index+1}/${j.total}…`});return {action:'submit'};
  }
  if(msg.type==='survey_after_submit'||(msg.type==='survey_ready'&&j.phase==='verify_wait')){
   if(j.phase!=='verify_wait')return {action:'idle'};
   await save({...j,phase:'verify',message:`Checking survey ${j.index+1}/${j.total} was saved…`});await browser.tabs.update(j.tabId,{url:dashboard});return {action:'idle'};
  }
  if(msg.type!=='survey_ready')return {action:'idle'};
  if(j.phase==='discover'||j.phase==='verify'){
   if(!msg.dashboard){await stop('Survey dashboard was not recognized. Nothing was submitted on this page.');return {action:'idle'};}
   const links=[...new Map((msg.links||[]).map(item=>[valid(item.url),{url:valid(item.url),title:String(item.title||'Survey').slice(0,200)}])).values()];
   if(j.phase==='discover'){
    if(!links.length){await save({...j,running:false,message:'No pending surveys found.'});return {action:'idle'};}
    return next({...j,queue:links,total:links.length});
   }
   if(links.some(item=>item.url===j.queue[j.index]?.url)){await stop(`Survey ${j.index+1} still appears pending. Check the form for required fields or validation errors.`);return {action:'idle'};}
   return next({...j,index:j.index+1,completed:j.completed+1});
  }
  if(j.phase==='fill'&&pageUrl===j.queue[j.index]?.url)return {action:'fill',config:j.config};
  return {action:'idle'};
 }
 async function message(msg,sender){
  if(msg.type==='survey_start'){if(sender.tab)throw Error('Start autofill from the extension.');return start(msg.config);}
  if(msg.type==='survey_stop'){if(sender.tab)throw Error('Stop autofill from the extension.');return stop();}
  const task=serial.then(()=>advance(msg,sender));serial=task.catch(()=>{});return task;
 }
 return {message,stop};
})();
browser.tabs.onRemoved.addListener(async tabId=>{const {surveyJob:j}=await browser.storage.local.get('surveyJob');if(j?.running&&j.tabId===tabId)await SurveyRunner.stop('Survey tab closed.');});
browser.runtime.onStartup.addListener(()=>SurveyRunner.stop('Browser restarted. Start autofill again when ready.').catch(console.error));
