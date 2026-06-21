# parkrun results userscripts

Tampermonkey scripts that enhance parkrun results pages for people who analyse event data.

## Language

**Location**:
A named parkrun course within a country site, identified by the URL path segment (e.g. `coburg` on `parkrun.com.au`). Junior courses are separate locations with their own slug (e.g. `westerfolds-juniors`) and event-number sequence. Event navigation stays within the current location slug.
_Avoid_: Event (when meaning the course), venue

**Event**:
One completed parkrun occurrence at a location, identified by a sequential event number (#1, #2, …) and a date.
_Avoid_: Run, race

**Event number**:
The sequential count of parkrun events held at a location, shown on results pages as `#400`.
_Avoid_: Event ID, parkrun number

**Results page**:
A web page listing finishers (and volunteers) for a single event at a location.
_Avoid_: Results, event page

**Single-event results page**:
A results page for exactly one event. In scope for event navigation: event-number URLs (`/results/400/`), date URLs (`/results/2024-06-15/`), and `latestresults`. Out of scope: `eventhistory` and other aggregate views.
_Avoid_: Results URL

**Event navigation**:
Moving between single-event results pages at the same location by decrementing or incrementing the event number by 1. Previous means the lower number (older event); Next means the higher number (newer event). Previous is disabled on event #1 only; Next is always enabled — parkrun handles numbers beyond the latest. Gaps in numbering (e.g. cancelled events) are not skipped.
_Avoid_: Prev/next, event hopping

**Event navigation shortcuts**:
Keyboard accelerators for event navigation: `[` for Previous, `]` for Next. Shortcuts do not fire when focus is in an editable field (`input`, `textarea`, `contenteditable`).
_Avoid_: Hotkeys, key bindings

**Event navigation URL**:
Event navigation always targets event-number URLs (`/results/{n}/`), regardless of the URL format used to arrive at the current page.
_Avoid_: Canonical URL, results link

**Event navigation controls**:
A fixed bar at the top of the viewport containing Previous and Next controls for event navigation. The bar remains visible while scrolling results tables, pinned to the top of the viewport with page content offset so results are not hidden beneath it. Controls are anchor links (`<a href>`) styled as buttons, labelled with the target event number (e.g. “Previous event (#399)”). Previous at event #1 is non-navigable (`aria-disabled`, no `href`). The bar centre shows the current event number and formatted date wrapped in keyboard shortcut hints (e.g. “[ #400 · 15 Jun 2024 ]”), with tooltips on the bracket keys. The bar appears only once the page heading includes an event number and a finisher results table is present.
_Avoid_: Nav bar, toolbar, event picker
