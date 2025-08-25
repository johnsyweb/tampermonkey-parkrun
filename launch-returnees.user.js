// ==UserScript==
// @name         parkrun Launch Returnees
// @description  Identifies and displays participants who attended both the launch event and the latest event
// @author       Pete Johns (@johnsyweb)
// @downloadURL  https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/launch-returnees.user.js
// @grant        none
// @homepage     https://github.com/johnsyweb/tampermonkey-parkrun
// @icon         https://www.google.com/s2/favicons?sz=64&domain=parkrun.com.au
// @license      MIT
// @match        *://www.parkrun.ca/*/results/latestresults/
// @match        *://www.parkrun.co.at/*/results/latestresults/
// @match        *://www.parkrun.co.nl/*/results/latestresults/
// @match        *://www.parkrun.co.nz/*/results/latestresults/
// @match        *://www.parkrun.co.za/*/results/latestresults/
// @match        *://www.parkrun.com.au/*/results/latestresults/
// @match        *://www.parkrun.com.de/*/results/latestresults/
// @match        *://www.parkrun.dk/*/results/latestresults/
// @match        *://www.parkrun.fi/*/results/latestresults/
// @match        *://www.parkrun.fr/*/results/latestresults/
// @match        *://www.parkrun.ie/*/results/latestresults/
// @match        *://www.parkrun.it/*/results/latestresults/
// @match        *://www.parkrun.jp/*/results/latestresults/
// @match        *://www.parkrun.lt/*/results/latestresults/
// @match        *://www.parkrun.my/*/results/latestresults/
// @match        *://www.parkrun.no/*/results/latestresults/
// @match        *://www.parkrun.org.uk/*/results/latestresults/
// @match        *://www.parkrun.pl/*/results/latestresults/
// @match        *://www.parkrun.se/*/results/latestresults/
// @match        *://www.parkrun.sg/*/results/latestresults/
// @match        *://www.parkrun.us/*/results/latestresults/
// @namespace    http://tampermonkey.net/
// @run-at       document-end
// @supportURL   https://github.com/johnsyweb/tampermonkey-parkrun/issues/
// @tag          parkrun
// @updateURL    https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/launch-returnees.user.js
// @version      2025-08-25 01:47 18:37 18:36 18:35 18:33 18:29 01:53 02:17 01:28
// ==/UserScript==

