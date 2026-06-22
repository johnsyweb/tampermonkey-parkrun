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
// @screenshot-url       https://www.parkrun.com.au/loganriver/futureroster/
// @screenshot-selector  #rosterTable
// @screenshot-timeout   8000
// @screenshot-viewport  1200x800
// @updateURL    https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/future-roster-printable.user.js
// @version      0.1.8
// ==/UserScript==

const STYLE_ID = 'parkrun-future-roster-printable';
const PREPARE_CONTROL_ID = 'parkrun-future-roster-prepare-control';
const PREPARE_BUTTON_ID = 'parkrun-future-roster-prepare-button';
const PREPARE_CONTROL_STYLE_ID = 'parkrun-future-roster-prepare-control-styles';
const PREPARE_BUTTON_LABEL = '🖨️ Prepare for printing';
const PREPARE_HELPER_TEXT = 'Opens a simplified view for editing and printing.';
const RESET_BUTTON_ID = 'parkrun-future-roster-reset-button';
const PERSISTENCE_ERROR_ID = 'parkrun-future-roster-persistence-error';
const PERSISTENCE_CONTROLS_ID = 'parkrun-future-roster-persistence-controls';
const STORAGE_KEY_PREFIX = 'parkrun-future-roster-printable';
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

function findPrepareInsertionPoint(main) {
  return main?.querySelector('#viewroster') ?? findRosterTable(main);
}

function preserveRosterTableStyles(doc, main) {
  findRosterTableStyles(main).forEach((style) => doc.head.appendChild(style));
}

function buildControlStyles() {
  return `
#${PREPARE_CONTROL_ID} {
  margin: 1rem 0;
}

#${PREPARE_BUTTON_ID} {
  display: inline-block;
  padding: 0.75em 1.5em;
  background: #4c1a57;
  color: #fff;
  border: none;
  border-radius: 999px;
  font: inherit;
  font-weight: 700;
  font-size: 0.95rem;
  letter-spacing: 0.03em;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

#${PREPARE_BUTTON_ID}:hover {
  background: #3d2f4f;
}

#${PREPARE_BUTTON_ID}:focus-visible {
  outline: 3px solid #f7a541;
  outline-offset: 2px;
}

#${PREPARE_CONTROL_ID} p {
  margin: 0.65rem 0 0;
  font-size: 0.9rem;
  color: #666;
}

#${RESET_BUTTON_ID} {
  margin: 0 0 0.5rem;
  padding: 0.5em 1em;
  border: 1px solid #4c1a57;
  background: #fff;
  color: #4c1a57;
  border-radius: 4px;
  font: inherit;
  cursor: pointer;
}

#${RESET_BUTTON_ID}:focus-visible {
  outline: 3px solid #f7a541;
  outline-offset: 2px;
}

#${PERSISTENCE_ERROR_ID} {
  margin: 0 0 0.5rem;
  color: #b00020;
  font-size: 0.9rem;
}
`.trim();
}

