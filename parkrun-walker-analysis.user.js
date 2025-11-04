// ==UserScript==
// @name         parkrun Walker Analysis
// @description  Highlight and summarize walkers (>=10:00/km) and compare with faster participants on parkrun results pages.
// @author       Pete Johns (@johnsyweb)
// @downloadURL  https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/parkrun-walker-analysis.user.js
// @grant        none
// @homepage     https://johnsy.com/tampermonkey-parkrun/
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
// @version      1.0.37
// ==/UserScript==

const ChartRef = typeof window !== 'undefined' && window.Chart ? window.Chart : undefined;

function assignUnknownFinishTimes(finishers) {
  function findPreviousKnownTime(finishers, startIndex) {
    const previousFinisher = finishers
      .slice(0, startIndex)
      .reverse()
      .find((f) => f.timeStr && f.timeSec > 0);
    return previousFinisher ? previousFinisher.timeSec : null;
  }
  function findNextKnownTime(finishers, startIndex) {
    const nextFinisher = finishers.slice(startIndex + 1).find((f) => f.timeStr && f.timeSec > 0);
    return nextFinisher ? nextFinisher.timeSec : null;
  }
  return finishers.map((finisher, index) => {
    if (finisher.timeStr && finisher.timeSec > 0) {
      return finisher;
    }
    const prevTime = findPreviousKnownTime(finishers, index);
    const nextTime = findNextKnownTime(finishers, index);
    const estimatedTime = prevTime || nextTime || 0;
    return {
      ...finisher,
      timeSec: estimatedTime,
      estimatedTime: estimatedTime > 0,
    };
  });
}

