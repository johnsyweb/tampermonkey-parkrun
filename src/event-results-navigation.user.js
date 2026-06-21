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
// @screenshot-url       https://www.parkrun.com.au/coburg/results/400/
// @screenshot-selector  #parkrun-event-results-navigation
// @screenshot-timeout   8000
// @screenshot-viewport  1200x800
// @updateURL    https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/event-results-navigation.user.js
// @version      0.1.0
// ==/UserScript==

(function () {
  'use strict';

  const BAR_ID = 'parkrun-event-results-navigation';
  const BODY_PADDING_ATTR = 'data-parkrun-event-nav-padding';

  const STYLES = {
    backgroundColor: '#2b223d',
    accentColor: '#FFA300',
    textColor: '#EEE',
    disabledColor: '#9a8fb3',
  };

  const MONTHS = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  const EXCLUDED_RESULTS_SEGMENTS = new Set(['eventhistory']);
  const RESULTS_PATH_PATTERN = /^\/([^/]+)\/results\/([^/]+)\/?$/;

  function parseResultsPath(pathname) {
    const match = pathname.match(RESULTS_PATH_PATTERN);
    if (!match) {
      return null;
    }

    const [, location, segment] = match;
    if (EXCLUDED_RESULTS_SEGMENTS.has(segment)) {
      return null;
    }

    if (/^\d+$/.test(segment)) {
      return {
        location,
        segmentType: 'number',
        eventNumber: parseInt(segment, 10),
      };
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(segment)) {
      return { location, segmentType: 'date' };
    }

    if (segment === 'latestresults') {
      return { location, segmentType: 'latest' };
    }

    return null;
  }

  function isSingleEventResultsPath(pathname) {
    return parseResultsPath(pathname) !== null;
  }

  function extractEventMetadata(doc) {
    const h3 = doc.querySelector('h3');
    if (!h3) {
      return null;
    }

    const numMatch = h3.textContent.match(/#(\d+)/);
    if (!numMatch) {
      return null;
    }

    const formatDate = h3.querySelector('.format-date');
    let rawDate = formatDate ? formatDate.textContent.trim() : '';
    if (!rawDate) {
      const dateMatch = h3.textContent.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
      if (dateMatch) {
        rawDate = dateMatch[1];
      }
    }

    return {
      eventNumber: parseInt(numMatch[1], 10),
      rawDate,
    };
  }

  function formatEventDateAustralian(rawDate) {
    if (!rawDate) {
      return '';
    }

    const parts = rawDate.split('/');
    if (parts.length !== 3) {
      return rawDate;
    }

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);
    if (year < 100) {
      year += 2000;
    }

    if (!day || !month || month < 1 || month > 12) {
      return rawDate;
    }

    return `${day} ${MONTHS[month - 1]} ${year}`;
  }

  function buildEventResultsUrl(origin, location, eventNumber) {
    return `${origin}/${location}/results/${eventNumber}/`;
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

    const tag = target.tagName;
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
    const dateSuffix = formattedDate ? ` · ${formattedDate}` : '';

    const centre = doc.createElement('div');
    centre.style.flex = '1';
    centre.style.textAlign = 'center';
    centre.style.fontWeight = 'bold';
    centre.setAttribute('aria-live', 'polite');

    const previousKbd = doc.createElement('kbd');
    previousKbd.textContent = '[';
    previousKbd.title = 'Go to previous event';
    previousKbd.setAttribute('aria-label', 'Go to previous event (keyboard shortcut [)');
    applyKbdHintStyles(previousKbd);

    const eventLabel = doc.createElement('span');
    eventLabel.textContent = `#${eventNumber}${dateSuffix}`;

    const nextKbd = doc.createElement('kbd');
    nextKbd.textContent = ']';
    nextKbd.title = 'Go to next event';
    nextKbd.setAttribute('aria-label', 'Go to next event (keyboard shortcut ])');
    applyKbdHintStyles(nextKbd);

    centre.append(
      previousKbd,
      doc.createTextNode(' '),
      eventLabel,
      doc.createTextNode(' '),
      nextKbd
    );

    return centre;
  }

  function createNavigationBar({ origin, location, eventNumber, formattedDate, doc }) {
    const previousNumber = eventNumber - 1;
    const nextNumber = eventNumber + 1;
    const previousLabel = `Previous event (#${previousNumber})`;
    const nextLabel = `Next event (#${nextNumber})`;

    const nav = doc.createElement('nav');
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

    const previousControl = doc.createElement(eventNumber > 1 ? 'a' : 'span');
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

    const centre = createCentreLabel(doc, eventNumber, formattedDate);

    const nextControl = doc.createElement('a');
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
    const height = `${bar.offsetHeight}px`;
    doc.body.style.paddingTop = height;
    doc.body.setAttribute(BODY_PADDING_ATTR, height);
  }

  let keyboardHandler = null;

  function attachKeyboardShortcuts(doc, bar) {
    if (keyboardHandler) {
      doc.removeEventListener('keydown', keyboardHandler);
    }

    keyboardHandler = (event) => {
      if (shouldSuppressKeyboardShortcut(event.target)) {
        return;
      }

      if (event.key === '[') {
        const previous = bar.querySelector('.parkrun-event-nav-previous');
        if (previous instanceof HTMLAnchorElement) {
          event.preventDefault();
          previous.click();
        }
      }

      if (event.key === ']') {
        const next = bar.querySelector('.parkrun-event-nav-next');
        if (next instanceof HTMLAnchorElement) {
          event.preventDefault();
          next.click();
        }
      }
    };

    doc.addEventListener('keydown', keyboardHandler);
  }

  function renderNavigationBar(overrides = {}) {
    const doc = overrides.document ?? document;
    const pathname = overrides.pathname ?? window.location.pathname;
    const origin = overrides.origin ?? window.location.origin;

    if (!isSingleEventResultsPath(pathname)) {
      return null;
    }

    if (!isPageReady(doc)) {
      return null;
    }

    if (doc.getElementById(BAR_ID)) {
      return doc.getElementById(BAR_ID);
    }

    const pathInfo = parseResultsPath(pathname);
    const metadata = extractEventMetadata(doc);
    if (!pathInfo || !metadata) {
      return null;
    }

    const formattedDate = formatEventDateAustralian(metadata.rawDate);
    const bar = createNavigationBar({
      origin,
      location: pathInfo.location,
      eventNumber: metadata.eventNumber,
      formattedDate,
      doc,
    });

    doc.body.insertBefore(bar, doc.body.firstChild);
    applyBodyOffset(doc, bar);
    attachKeyboardShortcuts(doc, bar);

    return bar;
  }

  function waitForPageReady(callback, overrides = {}) {
    const doc = overrides.document ?? document;

    if (isPageReady(doc)) {
      callback();
      return null;
    }

    const observer = new MutationObserver(() => {
      if (isPageReady(doc)) {
        observer.disconnect();
        callback();
      }
    });

    observer.observe(doc.body, { childList: true, subtree: true });
    return observer;
  }

  function init(overrides = {}) {
    const doc = overrides.document ?? document;
    const pathname = overrides.pathname ?? window.location.pathname;

    if (!isSingleEventResultsPath(pathname)) {
      return null;
    }

    const render = () => renderNavigationBar(overrides);
    if (isPageReady(doc)) {
      return render();
    }

    return waitForPageReady(render, overrides);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      BAR_ID,
      parseResultsPath,
      isSingleEventResultsPath,
      extractEventMetadata,
      formatEventDateAustralian,
      buildEventResultsUrl,
      isPageReady,
      shouldSuppressKeyboardShortcut,
      createCentreLabel,
      createNavigationBar,
      renderNavigationBar,
      init,
    };
  } else {
    init();
  }
})();
