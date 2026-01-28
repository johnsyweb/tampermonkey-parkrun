// ==UserScript==
// @name         parkrun Charts
// @description  Displays charts on parkrun pages: finishers per minute on results pages and event history on event history pages
// @author       Pete Johns (@johnsyweb)
// @downloadURL  https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/parkrun-charts.user.js
// @grant        none
// @homepage     https://www.johnsy.com/tampermonkey-parkrun/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=parkrun.com.au
// @license      MIT
// @match        *://www.parkrun.ca/*/results/*
// @match        *://www.parkrun.co.at/*/results/*
// @match        *://www.parkrun.co.nl/*/results/*
// @match        *://www.parkrun.co.nz/*/results/*
// @match        *://www.parkrun.co.za/*/results/*
// @match        *://www.parkrun.com.au/*/results/*
// @match        *://www.parkrun.com.de/*/results/*
// @match        *://www.parkrun.dk/*/results/*
// @match        *://www.parkrun.fi/*/results/*
// @match        *://www.parkrun.fr/*/results/*
// @match        *://www.parkrun.ie/*/results/*
// @match        *://www.parkrun.it/*/results/*
// @match        *://www.parkrun.jp/*/results/*
// @match        *://www.parkrun.lt/*/results/*
// @match        *://www.parkrun.my/*/results/*
// @match        *://www.parkrun.no/*/results/*
// @match        *://www.parkrun.org.uk/*/results/*
// @match        *://www.parkrun.pl/*/results/*
// @match        *://www.parkrun.se/*/results/*
// @match        *://www.parkrun.sg/*/results/*
// @match        *://www.parkrun.us/*/results/*
// @namespace    http://tampermonkey.net/
// @require      https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js
// @require      https://html2canvas.hertzen.com/dist/html2canvas.min.js
// @run-at       document-end
// @supportURL   https://github.com/johnsyweb/tampermonkey-parkrun/issues/
// @tag          parkrun
// @updateURL    https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/parkrun-charts.user.js
// @version      1.0.67
// ==/UserScript==
// DO NOT EDIT - generated from src/ by scripts/build-scripts.js
// Built: 2026-01-28T08:26:27.264Z

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
    barColor: '#FFA300',
    lineColor: '#53BA9D',
    textColor: '#e0e0e0',
    subtleTextColor: '#cccccc',
    gridColor: 'rgba(200, 200, 200, 0.2)'
  };
  var DEBUG_WATERMARK = false;
  function createChartContainer(title, id) {
    var width = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 800;
    var container = document.createElement('div');
    container.className = 'parkrun-chart-container ' + id + '-container';
    container.style.width = '100%';
    container.style.maxWidth = width + 'px';
    container.style.margin = '20px auto';
    container.style.padding = '15px';
    container.style.backgroundColor = STYLES.backgroundColor;
    container.style.borderRadius = '8px';
    container.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    var heading = document.createElement('h3');
    heading.textContent = title;
    heading.style.textAlign = 'center';
    heading.style.marginBottom = '15px';
    heading.style.color = STYLES.barColor;
    container.appendChild(heading);
    var canvas = document.createElement('canvas');
    canvas.id = id;
    container.appendChild(canvas);
    return {
      container: container,
      canvas: canvas
    };
  }
  function insertAfterFirst(selector, element) {
    var pageTitle = document.querySelector(selector);
    if (pageTitle && pageTitle.parentNode) {
      if (pageTitle.nextSibling) {
        pageTitle.parentNode.insertBefore(element, pageTitle.nextSibling);
      } else {
        pageTitle.parentNode.appendChild(element);
      }
    }
  }
  function addChartDownloadButton(container) {
    var controlsContainer = document.createElement('div');
    controlsContainer.style.display = 'flex';
    controlsContainer.style.justifyContent = 'center';
    controlsContainer.style.marginTop = '10px';
    controlsContainer.style.marginBottom = '10px';
    var downloadBtn = document.createElement('button');
    downloadBtn.textContent = '💾 Save as Image';
    downloadBtn.style.padding = '6px 12px';
    downloadBtn.style.backgroundColor = STYLES.barColor;
    downloadBtn.style.color = '#2b223d';
    downloadBtn.style.border = 'none';
    downloadBtn.style.borderRadius = '4px';
    downloadBtn.style.cursor = 'pointer';
    downloadBtn.style.fontWeight = 'bold';
    downloadBtn.style.display = 'inline-block';
    downloadBtn.style.margin = '0 5px';
    downloadBtn.title = 'Download chart as PNG image';
    downloadBtn.addEventListener('mouseover', function () {
      this.style.backgroundColor = '#e59200';
    });
    downloadBtn.addEventListener('mouseout', function () {
      this.style.backgroundColor = STYLES.barColor;
    });
    downloadBtn.addEventListener('click', function () {
      downloadBtn.style.display = 'none';

      // eslint-disable-next-line no-undef
      html2canvas(container, {
        backgroundColor: STYLES.backgroundColor,
        scale: 2,
        logging: false,
        allowTaint: true,
        useCORS: true
      }).then(function (canvas) {
        downloadBtn.style.display = 'block';
        var link = document.createElement('a');
        var timestamp = new Date().toISOString().split('T')[0];
        var pageUrl = window.location.pathname.split('/');
        var eventName = pageUrl[1];
        var chartType = container.classList.contains('eventHistoryChart-container') ? 'event-history' : 'finishers';
        link.download = "".concat(eventName, "-").concat(chartType, "-").concat(timestamp, ".png");
        link.href = canvas.toDataURL('image/png');
        link.click();
      });
    });
    controlsContainer.appendChild(downloadBtn);
    container.appendChild(controlsContainer);
    return controlsContainer;
  }
  function extractFinishTimeData() {
    var timeData = {};
    var rows = document.querySelectorAll('tr.Results-table-row');
    var minMinute = Infinity;
    var maxMinute = 0;
    rows.forEach(function (row) {
      var timeCell = row.querySelector('td.Results-table-td--time');
      if (!timeCell) return;
      var timeText = timeCell.textContent.trim();
      var totalMinutes;
      var hourMatch = timeText.match(/(\d+):(\d+):(\d+)/);
      if (hourMatch) {
        var hours = parseInt(hourMatch[1]);
        var minutes = parseInt(hourMatch[2]);
        totalMinutes = hours * 60 + minutes;
      } else {
        var minuteMatch = timeText.match(/(\d+):(\d+)/);
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
    for (var min = minMinute; min <= maxMinute; min++) {
      if (!timeData[min]) {
        timeData[min] = 0;
      }
    }
    return {
      timeData: timeData,
      minMinute: minMinute,
      maxMinute: maxMinute
    };
  }
  function prepareFinisherChartData(_ref) {
    var timeData = _ref.timeData,
      minMinute = _ref.minMinute,
      maxMinute = _ref.maxMinute;
    var minutes = [];
    var counts = [];
    for (var min = minMinute; min <= maxMinute; min++) {
      minutes.push(min);
      counts.push(timeData[min] || 0);
    }
    var labels = minutes.map(function (min) {
      var hours = Math.floor(min / 60);
      var remainingMins = min % 60;
      return "".concat(hours, ":").concat(remainingMins.toString().padStart(2, '0'));
    });
    return {
      labels: labels,
      data: counts
    };
  }
  function addWatermark(canvas) {
    var ctx = canvas.getContext('2d');
    var scriptName = 'parkrun-charts';
    var scriptVersion = 'unknown';
    var scriptUrl = '';
    if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) {
      scriptName = GM_info.script.name || scriptName;
      scriptVersion = GM_info.script.version || scriptVersion;
      scriptUrl = GM_info.script.homepage || '';
    }
    var watermarkText = ["Generated by ".concat(scriptName, " v").concat(scriptVersion), scriptUrl];
    ctx.save();
    ctx.font = DEBUG_WATERMARK ? 'bold 16px Arial' : '10px Arial';
    ctx.fillStyle = DEBUG_WATERMARK ? 'rgba(255, 0, 0, 0.5)' : 'rgba(200, 200, 200, 0.1)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    var padding = 10;
    var lineHeight = DEBUG_WATERMARK ? 20 : 14;
    var x = canvas.width - padding;
    var y = canvas.height - padding;
    for (var i = watermarkText.length - 1; i >= 0; i--) {
      var text = watermarkText[i];
      if (text) {
        ctx.fillText(text, x, y);
        y -= lineHeight;
      }
    }
    ctx.restore();
  }
  function createFinishersChart() {
    var _document$querySelect, _document$querySelect2;
    var eventName = (_document$querySelect = document.querySelector('h1')) === null || _document$querySelect === void 0 || (_document$querySelect = _document$querySelect.textContent) === null || _document$querySelect === void 0 ? void 0 : _document$querySelect.trim();
    var eventDate = (_document$querySelect2 = document.querySelector('h3')) === null || _document$querySelect2 === void 0 || (_document$querySelect2 = _document$querySelect2.textContent) === null || _document$querySelect2 === void 0 ? void 0 : _document$querySelect2.trim();
    var titlePrefix = [eventName, eventDate].filter(Boolean).join(' | ');
    var title = [titlePrefix, 'Finishers per Minute'].filter(Boolean).join(': ');
    var timeData = extractFinishTimeData();
    var chartData = prepareFinisherChartData(timeData);
    if (chartData.labels.length === 0) {
      console.log('No finish time data found');
      return;
    }
    if (document.getElementById('finishersChart')) {
      console.log('Finishers chart already exists, skipping render');
      return;
    }
    var _createChartContainer = createChartContainer(title, 'finishersChart'),
      container = _createChartContainer.container,
      canvas = _createChartContainer.canvas;
    insertAfterFirst('h3', container);
    addChartDownloadButton(container);
    var ctx = canvas.getContext('2d');
    // eslint-disable-next-line no-undef
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: chartData.labels,
        datasets: [{
          label: 'Number of Finishers',
          data: chartData.data,
          backgroundColor: STYLES.barColor,
          borderColor: STYLES.barColor,
          borderWidth: 1
        }]
      },
      options: {
        animation: false,
        responsive: true,
        plugins: {
          legend: {
            labels: {
              color: STYLES.textColor
            }
          },
          title: {
            display: false,
            color: STYLES.textColor
          },
          tooltip: {
            callbacks: {
              title: function title(tooltipItems) {
                var item = tooltipItems[0];
                var label = item.label;
                if (label.includes(':')) {
                  var _label$split = label.split(':'),
                    _label$split2 = _slicedToArray(_label$split, 2),
                    hours = _label$split2[0],
                    mins = _label$split2[1];
                  return "".concat(hours, " hour").concat(hours === '1' ? '' : 's', " ").concat(mins, " minute").concat(mins === '01' ? '' : 's');
                } else {
                  var minute = label.replace("'", '');
                  return "".concat(minute, " minute").concat(minute === '1' ? '' : 's');
                }
              },
              label: function label(context) {
                return "".concat(context.raw, " finisher").concat(context.raw === 1 ? '' : 's');
              }
            }
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Finish Time',
              color: STYLES.textColor
            },
            ticks: {
              color: STYLES.subtleTextColor
            },
            grid: {
              color: STYLES.gridColor
            }
          },
          y: {
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
          }
        },
        onHover: function onHover() {
          setTimeout(function () {
            return addWatermark(canvas);
          }, 0);
        },
        onResize: function onResize() {
          setTimeout(function () {
            return addWatermark(canvas);
          }, 0);
        },
        customPlugin: {
          id: 'watermarkPlugin',
          afterDraw: function afterDraw() {
            setTimeout(function () {
              return addWatermark(canvas);
            }, 0);
          }
        }
      }
    });
    setTimeout(function () {
      return addWatermark(canvas);
    }, 0);
  }
  function extractEventHistoryData() {
    var _document$querySelect3, _document$querySelect4;
    var title = (_document$querySelect3 = (_document$querySelect4 = document.querySelector('h1')) === null || _document$querySelect4 === void 0 ? void 0 : _document$querySelect4.textContent.trim()) !== null && _document$querySelect3 !== void 0 ? _document$querySelect3 : 'Event History';
    var eventNumbers = [];
    var dates = [];
    var finishers = [];
    var volunteers = [];
    var rows = document.querySelectorAll('tr.Results-table-row');
    Array.from(rows).reverse().forEach(function (row) {
      var eventNumber = row.getAttribute('data-parkrun');
      if (eventNumber) {
        eventNumbers.push(eventNumber);
      }
      var date = row.getAttribute('data-date');
      if (date) {
        var dateObj = new Date(date);
        var formattedDate = dateObj.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
        dates.push(formattedDate);
      }
      var finishersCount = row.getAttribute('data-finishers');
      if (finishersCount) {
        finishers.push(parseInt(finishersCount, 10));
      }
      var volunteersCount = row.getAttribute('data-volunteers');
      if (volunteersCount) {
        volunteers.push(parseInt(volunteersCount, 10));
      }
    });
    return {
      title: title,
      eventNumbers: eventNumbers,
      dates: dates,
      finishers: finishers,
      volunteers: volunteers
    };
  }
  function calculateRollingAverage(data, windowSize) {
    var result = [];
    for (var i = 0; i < data.length; i++) {
      if (i < windowSize - 1) {
        result.push(null);
      } else {
        var sum = 0;
        for (var j = 0; j < windowSize; j++) {
          sum += data[i - j];
        }
        result.push(parseFloat((sum / windowSize).toFixed(1)));
      }
    }
    return result;
  }
  function findMinMaxPoints(data, eventNumbers, dates) {
    var minValue = Infinity;
    var maxValue = -Infinity;
    var minIndex = -1;
    var maxIndex = -1;
    for (var i = 0; i < data.length; i++) {
      if (data[i] < minValue) {
        minValue = data[i];
        minIndex = i;
      }
      if (data[i] === minValue) {
        minIndex = i;
      }
      if (data[i] > maxValue) {
        maxValue = data[i];
        maxIndex = i;
      }
      if (data[i] === maxValue) {
        maxIndex = i;
      }
    }
    return {
      min: {
        value: minValue,
        eventNumber: eventNumbers[minIndex],
        date: dates[minIndex],
        index: minIndex
      },
      max: {
        value: maxValue,
        eventNumber: eventNumbers[maxIndex],
        date: dates[maxIndex],
        index: maxIndex
      }
    };
  }
  function sameOrderOfMagnitude(a, b) {
    if (a === 0 || b === 0) return false;
    return Math.floor(Math.log10(a)) === Math.floor(Math.log10(b));
  }
  function createEventHistoryChart() {
    if (document.getElementById('eventHistoryChart')) {
      console.log('Event history chart already exists, skipping render');
      return;
    }
    var historyData = extractEventHistoryData();
    if (historyData.eventNumbers.length === 0) {
      console.log('No event history data found');
      return;
    }
    var rollingAvgWindowSize = 12;
    var finishersRollingAvg = calculateRollingAverage(historyData.finishers, rollingAvgWindowSize);
    var volunteersRollingAvg = calculateRollingAverage(historyData.volunteers, rollingAvgWindowSize);
    var finishersMinMax = findMinMaxPoints(historyData.finishers, historyData.eventNumbers, historyData.dates);
    var volunteersMinMax = findMinMaxPoints(historyData.volunteers, historyData.eventNumbers, historyData.dates);
    var axisDefs = {
      'y-parkrunners': {
        type: 'linear',
        position: 'left',
        beginAtZero: true,
        title: {
          display: true,
          text: 'parkrunners',
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
      'y-finishers': {
        type: 'linear',
        position: 'left',
        beginAtZero: true,
        title: {
          display: true,
          text: 'Number of Finishers',
          color: STYLES.barColor
        },
        ticks: {
          precision: 0,
          color: STYLES.barColor
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
    };
    var finishersMax = finishersMinMax.max.value;
    var volunteersMax = volunteersMinMax.max.value;
    var useSingleYAxis = sameOrderOfMagnitude(finishersMax, volunteersMax);
    var finishersAxisId = useSingleYAxis ? 'y-parkrunners' : 'y-finishers';
    var volunteersAxisId = useSingleYAxis ? 'y-parkrunners' : 'y-volunteers';
    var _createChartContainer2 = createChartContainer("".concat(historyData.title, ": Finishers & Volunteers"), 'eventHistoryChart', 1000),
      container = _createChartContainer2.container,
      canvas = _createChartContainer2.canvas;
    canvas.height = 400;
    canvas.style.height = '400px';
    canvas.style.maxHeight = '400px';
    insertAfterFirst('h1', container);
    var ctx = canvas.getContext('2d');
    var statsFooter = document.createElement('div');
    statsFooter.className = 'chart-stats-footer';
    statsFooter.style.marginTop = '10px';
    statsFooter.style.padding = '10px';
    statsFooter.style.backgroundColor = STYLES.backgroundColor;
    statsFooter.style.color = STYLES.textColor;
    statsFooter.style.borderRadius = '4px';
    statsFooter.style.fontSize = '14px';
    statsFooter.style.textAlign = 'center';
    statsFooter.innerHTML = "\n      <span style=\"color: ".concat(STYLES.barColor, "\">Finishers:</span> Min: ").concat(finishersMinMax.min.value, " (").concat(finishersMinMax.min.date, ", Event #").concat(finishersMinMax.min.eventNumber, ") |\n      Max: ").concat(finishersMinMax.max.value, " (").concat(finishersMinMax.max.date, ", Event #").concat(finishersMinMax.max.eventNumber, ")<br>\n      <span style=\"color: ").concat(STYLES.lineColor, "\">Volunteers:</span> Min: ").concat(volunteersMinMax.min.value, " (").concat(volunteersMinMax.min.date, ", Event #").concat(volunteersMinMax.min.eventNumber, ") |\n      Max: ").concat(volunteersMinMax.max.value, " (").concat(volunteersMinMax.max.date, ", Event #").concat(volunteersMinMax.max.eventNumber, ")\n    ");
    container.appendChild(statsFooter);
    var xAxis = {
      title: {
        display: true,
        text: 'Date',
        color: STYLES.textColor
      },
      ticks: {
        color: STYLES.subtleTextColor,
        maxRotation: 45,
        minRotation: 45,
        callback: function callback(value, index) {
          var totalEvents = historyData.dates.length;
          var showEvery = 1;
          if (totalEvents > 100) {
            showEvery = 10;
          } else if (totalEvents > 50) {
            showEvery = 5;
          } else if (totalEvents > 20) {
            showEvery = 2;
          }
          if (index === 0 || index === historyData.dates.length - 1) {
            return historyData.dates[index];
          }
          return index % showEvery === 0 ? historyData.dates[index] : '';
        }
      },
      grid: {
        color: STYLES.gridColor
      }
    };
    var datasets = [{
      label: 'Finishers',
      data: historyData.finishers,
      backgroundColor: STYLES.barColor,
      borderColor: STYLES.barColor,
      borderWidth: 1,
      yAxisID: finishersAxisId,
      order: 1
    }, {
      label: "".concat(rollingAvgWindowSize, "-Event Avg (Finishers)"),
      data: finishersRollingAvg,
      type: 'line',
      borderColor: STYLES.barColor,
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderDash: [5, 5],
      pointRadius: 0,
      fill: false,
      yAxisID: finishersAxisId,
      order: 0
    }, {
      label: 'Volunteers',
      data: historyData.volunteers,
      type: 'line',
      borderColor: STYLES.lineColor,
      backgroundColor: 'rgba(83, 186, 157, 0.2)',
      borderWidth: 1,
      pointBackgroundColor: STYLES.lineColor,
      pointRadius: 2,
      fill: false,
      tension: 0.2,
      yAxisID: volunteersAxisId,
      order: 2
    }, {
      label: "".concat(rollingAvgWindowSize, "-Event Avg (Volunteers)"),
      data: volunteersRollingAvg,
      type: 'line',
      borderColor: STYLES.lineColor,
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderDash: [5, 5],
      pointRadius: 0,
      fill: false,
      yAxisID: volunteersAxisId,
      order: 3
    }];
    var scales = {
      x: xAxis
    };
    scales[finishersAxisId] = axisDefs[finishersAxisId];
    if (volunteersAxisId !== finishersAxisId) {
      scales[volunteersAxisId] = axisDefs[volunteersAxisId];
    }

    // eslint-disable-next-line no-undef
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: historyData.dates,
        datasets: datasets
      },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 2.5,
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
              title: function title(tooltipItems) {
                var index = tooltipItems[0].dataIndex;
                var eventNumber = historyData.eventNumbers[index];
                var date = historyData.dates[index];
                return "".concat(date, " (Event #").concat(eventNumber, ")");
              },
              label: function label(tooltipItem) {
                var datasetLabel = tooltipItem.dataset.label || '';
                if (datasetLabel === 'Finishers') {
                  return "Finishers: ".concat(tooltipItem.raw);
                } else if (datasetLabel === 'Volunteers') {
                  return "Volunteers: ".concat(tooltipItem.raw);
                } else if (datasetLabel.includes('Avg')) {
                  return "".concat(datasetLabel, ": ").concat(tooltipItem.raw);
                }
                return tooltipItem.formattedValue;
              }
            }
          }
        },
        scales: scales,
        onHover: function onHover() {
          setTimeout(function () {
            return addWatermark(canvas);
          }, 0);
        },
        onResize: function onResize() {
          setTimeout(function () {
            return addWatermark(canvas);
          }, 0);
        },
        customPlugin: {
          id: 'watermarkPlugin',
          afterDraw: function afterDraw() {
            setTimeout(function () {
              return addWatermark(canvas);
            }, 0);
          }
        }
      }
    });
    setTimeout(function () {
      return addWatermark(canvas);
    }, 0);
    addChartDownloadButton(container);
  }
  function initCharts() {
    if (typeof Chart === 'undefined') {
      console.error('Chart.js not loaded');
      return;
    }
    var resultsTable = document.querySelector('.Results-table');
    if (!resultsTable) {
      console.log('Results table not found');
      return;
    }
    var pageUrl = window.location.href;
    var isEventHistoryPage = pageUrl.includes('/eventhistory/');
    if (isEventHistoryPage) {
      createEventHistoryChart();
    } else {
      createFinishersChart();
    }
  }
  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports.sameOrderOfMagnitude = sameOrderOfMagnitude;
  } else {
    initCharts();
  }
})();