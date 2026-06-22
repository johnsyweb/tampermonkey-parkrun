// ==UserScript==
// @name         parkrun Event Results Navigation
// @description  Adds a sticky bar to step between previous and next event results at the same location, with keyboard shortcuts
// @author       Pete Johns (@johnsyweb)
// @downloadURL  https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/event-results-navigation.user.js
// @grant        none
// @homepage     https://www.johnsy.com/tampermonkey-parkrun/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=parkrun.com.au
// @license      MIT
// @match        *://www.parkrun.ca/*/results/*/
// @match        *://www.parkrun.co.at/*/results/*/
// @match        *://www.parkrun.co.nl/*/results/*/
// @match        *://www.parkrun.co.nz/*/results/*/
// @match        *://www.parkrun.co.za/*/results/*/
// @match        *://www.parkrun.com.au/*/results/*/
// @match        *://www.parkrun.com.de/*/results/*/
// @match        *://www.parkrun.dk/*/results/*/
// @match        *://www.parkrun.fi/*/results/*/
// @match        *://www.parkrun.fr/*/results/*/
// @match        *://www.parkrun.ie/*/results/*/
// @match        *://www.parkrun.it/*/results/*/
// @match        *://www.parkrun.jp/*/results/*/
// @match        *://www.parkrun.lt/*/results/*/
// @match        *://www.parkrun.my/*/results/*/
// @match        *://www.parkrun.no/*/results/*/
// @match        *://www.parkrun.org.uk/*/results/*/
// @match        *://www.parkrun.pl/*/results/*/
// @match        *://www.parkrun.se/*/results/*/
// @match        *://www.parkrun.sg/*/results/*/
// @match        *://www.parkrun.us/*/results/*/
// @namespace    http://tampermonkey.net/
// @run-at       document-end
// @supportURL   https://github.com/johnsyweb/tampermonkey-parkrun/issues/
// @tag          parkrun
// @updateURL    https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/event-results-navigation.user.js
// @version      0.1.2
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

  var BAR_ID = 'parkrun-event-results-navigation';
  var BODY_PADDING_ATTR = 'data-parkrun-event-nav-padding';
  var STYLES = {
    backgroundColor: '#2b223d',
    accentColor: '#FFA300',
    textColor: '#EEE',
    disabledColor: '#9a8fb3'
  };
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var EXCLUDED_RESULTS_SEGMENTS = new Set(['eventhistory']);
  var RESULTS_PATH_PATTERN = /^\/([^/]+)\/results\/([^/]+)\/?$/;
  function parseResultsPath(pathname) {
    var match = pathname.match(RESULTS_PATH_PATTERN);
    if (!match) {
      return null;
    }
    var _match = _slicedToArray(match, 3),
      location = _match[1],
      segment = _match[2];
    if (EXCLUDED_RESULTS_SEGMENTS.has(segment)) {
      return null;
    }
    if (/^\d+$/.test(segment)) {
      return {
        location: location,
        segmentType: 'number',
        eventNumber: parseInt(segment, 10)
      };
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(segment)) {
      return {
        location: location,
        segmentType: 'date'
      };
    }
    if (segment === 'latestresults') {
      return {
        location: location,
        segmentType: 'latest'
      };
    }
    return null;
  }
  function isSingleEventResultsPath(pathname) {
    return parseResultsPath(pathname) !== null;
  }
  function extractEventMetadata(doc) {
    var h3 = doc.querySelector('h3');
    if (!h3) {
      return null;
    }
    var numMatch = h3.textContent.match(/#(\d+)/);
    if (!numMatch) {
      return null;
    }
    var formatDate = h3.querySelector('.format-date');
    var rawDate = formatDate ? formatDate.textContent.trim() : '';
    if (!rawDate) {
      var dateMatch = h3.textContent.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
      if (dateMatch) {
        rawDate = dateMatch[1];
      }
    }
    return {
      eventNumber: parseInt(numMatch[1], 10),
      rawDate: rawDate
    };
  }
  function formatEventDateAustralian(rawDate) {
    if (!rawDate) {
      return '';
    }
    var parts = rawDate.split('/');
    if (parts.length !== 3) {
      return rawDate;
    }
    var day = parseInt(parts[0], 10);
    var month = parseInt(parts[1], 10);
    var year = parseInt(parts[2], 10);
    if (year < 100) {
      year += 2000;
    }
    if (!day || !month || month < 1 || month > 12) {
      return rawDate;
    }
    return "".concat(day, " ").concat(MONTHS[month - 1], " ").concat(year);
  }
  function buildEventResultsUrl(origin, location, eventNumber) {
    return "".concat(origin, "/").concat(location, "/results/").concat(eventNumber, "/");
  }
  function isPageReady(doc) {
    if (!doc.querySelector('.Results-table')) {
      return false;
    }
    return extractEventMetadata(doc) !== null;
  }
  function shouldSuppressKeyboardShortcut(target) {
    if (!target || !(target instanceof Element)) {
      return false;
    }
    var tag = target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      return true;
    }
    if (target.isContentEditable) {
      return true;
    }
    return false;
  }
  function applyLinkButtonStyles(link) {
    link.style.display = 'inline-block';
    link.style.padding = '0.4rem 0.8rem';
    link.style.backgroundColor = STYLES.accentColor;
    link.style.color = STYLES.backgroundColor;
    link.style.textDecoration = 'none';
    link.style.borderRadius = '4px';
    link.style.fontWeight = 'bold';
    link.style.lineHeight = '1.4';
  }
  function applyDisabledControlStyles(control) {
    control.style.display = 'inline-block';
    control.style.padding = '0.4rem 0.8rem';
    control.style.backgroundColor = '#3a3250';
    control.style.color = STYLES.disabledColor;
    control.style.borderRadius = '4px';
    control.style.fontWeight = 'bold';
    control.style.lineHeight = '1.4';
    control.style.cursor = 'not-allowed';
  }
  function applyKbdHintStyles(kbd) {
    kbd.style.display = 'inline-block';
    kbd.style.padding = '0.1rem 0.35rem';
    kbd.style.border = '1px solid #5a4f73';
    kbd.style.borderRadius = '3px';
    kbd.style.backgroundColor = '#3a3250';
    kbd.style.fontFamily = 'inherit';
    kbd.style.fontSize = '0.85em';
    kbd.style.cursor = 'help';
  }
  function createCentreLabel(doc, eventNumber, formattedDate) {
    var dateSuffix = formattedDate ? " \xB7 ".concat(formattedDate) : '';
    var centre = doc.createElement('div');
    centre.style.flex = '1';
    centre.style.textAlign = 'center';
    centre.style.fontWeight = 'bold';
    centre.setAttribute('aria-live', 'polite');
    var previousKbd = doc.createElement('kbd');
    previousKbd.textContent = '[';
    previousKbd.title = 'Go to previous event';
    previousKbd.setAttribute('aria-label', 'Go to previous event (keyboard shortcut [)');
    applyKbdHintStyles(previousKbd);
    var eventLabel = doc.createElement('span');
    eventLabel.textContent = "#".concat(eventNumber).concat(dateSuffix);
    var nextKbd = doc.createElement('kbd');
    nextKbd.textContent = ']';
    nextKbd.title = 'Go to next event';
    nextKbd.setAttribute('aria-label', 'Go to next event (keyboard shortcut ])');
    applyKbdHintStyles(nextKbd);
    centre.append(previousKbd, doc.createTextNode(' '), eventLabel, doc.createTextNode(' '), nextKbd);
    return centre;
  }
  function createNavigationBar(_ref) {
    var origin = _ref.origin,
      location = _ref.location,
      eventNumber = _ref.eventNumber,
      formattedDate = _ref.formattedDate,
      doc = _ref.doc;
    var previousNumber = eventNumber - 1;
    var nextNumber = eventNumber + 1;
    var previousLabel = "Previous event (#".concat(previousNumber, ")");
    var nextLabel = "Next event (#".concat(nextNumber, ")");
    var nav = doc.createElement('nav');
    nav.id = BAR_ID;
    nav.setAttribute('role', 'navigation');
    nav.setAttribute('aria-label', 'Event results navigation');
    nav.style.position = 'fixed';
    nav.style.top = '0';
    nav.style.left = '0';
    nav.style.right = '0';
    nav.style.zIndex = '10000';
    nav.style.display = 'flex';
    nav.style.alignItems = 'center';
    nav.style.justifyContent = 'space-between';
    nav.style.gap = '1rem';
    nav.style.padding = '0.5rem 1rem';
    nav.style.backgroundColor = STYLES.backgroundColor;
    nav.style.color = STYLES.textColor;
    nav.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.3)';
    nav.style.fontFamily = 'Arial, Helvetica, sans-serif';
    nav.style.fontSize = '0.95rem';
    var previousControl = doc.createElement(eventNumber > 1 ? 'a' : 'span');
    if (eventNumber > 1) {
      previousControl.href = buildEventResultsUrl(origin, location, previousNumber);
      previousControl.setAttribute('aria-label', previousLabel);
      applyLinkButtonStyles(previousControl);
    } else {
      previousControl.setAttribute('aria-disabled', 'true');
      previousControl.setAttribute('tabindex', '-1');
      applyDisabledControlStyles(previousControl);
    }
    previousControl.textContent = previousLabel;
    previousControl.className = 'parkrun-event-nav-previous';
    var centre = createCentreLabel(doc, eventNumber, formattedDate);
    var nextControl = doc.createElement('a');
    nextControl.href = buildEventResultsUrl(origin, location, nextNumber);
    nextControl.textContent = nextLabel;
    nextControl.setAttribute('aria-label', nextLabel);
    nextControl.className = 'parkrun-event-nav-next';
    applyLinkButtonStyles(nextControl);
    nav.appendChild(previousControl);
    nav.appendChild(centre);
    nav.appendChild(nextControl);
    return nav;
  }
  function applyBodyOffset(doc, bar) {
    var height = "".concat(bar.offsetHeight, "px");
    doc.body.style.paddingTop = height;
    doc.body.setAttribute(BODY_PADDING_ATTR, height);
  }
  var keyboardHandler = null;
  function attachKeyboardShortcuts(doc, bar) {
    if (keyboardHandler) {
      doc.removeEventListener('keydown', keyboardHandler);
    }
    keyboardHandler = function keyboardHandler(event) {
      if (shouldSuppressKeyboardShortcut(event.target)) {
        return;
      }
      if (event.key === '[') {
        var previous = bar.querySelector('.parkrun-event-nav-previous');
        if (previous instanceof HTMLAnchorElement) {
          event.preventDefault();
          previous.click();
        }
      }
      if (event.key === ']') {
        var next = bar.querySelector('.parkrun-event-nav-next');
        if (next instanceof HTMLAnchorElement) {
          event.preventDefault();
          next.click();
        }
      }
    };
    doc.addEventListener('keydown', keyboardHandler);
  }
  function renderNavigationBar() {
    var _overrides$document, _overrides$pathname, _overrides$origin;
    var overrides = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var doc = (_overrides$document = overrides.document) !== null && _overrides$document !== void 0 ? _overrides$document : document;
    var pathname = (_overrides$pathname = overrides.pathname) !== null && _overrides$pathname !== void 0 ? _overrides$pathname : window.location.pathname;
    var origin = (_overrides$origin = overrides.origin) !== null && _overrides$origin !== void 0 ? _overrides$origin : window.location.origin;
    if (!isSingleEventResultsPath(pathname)) {
      return null;
    }
    if (!isPageReady(doc)) {
      return null;
    }
    if (doc.getElementById(BAR_ID)) {
      return doc.getElementById(BAR_ID);
    }
    var pathInfo = parseResultsPath(pathname);
    var metadata = extractEventMetadata(doc);
    if (!pathInfo || !metadata) {
      return null;
    }
    var formattedDate = formatEventDateAustralian(metadata.rawDate);
    var bar = createNavigationBar({
      origin: origin,
      location: pathInfo.location,
      eventNumber: metadata.eventNumber,
      formattedDate: formattedDate,
      doc: doc
    });
    doc.body.insertBefore(bar, doc.body.firstChild);
    applyBodyOffset(doc, bar);
    attachKeyboardShortcuts(doc, bar);
    return bar;
  }
  function waitForPageReady(callback) {
    var _overrides$document2;
    var overrides = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    var doc = (_overrides$document2 = overrides.document) !== null && _overrides$document2 !== void 0 ? _overrides$document2 : document;
    if (isPageReady(doc)) {
      callback();
      return null;
    }
    var observer = new MutationObserver(function () {
      if (isPageReady(doc)) {
        observer.disconnect();
        callback();
      }
    });
    observer.observe(doc.body, {
      childList: true,
      subtree: true
    });
    return observer;
  }
  function init() {
    var _overrides$document3, _overrides$pathname2;
    var overrides = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var doc = (_overrides$document3 = overrides.document) !== null && _overrides$document3 !== void 0 ? _overrides$document3 : document;
    var pathname = (_overrides$pathname2 = overrides.pathname) !== null && _overrides$pathname2 !== void 0 ? _overrides$pathname2 : window.location.pathname;
    if (!isSingleEventResultsPath(pathname)) {
      return null;
    }
    var render = function render() {
      return renderNavigationBar(overrides);
    };
    if (isPageReady(doc)) {
      return render();
    }
    return waitForPageReady(render, overrides);
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      BAR_ID: BAR_ID,
      parseResultsPath: parseResultsPath,
      isSingleEventResultsPath: isSingleEventResultsPath,
      extractEventMetadata: extractEventMetadata,
      formatEventDateAustralian: formatEventDateAustralian,
      buildEventResultsUrl: buildEventResultsUrl,
      isPageReady: isPageReady,
      shouldSuppressKeyboardShortcut: shouldSuppressKeyboardShortcut,
      createCentreLabel: createCentreLabel,
      createNavigationBar: createNavigationBar,
      renderNavigationBar: renderNavigationBar,
      init: init
    };
  } else {
    init();
  }
})();