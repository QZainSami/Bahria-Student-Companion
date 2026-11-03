// Loading any portal page triggers a background sync without navigating the tab.
browser.runtime.sendMessage({type:'portal_open'}).catch(()=>{});
