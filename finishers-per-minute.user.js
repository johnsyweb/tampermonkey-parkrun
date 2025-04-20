// ==UserScript==
// @name         parkrun Finishers Per Minute Chart
// @namespace    http://tampermonkey.net/
// @version      2025-04-20
// @description  Displays a bar chart showing the distribution of finishers per minute on parkrun results pages
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
// @downloadURL  https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/finishers-per-minute.user.js
// @updateURL    https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/finishers-per-minute.user.js
// ==/UserScript==

(function () {
    'use strict';

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
     * Prepares data for Chart.js in sorted order
     * @param {Object} timeData Object containing minutes and counts
     * @returns {Object} Object containing sorted labels and data for Chart.js
     */
    function prepareChartData({ timeData, minMinute, maxMinute }) {
        const minutes = [];
        const counts = [];

        // Ensure all minutes between min and max are represented
        for (let min = minMinute; min <= maxMinute; min++) {
            minutes.push(min);
            counts.push(timeData[min] || 0);
        }

        // Format labels with hour notation when needed
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
     * Creates and inserts the chart into the page
     * @param {Object} chartData Object containing labels and data for the chart
     */
    function createChart(chartData) {
        const container = document.createElement('div');
        container.className = 'finishers-chart-container';
        container.style.width = '100%';
        container.style.maxWidth = '800px';
        container.style.margin = '20px auto';
        container.style.padding = '15px';
        container.style.backgroundColor = '#2b223d';
        container.style.borderRadius = '8px';
        container.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';

        const heading = document.createElement('h3');
        heading.textContent = 'Finishers per Minute';
        heading.style.textAlign = 'center';
        heading.style.marginBottom = '15px';
        heading.style.color = '#ffa300';
        container.appendChild(heading);

        const canvas = document.createElement('canvas');
        canvas.id = 'finishersChart';
        container.appendChild(canvas);

        const resultsTable = document.querySelector('.Results-table');
        if (resultsTable && resultsTable.parentNode) {
            resultsTable.parentNode.insertBefore(container, resultsTable);
        } else {
            (document.querySelector('.content') || document.body).appendChild(container);
        }

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
                        backgroundColor: '#FFA300',
                        borderColor: '#FFA300',
                        borderWidth: 1,
                    },
                ],
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        labels: {
                            color: '#e0e0e0',
                        },
                    },
                    title: {
                        display: false,
                        color: '#e0e0e0',
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
                            color: '#e0e0e0',
                        },
                        ticks: {
                            color: '#cccccc',
                        },
                        grid: {
                            color: 'rgba(200, 200, 200, 0.2)',
                        },
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Finishers',
                            color: '#e0e0e0',
                        },
                        ticks: {
                            precision: 0,
                            color: '#cccccc',
                        },
                        grid: {
                            color: 'rgba(200, 200, 200, 0.2)',
                        },
                    },
                },
            },
        });
    }

    /**
     * Main function to initialize the chart
     */
    function initFinishersChart() {
        if (typeof Chart === 'undefined') {
            console.error('Chart.js not loaded');
            return;
        }

        const resultsTable = document.querySelector('.Results-table');
        if (!resultsTable) {
            console.log('Results table not found');
            return;
        }

        const timeData = extractFinishTimeData();
        const chartData = prepareChartData(timeData);

        if (chartData.labels.length > 0) {
            createChart(chartData);
        } else {
            console.log('No finish time data found');
        }
    }

    window.addEventListener('load', initFinishersChart);
})();
