// ==UserScript==
// @name         parkrun Volunteer Days Display
// @description  Displays the number of volunteer credits for parkrun finishers on results pages, for celebration purposes (and let's not make assumptions about ratios)
// @author       Pete Johns (@johnsyweb)
// @downloadURL  https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/volunteer-days-display.user.js
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
// @run-at       document-end
// @supportURL   https://github.com/johnsyweb/tampermonkey-parkrun/issues/
// @tag          parkrun
// @screenshot-url       https://www.parkrun.org.uk/fountainsabbey/results/latestresults/
// @screenshot-selector  .volunteer-days
// @screenshot-timeout   8000
// @screenshot-viewport  1200x800
// @updateURL    https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/volunteer-days-display.user.js
// @version      1.0.66
// ==/UserScript==

(function () {
  'use strict';

  /**
   * Adds volunteer credit information to each finisher who has volunteered
   */
  function showVolunteerCredits() {
    document
      .querySelectorAll('tr[data-vols] > td.Results-table-td.Results-table-td--name > div.detailed')
      .forEach((div) => {
        const volDays = div.closest('tr').getAttribute('data-vols');

        if (volDays && parseInt(volDays) > 0) {
          const spacer = document.createElement('span');
          spacer.classList.add('spacer');
          spacer.textContent = ' | ';

          const volSpan = document.createElement('span');
          volSpan.textContent = `${volDays} volunteer credit${volDays === '1' ? '' : 's'}`;
          volSpan.classList.add('volunteer-days');

          // In responsive detailed view, gender position is wrapped in a Results-tablet span.
          // Insert volunteer credits immediately after the finish count (before gender block) when present.
          const genderTablet = div.querySelector('.Results-tablet');
          if (genderTablet) {
            div.insertBefore(spacer, genderTablet);
            spacer.insertAdjacentElement('afterend', volSpan);
          } else {
            const firstElement = div.firstElementChild;
            if (firstElement) {
              firstElement.insertAdjacentElement('afterend', spacer);
              spacer.insertAdjacentElement('afterend', volSpan);
            } else {
              div.appendChild(volSpan);
            }
          }
        }
      });
  }

  /**
   * Waits for the page to fully load before adding volunteer information
   */
  function init() {
    const firstRow = document.querySelector('tr[data-vols]');
    if (firstRow) {
      showVolunteerCredits();
      addVolunteerCreditsSort();
    } else {
      setTimeout(init, 500);
    }
  }

  /**
   * Adds sort options for volunteer credits and wires up sorting behaviour
   */
  function addVolunteerCreditsSort() {
    const firstRow = document.querySelector('tr[data-vols]');
    if (!firstRow) return;
    const tbody = firstRow.closest('tbody');
    // Try to find an existing sort <select>
    const sortSelect = document.querySelector(
      'select[name="sort"], .Results-sort select, select.Results-sort, .Results-controls select'
    );

    // Sorting function using data-vols
    function sortByVolunteerCredits(direction) {
      if (!tbody) return;
      // Include all rows in tbody; treat missing data-vols as 0
      const rows = Array.from(tbody.querySelectorAll('tr'));

      // Keep original order index to ensure stable sort for ties
      const indexed = rows.map((row, index) => ({ row, index }));

      indexed.sort((a, b) => {
        const av = parseInt(a.row.getAttribute('data-vols') || '0', 10);
        const bv = parseInt(b.row.getAttribute('data-vols') || '0', 10);
        if (av === bv) return a.index - b.index;
        return direction === 'asc' ? av - bv : bv - av;
      });

      // Re-append sorted finisher rows; other rows remain in place
      indexed.forEach(({ row }) => tbody.appendChild(row));
    }

    // If there's an existing select, augment it
    if (sortSelect) {
      // Add options if not already present
      if (!sortSelect.querySelector('option[value="vols-asc"]')) {
        const optAsc = new Option('Sort by volunteer credits ▲', 'vols-asc');
        const optDesc = new Option('Sort by volunteer credits ▼', 'vols-desc');
        sortSelect.appendChild(optAsc);
        sortSelect.appendChild(optDesc);
      }

      // Avoid adding duplicate listeners
      if (!sortSelect.dataset.volsSortWired) {
        // Capture phase listener to prevent native handlers when using our custom options
        sortSelect.addEventListener(
          'change',
          (e) => {
            const value = e.target.value || '';
            if (value === 'vols-asc' || value === 'vols-desc') {
              if (e.cancelable) e.preventDefault();
              if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
              if (typeof e.stopPropagation === 'function') e.stopPropagation();
              sortByVolunteerCredits(value.endsWith('asc') ? 'asc' : 'desc');
            }
          },
          true
        );
        // Bubble phase listener (fallback) if capture was bypassed
        sortSelect.addEventListener('change', (e) => {
          const value = e.target.value || '';
          if (value === 'vols-asc') {
            sortByVolunteerCredits('asc');
          } else if (value === 'vols-desc') {
            sortByVolunteerCredits('desc');
          }
        });
        sortSelect.dataset.volsSortWired = 'true';
      }
    }

    // Also augment the responsive "View Settings" sort dialog when present
    const dialogSortOptions = document.querySelector('.Results-dialog-options[data-name="sort"]');
    if (dialogSortOptions && !dialogSortOptions.querySelector('[data-vols-sort="true"]')) {
      const option = document.createElement('div');
      option.className = 'Results-dialog-option Results-dialog-option--block js-ResultsOption';
      option.dataset.volsSort = 'true';

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'Results-dialog-button';
      const label = document.createElement('span');
      label.textContent = 'Sort by volunteer credits';
      button.appendChild(label);

      const arrows = document.createElement('div');
      arrows.className = 'Results-dialog-arrows';

      const ascButton = document.createElement('button');
      ascButton.type = 'button';
      ascButton.className = 'Results-dialog-arrow js-ResultsDirection';
      ascButton.dataset.value = 'vols-asc';
      ascButton.textContent = '▲';

      const descButton = document.createElement('button');
      descButton.type = 'button';
      descButton.className = 'Results-dialog-arrow js-ResultsDirection';
      descButton.dataset.value = 'vols-desc';
      descButton.textContent = '▼';

      function applyDialogSort(direction) {
        sortByVolunteerCredits(direction);

        // Update selection styling to match core behaviour
        dialogSortOptions
          .querySelectorAll('.Results-dialog-option.js-ResultsOption')
          .forEach((opt) => opt.classList.remove('isSelected'));
        dialogSortOptions
          .querySelectorAll('.Results-dialog-arrow.js-ResultsDirection')
          .forEach((arrow) => arrow.classList.remove('isSelected'));

        option.classList.add('isSelected');
        if (direction === 'asc') {
          ascButton.classList.add('isSelected');
        } else {
          descButton.classList.add('isSelected');
        }
      }

      ascButton.addEventListener('click', (event) => {
        if (event.cancelable) event.preventDefault();
        event.stopPropagation();
        applyDialogSort('asc');
      });

      descButton.addEventListener('click', (event) => {
        if (event.cancelable) event.preventDefault();
        event.stopPropagation();
        applyDialogSort('desc');
      });

      arrows.appendChild(ascButton);
      arrows.appendChild(descButton);
      option.appendChild(button);
      option.appendChild(arrows);
      dialogSortOptions.appendChild(option);
    }
  }

  init();
})();
