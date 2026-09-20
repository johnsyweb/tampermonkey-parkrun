parkrun Next Milestone Estimate adds expected dates to a parkrunner profile so you can see when they are likely to reach their next milestone club (e.g. [parkrunner A4886000](https://www.parkrun.org.uk/parkrunner/4886000/)).

parkrun rewards persistence over performance: when you reach 10 (for under 18s), 25, 50, 100, 200, 250, 300 and every 100 parkruns up to and including 1,000 Saturday 5k parkruns, whether you walk, jog, run or volunteer, you automatically enter a milestone club. This script estimates those same clubs.

Estimates assume participation at every available event on the chosen day of the week. Special events are excluded from the calculation.

## Saturday 5k milestone clubs

The script reads the parkrun total from the profile heading and appends an estimate for the next club on that ladder. Dates are based on weekly Saturdays.

The milestone club of 10 is included only for under 18s (junior age category codes starting with `J`, including `JM15-17` and `JW15-17`).

## Volunteer milestone clubs

Volunteer credits from the Volunteer Summary use the same milestone clubs as Saturday 5k finishes, including 10 for under 18s.

You can choose whether volunteering is counted on Saturdays, Sundays, or both. Those preferences are stored only in your browser and are used to recalculate the volunteer estimate.

## 2k finisher milestones

When the profile includes a junior parkrun total, an estimate for the next 2k milestone (for example junior parkrun 150) is appended for parkrunners whose most recent age category is under 15: `JM10`, `JW10`, `JM11-14`, or `JW11-14`.

2k estimates are based on weekly Sundays. Age categories such as `JM15-17` and `JW15-17` do not receive a 2k estimate.

## Imminent dates

If an estimated milestone date falls within the next seven days, that date is highlighted on the page.
