// ==UserScript==
// @name         parkrun Annual Summary
// @description  Adds an annual participation summary (totals, averages, min/max) to parkrun event history pages
// @author       Pete Johns (@johnsyweb)
// @downloadURL  https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/parkrun-annual-summary.user.js
// @grant        none
// @homepage     https://johnsy.com/tampermonkey-parkrun/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=parkrun.com.au
// @license      MIT
// @match        *://www.parkrun.ca/*/results/eventhistory/*
// @match        *://www.parkrun.co.at/*/results/eventhistory/*
// @match        *://www.parkrun.co.nl/*/results/eventhistory/*
// @match        *://www.parkrun.co.nz/*/results/eventhistory/*
// @match        *://www.parkrun.co.za/*/results/eventhistory/*
// @match        *://www.parkrun.com.au/*/results/eventhistory/*
// @match        *://www.parkrun.com.de/*/results/eventhistory/*
// @match        *://www.parkrun.dk/*/results/eventhistory/*
// @match        *://www.parkrun.fi/*/results/eventhistory/*
// @match        *://www.parkrun.fr/*/results/eventhistory/*
// @match        *://www.parkrun.ie/*/results/eventhistory/*
// @match        *://www.parkrun.it/*/results/eventhistory/*
// @match        *://www.parkrun.jp/*/results/eventhistory/*
// @match        *://www.parkrun.lt/*/results/eventhistory/*
// @match        *://www.parkrun.my/*/results/eventhistory/*
// @match        *://www.parkrun.no/*/results/eventhistory/*
// @match        *://www.parkrun.org.uk/*/results/eventhistory/*
// @match        *://www.parkrun.pl/*/results/eventhistory/*
// @match        *://www.parkrun.se/*/results/eventhistory/*
// @match        *://www.parkrun.sg/*/results/eventhistory/*
// @match        *://www.parkrun.us/*/results/eventhistory/*
// @namespace    http://tampermonkey.net/
// @run-at       document-end
// @supportURL   https://github.com/johnsyweb/tampermonkey-parkrun/issues/
// @tag          parkrun
// @updateURL    https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/parkrun-annual-summary.user.js
// @require      https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js
// @require      https://html2canvas.hertzen.com/dist/html2canvas.min.js
// @version      0.1.0
// ==/UserScript==

