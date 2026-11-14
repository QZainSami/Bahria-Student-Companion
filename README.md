# Bahria Student Companion — 0.1.4 testing build

One Firefox extension for LMS assignments, CMS attendance, lecture downloads, grade planning and portal session status.

## Install for testing
1. Extract the ZIP into a folder.
2. In Firefox or Zen, open about:debugging#/runtime/this-firefox.
3. Choose Load Temporary Add-on and select manifest.json in that folder.
4. Allow access to both university sites. Sign in to LMS and CMS normally, in regular non-container tabs.
5. Open the extension and choose Open full dashboard.

This is an unsigned testing build. Temporary installations disappear when the browser restarts. Submit the package to Mozilla for signing before normal distribution. Keep the existing trackers disabled during testing to avoid duplicate deadline notifications.

## Features
- Assignments: sync all courses using your current LMS session; automatically sync on portal page load (one-minute throttle). Manual sync also works without any portal tab open once you are logged in. No tab navigation is required.
- Attendance: fetch the attendance page directly; show percentage, remaining hours, and recovery hours/lab sessions. Preserves your existing semester-total assumptions: 48 hours, or 32 for 2-credit theory. These may need adjustment for courses outside your current program.
- Lecture files: discovers the Lecture Notes link while syncing assignments, or accepts its URL in settings; scans course pages and lists download links. Search, select files, and download into Downloads/Bahria/Course. Downloads start only on request. Firefox may ask where to save depending on your browser preferences. Newly discovered links are highlighted; replacement uploads at an identical URL are not detected.
- Grade planner: multiple saved course plans; enter assessment weights, maximum marks and earned marks; blank marks mean ungraded, zero counts as a real mark. Calculates weighted average, overall points earned, and remaining average needed for your chosen target. Unallocated weight is counted as remaining. No university grade/GPA scale is assumed.
- Sessions: check LMS and CMS independently; distinguish expired login, network failures and unrecognized page layouts. Sync errors leave existing records intact. Does not store passwords, auto-login, or prevent server-side logout.
- Deadline notifications: checks cached assignments every three hours for nearby deadlines. Toggle in settings. Toolbar badge shows pending count after assignment changes.
- JSON backup/import: backs up local records and plans. Also accepts validated JSON with assignments or attendanceData from older trackers. It cannot directly access another extension's storage; fresh sync is easiest if old versions have no export feature.

## Still needs your portal pages
Automatic import from CMS Exams → Provisional Result is NOT implemented: the result-page structure and assessment weights have not been supplied. The grade planner works with manual entries.
Lecture scanning uses the assignment tracker's existing `oc` course parameter convention. Its selectors and download discovery still need verification against your actual Lecture Notes page. Script-triggered downloads and file links hosted outside LMS are not supported by this build.

To finish those integrations, open Lecture Notes and Provisional Result while logged in, save the pages as HTML (or share screenshots and exact page URLs), remove personal identifiers, and provide the assessment weights if shown. Never share your password.

## Validation
`node --test tests/*.test.cjs`
All source JavaScript also passes `node --check`.
Background orchestration tests cover duplicate requests, login expiry and keeping cached data on failure.
An automated visual/browser test could not run because the local browser process failed to start and the in-app browser could not reach the local preview server. Live Firefox extension APIs, portal parsing and the UI therefore require a logged-in smoke test before publication.

## Before publishing
- Verify both logins, assignments from multiple courses, attendance totals, and lecture downloads in Firefox.
- Verify zero-score, missing-score and impossible-target grade scenarios.
- Verify syncing while the popup is closed, expired sessions, and logging back in.
- Use a unique listing for this combined extension: its ID differs from both existing trackers.
- No build step or remote code. Source is the package. Tests may be omitted from the uploaded ZIP.

## Privacy and permissions
All cached academic records and plans stay in browser local storage until you export or download them. Requests go to Bahria LMS/CMS using your existing login. No analytics, advertising or third-party data services.
Host access: read the two portals and fetch course pages. Storage: local records and settings. Alarms/notifications: deadline reminders. Downloads: save selected lecture files. Content scripts: notify the background when a portal page opens. No cookie API, browsing-history permission or password collection.

