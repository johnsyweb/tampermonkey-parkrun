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

**Microsite screenshot**:
A PNG image showing a userscript's effect on a live parkrun page, displayed on that script's page on the microsite.
_Avoid_: Screenshot, thumbnail, preview image

**Screenshot target**:
The userscript UI element that a microsite screenshot is composed around, identified in the userscript header by `@screenshot-selector`.
_Avoid_: Screenshot element, capture region

**5k finisher milestone**:
A Saturday 5k finish-count club open to all ages: 25, 50, 100, 250, 500, or 1000 finishes.
_Avoid_: parkrun milestone, adult milestone, Saturday milestone (when meaning only the all-ages ladder)

**5k junior finisher milestone**:
The Saturday 5k finish-count club available only to juniors (under 18): 10 finishes.
_Avoid_: Junior 10, under-18 milestone (when ambiguous with 2k or volunteer)

**2k finisher milestone**:
A junior-parkrun (2k) finish-count club earned only from finishes (running or walking) at 2k events: 10, 25, 50, 75, 100, 150, 200, 250, or 300. Distance-named counts (Half marathon, Marathon, Ultra marathon) are not 2k finisher milestones. These clubs are awarded only at 2k events. Only parkrunners under 15 may finish at 2k events.
_Avoid_: Junior club milestone, junior milestone, Half marathon, Marathon, Ultra marathon

**2k-eligible age category**:
A junior age category for parkrunners who may still finish at 2k events (under 15): `JM10`, `JW10`, `JM11-14`, or `JW11-14`. 2k finisher milestone estimates apply only for these categories — not `JM15-17` / `JW15-17`.
_Avoid_: Junior age category (when used as the 2k finisher gate), J*

**Junior age category**:
A parkrunner age category whose code begins with `J`, e.g. `JM10`, `JW10`, `JM11-14`, `JW11-14`, `JM15-17`, `JW15-17`. Used to gate under-18-only clubs on the 5k and volunteer ladders (5k junior finisher 10, junior volunteer 10). Specs must use real category codes — never invented forms such as `J20-24`.
_Avoid_: J20-24

**Volunteer milestone**:
A volunteer-credit club earned across 5k and 2k volunteering, open to all ages: 25, 50, 100, 250, 500, or 1000 credits.
_Avoid_: Volunteer club (when meaning only the all-ages ladder)

**Junior volunteer milestone**:
The volunteer-credit club available only to juniors (under 18), counting credits from both 5k and 2k volunteering: 10 credits. This is the cross-distance volunteer-club ladder, not the 2k junior participation clubs.
_Avoid_: Volunteer 10 (when ambiguous with 2k junior participation)

**2k junior volunteer milestone**:
Progress for juniors toward the same 10–300 clubs awarded at 2k events, counted from volunteer credits at any parkrun (both 2k and 5k). Distinct from 2k finisher milestones (2k finishes only) and from the cross-distance junior volunteer milestone (volunteer-club 10).
_Avoid_: Junior volunteer milestone (ambiguous with cross-distance volunteer 10)
