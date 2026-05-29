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
// @updateURL    https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/future-roster-printable.user.js
// @version      0.1.2
// ==/UserScript==
// DO NOT EDIT - generated from src/ by scripts/build-scripts.js

var STYLE_ID = 'parkrun-future-roster-printable';
var PREPARE_CONTROL_ID = 'parkrun-future-roster-prepare-control';
var PREPARE_BUTTON_ID = 'parkrun-future-roster-prepare-button';
var PREPARE_CONTROL_STYLE_ID = 'parkrun-future-roster-prepare-control-styles';
var PREPARE_BUTTON_LABEL = '🖨️ Prepare for printing';
var PREPARE_HELPER_TEXT = 'Opens a simplified view for editing and printing.';
var CORE_ROLES_EXPLANATION_ID = 'parkrun-core-roles-explanation';
var CORE_ROLE_FOOTNOTE_MARKER = '*';
var DEFAULT_CORE_ROLES_EXPLANATION = "Rows marked ".concat(CORE_ROLE_FOOTNOTE_MARKER, " are core roles. Every core role must be covered for the event to go ahead.");
function getPrintableTitle(main) {
  var _heading$textContent;
  var fallbackTitle = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
  var heading = main === null || main === void 0 ? void 0 : main.querySelector('h1');
  var text = heading === null || heading === void 0 || (_heading$textContent = heading.textContent) === null || _heading$textContent === void 0 ? void 0 : _heading$textContent.trim();
  return text || fallbackTitle;
}
function findRosterTable(main) {
  var _ref, _main$querySelector;
  return (_ref = (_main$querySelector = main === null || main === void 0 ? void 0 : main.querySelector('#viewroster table')) !== null && _main$querySelector !== void 0 ? _main$querySelector : main === null || main === void 0 ? void 0 : main.querySelector('table')) !== null && _ref !== void 0 ? _ref : null;
}
function findRosterTableStyles(main) {
  var viewroster = main === null || main === void 0 ? void 0 : main.querySelector('#viewroster');
  if (!viewroster) {
    return [];
  }
  return Array.from(viewroster.children).filter(function (node) {
    return node.tagName === 'STYLE';
  });
}
function findPrepareInsertionPoint(main) {
  var _main$querySelector2;
  return (_main$querySelector2 = main === null || main === void 0 ? void 0 : main.querySelector('#viewroster')) !== null && _main$querySelector2 !== void 0 ? _main$querySelector2 : findRosterTable(main);
}
function preserveRosterTableStyles(doc, main) {
  findRosterTableStyles(main).forEach(function (style) {
    return doc.head.appendChild(style);
  });
}
function buildControlStyles() {
  return "\n#".concat(PREPARE_CONTROL_ID, " {\n  margin: 1rem 0;\n}\n\n#").concat(PREPARE_BUTTON_ID, " {\n  display: inline-block;\n  padding: 0.75em 1.5em;\n  background: #4c1a57;\n  color: #fff;\n  border: none;\n  border-radius: 999px;\n  font: inherit;\n  font-weight: 700;\n  font-size: 0.95rem;\n  letter-spacing: 0.03em;\n  cursor: pointer;\n  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);\n}\n\n#").concat(PREPARE_BUTTON_ID, ":hover {\n  background: #3d2f4f;\n}\n\n#").concat(PREPARE_BUTTON_ID, ":focus-visible {\n  outline: 3px solid #f7a541;\n  outline-offset: 2px;\n}\n\n#").concat(PREPARE_CONTROL_ID, " p {\n  margin: 0.65rem 0 0;\n  font-size: 0.9rem;\n  color: #666;\n}\n").trim();
}
function injectControlStyles() {
  var doc = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : document;
  if (doc.getElementById(PREPARE_CONTROL_STYLE_ID)) {
    return;
  }
  var style = doc.createElement('style');
  style.id = PREPARE_CONTROL_STYLE_ID;
  style.textContent = buildControlStyles();
  doc.head.appendChild(style);
}
function buildSupplementalStyles() {
  return "\nhtml,\nbody {\n  background: #fff !important;\n  margin: 0;\n  padding: 0;\n}\n\nbody {\n  background-image: none !important;\n}\n\ntable {\n  width: 100%;\n}\n\n#rosterTable {\n  border-collapse: collapse;\n}\n\n#rosterTable,\n#rosterTable th,\n#rosterTable td {\n  border: 1px solid black;\n  padding: 4px;\n}\n\n#rosterTable td,\n#rosterTable th {\n  cursor: text;\n}\n\n#rosterTable td:focus,\n#rosterTable th:focus {\n  outline: 2px solid #0072b1;\n  outline-offset: -2px;\n}\n\n#rosterTable tr.core-role th.corerole {\n  background: #f2f2f2 !important;\n}\n\n#rosterTable tr.core-role th.corerole::after {\n  content: ' ".concat(CORE_ROLE_FOOTNOTE_MARKER, "';\n  font-weight: normal;\n}\n\n.core-roles-explanation {\n  font-size: 0.9rem;\n  margin: 8px 0 0;\n}\n\n.core-roles-explanation:focus {\n  outline: 2px solid #0072b1;\n  outline-offset: 2px;\n}\n\n@page {\n  size: A4 landscape;\n  margin: 10mm;\n}\n\n@media print {\n  html,\n  body {\n    background: #fff !important;\n  }\n\n  a,\n  a:visited {\n    color: inherit !important;\n    text-decoration: none !important;\n  }\n\n  a[href]::after {\n    content: none !important;\n  }\n\n  tr {\n    break-inside: avoid;\n    page-break-inside: avoid;\n  }\n\n  #rosterTable td:focus,\n  #rosterTable th:focus {\n    outline: none;\n  }\n\n  .core-roles-explanation:focus {\n    outline: none;\n  }\n}\n").trim();
}
function injectSupplementalStyles() {
  var doc = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : document;
  if (doc.getElementById(STYLE_ID)) {
    return;
  }
  var style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent = buildSupplementalStyles();
  doc.head.appendChild(style);
}
function enableCellEditing(table) {
  table.querySelectorAll('td, th').forEach(function (cell) {
    cell.setAttribute('contenteditable', 'true');
    cell.setAttribute('tabindex', '0');
  });
}
function markCoreRoleRows(table) {
  table.querySelectorAll('tr').forEach(function (row) {
    if (row.querySelector('th.corerole')) {
      row.classList.add('core-role');
    }
  });
}
function createCoreRolesExplanation() {
  var doc = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : document;
  var explanation = doc.createElement('p');
  explanation.id = CORE_ROLES_EXPLANATION_ID;
  explanation.className = 'core-roles-explanation';
  explanation.setAttribute('contenteditable', 'true');
  explanation.setAttribute('tabindex', '0');
  explanation.textContent = DEFAULT_CORE_ROLES_EXPLANATION;
  return explanation;
}
function createPrepareControl() {
  var doc = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : document;
  var control = doc.createElement('div');
  control.id = PREPARE_CONTROL_ID;
  var button = doc.createElement('button');
  button.id = PREPARE_BUTTON_ID;
  button.type = 'button';
  button.textContent = PREPARE_BUTTON_LABEL;
  button.addEventListener('click', function () {
    prepareForPrinting(doc);
  });
  var helper = doc.createElement('p');
  helper.textContent = PREPARE_HELPER_TEXT;
  control.append(button, helper);
  return control;
}
function injectPrepareControl() {
  var doc = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : document;
  if (doc.getElementById(PREPARE_CONTROL_ID)) {
    return true;
  }
  var main = doc.getElementById('main');
  if (!main) {
    return false;
  }
  var table = findRosterTable(main);
  if (!table) {
    return false;
  }
  var insertionPoint = findPrepareInsertionPoint(main);
  if (!(insertionPoint !== null && insertionPoint !== void 0 && insertionPoint.parentNode)) {
    return false;
  }
  injectControlStyles(doc);
  insertionPoint.parentNode.insertBefore(createPrepareControl(doc), insertionPoint);
  return true;
}
function isolateMainForPrint() {
  var doc = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : document;
  var main = doc.getElementById('main');
  if (!main) {
    return false;
  }
  var table = findRosterTable(main);
  if (!table) {
    return false;
  }
  var title = getPrintableTitle(main, doc.title);
  preserveRosterTableStyles(doc, main);
  doc.body.replaceChildren(table, createCoreRolesExplanation(doc));
  markCoreRoleRows(table);
  injectSupplementalStyles(doc);
  enableCellEditing(table);
  doc.title = title;
  return true;
}
function prepareForPrinting() {
  var _doc$defaultView;
  var doc = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : document;
  if (!isolateMainForPrint(doc)) {
    return false;
  }
  (_doc$defaultView = doc.defaultView) === null || _doc$defaultView === void 0 || _doc$defaultView.scrollTo(0, 0);
  return true;
}
function initFutureRosterPrintable() {
  var doc = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : document;
  injectPrepareControl(doc);
}
(function () {
  'use strict';

  initFutureRosterPrintable(document);
})();
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = {
    STYLE_ID: STYLE_ID,
    PREPARE_CONTROL_ID: PREPARE_CONTROL_ID,
    PREPARE_BUTTON_ID: PREPARE_BUTTON_ID,
    PREPARE_CONTROL_STYLE_ID: PREPARE_CONTROL_STYLE_ID,
    PREPARE_BUTTON_LABEL: PREPARE_BUTTON_LABEL,
    PREPARE_HELPER_TEXT: PREPARE_HELPER_TEXT,
    CORE_ROLES_EXPLANATION_ID: CORE_ROLES_EXPLANATION_ID,
    CORE_ROLE_FOOTNOTE_MARKER: CORE_ROLE_FOOTNOTE_MARKER,
    DEFAULT_CORE_ROLES_EXPLANATION: DEFAULT_CORE_ROLES_EXPLANATION,
    buildControlStyles: buildControlStyles,
    buildSupplementalStyles: buildSupplementalStyles,
    createCoreRolesExplanation: createCoreRolesExplanation,
    createPrepareControl: createPrepareControl,
    enableCellEditing: enableCellEditing,
    findRosterTable: findRosterTable,
    findRosterTableStyles: findRosterTableStyles,
    findPrepareInsertionPoint: findPrepareInsertionPoint,
    getPrintableTitle: getPrintableTitle,
    injectControlStyles: injectControlStyles,
    injectPrepareControl: injectPrepareControl,
    injectSupplementalStyles: injectSupplementalStyles,
    initFutureRosterPrintable: initFutureRosterPrintable,
    isolateMainForPrint: isolateMainForPrint,
    markCoreRoleRows: markCoreRoleRows,
    prepareForPrinting: prepareForPrinting,
    preserveRosterTableStyles: preserveRosterTableStyles
  };
}