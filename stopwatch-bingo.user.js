// ==UserScript==
// @name         parkrun Stopwatch Bingo
// @description  Visualizes your progress on the stopwatch bingo challenge (collecting seconds 00-59)
// @author       Pete Johns (@johnsyweb)
// @downloadURL  https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/stopwatch-bingo.user.js
// @grant        none
// @homepage     https://github.com/johnsyweb/tampermonkey-parkrun
// @icon         https://www.google.com/s2/favicons?sz=64&domain=parkrun.com.au
// @license      MIT
// @match        *://www.parkrun.ca/parkrunner/*/all*
// @match        *://www.parkrun.co.at/parkrunner/*/all*
// @match        *://www.parkrun.co.nl/parkrunner/*/all*
// @match        *://www.parkrun.co.nz/parkrunner/*/all*
// @match        *://www.parkrun.co.za/parkrunner/*/all*
// @match        *://www.parkrun.com.au/parkrunner/*/all*
// @match        *://www.parkrun.com.de/parkrunner/*/all*
// @match        *://www.parkrun.dk/parkrunner/*/all*
// @match        *://www.parkrun.fi/parkrunner/*/all*
// @match        *://www.parkrun.fr/parkrunner/*/all*
// @match        *://www.parkrun.ie/parkrunner/*/all*
// @match        *://www.parkrun.it/parkrunner/*/all*
// @match        *://www.parkrun.jp/parkrunner/*/all*
// @match        *://www.parkrun.lt/parkrunner/*/all*
// @match        *://www.parkrun.my/parkrunner/*/all*
// @match        *://www.parkrun.no/parkrunner/*/all*
// @match        *://www.parkrun.org.uk/parkrunner/*/all*
// @match        *://www.parkrun.pl/parkrunner/*/all*
// @match        *://www.parkrun.se/parkrunner/*/all*
// @match        *://www.parkrun.sg/parkrunner/*/all*
// @match        *://www.parkrun.us/parkrunner/*/all*
// @namespace    http://tampermonkey.net/
// @require      https://html2canvas.hertzen.com/dist/html2canvas.min.js
// @run-at       document-end
// @supportURL   https://github.com/johnsyweb/tampermonkey-parkrun/issues/
// @tag          parkrun
// @updateURL    https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/stopwatch-bingo.user.js
// @version      2025-05-12 19:55 10:42
// ==/UserScript==

