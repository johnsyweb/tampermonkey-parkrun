// ==UserScript==
// @name         parkrun Walker Analysis
// @description  Highlight and summarize walkers (>=10:00/km) and compare with faster participants on parkrun results pages.
// @author       Pete Johns (@johnsyweb)
// @downloadURL  https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/parkrun-walker-analysis.user.js
// @grant        none
// @homepage     https://www.johnsy.com/tampermonkey-parkrun/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=parkrun.com.au
// @license      MIT
// @match        *://www.parkrun.ca/*/results/latestresults/
// @match        *://www.parkrun.co.at/*/results/latestresults/
// @match        *://www.parkrun.co.nl/*/results/latestresults/
// @match        *://www.parkrun.co.nz/*/results/latestresults/
// @match        *://www.parkrun.co.za/*/results/latestresults/
// @match        *://www.parkrun.com.au/*/results/latestresults/
// @match        *://www.parkrun.com.de/*/results/latestresults/
// @match        *://www.parkrun.dk/*/results/latestresults/
// @match        *://www.parkrun.fi/*/results/latestresults/
// @match        *://www.parkrun.fr/*/results/latestresults/
// @match        *://www.parkrun.ie/*/results/latestresults/
// @match        *://www.parkrun.it/*/results/latestresults/
// @match        *://www.parkrun.jp/*/results/latestresults/
// @match        *://www.parkrun.lt/*/results/latestresults/
// @match        *://www.parkrun.my/*/results/latestresults/
// @match        *://www.parkrun.no/*/results/latestresults/
// @match        *://www.parkrun.org.uk/*/results/latestresults/
// @match        *://www.parkrun.pl/*/results/latestresults/
// @match        *://www.parkrun.se/*/results/latestresults/
// @match        *://www.parkrun.sg/*/results/latestresults/
// @match        *://www.parkrun.us/*/results/latestresults/
// @namespace    http://tampermonkey.net/
// @require      https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js
// @require      https://html2canvas.hertzen.com/dist/html2canvas.min.js
// @run-at       document-end
// @supportURL   https://github.com/johnsyweb/tampermonkey-parkrun/issues/
// @tag          parkrun
// @updateURL    https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/parkrun-walker-analysis.user.js
// @version      1.0.72
// ==/UserScript==
// DO NOT EDIT - generated from src/ by scripts/build-scripts.js

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i.return) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); } r ? i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n : (o("next", 0), o("throw", 1), o("return", 2)); }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }


var ChartRef = typeof window !== 'undefined' && window.Chart ? window.Chart : undefined;
function assignUnknownFinishTimes(finishers) {
  function findPreviousKnownTime(finishers, startIndex) {
    var previousFinisher = finishers.slice(0, startIndex).reverse().find(function (f) {
      return f.timeStr && f.timeSec > 0;
    });
    return previousFinisher ? previousFinisher.timeSec : null;
  }
  function findNextKnownTime(finishers, startIndex) {
    var nextFinisher = finishers.slice(startIndex + 1).find(function (f) {
      return f.timeStr && f.timeSec > 0;
    });
    return nextFinisher ? nextFinisher.timeSec : null;
  }
  return finishers.map(function (finisher, index) {
    if (finisher.timeStr && finisher.timeSec > 0) {
      return finisher;
    }
    var prevTime = findPreviousKnownTime(finishers, index);
    var nextTime = findNextKnownTime(finishers, index);
    var estimatedTime = prevTime || nextTime || 0;
    return _objectSpread(_objectSpread({}, finisher), {}, {
      timeSec: estimatedTime,
      estimatedTime: estimatedTime > 0
    });
  });
}
function getEventMetadata() {
  var eventName = '';
  var eventDate = '';
  var eventNumber = '';
  var h1 = typeof document !== 'undefined' ? document.querySelector('h1') : null;
  if (h1) {
    eventName = h1.textContent.trim();
  } else if (typeof document !== 'undefined' && document.title) {
    eventName = document.title.split('-')[0].trim();
  }
  var h3 = typeof document !== 'undefined' ? document.querySelector('h3') : null;
  if (h3) {
    var h3Text = h3.textContent;
    var dateMatch = h3Text.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
    if (dateMatch) eventDate = dateMatch[1];
    var numMatch = h3Text.match(/#(\d+)/);
    if (numMatch) eventNumber = numMatch[1];
  }
  return {
    eventName: eventName,
    eventDate: eventDate,
    eventNumber: eventNumber
  };
}
function generateExportFilename(metadata, chartName) {
  var eventPart = metadata.eventName ? metadata.eventName.replace(/[^a-z0-9]+/gi, '').toLowerCase() : 'event';
  var datePart = metadata.eventDate ? metadata.eventDate.replace(/\//g, '_') : 'date';
  var numPart = metadata.eventNumber ? metadata.eventNumber : 'num';
  return "".concat(eventPart, "_").concat(datePart, "_").concat(numPart, "_").concat(chartName, ".png");
}
function computeWalkerThreshold(url) {
  var DEFAULT = 5;
  var JUNIOR = 2;
  var courseLength = DEFAULT;
  try {
    if (typeof url === 'string' && url && url.toLowerCase().includes('-juniors')) {
      courseLength = JUNIOR;
    }
  } catch (ignore) {
    void ignore;
  }
  return courseLength * 10 * 60;
}
function parkrunWalkerAnalysisMain() {
  'use strict';

  function timeToSeconds(timeStr) {
    if (!timeStr) return 0;
    var parts = timeStr.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
  }
  var rows = Array.from(document.querySelectorAll('tr.Results-table-row'));
  if (!rows.length) return;
  function getMilestoneClub(count, prefix) {
    var milestones = [1000, 500, 250, 100, 50, 25, 10];
    for (var _i = 0, _milestones = milestones; _i < _milestones.length; _i++) {
      var m = _milestones[_i];
      if (count >= m) {
        return {
          status: "".concat(prefix, " ").concat(m, " Club"),
          milestone: m
        };
      }
    }
    return {
      status: null,
      milestone: 0
    };
  }
  var finishers = rows.map(function (row, idx) {
    var timeCell = row.querySelector('.Results-table-td--time .compact');
    var timeStr = timeCell ? timeCell.textContent.trim() : '';
    var timeSec = timeToSeconds(timeStr);
    var gender = (row.getAttribute('data-gender') || '').trim();
    var runs = parseInt(row.getAttribute('data-runs'), 10);
    var vols = parseInt(row.getAttribute('data-vols'), 10);
    var achievement = (row.getAttribute('data-achievement') || '').trim();
    var parkrunExperience = 'Unknown';
    if (!isNaN(runs) && runs > 0) {
      if (runs === 1) {
        parkrunExperience = 'First Timer (anywhere)';
      } else if (achievement === 'First Timer!') {
        parkrunExperience = 'First Timer (to this event)';
      } else if (runs < 10) {
        parkrunExperience = 'Multiple parkruns';
      } else {
        var club = getMilestoneClub(runs, 'parkrun');
        parkrunExperience = club.status || 'Multiple parkruns';
      }
    }
    var volunteerStatus = 'Unknown';
    var volunteerMilestone = 0;
    if (!isNaN(vols)) {
      if (vols === 0) {
        volunteerStatus = 'Yet to Volunteer';
      } else if (vols === 1) {
        volunteerStatus = 'Volunteered once';
      } else if (vols > 1 && vols < 10) {
        volunteerStatus = 'Volunteered multiple times';
      } else {
        var _club = getMilestoneClub(vols, 'Volunteer');
        volunteerStatus = _club.status || 'Has Volunteered';
        volunteerMilestone = _club.milestone;
      }
    }
    var clubMatch = row.innerHTML.match(/milestone-v(\d+)/);
    if (clubMatch) {
      volunteerStatus = "Volunteer ".concat(clubMatch[1], " Club");
      volunteerMilestone = parseInt(clubMatch[1], 10);
    }
    var ageGrade = '';
    var ageGradeCell = row.querySelector('.Results-table-td--agegrade');
    if (ageGradeCell) {
      var ag = ageGradeCell.textContent.trim();
      if (ag) ageGrade = ag.replace('%', '');
    }
    var ageGroup = 'Unknown';
    var agRaw = row.getAttribute('data-agegroup') || '';
    if (agRaw) {
      ageGroup = agRaw.replace(/^[A-Z]+/, '');
    } else {
      var ageGroupCell = row.querySelector('.Results-table-td--agegroup');
      if (ageGroupCell) {
        var cellText = ageGroupCell.textContent.trim().replace(/^[A-Z]+/, '');
        ageGroup = cellText || (timeStr ? 'Not specified' : 'Unknown');
      } else if (timeStr) {
        ageGroup = 'Not specified';
      }
    }
    var normGender = gender.toLowerCase();
    if (normGender === 'male' || normGender === 'm') {
      normGender = 'Male';
    } else if (normGender === 'female' || normGender === 'f') {
      normGender = 'Female';
    } else if (timeStr) {
      normGender = 'Not specified';
    } else {
      normGender = 'Unknown';
    }
    return {
      timeStr: timeStr,
      timeSec: timeSec,
      gender: normGender,
      parkrunExperience: parkrunExperience,
      volunteerStatus: volunteerStatus,
      volunteerMilestone: volunteerMilestone,
      ageGrade: ageGrade,
      ageGroup: ageGroup,
      _row: row,
      _idx: idx
    };
  });
  var finishersWithEstimatedTimes = assignUnknownFinishTimes(finishers);
  function groupByMinute(breakdownKey) {
    var bins = {};
    var minMinute = Infinity,
      maxMinute = 0;
    finishersWithEstimatedTimes.forEach(function (f) {
      if (f.timeSec === 0) return;
      var min = Math.floor(f.timeSec / 60);
      minMinute = Math.min(minMinute, min);
      maxMinute = Math.max(maxMinute, min);
      if (!bins[min]) bins[min] = {};
      var key = f[breakdownKey] || 'Unknown';
      bins[min][key] = (bins[min][key] || 0) + 1;
    });
    return {
      bins: bins,
      minMinute: minMinute,
      maxMinute: maxMinute
    };
  }
  var milestoneColours = {
    10: '#EBE9F0',
    25: '#6D5698',
    50: '#C81D31',
    100: '#2E393B',
    250: '#2C504A',
    500: '#2E4DA7',
    1000: '#FFE049',
    'Volunteered once': '#90EE90',
    'Volunteered multiple times': '#00CEAE',
    'Has Volunteered': '#00CEAE',
    'Yet to Volunteer': '#FFA300',
    Unknown: '#A1B6B7'
  };
  var breakdowns = [{
    key: 'parkrunExperience',
    label: 'parkrun Experience'
  }, {
    key: 'volunteerStatus',
    label: 'Volunteer Experience'
  }, {
    key: 'gender',
    label: 'Gender'
  }, {
    key: 'ageGroup',
    label: 'Age Group'
  }];
  var currentBreakdown = 'parkrunExperience';
  var chartContainerId = 'finishersStackedChart';
  var walkerChartInstance = null;
  var controlDiv = document.getElementById('walkerAnalysisControls');
  if (!controlDiv) {
    controlDiv = document.createElement('div');
    controlDiv.id = 'walkerAnalysisControls';
    controlDiv.style.textAlign = 'center';
    controlDiv.style.margin = '20px 0 10px 0';
    controlDiv.style.color = '#e0e0e0';
    controlDiv.style.background = '#2b223d';
    controlDiv.style.padding = '10px';
    controlDiv.style.borderRadius = '8px';
    controlDiv.style.maxWidth = '900px';
    controlDiv.style.marginLeft = 'auto';
    controlDiv.style.marginRight = 'auto';
  }
  function buildTable(breakdownKey) {
    var threshold = computeWalkerThreshold(typeof document !== 'undefined' && document.location ? document.location.href : '');
    var walkers = finishersWithEstimatedTimes.filter(function (f) {
      return f.timeSec >= threshold;
    });
    var runners = finishersWithEstimatedTimes.filter(function (f) {
      return f.timeSec > 0 && f.timeSec < threshold;
    });
    var totalWalkers = walkers.length;
    var totalRunners = runners.length;
    var allValues = new Set();
    walkers.forEach(function (f) {
      return allValues.add(f[breakdownKey] || 'Unknown');
    });
    runners.forEach(function (f) {
      return allValues.add(f[breakdownKey] || 'Unknown');
    });
    var valueList = Array.from(allValues);
    if (breakdownKey === 'ageGroup') {
      valueList = valueList.filter(function (v) {
        return v && v !== 'Unknown' && v !== 'Not specified';
      });
      valueList.sort(function (a, b) {
        var aLow = parseInt((a || '').split('-')[0], 10);
        var bLow = parseInt((b || '').split('-')[0], 10);
        if (isNaN(aLow)) return 1;
        if (isNaN(bLow)) return -1;
        return aLow - bLow;
      });
      if (allValues.has('Not specified')) valueList.push('Not specified');
      if (allValues.has('Unknown')) valueList.push('Unknown');
    } else if (breakdownKey === 'parkrunExperience') {
      var experienceOrder = ['First Timer (anywhere)', 'First Timer (to this event)', 'Multiple parkruns', 'parkrun 10 Club', 'parkrun 25 Club', 'parkrun 50 Club', 'parkrun 100 Club', 'parkrun 250 Club', 'parkrun 500 Club', 'parkrun 1000 Club'];
      var experienceIndex = function experienceIndex(v) {
        var idx = experienceOrder.indexOf(v);
        if (idx !== -1) return idx;
        var m = v.match(/parkrun (\d+) Club/);
        if (m) {
          var milestones = [10, 25, 50, 100, 250, 500, 1000];
          var num = parseInt(m[1], 10);
          var milestoneIdx = milestones.indexOf(num);
          return milestoneIdx !== -1 ? 3 + milestoneIdx : 200 + num;
        }
        if (v === 'Unknown') return 9999;
        return 999;
      };
      valueList.sort(function (a, b) {
        return experienceIndex(a) - experienceIndex(b);
      });
    } else if (breakdownKey === 'volunteerStatus') {
      var milestoneOrder = ['Yet to Volunteer', 'Volunteered once', 'Volunteered multiple times', 'Volunteer 10 Club', 'Volunteer 25 Club', 'Volunteer 50 Club', 'Volunteer 100 Club', 'Volunteer 250 Club', 'Volunteer 500 Club', 'Volunteer 1000 Club'];
      var milestoneIndex = function milestoneIndex(v) {
        var idx = milestoneOrder.indexOf(v);
        if (idx !== -1) return idx;
        var m = v.match(/(\d+)/);
        if (m) return 200 + parseInt(m[1], 10);
        if (v === 'Has Volunteered') return 150;
        if (v === 'Unknown') return 9999;
        return 999;
      };
      valueList.sort(function (a, b) {
        return milestoneIndex(a) - milestoneIndex(b);
      });
    } else {
      valueList.sort();
    }
    var totalFinishers = totalWalkers + totalRunners;
    var walkerPercent = totalFinishers ? (totalWalkers / totalFinishers * 100).toFixed(1) : '0.0';
    var runnerPercent = totalFinishers ? (totalRunners / totalFinishers * 100).toFixed(1) : '0.0';
    var html = "<div style=\"text-align:center;margin-bottom:0.5em;font-size:1.08em;\">\n      <strong>Walkers:</strong> ".concat(totalWalkers, " (").concat(walkerPercent, "%) &nbsp; | &nbsp; <strong>Runners:</strong> ").concat(totalRunners, " (").concat(runnerPercent, "%) &nbsp; | &nbsp; <strong>Total finishers:</strong> ").concat(totalFinishers, "\n    </div>");
    html += "<table class=\"Results-table\" style=\"margin:1em auto;font-size:1.1em;\">\n      <thead><tr><th>".concat(breakdowns.find(function (b) {
      return b.key === breakdownKey;
    }).label, "</th><th>Walkers (n)</th><th>Walkers (%)</th><th>Runners (n)</th><th>Runners (%)</th><th>Total (n)</th><th>Total (%)</th></tr></thead><tbody>");
    valueList.forEach(function (val) {
      var w = walkers.filter(function (f) {
        return (f[breakdownKey] || 'Unknown') === val;
      }).length;
      var r = runners.filter(function (f) {
        return (f[breakdownKey] || 'Unknown') === val;
      }).length;
      var t = w + r;
      html += "<tr><td>".concat(val, "</td><td style=\"text-align:right\">").concat(w, "</td><td style=\"text-align:right\">").concat(totalWalkers ? (w / totalWalkers * 100).toFixed(1) : '0.0', "%</td><td style=\"text-align:right\">").concat(r, "</td><td style=\"text-align:right\">").concat(totalRunners ? (r / totalRunners * 100).toFixed(1) : '0.0', "%</td><td style=\"text-align:right\">").concat(t, "</td><td style=\"text-align:right\">").concat(totalFinishers ? (t / totalFinishers * 100).toFixed(1) : '0.0', "%</td></tr>");
    });
    html += "<tr style=\"font-weight:bold;\"><td>Total</td><td style=\"text-align:right\">".concat(totalWalkers, "</td><td style=\"text-align:right\">100.0%</td><td style=\"text-align:right\">").concat(totalRunners, "</td><td style=\"text-align:right\">100.0%</td><td style=\"text-align:right\">").concat(totalFinishers, "</td><td style=\"text-align:right\">100.0%</td></tr>");
    html += "</tbody></table>";
    return html;
  }
  function updateBreakdownControls() {
    controlDiv.innerHTML = 'Breakdown: ' + breakdowns.map(function (b) {
      return "<button style=\"margin:0 8px;padding:6px 12px;border-radius:4px;border:none;background:".concat(currentBreakdown === b.key ? '#FFA300' : '#00CEAE', ";color:#2b223d;font-weight:bold;cursor:pointer;\" data-key=\"").concat(b.key, "\">").concat(b.label, "</button>");
    }).join('');
    controlDiv.querySelectorAll('button').forEach(function (btn) {
      btn.onclick = function () {
        setBreakdown(btn.getAttribute('data-key'));
      };
    });
  }
  function setBreakdown(breakdownKey) {
    currentBreakdown = breakdownKey;
    renderAll();
  }
  function renderAll() {
    updateBreakdownControls();
    var summaryDiv = document.getElementById('walkerRunnerSummaryTable');
    if (!summaryDiv) {
      summaryDiv = document.createElement('div');
      summaryDiv.id = 'walkerRunnerSummaryTable';
    }
    summaryDiv.innerHTML = buildTable(currentBreakdown);
    var walkerContainer = document.getElementById('walkerAnalysisContainer');
    if (!walkerContainer) {
      walkerContainer = document.createElement('div');
      walkerContainer.id = 'walkerAnalysisContainer';
      walkerContainer.style.width = '100%';
      walkerContainer.style.maxWidth = '900px';
      walkerContainer.style.margin = '20px auto';
    }
    walkerContainer.innerHTML = '';
    var chartDiv = document.getElementById(chartContainerId);
    if (!chartDiv) {
      chartDiv = document.createElement('div');
      chartDiv.id = chartContainerId;
    }
    walkerContainer.appendChild(chartDiv);
    walkerContainer.appendChild(controlDiv);
    walkerContainer.appendChild(summaryDiv);
    var firstH3 = document.querySelector('h3');
    if (firstH3 && firstH3.parentNode) {
      if (walkerContainer.parentNode !== firstH3.parentNode || walkerContainer.previousSibling !== firstH3) {
        if (firstH3.nextSibling) {
          firstH3.parentNode.insertBefore(walkerContainer, firstH3.nextSibling);
        } else {
          firstH3.parentNode.appendChild(walkerContainer);
        }
      }
    } else {
      document.body.appendChild(walkerContainer);
    }
    renderStackedChart(currentBreakdown, breakdowns.find(function (b) {
      return b.key === currentBreakdown;
    }).label, chartContainerId);
    insertControlsBelowChart();
  }
  function insertControlsBelowChart() {
    var chartDiv = document.getElementById(chartContainerId);
    if (chartDiv && chartDiv.parentNode) {
      if (chartDiv.nextSibling) {
        chartDiv.parentNode.insertBefore(controlDiv, chartDiv.nextSibling);
      } else {
        chartDiv.parentNode.appendChild(controlDiv);
      }
    } else {
      document.body.appendChild(controlDiv);
    }
  }
  function renderStackedChart(breakdownKey, breakdownLabel, containerId) {
    var _groupByMinute = groupByMinute(breakdownKey),
      bins = _groupByMinute.bins,
      minMinute = _groupByMinute.minMinute,
      maxMinute = _groupByMinute.maxMinute;
    var minutes = [];
    for (var m = minMinute; m <= maxMinute; m++) minutes.push(m);
    var allKeys = new Set();
    Object.values(bins).forEach(function (obj) {
      return Object.keys(obj).forEach(function (k) {
        return allKeys.add(k);
      });
    });
    var keyList = Array.from(allKeys);
    function sortKeyList(keys, breakdownType) {
      if (breakdownType === 'ageGroup') {
        var sorted = keys.filter(function (v) {
          return v && v !== 'Unknown' && v !== 'Not specified';
        });
        sorted.sort(function (a, b) {
          var aLow = parseInt((a || '').split('-')[0], 10);
          var bLow = parseInt((b || '').split('-')[0], 10);
          if (isNaN(aLow)) return 1;
          if (isNaN(bLow)) return -1;
          return aLow - bLow;
        });
        if (keys.includes('Not specified')) sorted.push('Not specified');
        if (keys.includes('Unknown')) sorted.push('Unknown');
        return sorted;
      }
      if (breakdownType === 'parkrunExperience') {
        var experienceOrder = ['First Timer (anywhere)', 'First Timer (to this event)', 'Multiple parkruns', 'parkrun 10 Club', 'parkrun 25 Club', 'parkrun 50 Club', 'parkrun 100 Club', 'parkrun 250 Club', 'parkrun 500 Club', 'parkrun 1000 Club'];
        var experienceIndex = function experienceIndex(v) {
          var idx = experienceOrder.indexOf(v);
          if (idx !== -1) return idx;
          var m = v.match(/parkrun (\d+) Club/);
          if (m) {
            var milestones = [10, 25, 50, 100, 250, 500, 1000];
            var num = parseInt(m[1], 10);
            var milestoneIdx = milestones.indexOf(num);
            return milestoneIdx !== -1 ? 3 + milestoneIdx : 200 + num;
          }
          if (v === 'Unknown') return 9999;
          return 999;
        };
        return keys.slice().sort(function (a, b) {
          return experienceIndex(a) - experienceIndex(b);
        });
      }
      if (breakdownType === 'volunteerStatus') {
        var milestoneOrder = ['Yet to Volunteer', 'Volunteered once', 'Volunteered multiple times', 'Volunteer 10 Club', 'Volunteer 25 Club', 'Volunteer 50 Club', 'Volunteer 100 Club', 'Volunteer 250 Club', 'Volunteer 500 Club', 'Volunteer 1000 Club'];
        var milestoneIndex = function milestoneIndex(v) {
          var idx = milestoneOrder.indexOf(v);
          if (idx !== -1) return idx;
          var m = v.match(/(\d+)/);
          if (m) return 200 + parseInt(m[1], 10);
          if (v === 'Has Volunteered') return 150;
          if (v === 'Unknown') return 9999;
          return 999;
        };
        return keys.slice().sort(function (a, b) {
          return milestoneIndex(a) - milestoneIndex(b);
        });
      }
      return keys.slice().sort();
    }
    keyList = sortKeyList(keyList, breakdownKey);
    function getColour(key) {
      if (breakdownKey === 'volunteerStatus') {
        var match = key.match(/(\d+)/);
        if (match) {
          var _m = parseInt(match[1], 10);
          return milestoneColours[_m] || '#cccccc';
        }
        return milestoneColours[key] || '#cccccc';
      }
      if (breakdownKey === 'parkrunExperience') {
        var _match = key.match(/(\d+)/);
        if (_match) {
          var _m2 = parseInt(_match[1], 10);
          return milestoneColours[_m2] || '#cccccc';
        }
        var experienceColours = {
          'First Timer (anywhere)': '#FFE049',
          'First Timer (to this event)': '#FFA300',
          'Multiple parkruns': '#00CEAE',
          Unknown: '#A1B6B7'
        };
        return experienceColours[key] || '#cccccc';
      }
      if (breakdownKey === 'gender') {
        var genderColours = {
          Male: '#00CEAE',
          Female: '#E21145',
          'Not specified': '#FFE049',
          Unknown: '#A1B6B7'
        };
        return genderColours[key] || '#FFA300';
      }
      if (breakdownKey === 'ageGroup') {
        if (key === 'Not specified') return '#F2F2F2';
        if (key === 'Unknown') return '#A1B6B7';
        var _match2 = key.match(/^(\d+)-/);
        if (_match2) {
          var age = parseInt(_match2[1], 10);
          var gradient = ['#DA70D6', '#9370DB', '#6495ED', '#4169E1', '#1E90FF', '#00BFFF', '#00CED1', '#20B2AA', '#3CB371', '#32CD32', '#9ACD32', '#FFD700', '#FFA500', '#FF8C00', '#FF6347', '#DC143C', '#DB7093'];
          var index = Math.floor((age - 10) / 5);
          return gradient[Math.min(index, gradient.length - 1)] || '#cccccc';
        }
        return '#cccccc';
      }
      return ['#FFA300', '#00CEAE', '#E21145', '#EBE9F0', '#FFE049', '#2C504A', '#6D5698', '#C81D31', '#A1B6B7'][keyList.indexOf(key) % 9];
    }
    var datasets = keyList.map(function (key) {
      return {
        label: key,
        data: minutes.map(function (m) {
          return bins[m] && bins[m][key] ? bins[m][key] : 0;
        }),
        backgroundColor: getColour(key),
        stack: 'stack1'
      };
    });
    var labels = minutes.map(function (min) {
      var h = Math.floor(min / 60);
      var m = min % 60;
      return "".concat(h, ":").concat(m.toString().padStart(2, '0'));
    });
    var chartDiv = document.getElementById(containerId);
    if (!chartDiv) {
      chartDiv = document.createElement('div');
      chartDiv.id = containerId;
    } else {
      chartDiv.innerHTML = '';
    }
    chartDiv.style.background = '#2b223d';
    chartDiv.style.borderRadius = '8px';
    chartDiv.style.margin = '20px auto';
    chartDiv.style.padding = '15px';
    chartDiv.style.maxWidth = '900px';
    chartDiv.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    var heading = document.createElement('h3');
    heading.textContent = "Finishers per Minute by ".concat(breakdownLabel);
    heading.style.textAlign = 'center';
    heading.style.marginBottom = '15px';
    heading.style.color = '#FFA300';
    chartDiv.appendChild(heading);
    var canvas = document.createElement('canvas');
    chartDiv.appendChild(canvas);
    var saveBtn = document.createElement('button');
    saveBtn.textContent = '💾 Save as Image';
    saveBtn.style.padding = '6px 12px';
    saveBtn.style.backgroundColor = '#FFA300';
    saveBtn.style.color = '#2b223d';
    saveBtn.style.border = 'none';
    saveBtn.style.borderRadius = '4px';
    saveBtn.style.cursor = 'pointer';
    saveBtn.style.fontWeight = 'bold';
    saveBtn.style.display = 'inline-block';
    saveBtn.style.margin = '10px auto 0 auto';
    saveBtn.title = 'Download chart as PNG image';
    saveBtn.addEventListener('mouseover', function () {
      this.style.backgroundColor = '#e59200';
    });
    saveBtn.addEventListener('mouseout', function () {
      this.style.backgroundColor = '#FFA300';
    });
    saveBtn.addEventListener('click', /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee() {
      var metadata, _heading, chartName, filename, chartCanvas, chartWidth, chartHeight, titleHeight, totalWidth, totalHeight, out, ctx, titleText, link;
      return _regenerator().w(function (_context) {
        while (1) switch (_context.n) {
          case 0:
            try {
              metadata = getEventMetadata();
              _heading = chartDiv.querySelector('h3');
              chartName = _heading ? _heading.textContent.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() : 'chart';
              filename = generateExportFilename(metadata, chartName); // Add title and background to the chart canvas
              chartCanvas = canvas;
              chartWidth = chartCanvas.width;
              chartHeight = chartCanvas.height;
              titleHeight = 100;
              totalWidth = chartWidth;
              totalHeight = chartHeight + titleHeight;
              out = document.createElement('canvas');
              out.width = totalWidth;
              out.height = totalHeight;
              ctx = out.getContext('2d'); // Background
              ctx.fillStyle = '#2b223d';
              ctx.fillRect(0, 0, totalWidth, totalHeight);

              // Title
              ctx.fillStyle = '#FFA300';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.font = 'bold 56px Arial';
              titleText = _heading ? _heading.textContent : 'Finishers per Minute';
              ctx.fillText(titleText, totalWidth / 2, titleHeight / 2);

              // Chart
              ctx.drawImage(chartCanvas, 0, titleHeight);
              link = document.createElement('a');
              link.download = filename;
              link.href = out.toDataURL('image/png');
              link.click();
            } catch (err) {
              alert('Failed to export image: ' + err);
            }
          case 1:
            return _context.a(2);
        }
      }, _callee);
    })));
    var controlsFooter = chartDiv.querySelector('.walker-controls-footer');
    if (!controlsFooter) {
      controlsFooter = document.createElement('div');
      controlsFooter.className = 'walker-controls-footer';
      controlsFooter.style.display = 'flex';
      controlsFooter.style.justifyContent = 'center';
      controlsFooter.style.marginTop = '12px';
      chartDiv.appendChild(controlsFooter);
    }
    controlsFooter.innerHTML = '';
    controlsFooter.appendChild(saveBtn);
    if (walkerChartInstance) {
      walkerChartInstance.destroy();
      walkerChartInstance = null;
    }
    setTimeout(function () {
      if (!ChartRef) return;
      walkerChartInstance = new ChartRef(canvas.getContext('2d'), {
        type: 'bar',
        data: {
          labels: labels,
          datasets: datasets
        },
        options: {
          responsive: true,
          layout: {
            padding: {
              left: 60,
              right: 60,
              top: 40,
              bottom: 40
            }
          },
          plugins: {
            legend: {
              labels: {
                color: '#e0e0e0'
              }
            },
            title: {
              display: false
            }
          },
          scales: {
            x: {
              stacked: true,
              title: {
                display: true,
                text: 'Finish Time',
                color: '#e0e0e0'
              },
              ticks: {
                color: '#cccccc'
              },
              grid: {
                color: 'rgba(200,200,200,0.2)'
              }
            },
            y: {
              stacked: true,
              beginAtZero: true,
              title: {
                display: true,
                text: 'Number of Finishers',
                color: '#e0e0e0'
              },
              ticks: {
                color: '#cccccc',
                precision: 0
              },
              grid: {
                color: 'rgba(200,200,200,0.2)'
              }
            }
          }
        }
      });
    }, 0);
  }
  renderAll();
}
parkrunWalkerAnalysisMain();

// Consolidated exports for Node/Jest tests
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = {
    assignUnknownFinishTimes: assignUnknownFinishTimes,
    getEventMetadata: getEventMetadata,
    generateExportFilename: generateExportFilename,
    computeWalkerThreshold: computeWalkerThreshold
  };
}