Based on Sami's LMS Assignment Tracker and CMS Attendance Tracker. MIT licensed.

## 0.1.1 changes
- Direct assignment file download buttons, using file links found in the Assignment/Solution File column. Files save under Bahria/Course/Assignments. Requires a valid LMS login and actual file links in that column.
- Lecture list filters by course with a dropdown populated from courses and discovered files.
- Reads lecture topics and original row numbers from the portal table. Multiple files in a row are labelled 3 A, 3 B, etc. Old cached entries use sequential numbering until rescanned.
- Compact two-column attendance and assignment cards; reduces header space and removes the large introduction. Attendance includes a compact metric strip like the original tracker.
- 15 automated checks pass, including synthetic row tests for assignment download extraction and lecture numbering. Live layout/download testing in Firefox is still required.

If this source folder is already loaded as a temporary extension, click Reload beside Bahria Student Companion in about:debugging, then sync assignments and scan lecture files once. The extension ID and local data are preserved.

## 0.1.2 download fix
- Fetches the actual authenticated file response before saving, rather than forcing the Download.php endpoint name.
- Reads the original filename from Content-Disposition and identifies common formats using content type and binary signatures. Login pages and recognizable PHP/HTML errors are rejected.
- Lecture downloads use lecture number/part and topic (for example: 3 A - Regular Expression.pdf). Assignments use the assignment title, with File 1 / File 2 for multiple attachments.
- Downloads retain their course folders. Uses the same stored links, so a reload is sufficient; rescan lectures if their cached titles still say Download Lecture.
- 20 automated tests pass, including actual fetched bytes and filename behavior using a mocked server response. A live LMS download still needs verification.

## 0.1.3 batch-download fix
- Download selected snapshots all selected file identifiers and submits one background batch.
- List refreshes no longer affect the selection being processed. Closing the popup does not own or control the loop.
- Shows batch progress and reports individual failures; a failed file does not stop the remaining selections.
- 23 automated tests pass, including three-file batches, continuation after a failure, and changes to the original selection during processing. Live Firefox download testing is still required.


## 0.1.4 — lecture downloads, sync progress and popup memory

- Refreshes encoded, dated LMS file links from their course page before download. Multiple selected files from a course reuse one fresh page request per batch. Does not alter signed/encoded tokens by inventing a new date.
- Uses Firefox's native download manager for LMS Download.php links with known original extensions, and sends the course page as referrer. Lecture number, topic and original file type are retained in the saved name.
- Recognizes files by stable token metadata across scans, so a new day's URL does not mark every existing lecture as new again.
- Retains the selected semester while scanning course pages and avoids double-encoding semester values.
- Adds Download all for the currently selected course. Uses the background batch queue and continues after individual failures.
- Shows course-by-course progress for assignments and lecture scans (for example, Syncing 2/8 — AI Lab). Removes the startup 0/0 download message and keeps download notices in the Lecture files section.
- Manual attendance refresh opens/focuses the CMS portal when CMS returns an expired/login page. Cached attendance is kept. LMS and CMS sessions are handled independently; the extension does not attempt to keep CMS logged in.
- Background page-fetch network failures retry inside an open portal tab when possible.
- Remembers the last section and lecture course. Selected lecture checkboxes survive background status updates while the popup stays open.
- Renames Mark all seen to Clear new labels; applies to the selected course only. It never deletes files or marks them downloaded.
- No survey autofill is included. The grade planner still uses manual marks and weights.

### Updating
Extract the new package or use the updated source folder, reload the extension, then sync assignments and scan lectures once. Grant the added tabs and scripting permissions when prompted; they support portal-tab requests and CMS login navigation. The extension ID is unchanged, so existing plans and cached data remain available.

### Validation
38 automated checks pass, including sanitized table fixtures derived from the supplied AI Lab lecture and assignment HTML, progress from 1/8 to 8/8, native .docx downloads, fresh dated links, expired CMS login navigation, popup section/course persistence and selected-course Download all. All JavaScript syntax checks pass. UI tests use a DOM model and network/download APIs are simulated; live Firefox/Zen portal verification is still required. The original private page sources are not included in the package.
