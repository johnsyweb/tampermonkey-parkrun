parkrun Wilson index display calculates a parkrunner’s Wilson index on their all-results page (e.g. [parkrunner A507](https://www.parkrun.org.uk/parkrunner/507/all/)).

## What is the Wilson index?

The Wilson index is the highest consecutive event number completed starting from event #1 across all finishes. A gap breaks the sequence permanently (for example finishes at events 1, 2, 3, and 5 yield a Wilson index of 3).

## What you see

The Wilson index value, a chart of how it grew with parkrun count, and a form to compare another athlete by ID (optional leading `A` is stripped). The friend’s public all-results page is fetched in your browser for the overlay.

## Privacy and data

Fetched all-results HTML may be cached in `sessionStorage` for about an hour (with a stale fallback if a later fetch fails). Nothing is sent to the author or any third party.