(function () {
  'use strict';

  const STYLES = {
    backgroundColor: '#2b223d',
    clockBorderColor: '#FFA300',
    clockFaceColor: '#333',
    completedColor: '#FFA300',
    pendingColor: '#53BA9D',
    textColor: '#e0e0e0',
    subtleTextColor: '#cccccc',
  };

  function findResultsTable() {
    const tables = document.querySelectorAll('#results');
    return tables[tables.length - 1];
  }

  function extractFinishTimes(table) {
    const seconds = {};
    const timeData = {};
    let collectedCount = 0;
    let totalParkruns = 0;
    let firstCompleteEvent = null;
    let dateOfCompletion = null;

    const rows = table.querySelectorAll('tr');
    // First collect all results since they're in reverse order
    const allResults = [];
    rows.forEach((row) => {
      const cells = row.querySelectorAll('td');
      if (cells.length < 5) return;

      const eventName = cells[0].textContent.trim();
      const date = cells[1].textContent.trim();
      const eventNumber = cells[2].textContent.trim();
      const time = cells[4].textContent.trim();

      if (!time || !eventNumber || !date || !eventName) return;

      const event = `${eventName} # ${eventNumber}`;

      // Parse seconds from time (either MM:SS or HH:MM:SS format)
      let secondValue;
      const hourMatch = time.match(/(\d+):(\d+):(\d+)/);
      if (hourMatch) {
        secondValue = parseInt(hourMatch[3], 10);
      } else {
        const minuteMatch = time.match(/(\d+):(\d+)/);
        if (!minuteMatch) return;
        secondValue = parseInt(minuteMatch[2], 10);
      }

      allResults.push({
        secondValue,
        date,
        event,
        time,
      });
    });

    // Process in chronological order (reverse the array)
    const reversedResults = allResults.reverse();
    for (let i = 0; i < reversedResults.length; i++) {
      const result = reversedResults[i];
      const { secondValue, date, event, time } = result;

      totalParkruns++;

      // Only store if we haven't seen this second yet
      if (!(secondValue in seconds)) {
        seconds[secondValue] = {
          date,
          event,
          time,
        };
        collectedCount++;

        // Check if we've completed the bingo
        if (collectedCount === 60 && !dateOfCompletion) {
          dateOfCompletion = date;
          firstCompleteEvent = event;
          timeData[secondValue] = [{ date, event, time }];
          break;
        }
      }

      // Store all occurrences for tooltip data
      if (!timeData[secondValue]) {
        timeData[secondValue] = [];
      }
      timeData[secondValue].push({
        date,
        event,
        time,
      });
    }

    return {
      seconds,
      timeData,
      collectedCount,
      totalParkruns,
      dateOfCompletion,
      firstCompleteEvent,
    };
  }

  function createClockContainer(title) {
    const container = document.createElement('div');
    container.className = 'parkrun-bingo-container';
    container.style.width = '100%';
    container.style.maxWidth = '800px';
    container.style.margin = '20px auto';
    container.style.padding = '20px';
    container.style.backgroundColor = STYLES.backgroundColor;
    container.style.borderRadius = '8px';
    container.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    container.style.textAlign = 'center';

    const heading = document.createElement('h3');
    heading.textContent = title;
    heading.style.marginBottom = '15px';
    heading.style.color = STYLES.clockBorderColor;
    container.appendChild(heading);

    return container;
  }

  function createBingoClock(data) {
    const container = createClockContainer('Stopwatch Bingo Challenge');

    // Add stats
    const statsContainer = document.createElement('div');
    statsContainer.style.marginBottom = '20px';
    statsContainer.style.color = STYLES.textColor;

    let statsText = `<div style="font-size: 1.2em; margin-bottom: 10px;"><strong>${data.collectedCount} of 60</strong> seconds collected</div>`;
    statsText += `<div>After ${data.totalParkruns} parkruns</div>`;

    if (data.dateOfCompletion) {
      statsText += `<div style="margin-top: 10px; font-size: 1.1em;">🏆 Bingo completed on ${data.dateOfCompletion} (${data.firstCompleteEvent})</div>`;
    }

    statsContainer.innerHTML = statsText;
    container.appendChild(statsContainer);

    // Create clock face
    const clockContainer = document.createElement('div');
    clockContainer.style.position = 'relative';
    clockContainer.style.width = '500px';
    clockContainer.style.height = '500px';
    clockContainer.style.margin = '0 auto';
    clockContainer.style.borderRadius = '50%';
    clockContainer.style.border = `10px solid ${STYLES.clockBorderColor}`;
    clockContainer.style.backgroundColor = STYLES.clockFaceColor;
    clockContainer.style.boxSizing = 'content-box';

    // Add the second segments first (so they're at the bottom layer)
    for (let i = 0; i < 60; i++) {
      const hasSecond = i in data.seconds;
      const occurrences = hasSecond && data.timeData[i] ? data.timeData[i].length : 0;

      // Calculate angles for this segment (0 seconds at top, moving clockwise)
      const startAngle = (((i - 0.4) / 60) * 360 - 90) * (Math.PI / 180);
      const endAngle = (((i + 0.4) / 60) * 360 - 90) * (Math.PI / 180);

      // Create a segment using SVG path
      const segment = document.createElement('div');
      segment.style.position = 'absolute';
      segment.style.top = '0';
      segment.style.left = '0';
      segment.style.width = '100%';
      segment.style.height = '100%';
      segment.style.pointerEvents = 'none'; // Make it non-blocking for clicks

      // Calculate path for pie slice - go all the way to center
      const outerRadius = 220; // Leave space for indices
      const centerX = 250;
      const centerY = 250;

      // Create SVG element for the segment
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
      svg.style.position = 'absolute';
      svg.style.top = '0';
      svg.style.left = '0';
      svg.style.zIndex = '1'; // Lower z-index to keep below indices

      // Create the path for the pie slice
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

      // Calculate the points for the path - with innerRadius 0, we go to center
      // For segments from center, we simplify the path
      const x2 = centerX + outerRadius * Math.cos(startAngle);
      const y2 = centerY + outerRadius * Math.sin(startAngle);
      const x3 = centerX + outerRadius * Math.cos(endAngle);
      const y3 = centerY + outerRadius * Math.sin(endAngle);

      // Path goes from center to outer edge, arcs around, then back to center
      const pathData = [
        `M ${centerX},${centerY}`,
        `L ${x2},${y2}`,
        `A ${outerRadius},${outerRadius} 0 0,1 ${x3},${y3}`,
        'Z',
      ].join(' ');

      path.setAttribute('d', pathData);

      // Vary color intensity based on frequency
      if (hasSecond) {
        // Calculate color intensity - darker as frequency increases
        // Start with base orange color (STYLES.completedColor) and adjust saturation/lightness
        // Max intensity at around 5+ occurrences
        const intensity = Math.min(occurrences, 5) / 5; // 0.2 per occurrence up to 1.0

        // Either darken the orange or make it more saturated based on frequency
        const baseColor = STYLES.completedColor; // '#FFA300'
        const r = parseInt(baseColor.slice(1, 3), 16);
        const g = parseInt(baseColor.slice(3, 5), 16);
        const b = parseInt(baseColor.slice(5, 7), 16);

        // Darken the color as frequency increases (multiply RGB values)
        const darkenFactor = 1 - intensity * 0.3; // Ranges from 1.0 to 0.7
        const newR = Math.floor(r * darkenFactor)
          .toString(16)
          .padStart(2, '0');
        const newG = Math.floor(g * darkenFactor)
          .toString(16)
          .padStart(2, '0');
        const newB = Math.floor(b * darkenFactor)
          .toString(16)
          .padStart(2, '0');

        const frequencyColor = `#${newR}${newG}${newB}`;

        path.setAttribute('fill', frequencyColor);
        path.setAttribute('opacity', '1');

        // Update title to include frequency information
        const secondData = data.seconds[i];
        path.setAttribute(
          'title',
          `${secondData.time} - ${secondData.date} ${secondData.event} (${occurrences} occurrences)`
        );
      } else {
        path.setAttribute('fill', STYLES.pendingColor);
        path.setAttribute('opacity', '0.4');
        path.setAttribute('title', `Missing: ${i.toString().padStart(2, '0')} seconds`);
      }

      // Add click handler directly to the path for interaction
      if (hasSecond) {
        path.style.cursor = 'pointer';
        path.style.pointerEvents = 'auto'; // Make path clickable

        path.addEventListener('click', () => {
          showSecondDetails(i, data.timeData[i]);
        });
      }

      svg.appendChild(path);
      segment.appendChild(svg);
      clockContainer.appendChild(segment);
    }

    // Add stopwatch indices (markers at 5-second intervals) OVER the segments
    const indexSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    indexSvg.setAttribute('width', '100%');
    indexSvg.setAttribute('height', '100%');
    indexSvg.style.position = 'absolute';
    indexSvg.style.top = '0';
    indexSvg.style.left = '0';
    indexSvg.style.pointerEvents = 'none';
    indexSvg.style.zIndex = '2'; // Higher z-index to keep above segments

    // Create indices at 5-second intervals (0, 5, 10, etc.)
    for (let i = 0; i < 60; i += 5) {
      // Calculate angle for this index
      const angle = (i / 60) * 360 - 90; // -90 to start at top
      const radians = angle * (Math.PI / 180);

      // Calculate position (outer edge of the clock)
      const indexOuterRadius = 245; // Just inside the border
      const indexInnerRadius = i % 15 === 0 ? 210 : 225; // Longer marks for 0, 15, 30, 45

      const centerX = 250;
      const centerY = 250;

      // Create line for index mark
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', centerX + indexInnerRadius * Math.cos(radians));
      line.setAttribute('y1', centerY + indexInnerRadius * Math.sin(radians));
      line.setAttribute('x2', centerX + indexOuterRadius * Math.cos(radians));
      line.setAttribute('y2', centerY + indexOuterRadius * Math.sin(radians));
      line.setAttribute('stroke', STYLES.textColor);
      line.setAttribute('stroke-width', i % 15 === 0 ? 3 : 2);
      indexSvg.appendChild(line);

      // Add numerical label for all 5-second intervals
      const textRadius = i % 15 === 0 ? indexInnerRadius - 25 : indexInnerRadius - 20;
      const textX = centerX + textRadius * Math.cos(radians);
      const textY = centerY + textRadius * Math.sin(radians);

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', textX);
      text.setAttribute('y', textY);
      text.setAttribute('fill', STYLES.textColor);
      text.setAttribute('font-size', i % 15 === 0 ? '16px' : '14px');
      text.setAttribute('font-weight', 'bold');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.textContent = i.toString();
      indexSvg.appendChild(text);
    }

    clockContainer.appendChild(indexSvg);

    const clockCenter = document.createElement('div');
    clockCenter.style.position = 'absolute';
    clockCenter.style.top = '50%';
    clockCenter.style.left = '50%';
    clockCenter.style.transform = 'translate(-50%, -50%)';
    clockCenter.style.width = '100px';
    clockCenter.style.height = '100px';
    clockCenter.style.borderRadius = '50%';
    clockCenter.style.backgroundColor = STYLES.clockBorderColor;
    clockCenter.style.display = 'flex';
    clockCenter.style.justifyContent = 'center';
    clockCenter.style.alignItems = 'center';
    clockCenter.style.color = STYLES.backgroundColor;
    clockCenter.style.fontWeight = 'bold';
    clockCenter.style.fontSize = '20px'; // Larger font for better readability
    clockCenter.style.zIndex = '3'; // Ensure it's on top
    clockCenter.textContent = `${Math.round((data.collectedCount / 60) * 100)}%`;
    clockContainer.appendChild(clockCenter);

    container.appendChild(clockContainer);

    addDownloadButton(container);

    // Add explanation
    const explanation = document.createElement('div');
    explanation.style.marginTop = '20px';
    explanation.style.color = STYLES.subtleTextColor;
    explanation.style.fontSize = '0.9em';
    explanation.innerHTML =
      "Stopwatch Bingo: collect finish times with every second from 00-59.<br>Orange segments show seconds you've collected, green segments are still needed.<br>Click on any segment to see details.";
    container.appendChild(explanation);

    return container;
  }

  function addDownloadButton(container) {
    const btnContainer = document.createElement('div');
    btnContainer.style.marginTop = '15px';
    btnContainer.id = 'bingo-download-btn-container';

    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = '💾 Save as Image';
    downloadBtn.style.padding = '8px 15px';
    downloadBtn.style.backgroundColor = STYLES.clockBorderColor;
    downloadBtn.style.color = STYLES.backgroundColor;
    downloadBtn.style.border = 'none';
    downloadBtn.style.borderRadius = '4px';
    downloadBtn.style.cursor = 'pointer';
    downloadBtn.style.fontWeight = 'bold';

    // Add hover effect
    downloadBtn.addEventListener('mouseover', function () {
      this.style.backgroundColor = '#e59200';
    });

    downloadBtn.addEventListener('mouseout', function () {
      this.style.backgroundColor = STYLES.clockBorderColor;
    });

    // Download handler
    downloadBtn.addEventListener('click', function () {
      // Hide the download button temporarily for the screenshot
      downloadBtn.style.display = 'none';

      // Use the entire container instead of just the clock
      // eslint-disable-next-line no-undef
      html2canvas(container, {
        backgroundColor: STYLES.backgroundColor,
        scale: 2, // Higher resolution
        logging: false,
        allowTaint: true,
        useCORS: true,
      }).then((canvas) => {
        // Show the button again
        downloadBtn.style.display = 'block';

        const link = document.createElement('a');
        const timestamp = new Date().toISOString().split('T')[0];
        const pageUrl = window.location.pathname.split('/');
        const parkrunnerId = pageUrl[2] || 'parkrunner';
        link.download = `stopwatch-bingo-${parkrunnerId}-${timestamp}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      });
    });

    btnContainer.appendChild(downloadBtn);
    container.appendChild(btnContainer);
  }

  function showSecondDetails(second, times) {
    // Remove any existing details pop-up
    const existingPopup = document.getElementById('second-details-popup');
    if (existingPopup) {
      existingPopup.remove();
    }

    // Create popup
    const popup = document.createElement('div');
    popup.id = 'second-details-popup';
    popup.style.position = 'fixed';
    popup.style.top = '50%';
    popup.style.left = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.width = '400px';
    popup.style.maxHeight = '500px';
    popup.style.overflowY = 'auto';
    popup.style.backgroundColor = STYLES.backgroundColor;
    popup.style.borderRadius = '8px';
    popup.style.padding = '20px';
    popup.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.5)';
    popup.style.zIndex = '1000';
    popup.style.color = STYLES.textColor;

    // Add close button
    const closeBtn = document.createElement('div');
    closeBtn.textContent = '✕';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '10px';
    closeBtn.style.right = '15px';
    closeBtn.style.fontSize = '20px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.addEventListener('click', () => popup.remove());
    popup.appendChild(closeBtn);

    // Add title
    const title = document.createElement('h3');
    title.textContent = `${second.toString().padStart(2, '0')} Seconds - ${times.length} Times`;
    title.style.marginBottom = '15px';
    title.style.color = STYLES.clockBorderColor;
    popup.appendChild(title);

    // Create table of occurrences
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.marginTop = '10px';

    // Add table header
    const thead = document.createElement('thead');
    const headers = [
      { title: 'Date', align: 'left' },
      { title: 'Event', align: 'left' },
      { title: 'Time', align: 'left' },
    ];

    const headerRow = document.createElement('tr');
    headers.forEach((header) => {
      const th = document.createElement('th');
      th.textContent = header.title;
      th.style.textAlign = header.align;
      th.style.padding = '8px';
      th.style.borderBottom = '1px solid #555';
      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Add table body
    const tbody = document.createElement('tbody');
    times.forEach((time, index) => {
      const row = document.createElement('tr');
      row.style.backgroundColor = index === 0 ? 'rgba(255, 163, 0, 0.2)' : 'transparent';
      const cells = [{ content: time.date }, { content: time.event }, { content: time.time }]
        .map(
          (cell) => `<td style="padding: 8px; border-bottom: 1px solid #444;">${cell.content}</td>`
        )
        .join('');

      row.innerHTML = cells;
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    popup.appendChild(table);
    document.body.appendChild(popup);

    // Add backdrop and close on click
    const backdrop = document.createElement('div');
    backdrop.style.position = 'fixed';
    backdrop.style.top = '0';
    backdrop.style.left = '0';
    backdrop.style.width = '100%';
    backdrop.style.height = '100%';
    backdrop.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    backdrop.style.zIndex = '999';
    backdrop.addEventListener('click', () => {
      popup.remove();
      backdrop.remove();
    });
    document.body.appendChild(backdrop);
  }

  function insertAfterTitle(element) {
    const pageTitle = document.querySelector('h2');
    if (pageTitle && pageTitle.parentNode) {
      if (pageTitle.nextSibling) {
        pageTitle.parentNode.insertBefore(element, pageTitle.nextSibling);
      } else {
        pageTitle.parentNode.appendChild(element);
      }
    }
  }

  function initStopwatchBingo() {
    const resultsTable = document.querySelector('#results');
    if (!resultsTable) {
      console.log('Results table not found');
      return;
    }

    // Extract name from the page title
    const pageTitle = document.querySelector('h2');
    if (!pageTitle) return;

    const table = findResultsTable();
    const data = extractFinishTimes(table);
    const clockContainer = createBingoClock(data);
    insertAfterTitle(clockContainer);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      findResultsTable,
      extractFinishTimes,
    };
  } else {
    initStopwatchBingo();
  }
})();
