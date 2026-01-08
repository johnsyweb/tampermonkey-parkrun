// ==UserScript==
// @name         parkrun Annual Summary
// @description  Adds an annual participation summary (totals, averages, min/max) to parkrun event history pages
// @author       Pete Johns (@johnsyweb)
// @downloadURL  https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/parkrun-annual-summary.user.js
// @grant        GM_xmlhttpRequest
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
// @version      0.2.2
// ==/UserScript==

(function () {
  'use strict';

  const STYLES = {
    backgroundColor: '#1c1b2a',
    barColor: '#f59e0b', // amber 500
    lineColor: '#22d3ee', // cyan 400
    textColor: '#f3f4f6',
    subtleTextColor: '#d1d5db',
    gridColor: 'rgba(243, 244, 246, 0.18)',
  };

  const COMPARISON_COLORS = [
    '#f59e0b', // amber
    '#22d3ee', // cyan
    '#f97316', // orange
    '#10b981', // emerald
    '#a855f7', // purple
    '#ef4444', // red
    '#3b82f6', // blue
    '#84cc16', // lime
  ];

  // Global state for comparison
  const state = {
    currentEvent: null,
    comparisonEvents: [],
    allParkruns: null,
  };

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

  async function fetchAllParkruns() {
    const CACHE_KEY = 'parkrun_events_cache';
    const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

    try {
      // Check for cached data
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached);
          const age = Date.now() - timestamp;

          if (age < CACHE_DURATION_MS) {
            console.log(`Using cached parkrun events (${Math.round(age / 1000 / 60)} minutes old)`);
            return data;
          }
        } catch (parseError) {
          console.log('Cache parse error, fetching fresh data', parseError);
        }
      }

      console.log('Fetching parkrun events from https://images.parkrun.com/events.json');
      const response = await fetch('https://images.parkrun.com/events.json');
      console.log('Fetch response status:', response.status, response.statusText);

      if (!response.ok) {
        console.error('Fetch failed with status:', response.status);
        return [];
      }

      const data = await response.json();

      // The events.json structure has events under data.events.features
      const features = data.events?.features || data.features || [];
      console.log('Features array length:', features.length);

      if (!features || features.length === 0) {
        console.error('No features found in response data');
        return [];
      }

      // Cache the features with timestamp
      try {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            data: features,
            timestamp: Date.now(),
          })
        );
        console.log('Cached', features.length, 'parkrun events for 24 hours');
      } catch (cacheError) {
        console.warn('Failed to cache parkrun events:', cacheError);
      }

      console.log('Successfully loaded', features.length, 'parkrun events');
      return features;
    } catch (error) {
      console.error('Failed to fetch parkruns:', error);
      console.error('Error details:', error.message, error.stack);
      return [];
    }
  }

  function getCurrentEventInfo() {
    const pathParts = window.location.pathname.split('/');
    const eventName = pathParts[1];
    const domain = window.location.hostname;

    return {
      eventName,
      domain,
      url: window.location.origin,
    };
  }

  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function findNearbyParkruns(currentEvent, allParkruns, maxDistanceKm = 50) {
    const current = allParkruns.find((p) => p.properties.eventname === currentEvent.eventName);

    if (!current) return [];

    const [currentLon, currentLat] = current.geometry.coordinates;
    const currentCountry = current.properties.countrycode;
    const currentSeries = current.properties.seriesid;

    return allParkruns
      .filter((parkrun) => {
        if (parkrun.properties.eventname === currentEvent.eventName) return false;
        if (parkrun.properties.countrycode !== currentCountry) return false;
        if (parkrun.properties.seriesid !== currentSeries) return false;

        const [lon, lat] = parkrun.geometry.coordinates;
        const latDiff = Math.abs(lat - currentLat);
        const lonDiff = Math.abs(lon - currentLon);

        // Quick bounding box filter (~0.5 degrees ≈ 55km)
        if (latDiff > 0.5 || lonDiff > 0.5) return false;

        const distance = calculateDistance(currentLat, currentLon, lat, lon);
        return distance <= maxDistanceKm;
      })
      .map((parkrun) => {
        const [lon, lat] = parkrun.geometry.coordinates;
        const distance = calculateDistance(currentLat, currentLon, lat, lon);
        return {
          ...parkrun,
          distance,
        };
      })
      .sort((a, b) => a.distance - b.distance);
  }

  async function fetchEventHistory(eventName, domain) {
    try {
      const url = `${domain}/${eventName}/results/eventhistory/`;
      const response = await fetch(url);
      const html = await response.text();

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const title = doc.querySelector('h1')?.textContent.trim() ?? `${eventName} Event History`;
      const eventNumbers = [];
      const dates = [];
      const finishers = [];
      const volunteers = [];

      const rows = doc.querySelectorAll('tr.Results-table-row');

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
        eventName,
        title,
        eventNumbers,
        dates,
        finishers,
        volunteers,
      };
    } catch (error) {
      console.error(`Failed to fetch event history for ${eventName}:`, error);
      return null;
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

  function createComparisonSelector(nearbyParkruns) {
    const selectorContainer = document.createElement('div');
    selectorContainer.style.marginBottom = '15px';
    selectorContainer.style.padding = '10px';
    selectorContainer.style.backgroundColor = STYLES.backgroundColor;
    selectorContainer.style.borderRadius = '6px';
    selectorContainer.style.display = 'flex';
    selectorContainer.style.alignItems = 'center';
    selectorContainer.style.gap = '10px';
    selectorContainer.style.flexWrap = 'wrap';

    const label = document.createElement('span');
    label.textContent = 'Compare with:';
    label.style.color = STYLES.textColor;
    label.style.fontWeight = 'bold';
    selectorContainer.appendChild(label);

    const select = document.createElement('select');
    select.style.padding = '6px 12px';
    select.style.backgroundColor = '#3a3250';
    select.style.color = STYLES.textColor;
    select.style.border = `1px solid ${STYLES.gridColor}`;
    select.style.borderRadius = '4px';
    select.style.cursor = 'pointer';

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '-- Select parkrun --';
    select.appendChild(defaultOption);

    nearbyParkruns.forEach((parkrun) => {
      const option = document.createElement('option');
      option.value = parkrun.properties.eventname;
      option.textContent = `${parkrun.properties.EventShortName} (${parkrun.distance.toFixed(1)}km)`;
      select.appendChild(option);
    });

    const addButton = document.createElement('button');
    addButton.textContent = '+ Add';
    addButton.style.padding = '6px 12px';
    addButton.style.backgroundColor = STYLES.lineColor;
    addButton.style.color = '#2b223d';
    addButton.style.border = 'none';
    addButton.style.borderRadius = '4px';
    addButton.style.cursor = 'pointer';
    addButton.style.fontWeight = 'bold';

    addButton.addEventListener('click', async () => {
      const selectedEventName = select.value;
      if (!selectedEventName) return;

      // Check if already added
      if (state.comparisonEvents.some((event) => event.eventName === selectedEventName)) {
        alert('This parkrun is already selected for comparison');
        return;
      }

      addButton.disabled = true;
      addButton.textContent = 'Loading...';

      const eventInfo = getCurrentEventInfo();
      const historyData = await fetchEventHistory(selectedEventName, eventInfo.url);

      if (historyData) {
        const parkrunInfo = nearbyParkruns.find(
          (p) => p.properties.eventname === selectedEventName
        );
        state.comparisonEvents.push({
          ...historyData,
          distance: parkrunInfo?.distance,
        });
        renderAllSummaries();
      } else {
        alert('Failed to fetch event history');
      }

      addButton.disabled = false;
      addButton.textContent = '+ Add';
      select.value = '';
    });

    selectorContainer.appendChild(select);
    selectorContainer.appendChild(addButton);

    return selectorContainer;
  }

  function createSelectedEventsDisplay() {
    const container = document.createElement('div');
    container.id = 'selectedEventsDisplay';
    container.style.display = 'flex';
    container.style.gap = '8px';
    container.style.flexWrap = 'wrap';
    container.style.marginTop = '10px';

    const updateDisplay = () => {
      container.innerHTML = '';

      [state.currentEvent, ...state.comparisonEvents].forEach((event, index) => {
        const chip = document.createElement('div');
        chip.style.display = 'inline-flex';
        chip.style.alignItems = 'center';
        chip.style.gap = '6px';
        chip.style.padding = '4px 10px';
        chip.style.backgroundColor = COMPARISON_COLORS[index % COMPARISON_COLORS.length];
        chip.style.color = '#2b223d';
        chip.style.borderRadius = '12px';
        chip.style.fontSize = '12px';
        chip.style.fontWeight = 'bold';

        const label = document.createElement('span');
        label.textContent = event.title || event.eventName;
        chip.appendChild(label);

        if (index > 0) {
          const removeBtn = document.createElement('span');
          removeBtn.textContent = '×';
          removeBtn.style.cursor = 'pointer';
          removeBtn.style.marginLeft = '4px';
          removeBtn.style.fontSize = '16px';
          removeBtn.addEventListener('click', () => {
            state.comparisonEvents.splice(index - 1, 1);
            renderAllSummaries();
          });
          chip.appendChild(removeBtn);
        }

        container.appendChild(chip);
      });
    };

    updateDisplay();
    return { container, updateDisplay };
  }

  function createTabsForEvents(events) {
    const tabsContainer = document.createElement('div');
    tabsContainer.id = 'eventTabs';
    tabsContainer.style.marginTop = '15px';

    const tabButtons = document.createElement('div');
    tabButtons.style.display = 'flex';
    tabButtons.style.gap = '5px';
    tabButtons.style.borderBottom = `2px solid ${STYLES.gridColor}`;
    tabButtons.style.marginBottom = '15px';

    const tabContents = document.createElement('div');
    tabContents.id = 'tabContents';

    events.forEach((event, index) => {
      const button = document.createElement('button');
      button.textContent = event.title || event.eventName;
      button.style.padding = '10px 20px';
      button.style.backgroundColor =
        index === 0 ? COMPARISON_COLORS[index % COMPARISON_COLORS.length] : '#3a3250';
      button.style.color = index === 0 ? '#2b223d' : STYLES.textColor;
      button.style.border = 'none';
      button.style.borderRadius = '6px 6px 0 0';
      button.style.cursor = 'pointer';
      button.style.fontWeight = 'bold';
      button.dataset.index = index;

      button.addEventListener('click', () => {
        // Update button styles
        tabButtons.querySelectorAll('button').forEach((btn, btnIndex) => {
          btn.style.backgroundColor =
            btnIndex === index ? COMPARISON_COLORS[btnIndex % COMPARISON_COLORS.length] : '#3a3250';
          btn.style.color = btnIndex === index ? '#2b223d' : STYLES.textColor;
        });

        // Show corresponding tab content
        tabContents.querySelectorAll('.tab-content').forEach((content, contentIndex) => {
          content.style.display = contentIndex === index ? 'block' : 'none';
        });
      });

      tabButtons.appendChild(button);
    });

    tabsContainer.appendChild(tabButtons);
    tabsContainer.appendChild(tabContents);

    return { tabsContainer, tabContents };
  }

  function renderEventTab(historyData, eventIndex) {
    const yearly = aggregateByYear(historyData);
    if (yearly.length === 0) {
      return null;
    }

    const tabContent = document.createElement('div');
    tabContent.className = 'tab-content';
    tabContent.style.display = eventIndex === 0 ? 'block' : 'none';
    tabContent.style.backgroundColor = STYLES.backgroundColor;
    tabContent.style.padding = '15px';
    tabContent.style.borderRadius = '6px';

    const tableWrap = document.createElement('div');
    tableWrap.style.overflowX = 'auto';

    const table = document.createElement('table');
    table.className = 'annualSummaryTable';
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.fontSize = '14px';
    table.style.color = STYLES.textColor;
    table.style.backgroundColor = STYLES.backgroundColor;

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
    tabContent.appendChild(tableWrap);

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

    // Add charts
    const chartsRow = document.createElement('div');
    chartsRow.style.display = 'grid';
    chartsRow.style.gridTemplateColumns = '1fr 1fr';
    chartsRow.style.gap = '20px';
    chartsRow.style.marginTop = '20px';

    const totalsChartContainer = document.createElement('div');
    totalsChartContainer.style.minWidth = '0';
    const totalsCanvas = document.createElement('canvas');
    totalsCanvas.className = `annualTotalsChart-${eventIndex}`;
    totalsChartContainer.appendChild(totalsCanvas);

    const growthChartContainer = document.createElement('div');
    growthChartContainer.style.minWidth = '0';
    const growthCanvas = document.createElement('canvas');
    growthCanvas.className = `annualGrowthChart-${eventIndex}`;
    growthChartContainer.appendChild(growthCanvas);

    chartsRow.appendChild(totalsChartContainer);
    chartsRow.appendChild(growthChartContainer);
    tabContent.appendChild(chartsRow);

    // Render charts
    if (typeof Chart !== 'undefined') {
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
            legend: { labels: { color: STYLES.textColor } },
            title: { display: true, text: 'Annual Totals', color: STYLES.textColor },
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
            title: { display: true, text: 'Year-over-Year Growth (%)', color: STYLES.textColor },
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

    return tabContent;
  }

  function renderComparisonCharts(events) {
    if (events.length < 2) return null;

    const comparisonSection = document.createElement('div');
    comparisonSection.id = 'comparisonSection';
    comparisonSection.style.marginTop = '30px';
    comparisonSection.style.padding = '15px';
    comparisonSection.style.backgroundColor = STYLES.backgroundColor;
    comparisonSection.style.borderRadius = '8px';

    const heading = document.createElement('h3');
    heading.textContent = 'Comparison Charts';
    heading.style.textAlign = 'center';
    heading.style.color = STYLES.barColor;
    heading.style.marginBottom = '20px';
    comparisonSection.appendChild(heading);

    // Prepare data for all events
    const allYearlyData = events.map((event) => ({
      event,
      yearly: aggregateByYear(event),
    }));

    // Get all unique years across all events
    const allYears = new Set();
    allYearlyData.forEach(({ yearly }) => {
      yearly.forEach((y) => allYears.add(y.year));
    });
    const sortedYears = Array.from(allYears).sort((a, b) => a - b);

    // Create 4 comparison charts
    const chartsGrid = document.createElement('div');
    chartsGrid.style.display = 'grid';
    chartsGrid.style.gridTemplateColumns = '1fr 1fr';
    chartsGrid.style.gap = '20px';

    // Chart 1: Annual Totals - Finishers
    const finishersTotalsCanvas = document.createElement('canvas');
    chartsGrid.appendChild(createChartContainer(finishersTotalsCanvas));

    // Chart 2: Annual Totals - Volunteers
    const volunteersTotalsCanvas = document.createElement('canvas');
    chartsGrid.appendChild(createChartContainer(volunteersTotalsCanvas));

    // Chart 3: YoY Growth - Finishers
    const finishersGrowthCanvas = document.createElement('canvas');
    chartsGrid.appendChild(createChartContainer(finishersGrowthCanvas));

    // Chart 4: YoY Growth - Volunteers
    const volunteersGrowthCanvas = document.createElement('canvas');
    chartsGrid.appendChild(createChartContainer(volunteersGrowthCanvas));

    comparisonSection.appendChild(chartsGrid);

    // Download entire report button
    const downloadContainer = document.createElement('div');
    downloadContainer.style.display = 'flex';
    downloadContainer.style.justifyContent = 'center';
    downloadContainer.style.marginTop = '20px';

    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = '💾 Download Full Report';
    downloadBtn.style.padding = '8px 16px';
    downloadBtn.style.backgroundColor = STYLES.lineColor;
    downloadBtn.style.color = '#2b223d';
    downloadBtn.style.border = 'none';
    downloadBtn.style.borderRadius = '4px';
    downloadBtn.style.cursor = 'pointer';
    downloadBtn.style.fontWeight = 'bold';
    downloadBtn.style.fontSize = '14px';

    downloadBtn.addEventListener('click', () => {
      const mainContainer = document.querySelector('.parkrun-annual-summary');
      if (!mainContainer) return;

      // Hide comparison controls during download
      const controls = mainContainer.querySelector('.parkrun-comparison-selector-controls');
      const originalDisplay = controls?.style.display;
      if (controls) controls.style.display = 'none';

      downloadBtn.style.display = 'none';
      // eslint-disable-next-line no-undef
      html2canvas(mainContainer, {
        backgroundColor: STYLES.backgroundColor,
        scale: 2,
      }).then((canvas) => {
        downloadBtn.style.display = 'block';
        if (controls) controls.style.display = originalDisplay || '';

        const link = document.createElement('a');
        const timestamp = new Date().toISOString().split('T')[0];
        link.download = `parkrun-comparison-report-${timestamp}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      });
    });

    downloadContainer.appendChild(downloadBtn);
    comparisonSection.appendChild(downloadContainer);

    // Render charts if Chart.js is available
    if (typeof Chart !== 'undefined') {
      renderComparisonChart(
        finishersTotalsCanvas,
        'Annual Totals - Finishers',
        sortedYears,
        allYearlyData,
        (y) => y.totalFinishers,
        'Finishers'
      );

      renderComparisonChart(
        volunteersTotalsCanvas,
        'Annual Totals - Volunteers',
        sortedYears,
        allYearlyData,
        (y) => y.totalVolunteers,
        'Volunteers'
      );

      renderComparisonChart(
        finishersGrowthCanvas,
        'YoY Growth - Finishers (%)',
        sortedYears,
        allYearlyData,
        (y) => y.finishersGrowth,
        'Growth (%)',
        true
      );

      renderComparisonChart(
        volunteersGrowthCanvas,
        'YoY Growth - Volunteers (%)',
        sortedYears,
        allYearlyData,
        (y) => y.volunteersGrowth,
        'Growth (%)',
        true
      );
    }

    return comparisonSection;
  }

  function createChartContainer(canvas) {
    const container = document.createElement('div');
    container.style.minWidth = '0';
    container.appendChild(canvas);
    return container;
  }

  function renderComparisonChart(
    canvas,
    title,
    years,
    allYearlyData,
    valueGetter,
    yAxisLabel,
    isGrowth = false
  ) {
    const datasets = allYearlyData.map(({ event, yearly }, index) => {
      const color = COMPARISON_COLORS[index % COMPARISON_COLORS.length];
      const data = years.map((year) => {
        const yearData = yearly.find((y) => y.year === year);
        if (!yearData) return null;
        const value = valueGetter(yearData);
        return value !== null && value !== undefined ? value : null;
      });

      return {
        label: event.title || event.eventName,
        data,
        borderColor: color,
        backgroundColor: color,
        borderWidth: 2,
        pointRadius: 4,
        pointBackgroundColor: color,
        fill: false,
        tension: 0.2,
        spanGaps: true,
      };
    });

    const ctx = canvas.getContext('2d');

    // eslint-disable-next-line no-undef
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: years.map((y) => y.toString()),
        datasets,
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
            text: title,
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
            beginAtZero: !isGrowth,
            title: { display: true, text: yAxisLabel, color: STYLES.textColor },
            ticks: {
              precision: 0,
              color: STYLES.subtleTextColor,
              callback: isGrowth ? (value) => value + '%' : undefined,
            },
            grid: { color: STYLES.gridColor },
          },
        },
      },
    });
  }

  function renderAllSummaries() {
    // Remove existing summary
    const existing = document.querySelector('.parkrun-annual-summary');
    if (existing) {
      existing.remove();
    }

    const historyData = extractEventHistoryData();
    if (historyData.eventNumbers.length === 0) {
      console.log('No event history data found');
      return;
    }

    // Store current event
    state.currentEvent = {
      ...historyData,
      eventName: getCurrentEventInfo().eventName,
    };

    const allEvents = [state.currentEvent, ...state.comparisonEvents];

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
    heading.textContent = 'Annual Participation Summary';
    heading.style.textAlign = 'center';
    heading.style.marginBottom = '15px';
    heading.style.color = STYLES.barColor;
    container.appendChild(heading);

    // Add comparison selector if we have nearby parkruns
    if (state.allParkruns === null) {
      // Still loading (shouldn't happen as init() awaits the fetch)
      const message = document.createElement('div');
      message.style.padding = '10px';
      message.style.color = STYLES.subtleTextColor;
      message.style.textAlign = 'center';
      message.style.fontSize = '13px';
      message.textContent = 'Loading parkrun events for comparison...';
      container.appendChild(message);
    } else if (state.allParkruns.length === 0) {
      // Fetch failed or returned no data
      const message = document.createElement('div');
      message.style.padding = '10px';
      message.style.color = '#ff6b6b';
      message.style.textAlign = 'center';
      message.style.fontSize = '13px';
      message.textContent = 'Failed to load parkrun events data. Check console for details.';
      container.appendChild(message);
      console.error(
        'No parkrun events loaded. Expected data from https://images.parkrun.com/events.json'
      );
    } else {
      const nearbyParkruns = findNearbyParkruns(getCurrentEventInfo(), state.allParkruns);

      if (nearbyParkruns.length > 0) {
        const selector = createComparisonSelector(nearbyParkruns);
        selector.className = 'parkrun-comparison-selector-controls';
        container.appendChild(selector);
      } else {
        // Show message if no nearby parkruns found
        const message = document.createElement('div');
        message.style.padding = '10px';
        message.style.color = STYLES.subtleTextColor;
        message.style.textAlign = 'center';
        message.style.fontSize = '13px';
        const eventInfo = getCurrentEventInfo();
        message.textContent = `No nearby parkruns found for comparison (within 50km of ${eventInfo.eventName})`;
        container.appendChild(message);
        console.log(
          'Current event:',
          eventInfo.eventName,
          'Total parkruns loaded:',
          state.allParkruns.length
        );
      }
    }

    // Add selected events display
    if (state.comparisonEvents.length > 0) {
      const { container: eventsDisplay } = createSelectedEventsDisplay();
      container.appendChild(eventsDisplay);
    }

    // Create tabs
    const { tabsContainer, tabContents } = createTabsForEvents(allEvents);
    container.appendChild(tabsContainer);

    // Render each event's tab
    allEvents.forEach((event, index) => {
      const tabContent = renderEventTab(event, index);
      if (tabContent) {
        tabContents.appendChild(tabContent);
      }
    });

    // Add comparison charts if multiple events
    if (allEvents.length > 1) {
      const comparisonCharts = renderComparisonCharts(allEvents);
      if (comparisonCharts) {
        container.appendChild(comparisonCharts);
      }
    }

    // Insert into page
    const eventHistoryChart = document.getElementById('eventHistoryChart');
    if (eventHistoryChart && eventHistoryChart.parentElement) {
      eventHistoryChart.parentElement.parentNode.insertBefore(
        container,
        eventHistoryChart.parentElement.nextSibling
      );
    } else {
      insertAfterFirst('h1', container);
    }
  }

  function renderAnnualSummary() {
    if (document.getElementById('annualSummaryTable') || document.getElementById('eventTabs')) {
      console.log('Annual summary already exists, skipping render');
      return;
    }

    renderAllSummaries();
  }

  async function init() {
    const resultsTable = document.querySelector('.Results-table');
    const pageUrl = window.location.href;
    const isEventHistoryPage = pageUrl.includes('/eventhistory/');

    if (!resultsTable || !isEventHistoryPage) {
      return;
    }

    // Fetch all parkruns for comparison
    state.allParkruns = await fetchAllParkruns();

    renderAnnualSummary();
  }

  init();
})();
