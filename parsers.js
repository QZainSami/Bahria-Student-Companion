function parseTableRows(rows, courseName, pageUrl) {
  const data = [];
  for (const r of rows) {
    const cols = r.querySelectorAll('td');
    if (!cols || cols.length < 2) continue;

    const title = cols[1]?.textContent?.trim();
    if (!title) continue;

    const lastCol = cols[cols.length - 1];
    let deadlineText = lastCol?.textContent?.trim() || '';

    const extendedLabel = lastCol?.querySelector('.label-warning');
    const actualLabel = lastCol?.querySelector('.label-info');

    if (extendedLabel) {
      deadlineText = (extendedLabel.textContent || '').trim();
    } else if (actualLabel) {
      deadlineText = (actualLabel.textContent || '').trim();
    } else {
      let lines = deadlineText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length > 1) {
        const monthRegex =
          /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i;
        const candidate = lines.find((l) => monthRegex.test(l)) || lines[0];
        deadlineText = candidate;
      } else if (lines.length === 1) {
        deadlineText = lines[0];
      } else {
        deadlineText = '';
      }
    }

    deadlineText = deadlineText
      .replace(/\s+-\s+/g, ' ')
      .replace(/\u2013|\u2014/g, ' ')
      .replace(/-/g, ' ');

    let deadline = null;
    if (deadlineText) {
      const tryDate = Date.parse(deadlineText);
      if (!isNaN(tryDate)) {
        deadline = new Date(tryDate);
      } else {
        const isoMatch = deadlineText.match(/\d{1,2}\s+\w+\s+\d{4}.*$/);
        const pick = isoMatch ? isoMatch[0] : deadlineText;
        const parsed = Date.parse(pick);
        if (!isNaN(parsed)) {
          deadline = new Date(parsed);
        }
      }
    }

    // Submission check from Column 3
    const submissionCol = cols[3]?.innerHTML || '';
    const noSubmission = /no\s+submission/i.test(submissionCol);
    const hasSubmission = /<a[^>]*>[\s\S]*?Submission[\s\S]*?<\/a>/i.test(submissionCol);
    const isSubmitted = hasSubmission && !noSubmission;

    if (isSubmitted) {
      continue;
    }

    data.push({
      title,
      course: courseName,
      deadlineText: deadlineText || null,
      deadline: deadline ? deadline.toISOString() : null,
      link: pageUrl,
      submitted: isSubmitted,
      downloads: downloadLinks(cols[2], pageUrl),
    });
  }
  return data;
}


function parseAttendance(htmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  const tables = Array.from(doc.querySelectorAll('table'));
  const attendanceTable = tables.find(t => t.textContent.includes('Present Hours'));
  
  if (!attendanceTable) return [];
  
  const rows = Array.from(attendanceTable.querySelectorAll('tr'));
  const attendanceList = [];
  
  rows.forEach((r) => {
    const cols = r.querySelectorAll('td');
    if (cols.length >= 12) { 
      const courseCode = cols[1]?.textContent.trim() || '';
      const courseName = cols[2]?.textContent.trim() || '';
      const creditHours = parseFloat(cols[3]?.textContent.trim()) || 3;
      const presentColText = cols[9]?.textContent.trim() || '';
      const absentHours = parseFloat(cols[10]?.textContent.trim()) || 0;
      const totalHours = parseFloat(cols[11]?.textContent.trim()) || 0;

      if (courseName && presentColText.includes(':')) {
        const attended = parseFloat(presentColText.split(':')[0].trim());
        const isLab = courseName.toLowerCase().includes('lab') || courseCode.toUpperCase().startsWith('CSL');

        let semesterTotalHours = creditHours === 2 ? 32 : 48;
        if (isLab && creditHours === 1) semesterTotalHours = 48;

        const maxAbsencesAllowed = semesterTotalHours * 0.25;
        const percentage = totalHours > 0 ? (attended / totalHours) * 100 : 100;

        if (!isNaN(attended) && !isNaN(totalHours)) {
          attendanceList.push({
            code: courseCode,
            course: courseName,
            creditHours,
            attended,
            absent: absentHours,
            total: totalHours,
            percentage,
            isLab,
            maxAllowed: maxAbsencesAllowed,
            absentLeft: Math.max(0, maxAbsencesAllowed - absentHours)
          });
        }
      }
    }
  });
  return attendanceList;
}


// Read only actual file links; resolve relative LMS links against the fetched page.
function downloadLinks(container, base) {
  if (!container) return [];
  return [...container.querySelectorAll('a[href]')].flatMap(a => {
    try {
      const url=Core.portalUrl(new URL(a.getAttribute('href'),base).href,'lms.bahria.edu.pk');
      const path=new URL(url).pathname;
      let filename=decodeURIComponent(path.split('/').pop()||'file');
      if (!/\.[a-z0-9]{1,8}$/i.test(filename)) filename=a.getAttribute('download')||filename;
      return [{url,filename:Core.segment(filename),title:a.textContent.trim()||filename}];
    } catch { return []; }
  });
}
function parseLectureFiles(doc, base, course) {
  const files=[];
  let sequence=0;
  for (const row of doc.querySelectorAll('table tr')) {
    const cols=[...row.querySelectorAll(':scope > td')];
    if(cols.length<2)continue;
    // The portal's first column identifies the lecture; its second holds the topic.
    const candidates=downloadLinks(row,base).filter(f=>/\.(pdf|pptx?|docx?|xlsx?|zip|rar|7z|txt|csv|png|jpe?g)(?:[?#]|$)/i.test(f.url)||/download/i.test(f.title)||row.querySelector('a[download]'));
    if(!candidates.length)continue;
    sequence++;
    const number=cols[0].textContent.trim().match(/^\d+$/)?.[0]||String(sequence);
    const topic=cols[1].textContent.trim().replace(/\s+/g,' ');
    const unique=[...new Map(candidates.map(f=>[f.url,f])).values()];
    unique.forEach((f,i)=>files.push({...f,course,lectureNumber:number,part:unique.length>1?Core.letters(i):'',title:topic||f.title}));
  }
  return files;
}
