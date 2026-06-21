parkrun Event Results Navigation adds a sticky bar to single-event results pages so you can step to the previous or next event at the same location without editing the URL.

## Where it works

The bar appears on event-number URLs (for example `/coburg/results/400/`), date URLs (`/coburg/results/2024-06-15/`), and `latestresults` pages. It does not appear on event history or other aggregate views.

Junior locations (for example `westerfolds-juniors`) are supported. Navigation always stays within the current location slug.

## Controls

- **Previous event (#n−1)** and **Next event (#n+1)** links in the sticky bar
- **Keyboard shortcuts:** `[` for previous, `]` for next (suppressed while focus is in a text field)
- Previous is unavailable on event #1; Next is always available

Navigation always uses event-number URLs. The centre of the bar shows the current event number, formatted date, and shortcut hints.