function injectControlStyles(doc = document) {
  if (doc.getElementById(PREPARE_CONTROL_STYLE_ID)) {
    return;
  }

  const style = doc.createElement('style');
  style.id = PREPARE_CONTROL_STYLE_ID;
  style.textContent = buildControlStyles();
  doc.head.appendChild(style);
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

  #${PERSISTENCE_CONTROLS_ID} {
    display: none !important;
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

function getRoleHeaderCells(table) {
  return Array.from(table.querySelectorAll('tbody tr th'));
}

function getHeaderText(cell) {
  return (cell.textContent ?? '').trim();
}

function setHeaderText(cell, value) {
  const link = cell.querySelector('a');
  if (link) {
    link.textContent = value;
    return;
  }
  cell.textContent = value;
}

function buildStorageKey(slug, tld) {
  return `${STORAGE_KEY_PREFIX}:${slug}|${tld}`;
}

function getEventContext(doc = document) {
  const host = doc.location?.hostname ?? '';
  const pathname = doc.location?.pathname ?? '';
  const slug = pathname.split('/').filter(Boolean)[0] ?? 'unknown';
  const tld = host.replace(/^www\.parkrun\./, '') || 'unknown';
  return { slug, tld };
}

function getStorageKeyForDocument(doc = document) {
  const { slug, tld } = getEventContext(doc);
  return buildStorageKey(slug, tld);
}

function getPersistenceErrorElement(doc = document) {
  return doc.getElementById(PERSISTENCE_ERROR_ID);
}

function setPersistenceError(doc = document, message = '') {
  const errorElement = getPersistenceErrorElement(doc);
  if (errorElement) {
    errorElement.textContent = message;
  }
}

function rememberDefaults(table, explanation) {
  table.dataset.defaultHeaders = JSON.stringify(getRoleHeaderCells(table).map(getHeaderText));
  explanation.dataset.defaultText = explanation.textContent;
}

function getDefaultHeaders(table) {
  try {
    return JSON.parse(table.dataset.defaultHeaders ?? '[]');
  } catch {
    return [];
  }
}

function createPersistenceControls(doc = document) {
  const controls = doc.createElement('div');
  controls.id = PERSISTENCE_CONTROLS_ID;

  const resetButton = doc.createElement('button');
  resetButton.id = RESET_BUTTON_ID;
  resetButton.type = 'button';
  resetButton.textContent = 'Reset saved labels';

  const error = doc.createElement('p');
  error.id = PERSISTENCE_ERROR_ID;
  error.setAttribute('role', 'status');
  error.setAttribute('aria-live', 'polite');

  controls.append(resetButton, error);
  return controls;
}

function savePersistedEdits(doc = document) {
  const table = doc.getElementById('rosterTable');
  const explanation = doc.getElementById(CORE_ROLES_EXPLANATION_ID);
  if (!table || !explanation) {
    return false;
  }

  const defaultHeaders = getDefaultHeaders(table);
  const headers = getRoleHeaderCells(table)
    .map((cell, rowIndex) => ({
      rowIndex,
      originalText: defaultHeaders[rowIndex] ?? '',
      value: getHeaderText(cell),
    }))
    .filter((header) => header.value !== header.originalText);
  const payload = {
    headers,
    explanation: explanation.textContent ?? '',
  };

  try {
    window.localStorage.setItem(getStorageKeyForDocument(doc), JSON.stringify(payload));
    setPersistenceError(doc, '');
    return true;
  } catch {
    setPersistenceError(doc, 'Could not save edits locally in this browser.');
    return false;
  }
}

function restorePersistedEdits(doc = document) {
  const table = doc.getElementById('rosterTable');
  const explanation = doc.getElementById(CORE_ROLES_EXPLANATION_ID);
  if (!table || !explanation) {
    return false;
  }

  let payload;
  try {
    payload = JSON.parse(window.localStorage.getItem(getStorageKeyForDocument(doc)) ?? 'null');
  } catch {
    setPersistenceError(doc, 'Could not read saved edits from local storage.');
    return false;
  }
  if (!payload) {
    return false;
  }

  const headers = getRoleHeaderCells(table);
  const defaultHeaders = getDefaultHeaders(table);
  (payload.headers ?? []).forEach((saved) => {
    const rowIndex = saved?.rowIndex;
    if (!Number.isInteger(rowIndex) || rowIndex < 0 || rowIndex >= headers.length) {
      return;
    }
    if ((defaultHeaders[rowIndex] ?? '') !== (saved.originalText ?? '')) {
      return;
    }
    setHeaderText(headers[rowIndex], saved.value ?? '');
  });

  if (typeof payload.explanation === 'string') {
    explanation.textContent = payload.explanation;
  }
  return true;
}

function resetPersistedEdits(doc = document) {
  const table = doc.getElementById('rosterTable');
  const explanation = doc.getElementById(CORE_ROLES_EXPLANATION_ID);
  if (!table || !explanation) {
    return false;
  }

  try {
    window.localStorage.removeItem(getStorageKeyForDocument(doc));
  } catch {
    setPersistenceError(doc, 'Could not clear saved edits in this browser.');
    return false;
  }

  const headers = getRoleHeaderCells(table);
  const defaultHeaders = getDefaultHeaders(table);
  headers.forEach((cell, index) => {
    setHeaderText(cell, defaultHeaders[index] ?? getHeaderText(cell));
  });
  explanation.textContent = explanation.dataset.defaultText ?? DEFAULT_CORE_ROLES_EXPLANATION;
  setPersistenceError(doc, '');
  return true;
}

function attachPersistenceHandlers(doc = document) {
  const table = doc.getElementById('rosterTable');
  const explanation = doc.getElementById(CORE_ROLES_EXPLANATION_ID);
  const resetButton = doc.getElementById(RESET_BUTTON_ID);
  if (!table || !explanation || !resetButton) {
    return;
  }

  let timeoutId;
  const scheduleSave = () => {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }
    timeoutId = window.setTimeout(() => {
      savePersistedEdits(doc);
    }, 250);
  };

  getRoleHeaderCells(table).forEach((cell) => {
    cell.addEventListener('input', scheduleSave);
    cell.addEventListener('blur', scheduleSave);
  });
  explanation.addEventListener('input', scheduleSave);
  explanation.addEventListener('blur', scheduleSave);
  resetButton.addEventListener('click', () => {
    resetPersistedEdits(doc);
  });
}

