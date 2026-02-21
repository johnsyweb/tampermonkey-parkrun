// ==UserScript==
// @name         parkrun Next Milestone Estimate
// @description  Estimates when a parkrunner will reach their next milestone. Assumes participation at every available parkrun (regular, junior, or volunteer) on Saturdays or Sundays. Special events are excluded from calculations.
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
// @updateURL    https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/next-milestone.user.js
// @version      1.1.5
// ==/UserScript==
// DO NOT EDIT - generated from src/ by scripts/build-scripts.js

function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t.return || t.return(); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }


(function () {
  'use strict';

  var milestones = {
    10: {
      restricted_age: 'J'
    },
    25: {},
    50: {},
    100: {},
    250: {},
    500: {},
    1000: {}
  };
  var juniorMilestones = {
    11: {
      restricted_age: 'J',
      name: 'Half marathon'
    },
    21: {
      restricted_age: 'J',
      name: 'Marathon'
    },
    50: {
      restricted_age: 'J',
      name: 'Ultra marathon'
    },
    100: {
      restricted_age: 'J',
      name: 'junior parkrun 100'
    },
    250: {
      restricted_age: 'J',
      name: 'junior parkrun 250'
    }
  };
  var volunteerMilestones = {
    10: {
      restricted_age: 'J'
    },
    25: {},
    50: {},
    100: {},
    250: {},
    500: {},
    1000: {}
  };
  function findParkrunTotalHeading() {
    var doc = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : document;
    var headings = doc.querySelectorAll('h3');
    var _iterator = _createForOfIteratorHelper(headings),
      _step;
    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var _heading$textContent$, _heading$textContent;
        var heading = _step.value;
        var text = (_heading$textContent$ = (_heading$textContent = heading.textContent) === null || _heading$textContent === void 0 ? void 0 : _heading$textContent.trim()) !== null && _heading$textContent$ !== void 0 ? _heading$textContent$ : '';
        var match = text.match(/([\d,]+)\s+parkruns?\b/i);
        if (match) {
          var total = parseInt(match[1].replace(/,/g, ''), 10);
          return {
            heading: heading,
            total: total
          };
        }
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }
    return null;
  }
  function findJuniorParkrunTotalHeading() {
    var doc = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : document;
    var headings = doc.querySelectorAll('h3');
    var _iterator2 = _createForOfIteratorHelper(headings),
      _step2;
    try {
      for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
        var _heading$textContent$2, _heading$textContent2;
        var heading = _step2.value;
        var text = (_heading$textContent$2 = (_heading$textContent2 = heading.textContent) === null || _heading$textContent2 === void 0 ? void 0 : _heading$textContent2.trim()) !== null && _heading$textContent$2 !== void 0 ? _heading$textContent$2 : '';
        var match = text.match(/([\d,]+)\s+junior\s+parkruns?\s+total/i);
        if (match) {
          var total = parseInt(match[1].replace(/,/g, ''), 10);
          return {
            heading: heading,
            total: total
          };
        }
      }
    } catch (err) {
      _iterator2.e(err);
    } finally {
      _iterator2.f();
    }
    return null;
  }
  function findAgeCategory() {
    var doc = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : document;
    var paragraphs = doc.querySelectorAll('p');
    var _iterator3 = _createForOfIteratorHelper(paragraphs),
      _step3;
    try {
      for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
        var _p$textContent;
        var p = _step3.value;
        var text = (_p$textContent = p.textContent) !== null && _p$textContent !== void 0 ? _p$textContent : '';
        var match = text.match(/Most recent age category was\s+([A-Z]+\d+[-\d]*)/i);
        if (match) {
          return match[1];
        }
      }
    } catch (err) {
      _iterator3.e(err);
    } finally {
      _iterator3.f();
    }
    return null;
  }
  function findVolunteerDaysTotal() {
    var _totalCell$textConten, _totalCell$textConten2;
    var doc = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : document;
    var heading = doc.querySelector('#volunteer-summary');
    if (!heading) return null;
    var table = heading.nextElementSibling;
    if (!table || table.tagName !== 'TABLE') {
      var _heading$parentElemen;
      table = (_heading$parentElemen = heading.parentElement) === null || _heading$parentElemen === void 0 ? void 0 : _heading$parentElemen.querySelector('table');
    }
    if (!table) return null;
    var footerRow = table.querySelector('tfoot tr');
    if (!footerRow) return null;
    var cells = footerRow.querySelectorAll('td');
    if (cells.length < 2) return null;
    var totalCell = cells[1].querySelector('strong');
    if (!totalCell) return null;
    var totalText = (_totalCell$textConten = (_totalCell$textConten2 = totalCell.textContent) === null || _totalCell$textConten2 === void 0 ? void 0 : _totalCell$textConten2.trim()) !== null && _totalCell$textConten !== void 0 ? _totalCell$textConten : '';
    var total = parseInt(totalText.replace(/,/g, ''), 10);
    return Number.isNaN(total) ? null : total;
  }
  function getNextMilestone(total) {
    var _milestoneValues$find;
    var ageCategory = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    var milestoneMap = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : milestones;
    var milestoneValues = Object.keys(milestoneMap).map(Number).sort(function (a, b) {
      return a - b;
    });
    return (_milestoneValues$find = milestoneValues.find(function (value) {
      if (value <= total) return false;
      var milestone = milestoneMap[value];
      if (milestone.restricted_age && ageCategory) {
        return ageCategory.startsWith(milestone.restricted_age);
      }
      return !milestone.restricted_age;
    })) !== null && _milestoneValues$find !== void 0 ? _milestoneValues$find : null;
  }
  function getNextMilestoneDefinition(total, ageCategory, milestoneMap) {
    var nextValue = getNextMilestone(total, ageCategory, milestoneMap);
    if (!nextValue) return null;
    return {
      value: nextValue,
      definition: milestoneMap[nextValue]
    };
  }
  function findMostRecentFinishDate() {
    var _dateLink$textContent;
    var doc = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : document;
    var resultsTable = doc.querySelector('table#results tbody');
    if (!resultsTable) return null;
    var firstRow = resultsTable.querySelector('tr');
    if (!firstRow) return null;
    var cells = firstRow.querySelectorAll('td');
    if (cells.length < 2) return null;
    var dateLink = cells[1].querySelector('a');
    if (!dateLink) return null;
    var dateText = (_dateLink$textContent = dateLink.textContent) === null || _dateLink$textContent === void 0 ? void 0 : _dateLink$textContent.trim();
    if (!dateText) return null;
    var parts = dateText.split('/');
    if (parts.length !== 3) return null;
    var day = parseInt(parts[0], 10);
    var month = parseInt(parts[1], 10) - 1;
    var year = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  function getNextSaturday() {
    var date = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : new Date();
    var mostRecentFinishDate = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    var result = new Date(date);
    var day = result.getDay();
    if (day === 6) {
      if (mostRecentFinishDate) {
        var recentYear = mostRecentFinishDate.getFullYear();
        var recentMonth = mostRecentFinishDate.getMonth();
        var recentDay = mostRecentFinishDate.getDate();
        var currentYear = date.getFullYear();
        var currentMonth = date.getMonth();
        var currentDay = date.getDate();
        if (recentYear === currentYear && recentMonth === currentMonth && recentDay === currentDay) {
          result.setDate(result.getDate() + 7);
        }
      }
      result.setHours(0, 0, 0, 0);
      return result;
    }
    var daysUntilSaturday = (6 - day + 7) % 7;
    result.setDate(result.getDate() + daysUntilSaturday);
    result.setHours(0, 0, 0, 0);
    return result;
  }
  function getNextSunday() {
    var date = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : new Date();
    var mostRecentFinishDate = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    var result = new Date(date);
    var day = result.getDay();
    if (day === 0) {
      if (mostRecentFinishDate) {
        var recentYear = mostRecentFinishDate.getFullYear();
        var recentMonth = mostRecentFinishDate.getMonth();
        var recentDay = mostRecentFinishDate.getDate();
        var currentYear = date.getFullYear();
        var currentMonth = date.getMonth();
        var currentDay = date.getDate();
        if (recentYear === currentYear && recentMonth === currentMonth && recentDay === currentDay) {
          result.setDate(result.getDate() + 7);
        }
      }
      result.setHours(0, 0, 0, 0);
      return result;
    }
    var daysUntilSunday = (0 - day + 7) % 7;
    result.setDate(result.getDate() + daysUntilSunday);
    result.setHours(0, 0, 0, 0);
    return result;
  }
  function calculateMilestoneDate(currentTotal, nextMilestone) {
    var startDate = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : new Date();
    var mostRecentFinishDate = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;
    if (!nextMilestone || nextMilestone <= currentTotal) return null;
    var finishesNeeded = nextMilestone - currentTotal;
    var firstFinishDate = getNextSaturday(startDate, mostRecentFinishDate);
    var targetDate = new Date(firstFinishDate);
    targetDate.setDate(firstFinishDate.getDate() + (finishesNeeded - 1) * 7);
    return targetDate;
  }
  function calculateJuniorMilestoneDate(currentTotal, nextMilestone) {
    var startDate = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : new Date();
    var mostRecentFinishDate = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;
    if (!nextMilestone || nextMilestone <= currentTotal) return null;
    var finishesNeeded = nextMilestone - currentTotal;
    var firstFinishDate = getNextSunday(startDate, mostRecentFinishDate);
    var targetDate = new Date(firstFinishDate);
    targetDate.setDate(firstFinishDate.getDate() + (finishesNeeded - 1) * 7);
    return targetDate;
  }
  function formatDate(date) {
    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  function isDateInNextWeek(date) {
    var now = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : new Date();
    var startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    var endOfNextWeek = new Date(startOfToday);
    endOfNextWeek.setDate(endOfNextWeek.getDate() + 7);
    var checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate >= startOfToday && checkDate < endOfNextWeek;
  }
  function highlightDateIfNeeded(parentElement, targetDate) {
    var now = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : new Date();
    if (!targetDate || !parentElement) return;
    if (!isDateInNextWeek(targetDate, now)) return;

    // Find all text nodes and highlight the formatted date string
    var dateString = formatDate(targetDate);
    var textNodes = [];
    function collectTextNodes(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        textNodes.push(node);
      } else {
        for (var i = 0; i < node.childNodes.length; i++) {
          collectTextNodes(node.childNodes[i]);
        }
      }
    }
    collectTextNodes(parentElement);
    textNodes.forEach(function (textNode) {
      if (textNode.textContent.includes(dateString)) {
        var span = document.createElement('span');
        span.style.backgroundColor = '#ffeb3b';
        span.style.padding = '0 2px';
        span.style.borderRadius = '2px';
        span.textContent = textNode.textContent;
        textNode.parentNode.replaceChild(span, textNode);
      }
    });
  }
  function getVolunteerDayPreferences() {
    var storageKey = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'parkrun-volunteer-days';
    if (typeof localStorage === 'undefined') {
      return {
        saturday: true,
        sunday: true
      };
    }
    var stored = localStorage.getItem(storageKey);
    if (!stored) {
      return {
        saturday: true,
        sunday: true
      };
    }
    try {
      return JSON.parse(stored);
    } catch (_unused) {
      return {
        saturday: true,
        sunday: true
      };
    }
  }
  function setVolunteerDayPreferences(preferences) {
    var storageKey = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'parkrun-volunteer-days';
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(preferences));
    }
  }
  function getNextVolunteerMilestoneDate(currentVolunteerDays, nextMilestone) {
    var startDate = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : new Date();
    var preferences = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;
    if (!nextMilestone || nextMilestone <= currentVolunteerDays) return null;
    var prefs = preferences || getVolunteerDayPreferences();
    var daysNeeded = nextMilestone - currentVolunteerDays;
    if (!prefs.saturday && !prefs.sunday) return null;

    // If volunteering on both days, they volunteer twice per week
    if (prefs.saturday && prefs.sunday) {
      var nextSaturday = new Date(startDate);
      var daysUntilSaturday = (6 - nextSaturday.getDay() + 7) % 7;
      nextSaturday.setDate(nextSaturday.getDate() + daysUntilSaturday);
      var nextSunday = new Date(startDate);
      var daysUntilSunday = (0 - nextSunday.getDay() + 7) % 7;
      nextSunday.setDate(nextSunday.getDate() + daysUntilSunday);

      // Determine which day comes first
      var firstDay = nextSaturday < nextSunday ? nextSaturday : nextSunday;
      var firstIsSaturday = nextSaturday < nextSunday;

      // Calculate complete weeks (2 volunteers per week)
      var completeWeeks = Math.floor((daysNeeded - 1) / 2);
      var remainder = (daysNeeded - 1) % 2;
      var targetDate = new Date(firstDay);
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
      var saturdayDate = new Date(startDate);
      var _daysUntilSaturday = (6 - saturdayDate.getDay() + 7) % 7;
      saturdayDate.setDate(saturdayDate.getDate() + _daysUntilSaturday);
      saturdayDate.setDate(saturdayDate.getDate() + (daysNeeded - 1) * 7);
      saturdayDate.setHours(0, 0, 0, 0);
      return saturdayDate;
    }
    if (prefs.sunday) {
      var sundayDate = new Date(startDate);
      var _daysUntilSunday = (0 - sundayDate.getDay() + 7) % 7;
      sundayDate.setDate(sundayDate.getDate() + _daysUntilSunday);
      sundayDate.setDate(sundayDate.getDate() + (daysNeeded - 1) * 7);
      sundayDate.setHours(0, 0, 0, 0);
      return sundayDate;
    }
    return null;
  }
  function appendMilestoneEstimate(heading, milestone, dateString) {
    var targetDate = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;
    if (!heading || heading.dataset.milestoneEstimateApplied === 'true') return;
    var estimateNode = document.createTextNode(" (expected to reach ".concat(milestone, " around ").concat(dateString, ")"));
    var textNodes = Array.from(heading.childNodes).filter(function (node) {
      return node.nodeType === Node.TEXT_NODE;
    });
    var ampersandNode = textNodes.find(function (node) {
      var _node$textContent;
      return (_node$textContent = node.textContent) === null || _node$textContent === void 0 ? void 0 : _node$textContent.includes('&');
    });
    if (ampersandNode) {
      var _ampersandNode$textCo;
      var text = (_ampersandNode$textCo = ampersandNode.textContent) !== null && _ampersandNode$textCo !== void 0 ? _ampersandNode$textCo : '';
      var ampIndex = text.indexOf('&');
      if (ampIndex >= 0) {
        var beforeText = text.slice(0, ampIndex).trimEnd();
        var afterText = text.slice(ampIndex).trimStart();
        var beforeNode = document.createTextNode(beforeText);
        var afterNode = document.createTextNode(" ".concat(afterText));
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
  function appendVolunteerDaysSummary(heading, totalDays) {
    var nextMilestone = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
    var targetDate = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;
    if (!heading || heading.dataset.volunteerDaysApplied === 'true') return;
    var summary = document.createElement('p');
    summary.id = 'volunteer-days-summary';
    var text = "".concat(totalDays, " volunteer days total");
    if (nextMilestone && targetDate) {
      text += " (expected to reach ".concat(nextMilestone, " around ").concat(targetDate, ")");
    }
    summary.textContent = text;
    var prefsContainer = document.createElement('div');
    prefsContainer.id = 'volunteer-days-preferences';
    prefsContainer.style.marginTop = '0.5em';
    prefsContainer.style.fontSize = '0.9em';
    var preferences = getVolunteerDayPreferences();
    var saturdayLabel = document.createElement('label');
    saturdayLabel.style.marginRight = '1em';
    saturdayLabel.style.cursor = 'pointer';
    var saturdayCheckbox = document.createElement('input');
    saturdayCheckbox.type = 'checkbox';
    saturdayCheckbox.checked = preferences.saturday;
    saturdayCheckbox.id = 'volunteer-saturday';
    saturdayCheckbox.addEventListener('change', function () {
      var updated = getVolunteerDayPreferences();
      updated.saturday = saturdayCheckbox.checked;
      setVolunteerDayPreferences(updated);
      window.location.reload();
    });
    saturdayLabel.appendChild(saturdayCheckbox);
    saturdayLabel.appendChild(document.createTextNode(' Volunteer on Saturdays'));
    var sundayLabel = document.createElement('label');
    sundayLabel.style.cursor = 'pointer';
    var sundayCheckbox = document.createElement('input');
    sundayCheckbox.type = 'checkbox';
    sundayCheckbox.checked = preferences.sunday;
    sundayCheckbox.id = 'volunteer-sunday';
    sundayCheckbox.addEventListener('change', function () {
      var updated = getVolunteerDayPreferences();
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
      var dateObj = new Date(targetDate);
      if (!Number.isNaN(dateObj.getTime())) {
        highlightDateIfNeeded(summary, dateObj);
      }
    }
  }
  function appendJuniorMilestoneEstimate(heading, milestoneName, dateString) {
    var targetDate = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;
    if (!heading || heading.dataset.juniorMilestoneEstimateApplied === 'true') return;
    heading.appendChild(document.createTextNode(" (expected to reach ".concat(milestoneName, " around ").concat(dateString, ")")));
    heading.dataset.juniorMilestoneEstimateApplied = 'true';
    if (targetDate) {
      highlightDateIfNeeded(heading, targetDate);
    }
  }
  function appendAssumptionsInfo(heading) {
    var _heading$parentElemen2;
    if (!heading || heading.dataset.assumptionsInfoApplied === 'true') return;
    var infoBox = document.createElement('div');
    infoBox.id = 'milestone-assumptions-info';
    infoBox.style.marginTop = '1em';
    infoBox.style.padding = '0.75em';
    infoBox.style.backgroundColor = '#f5f5f5';
    infoBox.style.border = '1px solid #ddd';
    infoBox.style.borderRadius = '4px';
    infoBox.style.fontSize = '0.85em';
    infoBox.style.color = '#555';
    var headingText = document.createElement('strong');
    headingText.textContent = 'ℹ️ Assumptions behind expected dates:';
    headingText.style.display = 'block';
    headingText.style.marginBottom = '0.5em';
    var assumptions = document.createElement('ul');
    assumptions.style.margin = '0.5em 0 0 0';
    assumptions.style.padding = '0 0 0 1.25em';
    assumptions.style.listStyle = 'none';
    var assumption1 = document.createElement('li');
    assumption1.textContent = 'You participate at every available parkrun day';
    assumption1.style.margin = '0.25em 0';
    var assumption2 = document.createElement('li');
    assumption2.textContent = 'Special events are excluded from the calculations';
    assumption2.style.margin = '0.25em 0';
    assumptions.appendChild(assumption1);
    assumptions.appendChild(assumption2);
    infoBox.appendChild(headingText);
    infoBox.appendChild(assumptions);

    // Insert after volunteer preferences if they exist, otherwise after heading
    var prefsContainer = (_heading$parentElemen2 = heading.parentElement) === null || _heading$parentElemen2 === void 0 ? void 0 : _heading$parentElemen2.querySelector('#volunteer-days-preferences');
    if (prefsContainer) {
      prefsContainer.insertAdjacentElement('afterend', infoBox);
    } else {
      heading.insertAdjacentElement('afterend', infoBox);
    }
    heading.dataset.assumptionsInfoApplied = 'true';
  }
  function applyMilestoneEstimate() {
    var doc = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : document;
    var now = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : new Date();
    var result = findParkrunTotalHeading(doc);
    if (!result) {
      console.log('Parkrun total heading not found');
      return;
    }
    var ageCategory = findAgeCategory(doc);
    var nextMilestone = getNextMilestone(result.total, ageCategory);
    if (!nextMilestone) {
      console.log('No upcoming milestone found');
      return;
    }
    var mostRecentFinishDate = findMostRecentFinishDate(doc);
    var targetDate = calculateMilestoneDate(result.total, nextMilestone, now, mostRecentFinishDate);
    if (!targetDate) {
      console.log('Unable to calculate milestone date');
      return;
    }
    appendMilestoneEstimate(result.heading, nextMilestone, formatDate(targetDate), targetDate);
    var volunteerDaysTotal = findVolunteerDaysTotal(doc);
    if (volunteerDaysTotal !== null) {
      var nextVolunteerMilestone = getNextMilestone(volunteerDaysTotal, null, volunteerMilestones);
      var volunteerTargetDate = null;
      var volunteerTargetDateFormatted = null;
      if (nextVolunteerMilestone) {
        volunteerTargetDate = getNextVolunteerMilestoneDate(volunteerDaysTotal, nextVolunteerMilestone, now);
        if (volunteerTargetDate) {
          volunteerTargetDateFormatted = formatDate(volunteerTargetDate);
        }
      }
      appendVolunteerDaysSummary(result.heading, volunteerDaysTotal, nextVolunteerMilestone, volunteerTargetDateFormatted);
    }
    var juniorResult = findJuniorParkrunTotalHeading(doc);
    if (juniorResult && ageCategory !== null && ageCategory !== void 0 && ageCategory.startsWith('J')) {
      var _juniorNext$definitio;
      var juniorNext = getNextMilestoneDefinition(juniorResult.total, ageCategory, juniorMilestones);
      if (juniorNext !== null && juniorNext !== void 0 && (_juniorNext$definitio = juniorNext.definition) !== null && _juniorNext$definitio !== void 0 && _juniorNext$definitio.name) {
        var juniorTargetDate = calculateJuniorMilestoneDate(juniorResult.total, juniorNext.value, now);
        if (juniorTargetDate) {
          appendJuniorMilestoneEstimate(juniorResult.heading, juniorNext.definition.name, formatDate(juniorTargetDate), juniorTargetDate);
        }
      }
    }
    appendAssumptionsInfo(result.heading);
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      milestones: milestones,
      juniorMilestones: juniorMilestones,
      volunteerMilestones: volunteerMilestones,
      findParkrunTotalHeading: findParkrunTotalHeading,
      findJuniorParkrunTotalHeading: findJuniorParkrunTotalHeading,
      findAgeCategory: findAgeCategory,
      findVolunteerDaysTotal: findVolunteerDaysTotal,
      findMostRecentFinishDate: findMostRecentFinishDate,
      getNextMilestone: getNextMilestone,
      getNextMilestoneDefinition: getNextMilestoneDefinition,
      getNextSaturday: getNextSaturday,
      getNextSunday: getNextSunday,
      calculateMilestoneDate: calculateMilestoneDate,
      calculateJuniorMilestoneDate: calculateJuniorMilestoneDate,
      formatDate: formatDate,
      isDateInNextWeek: isDateInNextWeek,
      highlightDateIfNeeded: highlightDateIfNeeded,
      getVolunteerDayPreferences: getVolunteerDayPreferences,
      setVolunteerDayPreferences: setVolunteerDayPreferences,
      getNextVolunteerMilestoneDate: getNextVolunteerMilestoneDate,
      appendMilestoneEstimate: appendMilestoneEstimate,
      appendJuniorMilestoneEstimate: appendJuniorMilestoneEstimate,
      appendVolunteerDaysSummary: appendVolunteerDaysSummary,
      appendAssumptionsInfo: appendAssumptionsInfo,
      applyMilestoneEstimate: applyMilestoneEstimate
    };
  } else {
    applyMilestoneEstimate();
  }
})();