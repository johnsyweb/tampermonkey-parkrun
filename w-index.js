// ==UserScript==
// @name         parkrun Wilson index display
// @namespace    http://tampermonkey.net/
// @version      2024-04-13
// @description  Calculate the Wilson index for a parkrunner and display it on their results page
// @author       @johnsyweb
// @match        *://www.parkrun.com.au/parkrunner/*/all/
// @match        *://www.parkrun.co.at/parkrunner/*/all/
// @match        *://www.parkrun.ca/parkrunner/*/all/
// @match        *://www.parkrun.dk/parkrunner/*/all/
// @match        *://www.parkrun.fi/parkrunner/*/all/
// @match        *://www.parkrun.fr/parkrunner/*/all/
// @match        *://www.parkrun.com.de/parkrunner/*/all/
// @match        *://www.parkrun.ie/parkrunner/*/all/
// @match        *://www.parkrun.it/parkrunner/*/all/
// @match        *://www.parkrun.jp/parkrunner/*/all/
// @match        *://www.parkrun.lt/parkrunner/*/all/
// @match        *://www.parkrun.my/parkrunner/*/all/
// @match        *://www.parkrun.co.nl/parkrunner/*/all/
// @match        *://www.parkrun.co.nz/parkrunner/*/all/
// @match        *://www.parkrun.no/parkrunner/*/all/
// @match        *://www.parkrun.pl/parkrunner/*/all/
// @match        *://www.parkrun.sg/parkrunner/*/all/
// @match        *://www.parkrun.co.za/parkrunner/*/all/
// @match        *://www.parkrun.se/parkrunner/*/all/
// @match        *://www.parkrun.org.uk/parkrunner/*/all/
// @match        *://www.parkrun.us/parkrunner/*/all/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=parkrun.com.au
// @grant        none
// @tag          parkrun
// @run-at       document-end
// @require      https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js
// @downloadURL  https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/w-index.js
// @updateURL    https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/w-index.js
// @homepage     https://github.com/johnsyweb/tampermonkey-parkrun
// ==/UserScript==

