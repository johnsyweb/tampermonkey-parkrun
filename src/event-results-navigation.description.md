parkrun Event Results Navigation adds a sticky bar at the bottom of single-event results pages so you can step to the previous or next event at the same location without editing the URL (e.g. [Coburg event #400](https://www.parkrun.com.au/coburg/results/400/)).

## Where it works

The bar appears on event-number URLs, date URLs, and `latestresults` pages. It does not appear on event history or other aggregate views.

Junior locations (for example `westerfolds-juniors`) are supported. Navigation always stays within the current location slug.

## Controls

- **Previous** and **Next** controls in a bottom sticky bar (compact labels with full names in accessible labels)
- **Keyboard shortcuts:** `[` for previous, `]` for next (suppressed while focus is in a text field)
- Previous is unavailable on event #1; Next is always available

Navigation always uses event-number URLs. The centre of the bar shows the current event number, formatted date, and shortcut hints. Page content is padded at the bottom so the bar does not cover results.
