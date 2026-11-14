// A single page-load message; no idle polling or separate browser process.
(async()=>{
 const send=async message=>{const result=await browser.runtime.sendMessage(message);if(!result?.ok)throw Error(result?.error||'Survey task did not respond.');return result;};
 const table=document.getElementById('BodyPH_gvSurveyConducts');
 const links=table?[...table.querySelectorAll('a[href]')].filter(a=>a.textContent.trim()==='Evaluate').map(a=>({url:a.href,title:a.closest('tr')?.textContent.replace(/\s+/g,' ').trim()||'Survey'})):[];
 const action=await send({type:'survey_ready',dashboard:!!table,links,login:!!document.querySelector('input[type=password]')});
 if(action.action!=='fill')return;
 const visible=e=>!e.disabled&&!!e.getClientRects().length;
 const groups=new Map();for(const radio of [...document.querySelectorAll('input[type=radio]')].filter(visible)){if(!radio.name)continue;if(!groups.has(radio.name))groups.set(radio.name,[]);groups.get(radio.name).push(radio);}
 if(!groups.size)throw Error('No survey questions found. Nothing was submitted.');
 for(const options of groups.values()){
  const labelled=options.map(element=>({element,label:(element.labels?.[0]?.textContent||element.value||'').toLowerCase()}));
  const selected=SurveyAnswers.choose(labelled,action.config.rating);if(selected)selected.element.click();
 }
 const all=[...document.querySelectorAll('button,input[type=submit],input[type=button],a[id]')].filter(visible);
 const specific=all.filter(e=>/save|submit/i.test(e.id+' '+(e.value||'')+' '+e.textContent)&&!/cancel|delete|logout|search/i.test(e.id+' '+(e.value||'')+' '+e.textContent));
 const fallback=all.filter(e=>e.matches('input[type=submit]')&&!/login|cancel|delete|logout|search/i.test(e.id+' '+e.value));
 const button=specific[0]||(fallback.length===1?fallback[0]:null);
 if(!button)throw Error('Could not identify a survey Save/Submit button. Check the filled form manually.');
 const permission=await send({type:'survey_submit'});if(permission.action!=='submit')return;
 button.click();
 // Navigation restarts this worker; this handles saves without navigation.
 setTimeout(()=>send({type:'survey_after_submit'}).catch(()=>{}),4000);
})().catch(error=>browser.runtime.sendMessage({type:'survey_error',error:error.message}).catch(()=>{}));
