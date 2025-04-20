// ==UserScript==
// @name         parkrun Charts
// @namespace    http://tampermonkey.net/
// @version      2025-04-20
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

  // Common styling values
  const STYLES = {
    backgroundColor: '#2b223d',
    barColor: '#FFA300',
    lineColor: '#53BA9D',
    textColor: '#e0e0e0',
    subtleTextColor: '#cccccc',
    gridColor: 'rgba(200, 200, 200, 0.2)'
  };

  /**
   * Creates the container element for a chart
   * @param {string} title - Chart title
   * @param {string} id - Canvas ID
   * @param {number} width - Max width in pixels
   * @returns {Object} Object containing container and canvas elements
   */
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

  /**
   * Inserts a container before the results table
   * @param {Element} container - The container element to insert
   */
  function insertContainer(container) {
    const resultsTable = document.querySelector('.Results-table');
    if (resultsTable && resultsTable.parentNode) {
      resultsTable.parentNode.insertBefore(container, resultsTable);
    } else {
      (document.querySelector('.content') || document.body).appendChild(container);
    }
  }

  // ----- FINISHERS PER MINUTE CHART FUNCTIONS -----

  /**
   * Extracts finish time data from the results table
   * @returns {Object} Object containing minutes and the count of finishers per minute
   */
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

  /**
   * Prepares data for the finishers per minute chart
   * @param {Object} timeData Object containing minutes and counts
   * @returns {Object} Object containing sorted labels and data for Chart.js
   */
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

  /**
   * Creates the finishers per minute chart
   */
  function createFinishersChart() {
    const timeData = extractFinishTimeData();
    const chartData = prepareFinisherChartData(timeData);

    if (chartData.labels.length === 0) {
      console.log('No finish time data found');
      return;
    }

    // Check if chart already exists to prevent duplicate rendering
    if (document.getElementById('finishersChart')) {
      console.log('Finishers chart already exists, skipping render');
      return;
    }

    const { container, canvas } = createChartContainer('Finishers per Minute', 'finishersChart');
    insertContainer(container);

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
        animation: false, // Disable all animations
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

  // ----- EVENT HISTORY CHART FUNCTIONS -----

  /**
   * Extracts event history data from the results table
   * @returns {Object} Object containing labels and datasets
   */
  function extractEventHistoryData() {
    const eventNumbers = [];
    const dates = [];
    const finishers = [];
    const volunteers = [];

    const rows = document.querySelectorAll('tr.Results-table-row');

    // Process rows in reverse to get chronological order (oldest to newest)
    Array.from(rows).reverse().forEach((row) => {
      // Use data attributes from the row
      const eventNumber = row.getAttribute('data-parkrun');
      if (eventNumber) {
        eventNumbers.push(eventNumber);
      }

      // Date from data attribute
      const date = row.getAttribute('data-date');
      if (date) {
        // Format date from YYYY-MM-DD to a more readable format
        const dateObj = new Date(date);
        const formattedDate = dateObj.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
        dates.push(formattedDate);
      }

      // Finishers from data attribute
      const finishersCount = row.getAttribute('data-finishers');
      if (finishersCount) {
        finishers.push(parseInt(finishersCount, 10));
      }

      // Volunteers from data attribute
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

  /**
   * Creates the event history chart with appropriate sizing
   */
  function createEventHistoryChart() {
    // Check if chart already exists to prevent duplicate rendering
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

    // Set a specific fixed size for the canvas before Chart.js initialization
    canvas.height = 400;
    canvas.style.height = '400px';
    canvas.style.maxHeight = '400px';

    insertContainer(container);

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
            borderWidth: 2,
            pointBackgroundColor: STYLES.lineColor,
            pointRadius: 4,
            fill: false,
            tension: 0.2,
            yAxisID: 'y-volunteers',
            order: 0
          }
        ]
      },
      options: {
        animation: false, // Disable all animations
        responsive: true,
        maintainAspectRatio: true, // Force maintain aspect ratio
        aspectRatio: 2.5, // Set a fixed aspect ratio
        onResize: null, // Disable the default resize behavior
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


  /**
   * Main function to detect page type and initialize appropriate chart
   */
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
