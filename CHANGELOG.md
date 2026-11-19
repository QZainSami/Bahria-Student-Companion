# Version 0.2.3

- Fix the compact Android layout applying to narrow desktop Firefox/Zen action popups.
- Apply mobile sizing only after Android is detected, preserving the normal desktop popup and full dashboard.

# Version 0.1.10

- Correct the Android manifest target for compatibility with Firefox's temporary add-on loader and AMO: use the documented empty `gecko_android` target.
- Keep the Android compact popup UI and desktop-only full dashboard introduced in 0.1.9.
- No code, permission, data, or network behavior changes from 0.1.9.

# Version 0.1.9

- Add Firefox for Android compatibility through the Android Gecko manifest target (Firefox Android 140+).
- Use a compact, single-column mobile popup with scrollable section tabs and touch-friendly full-width actions.
- Keep the full dashboard desktop-only: Android opens and stays in the compact extension interface.
- Avoid the desktop window-focus API when opening CMS login on Android.
- No new permissions, data collection, network endpoints, or background polling.

# Version 0.1.8

- Fix attendance disappearing after clearing local data or installing on another device.
- Accept CMS Present Hours values containing a percentage, such as `17.0 :70.83%`, alongside plain numbers and hours:minutes formats.
- Recognize Present Hours headers containing line breaks or additional whitespace.
- Clarify the error when no readable attendance records are found, while retaining cached data.
- Add tests based on the supplied eight-course attendance page and a fresh sync with empty local storage.
- No new permissions or dependencies.

# Version 0.1.7

- Fix blank Grade Planner templates: prompt until data is entered, ignore unused rows, retain weighted ungraded assessments, and reject partially entered rows on save.
- Share LMS token decoding across download handling; support spaces, commas in filenames and missing base64 padding.
- Include courses in validated backup export/import.
- Accept integer attendance hours and parse an existing attendance Document without redundant serialization.
- Preserve descriptive lecture titles while refreshing file links.
- Prune notification history older than 14 days and restore badges from cached assignments.
- Clear successful batch selections while retaining failed files.
- Stop survey automation on non-CMS redirects and safely ignore missing portal sender URLs.
- Remove unused search CSS and hide the duplicate dashboard-opening button on the full dashboard.
- Keep the supported Firefox minimum at 140.0; compatibility with 109 was not established.

# Version 0.1.6

- Apply Dracula Classic colors across the popup and full dashboard.
- Use purple primary actions and selection, cyan links, warm white text, and softer dark surfaces.
- Improve secondary-text contrast for compact labels and style native controls, focus outlines and scrollbars consistently.
- Styling only: no new permissions, dependencies, animation, or background activity.

# Version 0.1.5

- Add a user-started Firefox CMS survey autofill queue based on the existing survey bot.
- Use the existing CMS login in one browser tab; process and submit surveys sequentially.
- Add progress and Stop; verify each survey disappears from the pending list before advancing.
- Preserve the bot's default answer rules, with a configurable five-option rating position.
- No new permissions beyond version 0.1.4. Live survey testing remains pending.

# Version 0.1.4

- Refresh dated LMS file links before downloading and preserve topic-based filenames and file types.
- Add Download all for the selected lecture course.
- Display course-by-course assignment and lecture sync progress.
- Fix unrelated 0/0 download notices appearing during sync.
- Open CMS for login when manual attendance refresh detects an expired session.
- Remember the last dashboard section and lecture course.
- Preserve lecture selections during status updates.
- Rename Mark all seen to Clear new labels and limit it to the selected course.

After updating, reload the extension, sync assignments and scan lecture files once.
