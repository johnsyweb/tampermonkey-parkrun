// ==UserScript==
// @name         parkrun Charts
// @namespace    http://tampermonkey.net/
// @version      2025-04-21
// @description  Displays charts on parkrun pages: finishers per minute on results pages and event history on event history pages
// @author       @johnsyweb
// @match        *://www.parkrun.com.au/*/results/*
// @match        *://www.parkrun.co.at/*/results/*
// @match        *://www.parkrun.ca/*/results/*
// @match        *://www.parkrun.dk/*/results/*
// @match        *://www.parkrun.fi/*/results/*
// @match        *://www.parkrun.fr/*/results/*
// @match        *://www.parkrun.com.de/*/results/*
// @match        *://www.parkrun.ie/*/results/*
// @match        *://www.parkrun.it/*/results/*
// @match        *://www.parkrun.jp/*/results/*
// @match        *://www.parkrun.lt/*/results/*
// @match        *://www.parkrun.my/*/results/*
// @match        *://www.parkrun.co.nl/*/results/*
// @match        *://www.parkrun.co.nz/*/results/*
// @match        *://www.parkrun.no/*/results/*
// @match        *://www.parkrun.pl/*/results/*
// @match        *://www.parkrun.sg/*/results/*
// @match        *://www.parkrun.co.za/*/results/*
// @match        *://www.parkrun.se/*/results/*
// @match        *://www.parkrun.org.uk/*/results/*
// @match        *://www.parkrun.us/*/results/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=parkrun.com.au
// @grant        none
// @tag          parkrun
// @run-at       document-end
// @require      https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js
// @homepage     https://github.com/johnsyweb/tampermonkey-parkrun
// @supportURL   https://github.com/johnsyweb/tampermonkey-parkrun/issues/
// @downloadURL  https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/parkrun-charts.user.js
// @updateURL    https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/parkrun-charts.user.js
// ==/UserScript==

(function () {
  'use strict';

  const STYLES = {
    backgroundColor: '#2b223d',
    barColor: '#FFA300',
    lineColor: '#53BA9D',
    textColor: '#e0e0e0',
    subtleTextColor: '#cccccc',
    gridColor: 'rgba(200, 200, 200, 0.2)'
  };

  function createChartContainer(title, id, width = 800) {
    const container = document.createElement('div');
    container.className = `parkrun-chart-container ${id}-container`;
    container.style.width = '100%';
    container.style.maxWidth = `${width}px`;
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

  function insertContainer(container) {
    const resultsTable = document.querySelector('.Results-table');
    if (resultsTable && resultsTable.parentNode) {
      resultsTable.parentNode.insertBefore(container, resultsTable);
    } else {
      (document.querySelector('.content') || document.body).appendChild(container);
    }
  }

  function addChartDownloadButton(container, canvas, chartType) {
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
      const link = document.createElement('a');

      const date = new Date();
      const dateStr = date.toISOString().split('T')[0];

      const pathParts = window.location.pathname.split('/');
      const parkrunName = pathParts[1];

      let filename;
      if (chartType === 'event-history') {
        filename = `${parkrunName}-event-history-${dateStr}.png`;
      } else {
        const eventNumber = pathParts[3] || 'latest';
        filename = `${parkrunName}-event-${eventNumber}-finishers-${dateStr}.png`;
      }

      link.download = filename;
      link.href = canvas.toDataURL('image/png');

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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
      if (min >= 60) {
        const hours = Math.floor(min / 60);
        const remainingMins = min % 60;
        return `${hours}:${remainingMins.toString().padStart(2, '0')}`;
      }
      return `${min}'`;
    });

    return {
      labels,
      data: counts,
    };
  }

  function createFinishersChart() {
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

    const { container, canvas } = createChartContainer('Finishers per Minute', 'finishersChart');
    insertContainer(container);

    addChartDownloadButton(container, canvas, 'finishers');

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
      },
    });
  }

  function extractEventHistoryData() {
    const eventNumbers = [];
    const dates = [];
    const finishers = [];
    const volunteers = [];

    const rows = document.querySelectorAll('tr.Results-table-row');

    Array.from(rows).reverse().forEach((row) => {
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
          day: 'numeric'
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
      eventNumbers,
      dates,
      finishers,
      volunteers
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

    const { container, canvas } = createChartContainer(
      'Event History: Finishers & Volunteers',
      'eventHistoryChart',
      1000
    );

    canvas.height = 400;
    canvas.style.height = '400px';
    canvas.style.maxHeight = '400px';

    insertContainer(container);

    addChartDownloadButton(container, canvas, 'event-history');

    const ctx = canvas.getContext('2d');
    // eslint-disable-next-line no-undef
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: historyData.eventNumbers,
        datasets: [
          {
            label: 'Finishers',
            data: historyData.finishers,
            backgroundColor: STYLES.barColor,
            borderColor: STYLES.barColor,
            borderWidth: 1,
            yAxisID: 'y-finishers',
            order: 1
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
            order: 0
          }
        ]
      },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 2.5,
        onResize: null,
        plugins: {
          legend: {
            labels: {
              color: STYLES.textColor,
              usePointStyle: true
            }
          },
          tooltip: {
            mode: 'index',
            callbacks: {
              title: function (tooltipItems) {
                const index = tooltipItems[0].dataIndex;
                const eventNumber = historyData.eventNumbers[index];
                const date = historyData.dates[index];
                return `Event #${eventNumber} (${date})`;
              },
              label: function (tooltipItem) {
                const datasetLabel = tooltipItem.dataset.label || '';
                if (datasetLabel === 'Finishers') {
                  return `Finishers: ${tooltipItem.raw}`;
                } else if (datasetLabel === 'Volunteers') {
                  return `Volunteers: ${tooltipItem.raw}`;
                }
                return tooltipItem.formattedValue;
              }
            }
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Event Number',
              color: STYLES.textColor
            },
            ticks: {
              color: STYLES.subtleTextColor
            },
            grid: {
              color: STYLES.gridColor
            }
          },
          'y-finishers': {
            type: 'linear',
            position: 'left',
            beginAtZero: true,
            title: {
              display: true,
              text: 'Number of Finishers',
              color: STYLES.textColor
            },
            ticks: {
              precision: 0,
              color: STYLES.subtleTextColor
            },
            grid: {
              color: STYLES.gridColor
            }
          },
          'y-volunteers': {
            type: 'linear',
            position: 'right',
            beginAtZero: true,
            title: {
              display: true,
              text: 'Number of Volunteers',
              color: STYLES.lineColor
            },
            ticks: {
              precision: 0,
              color: STYLES.lineColor
            },
            grid: {
              display: false
            }
          }
        }
      }
    });
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
