// ==UserScript==
// @name         parkrun Charts
// @description  Displays charts on parkrun pages: finishers per minute on results pages and event history on event history pages
// @author       Pete Johns (@johnsyweb)
// @downloadURL  https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/parkrun-charts.user.js
// @grant        none
// @homepage     https://github.com/johnsyweb/tampermonkey-parkrun
// @icon         https://www.google.com/s2/favicons?sz=64&domain=parkrun.com.au
// @license      MIT
// @match        *://www.parkrun.ca/*/results/*
// @match        *://www.parkrun.co.at/*/results/*
// @match        *://www.parkrun.co.nl/*/results/*
// @match        *://www.parkrun.co.nz/*/results/*
// @match        *://www.parkrun.co.za/*/results/*
// @match        *://www.parkrun.com.au/*/results/*
// @match        *://www.parkrun.com.de/*/results/*
// @match        *://www.parkrun.dk/*/results/*
// @match        *://www.parkrun.fi/*/results/*
// @match        *://www.parkrun.fr/*/results/*
// @match        *://www.parkrun.ie/*/results/*
// @match        *://www.parkrun.it/*/results/*
// @match        *://www.parkrun.jp/*/results/*
// @match        *://www.parkrun.lt/*/results/*
// @match        *://www.parkrun.my/*/results/*
// @match        *://www.parkrun.no/*/results/*
// @match        *://www.parkrun.org.uk/*/results/*
// @match        *://www.parkrun.pl/*/results/*
// @match        *://www.parkrun.se/*/results/*
// @match        *://www.parkrun.sg/*/results/*
// @match        *://www.parkrun.us/*/results/*
// @namespace    http://tampermonkey.net/
// @require      https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js
// @require      https://html2canvas.hertzen.com/dist/html2canvas.min.js
// @run-at       document-end
// @supportURL   https://github.com/johnsyweb/tampermonkey-parkrun/issues/
// @tag          parkrun
// @updateURL    https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/parkrun-charts.user.js
// @version      2025-09-08 02:48 01:47 18:37 18:36 18:35 18:33 18:29 01:53 02:17 01:28 02:13 19:55 10:42
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

  const DEBUG_WATERMARK = false;

  function createChartContainer(title, id, width = 800) {
    const container = document.createElement('div');
    container.className = 'parkrun-chart-container ' + id + '-container';
    container.style.width = '100%';
    container.style.maxWidth = width + 'px';
    container.style.margin = '20px auto';
    container.style.padding = '15px';
    container.style.backgroundColor = STYLES.backgroundColor;
    container.style.borderRadius = '8px';
    container.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';

    const heading = document.createElement('h3');
    heading.textContent = title;
    heading.style.textAlign = 'center';
    heading.style.marginBottom = '15px';
    heading.style.color = STYLES.barColor;
    container.appendChild(heading);

    const canvas = document.createElement('canvas');
    canvas.id = id;
    container.appendChild(canvas);

    return { container, canvas };
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
    downloadBtn.title = 'Download chart as PNG image';

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
        const chartType = container.classList.contains('eventHistoryChart-container')
          ? 'event-history'
          : 'finishers';
        link.download = `${eventName}-${chartType}-${timestamp}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      });
    });

    controlsContainer.appendChild(downloadBtn);
    container.appendChild(controlsContainer);

    return controlsContainer;
  }

  function extractFinishTimeData() {
    const timeData = {};
    const rows = document.querySelectorAll('tr.Results-table-row');
    let minMinute = Infinity;
    let maxMinute = 0;

    rows.forEach((row) => {
      const timeCell = row.querySelector('td.Results-table-td--time');
      if (!timeCell) return;

      const timeText = timeCell.textContent.trim();
      let totalMinutes;

      const hourMatch = timeText.match(/(\d+):(\d+):(\d+)/);
      if (hourMatch) {
        const hours = parseInt(hourMatch[1]);
        const minutes = parseInt(hourMatch[2]);
        totalMinutes = hours * 60 + minutes;
      } else {
        const minuteMatch = timeText.match(/(\d+):(\d+)/);
        if (!minuteMatch) return;

        totalMinutes = parseInt(minuteMatch[1]);
      }

      minMinute = Math.min(minMinute, totalMinutes);
      maxMinute = Math.max(maxMinute, totalMinutes);

      if (!timeData[totalMinutes]) {
        timeData[totalMinutes] = 1;
      } else {
        timeData[totalMinutes]++;
      }
    });

    for (let min = minMinute; min <= maxMinute; min++) {
      if (!timeData[min]) {
        timeData[min] = 0;
      }
    }

    return {
      timeData,
      minMinute,
      maxMinute,
    };
  }

  function prepareFinisherChartData({ timeData, minMinute, maxMinute }) {
    const minutes = [];
    const counts = [];

    for (let min = minMinute; min <= maxMinute; min++) {
      minutes.push(min);
      counts.push(timeData[min] || 0);
    }

    const labels = minutes.map((min) => {
      const hours = Math.floor(min / 60);
      const remainingMins = min % 60;
      return `${hours}:${remainingMins.toString().padStart(2, '0')}`;
    });

    return {
      labels,
      data: counts,
    };
  }

  function addWatermark(canvas) {
    const ctx = canvas.getContext('2d');
    const scriptName = GM_info?.script?.name || 'parkrun-charts';
    const scriptVersion = GM_info?.script?.version || 'unknown';
    const scriptUrl = GM_info?.script?.homepage;
    const watermarkText = [`Generated by ${scriptName} v${scriptVersion}`, scriptUrl];

    ctx.save();

    ctx.font = DEBUG_WATERMARK ? 'bold 16px Arial' : '10px Arial';
    ctx.fillStyle = DEBUG_WATERMARK ? 'rgba(255, 0, 0, 0.5)' : 'rgba(200, 200, 200, 0.1)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';

    const padding = 10;
    const lineHeight = DEBUG_WATERMARK ? 20 : 14;
    const x = canvas.width - padding;
    let y = canvas.height - padding;

    for (let i = watermarkText.length - 1; i >= 0; i--) {
      const text = watermarkText[i];
      if (text) {
        ctx.fillText(text, x, y);
        y -= lineHeight;
      }
    }

    ctx.restore();
  }

  function createFinishersChart() {
    const eventName = document.querySelector('h1')?.textContent?.trim();
    const eventDate = document.querySelector('h3')?.textContent?.trim();
    const titlePrefix = [eventName, eventDate].filter(Boolean).join(' | ');
    const title = [titlePrefix, 'Finishers per Minute'].filter(Boolean).join(': ');
    const timeData = extractFinishTimeData();
    const chartData = prepareFinisherChartData(timeData);

    if (chartData.labels.length === 0) {
      console.log('No finish time data found');
      return;
    }

    if (document.getElementById('finishersChart')) {
      console.log('Finishers chart already exists, skipping render');
      return;
    }

    const { container, canvas } = createChartContainer(title, 'finishersChart');
    insertAfterFirst('h3', container);

    addChartDownloadButton(container);

    const ctx = canvas.getContext('2d');
    // eslint-disable-next-line no-undef
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: chartData.labels,
        datasets: [
          {
            label: 'Number of Finishers',
            data: chartData.data,
            backgroundColor: STYLES.barColor,
            borderColor: STYLES.barColor,
            borderWidth: 1,
          },
        ],
      },
      options: {
        animation: false,
        responsive: true,
        plugins: {
          legend: {
            labels: {
              color: STYLES.textColor,
            },
          },
          title: {
            display: false,
            color: STYLES.textColor,
          },
          tooltip: {
            callbacks: {
              title: (tooltipItems) => {
                const item = tooltipItems[0];
                const label = item.label;

                if (label.includes(':')) {
                  const [hours, mins] = label.split(':');
                  return `${hours} hour${hours === '1' ? '' : 's'} ${mins} minute${mins === '01' ? '' : 's'}`;
                } else {
                  const minute = label.replace("'", '');
                  return `${minute} minute${minute === '1' ? '' : 's'}`;
                }
              },
              label: (context) => {
                return `${context.raw} finisher${context.raw === 1 ? '' : 's'}`;
              },
            },
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Finish Time',
              color: STYLES.textColor,
            },
            ticks: {
              color: STYLES.subtleTextColor,
            },
            grid: {
              color: STYLES.gridColor,
            },
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Number of Finishers',
              color: STYLES.textColor,
            },
            ticks: {
              precision: 0,
              color: STYLES.subtleTextColor,
            },
            grid: {
              color: STYLES.gridColor,
            },
          },
        },
        onHover: () => {
          setTimeout(() => addWatermark(canvas), 0);
        },
        onResize: () => {
          setTimeout(() => addWatermark(canvas), 0);
        },
        customPlugin: {
          id: 'watermarkPlugin',
          afterDraw: () => {
            setTimeout(() => addWatermark(canvas), 0);
          },
        },
      },
    });

    setTimeout(() => addWatermark(canvas), 0);
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

  function calculateRollingAverage(data, windowSize) {
    const result = [];

    for (let i = 0; i < data.length; i++) {
      if (i < windowSize - 1) {
        result.push(null);
      } else {
        let sum = 0;
        for (let j = 0; j < windowSize; j++) {
          sum += data[i - j];
        }
        result.push(parseFloat((sum / windowSize).toFixed(1)));
      }
    }

    return result;
  }

  function findMinMaxPoints(data, eventNumbers, dates) {
    let minValue = Infinity;
    let maxValue = -Infinity;
    let minIndex = -1;
    let maxIndex = -1;

    for (let i = 0; i < data.length; i++) {
      if (data[i] < minValue) {
        minValue = data[i];
        minIndex = i;
      }
      if (data[i] === minValue) {
        minIndex = i;
      }

      if (data[i] > maxValue) {
        maxValue = data[i];
        maxIndex = i;
      }
      if (data[i] === maxValue) {
        maxIndex = i;
      }
    }

    return {
      min: {
        value: minValue,
        eventNumber: eventNumbers[minIndex],
        date: dates[minIndex],
        index: minIndex,
      },
      max: {
        value: maxValue,
        eventNumber: eventNumbers[maxIndex],
        date: dates[maxIndex],
        index: maxIndex,
      },
    };
  }

  function createEventHistoryChart() {
    if (document.getElementById('eventHistoryChart')) {
      console.log('Event history chart already exists, skipping render');
      return;
    }

    const historyData = extractEventHistoryData();

    if (historyData.eventNumbers.length === 0) {
      console.log('No event history data found');
      return;
    }

    const rollingAvgWindowSize = 12;
    const finishersRollingAvg = calculateRollingAverage(
      historyData.finishers,
      rollingAvgWindowSize
    );
    const volunteersRollingAvg = calculateRollingAverage(
      historyData.volunteers,
      rollingAvgWindowSize
    );

    const finishersMinMax = findMinMaxPoints(
      historyData.finishers,
      historyData.eventNumbers,
      historyData.dates
    );

    const volunteersMinMax = findMinMaxPoints(
      historyData.volunteers,
      historyData.eventNumbers,
      historyData.dates
    );

    const { container, canvas } = createChartContainer(
      `${historyData.title}: Finishers & Volunteers`,
      'eventHistoryChart',
      1000
    );

    canvas.height = 400;
    canvas.style.height = '400px';
    canvas.style.maxHeight = '400px';

    insertAfterFirst('h1', container);

    const ctx = canvas.getContext('2d');

    const statsFooter = document.createElement('div');
    statsFooter.className = 'chart-stats-footer';
    statsFooter.style.marginTop = '10px';
    statsFooter.style.padding = '10px';
    statsFooter.style.backgroundColor = STYLES.backgroundColor;
    statsFooter.style.color = STYLES.textColor;
    statsFooter.style.borderRadius = '4px';
    statsFooter.style.fontSize = '14px';
    statsFooter.style.textAlign = 'center';

    statsFooter.innerHTML = `
      <span style="color: ${STYLES.barColor}">Finishers:</span> Min: ${finishersMinMax.min.value} (${finishersMinMax.min.date}, Event #${finishersMinMax.min.eventNumber}) |
      Max: ${finishersMinMax.max.value} (${finishersMinMax.max.date}, Event #${finishersMinMax.max.eventNumber})<br>
      <span style="color: ${STYLES.lineColor}">Volunteers:</span> Min: ${volunteersMinMax.min.value} (${volunteersMinMax.min.date}, Event #${volunteersMinMax.min.eventNumber}) |
      Max: ${volunteersMinMax.max.value} (${volunteersMinMax.max.date}, Event #${volunteersMinMax.max.eventNumber})
    `;

    container.appendChild(statsFooter);

    // eslint-disable-next-line no-undef
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: historyData.dates,
        datasets: [
          {
            label: 'Finishers',
            data: historyData.finishers,
            backgroundColor: STYLES.barColor,
            borderColor: STYLES.barColor,
            borderWidth: 1,
            yAxisID: 'y-finishers',
            order: 1,
          },
          {
            label: `${rollingAvgWindowSize}-Event Avg (Finishers)`,
            data: finishersRollingAvg,
            type: 'line',
            borderColor: STYLES.barColor,
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0,
            fill: false,
            yAxisID: 'y-finishers',
            order: 0,
          },
          {
            label: 'Volunteers',
            data: historyData.volunteers,
            type: 'line',
            borderColor: STYLES.lineColor,
            backgroundColor: 'rgba(83, 186, 157, 0.2)',
            borderWidth: 1,
            pointBackgroundColor: STYLES.lineColor,
            pointRadius: 2,
            fill: false,
            tension: 0.2,
            yAxisID: 'y-volunteers',
            order: 2,
          },
          {
            label: `${rollingAvgWindowSize}-Event Avg (Volunteers)`,
            data: volunteersRollingAvg,
            type: 'line',
            borderColor: STYLES.lineColor,
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0,
            fill: false,
            yAxisID: 'y-volunteers',
            order: 3,
          },
        ],
      },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 2.5,
        plugins: {
          legend: {
            labels: {
              color: STYLES.textColor,
              usePointStyle: true,
            },
          },
          tooltip: {
            mode: 'index',
            callbacks: {
              title: function (tooltipItems) {
                const index = tooltipItems[0].dataIndex;
                const eventNumber = historyData.eventNumbers[index];
                const date = historyData.dates[index];
                return `${date} (Event #${eventNumber})`;
              },
              label: function (tooltipItem) {
                const datasetLabel = tooltipItem.dataset.label || '';
                if (datasetLabel === 'Finishers') {
                  return `Finishers: ${tooltipItem.raw}`;
                } else if (datasetLabel === 'Volunteers') {
                  return `Volunteers: ${tooltipItem.raw}`;
                } else if (datasetLabel.includes('Avg')) {
                  return `${datasetLabel}: ${tooltipItem.raw}`;
                }
                return tooltipItem.formattedValue;
              },
            },
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Date',
              color: STYLES.textColor,
            },
            ticks: {
              color: STYLES.subtleTextColor,
              maxRotation: 45,
              minRotation: 45,
              callback: function (value, index) {
                const totalEvents = historyData.dates.length;
                let showEvery = 1;

                if (totalEvents > 100) {
                  showEvery = 10;
                } else if (totalEvents > 50) {
                  showEvery = 5;
                } else if (totalEvents > 20) {
                  showEvery = 2;
                }

                if (index === 0 || index === historyData.dates.length - 1) {
                  return historyData.dates[index];
                }

                return index % showEvery === 0 ? historyData.dates[index] : '';
              },
            },
            grid: {
              color: STYLES.gridColor,
            },
          },
          'y-finishers': {
            type: 'linear',
            position: 'left',
            beginAtZero: true,
            title: {
              display: true,
              text: 'Number of Finishers',
              color: STYLES.textColor,
            },
            ticks: {
              precision: 0,
              color: STYLES.subtleTextColor,
            },
            grid: {
              color: STYLES.gridColor,
            },
          },
          'y-volunteers': {
            type: 'linear',
            position: 'right',
            beginAtZero: true,
            title: {
              display: true,
              text: 'Number of Volunteers',
              color: STYLES.lineColor,
            },
            ticks: {
              precision: 0,
              color: STYLES.lineColor,
            },
            grid: {
              display: false,
            },
          },
        },
        onHover: () => {
          setTimeout(() => addWatermark(canvas), 0);
        },
        onResize: () => {
          setTimeout(() => addWatermark(canvas), 0);
        },
        customPlugin: {
          id: 'watermarkPlugin',
          afterDraw: () => {
            setTimeout(() => addWatermark(canvas), 0);
          },
        },
      },
    });

    setTimeout(() => addWatermark(canvas), 0);

    addChartDownloadButton(container);
  }

  function initCharts() {
    if (typeof Chart === 'undefined') {
      console.error('Chart.js not loaded');
      return;
    }

    const resultsTable = document.querySelector('.Results-table');
    if (!resultsTable) {
      console.log('Results table not found');
      return;
    }

    const pageUrl = window.location.href;
    const isEventHistoryPage = pageUrl.includes('/eventhistory/');

    if (isEventHistoryPage) {
      createEventHistoryChart();
    } else {
      createFinishersChart();
    }
  }

  initCharts();
})();
