# Bahria Student Companion

A compact Firefox extension for Bahria University students: LMS assignments, CMS attendance, lecture downloads, grade planning, and survey autofill in one dashboard.

**Version:** 0.1.8 · **Status:** Testing release · **License:** MIT

Built for Firefox and Zen using Firefox engine **140 or newer**. This package does not support Chrome.

## Features

### Assignments

- Collect pending assignments across enrolled courses and sort them by deadline.
- Sync automatically when LMS opens, or manually with course-by-course progress.
- Download assignment attachments directly, including multiple attachments.
- Save files using the assignment title and original file extension.
- See a pending-assignment toolbar badge and optional deadline notifications.

### Attendance

- View attendance percentages, absence allowance, and recovery hours across courses.
- Show lab allowances and recovery estimates in sessions.
- Refresh without navigating to the Attendance page.
- Open CMS for login when a manual refresh detects an expired session.
- Keep cached attendance if a refresh fails.

### Lecture files

- Select a course to see its lecture topics and original numbering.
- Distinguish multiple attachments for one lecture with labels such as **3 A** and **3 B**.
- Download one file, selected files, or **all lectures in the selected course**.
- Refresh dated LMS download links before downloading.
- Preserve file types and use descriptive filenames such as `3 A - Regular Expression.pdf`.
- Keep failed selections available for retry while clearing successful selections.
- Highlight newly discovered links. **Clear new labels** removes those labels for the selected course; it does not delete or download anything.

### Grade planner

- Save separate course plans with assessment weights, maximum marks, and marks earned.
- Calculate the weighted average, overall points earned, and the remaining average needed for a target.
- Treat blank marks as ungraded and zero as an actual mark.
- Ignore unused template rows and validate partially entered assessments before saving.

Marks and weights are entered manually. Automatic import from CMS Provisional Result and official GPA conversion are not implemented.

### CMS survey autofill — testing feature

- Use the current CMS login in one tab in your existing Firefox/Zen browser.
- Fill and submit pending surveys sequentially after clicking **Start & submit surveys**.
- Show progress, check the pending list after each submission, and provide a **Stop** button.
- Run without Selenium, Python, or an extra browser process.

The answer rules follow the supplied survey bot: select the **second option** for five-choice radio groups by default; select the last label matching **Full Time**, **No**, or **Collaborative** for other groups; otherwise select the first option. The five-choice position can be changed before starting. Use these presets only when they match the answers you intend to submit.

Stop prevents subsequent submissions; it cannot undo an answer already sent. The current live survey form was unavailable during development, so this feature still needs verification when surveys return. Survey anonymity depends on the university's own system.

### Dashboard and backups

- Compact assignment and attendance cards with a Dracula Classic dark theme.
- Remember the last dashboard section and selected lecture course.
- Check LMS and CMS sessions independently.
- Export and import assignments, attendance, lecture records, grade plans, courses, settings, and sync timestamps.
- Accept supported JSON exports containing `assignments` or `attendanceData` from older trackers.

Separate extensions cannot read each other's storage. If an older tracker has no export feature, sync fresh data in Companion.

## Install for testing

