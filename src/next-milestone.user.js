// ==UserScript==
// @name         parkrun Next Milestone Estimate
// @description  Estimates when a parkrunner will reach their next milestone based on Saturday parkruns
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

  function findMostRecentRunDate(doc = document) {
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

  function getNextSaturday(date = new Date(), mostRecentRunDate = null) {
    const result = new Date(date);
    const day = result.getDay();

    if (day === 6) {
      if (mostRecentRunDate) {
        const recentYear = mostRecentRunDate.getFullYear();
        const recentMonth = mostRecentRunDate.getMonth();
        const recentDay = mostRecentRunDate.getDate();
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

  function calculateMilestoneDate(
    currentTotal,
    nextMilestone,
    startDate = new Date(),
    mostRecentRunDate = null
  ) {
    if (!nextMilestone || nextMilestone <= currentTotal) return null;

    const runsNeeded = nextMilestone - currentTotal;
    const firstRunDate = getNextSaturday(startDate, mostRecentRunDate);
    const targetDate = new Date(firstRunDate);
    targetDate.setDate(firstRunDate.getDate() + (runsNeeded - 1) * 7);
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

  function appendMilestoneEstimate(heading, milestone, dateString) {
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

    const mostRecentRunDate = findMostRecentRunDate(doc);
    const targetDate = calculateMilestoneDate(result.total, nextMilestone, now, mostRecentRunDate);
    if (!targetDate) {
      console.log('Unable to calculate milestone date');
      return;
    }

    appendMilestoneEstimate(result.heading, nextMilestone, formatDate(targetDate));
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      milestones,
      findParkrunTotalHeading,
      findAgeCategory,
      findMostRecentRunDate,
      getNextMilestone,
      getNextSaturday,
      calculateMilestoneDate,
      formatDate,
      appendMilestoneEstimate,
      applyMilestoneEstimate,
    };
  } else {
    applyMilestoneEstimate();
  }
})();
