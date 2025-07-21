// ==UserScript==
// @name         parkrun Compass Challenge
// @description  Visualizes your progress on the compass challenge (North, South, East, West parkruns)
// @author       Pete Johns (@johnsyweb)
// @downloadURL  https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/compass-challenge.user.js
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
// @updateURL    https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/compass-challenge.user.js
// @version      2025-07-21 01:47 18:37 18:36 18:35 18:33 18:29 01:53 02:17 01:28 02:13 19:55 10:42
// ==/UserScript==

(function () {
  'use strict';

  const STYLES = {
    backgroundColor: '#2b223d',
    accentColor: '#FFA300',
    completedColor: '#53BA9D',
    pendingColor: '#666',
    textColor: '#e0e0e0',
    subtleTextColor: '#cccccc',
  };

  // Patterns to match compass directions in parkrun names
  const DIRECTION_PATTERNS = {
    north: /north/i,
    south: /south/i,
    east: /east/i,
    west: /west/i,
  };

  function findResultsTable() {
    const tables = document.querySelectorAll('#results');
    return tables[tables.length - 1];
  }

  function extractCompassData(table) {
    const directions = {
      north: null,
      south: null,
      east: null,
      west: null,
    };

    let completedCount = 0;
    let dateOfCompletion = null;
    let totalEvents = 0;

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

      allResults.push({
        eventName,
        date,
        eventNumber,
        time,
      });
    });

    // Process in chronological order (reverse the array)
    const reversedResults = allResults.reverse();

    for (let i = 0; !dateOfCompletion && i < reversedResults.length; i++) {
      const result = reversedResults[i];
      const { eventName, date, eventNumber, time } = result;

      totalEvents++;

      // Check for compass directions in the event name
      for (const [direction, pattern] of Object.entries(DIRECTION_PATTERNS)) {
        if (pattern.test(eventName) && !directions[direction]) {
          directions[direction] = {
            eventName,
            date,
            eventNumber,
            time,
          };
          completedCount++;

          // Check if we've completed the challenge with this event
          if (completedCount === 4 && !dateOfCompletion) {
            dateOfCompletion = date;
          }
        }
      }
    }

    return {
      directions,
      completedCount,
      dateOfCompletion,
      totalEvents,
    };
  }

  function createCompassContainer(title) {
    const container = document.createElement('div');
    container.className = 'parkrun-compass-container';
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
    heading.style.color = STYLES.accentColor;
    container.appendChild(heading);

    return container;
  }

  function createCompass(data) {
    const container = createCompassContainer('Compass Challenge');

    // Add stats
    const statsContainer = document.createElement('div');
    statsContainer.style.marginBottom = '20px';
    statsContainer.style.color = STYLES.textColor;

    let statsText = `<div style="font-size: 1.2em; margin-bottom: 10px;"><strong>${data.completedCount} of 4</strong> compass directions completed</div>`;
    statsText += `<div>After ${data.totalEvents} parkruns</div>`;

    if (data.dateOfCompletion) {
      statsText += `<div style="margin-top: 10px; font-size: 1.1em;">🧭 Challenge completed on ${data.dateOfCompletion}</div>`;
    }

    statsContainer.innerHTML = statsText;
    container.appendChild(statsContainer);

    // Create compass visual
    const compassContainer = document.createElement('div');
    compassContainer.style.position = 'relative';
    compassContainer.style.width = '700px';
    compassContainer.style.height = '700px';
    compassContainer.style.margin = '0 auto';
    compassContainer.style.boxSizing = 'content-box';

    // Create SVG for compass
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('viewBox', '0 0 700 700');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';

    // Define centers and radius
    const centerX = 350;
    const centerY = 350;
    const innerRadius = 30;
    const outerRadius = 230;

    // Create the main compass circle
    const compassCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    compassCircle.setAttribute('cx', centerX);
    compassCircle.setAttribute('cy', centerY);
    compassCircle.setAttribute('r', outerRadius);
    compassCircle.setAttribute('fill', '#334');
    compassCircle.setAttribute('stroke', STYLES.accentColor);
    compassCircle.setAttribute('stroke-width', '5');
    svg.appendChild(compassCircle);

    // First add directions and paths - we'll add the center rose later to ensure higher z-index
    const directions = [
      { name: 'north', angle: 270, label: 'N', data: data.directions.north },
      { name: 'east', angle: 0, label: 'E', data: data.directions.east },
      { name: 'south', angle: 90, label: 'S', data: data.directions.south },
      { name: 'west', angle: 180, label: 'W', data: data.directions.west },
    ];

    // Draw the needle for each direction
    directions.forEach((dir) => {
      const angle = dir.angle * (Math.PI / 180);

      // Calculate the coordinates for the diamond shape
      const tipX = centerX + outerRadius * Math.cos(angle);
      const tipY = centerY + outerRadius * Math.sin(angle);

      // Calculate the middle point (50% from center to edge)
      const midDistance = outerRadius * 0.5;
      const needleWidth = outerRadius * 0.12;

      const midPointX = centerX + midDistance * Math.cos(angle);
      const midPointY = centerY + midDistance * Math.sin(angle);

      // Calculate the perpendicular angle
      const perpAngle = angle + Math.PI / 2;

      // Calculate width points at the middle of the needle
      const widthX1 = midPointX + needleWidth * Math.cos(perpAngle);
      const widthY1 = midPointY + needleWidth * Math.sin(perpAngle);
      const widthX2 = midPointX - needleWidth * Math.cos(perpAngle);
      const widthY2 = midPointY - needleWidth * Math.sin(perpAngle);

      // Create needle path
      const needlePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const pathData = `M ${centerX} ${centerY} L ${widthX1} ${widthY1} L ${tipX} ${tipY} L ${widthX2} ${widthY2} Z`;

      needlePath.setAttribute('d', pathData);
      needlePath.setAttribute('fill', dir.data ? STYLES.completedColor : STYLES.pendingColor);
      needlePath.setAttribute('stroke', '#000');
      needlePath.setAttribute('stroke-width', '1');
      needlePath.setAttribute('stroke-opacity', '0.3');
      svg.appendChild(needlePath);

      // Add direction label (N, E, S, W)
      const labelDistance = outerRadius * 0.5;
      const labelX = centerX + labelDistance * Math.cos(angle);
      const labelY = centerY + labelDistance * Math.sin(angle);

      const dirLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      dirLabel.setAttribute('x', labelX);
      dirLabel.setAttribute('y', labelY);
      dirLabel.setAttribute('text-anchor', 'middle');
      dirLabel.setAttribute('dominant-baseline', 'middle');
      dirLabel.setAttribute('fill', '#fff');
      dirLabel.setAttribute('font-size', '28px');
      dirLabel.setAttribute('font-weight', 'bold');
      dirLabel.setAttribute('stroke', '#000');
      dirLabel.setAttribute('stroke-width', '1');
      dirLabel.setAttribute('paint-order', 'stroke');
      dirLabel.textContent = dir.label;
      svg.appendChild(dirLabel);

      // Add parkrun info if completed
      if (dir.data) {
        // Extract parkrun name without "parkrun" suffix
        const nameMatch = dir.data.eventName.match(/(.+?)(?:\s+parkrun)?$/i);
        const displayName = nameMatch ? nameMatch[1] : dir.data.eventName;

        // Create combined text (name and date)
        const combinedText = `${displayName} - ${dir.data.date}`;

        // Create curved text path around the outside of the circle
        const pathId = `text-path-${dir.name}`;
        const textPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');

        // Create curved path for each direction that follows the circle circumference
        let pathD = '';
        const adjustedOffset = outerRadius + 15; // Match the offset used for other directions

        switch (dir.name) {
          case 'north':
            pathD = `M ${centerX - 170} ${centerY - adjustedOffset} A ${adjustedOffset} ${adjustedOffset} 0 0 1 ${centerX + 170} ${centerY - adjustedOffset}`;
            break;

          case 'east':
            pathD = `M ${centerX + adjustedOffset} ${centerY - 170} A ${adjustedOffset} ${adjustedOffset} 0 0 1 ${centerX + adjustedOffset} ${centerY + 170}`;
            break;

          case 'south':
            // Arc from left to right across the bottom (text curves anticlockwise)
            pathD = `M ${centerX - 170} ${centerY + adjustedOffset} A ${adjustedOffset} ${adjustedOffset} 0 0 0 ${centerX + 170} ${centerY + adjustedOffset}`;
            break;

          case 'west':
            pathD = `M ${centerX - adjustedOffset} ${centerY + 170} A ${adjustedOffset} ${adjustedOffset} 0 0 1 ${centerX - adjustedOffset} ${centerY - 170}`;
            break;

          default:
            console.warn(`Unknown direction: ${dir.name}`);
            break;
        }

        textPath.setAttribute('id', pathId);
        textPath.setAttribute('d', pathD);
        textPath.setAttribute('fill', 'none');
        svg.appendChild(textPath);

        // Create the text element
        const eventText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        eventText.setAttribute('fill', '#FFFFFF');
        eventText.setAttribute('font-size', '14px');
        eventText.setAttribute('font-weight', 'bold');

        // Create the textPath element
        const textPathElement = document.createElementNS('http://www.w3.org/2000/svg', 'textPath');
        textPathElement.setAttribute('href', `#${pathId}`);
        textPathElement.setAttribute('startOffset', '50%');
        textPathElement.setAttribute('text-anchor', 'middle');

        if (dir.name === 'south') {
          textPathElement.setAttribute('side', 'left'); // Ensures the text is rendered anticlockwise
        }

        textPathElement.textContent = combinedText;

        // Append the textPath to the text element
        eventText.appendChild(textPathElement);

        // Append the text element to the SVG
        svg.appendChild(eventText);
      }
    });

    // Add drop shadow filter for text
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.setAttribute('id', 'text-shadow');
    filter.setAttribute('x', '-20%');
    filter.setAttribute('y', '-20%');
    filter.setAttribute('width', '140%');
    filter.setAttribute('height', '140%');

    const feDropShadow = document.createElementNS('http://www.w3.org/2000/svg', 'feDropShadow');
    feDropShadow.setAttribute('dx', '0');
    feDropShadow.setAttribute('dy', '0');
    feDropShadow.setAttribute('stdDeviation', '2');
    feDropShadow.setAttribute('flood-color', '#000000');
    feDropShadow.setAttribute('flood-opacity', '0.7');

    filter.appendChild(feDropShadow);
    defs.appendChild(filter);
    svg.appendChild(defs);

    // Now add compass center AFTER all needles to ensure higher z-index
    const centerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    centerCircle.setAttribute('cx', centerX);
    centerCircle.setAttribute('cy', centerY);
    centerCircle.setAttribute('r', innerRadius);
    centerCircle.setAttribute('fill', STYLES.accentColor);
    svg.appendChild(centerCircle);

    // Make sure the percentage is added last to be on top of everything
    const percentageText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    percentageText.setAttribute('x', centerX);
    percentageText.setAttribute('y', centerY);
    percentageText.setAttribute('text-anchor', 'middle');
    percentageText.setAttribute('dominant-baseline', 'middle');
    percentageText.setAttribute('fill', STYLES.backgroundColor);
    percentageText.setAttribute('font-size', '24px');
    percentageText.setAttribute('font-weight', 'bold');
    percentageText.textContent = `${Math.round((data.completedCount / 4) * 100)}%`;
    svg.appendChild(percentageText);

    compassContainer.appendChild(svg);
    container.appendChild(compassContainer);

    // Add download button
    addDownloadButton(container);

    return container;
  }

  function addDownloadButton(container) {
    const btnContainer = document.createElement('div');
    btnContainer.style.marginTop = '15px';
    btnContainer.id = 'compass-download-btn-container';

    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = '💾 Save as Image';
    downloadBtn.style.padding = '8px 15px';
    downloadBtn.style.backgroundColor = STYLES.accentColor;
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
      this.style.backgroundColor = STYLES.accentColor;
    });

    // Download handler
    downloadBtn.addEventListener('click', function () {
      // Hide the download button temporarily for the screenshot
      downloadBtn.style.display = 'none';

      // Use html2canvas to capture the container
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
        link.download = `compass-challenge-${parkrunnerId}-${timestamp}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      });
    });

    btnContainer.appendChild(downloadBtn);
    container.appendChild(btnContainer);
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

  function initCompassChallenge() {
    const resultsTable = document.querySelector('#results');
    if (!resultsTable) {
      console.log('Results table not found');
      return;
    }

    // Extract data
    const table = findResultsTable();
    const data = extractCompassData(table);
    const compassContainer = createCompass(data);
    insertAfterTitle(compassContainer);
  }

  // Run the script
  initCompassChallenge();
})();