function createPrepareControl(doc = document) {
  const control = doc.createElement('div');
  control.id = PREPARE_CONTROL_ID;

  const button = doc.createElement('button');
  button.id = PREPARE_BUTTON_ID;
  button.type = 'button';
  button.textContent = PREPARE_BUTTON_LABEL;
  button.addEventListener('click', () => {
    prepareForPrinting(doc);
  });

  const helper = doc.createElement('p');
  helper.textContent = PREPARE_HELPER_TEXT;

  control.append(button, helper);
  return control;
}

function injectPrepareControl(doc = document) {
  if (doc.getElementById(PREPARE_CONTROL_ID)) {
    return true;
  }

  const main = doc.getElementById('main');
  if (!main) {
    return false;
  }

  const table = findRosterTable(main);
  if (!table) {
    return false;
  }

  const insertionPoint = findPrepareInsertionPoint(main);
  if (!insertionPoint?.parentNode) {
    return false;
  }

  injectControlStyles(doc);
  insertionPoint.parentNode.insertBefore(createPrepareControl(doc), insertionPoint);
  return true;
}

function injectPersistenceControls(doc = document) {
  const table = doc.getElementById('rosterTable');
  if (!table || doc.getElementById(PERSISTENCE_CONTROLS_ID)) {
    return false;
  }
  table.parentNode.insertBefore(createPersistenceControls(doc), table);
  return true;
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

function prepareForPrinting(doc = document) {
  if (!isolateMainForPrint(doc)) {
    return false;
  }

  const table = doc.getElementById('rosterTable');
  const explanation = doc.getElementById(CORE_ROLES_EXPLANATION_ID);
  if (table && explanation) {
    rememberDefaults(table, explanation);
  }
  injectPersistenceControls(doc);
  restorePersistedEdits(doc);
  attachPersistenceHandlers(doc);
  doc.defaultView?.scrollTo(0, 0);
  return true;
}

function initFutureRosterPrintable(doc = document) {
  injectPrepareControl(doc);
}

(function () {
  'use strict';
  initFutureRosterPrintable(document);
})();

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = {
    STYLE_ID,
    PREPARE_CONTROL_ID,
    PREPARE_BUTTON_ID,
    PREPARE_CONTROL_STYLE_ID,
    PREPARE_BUTTON_LABEL,
    PREPARE_HELPER_TEXT,
    RESET_BUTTON_ID,
    PERSISTENCE_ERROR_ID,
    PERSISTENCE_CONTROLS_ID,
    CORE_ROLES_EXPLANATION_ID,
    CORE_ROLE_FOOTNOTE_MARKER,
    DEFAULT_CORE_ROLES_EXPLANATION,
    buildStorageKey,
    buildControlStyles,
    buildSupplementalStyles,
    createCoreRolesExplanation,
    createPrepareControl,
    createPersistenceControls,
    enableCellEditing,
    findRosterTable,
    findRosterTableStyles,
    findPrepareInsertionPoint,
    getPrintableTitle,
    injectControlStyles,
    injectPrepareControl,
    injectPersistenceControls,
    injectSupplementalStyles,
    initFutureRosterPrintable,
    isolateMainForPrint,
    markCoreRoleRows,
    prepareForPrinting,
    preserveRosterTableStyles,
    restorePersistedEdits,
    savePersistedEdits,
    resetPersistedEdits,
  };
}
