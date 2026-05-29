// ==UserScript==
// @name         parkrun Future Roster Printable View
// @description  Strips parkrun Future Roster pages to #main for a print-like landscape A4 view
// @author       Pete Johns (@johnsyweb)
// @downloadURL  https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/future-roster-printable.user.js
// @grant        none
// @homepage     https://www.johnsy.com/tampermonkey-parkrun/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=parkrun.com.au
// @license      MIT
// @match        *://www.parkrun.ca/*/futureroster/
// @match        *://www.parkrun.co.at/*/futureroster/
// @match        *://www.parkrun.co.nl/*/futureroster/
// @match        *://www.parkrun.co.nz/*/futureroster/
// @match        *://www.parkrun.co.za/*/futureroster/
// @match        *://www.parkrun.com.au/*/futureroster/
// @match        *://www.parkrun.com.de/*/futureroster/
// @match        *://www.parkrun.dk/*/futureroster/
// @match        *://www.parkrun.fi/*/futureroster/
// @match        *://www.parkrun.fr/*/futureroster/
// @match        *://www.parkrun.ie/*/futureroster/
// @match        *://www.parkrun.it/*/futureroster/
// @match        *://www.parkrun.jp/*/futureroster/
// @match        *://www.parkrun.lt/*/futureroster/
// @match        *://www.parkrun.my/*/futureroster/
// @match        *://www.parkrun.no/*/futureroster/
// @match        *://www.parkrun.org.uk/*/futureroster/
// @match        *://www.parkrun.pl/*/futureroster/
// @match        *://www.parkrun.se/*/futureroster/
// @match        *://www.parkrun.sg/*/futureroster/
// @match        *://www.parkrun.us/*/futureroster/
// @namespace    http://tampermonkey.net/
// @run-at       document-end
// @supportURL   https://github.com/johnsyweb/tampermonkey-parkrun/issues/
// @tag          parkrun
// @screenshot-url       https://www.parkrun.com.au/albertmelbourne/futureroster/
// @screenshot-selector  #main
// @screenshot-timeout   8000
// @screenshot-viewport  1200x800
// @updateURL    https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/future-roster-printable.user.js
// @version      0.1.0
// ==/UserScript==

const STYLE_ID = 'parkrun-future-roster-printable';

function getPrintableTitle(main, fallbackTitle = '') {
  const heading = main?.querySelector('h1');
  const text = heading?.textContent?.trim();
  return text || fallbackTitle;
}

function buildSupplementalStyles() {
  return `
html,
body {
  background: #fff !important;
  margin: 0;
  padding: 0;
}

body {
  background-image: none !important;
}

#main {
  width: 100% !important;
  max-width: none !important;
  margin: 0;
  padding: 0;
}

#mainleft {
  width: 100% !important;
  max-width: none !important;
}

#viewroster table {
  width: 100%;
}

@page {
  size: A4 landscape;
  margin: 10mm;
}

@media print {
  html,
  body {
    background: #fff !important;
  }

  a,
  a:visited {
    color: inherit !important;
    text-decoration: none !important;
  }

  a[href]::after {
    content: none !important;
  }

  tr {
    break-inside: avoid;
    page-break-inside: avoid;
  }
}
`.trim();
}

function injectSupplementalStyles(doc = document) {
  if (doc.getElementById(STYLE_ID)) {
    return;
  }

  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent = buildSupplementalStyles();
  doc.head.appendChild(style);
}

function isolateMainForPrint(doc = document) {
  const main = doc.getElementById('main');
  if (!main) {
    return false;
  }

  const title = getPrintableTitle(main, doc.title);
  doc.body.replaceChildren(main);
  injectSupplementalStyles(doc);
  doc.title = title;
  return true;
}

(function () {
  'use strict';
  isolateMainForPrint(document);
})();

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = {
    STYLE_ID,
    buildSupplementalStyles,
    getPrintableTitle,
    injectSupplementalStyles,
    isolateMainForPrint,
  };
}
