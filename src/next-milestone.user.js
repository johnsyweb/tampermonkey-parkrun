// ==UserScript==
// @name         parkrun Next Milestone Estimate
// @description  Estimates when a parkrunner will reach their next milestone, assuming a parkrun every Saturday
// @author       Pete Johns (@johnsyweb)
// @downloadURL  https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/next-milestone.user.js
// @grant        none
// @homepage     https://www.johnsy.com/tampermonkey-parkrun//
// @icon         https://www.google.com/s2/favicons?sz=64&domain=parkrun.com.au
// @license      MIT
// @match        *://www.parkrun.ca/parkrunner/*
// @match        *://www.parkrun.co.at/parkrunner/*
// @match        *://www.parkrun.co.nl/parkrunner/*
// @match        *://www.parkrun.co.nz/parkrunner/*
// @match        *://www.parkrun.co.za/parkrunner/*
// @match        *://www.parkrun.com.au/parkrunner/*
// @match        *://www.parkrun.com.de/parkrunner/*
// @match        *://www.parkrun.dk/parkrunner/*
// @match        *://www.parkrun.fi/parkrunner/*
// @match        *://www.parkrun.fr/parkrunner/*
// @match        *://www.parkrun.ie/parkrunner/*
// @match        *://www.parkrun.it/parkrunner/*
// @match        *://www.parkrun.jp/parkrunner/*
// @match        *://www.parkrun.lt/parkrunner/*
// @match        *://www.parkrun.my/parkrunner/*
// @match        *://www.parkrun.no/parkrunner/*
// @match        *://www.parkrun.org.uk/parkrunner/*
// @match        *://www.parkrun.pl/parkrunner/*
// @match        *://www.parkrun.se/parkrunner/*
// @match        *://www.parkrun.sg/parkrunner/*
// @match        *://www.parkrun.us/parkrunner/*
// @namespace    http://tampermonkey.net/
// @run-at       document-end
// @supportURL   https://github.com/johnsyweb/tampermonkey-parkrun/issues/
// @tag          parkrun
// @screenshot-url       https://www.parkrun.com.au/parkrunner/1001388/
// @screenshot-selector  h3
// @screenshot-timeout   8000
// @screenshot-viewport  1200x800
// @updateURL    https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/next-milestone.user.js
// @version      1.0.0
// ==/UserScript==

