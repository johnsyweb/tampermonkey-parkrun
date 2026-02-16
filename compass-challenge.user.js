// ==UserScript==
// @name         parkrun Compass Challenge
// @description  Visualizes your progress on the compass challenge (North, South, East, West parkruns)
// @author       Pete Johns (@johnsyweb)
// @downloadURL  https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/compass-challenge.user.js
// @grant        none
// @homepage     https://www.johnsy.com/tampermonkey-parkrun/
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
// @version      1.1.0
// ==/UserScript==
// DO NOT EDIT - generated from src/ by scripts/build-scripts.js

function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t.return && (u = t.return(), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }


(function () {
  'use strict';

  var STYLES = {
    backgroundColor: '#2b223d',
    accentColor: '#FFA300',
    completedColor: '#53BA9D',
    pendingColor: '#666',
    textColor: '#e0e0e0',
    subtleTextColor: '#cccccc'
  };

  // Patterns to match compass directions in parkrun names
  var DIRECTION_PATTERNS = {
    north: /north/i,
    south: /south/i,
    east: /east/i,
    west: /west/i
  };
  function getResponsiveConfig() {
    var mobileConfig = {
      isMobile: true,
      spacing: {
        small: '10px',
        medium: '15px',
        statsMarginBottom: '8px',
        completionMarginTop: '8px'
      },
      container: {
        padding: '10px',
        marginTop: '10px'
      },
      typography: {
        heading: '1.1em',
        stats: '1em',
        statsSubtext: '0.9em',
        completion: '0.95em'
      },
      compass: {
        baseSize: 320
      },
      button: {
        padding: '6px 12px',
        fontSize: '0.9em',
        marginTop: '10px'
      }
    };
    var desktopConfig = {
      isMobile: false,
      spacing: {
        small: '20px',
        medium: '20px',
        statsMarginBottom: '10px',
        completionMarginTop: '10px'
      },
      container: {
        padding: '20px',
        marginTop: '20px'
      },
      typography: {
        heading: '1.3em',
        stats: '1.2em',
        statsSubtext: '1em',
        completion: '1.1em'
      },
      compass: {
        baseSize: 700
      },
      button: {
        padding: '8px 15px',
        fontSize: '1em',
        marginTop: '15px'
      }
    };
    var isMobile = window.innerWidth < 768;
    return isMobile ? mobileConfig : desktopConfig;
  }
  function findResultsTable() {
    var tables = document.querySelectorAll('#results');
    return tables[tables.length - 1];
  }
  function extractCompassData(table) {
    var directions = {
      north: null,
      south: null,
      east: null,
      west: null
    };
    var completedCount = 0;
    var dateOfCompletion = null;
    var totalEvents = 0;
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
      allResults.push({
        eventName: eventName,
        date: date,
        eventNumber: eventNumber,
        time: time
      });
    });

    // Process in chronological order (reverse the array)
    var reversedResults = allResults.reverse();
    for (var i = 0; !dateOfCompletion && i < reversedResults.length; i++) {
      var result = reversedResults[i];
      var eventName = result.eventName,
        date = result.date,
        eventNumber = result.eventNumber,
        time = result.time;
      totalEvents++;

      // Check for compass directions in the event name
      for (var _i = 0, _Object$entries = Object.entries(DIRECTION_PATTERNS); _i < _Object$entries.length; _i++) {
        var _Object$entries$_i = _slicedToArray(_Object$entries[_i], 2),
          direction = _Object$entries$_i[0],
          pattern = _Object$entries$_i[1];
        if (pattern.test(eventName) && !directions[direction]) {
          directions[direction] = {
            eventName: eventName,
            date: date,
            eventNumber: eventNumber,
            time: time
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
      directions: directions,
      completedCount: completedCount,
      dateOfCompletion: dateOfCompletion,
      totalEvents: totalEvents
    };
  }
  function createCompassContainer(title) {
    var responsive = getResponsiveConfig();
    var container = document.createElement('div');
    container.className = 'parkrun-compass-container';
    container.style.width = '100%';
    container.style.maxWidth = '800px';
    container.style.margin = "".concat(responsive.container.marginTop, " auto");
    container.style.padding = responsive.container.padding;
    container.style.backgroundColor = STYLES.backgroundColor;
    container.style.borderRadius = '8px';
    container.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    container.style.textAlign = 'center';
    var heading = document.createElement('h3');
    heading.textContent = title;
    heading.style.marginBottom = responsive.spacing.small;
    heading.style.color = STYLES.accentColor;
    heading.style.fontSize = responsive.typography.heading;
    container.appendChild(heading);
    return container;
  }
  function createCompass(data) {
    var responsive = getResponsiveConfig();
    var container = createCompassContainer('Compass Challenge');

    // Add stats
    var statsContainer = document.createElement('div');
    statsContainer.style.marginBottom = responsive.spacing.small;
    statsContainer.style.color = STYLES.textColor;
    var statsText = "<div style=\"font-size: ".concat(responsive.typography.stats, "; margin-bottom: ").concat(responsive.spacing.statsMarginBottom, ";\"><strong>").concat(data.completedCount, " of 4</strong> compass directions completed</div>");
    statsText += "<div style=\"font-size: ".concat(responsive.typography.statsSubtext, ";\">After ").concat(data.totalEvents, " parkruns</div>");
    if (data.dateOfCompletion) {
      statsText += "<div style=\"margin-top: ".concat(responsive.spacing.completionMarginTop, "; font-size: ").concat(responsive.typography.completion, ";\">\uD83E\uDDED Challenge completed on ").concat(data.dateOfCompletion, "</div>");
    }
    statsContainer.innerHTML = statsText;
    container.appendChild(statsContainer);

    // Calculate responsive compass size
    var desktopBaseSize = 700; // Reference size for scaling calculations
    var baseSize = responsive.isMobile ? Math.min(responsive.compass.baseSize, window.innerWidth - 40) : responsive.compass.baseSize;

    // Create compass visual
    var compassContainer = document.createElement('div');
    compassContainer.style.position = 'relative';
    compassContainer.style.width = "".concat(baseSize, "px");
    compassContainer.style.height = "".concat(baseSize, "px");
    compassContainer.style.margin = '0 auto';
    compassContainer.style.boxSizing = 'content-box';

    // Create SVG for compass
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('viewBox', "0 0 ".concat(desktopBaseSize, " ").concat(desktopBaseSize));
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';

    // Define centers and radius (using fixed coordinate system - viewBox handles scaling)
    var centerX = 350;
    var centerY = 350;
    var innerRadius = 30;
    var outerRadius = 230;

    // Create the main compass circle
    var compassCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    compassCircle.setAttribute('cx', centerX);
    compassCircle.setAttribute('cy', centerY);
    compassCircle.setAttribute('r', outerRadius);
    compassCircle.setAttribute('fill', '#334');
    compassCircle.setAttribute('stroke', STYLES.accentColor);
    compassCircle.setAttribute('stroke-width', '5');
    svg.appendChild(compassCircle);

    // First add directions and paths - we'll add the center rose later to ensure higher z-index
    var directions = [{
      name: 'north',
      angle: 270,
      label: 'N',
      data: data.directions.north
    }, {
      name: 'east',
      angle: 0,
      label: 'E',
      data: data.directions.east
    }, {
      name: 'south',
      angle: 90,
      label: 'S',
      data: data.directions.south
    }, {
      name: 'west',
      angle: 180,
      label: 'W',
      data: data.directions.west
    }];

    // Draw the needle for each direction
    directions.forEach(function (dir) {
      var angle = dir.angle * (Math.PI / 180);

      // Calculate the coordinates for the diamond shape
      var tipX = centerX + outerRadius * Math.cos(angle);
      var tipY = centerY + outerRadius * Math.sin(angle);

      // Calculate the middle point (50% from center to edge)
      var midDistance = outerRadius * 0.5;
      var needleWidth = outerRadius * 0.12;
      var midPointX = centerX + midDistance * Math.cos(angle);
      var midPointY = centerY + midDistance * Math.sin(angle);

      // Calculate the perpendicular angle
      var perpAngle = angle + Math.PI / 2;

      // Calculate width points at the middle of the needle
      var widthX1 = midPointX + needleWidth * Math.cos(perpAngle);
      var widthY1 = midPointY + needleWidth * Math.sin(perpAngle);
      var widthX2 = midPointX - needleWidth * Math.cos(perpAngle);
      var widthY2 = midPointY - needleWidth * Math.sin(perpAngle);

      // Create needle path
      var needlePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      var pathData = "M ".concat(centerX, " ").concat(centerY, " L ").concat(widthX1, " ").concat(widthY1, " L ").concat(tipX, " ").concat(tipY, " L ").concat(widthX2, " ").concat(widthY2, " Z");
      needlePath.setAttribute('d', pathData);
      needlePath.setAttribute('fill', dir.data ? STYLES.completedColor : STYLES.pendingColor);
      needlePath.setAttribute('stroke', '#000');
      needlePath.setAttribute('stroke-width', '1');
      needlePath.setAttribute('stroke-opacity', '0.3');
      svg.appendChild(needlePath);

      // Add direction label (N, E, S, W)
      var labelDistance = outerRadius * 0.5;
      var labelX = centerX + labelDistance * Math.cos(angle);
      var labelY = centerY + labelDistance * Math.sin(angle);
      var dirLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
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
        var nameMatch = dir.data.eventName.match(/(.+?)(?:\s+parkrun)?$/i);
        var displayName = nameMatch ? nameMatch[1] : dir.data.eventName;

        // Create combined text (name and date)
        var combinedText = "".concat(displayName, " - ").concat(dir.data.date);

        // Create curved text path around the outside of the circle
        var pathId = "text-path-".concat(dir.name);
        var textPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');

        // Create curved path for each direction that follows the circle circumference
        var pathD = '';
        var adjustedOffset = outerRadius + 15; // Match the offset used for other directions
        var pathWidth = 170;
        switch (dir.name) {
          case 'north':
            pathD = "M ".concat(centerX - pathWidth, " ").concat(centerY - adjustedOffset, " A ").concat(adjustedOffset, " ").concat(adjustedOffset, " 0 0 1 ").concat(centerX + pathWidth, " ").concat(centerY - adjustedOffset);
            break;
          case 'east':
            pathD = "M ".concat(centerX + adjustedOffset, " ").concat(centerY - pathWidth, " A ").concat(adjustedOffset, " ").concat(adjustedOffset, " 0 0 1 ").concat(centerX + adjustedOffset, " ").concat(centerY + pathWidth);
            break;
          case 'south':
            // Arc from left to right across the bottom (text curves anticlockwise)
            pathD = "M ".concat(centerX - pathWidth, " ").concat(centerY + adjustedOffset, " A ").concat(adjustedOffset, " ").concat(adjustedOffset, " 0 0 0 ").concat(centerX + pathWidth, " ").concat(centerY + adjustedOffset);
            break;
          case 'west':
            pathD = "M ".concat(centerX - adjustedOffset, " ").concat(centerY + pathWidth, " A ").concat(adjustedOffset, " ").concat(adjustedOffset, " 0 0 1 ").concat(centerX - adjustedOffset, " ").concat(centerY - pathWidth);
            break;
          default:
            console.warn("Unknown direction: ".concat(dir.name));
            break;
        }
        textPath.setAttribute('id', pathId);
        textPath.setAttribute('d', pathD);
        textPath.setAttribute('fill', 'none');
        svg.appendChild(textPath);

        // Create the text element
        var eventText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        eventText.setAttribute('fill', '#FFFFFF');
        eventText.setAttribute('font-size', '14px');
        eventText.setAttribute('font-weight', 'bold');

        // Create the textPath element
        var textPathElement = document.createElementNS('http://www.w3.org/2000/svg', 'textPath');
        textPathElement.setAttribute('href', "#".concat(pathId));
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
    var defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    var filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.setAttribute('id', 'text-shadow');
    filter.setAttribute('x', '-20%');
    filter.setAttribute('y', '-20%');
    filter.setAttribute('width', '140%');
    filter.setAttribute('height', '140%');
    var feDropShadow = document.createElementNS('http://www.w3.org/2000/svg', 'feDropShadow');
    feDropShadow.setAttribute('dx', '0');
    feDropShadow.setAttribute('dy', '0');
    feDropShadow.setAttribute('stdDeviation', '2');
    feDropShadow.setAttribute('flood-color', '#000000');
    feDropShadow.setAttribute('flood-opacity', '0.7');
    filter.appendChild(feDropShadow);
    defs.appendChild(filter);
    svg.appendChild(defs);

    // Now add compass center AFTER all needles to ensure higher z-index
    var centerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    centerCircle.setAttribute('cx', centerX);
    centerCircle.setAttribute('cy', centerY);
    centerCircle.setAttribute('r', innerRadius);
    centerCircle.setAttribute('fill', STYLES.accentColor);
    svg.appendChild(centerCircle);

    // Make sure the percentage is added last to be on top of everything
    var percentageText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    percentageText.setAttribute('x', centerX);
    percentageText.setAttribute('y', centerY);
    percentageText.setAttribute('text-anchor', 'middle');
    percentageText.setAttribute('dominant-baseline', 'middle');
    percentageText.setAttribute('fill', STYLES.backgroundColor);
    percentageText.setAttribute('font-size', '24px');
    percentageText.setAttribute('font-weight', 'bold');
    percentageText.textContent = "".concat(Math.round(data.completedCount / 4 * 100), "%");
    svg.appendChild(percentageText);
    compassContainer.appendChild(svg);
    container.appendChild(compassContainer);

    // Add download button
    addDownloadButton(container);
    return container;
  }
  function addDownloadButton(container) {
    var responsive = getResponsiveConfig();
    var btnContainer = document.createElement('div');
    btnContainer.style.marginTop = responsive.button.marginTop;
    btnContainer.id = 'compass-download-btn-container';
    var downloadBtn = document.createElement('button');
    downloadBtn.textContent = '💾 Save as Image';
    downloadBtn.style.padding = responsive.button.padding;
    downloadBtn.style.backgroundColor = STYLES.accentColor;
    downloadBtn.style.color = STYLES.backgroundColor;
    downloadBtn.style.border = 'none';
    downloadBtn.style.borderRadius = '4px';
    downloadBtn.style.cursor = 'pointer';
    downloadBtn.style.fontWeight = 'bold';
    downloadBtn.style.fontSize = responsive.button.fontSize;

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
        link.download = "compass-challenge-".concat(parkrunnerId, "-").concat(timestamp, ".png");
        link.href = canvas.toDataURL('image/png');
        link.click();
      });
    });
    btnContainer.appendChild(downloadBtn);
    container.appendChild(btnContainer);
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
  function initCompassChallenge() {
    var resultsTable = document.querySelector('#results');
    if (!resultsTable) {
      console.log('Results table not found');
      return;
    }

    // Extract data
    var table = findResultsTable();
    var data = extractCompassData(table);
    var compassContainer = createCompass(data);
    insertAfterTitle(compassContainer);
  }

  // Run the script
  initCompassChallenge();
})();