// ==UserScript==
// @name         parkrun Future Roster Printable View
// @description  Printable Future Roster table with editable cells for run director clarifications
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
// @screenshot-selector  #rosterTable
// @screenshot-timeout   8000
// @screenshot-viewport  1200x800
// @updateURL    https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/future-roster-printable.user.js
// @version      0.1.0
// ==/UserScript==

const STYLE_ID = 'parkrun-future-roster-printable';
const CORE_ROLES_EXPLANATION_ID = 'parkrun-core-roles-explanation';
const CORE_ROLE_FOOTNOTE_MARKER = '*';
const DEFAULT_CORE_ROLES_EXPLANATION = `Rows marked ${CORE_ROLE_FOOTNOTE_MARKER} are core roles. Every core role must be covered for the event to go ahead.`;

function getPrintableTitle(main, fallbackTitle = '') {
  const heading = main?.querySelector('h1');
  const text = heading?.textContent?.trim();
  return text || fallbackTitle;
}

function findRosterTable(main) {
  return main?.querySelector('#viewroster table') ?? main?.querySelector('table') ?? null;
}

function findRosterTableStyles(main) {
  const viewroster = main?.querySelector('#viewroster');
  if (!viewroster) {
    return [];
  }

  return Array.from(viewroster.children).filter((node) => node.tagName === 'STYLE');
}

function preserveRosterTableStyles(doc, main) {
  findRosterTableStyles(main).forEach((style) => doc.head.appendChild(style));
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

table {
  width: 100%;
}

#rosterTable {
  border-collapse: collapse;
}

#rosterTable,
#rosterTable th,
#rosterTable td {
  border: 1px solid black;
  padding: 4px;
}

#rosterTable td,
#rosterTable th {
  cursor: text;
}

#rosterTable td:focus,
#rosterTable th:focus {
  outline: 2px solid #0072b1;
  outline-offset: -2px;
}

#rosterTable tr.core-role th.corerole {
  background: #f2f2f2 !important;
}

#rosterTable tr.core-role th.corerole::after {
  content: ' ${CORE_ROLE_FOOTNOTE_MARKER}';
  font-weight: normal;
}

.core-roles-explanation {
  font-size: 0.9rem;
  margin: 8px 0 0;
}

.core-roles-explanation:focus {
  outline: 2px solid #0072b1;
  outline-offset: 2px;
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

  #rosterTable td:focus,
  #rosterTable th:focus {
    outline: none;
  }

  .core-roles-explanation:focus {
    outline: none;
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

function enableCellEditing(table) {
  table.querySelectorAll('td, th').forEach((cell) => {
    cell.setAttribute('contenteditable', 'true');
    cell.setAttribute('tabindex', '0');
  });
}

function markCoreRoleRows(table) {
  table.querySelectorAll('tr').forEach((row) => {
    if (row.querySelector('th.corerole')) {
      row.classList.add('core-role');
    }
  });
}

function createCoreRolesExplanation(doc = document) {
  const explanation = doc.createElement('p');
  explanation.id = CORE_ROLES_EXPLANATION_ID;
  explanation.className = 'core-roles-explanation';
  explanation.setAttribute('contenteditable', 'true');
  explanation.setAttribute('tabindex', '0');
  explanation.textContent = DEFAULT_CORE_ROLES_EXPLANATION;
  return explanation;
}

function isolateMainForPrint(doc = document) {
  const main = doc.getElementById('main');
  if (!main) {
    return false;
  }

  const table = findRosterTable(main);
  if (!table) {
    return false;
  }

  const title = getPrintableTitle(main, doc.title);
  preserveRosterTableStyles(doc, main);
  doc.body.replaceChildren(table, createCoreRolesExplanation(doc));
  markCoreRoleRows(table);
  injectSupplementalStyles(doc);
  enableCellEditing(table);
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
    CORE_ROLES_EXPLANATION_ID,
    CORE_ROLE_FOOTNOTE_MARKER,
    DEFAULT_CORE_ROLES_EXPLANATION,
    buildSupplementalStyles,
    createCoreRolesExplanation,
    enableCellEditing,
    findRosterTable,
    findRosterTableStyles,
    getPrintableTitle,
    injectSupplementalStyles,
    isolateMainForPrint,
    markCoreRoleRows,
    preserveRosterTableStyles,
  };
}
