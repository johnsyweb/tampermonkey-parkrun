// ==UserScript==
// @name         parkrun Cancellation Impact
// @description  Analyzes the impact of cancelled parkrun events on nearby alternatives
// @author       Pete Johns (@johnsyweb)
// @downloadURL  https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/parkrun-cancellation-impact.user.js
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
// @updateURL    https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/parkrun-cancellation-impact.user.js
// @require      https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js
// @version      0.1.1
// ==/UserScript==

(function () {
  'use strict';

  const STYLES = {
    backgroundColor: '#1c1b2a',
    barColor: '#f59e0b', // amber 500
    alertColor: '#ef4444', // red 500
    lineColor: '#22d3ee', // cyan 400
    textColor: '#f3f4f6',
    subtleTextColor: '#d1d5db',
    gridColor: 'rgba(243, 244, 246, 0.18)',
    successColor: '#10b981', // emerald 500
  };

  const GAP_THRESHOLD_DAYS = 7;
  const SEASONAL_WEEKS = 12;
  const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

  const state = {
    currentEvent: null,
    allParkruns: null,
    gapInfo: null,
    nearbyParkruns: [],
    fetchController: null,
    analysisComplete: false,
    impactData: null,
    currentCancellationIndex: -1,
    cancellationDates: [],
    sortColumn: 'distance',
    sortDirection: 'asc',
  };

  // Parse a YYYY-MM-DD date string as midnight UTC to avoid timezone drift in calculations
  function parseDateUTC(dateStr) {
    return new Date(`${dateStr}T00:00:00Z`);
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

  async function fetchAllParkruns() {
    const CACHE_KEY = 'parkrun_events_cache';

    try {
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

      if (!response.ok) {
        console.error('Fetch failed with status:', response.status);
        return [];
      }

      const data = await response.json();
      const features = data.events?.features || data.features || [];

      if (!features || features.length === 0) {
        console.error('No features found in response data');
        return [];
      }

      try {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            data: features,
            timestamp: Date.now(),
          })
        );
      } catch (cacheError) {
        console.warn('Failed to cache parkrun events:', cacheError);
      }

      console.log('Successfully loaded', features.length, 'parkrun events');
      return features;
    } catch (error) {
      console.error('Failed to fetch parkruns:', error);
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
    const R = 6371;
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

  function extractEventHistoryData() {
    const title = document.querySelector('h1')?.textContent.trim() ?? 'Event History';
    const eventNumbers = [];
    const dates = [];
    const rawDates = [];
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
          rawDates.push(date);
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
      rawDates,
      finishers,
      volunteers,
    };
  }

  function detectEventGap(historyData) {
    const dates = historyData.rawDates.map((d) => parseDateUTC(d));

    if (dates.length < 2) {
      return null;
    }

    const gaps = [];

    for (let i = 1; i < dates.length; i++) {
      const prevDate = dates[i - 1];
      const currDate = dates[i];
      const daysDiff = (currDate - prevDate) / (1000 * 60 * 60 * 24);

      if (daysDiff > GAP_THRESHOLD_DAYS) {
        gaps.push({
          gapStartDate: prevDate,
          gapEndDate: currDate,
          daysDiff,
          eventsBefore: i,
          eventsAfter: dates.length - i,
        });
      }
    }

    if (gaps.length === 0) {
      return null;
    }

    // Return latest gap
    const latestGap = gaps[gaps.length - 1];
    console.log(
      `Detected ${gaps.length} gap(s); using latest: ${latestGap.daysDiff.toFixed(1)} days`
    );
    console.log('All gaps detected:', gaps);

    return latestGap;
  }

  function detectAllEventGaps(historyData) {
    const dates = historyData.rawDates.map((d) => parseDateUTC(d));

    if (dates.length < 2) {
      return [];
    }

    const gaps = [];

    for (let i = 1; i < dates.length; i++) {
      const prevDate = dates[i - 1];
      const currDate = dates[i];
      const daysDiff = (currDate - prevDate) / (1000 * 60 * 60 * 24);

      if (daysDiff > GAP_THRESHOLD_DAYS) {
        gaps.push({
          gapStartDate: prevDate,
          gapEndDate: currDate,
          daysDiff,
          eventsBefore: i,
          eventsAfter: dates.length - i,
        });
      }
    }

    console.log(`Detected ${gaps.length} total gap(s)`);
    return gaps;
  }

  function getSeasonalWindow(referenceDate, weeksAround = SEASONAL_WEEKS) {
    const start = new Date(referenceDate);
    start.setUTCDate(start.getUTCDate() - weeksAround * 7);

    const end = new Date(referenceDate);
    end.setUTCDate(end.getUTCDate() + weeksAround * 7);

    return { start, end };
  }

  function getCancellationSaturdays(gapStartDate, gapEndDate) {
    const saturdays = [];

    // Normalize start date to UTC midnight to avoid timezone drift
    const startStr = gapStartDate.toISOString().split('T')[0];
    const startDate = parseDateUTC(startStr);
    const startDay = startDate.getUTCDay();

    let daysUntilSaturday = (6 - startDay) % 7;
    if (daysUntilSaturday === 0) {
      daysUntilSaturday = 7; // if already Saturday, move to next Saturday
    }

    const current = new Date(startDate);
    current.setUTCDate(current.getUTCDate() + daysUntilSaturday);

    while (current < gapEndDate) {
      saturdays.push(new Date(current));
      current.setUTCDate(current.getUTCDate() + 7);
    }

    return saturdays;
  }

  function findEventOnDate(historyData, targetDate) {
    const targetStr = targetDate.toISOString().split('T')[0];

    for (let i = 0; i < historyData.rawDates.length; i++) {
      if (historyData.rawDates[i] === targetStr) {
        return {
          date: historyData.dates[i],
          eventNumber: historyData.eventNumbers[i],
          finishers: historyData.finishers[i],
          volunteers: historyData.volunteers[i],
        };
      }
    }

    return null;
  }

  async function fetchEventHistory(eventName, domain) {
    const CACHE_KEY = `parkrun_history_${eventName}`;

    try {
      // Check cache first
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached);
          const age = Date.now() - timestamp;

          if (age < CACHE_DURATION_MS) {
            console.log(
              `Using cached history for ${eventName} (${Math.round(age / 1000 / 60)} minutes old)`
            );
            return data;
          }
        } catch (parseError) {
          console.log(`Cache parse error for ${eventName}, fetching fresh data`, parseError);
        }
      }

      // Fetch from network
      const url = `${domain}/${eventName}/results/eventhistory/`;
      const response = await fetch(url);
      const html = await response.text();

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const title = doc.querySelector('h1')?.textContent.trim() ?? eventName;
      const eventNumbers = [];
      const dates = [];
      const rawDates = [];
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
            rawDates.push(date);
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

      const historyData = {
        eventName,
        title,
        eventNumbers,
        dates,
        rawDates,
        finishers,
        volunteers,
      };

      // Cache the result
      try {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            data: historyData,
            timestamp: Date.now(),
          })
        );
      } catch (cacheError) {
        console.warn(`Failed to cache history for ${eventName}:`, cacheError);
      }

      return historyData;
    } catch (error) {
      console.error(`Failed to fetch event history for ${eventName}:`, error);
      return null;
    }
  }

  function filterEventsByDateRange(historyData, startDate, endDate) {
    const filtered = {
      dates: [],
      finishers: [],
      volunteers: [],
    };

    historyData.rawDates.forEach((dateStr, index) => {
      const date = new Date(dateStr);
      if (date >= startDate && date <= endDate) {
        filtered.dates.push(historyData.dates[index]);
        filtered.finishers.push(historyData.finishers[index]);
        filtered.volunteers.push(historyData.volunteers[index]);
      }
    });

    return filtered;
  }

  function calculateBaseline(data) {
    if (data.dates.length === 0) {
      return {
        avgFinishers: 0,
        avgVolunteers: 0,
        totalEvents: 0,
        minFinishers: 0,
        maxFinishers: 0,
        minVolunteers: 0,
        maxVolunteers: 0,
      };
    }

    const avgFinishers = Math.round(data.finishers.reduce((a, b) => a + b, 0) / data.dates.length);
    const avgVolunteers = Math.round(
      data.volunteers.reduce((a, b) => a + b, 0) / data.dates.length
    );

    return {
      avgFinishers,
      avgVolunteers,
      totalEvents: data.dates.length,
      minFinishers: Math.min(...data.finishers),
      maxFinishers: Math.max(...data.finishers),
      minVolunteers: Math.min(...data.volunteers),
      maxVolunteers: Math.max(...data.volunteers),
    };
  }

  function createProgressUI() {
    const progressSection = document.createElement('div');
    progressSection.className = 'parkrun-cancellation-progress';
    progressSection.style.padding = '15px';
    progressSection.style.backgroundColor = STYLES.backgroundColor;
    progressSection.style.borderRadius = '6px';
    progressSection.style.marginBottom = '15px';
    progressSection.style.border = `1px solid ${STYLES.gridColor}`;

    const heading = document.createElement('h4');
    heading.textContent = 'Analyzing Nearby parkrun Impact';
    heading.style.margin = '0 0 12px 0';
    heading.style.color = STYLES.barColor;
    progressSection.appendChild(heading);

    const progressBar = document.createElement('div');
    progressBar.style.width = '100%';
    progressBar.style.height = '20px';
    progressBar.style.backgroundColor = '#3a3250';
    progressBar.style.borderRadius = '4px';
    progressBar.style.marginBottom = '10px';
    progressBar.style.overflow = 'hidden';

    const progressFill = document.createElement('div');
    progressFill.style.width = '0%';
    progressFill.style.height = '100%';
    progressFill.style.backgroundColor = STYLES.lineColor;
    progressFill.style.transition = 'width 0.3s ease';
    progressBar.appendChild(progressFill);
    progressSection.appendChild(progressBar);

    const progressText = document.createElement('div');
    progressText.style.fontSize = '13px';
    progressText.style.color = STYLES.subtleTextColor;
    progressText.style.marginBottom = '12px';
    progressSection.appendChild(progressText);

    const statusText = document.createElement('div');
    statusText.style.fontSize = '12px';
    statusText.style.color = STYLES.lineColor;
    statusText.style.fontWeight = 'bold';
    statusText.style.marginBottom = '10px';
    progressSection.appendChild(statusText);

    const stopButton = document.createElement('button');
    stopButton.textContent = 'Stop Analysis';
    stopButton.style.padding = '6px 12px';
    stopButton.style.backgroundColor = STYLES.alertColor;
    stopButton.style.color = STYLES.textColor;
    stopButton.style.border = 'none';
    stopButton.style.borderRadius = '4px';
    stopButton.style.cursor = 'pointer';
    stopButton.style.fontWeight = 'bold';
    stopButton.style.fontSize = '12px';
    progressSection.appendChild(stopButton);

    return {
      progressSection,
      updateProgress: (current, total) => {
        const percent = Math.round((current / total) * 100);
        progressFill.style.width = percent + '%';
        progressText.textContent = `${current}/${total} parkruns analyzed`;
      },
      updateStatus: (message) => {
        statusText.textContent = message;
      },
      stop: stopButton,
      hide: () => {
        progressSection.style.display = 'none';
      },
    };
  }

  function renderCancellationSummary(eventShortName) {
    const section = document.createElement('div');
    section.style.padding = '20px';
    section.style.backgroundColor = '#2b223d';
    section.style.borderRadius = '8px';
    section.style.marginBottom = '20px';
    section.style.border = `1px solid ${STYLES.gridColor}`;

    const heading = document.createElement('h3');
    heading.textContent = 'Cancellation Impact Analysis';
    heading.style.color = STYLES.barColor;
    heading.style.margin = '0 0 15px 0';
    heading.style.fontSize = '20px';
    section.appendChild(heading);

    const eventNameDiv = document.createElement('div');
    eventNameDiv.style.fontSize = '16px';
    eventNameDiv.style.color = STYLES.textColor;
    eventNameDiv.style.marginBottom = '15px';
    eventNameDiv.innerHTML = `<strong style="color: ${STYLES.lineColor};">${eventShortName}</strong>`;
    section.appendChild(eventNameDiv);

    const details = document.createElement('div');
    details.style.fontSize = '14px';
    details.style.lineHeight = '1.8';
    details.style.color = STYLES.subtleTextColor;
    details.style.marginBottom = '18px';
    details.innerHTML = `📍 Analyzing impact on nearby parkruns within 50km`;
    section.appendChild(details);

    const startButton = document.createElement('button');
    startButton.textContent = '▶ Start Analysis';
    startButton.className = 'start-analysis-btn';
    startButton.style.padding = '12px 24px';
    startButton.style.backgroundColor = STYLES.lineColor;
    startButton.style.color = '#1c1b2a';
    startButton.style.border = 'none';
    startButton.style.borderRadius = '6px';
    startButton.style.cursor = 'pointer';
    startButton.style.fontWeight = 'bold';
    startButton.style.fontSize = '14px';
    startButton.style.transition = 'all 0.2s';

    startButton.addEventListener('mouseenter', () => {
      startButton.style.backgroundColor = '#0ea5e9'; // brighter cyan
      startButton.style.transform = 'translateY(-1px)';
    });

    startButton.addEventListener('mouseleave', () => {
      startButton.style.backgroundColor = STYLES.lineColor;
      startButton.style.transform = 'translateY(0)';
    });

    section.appendChild(startButton);

    return { section, startButton };
  }

  async function renderCancellationAnalysis() {
    const existing = document.querySelector('.parkrun-cancellation-impact');
    if (existing) {
      existing.remove();
    }

    const historyData = extractEventHistoryData();
    if (historyData.eventNumbers.length === 0) {
      console.log('No event history data found');
      return;
    }

    const gapInfo = detectEventGap(historyData);
    if (!gapInfo) {
      console.log('No cancellation gap detected');
      return;
    }

    state.currentEvent = { ...historyData, eventName: getCurrentEventInfo().eventName };
    state.gapInfo = gapInfo;

    const eventInfo = getCurrentEventInfo();
    const container = document.createElement('div');
    container.className = 'parkrun-cancellation-impact';
    container.style.width = '100%';
    container.style.maxWidth = '1200px';
    container.style.margin = '20px auto';
    container.style.padding = '15px';
    container.style.backgroundColor = STYLES.backgroundColor;
    container.style.borderRadius = '8px';
    container.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';

    // Check for nearby parkruns
    if (!state.allParkruns || state.allParkruns.length === 0) {
      const msg = document.createElement('div');
      msg.style.padding = '10px';
      msg.style.color = STYLES.subtleTextColor;
      msg.style.textAlign = 'center';
      msg.textContent = 'Loading nearby parkruns...';
      container.appendChild(msg);
      insertAfterFirst('h1', container);
      return;
    }

    state.nearbyParkruns = findNearbyParkruns(eventInfo, state.allParkruns);

    if (state.nearbyParkruns.length === 0) {
      const msg = document.createElement('div');
      msg.style.padding = '10px';
      msg.style.color = STYLES.subtleTextColor;
      msg.style.textAlign = 'center';
      msg.textContent = 'No nearby parkruns found within 50km.';
      container.appendChild(msg);
      insertAfterFirst('h1', container);
      return;
    }

    // Get EventShortName for the current event
    const currentParkrun = state.allParkruns.find(
      (p) => p.properties.eventname === eventInfo.eventName
    );
    const eventShortName = currentParkrun?.properties?.EventShortName || null;

    // Cancellation summary with start button
    const { section: summarySection, startButton } = renderCancellationSummary(eventShortName);
    container.appendChild(summarySection);

    insertAfterFirst('h1', container);

    // Setup analysis trigger
    startButton.addEventListener('click', () => {
      startButton.disabled = true;
      startButton.textContent = 'Starting...';
      startButton.style.opacity = '0.6';
      startButton.style.cursor = 'not-allowed';

      // Create and show progress UI
      const progressUI = createProgressUI();
      summarySection.insertAdjacentElement('afterend', progressUI.progressSection);

      // Background fetch
      state.fetchController = new AbortController();
      startBackgroundAnalysis(progressUI, container, summarySection);
    });
  }

  async function startBackgroundAnalysis(progressUI, container, summarySection) {
    const eventInfo = getCurrentEventInfo();
    const nearbyParkruns = state.nearbyParkruns;

    // Find all cancellation Saturdays from all gaps
    const allGaps = detectAllEventGaps(state.currentEvent);
    const cancellationSaturdays = [];

    allGaps.forEach((gap) => {
      const saturdays = getCancellationSaturdays(gap.gapStartDate, gap.gapEndDate);
      cancellationSaturdays.push(...saturdays);
    });

    // Sort by date descending (newest first)
    cancellationSaturdays.sort((a, b) => b - a);

    state.cancellationDates = cancellationSaturdays;

    console.log('All Cancellation Saturdays:', cancellationSaturdays);

    // Fetch all nearby parkrun histories once
    const nearbyHistories = [];

    for (let i = 0; i < nearbyParkruns.length; i++) {
      if (state.fetchController.signal.aborted) {
        console.log('Analysis stopped by user');
        break;
      }

      const parkrun = nearbyParkruns[i];
      const eventName = parkrun.properties.eventname;
      const shortName = parkrun.properties.EventShortName || eventName;
      const distance = parkrun.distance.toFixed(1);

      progressUI.updateStatus(`Fetching: ${shortName} (${distance}km)`);
      progressUI.updateProgress(i, nearbyParkruns.length);

      try {
        const historyData = await fetchEventHistory(eventName, eventInfo.url);
        if (historyData) {
          nearbyHistories.push({
            parkrun,
            historyData,
            shortName,
            distance,
          });
        }
      } catch (error) {
        console.error(`Failed to fetch ${eventName}:`, error);
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Compute results for all cancellation dates
    const resultsByDate = {};
    const validCancellationDates = [];

    cancellationSaturdays.forEach((targetDate) => {
      const dateKey = targetDate.toISOString().split('T')[0];
      const results = [];

      const windowBefore = getSeasonalWindow(targetDate, SEASONAL_WEEKS);
      windowBefore.end = new Date(targetDate);
      windowBefore.end.setUTCDate(windowBefore.end.getUTCDate() - 1);

      nearbyHistories.forEach(({ parkrun, historyData, shortName, distance }) => {
        const beforeData = filterEventsByDateRange(
          historyData,
          windowBefore.start,
          windowBefore.end
        );
        const baseline = calculateBaseline(beforeData);

        // Find event on this cancellation date
        const eventOnDate = findEventOnDate(historyData, targetDate);

        results.push({
          eventName: parkrun.properties.eventname,
          title: historyData.title,
          displayName: shortName,
          distance,
          baseline,
          eventOnDate,
          seasonalTrend: buildSeasonalTrend(historyData, targetDate),
          change: eventOnDate
            ? {
                finishersChange: eventOnDate.finishers - baseline.avgFinishers,
                volunteersChange: eventOnDate.volunteers - baseline.avgVolunteers,
                finishersPct:
                  baseline.avgFinishers > 0
                    ? ((eventOnDate.finishers - baseline.avgFinishers) / baseline.avgFinishers) *
                      100
                    : 0,
                volunteersPct:
                  baseline.avgVolunteers > 0
                    ? ((eventOnDate.volunteers - baseline.avgVolunteers) / baseline.avgVolunteers) *
                      100
                    : 0,
              }
            : null,
        });
      });

      // Check if this was a global cancellation (no parkruns ran)
      const eventsHeld = results.filter((r) => r.eventOnDate).length;

      if (eventsHeld >= 1) {
        resultsByDate[dateKey] = results;
        validCancellationDates.push(targetDate);
      } else {
        console.log(`Skipping ${dateKey}: 0/${results.length} parkruns ran (global cancellation)`);
      }
    });

    // Use filtered valid dates
    const finalCancellationDates =
      validCancellationDates.length > 0 ? validCancellationDates : cancellationSaturdays;

    progressUI.updateProgress(nearbyParkruns.length, nearbyParkruns.length);

    if (validCancellationDates.length === 0) {
      progressUI.updateStatus(
        'No valid cancellation dates found - all detected dates had global cancellations'
      );
      progressUI.stop.textContent = 'Close';
      progressUI.stop.style.backgroundColor = STYLES.alertColor;

      const noDataMsg = document.createElement('div');
      noDataMsg.style.padding = '15px';
      noDataMsg.style.backgroundColor = '#3a3250';
      noDataMsg.style.borderRadius = '6px';
      noDataMsg.style.marginTop = '15px';
      noDataMsg.style.color = STYLES.textColor;
      noDataMsg.style.textAlign = 'center';
      noDataMsg.innerHTML = `
        <h3 style="color: ${STYLES.alertColor}; margin: 0 0 10px 0;">⚠ No Valid Analysis Dates</h3>
        <p style="margin: 0 0 8px 0;">All detected cancellation dates appear to be part of global cancellation periods (e.g., COVID-19).</p>
        <p style="margin: 0; color: ${STYLES.subtleTextColor}; font-size: 13px;">
          No nearby parkruns held events on these dates, indicating system-wide cancellations rather than single-event cancellations.
        </p>
      `;
      container.appendChild(noDataMsg);

      progressUI.stop.addEventListener('click', () => {
        progressUI.hide();
      });
      return;
    }

    progressUI.updateStatus(
      `Analysis complete! Found ${validCancellationDates.length} valid cancellation date(s)`
    );
    const startBtn = document.querySelector('.start-analysis-btn');
    if (startBtn) {
      startBtn.style.display = 'none';
    }
    progressUI.stop.textContent = 'Close';
    progressUI.stop.style.backgroundColor = STYLES.successColor;

    state.resultsByDate = resultsByDate;
    state.cancellationDates = finalCancellationDates;
    state.analysisComplete = true;

    // Set initial index and render
    if (state.currentCancellationIndex === -1 && finalCancellationDates.length > 0) {
      state.currentCancellationIndex = 0; // Start with first (newest) date
    }

    // Create navigation controls at the top
    const navSection = createNavigationControls(
      container,
      resultsByDate,
      finalCancellationDates,
      state.currentCancellationIndex
    );
    summarySection.insertAdjacentElement('afterend', navSection);

    renderImpactResults(
      container,
      resultsByDate,
      finalCancellationDates,
      state.currentCancellationIndex
    );

    // Auto-hide progress UI after results are shown
    setTimeout(() => {
      progressUI.hide();
    }, 500);

    // Close progress UI on click (if user wants to close it manually before auto-hide)
    progressUI.stop.addEventListener('click', () => {
      progressUI.hide();
    });
  }

  function createNavigationControls(container, resultsByDate, cancellationDates, currentDateIndex) {
    const navSection = document.createElement('div');
    navSection.className = 'parkrun-cancellation-nav';
    navSection.style.padding = '15px';
    navSection.style.backgroundColor = '#2b223d';
    navSection.style.borderRadius = '8px';
    navSection.style.marginBottom = '20px';
    navSection.style.border = `1px solid ${STYLES.gridColor}`;

    const navInfo = document.createElement('div');
    navInfo.style.color = STYLES.textColor;
    navInfo.style.fontSize = '14px';
    navInfo.style.marginBottom = '12px';
    navInfo.innerHTML = `
      <strong>${cancellationDates.length} Cancellation Date${cancellationDates.length !== 1 ? 's' : ''} Available</strong>
      <div style="color: ${STYLES.subtleTextColor}; font-size: 12px; margin-top: 4px;">
        Use dropdown or buttons to navigate • Keyboard: <kbd style="background: #3a3250; padding: 2px 6px; border-radius: 3px; font-family: monospace; border: 1px solid ${STYLES.gridColor};">←</kbd> <kbd style="background: #3a3250; padding: 2px 6px; border-radius: 3px; font-family: monospace; border: 1px solid ${STYLES.gridColor};">→</kbd>
      </div>
    `;
    navSection.appendChild(navInfo);

    const navControlsWrapper = document.createElement('div');
    navControlsWrapper.style.display = 'flex';
    navControlsWrapper.style.alignItems = 'center';
    navControlsWrapper.style.gap = '8px';
    navControlsWrapper.style.flexWrap = 'wrap';

    const prevBtn = document.createElement('button');
    prevBtn.textContent = '←';
    prevBtn.style.padding = '6px 10px';
    const prevEnabled = currentDateIndex < cancellationDates.length - 1;
    prevBtn.style.backgroundColor = prevEnabled ? STYLES.lineColor : '#3a3250';
    prevBtn.style.color = prevEnabled ? '#2b223d' : STYLES.subtleTextColor;
    prevBtn.style.border = `1px solid ${STYLES.gridColor}`;
    prevBtn.style.borderRadius = '4px';
    prevBtn.style.cursor = prevEnabled ? 'pointer' : 'not-allowed';
    prevBtn.style.fontWeight = 'bold';
    prevBtn.style.fontSize = '14px';
    prevBtn.style.transition = 'all 0.2s ease';
    prevBtn.disabled = !prevEnabled;
    if (prevEnabled) {
      prevBtn.addEventListener('mouseenter', () => {
        prevBtn.style.transform = 'translateY(-1px)';
        prevBtn.style.boxShadow = '0 2px 4px rgba(34, 211, 238, 0.3)';
      });
      prevBtn.addEventListener('mouseleave', () => {
        prevBtn.style.transform = 'translateY(0)';
        prevBtn.style.boxShadow = 'none';
      });
    }

    const dateDropdown = document.createElement('select');
    dateDropdown.style.padding = '6px 8px';
    dateDropdown.style.backgroundColor = '#3a3250';
    dateDropdown.style.color = STYLES.textColor;
    dateDropdown.style.border = `1px solid ${STYLES.gridColor}`;
    dateDropdown.style.borderRadius = '4px';
    dateDropdown.style.cursor = 'pointer';
    dateDropdown.style.fontWeight = 'bold';
    dateDropdown.style.fontSize = '12px';
    dateDropdown.style.minWidth = '220px';
    dateDropdown.style.flex = '1';

    cancellationDates.forEach((date, index) => {
      const option = document.createElement('option');
      const optionDateStr = date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        weekday: 'short',
      });
      option.value = index;
      option.textContent = optionDateStr;
      option.selected = index === currentDateIndex;
      dateDropdown.appendChild(option);
    });

    const nextBtn = document.createElement('button');
    nextBtn.textContent = '→';
    nextBtn.style.padding = '6px 10px';
    const nextEnabled = currentDateIndex > 0;
    nextBtn.style.backgroundColor = nextEnabled ? STYLES.lineColor : '#3a3250';
    nextBtn.style.color = nextEnabled ? '#2b223d' : STYLES.subtleTextColor;
    nextBtn.style.border = `1px solid ${STYLES.gridColor}`;
    nextBtn.style.borderRadius = '4px';
    nextBtn.style.cursor = nextEnabled ? 'pointer' : 'not-allowed';
    nextBtn.style.fontWeight = 'bold';
    nextBtn.style.fontSize = '14px';
    nextBtn.style.transition = 'all 0.2s ease';
    nextBtn.disabled = !nextEnabled;
    if (nextEnabled) {
      nextBtn.addEventListener('mouseenter', () => {
        nextBtn.style.transform = 'translateY(-1px)';
        nextBtn.style.boxShadow = '0 2px 4px rgba(34, 211, 238, 0.3)';
      });
      nextBtn.addEventListener('mouseleave', () => {
        nextBtn.style.transform = 'translateY(0)';
        nextBtn.style.boxShadow = 'none';
      });
    }

    navControlsWrapper.appendChild(prevBtn);
    navControlsWrapper.appendChild(dateDropdown);
    navControlsWrapper.appendChild(nextBtn);

    navSection.appendChild(navControlsWrapper);

    const updateResults = () => {
      const resultsDiv = container.querySelector('.parkrun-cancellation-results');
      if (resultsDiv) {
        resultsDiv.remove();
      }
      renderImpactResults(
        container,
        resultsByDate,
        cancellationDates,
        state.currentCancellationIndex
      );

      // Refresh nav UI state (buttons/dropdown) to reflect new index
      const latestNav = container.querySelector('.parkrun-cancellation-nav');
      if (latestNav) {
        const selects = latestNav.querySelectorAll('select');
        if (selects[0]) selects[0].value = state.currentCancellationIndex;

        const buttons = latestNav.querySelectorAll('button');
        const prev = buttons[0];
        const next = buttons[1];
        if (prev) {
          const enabled = state.currentCancellationIndex < cancellationDates.length - 1;
          prev.disabled = !enabled;
          prev.style.backgroundColor = enabled ? STYLES.lineColor : '#3a3250';
          prev.style.color = enabled ? '#2b223d' : STYLES.subtleTextColor;
          prev.style.cursor = enabled ? 'pointer' : 'not-allowed';
        }
        if (next) {
          const enabled = state.currentCancellationIndex > 0;
          next.disabled = !enabled;
          next.style.backgroundColor = enabled ? STYLES.lineColor : '#3a3250';
          next.style.color = enabled ? '#2b223d' : STYLES.subtleTextColor;
          next.style.cursor = enabled ? 'pointer' : 'not-allowed';
        }
      }
    };

    const handlePrev = () => {
      if (state.currentCancellationIndex < cancellationDates.length - 1) {
        state.currentCancellationIndex += 1; // move to older date
        updateResults();
      }
    };

    const handleNext = () => {
      if (state.currentCancellationIndex > 0) {
        state.currentCancellationIndex -= 1; // move to newer date
        updateResults();
      }
    };

    const handleDropdownChange = (e) => {
      state.currentCancellationIndex = parseInt(e.target.value, 10);
      updateResults();
    };

    prevBtn.addEventListener('click', handlePrev);
    nextBtn.addEventListener('click', handleNext);
    dateDropdown.addEventListener('change', handleDropdownChange);

    // Keyboard navigation (one handler at a time)
    if (state.keyboardHandler) {
      document.removeEventListener('keydown', state.keyboardHandler);
    }
    state.keyboardHandler = (e) => {
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    document.addEventListener('keydown', state.keyboardHandler);

    return navSection;
  }

  function sortResults(results, column, direction) {
    const sorted = [...results];

    const getValue = (result) => {
      switch (column) {
        case 'name':
          return result.displayName || result.eventName;
        case 'distance':
          return parseFloat(result.distance);
        case 'eventNumber':
          return result.eventOnDate ? parseInt(result.eventOnDate.eventNumber, 10) : -1;
        case 'baseline':
          return result.baseline.avgFinishers;
        case 'onDate':
          return result.eventOnDate ? result.eventOnDate.finishers : -1;
        case 'change':
          return result.change ? result.change.finishersChange : -999999;
        case 'changePct':
          return result.change ? result.change.finishersPct : -999999;
        default:
          return 0;
      }
    };

    sorted.sort((a, b) => {
      const aVal = getValue(a);
      const bVal = getValue(b);
      return direction === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return sorted;
  }

  async function buildHtmlReport(resultsSection, meta) {
    const clone = resultsSection.cloneNode(true);

    const originalCanvases = resultsSection.querySelectorAll('canvas');
    const clonedCanvases = clone.querySelectorAll('canvas');

    originalCanvases.forEach((canvas, idx) => {
      try {
        const dataUrl = canvas.toDataURL('image/png');
        const img = document.createElement('img');
        img.src = dataUrl;
        img.alt = 'Chart snapshot';
        img.style.maxWidth = '100%';
        img.style.display = 'block';
        img.style.backgroundColor = '#2b223d';

        if (clonedCanvases[idx]) {
          clonedCanvases[idx].replaceWith(img);
        }
      } catch (error) {
        console.error('Failed to serialize chart canvas:', error);
      }
    });

    const stylesheet = `
      :root { color-scheme: dark; }
      body { margin: 0; padding: 20px; background: ${STYLES.backgroundColor}; color: ${STYLES.textColor}; font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif; line-height: 1.5; }
      a { color: ${STYLES.lineColor}; }
      h1, h2, h3, h4 { color: ${STYLES.barColor}; margin: 0 0 10px 0; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid ${STYLES.gridColor}; padding: 10px; text-align: left; }
      th { background: #2b223d; color: ${STYLES.barColor}; }
      tr:nth-child(even) td { background: #241c35; }
      tr:nth-child(odd) td { background: #1f182e; }
      .parkrun-cancellation-results { background: ${STYLES.backgroundColor}; padding: 16px; border-radius: 6px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25); }
      .chart-img { max-width: 100%; display: block; }
      .meta { margin-bottom: 16px; color: ${STYLES.subtleTextColor}; font-size: 13px; }
      .meta strong { color: ${STYLES.textColor}; }
    `;

    const header = `
      <header>
        <h1>parkrun Cancellation Impact</h1>
        <div class="meta">
          <div><strong>Event:</strong> ${meta.eventShortName}</div>
          <div><strong>Cancelled date:</strong> ${meta.cancellationDateStr}</div>
          <div><strong>Generated:</strong> ${meta.generatedAt}</div>
        </div>
      </header>
    `;

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>parkrun Cancellation Impact - ${meta.eventShortName} - ${meta.cancellationDateStr}</title><style>${stylesheet}</style></head><body>${header}${clone.outerHTML}</body></html>`;
  }

  async function generateReportBlob(resultsSection, meta) {
    const html = await buildHtmlReport(resultsSection, meta);
    const filename = `parkrun-cancellation-impact-${meta.eventShortName}-${meta.cancellationDateStr}.html`;
    return {
      blob: new Blob([html], { type: 'text/html' }),
      filename,
    };
  }

  function buildSeasonalTrend(historyData, targetDate) {
    const windowBefore = getSeasonalWindow(targetDate, SEASONAL_WEEKS);
    windowBefore.end = new Date(targetDate);
    windowBefore.end.setUTCDate(windowBefore.end.getUTCDate() - 1);

    const filtered = filterEventsByDateRange(historyData, windowBefore.start, windowBefore.end);
    const baseline = calculateBaseline(filtered);

    return {
      window: windowBefore,
      filtered,
      baseline,
    };
  }

  function renderImpactResults(
    resultsContainer,
    resultsByDate,
    cancellationDates,
    currentDateIndex
  ) {
    // Get results for current date
    const currentDate = cancellationDates[currentDateIndex];
    const dateKey = currentDate.toISOString().split('T')[0];
    const results = resultsByDate[dateKey] || [];

    const dateStr = currentDate.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    // Results section
    const resultsSection = document.createElement('div');
    resultsSection.className = 'parkrun-cancellation-results';
    resultsSection.style.marginTop = '20px';

    // Impact heading with date
    const tableHeading = document.createElement('h3');
    tableHeading.textContent = `Nearby parkrun Impact on ${dateStr}`;
    tableHeading.style.color = STYLES.barColor;
    tableHeading.style.marginTop = '20px';
    tableHeading.style.marginBottom = '12px';
    resultsSection.appendChild(tableHeading);

    const tableWrap = document.createElement('div');
    tableWrap.style.overflowX = 'auto';

    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.fontSize = '13px';
    table.style.color = STYLES.textColor;

    const thead = document.createElement('thead');
    thead.style.position = 'sticky';
    thead.style.top = '0';
    thead.style.backgroundColor = '#2b223d';
    thead.style.zIndex = '10';
    const headerRow = document.createElement('tr');
    headerRow.style.borderBottom = `2px solid ${STYLES.gridColor}`;

    const headers = [
      {
        label: 'parkrun',
        key: 'name',
        align: 'left',
        info: 'Click column headers to sort. Default ordering is by distance.',
      },
      {
        label: 'Distance',
        key: 'distance',
        align: 'right',
        info: 'Distance from cancelled event in kilometers.',
      },
      {
        label: 'Event #',
        key: 'eventNumber',
        align: 'right',
        info: `Event number on ${dateStr}. Lower numbers indicate newer parkruns.`,
      },
      {
        label: 'Baseline (Avg)',
        key: 'baseline',
        align: 'right',
        info: `12-week seasonal average (finishers/volunteers) ending the day before ${dateStr}.`,
      },
      {
        label: 'On Date',
        key: 'onDate',
        align: 'right',
        info: `Actual attendance (finishers/volunteers) on ${dateStr}.`,
      },
      {
        label: 'Change',
        key: 'change',
        align: 'right',
        info: 'Difference between actual and baseline (finishers/volunteers).',
      },
      {
        label: 'Change %',
        key: 'changePct',
        align: 'right',
        info: 'Percentage change in finishers compared to baseline.',
      },
      {
        label: 'Trend',
        key: 'trend',
        align: 'right',
        info: 'Gain (+5 or more finishers), Loss (-5 or fewer), Stable (within ±5), or No Event.',
      },
    ];

    const renderTable = (sortedResults) => {
      // Clear existing tbody if present
      const existingTbody = table.querySelector('tbody');
      if (existingTbody) {
        existingTbody.remove();
      }

      const tbody = document.createElement('tbody');

      sortedResults.forEach((result) => {
        const row = document.createElement('tr');
        row.style.borderBottom = `1px solid ${STYLES.gridColor}`;
        row.style.transition = 'background-color 0.15s ease';

        // Special styling for No Event rows
        const hasEvent = result.eventOnDate !== null;
        if (!hasEvent) {
          row.style.opacity = '0.6';
        }

        // Add hover effect
        row.addEventListener('mouseenter', () => {
          row.style.backgroundColor = hasEvent
            ? 'rgba(34, 211, 238, 0.08)'
            : 'rgba(243, 244, 246, 0.03)';
        });
        row.addEventListener('mouseleave', () => {
          row.style.backgroundColor = 'transparent';
        });

        // parkrun name with link
        const nameCell = document.createElement('td');
        nameCell.style.padding = '10px';
        nameCell.style.textAlign = 'left';
        nameCell.style.fontWeight = 'bold';
        const link = document.createElement('a');
        link.href = `${getCurrentEventInfo().url}/${result.eventName}/results/eventhistory/`;
        link.textContent = result.displayName || result.eventName;
        link.style.color = STYLES.lineColor;
        link.style.textDecoration = 'none';
        link.target = '_blank';
        link.addEventListener('mouseenter', () => {
          link.style.textDecoration = 'underline';
        });
        link.addEventListener('mouseleave', () => {
          link.style.textDecoration = 'none';
        });
        nameCell.appendChild(link);
        row.appendChild(nameCell);

        const distanceCell = document.createElement('td');
        distanceCell.style.padding = '10px';
        distanceCell.style.textAlign = 'right';
        distanceCell.style.color = STYLES.subtleTextColor;
        distanceCell.textContent = `${result.distance}km`;
        row.appendChild(distanceCell);

        const eventNumberCell = document.createElement('td');
        eventNumberCell.style.padding = '10px';
        eventNumberCell.style.textAlign = 'right';
        if (result.eventOnDate && result.eventOnDate.eventNumber) {
          eventNumberCell.textContent = result.eventOnDate.eventNumber;
          eventNumberCell.style.color = STYLES.textColor;
        } else {
          eventNumberCell.textContent = '—';
          eventNumberCell.style.color = STYLES.subtleTextColor;
        }
        row.appendChild(eventNumberCell);

        const baselineCell = document.createElement('td');
        baselineCell.style.padding = '10px';
        baselineCell.style.textAlign = 'right';
        baselineCell.innerHTML = `<strong>${result.baseline.avgFinishers}</strong> / ${result.baseline.avgVolunteers}`;
        row.appendChild(baselineCell);

        const onDateCell = document.createElement('td');
        onDateCell.style.padding = '10px';
        onDateCell.style.textAlign = 'right';
        if (result.eventOnDate) {
          onDateCell.innerHTML = `<strong>${result.eventOnDate.finishers}</strong> / ${result.eventOnDate.volunteers}`;
        } else {
          onDateCell.textContent = '—';
          onDateCell.style.color = STYLES.subtleTextColor;
        }
        row.appendChild(onDateCell);

        const changeCell = document.createElement('td');
        changeCell.style.padding = '10px';
        changeCell.style.textAlign = 'right';
        if (result.change) {
          const finishersSign = result.change.finishersChange > 0 ? '+' : '';
          const volunteersSign = result.change.volunteersChange > 0 ? '+' : '';
          const finishersColor =
            result.change.finishersChange > 0 ? STYLES.successColor : STYLES.alertColor;
          const volunteersColor =
            result.change.volunteersChange > 0 ? STYLES.successColor : STYLES.alertColor;
          changeCell.innerHTML = `
          <span style="color: ${finishersColor};">${finishersSign}${result.change.finishersChange}</span> /
          <span style="color: ${volunteersColor};">${volunteersSign}${result.change.volunteersChange}</span>
        `;
        } else {
          changeCell.textContent = '—';
          changeCell.style.color = STYLES.subtleTextColor;
        }
        row.appendChild(changeCell);

        const changePctCell = document.createElement('td');
        changePctCell.style.padding = '10px';
        changePctCell.style.textAlign = 'right';
        if (result.change) {
          const pctColor = result.change.finishersPct > 0 ? STYLES.successColor : STYLES.alertColor;
          const sign = result.change.finishersPct > 0 ? '+' : '';
          changePctCell.innerHTML = `<span style="color: ${pctColor};">${sign}${result.change.finishersPct.toFixed(1)}%</span>`;
        } else {
          changePctCell.textContent = '—';
          changePctCell.style.color = STYLES.subtleTextColor;
        }
        row.appendChild(changePctCell);

        const trendCell = document.createElement('td');
        trendCell.style.padding = '10px';
        trendCell.style.textAlign = 'right';
        if (!result.eventOnDate) {
          trendCell.textContent = 'No Event';
          trendCell.style.color = STYLES.subtleTextColor;
        } else if (result.change.finishersChange < -5) {
          trendCell.textContent = '↓ Loss';
          trendCell.style.color = STYLES.alertColor;
        } else if (result.change.finishersChange > 5) {
          trendCell.textContent = '↑ Gain';
          trendCell.style.color = STYLES.successColor;
        } else {
          trendCell.textContent = '→ Stable';
          trendCell.style.color = STYLES.subtleTextColor;
        }
        row.appendChild(trendCell);

        tbody.appendChild(row);
      });

      table.appendChild(tbody);
    };

    headers.forEach((header) => {
      const th = document.createElement('th');
      th.style.padding = '10px';
      th.style.textAlign = header.align;
      th.style.color = STYLES.barColor;
      th.style.fontWeight = 'bold';
      th.style.cursor = 'pointer';
      th.style.userSelect = 'none';
      th.style.position = 'relative';
      th.style.transition = 'background-color 0.15s ease';

      th.addEventListener('mouseenter', () => {
        th.style.backgroundColor = 'rgba(34, 211, 238, 0.1)';
      });
      th.addEventListener('mouseleave', () => {
        th.style.backgroundColor = 'transparent';
      });

      const headerText = document.createElement('span');
      headerText.textContent = header.label;
      headerText.style.marginRight = '4px';
      th.appendChild(headerText);

      // Sort indicator
      const sortIndicator = document.createElement('span');
      sortIndicator.style.fontSize = '10px';
      sortIndicator.style.opacity = state.sortColumn === header.key ? '1' : '0.3';
      sortIndicator.textContent =
        state.sortColumn === header.key ? (state.sortDirection === 'asc' ? '▲' : '▼') : '▲';
      th.appendChild(sortIndicator);

      // Info icon with tooltip
      const infoIcon = document.createElement('span');
      infoIcon.textContent = ' ℹ';
      infoIcon.style.fontSize = '12px';
      infoIcon.style.opacity = '0.6';
      infoIcon.style.cursor = 'help';
      infoIcon.style.transition = 'opacity 0.2s ease';
      infoIcon.title = header.info;
      infoIcon.addEventListener('mouseenter', () => {
        infoIcon.style.opacity = '1';
      });
      infoIcon.addEventListener('mouseleave', () => {
        infoIcon.style.opacity = '0.6';
      });
      th.appendChild(infoIcon);

      th.addEventListener('click', () => {
        if (state.sortColumn === header.key) {
          state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
          state.sortColumn = header.key;
          state.sortDirection = 'asc';
        }

        const sortedResults = sortResults(results, state.sortColumn, state.sortDirection);
        renderTable(sortedResults);

        // Update all header indicators
        headers.forEach((h, idx) => {
          const headerCell = headerRow.children[idx];
          const indicator = headerCell.children[1];
          if (h.key === state.sortColumn) {
            indicator.style.opacity = '1';
            indicator.textContent = state.sortDirection === 'asc' ? '▲' : '▼';
          } else {
            indicator.style.opacity = '0.3';
            indicator.textContent = '▲';
          }
        });
      });

      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Initial render with default sorting (distance, asc)
    const sortedResults = sortResults(results, state.sortColumn, state.sortDirection);
    renderTable(sortedResults);

    tableWrap.appendChild(table);
    resultsSection.appendChild(tableWrap);

    // Seasonal trend for cancelled event
    const seasonalTrend = buildSeasonalTrend(state.currentEvent, currentDate);
    const trendSection = document.createElement('div');
    trendSection.style.marginTop = '16px';
    trendSection.style.padding = '12px';
    trendSection.style.backgroundColor = '#3a3250';
    trendSection.style.borderRadius = '4px';

    const trendHeading = document.createElement('h3');
    trendHeading.textContent = 'Cancelled Event Seasonal Trend';
    trendHeading.style.color = STYLES.barColor;
    trendHeading.style.margin = '0 0 8px 0';
    trendSection.appendChild(trendHeading);

    const windowText = document.createElement('div');
    const startStr = seasonalTrend.window.start.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const endStr = seasonalTrend.window.end.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    windowText.style.color = STYLES.textColor;
    windowText.style.fontSize = '13px';
    windowText.style.marginBottom = '6px';
    windowText.innerHTML = `Window: ${startStr} → ${endStr} (12-week baseline)`;
    trendSection.appendChild(windowText);

    const trendStats = document.createElement('div');
    trendStats.style.color = STYLES.textColor;
    trendStats.style.fontSize = '13px';
    trendStats.style.display = 'grid';
    trendStats.style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))';
    trendStats.style.gap = '8px';
    trendStats.innerHTML = `
      <div>Average finishers: <strong>${seasonalTrend.baseline.avgFinishers}</strong></div>
      <div>Min finishers: <strong>${seasonalTrend.baseline.minFinishers}</strong></div>
      <div>Max finishers: <strong>${seasonalTrend.baseline.maxFinishers}</strong></div>
      <div>Average volunteers: <strong>${seasonalTrend.baseline.avgVolunteers}</strong></div>
      <div>Min volunteers: <strong>${seasonalTrend.baseline.minVolunteers}</strong></div>
      <div>Max volunteers: <strong>${seasonalTrend.baseline.maxVolunteers}</strong></div>
      <div>Total events: <strong>${seasonalTrend.baseline.totalEvents}</strong></div>
    `;
    trendSection.appendChild(trendStats);

    if (
      typeof Chart !== 'undefined' &&
      seasonalTrend.filtered.finishers &&
      seasonalTrend.filtered.finishers.length > 0
    ) {
      const trendCanvas = document.createElement('canvas');
      trendCanvas.style.marginTop = '12px';
      trendSection.appendChild(trendCanvas);

      // eslint-disable-next-line no-undef
      new Chart(trendCanvas.getContext('2d'), {
        type: 'line',
        data: {
          labels: seasonalTrend.filtered.dates,
          datasets: [
            {
              label: 'Finishers',
              data: seasonalTrend.filtered.finishers,
              borderColor: STYLES.lineColor,
              backgroundColor: 'rgba(34, 211, 238, 0.25)',
              tension: 0.2,
              fill: true,
            },
            {
              label: 'Volunteers',
              data: seasonalTrend.filtered.volunteers,
              borderColor: STYLES.successColor,
              backgroundColor: 'rgba(16, 185, 129, 0.18)',
              tension: 0.2,
              fill: true,
            },
            {
              label: 'Finishers baseline avg',
              data: seasonalTrend.filtered.dates.map(() => seasonalTrend.baseline.avgFinishers),
              borderColor: STYLES.barColor,
              borderDash: [6, 4],
              pointRadius: 0,
            },
            {
              label: 'Volunteers baseline avg',
              data: seasonalTrend.filtered.dates.map(() => seasonalTrend.baseline.avgVolunteers),
              borderColor: STYLES.gridColor,
              borderDash: [6, 4],
              pointRadius: 0,
            },
          ],
        },
        options: {
          animation: false,
          responsive: true,
          maintainAspectRatio: true,
          aspectRatio: 1.6,
          plugins: {
            legend: { labels: { color: STYLES.textColor } },
            title: {
              display: true,
              text: 'Finishers & volunteers over baseline window',
              color: STYLES.textColor,
            },
          },
          scales: {
            x: {
              ticks: { color: STYLES.subtleTextColor },
              grid: { color: STYLES.gridColor },
            },
            y: {
              beginAtZero: true,
              ticks: { precision: 0, color: STYLES.subtleTextColor },
              grid: { color: STYLES.gridColor },
              title: { display: true, text: 'Finishers', color: STYLES.textColor },
            },
          },
        },
      });
    } else {
      const emptyMsg = document.createElement('div');
      emptyMsg.style.color = STYLES.subtleTextColor;
      emptyMsg.style.fontSize = '12px';
      emptyMsg.style.marginTop = '8px';
      emptyMsg.textContent = 'No historical data available for the baseline window.';
      trendSection.appendChild(emptyMsg);
    }

    resultsSection.appendChild(trendSection);

    // Navigation handled by top-level controls injected after summary

    // Most impacted events seasonal trends
    const positiveChanges = results.filter(
      (r) => r.change && r.change.finishersChange > 0 && r.change.finishersPct !== undefined
    );
    const topAbsolute = [...positiveChanges]
      .sort((a, b) => b.change.finishersChange - a.change.finishersChange)
      .slice(0, 1);
    const topRelative = [...positiveChanges]
      .filter((r) => r.change.finishersPct > 0)
      .sort((a, b) => b.change.finishersPct - a.change.finishersPct)
      .slice(0, 1);

    const impactedSection = document.createElement('div');
    impactedSection.style.marginTop = '18px';
    impactedSection.style.padding = '12px';
    impactedSection.style.backgroundColor = '#2b223d';
    impactedSection.style.borderRadius = '4px';

    const impactedHeading = document.createElement('h3');
    impactedHeading.textContent = 'Most Impacted parkruns';
    impactedHeading.style.color = STYLES.barColor;
    impactedHeading.style.margin = '0 0 10px 0';
    impactedSection.appendChild(impactedHeading);

    const impactedSummary = document.createElement('div');
    impactedSummary.style.color = STYLES.textColor;
    impactedSummary.style.fontSize = '13px';

    if (topAbsolute.length === 0) {
      impactedSummary.textContent = 'No nearby parkruns saw an attendance increase on this date.';
      impactedSection.appendChild(impactedSummary);
    } else {
      const summaries = [];
      if (topAbsolute[0]) {
        const r = topAbsolute[0];
        summaries.push(
          `Largest absolute gain: <strong>${r.displayName || r.eventName}</strong> (+${r.change.finishersChange} finishers, ${r.change.finishersPct.toFixed(1)}%)`
        );
      }
      if (topRelative[0]) {
        const r = topRelative[0];
        summaries.push(
          `Largest relative gain: <strong>${r.displayName || r.eventName}</strong> (+${r.change.finishersPct.toFixed(1)}%, +${r.change.finishersChange} finishers)`
        );
      }
      impactedSummary.innerHTML = summaries.join('<br>');
      impactedSection.appendChild(impactedSummary);

      const impactedList = [topAbsolute[0], topRelative[0]].filter(Boolean);
      const seen = new Set();
      impactedList.forEach((r) => {
        if (!r || !r.seasonalTrend || !r.seasonalTrend.filtered) return;
        if (seen.has(r.eventName)) return;
        seen.add(r.eventName);

        const card = document.createElement('div');
        card.style.marginTop = '12px';
        card.style.padding = '10px';
        card.style.backgroundColor = '#3a3250';
        card.style.borderRadius = '4px';

        const title = document.createElement('div');
        title.style.color = STYLES.textColor;
        title.style.fontWeight = 'bold';
        title.style.marginBottom = '6px';
        title.textContent = r.displayName || r.eventName;
        card.appendChild(title);

        const stats = document.createElement('div');
        stats.style.color = STYLES.textColor;
        stats.style.fontSize = '12px';
        stats.style.display = 'grid';
        stats.style.gridTemplateColumns = 'repeat(auto-fit, minmax(160px, 1fr))';
        stats.style.gap = '6px';
        stats.innerHTML = `
          <div>Avg finishers: <strong>${r.seasonalTrend.baseline.avgFinishers}</strong></div>
          <div>Min finishers: <strong>${r.seasonalTrend.baseline.minFinishers}</strong></div>
          <div>Max finishers: <strong>${r.seasonalTrend.baseline.maxFinishers}</strong></div>
          <div>Avg volunteers: <strong>${r.seasonalTrend.baseline.avgVolunteers}</strong></div>
          <div>Min volunteers: <strong>${r.seasonalTrend.baseline.minVolunteers}</strong></div>
          <div>Max volunteers: <strong>${r.seasonalTrend.baseline.maxVolunteers}</strong></div>
        `;
        card.appendChild(stats);

        if (
          typeof Chart !== 'undefined' &&
          r.seasonalTrend.filtered.finishers &&
          r.seasonalTrend.filtered.finishers.length > 0
        ) {
          const canvas = document.createElement('canvas');
          canvas.style.marginTop = '10px';
          card.appendChild(canvas);

          // Build chart data including cancellation date
          const chartLabels = [...r.seasonalTrend.filtered.dates];
          const chartFinishers = [...r.seasonalTrend.filtered.finishers];
          const chartVolunteers = [...r.seasonalTrend.filtered.volunteers];
          const cancelDateStr = dateStr;

          // Add cancellation date point
          if (r.eventOnDate) {
            chartLabels.push(cancelDateStr);
            chartFinishers.push(r.eventOnDate.finishers);
            chartVolunteers.push(r.eventOnDate.volunteers);
          }

          // eslint-disable-next-line no-undef
          new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: {
              labels: chartLabels,
              datasets: [
                {
                  label: 'Finishers',
                  data: chartFinishers,
                  borderColor: STYLES.lineColor,
                  backgroundColor: 'rgba(34, 211, 238, 0.25)',
                  tension: 0.2,
                  fill: true,
                },
                {
                  label: 'Volunteers',
                  data: chartVolunteers,
                  borderColor: STYLES.successColor,
                  backgroundColor: 'rgba(16, 185, 129, 0.18)',
                  tension: 0.2,
                  fill: true,
                },
                {
                  label: 'Finishers baseline avg',
                  data: chartLabels.map(() => r.seasonalTrend.baseline.avgFinishers),
                  borderColor: STYLES.barColor,
                  borderDash: [6, 4],
                  pointRadius: 0,
                },
                {
                  label: 'Volunteers baseline avg',
                  data: chartLabels.map(() => r.seasonalTrend.baseline.avgVolunteers),
                  borderColor: STYLES.gridColor,
                  borderDash: [6, 4],
                  pointRadius: 0,
                },
              ],
            },
            options: {
              animation: false,
              responsive: true,
              maintainAspectRatio: true,
              aspectRatio: 1.6,
              plugins: {
                legend: { labels: { color: STYLES.textColor } },
                title: { display: true, text: 'Seasonal trend', color: STYLES.textColor },
              },
              scales: {
                x: { ticks: { color: STYLES.subtleTextColor }, grid: { color: STYLES.gridColor } },
                y: {
                  beginAtZero: true,
                  ticks: { precision: 0, color: STYLES.subtleTextColor },
                  grid: { color: STYLES.gridColor },
                  title: { display: true, text: 'Count', color: STYLES.textColor },
                },
              },
            },
          });
        }

        impactedSection.appendChild(card);
      });
    }

    resultsSection.appendChild(impactedSection);

    // Charts section
    if (typeof Chart !== 'undefined') {
      const chartsContainer = document.createElement('div');
      chartsContainer.style.marginTop = '30px';

      const chartsHeading = document.createElement('h3');
      chartsHeading.textContent = 'Visual Impact Analysis';
      chartsHeading.style.color = STYLES.barColor;
      chartsHeading.style.marginBottom = '15px';
      chartsContainer.appendChild(chartsHeading);

      const chartsGrid = document.createElement('div');
      chartsGrid.style.display = 'grid';
      chartsGrid.style.gridTemplateColumns = '1fr 1fr';
      chartsGrid.style.gap = '20px';

      // Chart 1: Finishers - Baseline vs Actual
      const finishersCanvas = document.createElement('canvas');
      const finishersContainer = document.createElement('div');
      finishersContainer.style.minWidth = '0';
      finishersContainer.appendChild(finishersCanvas);
      chartsGrid.appendChild(finishersContainer);

      // Chart 2: Volunteers - Baseline vs Actual
      const volunteersCanvas = document.createElement('canvas');
      const volunteersContainer = document.createElement('div');
      volunteersContainer.style.minWidth = '0';
      volunteersContainer.appendChild(volunteersCanvas);
      chartsGrid.appendChild(volunteersContainer);

      chartsContainer.appendChild(chartsGrid);
      resultsSection.appendChild(chartsContainer);

      // Render finishers chart
      const finishersLabels = results
        .filter((r) => r.eventOnDate)
        .map((r) => r.title || r.eventName);
      const finishersBaseline = results
        .filter((r) => r.eventOnDate)
        .map((r) => r.baseline.avgFinishers);
      const finishersActual = results
        .filter((r) => r.eventOnDate)
        .map((r) => r.eventOnDate.finishers);

      // eslint-disable-next-line no-undef
      new Chart(finishersCanvas.getContext('2d'), {
        type: 'bar',
        data: {
          labels: finishersLabels,
          datasets: [
            {
              label: 'Baseline (12-week avg)',
              data: finishersBaseline,
              backgroundColor: STYLES.barColor,
              borderColor: STYLES.barColor,
              borderWidth: 1,
            },
            {
              label: `Actual on ${dateStr}`,
              data: finishersActual,
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
          aspectRatio: 1.5,
          plugins: {
            legend: { labels: { color: STYLES.textColor } },
            title: {
              display: true,
              text: 'Finishers: Baseline vs Actual',
              color: STYLES.textColor,
            },
          },
          scales: {
            x: {
              ticks: { color: STYLES.subtleTextColor, display: false },
              grid: { color: STYLES.gridColor },
            },
            y: {
              beginAtZero: true,
              title: { display: true, text: 'Finishers', color: STYLES.textColor },
              ticks: { precision: 0, color: STYLES.subtleTextColor },
              grid: { color: STYLES.gridColor },
            },
          },
        },
      });

      // Render volunteers chart
      const volunteersBaseline = results
        .filter((r) => r.eventOnDate)
        .map((r) => r.baseline.avgVolunteers);
      const volunteersActual = results
        .filter((r) => r.eventOnDate)
        .map((r) => r.eventOnDate.volunteers);

      // eslint-disable-next-line no-undef
      new Chart(volunteersCanvas.getContext('2d'), {
        type: 'bar',
        data: {
          labels: finishersLabels,
          datasets: [
            {
              label: 'Baseline (12-week avg)',
              data: volunteersBaseline,
              backgroundColor: STYLES.barColor,
              borderColor: STYLES.barColor,
              borderWidth: 1,
            },
            {
              label: `Actual on ${dateStr}`,
              data: volunteersActual,
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
          aspectRatio: 1.5,
          plugins: {
            legend: { labels: { color: STYLES.textColor } },
            title: {
              display: true,
              text: 'Volunteers: Baseline vs Actual',
              color: STYLES.textColor,
            },
          },
          scales: {
            x: {
              ticks: { color: STYLES.subtleTextColor, display: false },
              grid: { color: STYLES.gridColor },
            },
            y: {
              beginAtZero: true,
              title: { display: true, text: 'Volunteers', color: STYLES.textColor },
              ticks: { precision: 0, color: STYLES.subtleTextColor },
              grid: { color: STYLES.gridColor },
            },
          },
        },
      });
    }

    // Summary statistics
    const summary = document.createElement('div');
    summary.style.marginTop = '20px';
    summary.style.padding = '12px';
    summary.style.backgroundColor = '#3a3250';
    summary.style.borderRadius = '4px';

    const summaryHeading = document.createElement('h4');
    summaryHeading.textContent = 'Summary';
    summaryHeading.style.margin = '0 0 8px 0';
    summaryHeading.style.color = STYLES.lineColor;
    summary.appendChild(summaryHeading);

    const eventsWithData = results.filter((r) => r.eventOnDate && r.change);
    const totalGain = eventsWithData.reduce((sum, r) => sum + r.change.finishersChange, 0);
    const totalVolunteerGain = eventsWithData.reduce(
      (sum, r) => sum + r.change.volunteersChange,
      0
    );
    const avgChangeFinishers =
      eventsWithData.length > 0 ? Math.round(totalGain / eventsWithData.length) : 0;
    const avgChangeVolunteers =
      eventsWithData.length > 0
        ? Math.round(
            eventsWithData.reduce((sum, r) => sum + r.change.volunteersChange, 0) /
              eventsWithData.length
          )
        : 0;

    const summaryText = document.createElement('div');
    summaryText.style.fontSize = '13px';
    summaryText.style.color = STYLES.textColor;
    summaryText.innerHTML = `
      <p style="margin: 4px 0;">
        <strong>${results.length}</strong> nearby parkruns analyzed
        <span style="color: ${STYLES.subtleTextColor}; font-size: 11px; margin-left: 8px;" title="parkruns within 50km of the cancelled event in the same country and series">ℹ</span>
      </p>
      <p style="margin: 4px 0;">
        <strong>${eventsWithData.length}</strong> held events on ${dateStr}
        <span style="color: ${STYLES.subtleTextColor}; font-size: 11px; margin-left: 8px;" title="Number of nearby parkruns that ran on this date">ℹ</span>
      </p>
      <p style="margin: 4px 0;">
        Average change in finishers: <span style="color: ${avgChangeFinishers < 0 ? STYLES.alertColor : STYLES.successColor}; font-weight: bold;">${avgChangeFinishers > 0 ? '+' : ''}${avgChangeFinishers}</span>
        <span style="color: ${STYLES.subtleTextColor}; font-size: 11px; margin-left: 8px;" title="Mean difference between actual finishers and 12-week baseline average across events that ran">ℹ</span>
      </p>
      <p style="margin: 4px 0;">
        Average change in volunteers: <span style="color: ${avgChangeVolunteers < 0 ? STYLES.alertColor : STYLES.successColor}; font-weight: bold;">${avgChangeVolunteers > 0 ? '+' : ''}${avgChangeVolunteers}</span>
        <span style="color: ${STYLES.subtleTextColor}; font-size: 11px; margin-left: 8px;" title="Mean difference between actual volunteers and 12-week baseline average across events that ran">ℹ</span>
      </p>
      <p style="margin: 4px 0;">
        Estimated total additional finishers: <span style="color: ${totalGain < 0 ? STYLES.alertColor : STYLES.successColor}; font-weight: bold;">${totalGain > 0 ? '+' : ''}${totalGain}</span>
        <span style="color: ${STYLES.subtleTextColor}; font-size: 11px; margin-left: 8px;" title="Sum of all finisher changes across nearby parkruns - positive indicates runners redistributed from the cancelled event">ℹ</span>
      </p>
      <p style="margin: 4px 0;">
        Estimated total additional volunteers: <span style="color: ${totalVolunteerGain < 0 ? STYLES.alertColor : STYLES.successColor}; font-weight: bold;">${totalVolunteerGain > 0 ? '+' : ''}${totalVolunteerGain}</span>
        <span style="color: ${STYLES.subtleTextColor}; font-size: 11px; margin-left: 8px;" title="Sum of all volunteer changes across nearby parkruns - indicates how many extra volunteers were needed on the day">ℹ</span>
      </p>
    `;
    summary.appendChild(summaryText);
    resultsSection.appendChild(summary);

    // Download button
    const downloadContainer = document.createElement('div');
    downloadContainer.style.display = 'flex';
    downloadContainer.style.justifyContent = 'center';
    downloadContainer.style.marginTop = '20px';
    downloadContainer.style.gap = '10px';
    downloadContainer.style.flexWrap = 'wrap';

    const exportHtmlBtn = document.createElement('button');
    exportHtmlBtn.textContent = '📄 Export HTML';
    exportHtmlBtn.style.padding = '8px 16px';
    exportHtmlBtn.style.backgroundColor = STYLES.barColor;
    exportHtmlBtn.style.color = '#1c1b2a';
    exportHtmlBtn.style.border = 'none';
    exportHtmlBtn.style.borderRadius = '4px';
    exportHtmlBtn.style.cursor = 'pointer';
    exportHtmlBtn.style.fontWeight = 'bold';
    exportHtmlBtn.style.fontSize = '14px';

    const getReportMeta = () => {
      const eventInfo = getCurrentEventInfo();
      const currentParkrun = state.allParkruns.find(
        (p) => p.properties.eventname === eventInfo.eventName
      );
      const eventShortName = currentParkrun?.properties?.EventShortName || eventInfo.eventName;
      const cancellationDateStr = currentDate.toISOString().split('T')[0];

      return { eventShortName, cancellationDateStr };
    };

    exportHtmlBtn.addEventListener('click', async () => {
      const originalLabel = exportHtmlBtn.textContent;
      const originalDisplay = exportHtmlBtn.style.display;
      exportHtmlBtn.textContent = 'Exporting...';
      exportHtmlBtn.disabled = true;
      exportHtmlBtn.style.display = 'none';

      try {
        const { eventShortName, cancellationDateStr } = getReportMeta();
        const { blob, filename } = await generateReportBlob(resultsSection, {
          eventShortName,
          cancellationDateStr,
          generatedAt: new Date().toLocaleString(),
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        console.log('HTML export complete');
      } catch (error) {
        console.error('HTML export failed:', error);
        alert('Error exporting HTML: ' + error.message);
      } finally {
        exportHtmlBtn.disabled = false;
        exportHtmlBtn.textContent = originalLabel;
        exportHtmlBtn.style.display = originalDisplay;
      }
    });

    const shareBtn = document.createElement('button');
    shareBtn.textContent = '📤 Share Report';
    shareBtn.style.padding = '8px 16px';
    shareBtn.style.backgroundColor = STYLES.lineColor;
    shareBtn.style.color = '#2b223d';
    shareBtn.style.border = 'none';
    shareBtn.style.borderRadius = '4px';
    shareBtn.style.cursor = 'pointer';
    shareBtn.style.fontWeight = 'bold';
    shareBtn.style.fontSize = '14px';

    shareBtn.addEventListener('click', async () => {
      const originalLabel = shareBtn.textContent;
      const originalDisplay = shareBtn.style.display;
      shareBtn.textContent = 'Sharing...';
      shareBtn.disabled = true;
      shareBtn.style.display = 'none';

      try {
        const { eventShortName, cancellationDateStr } = getReportMeta();
        const { blob, filename } = await generateReportBlob(resultsSection, {
          eventShortName,
          cancellationDateStr,
          generatedAt: new Date().toLocaleString(),
        });

        const file = new File([blob], filename, { type: 'text/html' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `parkrun Cancellation Impact - ${eventShortName}`,
            text: `Cancellation date: ${cancellationDateStr}`,
            files: [file],
          });
          console.log('Report shared via Web Share API');
        } else {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          alert('Sharing is not supported in this browser, so the HTML report was downloaded instead.');
        }
      } catch (error) {
        console.error('Share failed:', error);
        alert('Error sharing report: ' + error.message);
      } finally {
        shareBtn.disabled = false;
        shareBtn.textContent = originalLabel;
        shareBtn.style.display = originalDisplay;
      }
    });

    downloadContainer.appendChild(exportHtmlBtn);
    downloadContainer.appendChild(shareBtn);
    resultsSection.appendChild(downloadContainer);

    resultsContainer.appendChild(resultsSection);
  }

  async function init() {
    const resultsTable = document.querySelector('.Results-table');
    const pageUrl = window.location.href;
    const isEventHistoryPage = pageUrl.includes('/eventhistory/');

    if (!resultsTable || !isEventHistoryPage) {
      return;
    }

    state.allParkruns = await fetchAllParkruns();
    renderCancellationAnalysis();
  }

  init();
})();