(function () {
    'use strict';

    /**
     * Finds the last results table with a specified number of columns
     * @param {Document} document - The document object to search in
     * @param {number} [columnCount=7] - Required number of columns
     * @returns {HTMLTableElement|null} The matching table or null if not found
     */
    function findResultsTable(document, columnCount = 7) {
        const tables = document.querySelectorAll('[id="results"]');
        let matchingTable = null;
        for (const table of tables) {
            const firstRow = table.querySelector('tr');

            if (firstRow) {
                const columns = firstRow.querySelectorAll('th, td').length;
                if (columns === columnCount) {
                    matchingTable = table;
                    break;
                }
            }
        }

        return matchingTable;
    }

    function extractEventDetails(table) {
        const rows = Array.from(table.querySelectorAll('tbody > tr'));
        return rows.reverse().map((row) => {
            const eventName = row.querySelector('td:nth-child(1)').textContent.trim();
            const eventDate = row.querySelector('td:nth-child(2)').textContent.trim();
            const eventNumber = row.querySelector('td:nth-child(3)').textContent.trim();
            return {
                eventName,
                eventDate,
                eventNumber: parseInt(eventNumber, 10),
            };
        });
    }

    /**
     * Calculates the Wilson index, which represents the highest consecutive number of parkrun events
     * completed starting from 1. It iterates through the sorted event numbers and increments the index
     * as long as the next event number matches the expected value.
     *
     * @param {Array} events - An array of event objects containing event numbers.
     * @returns {number} The calculated Wilson index.
     */
    function calculateWilsonIndex(events) {
        let wilsonIndex = 0;

        const eventNumbers = events.map((e) => e.eventNumber).sort((a, b) => a - b);

        for (const eventNumber of eventNumbers) {
            if (eventNumber >= wilsonIndex + 2) {
                break;
            } else if (eventNumber === wilsonIndex + 1) {
                wilsonIndex++;
            }
        }
        return wilsonIndex;
    }

    function calculateWilsonIndexOverTime(events) {
        const wilsonIndices = [];

        for (let i = 0; i < events.length; i++) {
            const subset = events.slice(0, i + 1);
            const parkruns = i + 1;
            const event = `${events[i].eventName} # ${events[i].eventNumber} on ${events[i].eventDate}`;
            const wilsonIndex = calculateWilsonIndex(subset);
            wilsonIndices.push({ parkruns, event, wilsonIndex });
        }

        return wilsonIndices;
    }

    function createWilsonGraph(indices, container, athleteInfo) {
        const canvas = document.createElement('canvas');
        canvas.style.width = '100%';
        canvas.style.height = '300px';
        container.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        // eslint-disable-next-line no-undef
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: indices.map((i) => i.parkruns),
                datasets: [
                    {
                        label: athleteInfo,
                        data: indices.map((i) => ({
                            x: i.parkruns,
                            y: i.wilsonIndex,
                            event: i.event,
                        })),
                        borderColor: getDatasetColor(0),
                        backgroundColor: '#2b223d',
                    },
                ],
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Wilson Index',
                        },
                        suggestedMax: Math.ceil(
                            Math.max(...indices.map((i) => i.wilsonIndex)) * 1.1
                        ), // Add 10% padding
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'parkruns',
                        },
                        min: 0,
                        suggestedMax: Math.ceil(indices.length * 1.1), // Initial padding
                    },
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Wilson Index Progress',
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const point = context.raw;
                                return [`Wilson Index: ${point.y}`, `Event: ${point.event}`];
                            },
                        },
                    },
                },
            },
        });

        return chart;
    }

    async function fetchFriendResults(athleteId) {
        const response = await fetch(`https://www.parkrun.com.au/parkrunner/${athleteId}/all/`);
        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        return findResultsTable(doc);
    }

    function createComparisonUI(container, onCompare) {
        const form = document.createElement('form');
        form.style.marginBottom = '20px';
        form.style.textAlign = 'center';

        const input = document.createElement('input');
        input.style.width = '200px';
        input.type = 'text';
        input.placeholder = "Enter friend's athlete ID (e.g. A507)";
        input.style.padding = '5px';
        input.style.marginRight = '10px';
        input.style.borderRadius = '3px';
        input.style.border = '1px solid #ffa300';
        input.style.backgroundColor = '#2b223d';
        input.style.color = '#ffa300';

        const button = document.createElement('button');
        button.textContent = 'Compare';
        button.style.padding = '5px 10px';
        button.style.backgroundColor = '#ffa300';
        button.style.color = '#2b223d';
        button.style.border = 'none';
        button.style.borderRadius = '3px';
        button.style.cursor = 'pointer';

        form.appendChild(input);
        form.appendChild(button);

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const athleteId = input.value.trim().replace(/^[aA]/, '');
            if (!athleteId) return;

            button.disabled = true;
            button.textContent = 'Loading...';

            try {
                const friendTable = await fetchFriendResults(athleteId);
                if (friendTable) {
                    const friendEvents = extractEventDetails(friendTable);
                    const friendIndices = calculateWilsonIndexOverTime(friendEvents);
                    onCompare(friendIndices, athleteId);
                }
            } catch (error) {
                console.error("Failed to fetch friend's results:", error);
                alert("Failed to fetch friend's results. Please check the ID and try again.");
            } finally {
                button.disabled = false;
                button.textContent = 'Compare';
            }
        });

        container.insertBefore(form, container.firstChild);
    }

    function updateChart(chart, friendIndices, friendInfo) {
        const datasetIndex = chart.data.datasets.length;
        const friendDataset = {
            label: friendInfo,
            data: friendIndices.map((i) => ({
                x: i.parkruns,
                y: i.wilsonIndex,
                event: i.event,
            })),
            borderColor: getDatasetColor(datasetIndex),
            backgroundColor: '#2b223d',
        };

        chart.data.datasets.push(friendDataset);
        chart.update();

        const maxParkruns = Math.max(
            ...chart.data.datasets.flatMap((dataset) => dataset.data.map((d) => d.x))
        );
        const maxWilsonIndex = Math.max(
            ...chart.data.datasets.flatMap((dataset) => dataset.data.map((d) => d.y))
        );

        chart.options.scales.x.suggestedMax = Math.ceil(maxParkruns * 1.1);
        chart.options.scales.y.suggestedMax = Math.ceil(maxWilsonIndex * 1.1);

        chart.update();
    }

    function extractAthleteInfo(h2Element) {
        return h2Element.textContent.trim();
    }

    function getDatasetColor(index) {
        const colors = [
            '#FFA300',
            '#90EE90',
            '#FF69B4',
            '#4169E1',
            '#FFD700',
            '#9370DB',
            '#20B2AA',
            '#FF6347',
            '#DDA0DD',
            '#00CED1',
        ];
        return colors[index % colors.length];
    }

    function displayWilseonIndex() {
        const table = findResultsTable(document);
        if (!table) {
            console.error('Results table not found');
            return;
        }

        const h2Element = document.querySelector('h2');
        if (!h2Element) {
            console.error('H2 element not found');
            return;
        }

        const athleteInfo = extractAthleteInfo(h2Element);
        if (!athleteInfo) {
            console.error('Could not extract athlete info');
            return;
        }

        const eventDetails = extractEventDetails(table);
        const wilsonIndex = calculateWilsonIndex(eventDetails);
        const wilsonIndices = calculateWilsonIndexOverTime(eventDetails);

        if (h2Element) {
            const container = document.createElement('div');
            container.style.marginTop = '20px';
            container.style.backgroundColor = '#2b223d';
            container.style.padding = '20px';
            container.style.borderRadius = '5px';

            const wilsonElement = document.createElement('div');
            wilsonElement.textContent = `Wilson index: ${wilsonIndex}`;
            wilsonElement.style.fontSize = '1.5em';
            wilsonElement.style.color = '#ffa300';
            wilsonElement.style.fontWeight = 'bold';
            wilsonElement.style.marginBottom = '20px';
            wilsonElement.style.textAlign = 'center';
            container.appendChild(wilsonElement);

            const chartInstance = createWilsonGraph(wilsonIndices, container, athleteInfo);

            createComparisonUI(container, async (friendIndices, friendId) => {
                const friendResponse = await fetch(
                    `${window.location.origin}/parkrunner/${friendId}/all/`
                );
                const friendText = await friendResponse.text();
                const friendDoc = new DOMParser().parseFromString(friendText, 'text/html');
                const friendH2 = friendDoc.querySelector('h2');
                const friendInfo = extractAthleteInfo(friendH2);
                updateChart(chartInstance, friendIndices, friendInfo);
            });

            h2Element.parentNode.insertBefore(container, h2Element.nextSibling);
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            calculateWilsonIndex,
            calculateWilsonIndexOverTime,
            extractEventDetails,
            findResultsTable,
        };
    } else {
        displayWilseonIndex();
    }
})();