(async function () {
  'use strict';

  if (document.getElementById('parkrun-launch-returnees')) {
    return;
  }

  const STYLES = {
    backgroundColor: '#2b223d',
    headerColor: '#FFA300',
    textColor: '#EEE',
    linkColor: '#53BA9D',
  };

  const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  /**
   * Extracts parkrunner IDs and names from the current page
   * @returns {Map} A map of parkrunner IDs to names
   */
  function extractCurrentPageParticipants() {
    const links = document.querySelectorAll('a[href*="/parkrunner/"]');
    const participants = new Map();

    for (let i = 0; i < links.length; i++) {
      const match = links[i].href.match(/\/parkrunner\/(\d+)/);
      if (match) {
        participants.set(match[1], links[i].textContent.trim());
      }
    }

    return participants;
  }

  /**
   * Fetches and parses participants from a specific event with caching
   * @param {string} url - The URL of the event to fetch
   * @returns {Promise<Map>} A promise that resolves to a map of parkrunner IDs to names
   */
  async function fetchEventParticipants(url) {
    const cacheKey = `parkrun-launch-returnees-${url}`;

    try {
      // Check if we have cached data
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        const { data, timestamp } = JSON.parse(cachedData);
        const isFresh = Date.now() - timestamp < CACHE_TTL_MS;

        if (isFresh) {
          return new Map(data);
        }
      }

      // Fetch fresh data
      const response = await fetch(url);
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const links = doc.querySelectorAll('a[href*="/parkrunner/"]');
      const participants = new Map();

      for (let i = 0; i < links.length; i++) {
        const match = links[i].href.match(/\/parkrunner\/(\d+)/);
        if (match) {
          participants.set(match[1], links[i].textContent.trim());
        }
      }

      // Cache the data
      const cacheData = {
        data: Array.from(participants.entries()), // Convert Map to array for serialization
        timestamp: Date.now(),
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));

      return participants;
    } catch (error) {
      console.error('Error fetching or parsing:', url, error);
      return new Map();
    }
  }

  /**
   * Inserts an element after the first h1 tag on the page
   * @param {HTMLElement} element - The element to insert
   */
  function insertAfterTitle(element) {
    const pageTitle = document.querySelector('h1');
    if (pageTitle && pageTitle.parentNode) {
      if (pageTitle.nextSibling) {
        pageTitle.parentNode.insertBefore(element, pageTitle.nextSibling);
      } else {
        pageTitle.parentNode.appendChild(element);
      }
    } else {
      document.body.insertBefore(element, document.body.firstChild);
    }
  }

  /**
   * Creates a header element with styled text
   * @param {string} text - The text for the header
   * @returns {HTMLElement} The created header element
   */
  function createHeader(text) {
    const heading = document.createElement('h3');
    heading.textContent = text;
    heading.style.textAlign = 'center';
    heading.style.marginBottom = '15px';
    heading.style.color = STYLES.headerColor;
    return heading;
  }

  /**
   * Creates a message element for when no returnees are found
   * @param {string} message - The message to display
   * @returns {HTMLElement} The created message element
   */
  function createNoReturneesMessage(message) {
    const messageElement = document.createElement('p');
    messageElement.textContent = message;
    messageElement.style.textAlign = 'center';
    messageElement.style.fontWeight = 'bold';
    return messageElement;
  }

  /**
   * Creates a list item for a returnee
   * @param {string} id - The parkrunner ID
   * @param {Map} currentParticipants - Map of current participants
   * @param {Map} launchParticipants - Map of launch participants
   * @param {string} origin - The site origin URL
   * @returns {HTMLLIElement} The created list item
   */
  function createReturneeListItem(id, currentParticipants, launchParticipants, origin) {
    const li = document.createElement('li');

    const link = document.createElement('a');
    link.href = `${origin}/parkrunner/${id}/`;
    link.target = '_blank';

    const name = currentParticipants.get(id) || launchParticipants.get(id) || `Unknown parkrunner`;
    link.textContent = `${name} (A${id})`;
    link.style.color = STYLES.linkColor;
    link.style.textDecoration = 'none';

    li.appendChild(link);
    return li;
  }

  /**
   * Creates a list of returnees
   * @param {Array} returnees - Array of returnee IDs
   * @param {Map} currentParticipants - Map of current participants
   * @param {Map} launchParticipants - Map of launch participants
   * @param {string} origin - The site origin URL
   * @returns {HTMLUListElement} The created list
   */
  function createReturneesList(returnees, currentParticipants, launchParticipants, origin) {
    const listContainer = document.createElement('div');
    listContainer.style.maxHeight = '400px';
    listContainer.style.overflow = 'auto';

    const list = document.createElement('ul');
    list.style.listStyleType = 'none';
    list.style.padding = '0';
    list.style.margin = '0';
    list.style.textAlign = 'center';

    returnees.forEach((id) => {
      const listItem = createReturneeListItem(id, currentParticipants, launchParticipants, origin);
      list.appendChild(listItem);
    });

    listContainer.appendChild(list);
    return listContainer;
  }

  /**
   * Creates a container for the returnees display
   * @returns {HTMLElement} The created container
   */
  function createContainer() {
    const container = document.createElement('div');
    container.id = 'parkrun-launch-returnees';
    container.style.width = '100%';
    container.style.maxWidth = '800px';
    container.style.margin = '20px auto';
    container.style.padding = '15px';
    container.style.backgroundColor = STYLES.backgroundColor;
    container.style.borderRadius = '8px';
    container.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    container.style.color = STYLES.textColor;

    return container;
  }

  /**
   * Creates and displays UI showing launch returnees
   * @param {Array} returnees - Array of parkrunner IDs who attended both events
   * @param {Map} currentParticipants - Map of current event participants
   * @param {Map} launchParticipants - Map of launch event participants
   * @param {string} origin - The site origin URL
   */
  function displayReturnees(returnees, currentParticipants, launchParticipants, origin) {
    const container = createContainer();
    const heading = createHeader('Participants Who Attended the Launch Event');
    container.appendChild(heading);

    if (returnees.length === 0) {
      const message = createNoReturneesMessage(
        'No attendees from the launch event were present at the latest event.'
      );
      container.appendChild(message);
    } else {
      const list = createReturneesList(returnees, currentParticipants, launchParticipants, origin);
      container.appendChild(list);
    }

    insertAfterTitle(container);
  }

  /**
   * Main function to initialize the userscript
   */
  async function init() {
    const pathname = window.location.pathname;
    const locationMatch = pathname.match(/\/([^/]+)\/results\/latestresults/);
    const location = locationMatch[1];
    const origin = window.location.origin;
    const launchEventUrl = `${origin}/${location}/results/1/`;

    const currentParticipants = extractCurrentPageParticipants();
    const launchParticipants = await fetchEventParticipants(launchEventUrl);

    const returnees = [...currentParticipants.keys()].filter((id) => launchParticipants.has(id));

    displayReturnees(returnees, currentParticipants, launchParticipants, origin);
  }

  init();
})();
