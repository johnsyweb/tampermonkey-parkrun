// ==UserScript==
// @name         parkrun Stopwatch Bingo
// @description  Visualizes your progress on the stopwatch bingo challenge (collecting seconds 00-59)
// @author       Pete Johns (@johnsyweb)
// @downloadURL  https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/stopwatch-bingo.user.js
// @grant        none
// @homepage     https://johnsy.com/tampermonkey-parkrun/
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
// @version      1.0.62
// ==/UserScript==
// DO NOT EDIT - generated from src/ by scripts/build-scripts.js
// Built: 2026-01-14T02:06:18.316Z

(function () {
  'use strict';

  var STYLES = {
    backgroundColor: '#2b223d',
    clockBorderColor: '#FFA300',
    clockFaceColor: '#333',
    completedColor: '#FFA300',
    textColor: '#e0e0e0',
    subtleTextColor: '#cccccc'
  };
  function findResultsTable() {
    var tables = document.querySelectorAll('#results');
    return tables[tables.length - 1];
  }
  function extractFinishTimes(table) {
    var seconds = {};
    var timeData = {};
    var collectedCount = 0;
    var totalParkruns = 0;
    var firstCompleteEvent = null;
    var dateOfCompletion = null;
    var rows = table.querySelectorAll('tr');
    // First collect all results since they're in reverse order
    var allResults = [];
    rows.forEach(function (row) {
      var cells = row.querySelectorAll('td');
      if (cells.length < 5) return;
      var eventName = cells[0].textContent.trim();
      var date = cells[1].textContent.trim();
      var eventNumber = cells[2].textContent.trim();
      var time = cells[4].textContent.trim();
      if (!time || !eventNumber || !date || !eventName) return;
      var event = "".concat(eventName, " # ").concat(eventNumber);

      // Parse seconds from time (either MM:SS or HH:MM:SS format)
      var secondValue;
      var hourMatch = time.match(/(\d+):(\d+):(\d+)/);
      if (hourMatch) {
        secondValue = parseInt(hourMatch[3], 10);
      } else {
        var minuteMatch = time.match(/(\d+):(\d+)/);
        if (!minuteMatch) return;
        secondValue = parseInt(minuteMatch[2], 10);
      }
      allResults.push({
        secondValue: secondValue,
        date: date,
        event: event,
        time: time
      });
    });

    // Process in chronological order (reverse the array)
    var reversedResults = allResults.reverse();
    for (var i = 0; i < reversedResults.length; i++) {
      var result = reversedResults[i];
      var secondValue = result.secondValue,
        date = result.date,
        event = result.event,
        time = result.time;
      totalParkruns++;

      // Only store if we haven't seen this second yet
      if (!(secondValue in seconds)) {
        seconds[secondValue] = {
          date: date,
          event: event,
          time: time
        };
        collectedCount++;

        // Check if we've completed the bingo
        if (collectedCount === 60 && !dateOfCompletion) {
          dateOfCompletion = date;
          firstCompleteEvent = event;
          timeData[secondValue] = [{
            date: date,
            event: event,
            time: time
          }];
          break;
        }
      }

      // Store all occurrences for tooltip data
      if (!timeData[secondValue]) {
        timeData[secondValue] = [];
      }
      timeData[secondValue].push({
        date: date,
        event: event,
        time: time
      });
    }
    return {
      seconds: seconds,
      timeData: timeData,
      collectedCount: collectedCount,
      totalParkruns: totalParkruns,
      dateOfCompletion: dateOfCompletion,
      firstCompleteEvent: firstCompleteEvent
    };
  }
  function createClockContainer(title) {
    var container = document.createElement('div');
    if (!container.id) container.id = 'stopwatchBingoContainer';
    container.className = 'parkrun-bingo-container';
    container.style.width = '100%';
    container.style.maxWidth = '800px';
    container.style.margin = '20px auto';
    container.style.padding = window.innerWidth < 768 ? '10px' : '20px';
    container.style.backgroundColor = STYLES.backgroundColor;
    container.style.borderRadius = '8px';
    container.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    container.style.textAlign = 'center';
    var heading = document.createElement('h3');
    heading.textContent = title;
    heading.style.marginBottom = '15px';
    heading.style.color = STYLES.clockBorderColor;
    heading.style.fontSize = window.innerWidth < 768 ? '1.1em' : '1.3em';
    container.appendChild(heading);
    return container;
  }
  function createBingoClock(data) {
    var container = createClockContainer('Stopwatch Bingo Challenge');

    // Calculate responsive clock size (smaller on mobile)
    var isMobile = window.innerWidth < 768;

    // Add stats
    var statsContainer = document.createElement('div');
    statsContainer.style.marginBottom = isMobile ? '10px' : '20px';
    statsContainer.style.color = STYLES.textColor;
    var statsFontSize = isMobile ? '1em' : '1.2em';
    var completionFontSize = isMobile ? '0.95em' : '1.1em';
    var statsText = "<div style=\"font-size: ".concat(statsFontSize, "; margin-bottom: 10px;\"><strong>").concat(data.collectedCount, " of 60</strong> seconds collected</div>");
    statsText += "<div style=\"font-size: ".concat(isMobile ? '0.9em' : '1em', ";\">After ").concat(data.totalParkruns, " parkruns</div>");
    if (data.dateOfCompletion) {
      statsText += "<div style=\"margin-top: 10px; font-size: ".concat(completionFontSize, ";\">\uD83C\uDFC6 Bingo completed on ").concat(data.dateOfCompletion, " (").concat(data.firstCompleteEvent, ")</div>");
    }
    statsContainer.innerHTML = statsText;
    container.appendChild(statsContainer);

    // Calculate responsive clock size (smaller on mobile)
    var baseSize = isMobile ? Math.min(320, window.innerWidth - 40) : 500;
    var scale = baseSize / 500; // Scale factor for all dimensions

    // Create clock face
    var clockContainer = document.createElement('div');
    clockContainer.style.position = 'relative';
    clockContainer.style.width = "".concat(baseSize, "px");
    clockContainer.style.height = "".concat(baseSize, "px");
    clockContainer.style.margin = '0 auto';
    clockContainer.style.borderRadius = '50%';
    clockContainer.style.border = "".concat(Math.round(10 * scale), "px solid ").concat(STYLES.clockBorderColor);
    clockContainer.style.backgroundColor = STYLES.clockFaceColor;
    clockContainer.style.boxSizing = 'content-box';

    // Determine maximum frequency to scale segment lengths
    var maxOccurrences = 1;
    for (var i = 0; i < 60; i++) {
      var occ = data.timeData[i] ? data.timeData[i].length : 0;
      if (occ > maxOccurrences) maxOccurrences = occ;
    }

    // Add the second segments first (so they're at the bottom layer)
    var _loop = function _loop(_i) {
      var hasSecond = _i in data.seconds;
      if (!hasSecond) return 1; // continue
      // Only render segments for collected seconds

      var occurrences = data.timeData[_i] ? data.timeData[_i].length : 0;

      // Calculate angles for this segment (0 seconds at top, moving clockwise)
      var startAngle = ((_i - 0.4) / 60 * 360 - 90) * (Math.PI / 180);
      var endAngle = ((_i + 0.4) / 60 * 360 - 90) * (Math.PI / 180);

      // Create a segment using SVG path
      var segment = document.createElement('div');
      segment.style.position = 'absolute';
      segment.style.top = '0';
      segment.style.left = '0';
      segment.style.width = '100%';
      segment.style.height = '100%';
      segment.style.pointerEvents = 'none'; // Make it non-blocking for clicks

      // Base radii (scaled for responsive sizing)
      var maxRadius = 220 * scale; // Leave space for indices
      var innerHoleRadius = 50 * scale; // Matches the visual centre (100px diameter)
      var centerX = baseSize / 2;
      var centerY = baseSize / 2;

      // Create SVG element for the segment
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
      svg.style.position = 'absolute';
      svg.style.top = '0';
      svg.style.left = '0';
      svg.style.zIndex = '1'; // Lower z-index to keep below indices

      // Create the path for the pie slice
      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

      // Calculate the points for the path as a ring sector clearing the centre
      // Vary the outer radius proportional to the number of occurrences
      var ringSpan = maxRadius - innerHoleRadius;
      var outerRadius = innerHoleRadius + Math.max(0, Math.round(occurrences / maxOccurrences * ringSpan));
      var innerStartX = centerX + innerHoleRadius * Math.cos(startAngle);
      var innerStartY = centerY + innerHoleRadius * Math.sin(startAngle);
      var outerStartX = centerX + outerRadius * Math.cos(startAngle);
      var outerStartY = centerY + outerRadius * Math.sin(startAngle);
      var outerEndX = centerX + outerRadius * Math.cos(endAngle);
      var outerEndY = centerY + outerRadius * Math.sin(endAngle);
      var innerEndX = centerX + innerHoleRadius * Math.cos(endAngle);
      var innerEndY = centerY + innerHoleRadius * Math.sin(endAngle);

      // Path goes from inner arc start to outer arc, around, then back along inner arc to close
      var pathData = ["M ".concat(innerStartX, ",").concat(innerStartY), "L ".concat(outerStartX, ",").concat(outerStartY), "A ".concat(outerRadius, ",").concat(outerRadius, " 0 0,1 ").concat(outerEndX, ",").concat(outerEndY), "L ".concat(innerEndX, ",").concat(innerEndY), "A ".concat(innerHoleRadius, ",").concat(innerHoleRadius, " 0 0,0 ").concat(innerStartX, ",").concat(innerStartY), 'Z'].join(' ');
      path.setAttribute('d', pathData);
      path.setAttribute('fill', STYLES.completedColor);
      path.setAttribute('opacity', '1');

      // Update title to show tooltip on hover
      path.setAttribute('title', "".concat(_i.toString().padStart(2, '0'), " Seconds - ").concat(occurrences, " ").concat(occurrences === 1 ? 'Time' : 'Times'));

      // Add click handler directly to the path for interaction
      path.style.cursor = 'pointer';
      path.style.pointerEvents = 'auto'; // Make path clickable

      path.addEventListener('click', function () {
        showSecondDetails(_i, data.timeData[_i]);
      });
      svg.appendChild(path);
      segment.appendChild(svg);
      clockContainer.appendChild(segment);
    };
    for (var _i = 0; _i < 60; _i++) {
      if (_loop(_i)) continue;
    }

    // Add stopwatch indices (markers at 5-second intervals) OVER the segments
    var indexSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    indexSvg.setAttribute('width', '100%');
    indexSvg.setAttribute('height', '100%');
    indexSvg.style.position = 'absolute';
    indexSvg.style.top = '0';
    indexSvg.style.left = '0';
    indexSvg.style.pointerEvents = 'none';
    indexSvg.style.zIndex = '2'; // Higher z-index to keep above segments

    // Create indices at 5-second intervals (0, 5, 10, etc.)
    for (var _i2 = 0; _i2 < 60; _i2 += 5) {
      // Calculate angle for this index
      var angle = _i2 / 60 * 360 - 90; // -90 to start at top
      var radians = angle * (Math.PI / 180);

      // Calculate position (outer edge of the clock)
      var indexOuterRadius = 245 * scale; // Just inside the border
      var indexInnerRadius = (_i2 % 15 === 0 ? 210 : 225) * scale; // Longer marks for 0, 15, 30, 45

      var centerX = baseSize / 2;
      var centerY = baseSize / 2;

      // Create line for index mark
      var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', centerX + indexInnerRadius * Math.cos(radians));
      line.setAttribute('y1', centerY + indexInnerRadius * Math.sin(radians));
      line.setAttribute('x2', centerX + indexOuterRadius * Math.cos(radians));
      line.setAttribute('y2', centerY + indexOuterRadius * Math.sin(radians));
      line.setAttribute('stroke', STYLES.textColor);
      line.setAttribute('stroke-width', (_i2 % 15 === 0 ? 3 : 2) * scale);
      indexSvg.appendChild(line);

      // Add numerical label for all 5-second intervals
      var textRadius = indexInnerRadius - (_i2 % 15 === 0 ? 25 : 20) * scale;
      var textX = centerX + textRadius * Math.cos(radians);
      var textY = centerY + textRadius * Math.sin(radians);
      var text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', textX);
      text.setAttribute('y', textY);
      text.setAttribute('fill', STYLES.textColor);
      text.setAttribute('font-size', "".concat((_i2 % 15 === 0 ? 16 : 14) * scale, "px"));
      text.setAttribute('font-weight', 'bold');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.textContent = _i2.toString();
      indexSvg.appendChild(text);
    }
    clockContainer.appendChild(indexSvg);
    var clockCenter = document.createElement('div');
    clockCenter.style.position = 'absolute';
    clockCenter.style.top = '50%';
    clockCenter.style.left = '50%';
    clockCenter.style.transform = 'translate(-50%, -50%)';
    clockCenter.style.width = "".concat(100 * scale, "px");
    clockCenter.style.height = "".concat(100 * scale, "px");
    clockCenter.style.borderRadius = '50%';
    clockCenter.style.backgroundColor = STYLES.clockBorderColor;
    clockCenter.style.display = 'flex';
    clockCenter.style.justifyContent = 'center';
    clockCenter.style.alignItems = 'center';
    clockCenter.style.color = STYLES.backgroundColor;
    clockCenter.style.fontWeight = 'bold';
    clockCenter.style.fontSize = "".concat(20 * scale, "px"); // Larger font for better readability
    clockCenter.style.zIndex = '3'; // Ensure it's on top
    clockCenter.textContent = "".concat(Math.round(data.collectedCount / 60 * 100), "%");
    clockContainer.appendChild(clockCenter);
    container.appendChild(clockContainer);
    addDownloadButton(container);

    // Add explanation
    var explanation = document.createElement('div');
    explanation.style.marginTop = isMobile ? '10px' : '20px';
    explanation.style.color = STYLES.subtleTextColor;
    explanation.style.fontSize = isMobile ? '0.8em' : '0.9em';
    explanation.style.padding = isMobile ? '0 5px' : '0';
    explanation.innerHTML = "Stopwatch Bingo: collect finish times with every second from 00-59.<br>Orange segments show seconds you've collected. Segment length indicates frequency.<br>Click on any segment to see details.";
    container.appendChild(explanation);
    return container;
  }
  function addDownloadButton(container) {
    var isMobile = window.innerWidth < 768;
    var btnContainer = document.createElement('div');
    btnContainer.style.marginTop = isMobile ? '10px' : '15px';
    btnContainer.id = 'bingo-download-btn-container';
    var downloadBtn = document.createElement('button');
    downloadBtn.textContent = '💾 Save as Image';
    downloadBtn.style.padding = isMobile ? '6px 12px' : '8px 15px';
    downloadBtn.style.backgroundColor = STYLES.clockBorderColor;
    downloadBtn.style.color = STYLES.backgroundColor;
    downloadBtn.style.border = 'none';
    downloadBtn.style.borderRadius = '4px';
    downloadBtn.style.cursor = 'pointer';
    downloadBtn.style.fontWeight = 'bold';
    downloadBtn.style.fontSize = isMobile ? '0.9em' : '1em';

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
        scale: 2,
        // Higher resolution
        logging: false,
        allowTaint: true,
        useCORS: true
      }).then(function (canvas) {
        // Show the button again
        downloadBtn.style.display = 'block';
        var link = document.createElement('a');
        var timestamp = new Date().toISOString().split('T')[0];
        var pageUrl = window.location.pathname.split('/');
        var parkrunnerId = pageUrl[2] || 'parkrunner';
        link.download = "stopwatch-bingo-".concat(parkrunnerId, "-").concat(timestamp, ".png");
        link.href = canvas.toDataURL('image/png');
        link.click();
      });
    });
    btnContainer.appendChild(downloadBtn);
    container.appendChild(btnContainer);
  }
  function showSecondDetails(second, times) {
    // Remove any existing details pop-up
    var existingPopup = document.getElementById('second-details-popup');
    if (existingPopup) {
      existingPopup.remove();
    }

    // Create popup
    var popup = document.createElement('div');
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
    var closeBtn = document.createElement('div');
    closeBtn.textContent = '✕';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '10px';
    closeBtn.style.right = '15px';
    closeBtn.style.fontSize = '20px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.addEventListener('click', function () {
      return popup.remove();
    });
    popup.appendChild(closeBtn);

    // Add title
    var title = document.createElement('h3');
    title.textContent = "".concat(second.toString().padStart(2, '0'), " Seconds - ").concat(times.length, " Times");
    title.style.marginBottom = '15px';
    title.style.color = STYLES.clockBorderColor;
    popup.appendChild(title);

    // Create table of occurrences
    var table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.marginTop = '10px';

    // Add table header
    var thead = document.createElement('thead');
    var headers = [{
      title: 'Date',
      align: 'left'
    }, {
      title: 'Event',
      align: 'left'
    }, {
      title: 'Time',
      align: 'left'
    }];
    var headerRow = document.createElement('tr');
    headers.forEach(function (header) {
      var th = document.createElement('th');
      th.textContent = header.title;
      th.style.textAlign = header.align;
      th.style.padding = '8px';
      th.style.borderBottom = '1px solid #555';
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Add table body
    var tbody = document.createElement('tbody');
    times.forEach(function (time, index) {
      var row = document.createElement('tr');
      row.style.backgroundColor = index === 0 ? 'rgba(255, 163, 0, 0.2)' : 'transparent';
      var cells = [{
        content: time.date
      }, {
        content: time.event
      }, {
        content: time.time
      }].map(function (cell) {
        return "<td style=\"padding: 8px; border-bottom: 1px solid #444;\">".concat(cell.content, "</td>");
      }).join('');
      row.innerHTML = cells;
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    popup.appendChild(table);
    document.body.appendChild(popup);

    // Add backdrop and close on click
    var backdrop = document.createElement('div');
    backdrop.style.position = 'fixed';
    backdrop.style.top = '0';
    backdrop.style.left = '0';
    backdrop.style.width = '100%';
    backdrop.style.height = '100%';
    backdrop.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    backdrop.style.zIndex = '999';
    backdrop.addEventListener('click', function () {
      popup.remove();
      backdrop.remove();
    });
    document.body.appendChild(backdrop);
  }
  function insertAfterTitle(element) {
    var pageTitle = document.querySelector('h2');
    if (pageTitle && pageTitle.parentNode) {
      if (pageTitle.nextSibling) {
        pageTitle.parentNode.insertBefore(element, pageTitle.nextSibling);
      } else {
        pageTitle.parentNode.appendChild(element);
      }
    }
  }
  function initStopwatchBingo() {
    var resultsTable = document.querySelector('#results');
    if (!resultsTable) {
      console.log('Results table not found');
      return;
    }

    // Extract name from the page title
    var pageTitle = document.querySelector('h2');
    if (!pageTitle) return;
    var table = findResultsTable();
    var data = extractFinishTimes(table);
    var clockContainer = createBingoClock(data);
    insertAfterTitle(clockContainer);
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      findResultsTable: findResultsTable,
      extractFinishTimes: extractFinishTimes
    };
  } else {
    initStopwatchBingo();
  }
})();