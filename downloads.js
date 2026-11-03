/* Resolve actual downloaded content rather than naming the PHP handler. */
const FileDownload = (() => {
 function headerName(disposition='') {
  const encoded=disposition.match(/filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i);
  if(encoded){try{return decodeURIComponent(encoded[1].trim().replace(/^"|"$/g,''));}catch{}}
  const quoted=disposition.match(/filename\s*=\s*"((?:\\.|[^"\\])*)"/i);
  return quoted?quoted[1].replace(/\\(.)/g,'$1'):(disposition.match(/filename\s*=\s*([^;]+)/i)?.[1]||'').trim();
 }
 function ext(name='') {return name.match(/\.(pdf|pptx?|docx?|xlsx?|zip|rar|7z|txt|csv|png|jpe?g|gif|webp|mp4|mp3|ipynb|py|cpp|c|java|odt|odp|ods|rtf)$/i)?.[1].toLowerCase()||'';}
 function identify(bytes,mime='',disposition='',fallback='') {
  const text=new TextDecoder().decode(bytes.slice(0,1024)).trimStart();
  if(/^<(?:!doctype\s+html|html|head|body|form|script|\?php)\b/i.test(text)||/^(?:Warning|Fatal error|Notice):/i.test(text))throw Error('LMS returned a web page or error instead of a file. Open LMS, log in, then try again.');
  if(text.startsWith('%PDF-'))return 'pdf';
  if(bytes[0]===0x50&&bytes[1]===0x4b){
   const directory=new TextDecoder('latin1').decode(bytes.slice(-262144));
   if(directory.includes('word/'))return 'docx';if(directory.includes('ppt/'))return 'pptx';if(directory.includes('xl/'))return 'xlsx';
   return ext(headerName(disposition))||'zip';
  }
  if(bytes[0]===0x89&&text.includes('PNG'))return 'png';
  if(bytes[0]===0xff&&bytes[1]===0xd8)return 'jpg';
  const named=ext(headerName(disposition));if(named)return named;
  const types={'application/pdf':'pdf','application/msword':'doc','application/vnd.ms-powerpoint':'ppt','application/vnd.ms-excel':'xls','application/vnd.openxmlformats-officedocument.wordprocessingml.document':'docx','application/vnd.openxmlformats-officedocument.presentationml.presentation':'pptx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':'xlsx','application/zip':'zip','application/x-rar-compressed':'rar','application/vnd.rar':'rar','application/x-7z-compressed':'7z','text/plain':'txt','text/csv':'csv','image/png':'png','image/jpeg':'jpg','image/gif':'gif','image/webp':'webp'};
  const type=mime.split(';')[0].trim().toLowerCase();
  if(type==='text/html'||type==='application/json')throw Error('LMS did not return a downloadable file. Please log in and try again.');
  return types[type]||ext(fallback)||'bin';
 }
 function filename(title,extension){return Core.segment(String(title||'Untitled').replace(new RegExp('\\.'+extension+'$','i'),''))+'.'+extension;}
 async function start(file,title,folder){
  const response=await fetch(Core.portalUrl(file.url,'lms.bahria.edu.pk'),{credentials:'include',signal:AbortSignal.timeout(60000)});
  if(!response.ok)throw Error('Download failed: HTTP '+response.status);
  if(/login|signin/i.test(new URL(response.url||file.url).pathname))throw Error('LMS session expired. Log in and try again.');
  const blob=await response.blob();if(!blob.size)throw Error('LMS returned an empty file.');
  const extension=identify(new Uint8Array(await blob.arrayBuffer()),response.headers.get('Content-Type')||'',response.headers.get('Content-Disposition')||'',file.filename);
  // A neutral MIME type prevents a misconfigured server from changing the chosen suffix.
  const url=URL.createObjectURL(new Blob([blob],{type:'application/octet-stream'}));
  try{
   const id=await browser.downloads.download({url,filename:folder+'/'+filename(title,extension),conflictAction:'uniquify'});
   // The browser consumes the blob at download start; retain it briefly for completion.
   setTimeout(()=>URL.revokeObjectURL(url),60000);return id;
  }catch(e){URL.revokeObjectURL(url);throw e;}
 }
 return {headerName,identify,filename,start};
})();
if(typeof module!=='undefined')module.exports=FileDownload;