function getEventMetadata() {
  let eventName = '';
  let eventDate = '';
  let eventNumber = '';
  const h1 = typeof document !== 'undefined' ? document.querySelector('h1') : null;
  if (h1) {
    eventName = h1.textContent.trim();
  } else if (typeof document !== 'undefined' && document.title) {
    eventName = document.title.split('-')[0].trim();
  }
  const h3 = typeof document !== 'undefined' ? document.querySelector('h3') : null;
  if (h3) {
    const h3Text = h3.textContent;
    const dateMatch = h3Text.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
    if (dateMatch) eventDate = dateMatch[1];
    const numMatch = h3Text.match(/#(\d+)/);
    if (numMatch) eventNumber = numMatch[1];
  }
  return { eventName, eventDate, eventNumber };
}

function generateExportFilename(metadata, chartName) {
  let eventPart = metadata.eventName
    ? metadata.eventName.replace(/[^a-z0-9]+/gi, '').toLowerCase()
    : 'event';
  let datePart = metadata.eventDate ? metadata.eventDate.replace(/\//g, '_') : 'date';
  let numPart = metadata.eventNumber ? metadata.eventNumber : 'num';
  return `${eventPart}_${datePart}_${numPart}_${chartName}.png`;
}

function computeWalkerThreshold(url) {
  const DEFAULT = 5;
  const JUNIOR = 2;
  let courseLength = DEFAULT;
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
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
  }
  const rows = Array.from(document.querySelectorAll('tr.Results-table-row'));
  if (!rows.length) return;

  function getMilestoneClub(count, prefix) {
    const milestones = [1000, 500, 250, 100, 50, 25, 10];
    for (const m of milestones) {
      if (count >= m) {
        return { status: `${prefix} ${m} Club`, milestone: m };
      }
    }
    return { status: null, milestone: 0 };
  }

  const finishers = rows.map((row, idx) => {
    const timeCell = row.querySelector('.Results-table-td--time .compact');
    const timeStr = timeCell ? timeCell.textContent.trim() : '';
    let timeSec = timeToSeconds(timeStr);
    const gender = (row.getAttribute('data-gender') || '').trim();
    const runs = parseInt(row.getAttribute('data-runs'), 10);
    const vols = parseInt(row.getAttribute('data-vols'), 10);
    const achievement = (row.getAttribute('data-achievement') || '').trim();

    let parkrunExperience = 'Unknown';
    if (!isNaN(runs) && runs > 0) {
      if (runs === 1) {
        parkrunExperience = 'First Timer (anywhere)';
      } else if (achievement === 'First Timer!') {
        parkrunExperience = 'First Timer (to this event)';
      } else if (runs < 10) {
        parkrunExperience = 'Multiple parkruns';
      } else {
        const club = getMilestoneClub(runs, 'parkrun');
        parkrunExperience = club.status || 'Multiple parkruns';
      }
    }

    let volunteerStatus = 'Unknown';
    let volunteerMilestone = 0;
    if (!isNaN(vols)) {
      if (vols === 0) {
        volunteerStatus = 'Yet to Volunteer';
      } else if (vols === 1) {
        volunteerStatus = 'Volunteered once';
      } else if (vols > 1 && vols < 10) {
        volunteerStatus = 'Volunteered multiple times';
      } else {
        const club = getMilestoneClub(vols, 'Volunteer');
        volunteerStatus = club.status || 'Has Volunteered';
        volunteerMilestone = club.milestone;
      }
    }
    const clubMatch = row.innerHTML.match(/milestone-v(\d+)/);
    if (clubMatch) {
      volunteerStatus = `Volunteer ${clubMatch[1]} Club`;
      volunteerMilestone = parseInt(clubMatch[1], 10);
    }

    let ageGrade = '';
    const ageGradeCell = row.querySelector('.Results-table-td--agegrade');
    if (ageGradeCell) {
      const ag = ageGradeCell.textContent.trim();
      if (ag) ageGrade = ag.replace('%', '');
    }

    let ageGroup = 'Unknown';
    let agRaw = row.getAttribute('data-agegroup') || '';
    if (agRaw) {
      ageGroup = agRaw.replace(/^[A-Z]+/, '');
    } else {
      const ageGroupCell = row.querySelector('.Results-table-td--agegroup');
      if (ageGroupCell) {
        const cellText = ageGroupCell.textContent.trim().replace(/^[A-Z]+/, '');
        ageGroup = cellText || (timeStr ? 'Not specified' : 'Unknown');
      } else if (timeStr) {
        ageGroup = 'Not specified';
      }
    }

    let normGender = gender.toLowerCase();
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
      timeStr,
      timeSec,
      gender: normGender,
      parkrunExperience,
      volunteerStatus,
      volunteerMilestone,
      ageGrade,
      ageGroup,
      _row: row,
      _idx: idx,
    };
  });

  const finishersWithEstimatedTimes = assignUnknownFinishTimes(finishers);

  function groupByMinute(breakdownKey) {
    const bins = {};
    let minMinute = Infinity,
      maxMinute = 0;
    finishersWithEstimatedTimes.forEach((f) => {
      if (f.timeSec === 0) return;
      const min = Math.floor(f.timeSec / 60);
      minMinute = Math.min(minMinute, min);
      maxMinute = Math.max(maxMinute, min);
      if (!bins[min]) bins[min] = {};
      const key = f[breakdownKey] || 'Unknown';
      bins[min][key] = (bins[min][key] || 0) + 1;
    });
    return { bins, minMinute, maxMinute };
  }

  const milestoneColours = {
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
    Unknown: '#A1B6B7',
  };

  const breakdowns = [
    { key: 'parkrunExperience', label: 'parkrun Experience' },
    { key: 'volunteerStatus', label: 'Volunteer Experience' },
    { key: 'gender', label: 'Gender' },
    { key: 'ageGroup', label: 'Age Group' },
  ];

  let currentBreakdown = 'parkrunExperience';
  let chartContainerId = 'finishersStackedChart';
  let walkerChartInstance = null;
  let controlDiv = document.getElementById('walkerAnalysisControls');
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
    const threshold = computeWalkerThreshold(
      typeof document !== 'undefined' && document.location ? document.location.href : ''
    );
    const walkers = finishersWithEstimatedTimes.filter((f) => f.timeSec >= threshold);
    const runners = finishersWithEstimatedTimes.filter(
      (f) => f.timeSec > 0 && f.timeSec < threshold
    );
    const totalWalkers = walkers.length;
    const totalRunners = runners.length;
    const allValues = new Set();
    walkers.forEach((f) => allValues.add(f[breakdownKey] || 'Unknown'));
    runners.forEach((f) => allValues.add(f[breakdownKey] || 'Unknown'));
    let valueList = Array.from(allValues);
    if (breakdownKey === 'ageGroup') {
      valueList = valueList.filter((v) => v && v !== 'Unknown' && v !== 'Not specified');
      valueList.sort((a, b) => {
        const aLow = parseInt((a || '').split('-')[0], 10);
        const bLow = parseInt((b || '').split('-')[0], 10);
        if (isNaN(aLow)) return 1;
        if (isNaN(bLow)) return -1;
        return aLow - bLow;
      });
      if (allValues.has('Not specified')) valueList.push('Not specified');
      if (allValues.has('Unknown')) valueList.push('Unknown');
    } else if (breakdownKey === 'parkrunExperience') {
      const experienceOrder = [
        'First Timer (anywhere)',
        'First Timer (to this event)',
        'Multiple parkruns',
        'parkrun 10 Club',
        'parkrun 25 Club',
        'parkrun 50 Club',
        'parkrun 100 Club',
        'parkrun 250 Club',
        'parkrun 500 Club',
        'parkrun 1000 Club',
      ];
      const experienceIndex = (v) => {
        const idx = experienceOrder.indexOf(v);
        if (idx !== -1) return idx;
        const m = v.match(/parkrun (\d+) Club/);
        if (m) {
          const milestones = [10, 25, 50, 100, 250, 500, 1000];
          const num = parseInt(m[1], 10);
          const milestoneIdx = milestones.indexOf(num);
          return milestoneIdx !== -1 ? 3 + milestoneIdx : 200 + num;
        }
        if (v === 'Unknown') return 9999;
        return 999;
      };
      valueList.sort((a, b) => experienceIndex(a) - experienceIndex(b));
    } else if (breakdownKey === 'volunteerStatus') {
      const milestoneOrder = [
        'Yet to Volunteer',
        'Volunteered once',
        'Volunteered multiple times',
        'Volunteer 10 Club',
        'Volunteer 25 Club',
        'Volunteer 50 Club',
        'Volunteer 100 Club',
        'Volunteer 250 Club',
        'Volunteer 500 Club',
        'Volunteer 1000 Club',
      ];
      const milestoneIndex = (v) => {
        const idx = milestoneOrder.indexOf(v);
        if (idx !== -1) return idx;
        const m = v.match(/(\d+)/);
        if (m) return 200 + parseInt(m[1], 10);
        if (v === 'Has Volunteered') return 150;
        if (v === 'Unknown') return 9999;
        return 999;
      };
      valueList.sort((a, b) => milestoneIndex(a) - milestoneIndex(b));
    } else {
      valueList.sort();
    }
    const totalFinishers = totalWalkers + totalRunners;
    const walkerPercent = totalFinishers
      ? ((totalWalkers / totalFinishers) * 100).toFixed(1)
      : '0.0';
    const runnerPercent = totalFinishers
      ? ((totalRunners / totalFinishers) * 100).toFixed(1)
      : '0.0';
    let html = `<div style="text-align:center;margin-bottom:0.5em;font-size:1.08em;">
      <strong>Walkers:</strong> ${totalWalkers} (${walkerPercent}%) &nbsp; | &nbsp; <strong>Runners:</strong> ${totalRunners} (${runnerPercent}%) &nbsp; | &nbsp; <strong>Total finishers:</strong> ${totalFinishers}
    </div>`;
    html += `<table class="Results-table" style="margin:1em auto;font-size:1.1em;">
      <thead><tr><th>${breakdowns.find((b) => b.key === breakdownKey).label}</th><th>Walkers (n)</th><th>Walkers (%)</th><th>Runners (n)</th><th>Runners (%)</th><th>Total (n)</th><th>Total (%)</th></tr></thead><tbody>`;
    valueList.forEach((val) => {
      const w = walkers.filter((f) => (f[breakdownKey] || 'Unknown') === val).length;
      const r = runners.filter((f) => (f[breakdownKey] || 'Unknown') === val).length;
      const t = w + r;
      html += `<tr><td>${val}</td><td style="text-align:right">${w}</td><td style="text-align:right">${totalWalkers ? ((w / totalWalkers) * 100).toFixed(1) : '0.0'}%</td><td style="text-align:right">${r}</td><td style="text-align:right">${totalRunners ? ((r / totalRunners) * 100).toFixed(1) : '0.0'}%</td><td style="text-align:right">${t}</td><td style="text-align:right">${totalFinishers ? ((t / totalFinishers) * 100).toFixed(1) : '0.0'}%</td></tr>`;
    });
    html += `<tr style="font-weight:bold;"><td>Total</td><td style="text-align:right">${totalWalkers}</td><td style="text-align:right">100.0%</td><td style="text-align:right">${totalRunners}</td><td style="text-align:right">100.0%</td><td style="text-align:right">${totalFinishers}</td><td style="text-align:right">100.0%</td></tr>`;
    html += `</tbody></table>`;
    return html;
  }

  function updateBreakdownControls() {
    controlDiv.innerHTML =
      'Breakdown: ' +
      breakdowns
        .map(
          (b) =>
            `<button style="margin:0 8px;padding:6px 12px;border-radius:4px;border:none;background:${currentBreakdown === b.key ? '#FFA300' : '#00CEAE'};color:#2b223d;font-weight:bold;cursor:pointer;" data-key="${b.key}">${b.label}</button>`
        )
        .join('');
    controlDiv.querySelectorAll('button').forEach((btn) => {
      btn.onclick = () => {
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
    let summaryDiv = document.getElementById('walkerRunnerSummaryTable');
    if (!summaryDiv) {
      summaryDiv = document.createElement('div');
      summaryDiv.id = 'walkerRunnerSummaryTable';
    }
    summaryDiv.innerHTML = buildTable(currentBreakdown);
    let walkerContainer = document.getElementById('walkerAnalysisContainer');
    if (!walkerContainer) {
      walkerContainer = document.createElement('div');
      walkerContainer.id = 'walkerAnalysisContainer';
      walkerContainer.style.width = '100%';
      walkerContainer.style.maxWidth = '900px';
      walkerContainer.style.margin = '20px auto';
    }
    walkerContainer.innerHTML = '';
    let chartDiv = document.getElementById(chartContainerId);
    if (!chartDiv) {
      chartDiv = document.createElement('div');
      chartDiv.id = chartContainerId;
    }
    walkerContainer.appendChild(chartDiv);
    walkerContainer.appendChild(controlDiv);
    walkerContainer.appendChild(summaryDiv);
    const firstH3 = document.querySelector('h3');
    if (firstH3 && firstH3.parentNode) {
      if (
        walkerContainer.parentNode !== firstH3.parentNode ||
        walkerContainer.previousSibling !== firstH3
      ) {
        if (firstH3.nextSibling) {
          firstH3.parentNode.insertBefore(walkerContainer, firstH3.nextSibling);
        } else {
          firstH3.parentNode.appendChild(walkerContainer);
        }
      }
    } else {
      document.body.appendChild(walkerContainer);
    }

    renderStackedChart(
      currentBreakdown,
      breakdowns.find((b) => b.key === currentBreakdown).label,
      chartContainerId
    );
    insertControlsBelowChart();
  }

  function insertControlsBelowChart() {
    let chartDiv = document.getElementById(chartContainerId);
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
    const { bins, minMinute, maxMinute } = groupByMinute(breakdownKey);
    const minutes = [];
    for (let m = minMinute; m <= maxMinute; m++) minutes.push(m);
    const allKeys = new Set();
    Object.values(bins).forEach((obj) => Object.keys(obj).forEach((k) => allKeys.add(k)));
    let keyList = Array.from(allKeys);
    function sortKeyList(keys, breakdownType) {
      if (breakdownType === 'ageGroup') {
        const sorted = keys.filter((v) => v && v !== 'Unknown' && v !== 'Not specified');
        sorted.sort((a, b) => {
          const aLow = parseInt((a || '').split('-')[0], 10);
          const bLow = parseInt((b || '').split('-')[0], 10);
          if (isNaN(aLow)) return 1;
          if (isNaN(bLow)) return -1;
          return aLow - bLow;
        });
        if (keys.includes('Not specified')) sorted.push('Not specified');
        if (keys.includes('Unknown')) sorted.push('Unknown');
        return sorted;
      }
      if (breakdownType === 'parkrunExperience') {
        const experienceOrder = [
          'First Timer (anywhere)',
          'First Timer (to this event)',
          'Multiple parkruns',
          'parkrun 10 Club',
          'parkrun 25 Club',
          'parkrun 50 Club',
          'parkrun 100 Club',
          'parkrun 250 Club',
          'parkrun 500 Club',
          'parkrun 1000 Club',
        ];
        const experienceIndex = (v) => {
          const idx = experienceOrder.indexOf(v);
          if (idx !== -1) return idx;
          const m = v.match(/parkrun (\d+) Club/);
          if (m) {
            const milestones = [10, 25, 50, 100, 250, 500, 1000];
            const num = parseInt(m[1], 10);
            const milestoneIdx = milestones.indexOf(num);
            return milestoneIdx !== -1 ? 3 + milestoneIdx : 200 + num;
          }
          if (v === 'Unknown') return 9999;
          return 999;
        };
        return keys.slice().sort((a, b) => experienceIndex(a) - experienceIndex(b));
      }
      if (breakdownType === 'volunteerStatus') {
        const milestoneOrder = [
          'Yet to Volunteer',
          'Volunteered once',
          'Volunteered multiple times',
          'Volunteer 10 Club',
          'Volunteer 25 Club',
          'Volunteer 50 Club',
          'Volunteer 100 Club',
          'Volunteer 250 Club',
          'Volunteer 500 Club',
          'Volunteer 1000 Club',
        ];
        const milestoneIndex = (v) => {
          const idx = milestoneOrder.indexOf(v);
          if (idx !== -1) return idx;
          const m = v.match(/(\d+)/);
          if (m) return 200 + parseInt(m[1], 10);
          if (v === 'Has Volunteered') return 150;
          if (v === 'Unknown') return 9999;
          return 999;
        };
        return keys.slice().sort((a, b) => milestoneIndex(a) - milestoneIndex(b));
      }
      return keys.slice().sort();
    }
    keyList = sortKeyList(keyList, breakdownKey);
    function getColour(key) {
      if (breakdownKey === 'volunteerStatus') {
        const match = key.match(/(\d+)/);
        if (match) {
          const m = parseInt(match[1], 10);
          return milestoneColours[m] || '#cccccc';
        }
        return milestoneColours[key] || '#cccccc';
      }
      if (breakdownKey === 'parkrunExperience') {
        const match = key.match(/(\d+)/);
        if (match) {
          const m = parseInt(match[1], 10);
          return milestoneColours[m] || '#cccccc';
        }
        const experienceColours = {
          'First Timer (anywhere)': '#FFE049',
          'First Timer (to this event)': '#FFA300',
          'Multiple parkruns': '#00CEAE',
          Unknown: '#A1B6B7',
        };
        return experienceColours[key] || '#cccccc';
      }
      if (breakdownKey === 'gender') {
        const genderColours = {
          Male: '#00CEAE',
          Female: '#E21145',
          'Not specified': '#FFE049',
          Unknown: '#A1B6B7',
        };
        return genderColours[key] || '#FFA300';
      }
      if (breakdownKey === 'ageGroup') {
        if (key === 'Not specified') return '#F2F2F2';
        if (key === 'Unknown') return '#A1B6B7';
        const match = key.match(/^(\d+)-/);
        if (match) {
          const age = parseInt(match[1], 10);
          const gradient = [
            '#DA70D6',
            '#9370DB',
            '#6495ED',
            '#4169E1',
            '#1E90FF',
            '#00BFFF',
            '#00CED1',
            '#20B2AA',
            '#3CB371',
            '#32CD32',
            '#9ACD32',
            '#FFD700',
            '#FFA500',
            '#FF8C00',
            '#FF6347',
            '#DC143C',
            '#DB7093',
          ];
          const index = Math.floor((age - 10) / 5);
          return gradient[Math.min(index, gradient.length - 1)] || '#cccccc';
        }
        return '#cccccc';
      }
      return [
        '#FFA300',
        '#00CEAE',
        '#E21145',
        '#EBE9F0',
        '#FFE049',
        '#2C504A',
        '#6D5698',
        '#C81D31',
        '#A1B6B7',
      ][keyList.indexOf(key) % 9];
    }
    const datasets = keyList.map((key) => ({
      label: key,
      data: minutes.map((m) => (bins[m] && bins[m][key] ? bins[m][key] : 0)),
      backgroundColor: getColour(key),
      stack: 'stack1',
    }));
    let labels = minutes.map((min) => {
      const h = Math.floor(min / 60);
      const m = min % 60;
      return `${h}:${m.toString().padStart(2, '0')}`;
    });
    let chartDiv = document.getElementById(containerId);
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
    const heading = document.createElement('h3');
    heading.textContent = `Finishers per Minute by ${breakdownLabel}`;
    heading.style.textAlign = 'center';
    heading.style.marginBottom = '15px';
    heading.style.color = '#FFA300';
    chartDiv.appendChild(heading);
    const canvas = document.createElement('canvas');
    chartDiv.appendChild(canvas);
    let saveBtn = document.createElement('button');
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
    saveBtn.addEventListener('click', async function () {
      try {
        const metadata = getEventMetadata();
        const heading = chartDiv.querySelector('h3');
        let chartName = heading
          ? heading.textContent
              .replace(/[^a-z0-9]+/gi, '-')
              .replace(/^-+|-+$/g, '')
              .toLowerCase()
          : 'chart';
        const filename = generateExportFilename(metadata, chartName);

        // Add title and background to the chart canvas
        const chartCanvas = canvas;
        const chartWidth = chartCanvas.width;
        const chartHeight = chartCanvas.height;
        const titleHeight = 100;
        const totalWidth = chartWidth;
        const totalHeight = chartHeight + titleHeight;

        const out = document.createElement('canvas');
        out.width = totalWidth;
        out.height = totalHeight;
        const ctx = out.getContext('2d');

        // Background
        ctx.fillStyle = '#2b223d';
        ctx.fillRect(0, 0, totalWidth, totalHeight);

        // Title
        ctx.fillStyle = '#FFA300';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 56px Arial';
        const titleText = heading ? heading.textContent : 'Finishers per Minute';
        ctx.fillText(titleText, totalWidth / 2, titleHeight / 2);

        // Chart
        ctx.drawImage(chartCanvas, 0, titleHeight);

        const link = document.createElement('a');
        link.download = filename;
        link.href = out.toDataURL('image/png');
        link.click();
      } catch (err) {
        alert('Failed to export image: ' + err);
      }
    });

    let controlsFooter = chartDiv.querySelector('.walker-controls-footer');
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
    setTimeout(() => {
      if (!ChartRef) return;
      walkerChartInstance = new ChartRef(canvas.getContext('2d'), {
        type: 'bar',
        data: { labels, datasets },
        options: {
          responsive: true,
          layout: {
            padding: {
              left: 60,
              right: 60,
              top: 40,
              bottom: 40,
            },
          },
          plugins: {
            legend: { labels: { color: '#e0e0e0' } },
            title: { display: false },
          },
          scales: {
            x: {
              stacked: true,
              title: { display: true, text: 'Finish Time', color: '#e0e0e0' },
              ticks: { color: '#cccccc' },
              grid: { color: 'rgba(200,200,200,0.2)' },
            },
            y: {
              stacked: true,
              beginAtZero: true,
              title: { display: true, text: 'Number of Finishers', color: '#e0e0e0' },
              ticks: { color: '#cccccc', precision: 0 },
              grid: { color: 'rgba(200,200,200,0.2)' },
            },
          },
        },
      });
    }, 0);
  }

  renderAll();
}

parkrunWalkerAnalysisMain();

// Consolidated exports for Node/Jest tests
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = {
    assignUnknownFinishTimes,
    getEventMetadata,
    generateExportFilename,
    computeWalkerThreshold,
  };
}