(function () {
  'use strict';

  const milestones = {
    10: { restricted_age: 'J' },
    25: {},
    50: {},
    100: {},
    250: {},
    500: {},
    1000: {},
  };

  const juniorMilestones = {
    11: { restricted_age: 'J', name: 'Half marathon' },
    21: { restricted_age: 'J', name: 'Marathon' },
    50: { restricted_age: 'J', name: 'Ultra marathon' },
    100: { restricted_age: 'J', name: 'junior parkrun 100' },
    250: { restricted_age: 'J', name: 'junior parkrun 250' },
  };

  const volunteerMilestones = {
    10: {},
    25: {},
    50: {},
    100: {},
    250: {},
    500: {},
    1000: {},
  };

  function findParkrunTotalHeading(doc = document) {
    const headings = doc.querySelectorAll('h3');
    for (const heading of headings) {
      const text = heading.textContent?.trim() ?? '';
      const match = text.match(/([\d,]+)\s+parkruns?\b/i);
      if (match) {
        const total = parseInt(match[1].replace(/,/g, ''), 10);
        return { heading, total };
      }
    }
    return null;
  }

  function findJuniorParkrunTotalHeading(doc = document) {
    const headings = doc.querySelectorAll('h3');
    for (const heading of headings) {
      const text = heading.textContent?.trim() ?? '';
      const match = text.match(/([\d,]+)\s+junior\s+parkruns?\s+total/i);
      if (match) {
        const total = parseInt(match[1].replace(/,/g, ''), 10);
        return { heading, total };
      }
    }
    return null;
  }

  function findAgeCategory(doc = document) {
    const paragraphs = doc.querySelectorAll('p');
    for (const p of paragraphs) {
      const text = p.textContent ?? '';
      const match = text.match(/Most recent age category was\s+([A-Z]+\d+[-\d]*)/i);
      if (match) {
        return match[1];
      }
    }
    return null;
  }

  function findVolunteerDaysTotal(doc = document) {
    const heading = doc.querySelector('#volunteer-summary');
    if (!heading) return null;

    let table = heading.nextElementSibling;
    if (!table || table.tagName !== 'TABLE') {
      table = heading.parentElement?.querySelector('table');
    }
    if (!table) return null;

    const footerRow = table.querySelector('tfoot tr');
    if (!footerRow) return null;

    const cells = footerRow.querySelectorAll('td');
    if (cells.length < 2) return null;

    const totalCell = cells[1].querySelector('strong');
    if (!totalCell) return null;

    const totalText = totalCell.textContent?.trim() ?? '';
    const total = parseInt(totalText.replace(/,/g, ''), 10);
    return Number.isNaN(total) ? null : total;
  }

  function getNextMilestone(total, ageCategory = null, milestoneMap = milestones) {
    const milestoneValues = Object.keys(milestoneMap)
      .map(Number)
      .sort((a, b) => a - b);
    return (
      milestoneValues.find((value) => {
        if (value <= total) return false;
        const milestone = milestoneMap[value];
        if (milestone.restricted_age && ageCategory) {
          return ageCategory.startsWith(milestone.restricted_age);
        }
        return !milestone.restricted_age;
      }) ?? null
    );
  }

  function getNextMilestoneDefinition(total, ageCategory, milestoneMap) {
    const nextValue = getNextMilestone(total, ageCategory, milestoneMap);
    if (!nextValue) return null;
    return { value: nextValue, definition: milestoneMap[nextValue] };
  }

  function findMostRecentFinishDate(doc = document) {
    const resultsTable = doc.querySelector('table#results tbody');
    if (!resultsTable) return null;

    const firstRow = resultsTable.querySelector('tr');
    if (!firstRow) return null;

    const cells = firstRow.querySelectorAll('td');
    if (cells.length < 2) return null;

    const dateLink = cells[1].querySelector('a');
    if (!dateLink) return null;

    const dateText = dateLink.textContent?.trim();
    if (!dateText) return null;

    const parts = dateText.split('/');
    if (parts.length !== 3) return null;

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);

    return new Date(year, month, day);
  }

  function getNextSaturday(date = new Date(), mostRecentFinishDate = null) {
    const result = new Date(date);
    const day = result.getDay();

    if (day === 6) {
      if (mostRecentFinishDate) {
        const recentYear = mostRecentFinishDate.getFullYear();
        const recentMonth = mostRecentFinishDate.getMonth();
        const recentDay = mostRecentFinishDate.getDate();
        const currentYear = date.getFullYear();
        const currentMonth = date.getMonth();
        const currentDay = date.getDate();

        if (
          recentYear === currentYear &&
          recentMonth === currentMonth &&
          recentDay === currentDay
        ) {
          result.setDate(result.getDate() + 7);
        }
      }
      result.setHours(0, 0, 0, 0);
      return result;
    }

    const daysUntilSaturday = (6 - day + 7) % 7;
    result.setDate(result.getDate() + daysUntilSaturday);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  function getNextSunday(date = new Date(), mostRecentFinishDate = null) {
    const result = new Date(date);
    const day = result.getDay();

    if (day === 0) {
      if (mostRecentFinishDate) {
        const recentYear = mostRecentFinishDate.getFullYear();
        const recentMonth = mostRecentFinishDate.getMonth();
        const recentDay = mostRecentFinishDate.getDate();
        const currentYear = date.getFullYear();
        const currentMonth = date.getMonth();
        const currentDay = date.getDate();

        if (
          recentYear === currentYear &&
          recentMonth === currentMonth &&
          recentDay === currentDay
        ) {
          result.setDate(result.getDate() + 7);
        }
      }
      result.setHours(0, 0, 0, 0);
      return result;
    }

    const daysUntilSunday = (0 - day + 7) % 7;
    result.setDate(result.getDate() + daysUntilSunday);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  function calculateMilestoneDate(
    currentTotal,
    nextMilestone,
    startDate = new Date(),
    mostRecentFinishDate = null
  ) {
    if (!nextMilestone || nextMilestone <= currentTotal) return null;

    const finishesNeeded = nextMilestone - currentTotal;
    const firstFinishDate = getNextSaturday(startDate, mostRecentFinishDate);
    const targetDate = new Date(firstFinishDate);
    targetDate.setDate(firstFinishDate.getDate() + (finishesNeeded - 1) * 7);
    return targetDate;
  }

  function calculateJuniorMilestoneDate(
    currentTotal,
    nextMilestone,
    startDate = new Date(),
    mostRecentFinishDate = null
  ) {
    if (!nextMilestone || nextMilestone <= currentTotal) return null;

    const finishesNeeded = nextMilestone - currentTotal;
    const firstFinishDate = getNextSunday(startDate, mostRecentFinishDate);
    const targetDate = new Date(firstFinishDate);
    targetDate.setDate(firstFinishDate.getDate() + (finishesNeeded - 1) * 7);
    return targetDate;
  }

  function formatDate(date) {
    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  function isDateInNextWeek(date, now = new Date()) {
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfNextWeek = new Date(startOfToday);
    endOfNextWeek.setDate(endOfNextWeek.getDate() + 7);

    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    return checkDate >= startOfToday && checkDate < endOfNextWeek;
  }

  function highlightDateIfNeeded(parentElement, targetDate, now = new Date()) {
    if (!targetDate || !parentElement) return;

    if (!isDateInNextWeek(targetDate, now)) return;

    // Find all text nodes and highlight the formatted date string
    const dateString = formatDate(targetDate);
    const textNodes = [];

    function collectTextNodes(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        textNodes.push(node);
      } else {
        for (let i = 0; i < node.childNodes.length; i++) {
          collectTextNodes(node.childNodes[i]);
        }
      }
    }

    collectTextNodes(parentElement);

    textNodes.forEach((textNode) => {
      if (textNode.textContent.includes(dateString)) {
        const span = document.createElement('span');
        span.style.backgroundColor = '#ffeb3b';
        span.style.padding = '0 2px';
        span.style.borderRadius = '2px';
        span.textContent = textNode.textContent;
        textNode.parentNode.replaceChild(span, textNode);
      }
    });
  }

  function getVolunteerDayPreferences(storageKey = 'parkrun-volunteer-days') {
    if (typeof localStorage === 'undefined') {
      return { saturday: true, sunday: true };
    }
    const stored = localStorage.getItem(storageKey);
    if (!stored) {
      return { saturday: true, sunday: true };
    }
    try {
      return JSON.parse(stored);
    } catch {
      return { saturday: true, sunday: true };
    }
  }

  function setVolunteerDayPreferences(preferences, storageKey = 'parkrun-volunteer-days') {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(preferences));
    }
  }

  function getNextVolunteerMilestoneDate(
    currentVolunteerDays,
    nextMilestone,
    startDate = new Date(),
    preferences = null
  ) {
    if (!nextMilestone || nextMilestone <= currentVolunteerDays) return null;

    const prefs = preferences || getVolunteerDayPreferences();
    const daysNeeded = nextMilestone - currentVolunteerDays;

    if (!prefs.saturday && !prefs.sunday) return null;

    // If volunteering on both days, they volunteer twice per week
    if (prefs.saturday && prefs.sunday) {
      const nextSaturday = new Date(startDate);
      const daysUntilSaturday = (6 - nextSaturday.getDay() + 7) % 7;
      nextSaturday.setDate(nextSaturday.getDate() + daysUntilSaturday);

      const nextSunday = new Date(startDate);
      const daysUntilSunday = (0 - nextSunday.getDay() + 7) % 7;
      nextSunday.setDate(nextSunday.getDate() + daysUntilSunday);

      // Determine which day comes first
      const firstDay = nextSaturday < nextSunday ? nextSaturday : nextSunday;
      const firstIsSaturday = nextSaturday < nextSunday;

      // Calculate complete weeks (2 volunteers per week)
      const completeWeeks = Math.floor((daysNeeded - 1) / 2);
      const remainder = (daysNeeded - 1) % 2;

      const targetDate = new Date(firstDay);
      targetDate.setDate(firstDay.getDate() + completeWeeks * 7);

      // If there's a remainder, add days to get to the second volunteer day of that week
      if (remainder === 1) {
        targetDate.setDate(targetDate.getDate() + (firstIsSaturday ? 1 : 6));
      }

      targetDate.setHours(0, 0, 0, 0);
      return targetDate;
    }

    // Only one day selected
    if (prefs.saturday) {
      const saturdayDate = new Date(startDate);
      const daysUntilSaturday = (6 - saturdayDate.getDay() + 7) % 7;
      saturdayDate.setDate(saturdayDate.getDate() + daysUntilSaturday);
      saturdayDate.setDate(saturdayDate.getDate() + (daysNeeded - 1) * 7);
      saturdayDate.setHours(0, 0, 0, 0);
      return saturdayDate;
    }

    if (prefs.sunday) {
      const sundayDate = new Date(startDate);
      const daysUntilSunday = (0 - sundayDate.getDay() + 7) % 7;
      sundayDate.setDate(sundayDate.getDate() + daysUntilSunday);
      sundayDate.setDate(sundayDate.getDate() + (daysNeeded - 1) * 7);
      sundayDate.setHours(0, 0, 0, 0);
      return sundayDate;
    }

    return null;
  }

  function appendMilestoneEstimate(heading, milestone, dateString, targetDate = null) {
    if (!heading || heading.dataset.milestoneEstimateApplied === 'true') return;
    const estimateNode = document.createTextNode(
      ` (expected to reach ${milestone} around ${dateString})`
    );
    const textNodes = Array.from(heading.childNodes).filter(
      (node) => node.nodeType === Node.TEXT_NODE
    );
    const ampersandNode = textNodes.find((node) => node.textContent?.includes('&'));

    if (ampersandNode) {
      const text = ampersandNode.textContent ?? '';
      const ampIndex = text.indexOf('&');
      if (ampIndex >= 0) {
        const beforeText = text.slice(0, ampIndex).trimEnd();
        const afterText = text.slice(ampIndex).trimStart();
        const beforeNode = document.createTextNode(beforeText);
        const afterNode = document.createTextNode(` ${afterText}`);
        heading.insertBefore(beforeNode, ampersandNode);
        heading.insertBefore(estimateNode, ampersandNode);
        heading.insertBefore(afterNode, ampersandNode);
        heading.removeChild(ampersandNode);
      } else {
        heading.insertBefore(estimateNode, ampersandNode);
      }
    } else {
      heading.appendChild(estimateNode);
    }
    heading.dataset.milestoneEstimateApplied = 'true';

    if (targetDate) {
      highlightDateIfNeeded(heading, targetDate);
    }
  }

  function appendVolunteerDaysSummary(heading, totalDays, nextMilestone = null, targetDate = null) {
    if (!heading || heading.dataset.volunteerDaysApplied === 'true') return;
    const summary = document.createElement('p');
    summary.id = 'volunteer-days-summary';
    let text = `${totalDays} volunteer days total`;
    if (nextMilestone && targetDate) {
      text += ` (expected to reach ${nextMilestone} around ${targetDate})`;
    }
    summary.textContent = text;

    const prefsContainer = document.createElement('div');
    prefsContainer.id = 'volunteer-days-preferences';
    prefsContainer.style.marginTop = '0.5em';
    prefsContainer.style.fontSize = '0.9em';

    const preferences = getVolunteerDayPreferences();

    const saturdayLabel = document.createElement('label');
    saturdayLabel.style.marginRight = '1em';
    saturdayLabel.style.cursor = 'pointer';
    const saturdayCheckbox = document.createElement('input');
    saturdayCheckbox.type = 'checkbox';
    saturdayCheckbox.checked = preferences.saturday;
    saturdayCheckbox.id = 'volunteer-saturday';
    saturdayCheckbox.addEventListener('change', () => {
      const updated = getVolunteerDayPreferences();
      updated.saturday = saturdayCheckbox.checked;
      setVolunteerDayPreferences(updated);
      window.location.reload();
    });
    saturdayLabel.appendChild(saturdayCheckbox);
    saturdayLabel.appendChild(document.createTextNode(' Volunteer on Saturdays'));

    const sundayLabel = document.createElement('label');
    sundayLabel.style.cursor = 'pointer';
    const sundayCheckbox = document.createElement('input');
    sundayCheckbox.type = 'checkbox';
    sundayCheckbox.checked = preferences.sunday;
    sundayCheckbox.id = 'volunteer-sunday';
    sundayCheckbox.addEventListener('change', () => {
      const updated = getVolunteerDayPreferences();
      updated.sunday = sundayCheckbox.checked;
      setVolunteerDayPreferences(updated);
      window.location.reload();
    });
    sundayLabel.appendChild(sundayCheckbox);
    sundayLabel.appendChild(document.createTextNode(' Volunteer on Sundays'));

    prefsContainer.appendChild(saturdayLabel);
    prefsContainer.appendChild(sundayLabel);

    heading.insertAdjacentElement('afterend', summary);
    summary.insertAdjacentElement('afterend', prefsContainer);
    heading.dataset.volunteerDaysApplied = 'true';

    // Extract date from targetDate string and highlight if in next week
    if (targetDate) {
      // Parse the formatted date string back to a Date object
      const dateObj = new Date(targetDate);
      if (!Number.isNaN(dateObj.getTime())) {
        highlightDateIfNeeded(summary, dateObj);
      }
    }
  }

  function appendJuniorMilestoneEstimate(heading, milestoneName, dateString, targetDate = null) {
    if (!heading || heading.dataset.juniorMilestoneEstimateApplied === 'true') return;
    heading.appendChild(
      document.createTextNode(` (expected to reach ${milestoneName} around ${dateString})`)
    );
    heading.dataset.juniorMilestoneEstimateApplied = 'true';

    if (targetDate) {
      highlightDateIfNeeded(heading, targetDate);
    }
  }

  function applyMilestoneEstimate(doc = document, now = new Date()) {
    const result = findParkrunTotalHeading(doc);
    if (!result) {
      console.log('Parkrun total heading not found');
      return;
    }

    const ageCategory = findAgeCategory(doc);
    const nextMilestone = getNextMilestone(result.total, ageCategory);
    if (!nextMilestone) {
      console.log('No upcoming milestone found');
      return;
    }

    const mostRecentFinishDate = findMostRecentFinishDate(doc);
    const targetDate = calculateMilestoneDate(
      result.total,
      nextMilestone,
      now,
      mostRecentFinishDate
    );
    if (!targetDate) {
      console.log('Unable to calculate milestone date');
      return;
    }

    appendMilestoneEstimate(result.heading, nextMilestone, formatDate(targetDate), targetDate);

    const volunteerDaysTotal = findVolunteerDaysTotal(doc);
    if (volunteerDaysTotal !== null) {
      const nextVolunteerMilestone = getNextMilestone(
        volunteerDaysTotal,
        null,
        volunteerMilestones
      );
      let volunteerTargetDate = null;
      let volunteerTargetDateFormatted = null;
      if (nextVolunteerMilestone) {
        volunteerTargetDate = getNextVolunteerMilestoneDate(
          volunteerDaysTotal,
          nextVolunteerMilestone,
          now
        );
        if (volunteerTargetDate) {
          volunteerTargetDateFormatted = formatDate(volunteerTargetDate);
        }
      }
      appendVolunteerDaysSummary(
        result.heading,
        volunteerDaysTotal,
        nextVolunteerMilestone,
        volunteerTargetDateFormatted
      );
    }

    const juniorResult = findJuniorParkrunTotalHeading(doc);
    if (juniorResult && ageCategory?.startsWith('J')) {
      const juniorNext = getNextMilestoneDefinition(
        juniorResult.total,
        ageCategory,
        juniorMilestones
      );
      if (juniorNext?.definition?.name) {
        const juniorTargetDate = calculateJuniorMilestoneDate(
          juniorResult.total,
          juniorNext.value,
          now
        );
        if (juniorTargetDate) {
          appendJuniorMilestoneEstimate(
            juniorResult.heading,
            juniorNext.definition.name,
            formatDate(juniorTargetDate),
            juniorTargetDate
          );
        }
      }
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      milestones,
      juniorMilestones,
      volunteerMilestones,
      findParkrunTotalHeading,
      findJuniorParkrunTotalHeading,
      findAgeCategory,
      findVolunteerDaysTotal,
      findMostRecentFinishDate,
      getNextMilestone,
      getNextMilestoneDefinition,
      getNextSaturday,
      getNextSunday,
      calculateMilestoneDate,
      calculateJuniorMilestoneDate,
      formatDate,
      isDateInNextWeek,
      highlightDateIfNeeded,
      getVolunteerDayPreferences,
      setVolunteerDayPreferences,
      getNextVolunteerMilestoneDate,
      appendMilestoneEstimate,
      appendJuniorMilestoneEstimate,
      appendVolunteerDaysSummary,
      applyMilestoneEstimate,
    };
  } else {
    applyMilestoneEstimate();
  }
})();