1. Download the release ZIP or this repository's source and extract it into a folder.
2. In Firefox or Zen, open `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on** and select the extracted `manifest.json`.
4. Allow access to the LMS and CMS sites.
5. Sign in through the official [LMS](https://lms.bahria.edu.pk/) and [CMS](https://cms.bahria.edu.pk/) websites in regular browser tabs.
6. Open Companion, click **Sync all courses**, then **Scan lecture files**.

Temporary installations are removed when the browser restarts. For a normal persistent installation, use a Mozilla-signed package or a published Mozilla Add-ons listing. Disable the older standalone trackers during testing if you want to avoid duplicate reminders.

## Update an existing temporary installation

1. Replace the files in the folder Firefox loaded with the new version's contents.
2. Click **Reload** beside Bahria Student Companion in `about:debugging`.
3. Reopen the popup, sync assignments, and scan lectures once.

The extension ID remains the same. Export a backup before removing an installation or clearing its data.

## Downloads and login sessions

Lecture files save under `Downloads/Bahria/Course/`. Assignment files save under `Downloads/Bahria/Course/Assignments/`. Firefox's download settings may show a save-location prompt, and duplicate names receive a unique suffix.

LMS and CMS have independent login sessions. Manual background requests can work without an open portal tab while the relevant login remains valid. Some request failures fall back to an open portal tab. The extension does not store passwords, sign in automatically, or prevent CMS from expiring a session.

If lecture discovery fails, enter the exact Lecture Notes page URL in **Sessions & settings**. Downloads hosted outside the permitted LMS domain are not supported. Files replaced at the same URL cannot always be detected as new.

## Calculation assumptions

Attendance currently assumes **48 semester hours**, or **32 hours for 2-credit theory courses**. Lab-session estimates use three-hour sessions. These assumptions may differ across departments and courses.

Attendance and grade calculations are planning estimates. Confirm official requirements, weights, totals, and results with your department. Unallocated grade weight is counted as remaining work.

## Privacy and permissions

Cached academic records, grade plans, preferences, and task progress are stored locally in your browser. Portal requests use your existing browser session. Survey answers are submitted to CMS only when you start the survey tool. There are no analytics, advertising services, or transmissions of your academic records to the developer.

| Permission | Purpose |
| --- | --- |
| LMS/CMS host access | Retrieve portal pages and run the survey worker on CMS. |
| Storage | Save local records, plans, preferences, and task state. |
| Downloads | Save requested lecture and assignment attachments. |
| Alarms and notifications | Check cached deadlines every three hours and display reminders. |
| Tabs and scripting | Retry requests through portal tabs and open CMS for login. |

No password storage, cookie API access, or browsing-history permission is used. Exported backups and downloaded files remain on your device until you delete them separately.

## Performance

No frameworks, remote scripts, external fonts, or build pipeline are required. The theme is local CSS. Downloads and surveys run only when requested; surveys use a sequential queue rather than parallel browser tabs. The survey worker does not continuously poll while idle.

Background reminders run every three hours. Notification history older than 14 days is pruned. Portal activity still uses normal browser and network resources; performance depends partly on CMS/LMS response times.

## Development and validation

The files in this repository are the extension source; no build step is needed.

Run the automated tests with Node.js:

```sh
node --test tests/*.test.cjs
```

Version 0.1.8 passes **60 automated tests** and JavaScript syntax checks. Tests cover parsing, token edge cases, grade planning, backup round-trips, batch downloads, session handling, popup persistence, survey flow, and notification cleanup.

Browser APIs and network responses are simulated in these tests. Sanitized fixtures are derived from supplied portal tables. Live Firefox/Zen, authenticated portal downloads, and the current survey form still require verification; automated tests do not establish complete live compatibility.

See [CHANGELOG.md](CHANGELOG.md) for release history and the latest fixes.

## Credits and license

Created by Sami, based on the original LMS Assignment Tracker, CMS Attendance Tracker, and university survey bot. The interface uses the [Dracula Classic palette](https://draculatheme.com/spec), with lighter secondary text for compact labels.

This is an unofficial student project and is not affiliated with or endorsed by Bahria University.

Released under the [MIT License](LICENSE).


## Attendance fix in 0.1.8

Version 0.1.7 introduced overly strict Present Hours validation that rejected the CMS format `17.0 :70.83%`. A valid CMS login could therefore be reported as connected while no attendance rows were saved. Cached records could hide the problem until data was cleared or the extension was installed on another device.

Version 0.1.8 accepts the actual hours-plus-percentage format, plain numeric hours, and hours:minutes. It reads the first number as attended hours and calculates the percentage from attended and total hours. An eight-course sanitized fixture from the supplied CMS source and an empty-storage sync test verify the fix. All 60 automated tests and JavaScript syntax checks pass; live Firefox/Zen verification remains necessary.

After updating, reload the extension and click Refresh attendance while logged into CMS. Clearing local data again is unnecessary.
