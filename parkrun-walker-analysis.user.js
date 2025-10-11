// ==UserScript==
// @name         parkrun Walker Analysis
// @description  Highlight and summarize walkers (>=50:00) and compare with faster participants on parkrun results pages.
// @author       Pete Johns (@johnsyweb)
// @downloadURL  https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/parkrun-walker-analysis.user.js
// @grant        none
// @homepage     https://github.com/johnsyweb/tampermonkey-parkrun
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
// @run-at       document-end
// @supportURL   https://github.com/johnsyweb/tampermonkey-parkrun/issues/
// @tag          parkrun
// @updateURL    https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/parkrun-walker-analysis.user.js
// @version      1.0.7
// ==/UserScript==





(function() {
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
  
  const finishers = rows.map((row, idx) => {
    const timeCell = row.querySelector('.Results-table-td--time .compact');
    const timeStr = timeCell ? timeCell.textContent.trim() : '';
    let timeSec = timeToSeconds(timeStr);
    const gender = (row.getAttribute('data-gender') || '').trim();
    const runs = parseInt(row.getAttribute('data-runs'), 10);
    const vols = parseInt(row.getAttribute('data-vols'), 10);
    const achievement = (row.getAttribute('data-achievement') || '').trim();
    let firstTimerStatus = 'Established';
    if (runs === 1) firstTimerStatus = 'First Timer (Anywhere)';
    else if (achievement === 'First Timer!') firstTimerStatus = 'First Timer (Here)';
    let volunteerStatus = 'Yet to Volunteer';
    let volunteerMilestone = 0;
    if (!isNaN(vols) && vols > 0) {
      if (vols === 1) {
        volunteerStatus = 'Volunteered once';
      } else if (vols > 1 && vols < 10) {
        volunteerStatus = 'Volunteered multiple times';
      } else {
        volunteerStatus = 'Has Volunteered';
      }
      const milestones = [1000, 500, 250, 100, 50, 25, 10];
      for (const m of milestones) {
        if (vols >= m) {
          volunteerStatus = `Volunteer Club ${m}`;
          volunteerMilestone = m;
          break;
        }
      }
    }
    const clubMatch = row.innerHTML.match(/milestone-v(\d+)/);
    if (clubMatch) {
      volunteerStatus = `Volunteer Club ${clubMatch[1]}`;
      volunteerMilestone = parseInt(clubMatch[1], 10);
    }
    
    let ageGrade = '';
    const ageGradeCell = row.querySelector('.Results-table-td--agegrade');
    if (ageGradeCell) {
      const ag = ageGradeCell.textContent.trim();
      if (ag) ageGrade = ag.replace('%','');
    }
    
    let ageGroup = '';
    let agRaw = row.getAttribute('data-agegroup') || '';
    if (agRaw) {
      ageGroup = agRaw.replace(/^[A-Z]+/, '');
    } else {
      const ageGroupCell = row.querySelector('.Results-table-td--agegroup');
      if (ageGroupCell) {
        ageGroup = ageGroupCell.textContent.trim().replace(/^[A-Z]+/, '');
      }
    }
    
    let normGender = gender.toLowerCase();
    if (normGender === 'male' || normGender === 'm') normGender = 'Male';
    else if (normGender === 'female' || normGender === 'f') normGender = 'Female';
    else normGender = 'Other';
    return {
      timeStr, timeSec, gender: normGender, firstTimerStatus, volunteerStatus, volunteerMilestone, ageGrade, ageGroup, _row: row, _idx: idx
    };
  });

  
  let firstWalkerIdx = finishers.findIndex(f => f.timeSec >= 3000);
  if (firstWalkerIdx !== -1) {
    for (let i = firstWalkerIdx; i < finishers.length; ++i) {
      
      if (!finishers[i].timeStr || finishers[i].timeSec < 3000) {
        finishers[i].timeSec = finishers[i-1].timeSec;
      }
    }
  }

  
  function groupByMinute(breakdownKey) {
    const bins = {};
    let minMinute = Infinity, maxMinute = 0;
    finishers.forEach(f => {
      if (!f.timeStr) return;
      const min = Math.floor(f.timeSec / 60);
      minMinute = Math.min(minMinute, min);
      maxMinute = Math.max(maxMinute, min);
      if (!bins[min]) bins[min] = {};
      const key = f[breakdownKey] || 'Unknown';
      bins[min][key] = (bins[min][key] || 0) + 1;
    });
    return { bins, minMinute, maxMinute };
  }

  // Milestone colour map (from provided symbols)
  const milestoneColours = {
    10: '#f5a9b8',    // pink
    25: '#e754a6',    // purple
    50: '#ff595e',    // red
    100: '#6c757d',   // black/grey
    250: '#53ba9d',   // green
    500: '#3b82f6',   // blue
    1000: '#ffe066',  // yellow
    'Has Volunteered': '#53ba9d',
    'Yet to Volunteer': '#cccccc'
  };

  // Chart rendering
  function renderStackedChart(breakdownKey, breakdownLabel, containerId) {
    const { bins, minMinute, maxMinute } = groupByMinute(breakdownKey);
    const minutes = [];
    for (let m = minMinute; m <= maxMinute; m++) minutes.push(m);
    
    const allKeys = new Set();
    Object.values(bins).forEach(obj => Object.keys(obj).forEach(k => allKeys.add(k)));
    const keyList = Array.from(allKeys);
    
    function getColour(key) {
      if (breakdownKey === 'volunteerStatus') {
        const match = key.match(/(\d+)/);
        if (match) {
          const m = parseInt(match[1], 10);
          return milestoneColours[m] || '#cccccc';
        }
        return milestoneColours[key] || '#cccccc';
      }
      return ['#FFA300','#53BA9D','#2b223d','#e0e0e0','#cccccc','#f0c36d','#e0ffe0','#e59200','#008080','#666'][keyList.indexOf(key) % 10];
    }
    const datasets = keyList.map((key, i) => ({
      label: key,
      data: minutes.map(m => (bins[m] && bins[m][key]) ? bins[m][key] : 0),
      backgroundColor: getColour(key),
      stack: 'stack1'
    }));
    const labels = minutes.map(min => {
      const h = Math.floor(min / 60);
      const m = min % 60;
      return `${h}:${m.toString().padStart(2,'0')}`;
    });
    let chartDiv = document.getElementById(containerId);
    if (!chartDiv) {
      chartDiv = document.createElement('div');
      chartDiv.id = containerId;
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
      const chartContainer = document.createElement('div');
      chartContainer.style.position = 'relative';
      chartDiv.appendChild(chartContainer);
    } else {
      chartDiv.innerHTML = '';
      const heading = document.createElement('h3');
      heading.textContent = `Finishers per Minute by ${breakdownLabel}`;
      heading.style.textAlign = 'center';
      heading.style.marginBottom = '15px';
      heading.style.color = '#FFA300';
      chartDiv.appendChild(heading);
    }
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
    saveBtn.addEventListener('click', function () {
      saveBtn.style.display = 'none';
      if (typeof html2canvas === 'undefined') {
        alert('html2canvas is not loaded.');
        saveBtn.style.display = 'block';
        return;
      }
      html2canvas(chartDiv, {
        backgroundColor: '#2b223d',
        scale: 2,
        logging: false,
        allowTaint: true,
        useCORS: true
      }).then((canvas) => {
        saveBtn.style.display = 'block';
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().split('T')[0];
        link.download = `parkrun-walker-analysis-${breakdownKey}-${timestamp}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      });
    });
    chartDiv.appendChild(saveBtn);
    
    let inserted = false;
    const titleSelectors = ['h1', 'h3'];
    for (const sel of titleSelectors) {
      const title = document.querySelector(sel);
      if (title && title.parentNode) {
        if (title.nextSibling) {
          title.parentNode.insertBefore(chartDiv, title.nextSibling);
        } else {
          title.parentNode.appendChild(chartDiv);
        }
        inserted = true;
        break;
      }
    }
    if (!inserted) document.body.prepend(chartDiv);
    setTimeout(() => {
      if (typeof Chart === 'undefined') return;
      new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: { labels, datasets },
        options: {
          responsive: true,
          plugins: {
            legend: { labels: { color: '#e0e0e0' } },
            title: { display: false },
            annotation: {
              annotations: {
                line1: {
                  type: 'line',
                  xMin: 50,
                  xMax: 50,
                  borderColor: 'red',
                  borderWidth: 2,
                  label: {
                    content: '50:00',
                    enabled: true,
                    position: 'start',
                    color: 'red',
                    backgroundColor: '#2b223d',
                  }
                }
              }
            }
          },
          scales: {
            x: { stacked: true, title: { display: true, text: 'Finish Time', color: '#e0e0e0' }, ticks: { color: '#cccccc' }, grid: { color: 'rgba(200,200,200,0.2)' } },
            y: { stacked: true, beginAtZero: true, title: { display: true, text: 'Number of Finishers', color: '#e0e0e0' }, ticks: { color: '#cccccc', precision: 0 }, grid: { color: 'rgba(200,200,200,0.2)' } }
          }
        }
      });
    }, 0);
    
    let summaryDiv = document.getElementById('walkerRunnerSummaryTable');
    if (!summaryDiv) {
      summaryDiv = document.createElement('div');
      summaryDiv.id = 'walkerRunnerSummaryTable';
    }
    summaryDiv.innerHTML = buildTable();

    // Group all Walker Analysis elements in a single container
    let walkerContainer = document.getElementById('walkerAnalysisContainer');
    if (!walkerContainer) {
      walkerContainer = document.createElement('div');
      walkerContainer.id = 'walkerAnalysisContainer';
      walkerContainer.style.width = '100%';
      walkerContainer.style.maxWidth = '900px';
      walkerContainer.style.margin = '20px auto';
    }
    // Clear and append in order: chart, controls, table
    walkerContainer.innerHTML = '';
    walkerContainer.appendChild(chartDiv);
    walkerContainer.appendChild(controlDiv);
    walkerContainer.appendChild(summaryDiv);

    // Insert container below first h3
    const firstH3 = document.querySelector('h3');
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
  }

  
  const breakdowns = [
    { key: 'gender', label: 'Gender' },
    { key: 'firstTimerStatus', label: 'First Timer Status' },
    { key: 'volunteerStatus', label: 'Volunteer Status' },
    { key: 'ageGroup', label: 'Age Group' }
  ];
  let currentBreakdown = breakdowns[0].key;
  let chartContainerId = 'finishersStackedChart';
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
  function updateBreakdownControls() {
    controlDiv.innerHTML = 'Breakdown: ' + breakdowns.map(b => `<button style=\"margin:0 8px;padding:6px 12px;border-radius:4px;border:none;background:${currentBreakdown===b.key?'#FFA300':'#53BA9D'};color:#2b223d;font-weight:bold;cursor:pointer;\" data-key=\"${b.key}\">${b.label}</button>`).join('');
    controlDiv.querySelectorAll('button').forEach(btn => {
      btn.onclick = e => {
        currentBreakdown = btn.getAttribute('data-key');
        renderStackedChart(currentBreakdown, breakdowns.find(b=>b.key===currentBreakdown).label, chartContainerId);
        // Instead of calling updateBreakdownControls (which moves the selector), just update button backgrounds
        controlDiv.querySelectorAll('button').forEach(b => b.style.background = (b.getAttribute('data-key')===currentBreakdown?'#FFA300':'#53BA9D'));
      };
    });
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
  
  function buildTable() {
    
    const walkers = finishers.filter(f => f.timeSec >= 3000);
    const runners = finishers.filter(f => f.timeSec > 0 && f.timeSec < 3000);
    const totalWalkers = walkers.length;
    const totalRunners = runners.length;
    
    const allValues = new Set();
    walkers.forEach(f => allValues.add(f[currentBreakdown] || 'Unknown'));
    runners.forEach(f => allValues.add(f[currentBreakdown] || 'Unknown'));
    let valueList = Array.from(allValues);
    
    if (currentBreakdown === 'ageGroup') {
      valueList = valueList.filter(v => v && v !== 'Unknown');
      valueList.sort((a, b) => {
        const aLow = parseInt((a||'').split('-')[0], 10);
        const bLow = parseInt((b||'').split('-')[0], 10);
        if (isNaN(aLow)) return 1;
        if (isNaN(bLow)) return -1;
        return aLow - bLow;
      });
      
      if (allValues.has('Unknown')) valueList.push('Unknown');
    } else if (currentBreakdown === 'volunteerStatus') {
      
      const milestoneOrder = [
        'Yet to Volunteer',
        'Volunteered once',
        'Volunteered multiple times',
        'Volunteer Club 10',
        'Volunteer Club 25',
        'Volunteer Club 50',
        'Volunteer Club 100',
        'Volunteer Club 250',
        'Volunteer Club 500',
        'Volunteer Club 1000'
      ];
      const milestoneIndex = v => {
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
    let html = `<table class="Results-table" style="margin:1em auto;font-size:1.1em;">
      <thead><tr><th>${breakdowns.find(b=>b.key===currentBreakdown).label}</th><th>Walkers (n)</th><th>Walkers (%)</th><th>Runners (n)</th><th>Runners (%)</th></tr></thead><tbody>`;
    valueList.forEach(val => {
      const w = walkers.filter(f => (f[currentBreakdown]||'Unknown') === val).length;
      const r = runners.filter(f => (f[currentBreakdown]||'Unknown') === val).length;
      html += `<tr><td>${val}</td><td style="text-align:right">${w}</td><td style="text-align:right">${totalWalkers ? ((w/totalWalkers)*100).toFixed(1) : '0.0'}%</td><td style="text-align:right">${r}</td><td style="text-align:right">${totalRunners ? ((r/totalRunners)*100).toFixed(1) : '0.0'}%</td></tr>`;
    });
    html += `<tr style=\"font-weight:bold;\"><td>Total</td><td style=\"text-align:right\">${totalWalkers}</td><td style=\"text-align:right\">100.0%</td><td style=\"text-align:right\">${totalRunners}</td><td style=\"text-align:right\">100.0%</td></tr>`;
    html += `</tbody></table>`;
    return html;
  }
  renderStackedChart(currentBreakdown, breakdowns.find(b=>b.key===currentBreakdown).label, chartContainerId);
  updateBreakdownControls();
  insertControlsBelowChart();
})();
