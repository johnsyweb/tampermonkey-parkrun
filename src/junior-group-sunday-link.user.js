// ==UserScript==
// @name         junior parkrun Group Sunday Link
// @description  Adds a link to the consolidated club report for the most recent Sunday on junior parkrun group pages
// @author       Pete Johns (@johnsyweb)
// @downloadURL  https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/junior-group-sunday-link.user.js
// @grant        none
// @homepage     https://www.johnsy.com/tampermonkey-parkrun/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=parkrun.com.au
// @license      MIT
// @match        *://www.parkrun.ca/*/groups/*/
// @match        *://www.parkrun.co.at/*/groups/*/
// @match        *://www.parkrun.co.nl/*/groups/*/
// @match        *://www.parkrun.co.nz/*/groups/*/
// @match        *://www.parkrun.co.za/*/groups/*/
// @match        *://www.parkrun.com.au/*/groups/*/
// @match        *://www.parkrun.com.de/*/groups/*/
// @match        *://www.parkrun.dk/*/groups/*/
// @match        *://www.parkrun.fi/*/groups/*/
// @match        *://www.parkrun.fr/*/groups/*/
// @match        *://www.parkrun.ie/*/groups/*/
// @match        *://www.parkrun.it/*/groups/*/
// @match        *://www.parkrun.jp/*/groups/*/
// @match        *://www.parkrun.lt/*/groups/*/
// @match        *://www.parkrun.my/*/groups/*/
// @match        *://www.parkrun.no/*/groups/*/
// @match        *://www.parkrun.org.uk/*/groups/*/
// @match        *://www.parkrun.pl/*/groups/*/
// @match        *://www.parkrun.se/*/groups/*/
// @match        *://www.parkrun.sg/*/groups/*/
// @match        *://www.parkrun.us/*/groups/*/
// @namespace    http://tampermonkey.net/
// @run-at       document-end
// @supportURL   https://github.com/johnsyweb/tampermonkey-parkrun/issues/
// @tag          parkrun
// @screenshot-url       https://www.parkrun.com.au/westerfolds-juniors/groups/24238/
// @screenshot-selector  a[href*="/results/consolidatedclub/?"]
// @screenshot-timeout   8000
// @screenshot-viewport  1200x800
// @updateURL    https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/junior-group-sunday-link.user.js
// @version      0.1.1
// ==/UserScript==

function findConsolidatedClubLink(doc = document) {
  return (
    Array.from(doc.querySelectorAll('a')).find((a) => a.href.includes('/consolidatedclub/?')) ||
    null
  );
}

function extractClubNumFromLink(link) {
  try {
    const url = new URL(link.href);
    return url.searchParams.get('clubNum');
  } catch {
    return null;
  }
}

function getMostRecentSunday(date = new Date()) {
  const sunday = new Date(date);
  sunday.setDate(date.getDate() - date.getDay());
  return sunday;
}

function formatDateYYYYMMDD(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function buildSundayLink(clubLink, clubNum, sundayStr) {
  const sundayUrl = `https://www.parkrun.com/results/consolidatedclub/?clubNum=${clubNum}&eventdate=${sundayStr}`;
  const newLink = clubLink.cloneNode(true);
  newLink.href = sundayUrl;
  newLink.textContent =
    "View the consolidated club report for member participation at last Sunday's junior parkruns";
  return newLink;
}

function insertAfter(original, newNode) {
  original.parentNode.insertBefore(document.createElement('br'), original.nextSibling);
  original.parentNode.insertBefore(newNode, original.nextSibling.nextSibling);
}

// Main script logic
(function () {
  'use strict';
  const clubLink = findConsolidatedClubLink();
  if (!clubLink) return;
  const clubNum = extractClubNumFromLink(clubLink);
  if (!clubNum) return;
  const sunday = getMostRecentSunday();
  const sundayStr = formatDateYYYYMMDD(sunday);
  const newLink = buildSundayLink(clubLink, clubNum, sundayStr);
  insertAfter(clubLink, newLink);
})();

// Export functions for testing
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = {
    findConsolidatedClubLink,
    extractClubNumFromLink,
    getMostRecentSunday,
    formatDateYYYYMMDD,
    buildSundayLink,
    insertAfter,
  };
}