(function () {
  'use strict';

  const STYLES = {
    backgroundColor: '#2b223d',
    barColor: '#FFA300',
    lineColor: '#53BA9D',
    textColor: '#e0e0e0',
    subtleTextColor: '#cccccc',
    gridColor: 'rgba(200, 200, 200, 0.2)',
  };

  function addChartDownloadButton(container) {
    const controlsContainer = document.createElement('div');
    controlsContainer.style.display = 'flex';
    controlsContainer.style.justifyContent = 'center';
    controlsContainer.style.marginTop = '10px';
    controlsContainer.style.marginBottom = '10px';

    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = '💾 Save as Image';
    downloadBtn.style.padding = '6px 12px';
    downloadBtn.style.backgroundColor = STYLES.barColor;
    downloadBtn.style.color = '#2b223d';
    downloadBtn.style.border = 'none';
    downloadBtn.style.borderRadius = '4px';
    downloadBtn.style.cursor = 'pointer';
    downloadBtn.style.fontWeight = 'bold';
    downloadBtn.style.display = 'inline-block';
    downloadBtn.style.margin = '0 5px';
    downloadBtn.title = 'Download summary as PNG image';

    downloadBtn.addEventListener('mouseover', function () {
      this.style.backgroundColor = '#e59200';
    });

    downloadBtn.addEventListener('mouseout', function () {
      this.style.backgroundColor = STYLES.barColor;
    });

    downloadBtn.addEventListener('click', function () {
      downloadBtn.style.display = 'none';

      // eslint-disable-next-line no-undef
      html2canvas(container, {
        backgroundColor: STYLES.backgroundColor,
        scale: 2,
        logging: false,
        allowTaint: true,
        useCORS: true,
      }).then((canvas) => {
        downloadBtn.style.display = 'block';

        const link = document.createElement('a');
        const timestamp = new Date().toISOString().split('T')[0];
        const pageUrl = window.location.pathname.split('/');
        const eventName = pageUrl[1];
        link.download = `${eventName}-annual-summary-${timestamp}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      });
    });

    controlsContainer.appendChild(downloadBtn);
    container.appendChild(controlsContainer);

    return controlsContainer;
  }

  function insertAfterFirst(selector, element) {
    const pageTitle = document.querySelector(selector);
    if (pageTitle && pageTitle.parentNode) {
      if (pageTitle.nextSibling) {
        pageTitle.parentNode.insertBefore(element, pageTitle.nextSibling);
      } else {
        pageTitle.parentNode.appendChild(element);
      }
    }
  }

  function extractEventHistoryData() {
    const title = document.querySelector('h1')?.textContent.trim() ?? 'Event History';
    const eventNumbers = [];
    const dates = [];
    const finishers = [];
    const volunteers = [];

    const rows = document.querySelectorAll('tr.Results-table-row');

    Array.from(rows)
      .reverse()
      .forEach((row) => {
        const eventNumber = row.getAttribute('data-parkrun');
        if (eventNumber) {
          eventNumbers.push(eventNumber);
        }

        const date = row.getAttribute('data-date');
        if (date) {
          const dateObj = new Date(date);
          const formattedDate = dateObj.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });
          dates.push(formattedDate);
        }

        const finishersCount = row.getAttribute('data-finishers');
        if (finishersCount) {
          finishers.push(parseInt(finishersCount, 10));
        }

        const volunteersCount = row.getAttribute('data-volunteers');
        if (volunteersCount) {
          volunteers.push(parseInt(volunteersCount, 10));
        }
      });

    return {
      title,
      eventNumbers,
      dates,
      finishers,
      volunteers,
    };
  }

  function aggregateByYear(historyData) {
    const yearly = {};

    historyData.dates.forEach((dateStr, index) => {
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const finishers = historyData.finishers[index] ?? 0;
      const volunteers = historyData.volunteers[index] ?? 0;
      const eventNumber = historyData.eventNumbers[index];

      if (!yearly[year]) {
        yearly[year] = {
          year,
          eventCount: 0,
          totalFinishers: 0,
          totalVolunteers: 0,
          minFinishers: null,
          maxFinishers: null,
          minVolunteers: null,
          maxVolunteers: null,
        };
      }

      const current = yearly[year];
      current.eventCount++;
      current.totalFinishers += finishers;
      current.totalVolunteers += volunteers;

      if (current.minFinishers === null || finishers < current.minFinishers.value) {
        current.minFinishers = { value: finishers, date: historyData.dates[index], eventNumber };
      }
      if (current.maxFinishers === null || finishers > current.maxFinishers.value) {
        current.maxFinishers = { value: finishers, date: historyData.dates[index], eventNumber };
      }
      if (current.minVolunteers === null || volunteers < current.minVolunteers.value) {
        current.minVolunteers = { value: volunteers, date: historyData.dates[index], eventNumber };
      }
      if (current.maxVolunteers === null || volunteers > current.maxVolunteers.value) {
        current.maxVolunteers = { value: volunteers, date: historyData.dates[index], eventNumber };
      }
    });

    return Object.keys(yearly)
      .map(Number)
      .sort((a, b) => a - b)
      .map((year) => {
        const data = yearly[year];
        return {
          year,
          eventCount: data.eventCount,
          totalFinishers: data.totalFinishers,
          totalVolunteers: data.totalVolunteers,
          avgFinishers: Math.round(data.totalFinishers / data.eventCount),
          avgVolunteers: Math.round(data.totalVolunteers / data.eventCount),
          minFinishers: data.minFinishers,
          maxFinishers: data.maxFinishers,
          minVolunteers: data.minVolunteers,
          maxVolunteers: data.maxVolunteers,
          finishersGrowth: null,
          volunteersGrowth: null,
        };
      })
      .map((row, index, arr) => {
        if (index === 0) {
          return row;
        }
        const prev = arr[index - 1];
        const finishersGrowth = prev.avgFinishers
          ? ((row.avgFinishers - prev.avgFinishers) / prev.avgFinishers) * 100
          : null;
        const volunteersGrowth = prev.avgVolunteers
          ? ((row.avgVolunteers - prev.avgVolunteers) / prev.avgVolunteers) * 100
          : null;

        return {
          ...row,
          finishersGrowth,
          volunteersGrowth,
        };
      });
  }

  function formatExtrema(record) {
    if (!record) return '-';
    return record.value.toLocaleString();
  }

  function formatGrowth(growth) {
    if (growth === null || Number.isNaN(growth)) return '-';
    const sign = growth > 0 ? '+' : '';
    const color = growth > 0 ? '#53BA9D' : growth < 0 ? '#ff6b6b' : STYLES.subtleTextColor;
    return `<span style="color: ${color};">${sign}${growth.toFixed(1)}%</span>`;
  }

  function renderAnnualSummary() {
    if (document.getElementById('annualSummaryTable')) {
      console.log('Annual summary already exists, skipping render');
      return;
    }

    const historyData = extractEventHistoryData();
    if (historyData.eventNumbers.length === 0) {
      console.log('No event history data found');
      return;
    }

    const yearly = aggregateByYear(historyData);
    if (yearly.length === 0) {
      console.log('No yearly data to display');
      return;
    }

    const container = document.createElement('div');
    container.className = 'parkrun-annual-summary';
    container.style.width = '100%';
    container.style.maxWidth = '1200px';
    container.style.margin = '20px auto';
    container.style.padding = '15px';
    container.style.backgroundColor = STYLES.backgroundColor;
    container.style.borderRadius = '8px';
    container.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';

    const heading = document.createElement('h3');
    heading.textContent = `${historyData.title}: Annual Participation Summary`;
    heading.style.textAlign = 'center';
    heading.style.marginBottom = '15px';
    heading.style.color = STYLES.barColor;
    container.appendChild(heading);

    const tableWrap = document.createElement('div');
    tableWrap.style.overflowX = 'auto';

    const table = document.createElement('table');
    table.id = 'annualSummaryTable';
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.fontSize = '14px';
    table.style.color = STYLES.textColor;

    const sortState = { key: 'year', dir: 'asc' };

    const columns = [
      { key: 'year', label: 'Year', align: 'left' },
      { key: 'eventCount', label: 'Events', align: 'center' },
      { key: 'totalFinishers', label: 'Finishers Total', align: 'right', color: STYLES.barColor },
      { key: 'minFinishers', label: 'Finishers Min', align: 'right', color: STYLES.barColor },
      { key: 'maxFinishers', label: 'Finishers Max', align: 'right', color: STYLES.barColor },
      { key: 'avgFinishers', label: 'Finishers Avg', align: 'right', color: STYLES.barColor },
      { key: 'finishersGrowth', label: 'Finishers YoY', align: 'right' },
      {
        key: 'totalVolunteers',
        label: 'Volunteers Total',
        align: 'right',
        color: STYLES.lineColor,
      },
      { key: 'minVolunteers', label: 'Volunteers Min', align: 'right', color: STYLES.lineColor },
      { key: 'maxVolunteers', label: 'Volunteers Max', align: 'right', color: STYLES.lineColor },
      { key: 'avgVolunteers', label: 'Volunteers Avg', align: 'right', color: STYLES.lineColor },
      { key: 'volunteersGrowth', label: 'Volunteers YoY', align: 'right' },
    ];

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.style.borderBottom = `2px solid ${STYLES.gridColor}`;

    columns.forEach((col) => {
      const th = document.createElement('th');
      th.textContent = col.label;
      th.style.padding = '10px';
      th.style.textAlign = col.align;
      th.style.cursor = 'pointer';
      if (col.color) th.style.color = col.color;

      th.addEventListener('click', () => {
        if (sortState.key === col.key) {
          sortState.dir = sortState.dir === 'asc' ? 'desc' : 'asc';
        } else {
          sortState.key = col.key;
          sortState.dir = 'desc';
        }
        renderBody();
      });

      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    container.appendChild(tableWrap);

    function renderBody() {
      tbody.innerHTML = '';
      const sorted = [...yearly].sort((a, b) => {
        const key = sortState.key;
        const dir = sortState.dir === 'asc' ? 1 : -1;

        const getVal = (row) => {
          const val = row[key];
          if (val === null || val === undefined) return -Infinity;
          if (typeof val === 'object' && val.value !== undefined) return val.value;
          return val;
        };

        const av = getVal(a);
        const bv = getVal(b);
        if (av === bv) return 0;
        return av > bv ? dir : -dir;
      });

      sorted.forEach((rowData) => {
        const row = document.createElement('tr');
        row.style.borderBottom = `1px solid ${STYLES.gridColor}`;
        row.innerHTML = `
          <td style="padding: 10px; text-align: left; font-weight: bold;">${rowData.year}</td>
          <td style="padding: 10px; text-align: center;">${rowData.eventCount}</td>
          <td style="padding: 10px; text-align: right; color: ${STYLES.barColor};">${rowData.totalFinishers.toLocaleString()}</td>
          <td style="padding: 10px; text-align: right; color: ${STYLES.barColor};">${formatExtrema(rowData.minFinishers)}</td>
          <td style="padding: 10px; text-align: right; color: ${STYLES.barColor};">${formatExtrema(rowData.maxFinishers)}</td>
          <td style="padding: 10px; text-align: right; color: ${STYLES.barColor};">${rowData.avgFinishers}</td>
          <td style="padding: 10px; text-align: right;">${formatGrowth(rowData.finishersGrowth)}</td>
          <td style="padding: 10px; text-align: right; color: ${STYLES.lineColor};">${rowData.totalVolunteers.toLocaleString()}</td>
          <td style="padding: 10px; text-align: right; color: ${STYLES.lineColor};">${formatExtrema(rowData.minVolunteers)}</td>
          <td style="padding: 10px; text-align: right; color: ${STYLES.lineColor};">${formatExtrema(rowData.maxVolunteers)}</td>
          <td style="padding: 10px; text-align: right; color: ${STYLES.lineColor};">${rowData.avgVolunteers}</td>
          <td style="padding: 10px; text-align: right;">${formatGrowth(rowData.volunteersGrowth)}</td>
        `;
        tbody.appendChild(row);
      });
    }

    renderBody();

    const chartsRow = document.createElement('div');
    chartsRow.style.display = 'grid';
    chartsRow.style.gridTemplateColumns = '1fr 1fr';
    chartsRow.style.gap = '20px';
    chartsRow.style.marginTop = '20px';

    const totalsChartContainer = document.createElement('div');
    totalsChartContainer.style.minWidth = '0';
    const totalsCanvas = document.createElement('canvas');
    totalsCanvas.id = 'annualTotalsChart';
    totalsChartContainer.appendChild(totalsCanvas);

    const growthChartContainer = document.createElement('div');
    growthChartContainer.style.minWidth = '0';
    const growthCanvas = document.createElement('canvas');
    growthCanvas.id = 'annualGrowthChart';
    growthChartContainer.appendChild(growthCanvas);

    chartsRow.appendChild(totalsChartContainer);
    chartsRow.appendChild(growthChartContainer);
    container.appendChild(chartsRow);

    addChartDownloadButton(container);

    const eventHistoryChart = document.getElementById('eventHistoryChart');
    if (eventHistoryChart && eventHistoryChart.parentElement) {
      eventHistoryChart.parentElement.parentNode.insertBefore(
        container,
        eventHistoryChart.parentElement.nextSibling
      );
    } else {
      insertAfterFirst('h1', container);
    }

    if (typeof Chart === 'undefined') {
      console.error('Chart.js not loaded');
      return;
    }

    const totalsCtx = totalsCanvas.getContext('2d');
    const growthCtx = growthCanvas.getContext('2d');

    const labels = yearly.map((d) => d.year.toString());

    // eslint-disable-next-line no-undef
    new Chart(totalsCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Total Finishers',
            data: yearly.map((d) => d.totalFinishers),
            backgroundColor: STYLES.barColor,
            borderColor: STYLES.barColor,
            borderWidth: 1,
          },
          {
            label: 'Total Volunteers',
            data: yearly.map((d) => d.totalVolunteers),
            backgroundColor: STYLES.lineColor,
            borderColor: STYLES.lineColor,
            borderWidth: 1,
          },
        ],
      },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 1.3,
        plugins: {
          legend: {
            labels: { color: STYLES.textColor },
          },
          title: {
            display: true,
            text: 'Annual Totals',
            color: STYLES.textColor,
          },
        },
        scales: {
          x: {
            title: { display: true, text: 'Year', color: STYLES.textColor },
            ticks: { color: STYLES.subtleTextColor },
            grid: { color: STYLES.gridColor },
          },
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Participants', color: STYLES.textColor },
            ticks: { precision: 0, color: STYLES.subtleTextColor },
            grid: { color: STYLES.gridColor },
          },
        },
      },
    });

    const growthData = yearly.filter((d) => d.finishersGrowth !== null);

    // eslint-disable-next-line no-undef
    new Chart(growthCtx, {
      type: 'line',
      data: {
        labels: growthData.map((d) => d.year.toString()),
        datasets: [
          {
            label: 'Finishers Growth',
            data: growthData.map((d) => d.finishersGrowth),
            borderColor: STYLES.barColor,
            backgroundColor: STYLES.barColor,
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: STYLES.barColor,
            fill: false,
            tension: 0.2,
          },
          {
            label: 'Volunteers Growth',
            data: growthData.map((d) => d.volunteersGrowth),
            borderColor: STYLES.lineColor,
            backgroundColor: STYLES.lineColor,
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: STYLES.lineColor,
            fill: false,
            tension: 0.2,
          },
        ],
      },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 1.3,
        plugins: {
          legend: { labels: { color: STYLES.textColor } },
          title: {
            display: true,
            text: 'Year-over-Year Growth (%)',
            color: STYLES.textColor,
          },
        },
        scales: {
          x: {
            title: { display: true, text: 'Year', color: STYLES.textColor },
            ticks: { color: STYLES.subtleTextColor },
            grid: { color: STYLES.gridColor },
          },
          y: {
            title: { display: true, text: 'Growth (%)', color: STYLES.textColor },
            ticks: {
              color: STYLES.subtleTextColor,
              callback: function (value) {
                return value + '%';
              },
            },
            grid: { color: STYLES.gridColor },
          },
        },
      },
    });
  }

  function init() {
    const resultsTable = document.querySelector('.Results-table');
    const pageUrl = window.location.href;
    const isEventHistoryPage = pageUrl.includes('/eventhistory/');

    if (!resultsTable || !isEventHistoryPage) {
      return;
    }

    renderAnnualSummary();
  }

  init();
})();
