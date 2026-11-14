/* Shared pure logic; no network or browser dependencies. */
const Core = (() => {
  function segment(value) {
    return String(value || 'Untitled').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').replace(/\.{2,}/g,'_').replace(/[. ]+$/g,'').replace(/^(con|prn|aux|nul|com\d|lpt\d)(\.|$)/i,'_$1$2').slice(0,100) || 'Untitled';
  }
  function portalUrl(value, host) {
    const u = new URL(value);
    if (u.protocol !== 'https:' || !['lms.bahria.edu.pk','cms.bahria.edu.pk'].includes(u.hostname) || (host && u.hostname !== host) || u.username || u.password || u.port) throw Error('Use an HTTPS Bahria LMS or CMS URL.');
    return u.href;
  }
  function grades(rows,target) {
    if (!Number.isFinite(target) || target<0 || target>100) throw Error('Target must be between 0 and 100.');
    let earned=0, completed=0,total=0;
    for (const r of rows) {
      const weight=Number(r.weight),max=Number(r.max);
      if (!Number.isFinite(weight)||weight<=0||weight>100||!Number.isFinite(max)||max<=0) throw Error('Each weight and maximum mark must be positive.');
      total+=weight;
      if (r.score !== '' && r.score != null) {
        const score=Number(r.score);
        if (!Number.isFinite(score)||score<0||score>max) throw Error('Marks must be between zero and the maximum.');
        completed+=weight;earned+=score/max*weight;
      }
    }
    if (total>100.001) throw Error('Weights exceed 100%.');
    const remaining=100-completed;
    const needed=remaining>0 ? Math.max(0,(target-earned)/remaining*100) : null;
    return {earned,completed,total,remaining,current:completed?earned/completed*100:null,needed,possible:target<=earned+remaining};
  }
  function pending(items,now=Date.now()) {
    const today=new Date(now);today.setHours(0,0,0,0);
    return items.filter(a=>!a.submitted && (!a.deadline || new Date(a.deadline)>=today)).sort((a,b)=>(Date.parse(a.deadline)||Infinity)-(Date.parse(b.deadline)||Infinity));
  }
  function letters(index) {
    let label='';
    for(let n=index+1;n>0;n=Math.floor((n-1)/26))label=String.fromCharCode(65+(n-1)%26)+label;
    return label;
  }
  function fileToken(url) {
    try {
      const k=new URL(url).searchParams.get('k');if(!k)return null;
      let raw=k.replace(/ /g,'+').replace(/-/g,'+').replace(/_/g,'/');
      while(raw.length%4)raw+='=';
      const fields=atob(raw).split(',');
      if(fields.length<6)return null;
      const original=fields.slice(4,-1).join(',');
      let source=fields.at(-1);if(!/^https?:/i.test(source))source='https://'+source;
      return {date:fields[1],original,key:[fields[2],fields[3],original].join('|'),source:portalUrl(source,'lms.bahria.edu.pk')};
    }catch{return null;}
  }
  function gradeRows(rows) {
    const blank=v=>v==null||String(v).trim()==='';
    return rows.filter(r=>!(blank(r.weight)&&blank(r.score)&&(blank(r.max)||Number(r.max)===100)));
  }
  function fileIdentity(url){return fileToken(url)?.key||url;}
  return {segment,portalUrl,grades,pending,letters,fileToken,fileIdentity,gradeRows};

})();
if (typeof module !== 'undefined') module.exports=Core;
