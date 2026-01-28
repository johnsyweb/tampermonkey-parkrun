// ==UserScript==
// @name         parkrun Position Bingo Challenge
// @description  Tracks progress on the unofficial parkrun position bingo challenge (last two digits of position) with a 10x10 grid visualization and detailed event info.
// @author       Pete Johns (@johnsyweb)
// @downloadURL  https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/position-bingo.user.js
// @grant        none
// @homepage     https://www.johnsy.com/tampermonkey-parkrun//
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
// @updateURL    https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/position-bingo.user.js
// @version      1.0.70
// ==/UserScript==
// DO NOT EDIT - generated from src/ by scripts/build-scripts.js
// Built: 2026-01-27T23:51:00.906Z

function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t.return || t.return(); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }


(function () {
  'use strict';

  var GRID_SIZE = 100;
  function getResponsiveConfig() {
    var mobileConfig = {
      isMobile: true,
      container: {
        padding: '10px',
        marginTop: '10px'
      },
      typography: {
        heading: '1.1em',
        stats: '1em',
        statsSubtext: '0.9em'
      },
      grid: {
        boxSize: 28,
        gapSize: 3,
        cellFontSize: '0.7em',
        cellPadding: '1px',
        positionFontSize: '0.9em',
        eventFontSize: '0.65em',
        dateFontSize: '0.6em'
      },
      button: {
        padding: '6px 12px',
        fontSize: '0.9em',
        marginTop: '10px'
      }
    };
    var desktopConfig = {
      isMobile: false,
      container: {
        padding: '20px',
        marginTop: '20px'
      },
      typography: {
        heading: '1.3em',
        stats: '1.2em',
        statsSubtext: '1em'
      },
      grid: {
        boxSize: 100,
        gapSize: 5,
        cellFontSize: '0.9em',
        cellPadding: '2px',
        positionFontSize: '1.2em',
        eventFontSize: '0.8em',
        dateFontSize: '0.7em'
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
  function extractPositionBingoData(table) {
    var completedPositions = {};
    var rows = Array.from(table.querySelectorAll('tr')).reverse(); // Reverse rows for chronological order
    var totalEvents = 0;
    var _iterator = _createForOfIteratorHelper(rows),
      _step;
    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var row = _step.value;
        var cells = row.querySelectorAll('td');
        if (cells.length < 5) continue; // Ensure the row has enough columns

        var position = cells[3].textContent.trim(); // 'pos' column is the 4th column (index 3)
        var lastTwoDigits = parseInt(position.slice(-2), 10); // Extract last two digits
        var eventName = cells[0].textContent.trim();
        var date = cells[1].textContent.trim();
        if (!isNaN(lastTwoDigits) && lastTwoDigits >= 0 && lastTwoDigits < GRID_SIZE) {
          if (!completedPositions[lastTwoDigits]) {
            completedPositions[lastTwoDigits] = [];
          }
          completedPositions[lastTwoDigits].push({
            eventName: eventName,
            date: date,
            position: position
          });

          // Stop processing if all 100 positions are attained
          if (Object.keys(completedPositions).length === GRID_SIZE) {
            break;
          }
        }
        totalEvents++;
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }
    return {
      completedPositions: completedPositions,
      remainingPositions: Array.from({
        length: GRID_SIZE
      }, function (_, i) {
        return i;
      }).filter(function (pos) {
        return !completedPositions[pos];
      }),
      completedCount: Object.keys(completedPositions).length,
      totalEvents: totalEvents
    };
  }
  function createPositionBingoContainer(data) {
    var responsive = getResponsiveConfig();
    var container = document.createElement('div');
    container.id = 'positionBingoContainer';
    container.className = 'parkrun-position-bingo-container';
    container.style.width = '100%';
    container.style.maxWidth = '1200px';
    container.style.margin = "".concat(responsive.container.marginTop, " auto");
    container.style.padding = responsive.container.padding;
    container.style.backgroundColor = '#2b223d';
    container.style.borderRadius = '8px';
    container.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    container.style.color = '#e0e0e0';
    container.style.textAlign = 'center';
    var heading = document.createElement('h3');
    heading.textContent = 'Position Bingo Challenge';
    heading.style.marginBottom = responsive.isMobile ? '8px' : '10px';
    heading.style.color = '#FFA300';
    heading.style.fontSize = responsive.typography.heading;
    container.appendChild(heading);
    var stats = document.createElement('div');
    stats.innerHTML = "<div style=\"font-size: ".concat(responsive.typography.stats, "; margin-bottom: ").concat(responsive.isMobile ? '8px' : '10px', ";\">") + '<strong>' + data.completedCount + ' of ' + GRID_SIZE + '</strong> positions completed</div>' + "<div style=\"font-size: ".concat(responsive.typography.statsSubtext, ";\">After ") + data.totalEvents + ' parkruns</div>';
    container.appendChild(stats);
    var COLUMNS = 10;
    var ROWS = Math.ceil(GRID_SIZE / COLUMNS);
    var BOX_SIZE = responsive.grid.boxSize;
    var GAP_SIZE = responsive.grid.gapSize;
    var grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = "repeat(".concat(COLUMNS, ", ").concat(BOX_SIZE, "px)");
    grid.style.gridTemplateRows = "repeat(".concat(ROWS, ", ").concat(BOX_SIZE, "px)");
    grid.style.gap = "".concat(GAP_SIZE, "px");
    grid.style.margin = '0 auto';
    grid.style.justifyContent = 'center';
    var _loop = function _loop(i) {
      var cell = document.createElement('div');
      cell.style.boxSizing = 'border-box'; // Include borders in size calculations
      cell.style.border = '1px solid #666';
      cell.style.borderRadius = '4px';
      cell.style.backgroundColor = data.completedPositions[i] ? '#FFA300' : '#008080'; // Orange for completed, teal for unattained
      cell.style.color = '#fff';
      cell.style.textAlign = 'left';
      cell.style.padding = responsive.grid.cellPadding;
      cell.style.fontWeight = 'bold';
      cell.style.fontSize = responsive.grid.cellFontSize;
      cell.style.cursor = data.completedPositions[i] ? 'pointer' : 'default';
      cell.style.aspectRatio = '1'; // Ensure cells are square

      var positionText = document.createElement('div');
      positionText.textContent = i.toString().padStart(2, '0'); // Display as two-digit number
      positionText.style.fontSize = responsive.grid.positionFontSize;
      positionText.style.marginBottom = responsive.isMobile ? '2px' : '5px';
      cell.appendChild(positionText);
      if (data.completedPositions[i]) {
        var eventDetails = document.createElement('div');
        eventDetails.innerHTML = "<div style=\"font-size: ".concat(responsive.grid.eventFontSize, "; text-align: center;\">") + data.completedPositions[i][0].eventName + '<br>' + "<span style=\"font-size: ".concat(responsive.grid.dateFontSize, ";\">") + data.completedPositions[i][0].date + ' (' + data.completedPositions[i][0].position + ')</span>' + '</div>';
        // Hide event details on mobile to prevent text overflow
        if (responsive.isMobile) {
          eventDetails.style.display = 'none';
        }
        cell.appendChild(eventDetails);

        // Add click handler for popup
        cell.addEventListener('click', function () {
          var popupResponsive = getResponsiveConfig();
          var overlay = document.createElement('div');
          overlay.style.position = 'fixed';
          overlay.style.top = '0';
          overlay.style.left = '0';
          overlay.style.width = '100%';
          overlay.style.height = '100%';
          overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
          overlay.style.zIndex = '999';
          overlay.addEventListener('click', function () {
            document.body.removeChild(overlay);
          });
          var popup = document.createElement('div');
          popup.style.position = 'fixed';
          popup.style.top = '50%';
          popup.style.left = '50%';
          popup.style.transform = 'translate(-50%, -50%)';
          popup.style.backgroundColor = '#2b223d';
          popup.style.color = '#fff';
          var popupPadding = popupResponsive.isMobile ? '15px' : '20px';
          popup.style.padding = popupPadding;
          popup.style.borderRadius = '8px';
          popup.style.boxShadow = '0 2px 4px rgba(0,0,0,0.5)';
          popup.style.zIndex = '1000';
          popup.style.maxWidth = popupResponsive.isMobile ? '95%' : '90%';
          popup.style.maxHeight = popupResponsive.isMobile ? '85%' : '80%';
          popup.style.overflowY = 'auto';
          popup.style.fontSize = popupResponsive.isMobile ? '0.9em' : '1em';
          var popupHeading = document.createElement('h4');
          popupHeading.textContent = "Position ".concat(i.toString().padStart(2, '0'));
          popupHeading.style.marginBottom = '10px';
          popupHeading.style.color = '#FFA300';
          popup.appendChild(popupHeading);
          data.completedPositions[i].forEach(function (_ref) {
            var eventName = _ref.eventName,
              date = _ref.date,
              position = _ref.position;
            var entry = document.createElement('div');
            entry.style.marginBottom = '10px';
            entry.innerHTML = '<strong>' + eventName + '</strong><br>' + '<span style="font-size: 0.9em;">' + date + ' (' + position + ')</span>';
            popup.appendChild(entry);
          });
          overlay.appendChild(popup);
          document.body.appendChild(overlay);
        });
      }
      grid.appendChild(cell);
    };
    for (var i = 0; i < GRID_SIZE; i++) {
      _loop(i);
    }
    container.appendChild(grid);
    addDownloadButton(container);
    return container;
  }
  function addDownloadButton(container) {
    var responsive = getResponsiveConfig();
    var btnContainer = document.createElement('div');
    btnContainer.style.marginTop = responsive.button.marginTop;
    btnContainer.id = 'position-bingo-download-btn-container';
    var downloadBtn = document.createElement('button');
    downloadBtn.textContent = '💾 Save as Image';
    downloadBtn.style.padding = responsive.button.padding;
    downloadBtn.style.backgroundColor = '#FFA300';
    downloadBtn.style.color = '#2b223d';
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
      this.style.backgroundColor = '#FFA300';
    });

    // Download handler
    downloadBtn.addEventListener('click', function () {
      // Hide the download button temporarily for the screenshot
      downloadBtn.style.display = 'none';

      // Use html2canvas to capture the container
      // eslint-disable-next-line no-undef
      html2canvas(container, {
        backgroundColor: '#2b223d',
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
        link.download = "position-bingo-".concat(parkrunnerId, "-").concat(timestamp, ".png");
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
  function initPositionBingoChallenge() {
    var resultsTable = findResultsTable();
    if (!resultsTable) {
      console.log('Results table not found');
      return;
    }
    var data = extractPositionBingoData(resultsTable);
    var positionBingoContainer = createPositionBingoContainer(data);
    insertAfterTitle(positionBingoContainer);
  }
  initPositionBingoChallenge();
})();